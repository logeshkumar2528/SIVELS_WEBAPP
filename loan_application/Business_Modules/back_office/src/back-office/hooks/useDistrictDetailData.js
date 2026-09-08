/**
 * useDistrictDetailData.js
 * --------------------
 * Purpose:
 *   React hook for fetching and managing District details, assigned Relationship Managers,
 *   Field Agents, and Sourced Customer Applications in the Back Office District Detail view.
 *
 * Architecture:
 *   - Phase 4C Real API Integration:
 *       1. GET /District/:districtId -> Fetches District record (with fallback to GET /District).
 *       2. GET /RMMaster             -> Fetches all RMs globally, filtered by districtId.
 *       3. GET /AgentMaster          -> Fetches all Agents globally, filtered by district RMs / districtId.
 *       4. GET /AgentAddCustomer     -> Fetches all Customers globally, filtered relationally.
 *   - In-memory aggregation of RM metrics (agents, customers, portfolio, target achievement).
 *   - Deduplicates customer matching across hierarchical relational links.
 *   - Returns reactive state: { district, rms, agents, customers, metrics, loading, error, refetch }.
 *   - Guarantees memory-safe execution with unmount cancellation guards.
 */

import { useState, useEffect, useCallback } from 'react';
import backOfficeService from '../api/backOfficeService';
import { mapDistrict, mapRM, mapAgent, mapCustomer } from '../mappers/hierarchyMapper';

/**
 * Checks if a status represents an approved loan application.
 */
function isApprovedStatus(status) {
  if (status === 4) return true;
  const s = String(status || '').toLowerCase().trim();
  return s.includes('approved');
}

/**
 * Checks if a status represents a pending/in-process loan application.
 */
function isPendingStatus(status) {
  if (status === 0 || status === 1) return true;
  const s = String(status || '').toLowerCase().trim();
  return s.includes('pending') || s.includes('draft') || s.includes('new') || s.includes('sourced');
}

