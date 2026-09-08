/**
 * useDistrictOverviewData.js
 * --------------------
 * Purpose:
 *   React hook for fetching and managing global District Overview cards with dynamic financial & operational metrics
 *   for the Back Office District Overview page.
 *
 * Architecture:
 *   - Phase 5C Real API Integration:
 *       1. GET /District         -> Fetches all Districts globally.
 *       2. GET /RMMaster         -> Fetches all RMs globally to aggregate district RM teams.
 *       3. GET /AgentMaster      -> Fetches all Agents globally to aggregate district agents.
 *       4. GET /AgentAddCustomer -> Fetches all Customers globally to aggregate district portfolio volumes.
 *   - In-memory aggregation of RM count, Agent count, Customer count, Portfolio Volume, Disbursed rate, and Pending count.
 *   - Deduplicates customer application matching to ensure accurate reporting.
 *   - Returns reactive state: { districts, rms, agents, customers, loading, error, refetch }.
 *   - Memory-safe execution with unmount cancellation guards.
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
 * Checks if a status represents a pending loan application.
 */
function isPendingStatus(status) {
  if (status === 0 || status === 1) return true;
  const s = String(status || '').toLowerCase().trim();
  return s.includes('pending') || s.includes('draft') || s.includes('new') || s.includes('sourced');
}

