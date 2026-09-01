import { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

const EMPTY_DASHBOARD = {
  badgeCounts: { newApplications: 0, verification: 0, returned: 0 },
  dashboardStats: [],
  recentApplicationsData: [],
  agentPerformanceData: [],
  statusSummaryData: [],
  totalApplications: 0,
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const resolveApiArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.value)) return data.value;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return String(value);
  return `₹${numericValue.toLocaleString('en-IN')}`;
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const mapApplication = (item, index) => {
  const applicationId =
    item.applicationId ||
    item.applicationNumber ||
    item.agentCustomerId ||
    item.customerId ||
    `${index + 1}`;
  const normalizedStatus = String(item.status || 'New').trim();

  return {
    id: String(applicationId),
    customerName: item.fullName || item.customerName || 'Unknown Customer',
    mobile: String(item.mobileNumber || item.mobile || ''),
    loanType: item.loanPurposeName || item.loanType || '',
    amount: formatCurrency(item.expectedLoanAmount ?? item.amount),
    agentName: item.agentName || '',
    createdDate: formatDate(item.createdAt || item.createdDate),
    rawCreatedAt: item.createdAt || item.createdDate || '',
    status: normalizedStatus === 'Draft' ? 'New' : normalizedStatus,
    rawStatus: normalizedStatus,
    agentCustomerId: item.agentCustomerId || item.customerId || null,
    agentId: item.agentId || item.AgentId || null,
  };
};

const buildStatusSummary = (applications) => {
  const groups = [
    { label: 'New', color: '#0284C7' },
    { label: 'Pending Verification', color: '#F59E0B' },
    { label: 'Under Review', color: '#A855F7' },
    { label: 'Approved', color: '#22C55E' },
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
    if (normalizeText(app.status) === 'pending verification') record.pendingVerification += 1;
    if (normalizeText(app.status) === 'approved') record.submitted += 1;
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
        const [agentRes, customerRes] = await Promise.all([
          fetch(`${API_BASE}/AgentMaster`),
          fetch(`${API_BASE}/AgentAddCustomer`),
        ]);

        if (!agentRes.ok) throw new Error(`Failed to load agents (${agentRes.status})`);
        if (!customerRes.ok) throw new Error(`Failed to load applications (${customerRes.status})`);

        const [agentsData, customersData] = await Promise.all([agentRes.json(), customerRes.json()]);
        const agents = resolveApiArray(agentsData);
        const applications = resolveApiArray(customersData).map(mapApplication);

        const statusSummaryData = buildStatusSummary(applications);
        const agentPerformanceData = buildAgentPerformance(applications, agents);
        const totalApplications = applications.length;
        const badgeCounts = {
          newApplications: applications.filter((app) => normalizeText(app.status) === 'new').length,
          verification: applications.filter((app) => normalizeText(app.status) === 'pending verification').length,
          returned: applications.filter((app) => normalizeText(app.status) === 'returned').length,
        };

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
            title: 'Pending Verification',
            value: String(badgeCounts.verification),
            description: 'In Progress',
            trend: 'Live from API',
            trendDirection: 'neutral',
            variant: 'warning',
          },
          {
            id: 'approved-apps',
            title: 'Approved Loans',
            value: String(applications.filter((app) => normalizeText(app.status) === 'approved').length),
            description: 'Current Records',
            trend: 'Live from API',
            trendDirection: 'neutral',
            variant: 'success',
          },
          {
            id: 'total-agents',
            title: 'Active Agents',
            value: String(agents.length),
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