export function useDistrictDetailData(districtId) {
  const [district, setDistrict] = useState(null);
  const [rms, setRMs] = useState([]);
  const [agents, setAgents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [metrics, setMetrics] = useState({
    totalRMs: 0,
    totalAgents: 0,
    totalCustomers: 0,
    totalPortfolio: 0,
    approvedCount: 0,
    disbursedAmount: 0,
    pendingCount: 0,
    conversionRate: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!districtId) {
      setDistrict(null);
      setRMs([]);
      setAgents([]);
      setCustomers([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    try {
      // 1. Concurrently fetch District, RMs, Agents, and Customers
      const [districtRes, rmsRes, agentsRes, customersRes] = await Promise.allSettled([
        (async () => {
          try {
            const res = await backOfficeService.getDistrictById(districtId);
            if (res) return res;
          } catch (e) {
            // Fallback: search within getDistricts if parameterized endpoint fails
            const allDistricts = await backOfficeService.getDistricts();
            const list = Array.isArray(allDistricts) ? allDistricts : (allDistricts?.data || allDistricts?.value || []);
            const found = list.find((d) => {
              const dId = d.districtId ?? d.DistrictId ?? d.id ?? d.Id ?? d.districtCode ?? d.DistrictCode;
              return String(dId) === String(districtId);
            });
            if (found) return found;
            throw e;
          }
        })(),
        backOfficeService.getAllRMs(),
        backOfficeService.getAllAgents(),
        backOfficeService.getAllCustomers(),
      ]);

      if (!isMounted) return;

      // 2. Normalize District
      let mappedDistrict = null;
      if (districtRes.status === 'fulfilled' && districtRes.value) {
        const rawDistrict = Array.isArray(districtRes.value) ? districtRes.value[0] : districtRes.value;
        mappedDistrict = mapDistrict(rawDistrict);
      }

      // 3. Normalize Global RMs
      let mappedRMs = [];
      if (rmsRes.status === 'fulfilled' && rmsRes.value) {
        const rawRMs = Array.isArray(rmsRes.value)
          ? rmsRes.value
          : (rmsRes.value?.value || rmsRes.value?.data || []);
        mappedRMs = rawRMs.map(mapRM).filter(Boolean);
      }

      // 4. Normalize Global Agents
      let mappedAgents = [];
      if (agentsRes.status === 'fulfilled' && agentsRes.value) {
        const rawAgents = Array.isArray(agentsRes.value)
          ? agentsRes.value
          : (agentsRes.value?.value || agentsRes.value?.data || []);
        mappedAgents = rawAgents.map(mapAgent).filter(Boolean);
      }

      // 5. Normalize Global Customers
      let mappedCustomers = [];
      if (customersRes.status === 'fulfilled' && customersRes.value) {
        const rawCustomers = Array.isArray(customersRes.value)
          ? customersRes.value
          : (customersRes.value?.value || customersRes.value?.data || []);
        mappedCustomers = rawCustomers.map(mapCustomer).filter(Boolean);
      }

      const districtNameClean = (mappedDistrict?.name || '').trim().toLowerCase();

      // 6. Filter RMs belonging to this District
      const districtRMs = mappedRMs.filter((r) => {
        if (!r) return false;
        return (
          String(r.districtId) === String(districtId) ||
          (mappedDistrict?.id && String(r.districtId) === String(mappedDistrict.id)) ||
          (districtNameClean && r.districtName && r.districtName.trim().toLowerCase() === districtNameClean)
        );
      });

      const districtRmIds = new Set(
        districtRMs.map((r) => String(r.rmId || r.id)).filter(Boolean)
      );
      const districtRmNames = new Set(
        districtRMs.map((r) => (r.name || r.fullName || '').trim().toLowerCase()).filter(Boolean)
      );

      // 7. Filter Agents assigned to District RMs or District directly
      const districtAgents = mappedAgents.filter((ag) => {
        if (!ag) return false;
        const matchRM = (ag.rmId && districtRmIds.has(String(ag.rmId))) || (ag.rmName && districtRmNames.has(ag.rmName.trim().toLowerCase()));
        const matchDistrictDirect =
          String(ag.districtId) === String(districtId) ||
          (mappedDistrict?.id && String(ag.districtId) === String(mappedDistrict.id)) ||
          (districtNameClean && ag.districtName && ag.districtName.trim().toLowerCase() === districtNameClean);

        return matchRM || matchDistrictDirect;
      });

      const districtAgentIds = new Set(
        districtAgents.map((a) => String(a.agentId || a.id)).filter(Boolean)
      );
      const districtAgentCodes = new Set(
        districtAgents.map((a) => String(a.code || a.agentCode)).filter(Boolean)
      );
      const districtAgentNames = new Set(
        districtAgents.map((a) => (a.name || a.fullName || '').trim().toLowerCase()).filter(Boolean)
      );

      // 8. Relational Customer Filtering with Deduplication
      const seenCustomerIds = new Set();
      const districtCustomers = mappedCustomers.filter((c) => {
        if (!c) return false;
        const custId = c.agentCustomerId || c.id;
        if (custId && seenCustomerIds.has(String(custId))) return false;

        const matchAgent =
          (c.agentId && districtAgentIds.has(String(c.agentId))) ||
          (c.agentCode && districtAgentCodes.has(String(c.agentCode))) ||
          (c.agentName && districtAgentNames.has(c.agentName.trim().toLowerCase()));

        const matchRM =
          (c.rmId && districtRmIds.has(String(c.rmId))) ||
          (c.rmName && districtRmNames.has(c.rmName.trim().toLowerCase()));

        const matchDistrictDirect =
          String(c.districtId) === String(districtId) ||
          (mappedDistrict?.id && String(c.districtId) === String(mappedDistrict.id)) ||
          (districtNameClean && c.districtName && c.districtName.trim().toLowerCase() === districtNameClean);

        if (matchAgent || matchRM || matchDistrictDirect) {
          if (custId) seenCustomerIds.add(String(custId));
          return true;
        }
        return false;
      });

      // 9. In-Memory RM Metrics Aggregation (Zero N+1 Network Requests)
      const enrichedRMs = districtRMs.map((r) => {
        const rId = String(r.rmId || r.id || '');
        const rName = (r.name || r.fullName || '').trim().toLowerCase();

        // Agents reporting to this RM
        const rmAgents = districtAgents.filter((ag) => {
          return (
            (rId && String(ag.rmId) === rId) ||
            (rName && ag.rmName && ag.rmName.trim().toLowerCase() === rName)
          );
        });
        const rmAgentIds = new Set(rmAgents.map((a) => String(a.agentId || a.id)).filter(Boolean));
        const rmAgentNames = new Set(rmAgents.map((a) => (a.name || a.fullName || '').trim().toLowerCase()).filter(Boolean));

        // Customers for this RM
        const rmCusts = districtCustomers.filter((c) => {
          return (
            (rId && String(c.rmId) === rId) ||
            (rName && c.rmName && c.rmName.trim().toLowerCase() === rName) ||
            (c.agentId && rmAgentIds.has(String(c.agentId))) ||
            (c.agentName && rmAgentNames.has(c.agentName.trim().toLowerCase()))
          );
        });

        const agentCount = rmAgents.length;
        const customerCount = rmCusts.length;
        const portfolioAmount = rmCusts.reduce(
          (sum, c) => sum + Number(c.amount || c.expectedLoanAmount || c.loanAmount || 0),
          0
        );
        const approvedCount = rmCusts.filter((c) => isApprovedStatus(c.status)).length;
        const conversionRate = customerCount > 0 ? Math.round((approvedCount / customerCount) * 100) : 0;
        const targetAchievement = conversionRate || 0;

        return {
          ...r,
          agentCount,
          customerCount,
          portfolioAmount,
          approvedCount,
          conversionRate,
          targetAchievement,
        };
      });

      // 10. Compute Dynamic District Financial & Operational KPIs
      const totalRMs = enrichedRMs.length;
      const totalAgents = districtAgents.length;
      const totalCustomers = districtCustomers.length;
      const totalPortfolio = districtCustomers.reduce(
        (sum, c) => sum + Number(c.amount || c.expectedLoanAmount || c.loanAmount || 0),
        0
      );
      const approvedCustomers = districtCustomers.filter((c) => isApprovedStatus(c.status));
      const approvedCount = approvedCustomers.length;
      const disbursedAmount = approvedCustomers.reduce(
        (sum, c) => sum + Number(c.amount || c.expectedLoanAmount || c.loanAmount || 0),
        0
      );
      const pendingCount = districtCustomers.filter((c) => isPendingStatus(c.status)).length;
      const completionRate = totalCustomers > 0 ? Math.round((approvedCount / totalCustomers) * 100) : 0;
      const conversionRate = completionRate;

      const dynamicMetrics = {
        totalRMs,
        totalAgents,
        totalCustomers,
        totalPortfolio,
        approvedCount,
        disbursedAmount,
        pendingCount,
        conversionRate,
        completionRate,
      };

      if (isMounted) {
        if (districtRes.status === 'rejected' && !mappedDistrict) {
          const err = districtRes.reason;
          const msg = err?.response?.data?.message || err?.message || 'Failed to load district details';
          setError(msg);
          setDistrict(null);
        } else {
          setDistrict(mappedDistrict);
        }
        setRMs(enrichedRMs);
        setAgents(districtAgents);
        setCustomers(districtCustomers);
        setMetrics(dynamicMetrics);
      }
    } catch (err) {
      if (isMounted) {
        const msg = err?.response?.data?.message || err?.message || 'Failed to load district information';
        setError(msg);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [districtId]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!districtId) {
        setDistrict(null);
        setRMs([]);
        setAgents([]);
        setCustomers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [districtRes, rmsRes, agentsRes, customersRes] = await Promise.allSettled([
          (async () => {
            try {
              const res = await backOfficeService.getDistrictById(districtId);
              if (res) return res;
            } catch (e) {
              const allDistricts = await backOfficeService.getDistricts();
              const list = Array.isArray(allDistricts) ? allDistricts : (allDistricts?.data || allDistricts?.value || []);
              const found = list.find((d) => {
                const dId = d.districtId ?? d.DistrictId ?? d.id ?? d.Id ?? d.districtCode ?? d.DistrictCode;
                return String(dId) === String(districtId);
              });
              if (found) return found;
              throw e;
            }
          })(),
          backOfficeService.getAllRMs(),
          backOfficeService.getAllAgents(),
          backOfficeService.getAllCustomers(),
        ]);

        if (!active) return;

        let mappedDistrict = null;
        if (districtRes.status === 'fulfilled' && districtRes.value) {
          const rawDistrict = Array.isArray(districtRes.value) ? districtRes.value[0] : districtRes.value;
          mappedDistrict = mapDistrict(rawDistrict);
        }

        let mappedRMs = [];
        if (rmsRes.status === 'fulfilled' && rmsRes.value) {
          const rawRMs = Array.isArray(rmsRes.value)
            ? rmsRes.value
            : (rmsRes.value?.value || rmsRes.value?.data || []);
          mappedRMs = rawRMs.map(mapRM).filter(Boolean);
        }

        let mappedAgents = [];
        if (agentsRes.status === 'fulfilled' && agentsRes.value) {
          const rawAgents = Array.isArray(agentsRes.value)
            ? agentsRes.value
            : (agentsRes.value?.value || agentsRes.value?.data || []);
          mappedAgents = rawAgents.map(mapAgent).filter(Boolean);
        }

        let mappedCustomers = [];
        if (customersRes.status === 'fulfilled' && customersRes.value) {
          const rawCustomers = Array.isArray(customersRes.value)
            ? customersRes.value
            : (customersRes.value?.value || customersRes.value?.data || []);
          mappedCustomers = rawCustomers.map(mapCustomer).filter(Boolean);
        }

        const districtNameClean = (mappedDistrict?.name || '').trim().toLowerCase();

        const districtRMs = mappedRMs.filter((r) => {
          if (!r) return false;
          return (
            String(r.districtId) === String(districtId) ||
            (mappedDistrict?.id && String(r.districtId) === String(mappedDistrict.id)) ||
            (districtNameClean && r.districtName && r.districtName.trim().toLowerCase() === districtNameClean)
          );
        });

        const districtRmIds = new Set(
          districtRMs.map((r) => String(r.rmId || r.id)).filter(Boolean)
        );
        const districtRmNames = new Set(
          districtRMs.map((r) => (r.name || r.fullName || '').trim().toLowerCase()).filter(Boolean)
        );

        const districtAgents = mappedAgents.filter((ag) => {
          if (!ag) return false;
          const matchRM = (ag.rmId && districtRmIds.has(String(ag.rmId))) || (ag.rmName && districtRmNames.has(ag.rmName.trim().toLowerCase()));
          const matchDistrictDirect =
            String(ag.districtId) === String(districtId) ||
            (mappedDistrict?.id && String(ag.districtId) === String(mappedDistrict.id)) ||
            (districtNameClean && ag.districtName && ag.districtName.trim().toLowerCase() === districtNameClean);

          return matchRM || matchDistrictDirect;
        });

        const districtAgentIds = new Set(
          districtAgents.map((a) => String(a.agentId || a.id)).filter(Boolean)
        );
        const districtAgentCodes = new Set(
          districtAgents.map((a) => String(a.code || a.agentCode)).filter(Boolean)
        );
        const districtAgentNames = new Set(
          districtAgents.map((a) => (a.name || a.fullName || '').trim().toLowerCase()).filter(Boolean)
        );

        const seenCustomerIds = new Set();
        const districtCustomers = mappedCustomers.filter((c) => {
          if (!c) return false;
          const custId = c.agentCustomerId || c.id;
          if (custId && seenCustomerIds.has(String(custId))) return false;

          const matchAgent =
            (c.agentId && districtAgentIds.has(String(c.agentId))) ||
            (c.agentCode && districtAgentCodes.has(String(c.agentCode))) ||
            (c.agentName && districtAgentNames.has(c.agentName.trim().toLowerCase()));

          const matchRM =
            (c.rmId && districtRmIds.has(String(c.rmId))) ||
            (c.rmName && districtRmNames.has(c.rmName.trim().toLowerCase()));

          const matchDistrictDirect =
            String(c.districtId) === String(districtId) ||
            (mappedDistrict?.id && String(c.districtId) === String(mappedDistrict.id)) ||
            (districtNameClean && c.districtName && c.districtName.trim().toLowerCase() === districtNameClean);

          if (matchAgent || matchRM || matchDistrictDirect) {
            if (custId) seenCustomerIds.add(String(custId));
            return true;
          }
          return false;
        });

        const enrichedRMs = districtRMs.map((r) => {
          const rId = String(r.rmId || r.id || '');
          const rName = (r.name || r.fullName || '').trim().toLowerCase();

          const rmAgents = districtAgents.filter((ag) => {
            return (
              (rId && String(ag.rmId) === rId) ||
              (rName && ag.rmName && ag.rmName.trim().toLowerCase() === rName)
            );
          });
          const rmAgentIds = new Set(rmAgents.map((a) => String(a.agentId || a.id)).filter(Boolean));
          const rmAgentNames = new Set(rmAgents.map((a) => (a.name || a.fullName || '').trim().toLowerCase()).filter(Boolean));

          const rmCusts = districtCustomers.filter((c) => {
            return (
              (rId && String(c.rmId) === rId) ||
              (rName && c.rmName && c.rmName.trim().toLowerCase() === rName) ||
              (c.agentId && rmAgentIds.has(String(c.agentId))) ||
              (c.agentName && rmAgentNames.has(c.agentName.trim().toLowerCase()))
            );
          });

          const agentCount = rmAgents.length;
          const customerCount = rmCusts.length;
          const portfolioAmount = rmCusts.reduce(
            (sum, c) => sum + Number(c.amount || c.expectedLoanAmount || c.loanAmount || 0),
            0
          );
          const approvedCount = rmCusts.filter((c) => isApprovedStatus(c.status)).length;
          const conversionRate = customerCount > 0 ? Math.round((approvedCount / customerCount) * 100) : 0;
          const targetAchievement = conversionRate || 0;

          return {
            ...r,
            agentCount,
            customerCount,
            portfolioAmount,
            approvedCount,
            conversionRate,
            targetAchievement,
          };
        });

        const totalRMs = enrichedRMs.length;
        const totalAgents = districtAgents.length;
        const totalCustomers = districtCustomers.length;
        const totalPortfolio = districtCustomers.reduce(
          (sum, c) => sum + Number(c.amount || c.expectedLoanAmount || c.loanAmount || 0),
          0
        );
        const approvedCustomers = districtCustomers.filter((c) => isApprovedStatus(c.status));
        const approvedCount = approvedCustomers.length;
        const disbursedAmount = approvedCustomers.reduce(
          (sum, c) => sum + Number(c.amount || c.expectedLoanAmount || c.loanAmount || 0),
          0
        );
        const pendingCount = districtCustomers.filter((c) => isPendingStatus(c.status)).length;
        const completionRate = totalCustomers > 0 ? Math.round((approvedCount / totalCustomers) * 100) : 0;
        const conversionRate = completionRate;

        const dynamicMetrics = {
          totalRMs,
          totalAgents,
          totalCustomers,
          totalPortfolio,
          approvedCount,
          disbursedAmount,
          pendingCount,
          conversionRate,
          completionRate,
        };

        if (active) {
          if (districtRes.status === 'rejected' && !mappedDistrict) {
            const err = districtRes.reason;
            const msg = err?.response?.data?.message || err?.message || 'Failed to load district details';
            setError(msg);
            setDistrict(null);
          } else {
            setDistrict(mappedDistrict);
          }
          setRMs(enrichedRMs);
          setAgents(districtAgents);
          setCustomers(districtCustomers);
          setMetrics(dynamicMetrics);
        }
      } catch (err) {
        if (active) {
          const msg = err?.response?.data?.message || err?.message || 'Failed to load district information';
          setError(msg);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [districtId]);

  return {
    district,
    rms,
    agents,
    customers,
    metrics,
    loading,
    error,
    refetch: fetchData,
  };
}

export default useDistrictDetailData;
