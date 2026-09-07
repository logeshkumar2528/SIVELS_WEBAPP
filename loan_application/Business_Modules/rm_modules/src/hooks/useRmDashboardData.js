import { useEffect, useMemo, useState } from 'react';
import { formatDate } from '../utils/dateHelper';
import {
  buildAllowedAgentIdSet,
  filterAgentsForRm,
  getCurrentRMContext,
  normalizeApplicationStatus,
  resolveApiArray,
} from '../utils/rmContext';
import { buildApplicationDisplayId } from '../pages/applicationWizard/flowUtils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

const EMPTY_DASHBOARD = {
  badgeCounts: { newApplications: 0, verification: 0, returned: 0, approved: 0 },
  dashboardStats: [],
  recentApplicationsData: [],
  agentPerformanceData: [],
  statusSummaryData: [],
  totalApplications: 0,
  activeAgentsCount: 0,
  inProgressCount: 0,
  approvedLoansCount: 0,
  submissionHistoryCount: 0,
  rmProfile: { rmCode: 'RM0001', fullName: 'Relationship Manager', branch: 'Branch Details & Targets' },
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return String(value);
  return `₹${numericValue.toLocaleString('en-IN')}`;
};

const mapApplication = (item, index) => {
  const applicationId =
    item.applicationId ||
    item.applicationNumber ||
    item.agentCustomerId ||
    item.customerId ||
    `${index + 1}`;
  const normalizedStatus = normalizeApplicationStatus(item.status, item.statusName || item.StatusName);

  return {
    id: String(applicationId),
    displayId: buildApplicationDisplayId(item, applicationId),
    customerName: item.fullName || item.customerName || 'Unknown Customer',
    mobile: String(item.mobileNumber || item.mobile || ''),
    loanType: item.loanPurposeName || item.loanType || '',
    amount: formatCurrency(item.expectedLoanAmount ?? item.amount),
    agentName: item.agentName || '',
    createdDate: formatDate(item.createdAt || item.createdDate),
    rawCreatedAt: item.createdAt || item.createdDate || '',
    status: normalizedStatus,
    rawStatus: normalizedStatus,
    agentCustomerId: item.agentCustomerId || item.customerId || null,
    agentId: item.agentId || item.AgentId || null,
  };
};

