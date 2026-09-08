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
import { mapCustomer } from '../mappers/hierarchyMapper';

export function useCustomerQueue() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCustomers = useCallback(async () => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    try {
      const rawData = await backOfficeService.getAllCustomers();
      const list = Array.isArray(rawData) ? rawData : (rawData?.value || rawData?.data || []);
      const mapped = list.map(mapCustomer).filter(Boolean);

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
        const rawData = await backOfficeService.getAllCustomers();
        const list = Array.isArray(rawData) ? rawData : (rawData?.value || rawData?.data || []);
        const mapped = list.map(mapCustomer).filter(Boolean);

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
