/**
 * CreditApplicationsContext.jsx
 * --------------------
 * Loads the live Credit Manager application queue once and shares it
 * with the sidebar badges, dashboard, list pages and reports.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import creditManagerService from '../api/creditManagerService';
import backOfficeService from '../../../back_office/src/back-office/api/backOfficeService';
import { isCreditManagerAuthenticated } from '../auth/authStorage';
import { mapAgent, mapRM } from '../../../back_office/src/back-office/mappers/hierarchyMapper';
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
      const [appResult, rmResult, agentResult] = await Promise.allSettled([
        creditManagerService.getAllApplications(),
        backOfficeService.getAllRMs(),
        backOfficeService.getAllAgents(),
      ]);

      if (appResult.status === 'rejected') {
        throw appResult.reason;
      }

      const raw = Array.isArray(appResult.value) ? appResult.value : [];
      const unwrapList = (res) => {
        if (Array.isArray(res)) return res;
        return res?.value || res?.data || res?.result || [];
      };

      const rawRms = rmResult.status === 'fulfilled' ? unwrapList(rmResult.value) : [];
      const rawAgents = agentResult.status === 'fulfilled' ? unwrapList(agentResult.value) : [];

      const rms = rawRms.map(mapRM).filter(Boolean);
      const agents = rawAgents.map(mapAgent).filter(Boolean);

      const rmById = new Map(rms.map((rm) => [String(rm.rmId || rm.id), rm]));
      const agentById = new Map(agents.map((agent) => [String(agent.agentId || agent.id), agent]));

      const mapped = raw
        .map((app) => mapCreditApplication(app, agentById, rmById))
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
