/**
 * useRMMonitoringData.js
 * --------------------
 * Purpose:
 *   React hook for fetching and managing global Relationship Managers directory with live team & customer metrics
 *   for the Back Office RM Monitoring page.
 *
 * Architecture:
 *   - Phase 5B Real API Integration:
 *       1. GET /RMMaster         -> Fetches all RMs globally.
 *       2. GET /District         -> Fetches all Districts globally (for chips/dropdowns).
 *       3. GET /AgentMaster      -> Fetches all Agents globally to aggregate RM teams.
 *       4. GET /AgentAddCustomer -> Fetches all Customers globally to aggregate RM loan portfolios.
 *   - In-memory aggregation of assigned agents, active customers, portfolio volume, and conversion rate.
 *   - Returns reactive state: { rms, districts, agents, customers, loading, error, refetch }.
 *   - Memory-safe execution with unmount cancellation guards.
 */

import { useState, useEffect, useCallback } from 'react';
import backOfficeService from '../api/backOfficeService';
import { mapRM, mapDistrict, mapAgent, mapCustomer } from '../mappers/hierarchyMapper';

/**
 * Checks if a status represents an approved loan application.
 */
function isApprovedStatus(status) {
  if (status === 4) return true;
  const s = String(status || '').toLowerCase().trim();
  return s.includes('approved');
}

