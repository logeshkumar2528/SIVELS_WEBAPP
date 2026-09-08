/**
 * useRMDetailData.js
 * --------------------
 * Purpose:
 *   React hook for fetching and managing Relationship Manager (RM) Profile, assigned Field Agents,
 *   and relational Customer Applications in the Back Office RM Detail view.
 *
 * Architecture:
 *   - Phase 4B Real API Integration:
 *       1. GET /RMMaster/:rmId   -> Fetches RM profile (with fallback to GET /RMMaster).
 *       2. GET /AgentMaster      -> Fetches all agents globally, filtered by rmId.
 *       3. GET /AgentAddCustomer -> Fetches all customers globally, filtered by rmId/agentId.
 *   - Aggregates agent-level performance (customers, applications, portfolio, conversion rate) in-memory.
 *   - Computes dynamic RM-level portfolio and achievement metrics.
 *   - Deduplicates customer matching to prevent inflated counts.
 *   - Returns reactive state: { rm, agents, customers, metrics, loading, error, refetch }.
 *   - Memory-safe execution with unmount cancellation guard.
 */

import { useState, useEffect, useCallback } from 'react';
import backOfficeService from '../api/backOfficeService';
import { mapRM, mapAgent, mapCustomer } from '../mappers/hierarchyMapper';

/**
 * Resolves standard display label for customer status.
 */
function isApprovedStatus(status) {
  if (status === 4) return true;
  const s = String(status || '').toLowerCase().trim();
  return s.includes('approved');
}

function isPendingStatus(status) {
  if (status === 0 || status === 1) return true;
  const s = String(status || '').toLowerCase().trim();
  return s.includes('pending') || s.includes('draft') || s.includes('new') || s.includes('sourced');
}

