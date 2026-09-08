/**
 * useAgentMonitoringData.js
 * --------------------
 * Purpose:
 *   React hook for fetching and managing global Field Agents directory with live customer metrics
 *   for the Back Office Agent Monitoring page.
 *
 * Architecture:
 *   - Phase 5A Real API Integration:
 *       1. GET /AgentMaster      -> Fetches all agents globally.
 *       2. GET /RMMaster          -> Fetches all RMs globally (for dropdown and enrichment).
 *       3. GET /District          -> Fetches all Districts globally (for dropdown and enrichment).
 *       4. GET /AgentAddCustomer  -> Fetches all customers globally to aggregate metrics.
 *   - In-memory aggregation of customer counts, applications, portfolio volume, and conversion rate.
 *   - Returns reactive state: { agents, rms, districts, customers, loading, error, refetch }.
 *   - Memory-safe execution with unmount cancellation guards.
 */

import { useState, useEffect, useCallback } from 'react';
import backOfficeService from '../api/backOfficeService';
import { mapAgent, mapRM, mapDistrict, mapCustomer } from '../mappers/hierarchyMapper';

/**
 * Checks if a status represents an approved loan application.
 */
function isApprovedStatus(status) {
  if (status === 4) return true;
  const s = String(status || '').toLowerCase().trim();
  return s.includes('approved');
}