export function useRMMonitoringData() {
  const [rms, setRMs] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [agents, setAgents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    try {
      // 1. Concurrently fetch RMs, Districts, Agents, and Customers
      const [rmsRes, districtsRes, agentsRes, customersRes] = await Promise.allSettled([
        backOfficeService.getAllRMs(),
        backOfficeService.getDistricts(),
        backOfficeService.getAllAgents(),
        backOfficeService.getAllCustomers(),
      ]);

      if (!isMounted) return;

      // 2. Normalize Master Datasets
      let mappedRMs = [];
      if (rmsRes.status === 'fulfilled' && rmsRes.value) {
        const raw = Array.isArray(rmsRes.value)
          ? rmsRes.value
          : (rmsRes.value?.value || rmsRes.value?.data || []);
        mappedRMs = raw.map(mapRM).filter(Boolean);
      }

      let mappedDistricts = [];
      if (districtsRes.status === 'fulfilled' && districtsRes.value) {
        const raw = Array.isArray(districtsRes.value)
          ? districtsRes.value
          : (districtsRes.value?.value || districtsRes.value?.data || []);
        mappedDistricts = raw.map(mapDistrict).filter(Boolean);
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

      // 3. District Lookup Map
      const districtMap = new Map();
      mappedDistricts.forEach((d) => {
        if (d.id) districtMap.set(String(d.id), d);
        if (d.districtId) districtMap.set(String(d.districtId), d);
      });

      // 4. In-Memory RM Metrics Aggregation (Zero N+1 Network Calls)
      const enrichedRMs = mappedRMs.map((r) => {
        const rId = String(r.rmId || r.id || '');
        const rName = (r.name || r.fullName || '').trim().toLowerCase();

        // Agents assigned to this RM
        const rmAgents = mappedAgents.filter((ag) => {
          return (
            (rId && String(ag.rmId) === rId) ||
            (rName && ag.rmName && ag.rmName.trim().toLowerCase() === rName)
          );
        });

        const rmAgentIds = new Set(rmAgents.map((a) => String(a.agentId || a.id)).filter(Boolean));
        const rmAgentNames = new Set(rmAgents.map((a) => (a.name || a.fullName || '').trim().toLowerCase()).filter(Boolean));

        // Customers for this RM
        const rmCustomers = mappedCustomers.filter((c) => {
          return (
            (rId && String(c.rmId) === rId) ||
            (rName && c.rmName && c.rmName.trim().toLowerCase() === rName) ||
            (c.agentId && rmAgentIds.has(String(c.agentId))) ||
            (c.agentName && rmAgentNames.has(c.agentName.trim().toLowerCase()))
          );
        });

        const agentCount = rmAgents.length;
        const customerCount = rmCustomers.length;
        const portfolioAmount = rmCustomers.reduce(
          (sum, c) => sum + Number(c.amount || c.expectedLoanAmount || c.loanAmount || 0),
          0
        );
        const approvedCount = rmCustomers.filter((c) => isApprovedStatus(c.status)).length;
        const conversionRate = customerCount > 0 ? Math.round((approvedCount / customerCount) * 100) : 0;

        // Enrich District
        let districtName = r.districtName;
        let districtId = r.districtId;
        if ((!districtName || !districtId) && r.districtId && districtMap.has(String(r.districtId))) {
          const distObj = districtMap.get(String(r.districtId));
          districtName = distObj.name || districtName;
          districtId = distObj.districtId || distObj.id || districtId;
        } else if (!districtName && rmAgents.length > 0) {
          districtName = rmAgents[0].districtName || '';
          districtId = rmAgents[0].districtId || districtId;
        }

        return {
          ...r,
          districtName: districtName || 'Main District',
          districtId,
          agentCount,
          customerCount,
          portfolioAmount,
          approvedCount,
          conversionRate,
        };
      });

      // 5. Enrich Districts with Real RM Count for Filter Chips
      const enrichedDistricts = mappedDistricts.map((d) => {
        const dId = String(d.districtId || d.id || '');
        const dName = (d.name || '').trim().toLowerCase();
        const rmCount = enrichedRMs.filter(
          (r) =>
            (dId && String(r.districtId) === dId) ||
            (dName && r.districtName && r.districtName.trim().toLowerCase() === dName)
        ).length;

        return {
          ...d,
          rmCount,
        };
      });

      if (isMounted) {
        if (rmsRes.status === 'rejected' && enrichedRMs.length === 0) {
          const err = rmsRes.reason;
          const msg = err?.response?.data?.message || err?.message || 'Failed to load Relationship Managers';
          setError(msg);
        }
        setRMs(enrichedRMs);
        setDistricts(enrichedDistricts);
        setAgents(mappedAgents);
        setCustomers(mappedCustomers);
      }
    } catch (err) {
      if (isMounted) {
        const msg = err?.response?.data?.message || err?.message || 'Failed to load Relationship Managers';
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
        const [rmsRes, districtsRes, agentsRes, customersRes] = await Promise.allSettled([
          backOfficeService.getAllRMs(),
          backOfficeService.getDistricts(),
          backOfficeService.getAllAgents(),
          backOfficeService.getAllCustomers(),
        ]);

        if (!active) return;

        let mappedRMs = [];
        if (rmsRes.status === 'fulfilled' && rmsRes.value) {
          const raw = Array.isArray(rmsRes.value)
            ? rmsRes.value
            : (rmsRes.value?.value || rmsRes.value?.data || []);
          mappedRMs = raw.map(mapRM).filter(Boolean);
        }

        let mappedDistricts = [];
        if (districtsRes.status === 'fulfilled' && districtsRes.value) {
          const raw = Array.isArray(districtsRes.value)
            ? districtsRes.value
            : (districtsRes.value?.value || districtsRes.value?.data || []);
          mappedDistricts = raw.map(mapDistrict).filter(Boolean);
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

        const districtMap = new Map();
        mappedDistricts.forEach((d) => {
          if (d.id) districtMap.set(String(d.id), d);
          if (d.districtId) districtMap.set(String(d.districtId), d);
        });

        const enrichedRMs = mappedRMs.map((r) => {
          const rId = String(r.rmId || r.id || '');
          const rName = (r.name || r.fullName || '').trim().toLowerCase();

          const rmAgents = mappedAgents.filter((ag) => {
            return (
              (rId && String(ag.rmId) === rId) ||
              (rName && ag.rmName && ag.rmName.trim().toLowerCase() === rName)
            );
          });

          const rmAgentIds = new Set(rmAgents.map((a) => String(a.agentId || a.id)).filter(Boolean));
          const rmAgentNames = new Set(rmAgents.map((a) => (a.name || a.fullName || '').trim().toLowerCase()).filter(Boolean));

          const rmCustomers = mappedCustomers.filter((c) => {
            return (
              (rId && String(c.rmId) === rId) ||
              (rName && c.rmName && c.rmName.trim().toLowerCase() === rName) ||
              (c.agentId && rmAgentIds.has(String(c.agentId))) ||
              (c.agentName && rmAgentNames.has(c.agentName.trim().toLowerCase()))
            );
          });

          const agentCount = rmAgents.length;
          const customerCount = rmCustomers.length;
          const portfolioAmount = rmCustomers.reduce(
            (sum, c) => sum + Number(c.amount || c.expectedLoanAmount || c.loanAmount || 0),
            0
          );
          const approvedCount = rmCustomers.filter((c) => isApprovedStatus(c.status)).length;
          const conversionRate = customerCount > 0 ? Math.round((approvedCount / customerCount) * 100) : 0;

          let districtName = r.districtName;
          let districtId = r.districtId;
          if ((!districtName || !districtId) && r.districtId && districtMap.has(String(r.districtId))) {
            const distObj = districtMap.get(String(r.districtId));
            districtName = distObj.name || districtName;
            districtId = distObj.districtId || distObj.id || districtId;
          } else if (!districtName && rmAgents.length > 0) {
            districtName = rmAgents[0].districtName || '';
            districtId = rmAgents[0].districtId || districtId;
          }

          return {
            ...r,
            districtName: districtName || 'Main District',
            districtId,
            agentCount,
            customerCount,
            portfolioAmount,
            approvedCount,
            conversionRate,
          };
        });

        const enrichedDistricts = mappedDistricts.map((d) => {
          const dId = String(d.districtId || d.id || '');
          const dName = (d.name || '').trim().toLowerCase();
          const rmCount = enrichedRMs.filter(
            (r) =>
              (dId && String(r.districtId) === dId) ||
              (dName && r.districtName && r.districtName.trim().toLowerCase() === dName)
          ).length;

          return {
            ...d,
            rmCount,
          };
        });

        if (active) {
          if (rmsRes.status === 'rejected' && enrichedRMs.length === 0) {
            const err = rmsRes.reason;
            const msg = err?.response?.data?.message || err?.message || 'Failed to load Relationship Managers';
            setError(msg);
          }
          setRMs(enrichedRMs);
          setDistricts(enrichedDistricts);
          setAgents(mappedAgents);
          setCustomers(mappedCustomers);
        }
      } catch (err) {
        if (active) {
          const msg = err?.response?.data?.message || err?.message || 'Failed to load Relationship Managers';
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
    rms,
    districts,
    agents,
    customers,
    loading,
    error,
    refetch: fetchData,
  };
}

export default useRMMonitoringData;
