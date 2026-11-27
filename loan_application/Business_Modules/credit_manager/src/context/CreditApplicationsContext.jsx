/**
 * CreditApplicationsContext.jsx
 * --------------------
 * Loads the live Credit Manager application queue once and shares it
 * with the sidebar badges, dashboard, list pages and reports.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import creditManagerService from '../api/creditManagerService';
import backOfficeService from '../../../back_office/src/back-office/api/backOfficeService';
import { getCreditManagerSessionKey, isCreditManagerAuthenticated } from '../auth/authStorage';
import { mapAgent, mapRM } from '../../../back_office/src/back-office/mappers/hierarchyMapper';
import {
  CM_STATUS,
  isCreditManagerApprovedWorkflow,
  isCreditManagerIncomingWorkflow,
  isCreditManagerPendingWorkflow,
  isCreditManagerReviewWorkflow,
  isCreditManagerRejectedWorkflow,
  isCreditManagerStatus,
  isCreditManagerWorkflowCode,
  mapCreditApplication,
} from '../mappers/creditMapper';
import { parseDate } from '../utils/formatters';
import { extractWorkflowStatus } from '../../../../Core/src/utils/applicationWorkflowStatus';

const CreditApplicationsContext = createContext(null);

function sortNewestFirst(a, b) {
  const timeA = parseDate(a.statusUpdatedAt || a.createdAt)?.getTime() || 0;
  const timeB = parseDate(b.statusUpdatedAt || b.createdAt)?.getTime() || 0;
  if (timeA !== timeB) return timeB - timeA;
  return (Number(b.agentCustomerId) || 0) - (Number(a.agentCustomerId) || 0);
}

function uniqueApplications(list) {
  const seen = new Set();
  return list.filter((app) => {
    const id = app.agentCustomerId ?? app.id;
    if (id === null || id === undefined) return true;
    const key = String(id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function CreditApplicationsProvider({ children }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionKey, setSessionKey] = useState(() => getCreditManagerSessionKey());

  useEffect(() => {
    const syncSession = () => setSessionKey(getCreditManagerSessionKey());
    window.addEventListener('storage', syncSession);
    window.addEventListener('sivels:permissions-changed', syncSession);
    return () => {
      window.removeEventListener('storage', syncSession);
      window.removeEventListener('sivels:permissions-changed', syncSession);
    };
  }, []);

  const load = useCallback(async (isActive = () => true) => {
    const requestSessionKey = sessionKey;
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

      const mapped = uniqueApplications(raw
        .map((app) => mapCreditApplication(app, agentById, rmById))
        .filter((app) => {
          if (!app) return false;
          const code = app.workflowStatusCode || extractWorkflowStatus(app).workflowStatusCode;
          if (!code) return isCreditManagerStatus(app.status);
          return isCreditManagerWorkflowCode(code);
        })
      ).sort(sortNewestFirst);
      if (isActive() && getCreditManagerSessionKey() === requestSessionKey) setApplications(mapped);
      return mapped;
    } catch (err) {
      if (isActive()) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load applications.');
      }
    } finally {
      if (isActive()) setLoading(false);
    }
  }, [sessionKey]);

  useEffect(() => {
    let active = true;
    setApplications([]);
    setError(null);
    load(() => active);
    return () => {
      active = false;
    };
  }, [load, sessionKey]);

  const value = useMemo(() => {
    const pendingWorkflowApplications = applications.filter((app) => (
      app.workflowStatusCode
        ? isCreditManagerPendingWorkflow(app.workflowStatusCode)
        : app.status === CM_STATUS.PENDING
    ));
    const received = applications.filter((app) => (
      isCreditManagerIncomingWorkflow(app.workflowStatusCode) && !app.pendingEscalation
    ));
    const pending = applications.filter((app) => (
      isCreditManagerReviewWorkflow(app.workflowStatusCode) && !app.pendingEscalation
    ));
    const approved = applications.filter((app) => (
      app.workflowStatusCode ? isCreditManagerApprovedWorkflow(app.workflowStatusCode) : app.status === CM_STATUS.APPROVED
    ));
    const rejected = applications.filter((app) => (
      app.workflowStatusCode ? isCreditManagerRejectedWorkflow(app.workflowStatusCode) : app.status === CM_STATUS.REJECTED
    ));
    const escalated = pendingWorkflowApplications.filter((app) => app.pendingEscalation?.canCurrentUserApprove);
    const waiting = pendingWorkflowApplications.filter((app) => app.pendingEscalation?.isWaitingForAnotherRole);

    return {
      applications,
      received,
      pending,
      approved,
      rejected,
      escalated,
      waiting,
      counts: {
        received: received.length,
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
        escalated: escalated.length,
        waiting: waiting.length,
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
