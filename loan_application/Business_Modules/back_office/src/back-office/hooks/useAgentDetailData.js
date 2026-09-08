/**
 * useAgentDetailData.js
 * --------------------
 * Purpose:
 *   React hook for fetching and managing Agent Profile and sourced Customer Applications
 *   in the Back Office Agent Detail view.
 *
 * Architecture:
 *   - Phase 4A Real API Integration:
 *       1. GET /AgentMaster/:agentId -> Fetches agent profile (with fallback to GET /AgentMaster).
 *       2. GET /AgentAddCustomer     -> Fetches all customers globally, filtered by agentId.
 *   - Normalizes raw records via hierarchyMapper (mapAgent, mapCustomer).
 *   - Dynamically enriches district and RM references if missing in agent response.
 *   - Provides reactive state: { agent, customers, loading, error, refetch }.
 *   - Guarantees memory-safe execution via unmount guard.
 */

import { useState, useEffect, useCallback } from 'react';
import backOfficeService from '../api/backOfficeService';
import { mapAgent, mapCustomer } from '../mappers/hierarchyMapper';

export function useAgentDetailData(agentId) {
  const [agent, setAgent] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!agentId) {
      setAgent(null);
      setCustomers([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Agent Profile and Global Customers concurrently
      const [agentRes, customersRes] = await Promise.allSettled([
        (async () => {
          try {
            const res = await backOfficeService.getAgentById(agentId);
            if (res) return res;
          } catch (e) {
            // If getAgentById fails (e.g. parameterized endpoint not matching backend route), fallback to getAllAgents
            const allAgents = await backOfficeService.getAllAgents();
            const list = Array.isArray(allAgents) ? allAgents : (allAgents?.data || allAgents?.value || []);
            const found = list.find((a) => {
              const aid = a.agentId ?? a.AgentId ?? a.id ?? a.Id ?? a.agentCode ?? a.AgentCode;
              return String(aid) === String(agentId);
            });
            if (found) return found;
            throw e;
          }
        })(),
        backOfficeService.getAllCustomers(),
      ]);

      if (!isMounted) return;

      // 2. Process Agent Record
      let mappedAgent = null;
      if (agentRes.status === 'fulfilled' && agentRes.value) {
        const rawAgent = Array.isArray(agentRes.value) ? agentRes.value[0] : agentRes.value;
        mappedAgent = mapAgent(rawAgent);
      }

      // 3. Process Customer Records
      let mappedCustomers = [];
      if (customersRes.status === 'fulfilled' && customersRes.value) {
        const rawCustomers = Array.isArray(customersRes.value)
          ? customersRes.value
          : (customersRes.value?.value || customersRes.value?.data || []);
        mappedCustomers = rawCustomers.map(mapCustomer).filter(Boolean);
      }

      // 4. Filter customers belonging to this Agent
      const agentCustomers = mappedCustomers.filter((c) => {
        if (!c) return false;
        return (
          String(c.agentId) === String(agentId) ||
          (mappedAgent?.id && String(c.agentId) === String(mappedAgent.id)) ||
          (mappedAgent?.agentId && String(c.agentId) === String(mappedAgent.agentId)) ||
          (mappedAgent?.agentCode && c.agentCode && String(c.agentCode) === String(mappedAgent.agentCode)) ||
          (mappedAgent?.name && c.agentName && c.agentName.trim().toLowerCase() === mappedAgent.name.trim().toLowerCase())
        );
      });

      // 5. Enrich agent with customer district/RM context if missing
      if (mappedAgent) {
        if (!mappedAgent.districtName && agentCustomers.length > 0) {
          mappedAgent.districtName = agentCustomers[0].districtName || '';
        }
        if (!mappedAgent.districtId && agentCustomers.length > 0) {
          mappedAgent.districtId = agentCustomers[0].districtId || null;
        }
        if (!mappedAgent.rmName && agentCustomers.length > 0) {
          mappedAgent.rmName = agentCustomers[0].rmName || '';
        }
        if (!mappedAgent.rmId && agentCustomers.length > 0) {
          mappedAgent.rmId = agentCustomers[0].rmId || null;
        }
      }

      if (isMounted) {
        if (agentRes.status === 'rejected' && !mappedAgent) {
          const err = agentRes.reason;
          const msg = err?.response?.data?.message || err?.message || 'Failed to load field agent details';
          setError(msg);
          setAgent(null);
        } else {
          setAgent(mappedAgent);
        }
        setCustomers(agentCustomers);
      }
    } catch (err) {
      if (isMounted) {
        const msg = err?.response?.data?.message || err?.message || 'Failed to load agent information';
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
  }, [agentId]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!agentId) {
        setAgent(null);
        setCustomers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [agentRes, customersRes] = await Promise.allSettled([
          (async () => {
            try {
              const res = await backOfficeService.getAgentById(agentId);
              if (res) return res;
            } catch (e) {
              const allAgents = await backOfficeService.getAllAgents();
              const list = Array.isArray(allAgents) ? allAgents : (allAgents?.data || allAgents?.value || []);
              const found = list.find((a) => {
                const aid = a.agentId ?? a.AgentId ?? a.id ?? a.Id ?? a.agentCode ?? a.AgentCode;
                return String(aid) === String(agentId);
              });
              if (found) return found;
              throw e;
            }
          })(),
          backOfficeService.getAllCustomers(),
        ]);

        if (!active) return;

        let mappedAgent = null;
        if (agentRes.status === 'fulfilled' && agentRes.value) {
          const rawAgent = Array.isArray(agentRes.value) ? agentRes.value[0] : agentRes.value;
          mappedAgent = mapAgent(rawAgent);
        }

        let mappedCustomers = [];
        if (customersRes.status === 'fulfilled' && customersRes.value) {
          const rawCustomers = Array.isArray(customersRes.value)
            ? customersRes.value
            : (customersRes.value?.value || customersRes.value?.data || []);
          mappedCustomers = rawCustomers.map(mapCustomer).filter(Boolean);
        }

        const agentCustomers = mappedCustomers.filter((c) => {
          if (!c) return false;
          return (
            String(c.agentId) === String(agentId) ||
            (mappedAgent?.id && String(c.agentId) === String(mappedAgent.id)) ||
            (mappedAgent?.agentId && String(c.agentId) === String(mappedAgent.agentId)) ||
            (mappedAgent?.agentCode && c.agentCode && String(c.agentCode) === String(mappedAgent.agentCode)) ||
            (mappedAgent?.name && c.agentName && c.agentName.trim().toLowerCase() === mappedAgent.name.trim().toLowerCase())
          );
        });

        if (mappedAgent) {
          if (!mappedAgent.districtName && agentCustomers.length > 0) {
            mappedAgent.districtName = agentCustomers[0].districtName || '';
          }
          if (!mappedAgent.districtId && agentCustomers.length > 0) {
            mappedAgent.districtId = agentCustomers[0].districtId || null;
          }
          if (!mappedAgent.rmName && agentCustomers.length > 0) {
            mappedAgent.rmName = agentCustomers[0].rmName || '';
          }
          if (!mappedAgent.rmId && agentCustomers.length > 0) {
            mappedAgent.rmId = agentCustomers[0].rmId || null;
          }
        }

        if (active) {
          if (agentRes.status === 'rejected' && !mappedAgent) {
            const err = agentRes.reason;
            const msg = err?.response?.data?.message || err?.message || 'Failed to load field agent details';
            setError(msg);
            setAgent(null);
          } else {
            setAgent(mappedAgent);
          }
          setCustomers(agentCustomers);
        }
      } catch (err) {
        if (active) {
          const msg = err?.response?.data?.message || err?.message || 'Failed to load agent information';
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
  }, [agentId]);

  return {
    agent,
    customers,
    loading,
    error,
    refetch: fetchData,
  };
}

export default useAgentDetailData;
