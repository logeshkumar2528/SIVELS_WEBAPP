/**
 * useCustomerQueue.js
 * --------------------
 * Purpose:
 *   React hook for fetching and managing the Back Office global customer applications queue.
 *
 * Capabilities:
 *   - Auto-fetches all customer loan applications on mount.
 *   - Normalizes raw API records through hierarchyMapper.
 *   - Provides safe loading, error, and refetch states.
 *   - Guarantees memory-safe execution via unmount guard.
 */

import { useState, useEffect, useCallback } from 'react';
import backOfficeService from '../api/backOfficeService';
import { mapAgent, mapCustomer, mapRM } from '../mappers/hierarchyMapper';

const unwrapList = (response) => {
  if (Array.isArray(response)) return response;
  return response?.value || response?.data || response?.result || [];
};

const enrichCustomers = (rawCustomers, rawRms, rawAgents) => {
  const rms = rawRms.map(mapRM).filter(Boolean);
  const agents = rawAgents.map(mapAgent).filter(Boolean);
  const rmById = new Map(rms.map((rm) => [String(rm.rmId || rm.id), rm]));
  const agentById = new Map(agents.map((agent) => [String(agent.agentId || agent.id), agent]));

  return rawCustomers.map(mapCustomer).filter(Boolean).map((customer) => {
    const agent = agentById.get(String(customer.agentId || ''));
    const rmId = customer.rmId || agent?.rmId || null;
    const rm = rmById.get(String(rmId || ''));

    return {
      ...customer,
      agentId: customer.agentId || agent?.agentId || agent?.id || null,
      agentName: customer.agentName || agent?.name || agent?.fullName || '',
      rmId,
      rmName: customer.rmName || agent?.rmName || rm?.name || rm?.fullName || '',
    };
  });
};

export function useCustomerQueue() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCustomers = useCallback(async () => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    try {
      const [customerResult, rmResult, agentResult] = await Promise.allSettled([
        backOfficeService.getAllCustomers(),
        backOfficeService.getAllRMs(),
        backOfficeService.getAllAgents(),
      ]);
      if (customerResult.status === 'rejected') throw customerResult.reason;
      const mapped = enrichCustomers(
        unwrapList(customerResult.value),
        rmResult.status === 'fulfilled' ? unwrapList(rmResult.value) : [],
        agentResult.status === 'fulfilled' ? unwrapList(agentResult.value) : []
      );

      if (isMounted) {
        setCustomers(mapped);
      }
    } catch (err) {
      if (isMounted) {
        const msg = err?.response?.data?.message || err?.message || 'Failed to fetch customer applications';
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
        const [customerResult, rmResult, agentResult] = await Promise.allSettled([
          backOfficeService.getAllCustomers(),
          backOfficeService.getAllRMs(),
          backOfficeService.getAllAgents(),
        ]);
        if (customerResult.status === 'rejected') throw customerResult.reason;
        const mapped = enrichCustomers(
          unwrapList(customerResult.value),
          rmResult.status === 'fulfilled' ? unwrapList(rmResult.value) : [],
          agentResult.status === 'fulfilled' ? unwrapList(agentResult.value) : []
        );

        if (active) {
          setCustomers(mapped);
        }
      } catch (err) {
        if (active) {
          const msg = err?.response?.data?.message || err?.message || 'Failed to fetch customer applications';
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
    customers,
    loading,
    error,
    refetch: fetchCustomers,
  };
}

export default useCustomerQueue;