export function useRMDetailData(rmId) {
  const [rm, setRM] = useState(null);
  const [agents, setAgents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [metrics, setMetrics] = useState({
    totalAgents: 0,
    totalCustomers: 0,
    totalApplications: 0,
    totalPortfolio: 0,
    approvedCount: 0,
    pendingCount: 0,
    conversionRate: 0,
    targetAchievement: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!rmId) {
      setRM(null);
      setAgents([]);
      setCustomers([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    try {
      // 1. Concurrently fetch RM Profile, Agents, and Customers
      const [rmRes, agentsRes, customersRes] = await Promise.allSettled([
        (async () => {
          try {
            const res = await backOfficeService.getRMById(rmId);
            if (res) return res;
          } catch (e) {
            // Fallback: search within getAllRMs if parameterized route is unavailable
            const allRMs = await backOfficeService.getAllRMs();
            const list = Array.isArray(allRMs) ? allRMs : (allRMs?.data || allRMs?.value || []);
            const found = list.find((r) => {
              const rId = r.rmId ?? r.RmId ?? r.RMId ?? r.id ?? r.Id ?? r.employeeCode ?? r.EmployeeCode;
              return String(rId) === String(rmId);
            });
            if (found) return found;
            throw e;
          }
        })(),
        backOfficeService.getAllAgents(),
        backOfficeService.getAllCustomers(),
      ]);

      if (!isMounted) return;

      // 2. Normalize RM Record
      let mappedRM = null;
      if (rmRes.status === 'fulfilled' && rmRes.value) {
        const rawRM = Array.isArray(rmRes.value) ? rmRes.value[0] : rmRes.value;
        mappedRM = mapRM(rawRM);
      }

      // 3. Normalize Global Agents
      let mappedAgents = [];
      if (agentsRes.status === 'fulfilled' && agentsRes.value) {
        const rawAgents = Array.isArray(agentsRes.value)
          ? agentsRes.value
          : (agentsRes.value?.value || agentsRes.value?.data || []);
        mappedAgents = rawAgents.map(mapAgent).filter(Boolean);
      }

      // 4. Normalize Global Customers
      let mappedCustomers = [];
      if (customersRes.status === 'fulfilled' && customersRes.value) {
        const rawCustomers = Array.isArray(customersRes.value)
          ? customersRes.value
          : (customersRes.value?.value || customersRes.value?.data || []);
        mappedCustomers = rawCustomers.map(mapCustomer).filter(Boolean);
      }

      // 5. Filter Agents assigned to this RM
      const rmAgents = mappedAgents.filter((ag) => {
        if (!ag) return false;
        return (
          String(ag.rmId) === String(rmId) ||
          (mappedRM?.id && String(ag.rmId) === String(mappedRM.id)) ||
          (mappedRM?.rmId && String(ag.rmId) === String(mappedRM.rmId)) ||
          (mappedRM?.name && ag.rmName && ag.rmName.trim().toLowerCase() === mappedRM.name.trim().toLowerCase())
        );
      });

      // 6. Relational Customer Filtering with Deduplication
      const rmAgentIds = new Set(
        rmAgents.map((a) => String(a.agentId || a.id)).filter(Boolean)
      );
      const rmAgentCodes = new Set(
        rmAgents.map((a) => String(a.code || a.agentCode)).filter(Boolean)
      );
      const rmAgentNames = new Set(
        rmAgents.map((a) => (a.name || a.fullName || '').trim().toLowerCase()).filter(Boolean)
      );

      const seenCustomerIds = new Set();
      const rmCustomers = mappedCustomers.filter((c) => {
        if (!c) return false;
        const custId = c.agentCustomerId || c.id;
        if (custId && seenCustomerIds.has(String(custId))) return false;

        const matchRMDirect =
          String(c.rmId) === String(rmId) ||
          (mappedRM?.id && String(c.rmId) === String(mappedRM.id)) ||
          (mappedRM?.rmId && String(c.rmId) === String(mappedRM.rmId)) ||
          (mappedRM?.name && c.rmName && c.rmName.trim().toLowerCase() === mappedRM.name.trim().toLowerCase());

        const matchAgentRelational =
          (c.agentId && rmAgentIds.has(String(c.agentId))) ||
          (c.agentCode && rmAgentCodes.has(String(c.agentCode))) ||
          (c.agentName && rmAgentNames.has(c.agentName.trim().toLowerCase()));

        if (matchRMDirect || matchAgentRelational) {
          if (custId) seenCustomerIds.add(String(custId));
          return true;
        }
        return false;
      });

      // 7. In-Memory Agent Metrics Aggregation (Zero N+1 Network Requests)
      const enrichedAgents = rmAgents.map((ag) => {
        const aId = String(ag.agentId || ag.id || '');
        const aCode = String(ag.code || ag.agentCode || '');
        const aName = (ag.name || ag.fullName || '').trim().toLowerCase();

        const agCustomers = rmCustomers.filter((c) => {
          return (
            (aId && String(c.agentId) === aId) ||
            (aCode && c.agentCode && String(c.agentCode) === aCode) ||
            (aName && c.agentName && c.agentName.trim().toLowerCase() === aName)
          );
        });

        const customerCount = agCustomers.length;
        const applicationCount = agCustomers.length;
        const portfolioAmount = agCustomers.reduce(
          (sum, c) => sum + Number(c.amount || c.expectedLoanAmount || c.loanAmount || 0),
          0
        );
        const approvedCount = agCustomers.filter((c) => isApprovedStatus(c.status)).length;
        const conversionRate = customerCount > 0 ? Math.round((approvedCount / customerCount) * 100) : 0;

        return {
          ...ag,
          customerCount,
          applicationCount,
          portfolioAmount,
          approvedCount,
          conversionRate,
        };
      });

      // 8. Compute Dynamic RM Portfolio & Achievement Metrics
      const totalAgents = enrichedAgents.length;
      const totalCustomers = rmCustomers.length;
      const totalApplications = rmCustomers.length;
      const totalPortfolio = rmCustomers.reduce(
        (sum, c) => sum + Number(c.amount || c.expectedLoanAmount || c.loanAmount || 0),
        0
      );
      const approvedCount = rmCustomers.filter((c) => isApprovedStatus(c.status)).length;
      const pendingCount = rmCustomers.filter((c) => isPendingStatus(c.status)).length;
      const conversionRate = totalApplications > 0 ? Math.round((approvedCount / totalApplications) * 100) : 0;
      const targetAchievement = conversionRate || 0;

      const dynamicMetrics = {
        totalAgents,
        totalCustomers,
        totalApplications,
        totalPortfolio,
        approvedCount,
        pendingCount,
        conversionRate,
        targetAchievement,
      };

      // 9. Enrich RM District/Branch references if missing from payload
      if (mappedRM) {
        if (!mappedRM.districtName) {
          mappedRM.districtName = enrichedAgents[0]?.districtName || rmCustomers[0]?.districtName || '';
        }
        if (!mappedRM.districtId) {
          mappedRM.districtId = enrichedAgents[0]?.districtId || rmCustomers[0]?.districtId || null;
        }
        if (!mappedRM.branch) {
          mappedRM.branch = enrichedAgents[0]?.branch || 'Main Branch';
        }
      }

      if (isMounted) {
        if (rmRes.status === 'rejected' && !mappedRM) {
          const err = rmRes.reason;
          const msg = err?.response?.data?.message || err?.message || 'Failed to load Relationship Manager details';
          setError(msg);
          setRM(null);
        } else {
          setRM(mappedRM);
        }
        setAgents(enrichedAgents);
        setCustomers(rmCustomers);
        setMetrics(dynamicMetrics);
      }
    } catch (err) {
      if (isMounted) {
        const msg = err?.response?.data?.message || err?.message || 'Failed to load Relationship Manager information';
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
  }, [rmId]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!rmId) {
        setRM(null);
        setAgents([]);
        setCustomers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [rmRes, agentsRes, customersRes] = await Promise.allSettled([
          (async () => {
            try {
              const res = await backOfficeService.getRMById(rmId);
              if (res) return res;
            } catch (e) {
              const allRMs = await backOfficeService.getAllRMs();
              const list = Array.isArray(allRMs) ? allRMs : (allRMs?.data || allRMs?.value || []);
              const found = list.find((r) => {
                const rId = r.rmId ?? r.RmId ?? r.RMId ?? r.id ?? r.Id ?? r.employeeCode ?? r.EmployeeCode;
                return String(rId) === String(rmId);
              });
              if (found) return found;
              throw e;
            }
          })(),
          backOfficeService.getAllAgents(),
          backOfficeService.getAllCustomers(),
        ]);

        if (!active) return;

        let mappedRM = null;
        if (rmRes.status === 'fulfilled' && rmRes.value) {
          const rawRM = Array.isArray(rmRes.value) ? rmRes.value[0] : rmRes.value;
          mappedRM = mapRM(rawRM);
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

        const rmAgents = mappedAgents.filter((ag) => {
          if (!ag) return false;
          return (
            String(ag.rmId) === String(rmId) ||
            (mappedRM?.id && String(ag.rmId) === String(mappedRM.id)) ||
            (mappedRM?.rmId && String(ag.rmId) === String(mappedRM.rmId)) ||
            (mappedRM?.name && ag.rmName && ag.rmName.trim().toLowerCase() === mappedRM.name.trim().toLowerCase())
          );
        });

        const rmAgentIds = new Set(
          rmAgents.map((a) => String(a.agentId || a.id)).filter(Boolean)
        );
        const rmAgentCodes = new Set(
          rmAgents.map((a) => String(a.code || a.agentCode)).filter(Boolean)
        );
        const rmAgentNames = new Set(
          rmAgents.map((a) => (a.name || a.fullName || '').trim().toLowerCase()).filter(Boolean)
        );

        const seenCustomerIds = new Set();
        const rmCustomers = mappedCustomers.filter((c) => {
          if (!c) return false;
          const custId = c.agentCustomerId || c.id;
          if (custId && seenCustomerIds.has(String(custId))) return false;

          const matchRMDirect =
            String(c.rmId) === String(rmId) ||
            (mappedRM?.id && String(c.rmId) === String(mappedRM.id)) ||
            (mappedRM?.rmId && String(c.rmId) === String(mappedRM.rmId)) ||
            (mappedRM?.name && c.rmName && c.rmName.trim().toLowerCase() === mappedRM.name.trim().toLowerCase());

          const matchAgentRelational =
            (c.agentId && rmAgentIds.has(String(c.agentId))) ||
            (c.agentCode && rmAgentCodes.has(String(c.agentCode))) ||
            (c.agentName && rmAgentNames.has(c.agentName.trim().toLowerCase()));

          if (matchRMDirect || matchAgentRelational) {
            if (custId) seenCustomerIds.add(String(custId));
            return true;
          }
          return false;
        });

        const enrichedAgents = rmAgents.map((ag) => {
          const aId = String(ag.agentId || ag.id || '');
          const aCode = String(ag.code || ag.agentCode || '');
          const aName = (ag.name || ag.fullName || '').trim().toLowerCase();

          const agCustomers = rmCustomers.filter((c) => {
            return (
              (aId && String(c.agentId) === aId) ||
              (aCode && c.agentCode && String(c.agentCode) === aCode) ||
              (aName && c.agentName && c.agentName.trim().toLowerCase() === aName)
            );
          });

          const customerCount = agCustomers.length;
          const applicationCount = agCustomers.length;
          const portfolioAmount = agCustomers.reduce(
            (sum, c) => sum + Number(c.amount || c.expectedLoanAmount || c.loanAmount || 0),
            0
          );
          const approvedCount = agCustomers.filter((c) => isApprovedStatus(c.status)).length;
          const conversionRate = customerCount > 0 ? Math.round((approvedCount / customerCount) * 100) : 0;

          return {
            ...ag,
            customerCount,
            applicationCount,
            portfolioAmount,
            approvedCount,
            conversionRate,
          };
        });

        const totalAgents = enrichedAgents.length;
        const totalCustomers = rmCustomers.length;
        const totalApplications = rmCustomers.length;
        const totalPortfolio = rmCustomers.reduce(
          (sum, c) => sum + Number(c.amount || c.expectedLoanAmount || c.loanAmount || 0),
          0
        );
        const approvedCount = rmCustomers.filter((c) => isApprovedStatus(c.status)).length;
        const pendingCount = rmCustomers.filter((c) => isPendingStatus(c.status)).length;
        const conversionRate = totalApplications > 0 ? Math.round((approvedCount / totalApplications) * 100) : 0;
        const targetAchievement = conversionRate || 0;

        const dynamicMetrics = {
          totalAgents,
          totalCustomers,
          totalApplications,
          totalPortfolio,
          approvedCount,
          pendingCount,
          conversionRate,
          targetAchievement,
        };

        if (mappedRM) {
          if (!mappedRM.districtName) {
            mappedRM.districtName = enrichedAgents[0]?.districtName || rmCustomers[0]?.districtName || '';
          }
          if (!mappedRM.districtId) {
            mappedRM.districtId = enrichedAgents[0]?.districtId || rmCustomers[0]?.districtId || null;
          }
          if (!mappedRM.branch) {
            mappedRM.branch = enrichedAgents[0]?.branch || 'Main Branch';
          }
        }

        if (active) {
          if (rmRes.status === 'rejected' && !mappedRM) {
            const err = rmRes.reason;
            const msg = err?.response?.data?.message || err?.message || 'Failed to load Relationship Manager details';
            setError(msg);
            setRM(null);
          } else {
            setRM(mappedRM);
          }
          setAgents(enrichedAgents);
          setCustomers(rmCustomers);
          setMetrics(dynamicMetrics);
        }
      } catch (err) {
        if (active) {
          const msg = err?.response?.data?.message || err?.message || 'Failed to load Relationship Manager information';
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
  }, [rmId]);

  return {
    rm,
    agents,
    customers,
    metrics,
    loading,
    error,
    refetch: fetchData,
  };
}

export default useRMDetailData;
