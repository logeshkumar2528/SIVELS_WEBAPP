import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FilePlus2,
  Inbox,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOperationsApplication } from '../context/OperationsApplicationContext';
import { buildApplicationRoute, ROUTES } from '../config/routeConfig';
import {
  combineDashboardApplications,
  DASHBOARD_PAGE_SIZE,
  formatDashboardAmount,
  formatDashboardDate,
  getCustomerCode,
  getDashboardErrorMessage,
  getDashboardMetrics,
  getLoanAccountNumber,
  getLoanProductName,
  getQueueApplicationId,
  getReceivedDate,
  getSanctionedLoanAmount,
  getWorkflowStatusName,
  matchesDashboardApplication,
  sortRecentApplications,
} from './operationsDashboardUtils';
import './OperationsMakerDashboard.css';

const RECENT_PREVIEW_SIZE = 4;
const CHART_COLORS = {
  newApplications: '#A8C9B2',
  pendingApplications: '#24563C',
};

function getEmployeeCode(profile) {
  return profile?.employeeCode
    || profile?.EmployeeCode
    || profile?.staffCode
    || profile?.StaffCode
    || '—';
}

function getProfileErrorMessage(error) {
  const status = error?.response?.status;
  if (status === 403) return 'Your account does not have permission to view the Operations profile.';
  if (status === 404) return 'The Operations profile is not available.';
  return 'The Operations profile could not be loaded right now.';
}

function MetricItem({ icon: Icon, label, value, testId, tone }) {
  return (
    <div className={`operations-maker-dashboard-kpi-card operations-maker-dashboard-kpi-card--${tone}`} data-testid={testId}>
      <div className="operations-maker-dashboard-kpi-icon" aria-hidden="true">
        <Icon size={18} />
      </div>
      <div className="operations-maker-dashboard-kpi-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="operations-maker-dashboard-loading" role="status" aria-live="polite">
      <div className="operations-maker-dashboard-skeleton operations-maker-dashboard-skeleton--wide" />
      <div className="operations-maker-dashboard-loading-grid">
        <div className="operations-maker-dashboard-skeleton operations-maker-dashboard-skeleton--panel" />
        <div className="operations-maker-dashboard-skeleton operations-maker-dashboard-skeleton--panel" />
      </div>
      <div className="operations-maker-dashboard-skeleton operations-maker-dashboard-skeleton--table" />
      <span>Loading your application queues…</span>
    </div>
  );
}

