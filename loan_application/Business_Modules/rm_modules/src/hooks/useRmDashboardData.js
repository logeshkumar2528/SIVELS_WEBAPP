import { useEffect, useMemo, useState } from 'react';
import { formatDate } from '../utils/dateHelper';
import {
  buildAllowedAgentIdSet,
  filterAgentsForRm,
  getCurrentRMContext,
  normalizeApplicationStatus,
  resolveApiArray,
} from '../utils/rmContext';
import { resolveApplicationOwnership } from '../utils/ownershipHelper';
import { buildApplicationDisplayId } from '../pages/applicationWizard/flowUtils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

const EMPTY_DASHBOARD = {
  badgeCounts: {
    newApplications: 0,
    verification: 0,
    returned: 0,
    approved: 0,
    customerSubmissionHistory: 0,
    submissionHistory: 0,
    myAgents: 0,
  },
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

const mapApplication = (item, index, agentsById = {}, rmsById = {}, rejections = []) => {
  const applicationId =
    item.applicationId ||
    item.applicationNumber ||
    item.agentCustomerId ||
    item.customerId ||
    item.rmCustomerId ||
    item.rMCustomerId ||
    `${index + 1}`;
  let normalizedStatus = normalizeApplicationStatus(item.status, item.statusName || item.StatusName);

  if (rejections && rejections.length > 0) {
    const hasActiveReturn = rejections.some((r) => r.status === 'ReturnedToRM');
    if (hasActiveReturn) {
      normalizedStatus = 'Returned';
    }
  }

  const ownership = resolveApplicationOwnership(item, agentsById, rmsById);
  const officialAppId = item.appId || item.AppId || item.App_Id || null;

  return {
    id: String(applicationId),
    appId: officialAppId,
    displayId: officialAppId || buildApplicationDisplayId(item, applicationId),
    customerName: item.fullName || item.customerName || 'Unknown Customer',
    mobile: String(item.mobileNumber || item.mobile || ''),
    loanType: item.loanProductName || item.loanPurposeName || item.loanType || '',
    amount: formatCurrency(item.expectedLoanAmount ?? item.amount),
    agentName: ownership.agentName,
    createdDate: formatDate(item.createdAt || item.createdDate),
    rawCreatedAt: item.createdAt || item.createdDate || '',
    status: normalizedStatus,
    rawStatus: normalizedStatus,
    agentCustomerId: item.agentCustomerId || item.customerId || item.rmCustomerId || item.rMCustomerId || null,
    agentId: ownership.agentId,
    rmId: ownership.rmId,
    isDirectRm: ownership.isDirectRm,
    isAgentCreated: ownership.isAgentCreated,
    rejections: rejections || [],
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
      id: agentId,
      agentId,
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

        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        const authHeaders = {};
        if (token) authHeaders['Authorization'] = `Bearer ${token}`;

        const [agentRes, customerRes, rmRes, rejectionsRes, appProdRes] = await Promise.all([
          fetch(`${API_BASE}/AgentMaster`, { headers: authHeaders }),
          fetch(`${API_BASE}/AgentAddCustomer`, { headers: authHeaders }),
          fetch(`${API_BASE}/RMMaster`, { headers: authHeaders }).catch(() => null),
          fetch(`${API_BASE}/BackOfficeDocumentRejection/rm/${rmContext.rmId}/returned`, { headers: authHeaders }).catch(() => null),
          fetch(`${API_BASE}/ApplicationProductDetails`, { headers: authHeaders }).catch(() => null),
        ]);

        if (!agentRes.ok) throw new Error(`Failed to load agents (${agentRes.status})`);
        if (!customerRes.ok) throw new Error(`Failed to load applications (${customerRes.status})`);

        const [agentsData, customersData] = await Promise.all([
          agentRes.json(),
          customerRes.json(),
        ]);

        let rmsData = [];
        if (rmRes && rmRes.ok) {
          try {
            const rData = await rmRes.json();
            rmsData = resolveApiArray(rData);
          } catch {
            rmsData = [];
          }
        }
        const rmsById = rmsData.reduce((result, rm) => {
          const id = rm.rmId || rm.RMId || rm.id;
          if (id !== undefined && id !== null) result[String(id)] = rm;
          return result;
        }, {});

        let returnedRejections = [];
        if (rejectionsRes && rejectionsRes.ok) {
          try {
            const rejData = await rejectionsRes.json();
            returnedRejections = resolveApiArray(rejData);
          } catch {
            returnedRejections = [];
          }
        }

        let appProdList = [];
        if (appProdRes && appProdRes.ok) {
          try {
            const pData = await appProdRes.json();
            appProdList = resolveApiArray(pData);
          } catch {
            appProdList = [];
          }
        }

        const rmOwnedCustomerIds = new Set();
        appProdList.forEach((p) => {
          if (Number(p.rmId || p.RMId) === Number(rmContext.rmId) && p.agentCustomerId) {
            rmOwnedCustomerIds.add(String(p.agentCustomerId));
          }
        });

        const activeRejectionsByCustId = {};
        returnedRejections.forEach((rej) => {
          if (rej.status === 'ReturnedToRM' && rej.agentCustomerId) {
            const k = String(rej.agentCustomerId);
            if (!activeRejectionsByCustId[k]) activeRejectionsByCustId[k] = [];
            activeRejectionsByCustId[k].push(rej);
          }
        });

        const allAgents = resolveApiArray(agentsData);
        const agentsById = allAgents.reduce((result, agent) => {
          const id = agent.agentId || agent.AgentId;
          if (id !== undefined && id !== null) result[String(id)] = agent;
          return result;
        }, {});

        const matchedRm =
          rmsData.find(
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

        const currentRmId = Number(rmContext.rmId || 0);
        const matchedRmName = normalizeText(matchedRm?.fullName || rmContext?.fullName || '');

        const myAgentsList = allAgents.filter((agent) => {
          const agentRmId = Number(
            agent.rmId ||
            agent.RMId ||
            agent.relationshipManagerId ||
            agent.RelationshipManagerId ||
            agent.managerId ||
            agent.ManagerId ||
            agent.reportingManagerId ||
            agent.reportToRmId ||
            0
          );
          const agentCreator = Number(agent.createdBy || agent.createdby || 0);
          const assignedRmName = normalizeText(
            agent.rmName ||
            agent.RMName ||
            agent.relationshipManager ||
            agent.relationshipManagerName ||
            ''
          );

          if (currentRmId && agentRmId === currentRmId) return true;
          if (currentRmId && agentCreator === currentRmId) return true;
          if (!agentRmId && matchedRmName && assignedRmName === matchedRmName) {
            return true;
          }
          return false;
        });

        const allowedAgentIds = buildAllowedAgentIdSet(myAgentsList);

        const allCustomers = resolveApiArray(customersData);
        const applications = allCustomers
          .filter((item) => {
            const ownership = resolveApplicationOwnership(item, agentsById, rmsById);
            const rowCustId = String(item.agentCustomerId || item.customerId || '');
            const isAgentOwned = Boolean(
              ownership.isAgentCreated &&
              ownership.agentId &&
              allowedAgentIds.has(Number(ownership.agentId))
            );
            const isDirectRmOwned = Boolean(
              ownership.isDirectRm && (
                rmOwnedCustomerIds.has(rowCustId) ||
                Number(ownership.rmId) === Number(rmContext.rmId) ||
                Number(item.rmId || item.RMId) === Number(rmContext.rmId) ||
                Number(item.createdBy || item.CreatedBy) === Number(rmContext.rmId)
              )
            );
            const hasActiveRejection = Boolean(activeRejectionsByCustId[rowCustId]);
            return isAgentOwned || isDirectRmOwned || hasActiveRejection;
          })
          .map((item, index) => {
            const rowCustId = String(item.agentCustomerId || item.customerId || '');
            const itemRejections = activeRejectionsByCustId[rowCustId] || [];
            return mapApplication(item, index, agentsById, rmsById, itemRejections);
          });

        const myDirectCustomers = allCustomers.filter((c) => {
          const role = String(
            c.createdByRole ??
            c.CreatedByRole ??
            c.created_by_role ??
            c.raw?.createdByRole ??
            ''
          ).trim().toLowerCase();

          const rawAgentId = Number(
            c.agentId ??
            c.AgentId ??
            c.agent_id ??
            c.raw?.agentId ??
            0
          );

          // Exclude any record with an Agent owner or Agent role
          if (role === 'agent' || rawAgentId > 0) return false;

          const recordRmId = Number(
            c.rmId ??
            c.RmId ??
            c.RMId ??
            c.rm_id ??
            c.raw?.rmId ??
            0
          );

          const creatorId = Number(
            c.createdByUserId ??
            c.CreatedByUserId ??
            c.created_by_user_id ??
            c.createdBy ??
            c.CreatedBy ??
            c.created_by ??
            c.raw?.createdByUserId ??
            c.raw?.createdBy ??
            0
          );

          const belongsToCurrentRm = recordRmId === currentRmId || creatorId === currentRmId;
          const hasNoAgentOwner = !rawAgentId || rawAgentId <= 0;
          const isExplicitRmCreated = role === 'rm';

          return belongsToCurrentRm && hasNoAgentOwner && isExplicitRmCreated;
        });

        // Filter active agents (not marked inactive or disabled)
        const activeAgents = myAgentsList.filter((agent) => {
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
          customerSubmissionHistory: myDirectCustomers.length,
          submissionHistory: totalApplications,
          myAgents: myAgentsList.length,
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
              if ((!draft.agentId || draft.agentId === '' || draft.agentId === 0) && draft.rmId && Number(draft.rmId) !== Number(rmContext.rmId)) {
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
        const agentPerformanceData = buildAgentPerformance(applications, myAgentsList);

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