export function useAgentMonitoringData() {
  const [agents, setAgents] = useState([]);
  const [rms, setRMs] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Agents, RMs, Districts, and Customers concurrently
      const [agentsRes, rmsRes, districtsRes, customersRes] = await Promise.allSettled([
        backOfficeService.getAllAgents(),
        backOfficeService.getAllRMs(),
        backOfficeService.getDistricts(),
        backOfficeService.getAllCustomers(),
      ]);

      if (!isMounted) return;

      // 2. Normalize Master Datasets
      let mappedAgents = [];
      if (agentsRes.status === 'fulfilled' && agentsRes.value) {
        const raw = Array.isArray(agentsRes.value)
          ? agentsRes.value
          : (agentsRes.value?.value || agentsRes.value?.data || []);
        mappedAgents = raw.map(mapAgent).filter(Boolean);
      }

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

      let mappedCustomers = [];
      if (customersRes.status === 'fulfilled' && customersRes.value) {
        const raw = Array.isArray(customersRes.value)
          ? customersRes.value
          : (customersRes.value?.value || customersRes.value?.data || []);
        mappedCustomers = raw.map(mapCustomer).filter(Boolean);
      }

      // 3. RM and District Lookups for Rapid Metadata Enrichment
      const rmMap = new Map();
      mappedRMs.forEach((r) => {
        if (r.id) rmMap.set(String(r.id), r);
        if (r.rmId) rmMap.set(String(r.rmId), r);
      });

      const districtMap = new Map();
      mappedDistricts.forEach((d) => {
        if (d.id) districtMap.set(String(d.id), d);
        if (d.districtId) districtMap.set(String(d.districtId), d);
      });

      // 4. In-Memory Agent Metrics Aggregation (Zero N+1 Network Calls)
      const enrichedAgents = mappedAgents.map((ag) => {
        const aId = String(ag.agentId || ag.id || '');
        const aCode = String(ag.code || ag.agentCode || '');
        const aName = (ag.name || ag.fullName || '').trim().toLowerCase();

        // Customers belonging to this agent
        const agCustomers = mappedCustomers.filter((c) => {
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
        const conversionRate = applicationCount > 0 ? Math.round((approvedCount / applicationCount) * 100) : 0;

        // Enrich RM details
        let rmName = ag.rmName;
        let rmId = ag.rmId;
        if ((!rmName || !rmId) && ag.rmId && rmMap.has(String(ag.rmId))) {
          const rmObj = rmMap.get(String(ag.rmId));
          rmName = rmObj.name || rmName;
          rmId = rmObj.rmId || rmObj.id || rmId;
        } else if (!rmName && agCustomers.length > 0) {
          rmName = agCustomers[0].rmName || '';
          rmId = agCustomers[0].rmId || rmId;
        }

        // Enrich District details
        let districtName = ag.districtName;
        let districtId = ag.districtId;
        if ((!districtName || !districtId) && ag.districtId && districtMap.has(String(ag.districtId))) {
          const distObj = districtMap.get(String(ag.districtId));
          districtName = distObj.name || districtName;
          districtId = distObj.districtId || distObj.id || districtId;
        } else if (!districtName && agCustomers.length > 0) {
          districtName = agCustomers[0].districtName || '';
          districtId = agCustomers[0].districtId || districtId;
        }

        return {
          ...ag,
          rmName: rmName || 'Assigned RM',
          rmId,
          districtName: districtName || 'Main District',
          districtId,
          customerCount,
          applicationCount,
          portfolioAmount,
          approvedCount,
          conversionRate,
        };
      });

      if (isMounted) {
        if (agentsRes.status === 'rejected' && enrichedAgents.length === 0) {
          const err = agentsRes.reason;
          const msg = err?.response?.data?.message || err?.message || 'Failed to load Field Agents';
          setError(msg);
        }
        setAgents(enrichedAgents);
        setRMs(mappedRMs);
        setDistricts(mappedDistricts);
        setCustomers(mappedCustomers);
      }
    } catch (err) {
      if (isMounted) {
        const msg = err?.response?.data?.message || err?.message || 'Failed to load Field Agents';
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
        const [agentsRes, rmsRes, districtsRes, customersRes] = await Promise.allSettled([
          backOfficeService.getAllAgents(),
          backOfficeService.getAllRMs(),
          backOfficeService.getDistricts(),
          backOfficeService.getAllCustomers(),
        ]);

        if (!active) return;

        let mappedAgents = [];
        if (agentsRes.status === 'fulfilled' && agentsRes.value) {
          const raw = Array.isArray(agentsRes.value)
            ? agentsRes.value
            : (agentsRes.value?.value || agentsRes.value?.data || []);
          mappedAgents = raw.map(mapAgent).filter(Boolean);
        }

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

        let mappedCustomers = [];
        if (customersRes.status === 'fulfilled' && customersRes.value) {
          const raw = Array.isArray(customersRes.value)
            ? customersRes.value
            : (customersRes.value?.value || customersRes.value?.data || []);
          mappedCustomers = raw.map(mapCustomer).filter(Boolean);
        }

        const rmMap = new Map();
        mappedRMs.forEach((r) => {
          if (r.id) rmMap.set(String(r.id), r);
          if (r.rmId) rmMap.set(String(r.rmId), r);
        });

        const districtMap = new Map();
        mappedDistricts.forEach((d) => {
          if (d.id) districtMap.set(String(d.id), d);
          if (d.districtId) districtMap.set(String(d.districtId), d);
        });

        const enrichedAgents = mappedAgents.map((ag) => {
          const aId = String(ag.agentId || ag.id || '');
          const aCode = String(ag.code || ag.agentCode || '');
          const aName = (ag.name || ag.fullName || '').trim().toLowerCase();

          const agCustomers = mappedCustomers.filter((c) => {
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
          const conversionRate = applicationCount > 0 ? Math.round((approvedCount / applicationCount) * 100) : 0;

          let rmName = ag.rmName;
          let rmId = ag.rmId;
          if ((!rmName || !rmId) && ag.rmId && rmMap.has(String(ag.rmId))) {
            const rmObj = rmMap.get(String(ag.rmId));
            rmName = rmObj.name || rmName;
            rmId = rmObj.rmId || rmObj.id || rmId;
          } else if (!rmName && agCustomers.length > 0) {
            rmName = agCustomers[0].rmName || '';
            rmId = agCustomers[0].rmId || rmId;
          }

          let districtName = ag.districtName;
          let districtId = ag.districtId;
          if ((!districtName || !districtId) && ag.districtId && districtMap.has(String(ag.districtId))) {
            const distObj = districtMap.get(String(ag.districtId));
            districtName = distObj.name || districtName;
            districtId = distObj.districtId || distObj.id || districtId;
          } else if (!districtName && agCustomers.length > 0) {
            districtName = agCustomers[0].districtName || '';
            districtId = agCustomers[0].districtId || districtId;
          }

          return {
            ...ag,
            rmName: rmName || 'Assigned RM',
            rmId,
            districtName: districtName || 'Main District',
            districtId,
            customerCount,
            applicationCount,
            portfolioAmount,
            approvedCount,
            conversionRate,
          };
        });

        if (active) {
          if (agentsRes.status === 'rejected' && enrichedAgents.length === 0) {
            const err = agentsRes.reason;
            const msg = err?.response?.data?.message || err?.message || 'Failed to load Field Agents';
            setError(msg);
          }
          setAgents(enrichedAgents);
          setRMs(mappedRMs);
          setDistricts(mappedDistricts);
          setCustomers(mappedCustomers);
        }
      } catch (err) {
        if (active) {
          const msg = err?.response?.data?.message || err?.message || 'Failed to load Field Agents';
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
    agents,
    rms,
    districts,
    customers,
    loading,
    error,
    refetch: fetchData,
  };
}

export default useAgentMonitoringData;