const buildStatusSummary = (applications) => {
  const groups = [
    { label: 'New', color: '#0284C7' },
    { label: 'Pending', color: '#F59E0B' },
    { label: 'Under Review', color: '#A855F7' },
    { label: 'Logged to HO', color: '#22C55E' },
    { label: 'Returned', color: '#EF4444' },
  ];

  const counts = applications.reduce((acc, app) => {
    const status = app.status || 'New';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const total = applications.length || 1;
  return groups.map((group) => {
    const value = counts[group.label] || 0;
    return {
      ...group,
      value,
      percent: Math.round((value / total) * 100),
    };
  });
};

const buildAgentPerformance = (applications, agents) => {
  const performanceByAgent = new Map();

  agents.forEach((agent, index) => {
    const agentId = Number(agent.agentId || agent.AgentId || index + 1);
    const agentName = agent.agentName || agent.fullName || agent.name || `Agent ${index + 1}`;
    performanceByAgent.set(agentId, {
      name: agentName,
      totalCustomers: 0,
      pendingVerification: 0,
      submitted: 0,
      activeCustomers: 0,
      pendingCollection: '₹0',
    });
  });

  applications.forEach((app) => {
    const agentId = Number(app.agentId);
    const record = performanceByAgent.get(agentId);
    if (!record) return;

    record.totalCustomers += 1;
    if (normalizeText(app.status) === 'pending') record.pendingVerification += 1;
    if (normalizeText(app.status) === 'logged to ho') record.submitted += 1;
    if (normalizeText(app.status) !== 'returned') record.activeCustomers += 1;
  });

  return [...performanceByAgent.values()].map((record, index) => ({
    ...record,
    pendingCollection: `₹${(record.totalCustomers * 1000 + index * 500).toLocaleString('en-IN')}`,
  }));
};

export function useRmDashboardData() {
  const [state, setState] = useState(EMPTY_DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadDashboardData() {
      setIsLoading(true);
      setError('');

      try {
        const rmContext = getCurrentRMContext();
        if (!rmContext.rmId) {
          throw new Error('No RM context found in session.');
        }

        const [agentRes, customerRes, rmRes] = await Promise.all([
          fetch(`${API_BASE}/AgentMaster`),
          fetch(`${API_BASE}/AgentAddCustomer`),
          fetch(`${API_BASE}/RMMaster`),
        ]);

        if (!agentRes.ok) throw new Error(`Failed to load agents (${agentRes.status})`);
        if (!customerRes.ok) throw new Error(`Failed to load applications (${customerRes.status})`);

        const [agentsData, customersData, rmsData] = await Promise.all([
          agentRes.json(),
          customerRes.json(),
          rmRes.ok ? rmRes.json() : Promise.resolve([]),
        ]);

        const matchedRm =
          resolveApiArray(rmsData).find(
            (rm) => Number(rm.rmId || rm.RMId || rm.id) === Number(rmContext.rmId)
          ) || null;

        const rmProfile = {
          rmCode:
            matchedRm?.rmCode ||
            `RM${String(rmContext.rmId).padStart(4, '0')}`,
          fullName:
            matchedRm?.fullName ||
            rmContext.fullName ||
            'Relationship Manager',
          branch:
            matchedRm?.branch ||
            matchedRm?.cityName ||
            rmContext.branch ||
            'Branch Details & Targets',
        };

        const agents = filterAgentsForRm(resolveApiArray(agentsData), rmContext.rmId);
        const allowedAgentIds = buildAllowedAgentIdSet(agents);
        const applications = resolveApiArray(customersData)
          .map(mapApplication)
          .filter((application) => application.agentId && allowedAgentIds.has(Number(application.agentId)));

        // Filter active agents (not marked inactive or disabled)
        const activeAgents = agents.filter((agent) => {
          const statusStr = normalizeText(agent.status ?? agent.isActive ?? agent.IsActive);
          const isInactive =
            statusStr === '0' ||
            statusStr === 'false' ||
            statusStr === 'inactive' ||
            statusStr === 'disabled' ||
            statusStr === 'deactive' ||
            agent.isActive === false;
          return !isInactive;
        });
        const activeAgentsCount = activeAgents.length;

        const totalApplications = applications.length;

        const badgeCounts = {
          newApplications: applications.filter((app) => normalizeText(app.status) === 'new').length,
          verification: applications.filter((app) => normalizeText(app.status) === 'pending').length,
          returned: applications.filter((app) => normalizeText(app.status) === 'returned').length,
          approved: applications.filter((app) => normalizeText(app.status) === 'logged to ho').length,
        };

        const approvedLoansCount = badgeCounts.approved;
        const submissionHistoryCount = totalApplications;

        // Calculate genuine In-Progress drafts from localStorage without duplicating Pending
        let inProgressCount = 0;
        try {
          const storedDraftsRaw = localStorage.getItem('sivels-rm-onboarding-drafts-v9');
          if (storedDraftsRaw) {
            const storedDrafts = JSON.parse(storedDraftsRaw);
            const draftValues = Object.values(storedDrafts);
            inProgressCount = draftValues.filter((draft) => {
              if (!draft) return false;
              const isApproved =
                normalizeText(draft.status) === 'approved' ||
                normalizeText(draft.status) === 'logged to ho' ||
                draft.rawStatus === 2 ||
                draft.rawStatus === '2';
              if (isApproved) return false;
              if (draft.agentId && allowedAgentIds.size > 0 && !allowedAgentIds.has(Number(draft.agentId))) {
                return false;
              }
              const hasProgress = Boolean(
                draft.sections?.personalInformation?.applicant?.firstName ||
                draft.personalInformation?.applicant?.firstName ||
                draft.sections?.addressDetails?.applicant?.addressLine1 ||
                draft.addressDetails?.applicant?.addressLine1 ||
                draft.applicationProductDetailsId ||
                (draft._isHydrated && draft.status !== 'New')
              );
              return hasProgress;
            }).length;
          }
        } catch {
          inProgressCount = 0;
        }

        const statusSummaryData = buildStatusSummary(applications);
        const agentPerformanceData = buildAgentPerformance(applications, agents);

        const dashboardStats = [
          {
            id: 'new-apps',
            title: 'New Applications',
            value: String(badgeCounts.newApplications),
            description: 'Requires Verification',
            trend: 'Live from API',
            trendDirection: 'neutral',
            variant: 'info',
          },
          {
            id: 'pending-verif',
            title: 'Pending Applications',
            value: String(badgeCounts.verification),
            description: 'Awaiting RM Action',
            trend: 'Live from API',
            trendDirection: 'neutral',
            variant: 'warning',
          },
          {
            id: 'approved-apps',
            title: 'Logged to HO',
            value: String(approvedLoansCount),
            description: 'Ready for HO Credit',
            trend: 'Live from API',
            trendDirection: 'neutral',
            variant: 'success',
          },
          {
            id: 'total-agents',
            title: 'Active Agents',
            value: String(activeAgentsCount),
            description: 'Reporting to RM',
            trend: 'Live from API',
            trendDirection: 'neutral',
            variant: 'default',
          },
        ];

        const recentApplicationsData = [...applications]
          .sort((a, b) => {
            const aTime = new Date(a.rawCreatedAt || 0).getTime();
            const bTime = new Date(b.rawCreatedAt || 0).getTime();
            return bTime - aTime;
          })
          .slice(0, 5);

        if (active) {
          setState({
            badgeCounts,
            dashboardStats,
            recentApplicationsData,
            agentPerformanceData,
            statusSummaryData,
            totalApplications,
            activeAgentsCount,
            inProgressCount,
            approvedLoansCount,
            submissionHistoryCount,
            rmProfile,
          });
        }
      } catch (err) {
        console.error('Failed to load RM dashboard data:', err);
        if (active) {
          setError('Unable to load live RM dashboard data right now.');
          setState(EMPTY_DASHBOARD);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadDashboardData();

    return () => {
      active = false;
    };
  }, []);

  return useMemo(
    () => ({
      ...state,
      isLoading,
      error,
    }),
    [state, isLoading, error]
  );
}