function DonutChart({ metrics }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const segments = [
    { key: 'new', value: metrics.newCount, color: CHART_COLORS.newApplications, label: 'New Applications', percentage: metrics.newPercentage },
    { key: 'pending', value: metrics.pendingCount, color: CHART_COLORS.pendingApplications, label: 'Pending Applications', percentage: metrics.pendingPercentage },
  ];
  let offset = 0;

  return (
    <div className="operations-maker-dashboard-chart-content">
      <div className="operations-maker-dashboard-donut-wrap">
        <svg
          className="operations-maker-dashboard-donut"
          viewBox="0 0 140 140"
          role="img"
          aria-label={`Active applications: ${metrics.activeCount}. New ${metrics.newCount}, pending ${metrics.pendingCount}.`}
        >
          <title>Application workload distribution</title>
          <circle className="operations-maker-dashboard-donut-track" cx="70" cy="70" r={radius} />
          {segments.map((segment) => {
            const length = metrics.activeCount > 0
              ? circumference * (segment.value / metrics.activeCount)
              : 0;
            const currentOffset = offset;
            offset += length;
            return length > 0 ? (
              <circle
                key={segment.key}
                className="operations-maker-dashboard-donut-segment"
                cx="70"
                cy="70"
                r={radius}
                stroke={segment.color}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-currentOffset}
              />
            ) : null;
          })}
          <text x="70" y="67" textAnchor="middle" className="operations-maker-dashboard-donut-value">
            {metrics.activeCount}
          </text>
          <text x="70" y="84" textAnchor="middle" className="operations-maker-dashboard-donut-label">
            Active
          </text>
        </svg>
      </div>
      <div className="operations-maker-dashboard-legend" aria-label="Application workload legend">
        {segments.map((segment) => (
          <div className="operations-maker-dashboard-legend-item" key={segment.key}>
            <span className="operations-maker-dashboard-legend-dot" style={{ backgroundColor: segment.color }} aria-hidden="true" />
            <span className="operations-maker-dashboard-legend-label">{segment.label}</span>
            <strong>{segment.value}</strong>
            <span className="operations-maker-dashboard-legend-percentage">{segment.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkspaceCard({ icon: Icon, title, count, onClick }) {
  return (
    <button type="button" className="operations-maker-dashboard-workspace-card" onClick={onClick}>
      <span className="operations-maker-dashboard-workspace-icon" aria-hidden="true">
        <Icon size={18} />
      </span>
      <span className="operations-maker-dashboard-workspace-copy">
        <span className="operations-maker-dashboard-workspace-title">{title}</span>
        <strong>{count}</strong>
      </span>
      <ArrowRight size={17} aria-hidden="true" />
    </button>
  );
}

function QueueErrorState({ error, onRetry, loading }) {
  return (
    <section className="operations-maker-dashboard-state operations-maker-dashboard-state--error" role="alert">
      <div className="operations-maker-dashboard-state-icon" aria-hidden="true"><Inbox size={22} /></div>
      <div>
        <h2>Application queues unavailable</h2>
        <p>{getDashboardErrorMessage(error)}</p>
        <button type="button" onClick={onRetry} disabled={loading}>
          <RefreshCw size={15} aria-hidden="true" />
          Retry
        </button>
      </div>
    </section>
  );
}

function RecentApplications({ applications, searchTerm, setSearchTerm, statusFilter, setStatusFilter, onOpenNewQueue, onContinuePending }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  const filteredApplications = useMemo(() => applications.filter(
    (application) => matchesDashboardApplication(application, searchTerm, statusFilter),
  ), [applications, searchTerm, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / DASHBOARD_PAGE_SIZE));
  const visibleApplications = showAll
    ? filteredApplications.slice((currentPage - 1) * DASHBOARD_PAGE_SIZE, currentPage * DASHBOARD_PAGE_SIZE)
    : filteredApplications.slice(0, RECENT_PREVIEW_SIZE);

  useEffect(() => {
    setCurrentPage(1);
    setShowAll(false);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <section className="operations-maker-dashboard-table-card" aria-labelledby="operations-maker-recent-title">
      <div className="operations-maker-dashboard-table-heading">
        <div>
          <h2 id="operations-maker-recent-title">Recent Applications</h2>
          <p>Review the latest applications in your authorized work queues.</p>
        </div>
        {filteredApplications.length > RECENT_PREVIEW_SIZE && (
          <button
            type="button"
            className="operations-maker-dashboard-text-button"
            onClick={() => {
              setCurrentPage(1);
              setShowAll((current) => !current);
            }}
          >
            {showAll ? 'Show less' : 'View all'}
          </button>
        )}
      </div>

      <div className="operations-maker-dashboard-table-toolbar">
        <label className="operations-maker-dashboard-search">
          <Search size={16} aria-hidden="true" />
          <span className="operations-maker-dashboard-sr-only">Search applications</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search customer, application or loan"
            aria-label="Search dashboard applications"
          />
        </label>
        <label className="operations-maker-dashboard-filter">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter applications by status">
            <option value="all">All Status</option>
            <option value="New">New</option>
            <option value="Pending">Pending</option>
          </select>
        </label>
        <span className="operations-maker-dashboard-result-count">
          Showing {visibleApplications.length} of {filteredApplications.length}
        </span>
      </div>

      <div className="operations-maker-dashboard-table-wrap">
        <table className="operations-maker-dashboard-table">
          <thead>
            <tr>
              <th scope="col">S.No.</th>
              <th scope="col">Customer</th>
              <th scope="col">Loan Account Number</th>
              <th scope="col">Loan Type</th>
              <th scope="col">Sanctioned Amount</th>
              <th scope="col">Workflow Status</th>
              <th scope="col">Received Date</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleApplications.map((application, index) => {
              const rowNumber = showAll
                ? ((currentPage - 1) * DASHBOARD_PAGE_SIZE) + index + 1
                : index + 1;
              const applicationId = getQueueApplicationId(application);
              return (
                <tr key={`${application.queueType}-${applicationId}`}>
                  <td>{rowNumber}</td>
                  <td>
                    <div className="operations-maker-dashboard-customer">
                      <strong>{application.fullName || '—'}</strong>
                      <span>{getCustomerCode(application) || '—'}</span>
                    </div>
                  </td>
                  <td>{getLoanAccountNumber(application) || '—'}</td>
                  <td>{getLoanProductName(application) || '—'}</td>
                  <td>{formatDashboardAmount(getSanctionedLoanAmount(application))}</td>
                  <td><span className="operations-maker-dashboard-status">{getWorkflowStatusName(application) || '—'}</span></td>
                  <td>{formatDashboardDate(getReceivedDate(application))}</td>
                  <td>
                    {application.queueType === 'New' ? (
                      <button type="button" className="operations-maker-dashboard-action" onClick={onOpenNewQueue}>
                        Open Queue
                      </button>
                    ) : (
                      <button type="button" className="operations-maker-dashboard-action" onClick={() => onContinuePending(applicationId)}>
                        Continue
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {visibleApplications.length === 0 && (
              <tr>
                <td colSpan={8} className="operations-maker-dashboard-empty">No applications available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAll && filteredApplications.length > 0 && (
        <div className="operations-maker-dashboard-pagination" aria-label="Recent applications pagination">
          <button type="button" onClick={() => setCurrentPage((page) => page - 1)} disabled={currentPage === 1} aria-label="Previous page">
            <ChevronLeft size={16} aria-hidden="true" />
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button type="button" onClick={() => setCurrentPage((page) => page + 1)} disabled={currentPage === totalPages} aria-label="Next page">
            Next
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}

export default function OperationsMakerDashboard({ profile, profileLoading, profileError, displayName }) {
  const navigate = useNavigate();
  const {
    newApplications,
    pendingApplications,
    queueStatus,
    queueError,
    refreshQueue,
  } = useOperationsApplication();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const metrics = useMemo(() => getDashboardMetrics(newApplications, pendingApplications), [newApplications, pendingApplications]);
  const applications = useMemo(() => sortRecentApplications(
    combineDashboardApplications(newApplications, pendingApplications),
  ), [newApplications, pendingApplications]);
  const queueLoading = queueStatus === 'idle' || queueStatus === 'loading';

  const handleRefresh = () => {
    if (!queueLoading) refreshQueue();
  };

  return (
    <div className="operations-maker-dashboard">
      {profileError && (
        <div className="operations-maker-dashboard-profile-alert" role="alert">
          {getProfileErrorMessage(profileError)}
        </div>
      )}

      {queueStatus === 'error' ? (
        <QueueErrorState error={queueError} onRetry={handleRefresh} loading={queueLoading} />
      ) : queueLoading ? (
        <LoadingState />
      ) : (
        <>
          <section className="operations-maker-dashboard-welcome" aria-labelledby="operations-maker-welcome-title">
            <div className="operations-maker-dashboard-welcome-top">
              <div>
                <p className="operations-maker-dashboard-overline">Welcome back</p>
                <h2 id="operations-maker-welcome-title">{profileLoading ? 'Maker' : displayName}</h2>
                <p className="operations-maker-dashboard-employee">Employee code: {getEmployeeCode(profile)}</p>
              </div>
              <div className="operations-maker-dashboard-role" aria-label="Current role: Maker">
                <ShieldCheck size={17} aria-hidden="true" />
                Maker
              </div>
            </div>
          </section>

          <section className="operations-maker-dashboard-kpis" aria-label="Application metrics">
            <MetricItem icon={BriefcaseBusiness} label="Active Applications" value={metrics.activeCount} testId="active-applications-metric" tone="active" />
            <MetricItem icon={FilePlus2} label="New Applications" value={metrics.newCount} testId="new-applications-metric" tone="new" />
            <MetricItem icon={Clock3} label="Pending Applications" value={metrics.pendingCount} testId="pending-applications-metric" tone="pending" />
          </section>

          <div className="operations-maker-dashboard-secondary-grid">
            <section className="operations-maker-dashboard-chart-card" aria-labelledby="operations-maker-workload-title">
              <div className="operations-maker-dashboard-card-heading">
                <div>
                  <h2 id="operations-maker-workload-title">Workload Overview</h2>
                  <p>Current applications across your queues.</p>
                </div>
                <Activity size={20} aria-hidden="true" />
              </div>
              <DonutChart metrics={metrics} />
            </section>

            <section className="operations-maker-dashboard-workspace" aria-labelledby="operations-maker-workspace-title">
              <div className="operations-maker-dashboard-card-heading">
                <div>
                  <h2 id="operations-maker-workspace-title">Quick Workspace</h2>
                  <p>Jump back into your processing queues.</p>
                </div>
                <CheckCircle2 size={20} aria-hidden="true" />
              </div>
              <div className="operations-maker-dashboard-workspace-list">
                <WorkspaceCard
                  icon={FilePlus2}
                  title="New Applications"
                  count={metrics.newCount}
                  onClick={() => navigate(ROUTES.MAKER_NEW_APPLICATIONS)}
                />
                <WorkspaceCard
                  icon={Clock3}
                  title="Pending Applications"
                  count={metrics.pendingCount}
                  onClick={() => navigate(ROUTES.MAKER_PENDING_APPLICATIONS)}
                />
              </div>
            </section>
          </div>

          <RecentApplications
            applications={applications}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onOpenNewQueue={() => navigate(ROUTES.MAKER_NEW_APPLICATIONS)}
            onContinuePending={(applicationId) => navigate(buildApplicationRoute(ROUTES.MAKER_LOAN_BASIC_DETAILS, applicationId))}
          />
        </>
      )}
    </div>
  );
}
