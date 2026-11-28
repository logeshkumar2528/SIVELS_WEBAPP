export const DASHBOARD_PAGE_SIZE = 10;

function readValue(record, ...keys) {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null) return record[key];
  }
  return null;
}

function readWorkflow(record) {
  return record?.workflow || record?.Workflow || {};
}

function toSearchText(value) {
  return value === undefined || value === null ? '' : String(value).trim().toLowerCase();
}

export function getCustomerCode(application) {
  return readValue(application, 'customerCode', 'CustomerCode');
}

export function getOfficialApplicationNumber(application) {
  return readValue(application, 'appId', 'AppId');
}

export function getLoanAccountNumber(application) {
  return readValue(application, 'loanAccountNumber', 'LoanAccountNumber');
}

export function getLoanProductName(application) {
  return readValue(application, 'loanProductName', 'LoanProductName');
}

export function getSanctionedLoanAmount(application) {
  return readValue(application, 'sanctionedLoanAmount', 'SanctionedLoanAmount');
}

export function getWorkflowStatusName(application) {
  const workflow = readWorkflow(application);
  return readValue(application, 'workflowStatusName', 'WorkflowStatusName')
    || readValue(workflow, 'workflowStatusName', 'WorkflowStatusName');
}

export function getReceivedDate(application) {
  const workflow = readWorkflow(application);
  return readValue(workflow, 'operationsReceivedAt', 'OperationsReceivedAt');
}

export function getStatusChangedDate(application) {
  return readValue(application, 'statusChangedAt', 'StatusChangedAt');
}

export function getQueueApplicationId(application) {
  return readValue(application, 'agentCustomerId', 'AgentCustomerId');
}

export function getDashboardMetrics(newApplications = [], pendingApplications = []) {
  const newCount = newApplications.length;
  const pendingCount = pendingApplications.length;
  const activeCount = newCount + pendingCount;

  return {
    newCount,
    pendingCount,
    activeCount,
    newPercentage: activeCount > 0 ? (newCount / activeCount) * 100 : 0,
    pendingPercentage: activeCount > 0 ? (pendingCount / activeCount) * 100 : 0,
  };
}

export function combineDashboardApplications(newApplications = [], pendingApplications = []) {
  return [
    ...newApplications.map((application) => ({ ...application, queueType: 'New' })),
    ...pendingApplications.map((application) => ({ ...application, queueType: 'Pending' })),
  ];
}

function dateTimestamp(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function sortRecentApplications(applications = []) {
  return [...applications].sort((left, right) => {
    const rightDate = dateTimestamp(getStatusChangedDate(right));
    const leftDate = dateTimestamp(getStatusChangedDate(left));
    if (rightDate === null && leftDate === null) return 0;
    if (rightDate === null) return -1;
    if (leftDate === null) return 1;
    return rightDate - leftDate;
  });
}

export function matchesDashboardApplication(application, searchTerm, statusFilter) {
  const matchesStatus = statusFilter === 'all' || application.queueType === statusFilter;
  if (!matchesStatus) return false;

  const term = toSearchText(searchTerm);
  if (!term) return true;

  return [
    application.fullName,
    getCustomerCode(application),
    getOfficialApplicationNumber(application),
    getLoanAccountNumber(application),
    getLoanProductName(application),
  ].some((value) => toSearchText(value).includes(term));
}

export function formatDashboardDate(value) {
  const timestamp = dateTimestamp(value);
  if (timestamp === null) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp));
}

export function formatDashboardAmount(value) {
  if (value === undefined || value === null || String(value).trim() === '') return '—';
  const numericValue = typeof value === 'string' ? Number(value.replace(/,/g, '').trim()) : Number(value);
  if (!Number.isFinite(numericValue)) return '—';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(numericValue);
}

export function getDashboardErrorMessage(error) {
  return error?.response?.data?.message
    || error?.response?.data?.title
    || error?.message
    || 'Unable to load the Maker application queues.';
}
