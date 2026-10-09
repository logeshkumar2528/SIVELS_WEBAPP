import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../../back_office/src/back-office/components/StatCard/StatCard';
import iconMap from '../../../back_office/src/back-office/config/iconMap';
import '../../../back_office/src/back-office/pages/Dashboard/Dashboard.css';
import '../../../back_office/src/back-office/pages/SubmitToCredit/SubmitToCredit.css';
import '../styles/creditManager.css';
import { ROUTES } from '../config/routeConfig';
import { useCreditApplications } from '../context/CreditApplicationsContext';
import {
  applicationNoColumn,
  customerColumn,
  productColumn,
  amountColumn,
  rmAgentColumn,
  statusColumn,
} from '../components/applicationColumns';
import { formatCurrency } from '../utils/formatters';

const RECENT_LIMIT = 5;
const recentColumns = [applicationNoColumn, customerColumn, productColumn, amountColumn, rmAgentColumn, statusColumn];

function sumAmount(list) {
  return list.reduce((total, app) => total + (Number(app.expectedLoanAmount) || 0), 0);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { applications, pending, approved, rejected, counts, loading, error, refetch } = useCreditApplications();

  const FileTextIcon = iconMap['FileText'];
  const ClockIcon = iconMap['Clock'];
  const CheckCircleIcon = iconMap['CheckCircle'];
  const XCircleIcon = iconMap['XCircle'];
  const BarChartIcon = iconMap['BarChart2'];
  const WalletIcon = iconMap['Wallet'] || iconMap['BadgeIndianRupee'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const AlertCircleIcon = iconMap['AlertCircle'] || iconMap['AlertTriangle'];
  const RefreshCwIcon = iconMap['RefreshCw'] || iconMap['RotateCcw'];

  const amounts = useMemo(() => ({
    received: sumAmount(applications),
    pending: sumAmount(pending),
    approved: sumAmount(approved),
    rejected: sumAmount(rejected),
  }), [applications, pending, approved, rejected]);

  const recentApps = applications.slice(0, RECENT_LIMIT);

  return (
    <div className="bo-dashboard">
      {error && (
        <div className="bo-table-error-container" role="alert">
          <div className="bo-error-flex">
            {AlertCircleIcon && <AlertCircleIcon size={24} className="bo-error-icon" />}
            <div className="bo-error-content">
              <h4>Unable to Load Dashboard Data</h4>
              <p>{error}</p>
            </div>
          </div>
          <button type="button" className="bo-btn-retry" onClick={refetch}>
            {RefreshCwIcon && <RefreshCwIcon size={13} />}
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* SECTION 1 — KPI METRIC CARDS */}
      <section className="bo-kpi-grid" aria-label="Credit Review KPI Overview">
        <StatCard
          icon={FileTextIcon && <FileTextIcon size={22} strokeWidth={1.8} />}
          title="Received Applications"
          value={counts.received}
          description="Sent by Back Office"
          trend={`${formatCurrency(amounts.received)} Total Value`}
          trendDirection="neutral"
          variant="default"
          onClick={() => navigate(ROUTES.RECEIVED)}
          loading={loading}
        />
        <StatCard
          icon={ClockIcon && <ClockIcon size={22} strokeWidth={1.8} />}
          title="Pending Review"
          value={counts.pending}
          description="Awaiting Credit Decision"
          trend={`${formatCurrency(amounts.pending)} In Review`}
          trendDirection="neutral"
          variant="warning"
          onClick={() => navigate(ROUTES.PENDING)}
          loading={loading}
        />
        <StatCard
          icon={CheckCircleIcon && <CheckCircleIcon size={22} strokeWidth={1.8} />}
          title="Approved Applications"
          value={counts.approved}
          description="Credit Approved"
          trend={`${formatCurrency(amounts.approved)} Approved`}
          trendDirection="up"
          variant="success"
          onClick={() => navigate(ROUTES.APPROVED)}
          loading={loading}
        />
        <StatCard
          icon={XCircleIcon && <XCircleIcon size={22} strokeWidth={1.8} />}
          title="Rejected Applications"
          value={counts.rejected}
          description="Declined in Credit Review"
          trend={`${formatCurrency(amounts.rejected)} Rejected`}
          trendDirection="down"
          variant="danger"
          onClick={() => navigate(ROUTES.REJECTED)}
          loading={loading}
        />
      </section>

      {/* SECTION 2 — PORTFOLIO SNAPSHOT & QUICK ACTIONS */}
      <section className="bo-summary-panel">
        <div className="bo-summary-card">
          <div className="bo-summary-card-header">
            <div className="bo-summary-icon bo-summary-icon--green">
              {WalletIcon && <WalletIcon size={20} />}
            </div>
            <div>
              <h3>Credit Portfolio Summary</h3>
              <p>Loan value of applications under Credit Manager review</p>
            </div>
          </div>
          <div className="bo-summary-amounts">
            <div className="bo-amount-item">
              <small>Total Received</small>
              <strong>{formatCurrency(amounts.received)}</strong>
            </div>
            <div className="bo-amount-item is-success">
              <small>Approved Amount</small>
              <strong>{formatCurrency(amounts.approved)}</strong>
            </div>
            <div className="bo-amount-item is-warning">
              <small>Pending Review</small>
              <strong>{formatCurrency(amounts.pending)}</strong>
            </div>
          </div>
        </div>

        <div className="bo-quick-actions-card">
          <h3>Credit Review Navigation</h3>
          <p>Quick access to credit review queues</p>
          <div className="bo-quick-actions-list">
            <button type="button" className="bo-quick-action-item" onClick={() => navigate(ROUTES.PENDING)}>
              <div className="bo-qa-icon">{ClockIcon && <ClockIcon size={18} />}</div>
              <div className="bo-qa-text">
                <strong>Pending Review Queue</strong>
                <small>Review {counts.pending} applications awaiting a credit decision</small>
              </div>
              {ArrowRightIcon && <ArrowRightIcon size={16} className="bo-qa-arrow" />}
            </button>

            <button type="button" className="bo-quick-action-item" onClick={() => navigate(ROUTES.APPROVED)}>
              <div className="bo-qa-icon">{CheckCircleIcon && <CheckCircleIcon size={18} />}</div>
              <div className="bo-qa-text">
                <strong>Approved Applications</strong>
                <small>{counts.approved} applications approved by Credit Manager</small>
              </div>
              {ArrowRightIcon && <ArrowRightIcon size={16} className="bo-qa-arrow" />}
            </button>

            <button type="button" className="bo-quick-action-item" onClick={() => navigate(ROUTES.REPORTS)}>
              <div className="bo-qa-icon">{BarChartIcon && <BarChartIcon size={18} />}</div>
              <div className="bo-qa-text">
                <strong>Credit Reports</strong>
                <small>Status-wise summary of all {counts.received} received applications</small>
              </div>
              {ArrowRightIcon && <ArrowRightIcon size={16} className="bo-qa-arrow" />}
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 3 — RECENT APPLICATIONS */}
      <section className="bo-section" aria-label="Recent Applications">
        <div className="bo-section-header">
          <div>
            <h2 className="bo-section-title">Recent Applications</h2>
            <p className="bo-section-subtitle">Latest applications received from the Back Office</p>
          </div>
          <button type="button" className="bo-btn bo-btn--outline" onClick={() => navigate(ROUTES.RECEIVED)}>
            <span>View All Applications</span>
            {ArrowRightIcon && <ArrowRightIcon size={16} />}
          </button>
        </div>

        <div className="stc-table-card">
          {loading ? (
            <div className="bo-table-loading-container" aria-live="polite">
              <div className="bo-loading-spinner" aria-hidden="true" />
              <p className="bo-loading-text">Loading recent applications...</p>
            </div>
          ) : (
            <div className="stc-table-scroll">
              <table className="stc-table">
                <thead>
                  <tr>
                    {recentColumns.map((col) => (
                      <th key={col.key}>{col.header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentApps.map((app) => (
                    <tr key={app.agentCustomerId ?? app.id}>
                      {recentColumns.map((col) => (
                        <td key={col.key}>{col.render(app)}</td>
                      ))}
                    </tr>
                  ))}
                  {recentApps.length === 0 && (
                    <tr>
                      <td colSpan={recentColumns.length} className="cm-empty-cell">
                        No applications have been sent to the Credit Manager yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