export function useDistrictOverviewData() {
  const [districts, setDistricts] = useState([]);
  const [rms, setRMs] = useState([]);
  const [agents, setAgents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    try {
      // 1. Concurrently fetch Districts, RMs, Agents, and Customers
      const [districtsRes, rmsRes, agentsRes, customersRes] = await Promise.allSettled([
        backOfficeService.getDistricts(),
        backOfficeService.getAllRMs(),
        backOfficeService.getAllAgents(),
        backOfficeService.getAllCustomers(),
      ]);

      if (!isMounted) return;

      // 2. Normalize Master Datasets
      let mappedDistricts = [];
      if (districtsRes.status === 'fulfilled' && districtsRes.value) {
        const raw = Array.isArray(districtsRes.value)
          ? districtsRes.value
          : (districtsRes.value?.value || districtsRes.value?.data || []);
        mappedDistricts = raw.map(mapDistrict).filter(Boolean);
      }

      let mappedRMs = [];
      if (rmsRes.status === 'fulfilled' && rmsRes.value) {
        const raw = Array.isArray(rmsRes.value)
          ? rmsRes.value
          : (rmsRes.value?.value || rmsRes.value?.data || []);
        mappedRMs = raw.map(mapRM).filter(Boolean);
      }

      let mappedAgents = [];
      if (agentsRes.status === 'fulfilled' && agentsRes.value) {
        const raw = Array.isArray(agentsRes.value)
          ? agentsRes.value
          : (agentsRes.value?.value || agentsRes.value?.data || []);
        mappedAgents = raw.map(mapAgent).filter(Boolean);
      }

      let mappedCustomers = [];
      if (customersRes.status === 'fulfilled' && customersRes.value) {
        const raw = Array.isArray(customersRes.value)
          ? customersRes.value
          : (customersRes.value?.value || customersRes.value?.data || []);
        mappedCustomers = raw.map(mapCustomer).filter(Boolean);
      }

      // 3. In-Memory District Metrics Aggregation (Zero N+1 Network Calls)
      const enrichedDistricts = mappedDistricts.map((d) => {
        const dId = String(d.districtId || d.id || '');
        const dName = (d.name || '').trim().toLowerCase();

        // RMs in this District
        const distRMs = mappedRMs.filter((r) => {
          return (
            (dId && String(r.districtId) === dId) ||
            (dName && r.districtName && r.districtName.trim().toLowerCase() === dName)
          );
        });
        const distRmIds = new Set(distRMs.map((r) => String(r.rmId || r.id)).filter(Boolean));
        const distRmNames = new Set(distRMs.map((r) => (r.name || r.fullName || '').trim().toLowerCase()).filter(Boolean));

        // Agents in this District
        const distAgents = mappedAgents.filter((ag) => {
          return (
            (dId && String(ag.districtId) === dId) ||
            (ag.rmId && distRmIds.has(String(ag.rmId))) ||
            (dName && ag.districtName && ag.districtName.trim().toLowerCase() === dName) ||
            (ag.rmName && distRmNames.has(ag.rmName.trim().toLowerCase()))
          );
        });
        const distAgentIds = new Set(distAgents.map((a) => String(a.agentId || a.id)).filter(Boolean));
        const distAgentCodes = new Set(distAgents.map((a) => String(a.code || a.agentCode)).filter(Boolean));
        const distAgentNames = new Set(distAgents.map((a) => (a.name || a.fullName || '').trim().toLowerCase()).filter(Boolean));

        // Customers in this District (deduplicated)
        const seenCustomerIds = new Set();
        const distCustomers = mappedCustomers.filter((c) => {
          if (!c) return false;
          const custId = c.agentCustomerId || c.id;
          if (custId && seenCustomerIds.has(String(custId))) return false;

          const matchDistrict = (dId && String(c.districtId) === dId) || (dName && c.districtName && c.districtName.trim().toLowerCase() === dName);
          const matchAgent = (c.agentId && distAgentIds.has(String(c.agentId))) || (c.agentCode && distAgentCodes.has(String(c.agentCode))) || (c.agentName && distAgentNames.has(c.agentName.trim().toLowerCase()));
          const matchRM = (c.rmId && distRmIds.has(String(c.rmId))) || (c.rmName && distRmNames.has(c.rmName.trim().toLowerCase()));

          if (matchDistrict || matchAgent || matchRM) {
            if (custId) seenCustomerIds.add(String(custId));
            return true;
          }
          return false;
        });

        const rmCount = distRMs.length;
        const agentCount = distAgents.length;
        const customerCount = distCustomers.length;
        const totalPortfolio = distCustomers.reduce(
          (sum, c) => sum + Number(c.amount || c.expectedLoanAmount || c.loanAmount || 0),
          0
        );
        const approvedCustomers = distCustomers.filter((c) => isApprovedStatus(c.status));
        const approvedCount = approvedCustomers.length;
        const pendingCount = distCustomers.filter((c) => isPendingStatus(c.status)).length;
        const completionRate = customerCount > 0 ? Math.round((approvedCount / customerCount) * 100) : 0;

        return {
          ...d,
          rmCount,
          agentCount,
          customerCount,
          totalPortfolio,
          approvedCount,
          pendingCount,
          completionRate,
        };
      });

      if (isMounted) {
        if (districtsRes.status === 'rejected' && enrichedDistricts.length === 0) {
          const err = districtsRes.reason;
          const msg = err?.response?.data?.message || err?.message || 'Failed to load Districts overview';
          setError(msg);
        }
        setDistricts(enrichedDistricts);
        setRMs(mappedRMs);
        setAgents(mappedAgents);
        setCustomers(mappedCustomers);
      }
    } catch (err) {
      if (isMounted) {
        const msg = err?.response?.data?.message || err?.message || 'Failed to load Districts overview';
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
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [districtsRes, rmsRes, agentsRes, customersRes] = await Promise.allSettled([
          backOfficeService.getDistricts(),
          backOfficeService.getAllRMs(),
          backOfficeService.getAllAgents(),
          backOfficeService.getAllCustomers(),
        ]);

        if (!active) return;

        let mappedDistricts = [];
        if (districtsRes.status === 'fulfilled' && districtsRes.value) {
          const raw = Array.isArray(districtsRes.value)
            ? districtsRes.value
            : (districtsRes.value?.value || districtsRes.value?.data || []);
          mappedDistricts = raw.map(mapDistrict).filter(Boolean);
        }

        let mappedRMs = [];
        if (rmsRes.status === 'fulfilled' && rmsRes.value) {
          const raw = Array.isArray(rmsRes.value)
            ? rmsRes.value
            : (rmsRes.value?.value || rmsRes.value?.data || []);
          mappedRMs = raw.map(mapRM).filter(Boolean);
        }

        let mappedAgents = [];
        if (agentsRes.status === 'fulfilled' && agentsRes.value) {
          const raw = Array.isArray(agentsRes.value)
            ? agentsRes.value
            : (agentsRes.value?.value || agentsRes.value?.data || []);
          mappedAgents = raw.map(mapAgent).filter(Boolean);
        }

        let mappedCustomers = [];
        if (customersRes.status === 'fulfilled' && customersRes.value) {
          const raw = Array.isArray(customersRes.value)
            ? customersRes.value
            : (customersRes.value?.value || customersRes.value?.data || []);
          mappedCustomers = raw.map(mapCustomer).filter(Boolean);
        }

        const enrichedDistricts = mappedDistricts.map((d) => {
          const dId = String(d.districtId || d.id || '');
          const dName = (d.name || '').trim().toLowerCase();

          const distRMs = mappedRMs.filter((r) => {
            return (
              (dId && String(r.districtId) === dId) ||
              (dName && r.districtName && r.districtName.trim().toLowerCase() === dName)
            );
          });
          const distRmIds = new Set(distRMs.map((r) => String(r.rmId || r.id)).filter(Boolean));
          const distRmNames = new Set(distRMs.map((r) => (r.name || r.fullName || '').trim().toLowerCase()).filter(Boolean));

          const distAgents = mappedAgents.filter((ag) => {
            return (
              (dId && String(ag.districtId) === dId) ||
              (ag.rmId && distRmIds.has(String(ag.rmId))) ||
              (dName && ag.districtName && ag.districtName.trim().toLowerCase() === dName) ||
              (ag.rmName && distRmNames.has(ag.rmName.trim().toLowerCase()))
            );
          });
          const distAgentIds = new Set(distAgents.map((a) => String(a.agentId || a.id)).filter(Boolean));
          const distAgentCodes = new Set(distAgents.map((a) => String(a.code || a.agentCode)).filter(Boolean));
          const distAgentNames = new Set(distAgents.map((a) => (a.name || a.fullName || '').trim().toLowerCase()).filter(Boolean));

          const seenCustomerIds = new Set();
          const distCustomers = mappedCustomers.filter((c) => {
            if (!c) return false;
            const custId = c.agentCustomerId || c.id;
            if (custId && seenCustomerIds.has(String(custId))) return false;

            const matchDistrict = (dId && String(c.districtId) === dId) || (dName && c.districtName && c.districtName.trim().toLowerCase() === dName);
            const matchAgent = (c.agentId && distAgentIds.has(String(c.agentId))) || (c.agentCode && distAgentCodes.has(String(c.agentCode))) || (c.agentName && distAgentNames.has(c.agentName.trim().toLowerCase()));
            const matchRM = (c.rmId && distRmIds.has(String(c.rmId))) || (c.rmName && distRmNames.has(c.rmName.trim().toLowerCase()));

            if (matchDistrict || matchAgent || matchRM) {
              if (custId) seenCustomerIds.add(String(custId));
              return true;
            }
            return false;
          });

          const rmCount = distRMs.length;
          const agentCount = distAgents.length;
          const customerCount = distCustomers.length;
          const totalPortfolio = distCustomers.reduce(
            (sum, c) => sum + Number(c.amount || c.expectedLoanAmount || c.loanAmount || 0),
            0
          );
          const approvedCustomers = distCustomers.filter((c) => isApprovedStatus(c.status));
          const approvedCount = approvedCustomers.length;
          const pendingCount = distCustomers.filter((c) => isPendingStatus(c.status)).length;
          const completionRate = customerCount > 0 ? Math.round((approvedCount / customerCount) * 100) : 0;

          return {
            ...d,
            rmCount,
            agentCount,
            customerCount,
            totalPortfolio,
            approvedCount,
            pendingCount,
            completionRate,
          };
        });

        if (active) {
          if (districtsRes.status === 'rejected' && enrichedDistricts.length === 0) {
            const err = districtsRes.reason;
            const msg = err?.response?.data?.message || err?.message || 'Failed to load Districts overview';
            setError(msg);
          }
          setDistricts(enrichedDistricts);
          setRMs(mappedRMs);
          setAgents(mappedAgents);
          setCustomers(mappedCustomers);
        }
      } catch (err) {
        if (active) {
          const msg = err?.response?.data?.message || err?.message || 'Failed to load Districts overview';
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
  }, []);

  return {
    districts,
    rms,
    agents,
    customers,
    loading,
    error,
    refetch: fetchData,
  };
}

export default useDistrictOverviewData;
