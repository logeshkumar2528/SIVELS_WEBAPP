/**
 * CreditApplicationsContext.jsx
 * --------------------
 * Loads the live Credit Manager application queue once and shares it
 * with the sidebar badges, dashboard, list pages and reports.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import creditManagerService from '../api/creditManagerService';
import { isCreditManagerAuthenticated } from '../auth/authStorage';
import { CM_STATUS, isCreditManagerStatus, mapCreditApplication } from '../mappers/creditMapper';
import { parseDate } from '../utils/formatters';

const CreditApplicationsContext = createContext(null);

function sortNewestFirst(a, b) {
  const timeA = parseDate(a.statusUpdatedAt || a.createdAt)?.getTime() || 0;
  const timeB = parseDate(b.statusUpdatedAt || b.createdAt)?.getTime() || 0;
  if (timeA !== timeB) return timeB - timeA;
  return (Number(b.agentCustomerId) || 0) - (Number(a.agentCustomerId) || 0);
}

export function CreditApplicationsProvider({ children }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (isActive = () => true) => {
    if (!isCreditManagerAuthenticated()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const raw = await creditManagerService.getAllApplications();
      const mapped = raw
        .map(mapCreditApplication)
        .filter((app) => app && isCreditManagerStatus(app.status))
        .sort(sortNewestFirst);
      if (isActive()) setApplications(mapped);
    } catch (err) {
      if (isActive()) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load applications.');
      }
    } finally {
      if (isActive()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    load(() => active);
    return () => {
      active = false;
    };
  }, [load]);

  const value = useMemo(() => {
    const byStatus = (status) => applications.filter((app) => app.status === status);
    const pending = byStatus(CM_STATUS.PENDING);
    const approved = byStatus(CM_STATUS.APPROVED);
    const rejected = byStatus(CM_STATUS.REJECTED);

    return {
      applications,
      pending,
      approved,
      rejected,
      counts: {
        received: applications.length,
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
      },
      loading,
      error,
      refetch: () => load(),
    };
  }, [applications, loading, error, load]);

  return (
    <CreditApplicationsContext.Provider value={value}>
      {children}
    </CreditApplicationsContext.Provider>
  );
}

export function useCreditApplications() {
  const ctx = useContext(CreditApplicationsContext);
  if (!ctx) {
    throw new Error('useCreditApplications must be used inside CreditApplicationsProvider');
  }
  return ctx;
}
