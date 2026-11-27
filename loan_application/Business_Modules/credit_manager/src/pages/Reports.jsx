import React, { useMemo, useState } from 'react';
import StatCard from '../../../back_office/src/back-office/components/StatCard/StatCard';
import iconMap from '../../../back_office/src/back-office/config/iconMap';
import '../../../back_office/src/back-office/pages/Dashboard/Dashboard.css';
import '../../../back_office/src/back-office/pages/SubmitToCredit/SubmitToCredit.css';
import '../styles/creditManager.css';
import {
  CM_STATUS,
  CREDIT_MANAGER_APPROVED_WORKFLOW_CODES,
  CREDIT_MANAGER_PENDING_WORKFLOW_CODES,
  CREDIT_MANAGER_REJECTED_WORKFLOW_CODES,
} from '../mappers/creditMapper';
import { useCreditApplications } from '../context/CreditApplicationsContext';
import { formatCurrency, parseDate, summarizeAmount } from '../utils/formatters';

function isWithinRange(value, fromDate, toDate) {
  if (!fromDate && !toDate) return true;
  const date = parseDate(value);
  if (!date) return false;
  if (fromDate && date < new Date(`${fromDate}T00:00:00`)) return false;
  if (toDate && date > new Date(`${toDate}T23:59:59.999`)) return false;
  return true;
}

function formatAggregate(summary, suffix = '') {
  if (!summary.complete) return 'Amount unavailable';
  return `${formatCurrency(summary.total)}${suffix ? ` ${suffix}` : ''}`;
}

const REPORT_STATUSES = [
  ...CREDIT_MANAGER_PENDING_WORKFLOW_CODES.map((code) => ({ code, legacyStatus: CM_STATUS.PENDING, fallbackLabel: 'Status unavailable', color: '#f59e0b' })),
  ...CREDIT_MANAGER_APPROVED_WORKFLOW_CODES.map((code) => ({ code, legacyStatus: CM_STATUS.APPROVED, fallbackLabel: 'Status unavailable', color: '#0F7A4C' })),
  ...CREDIT_MANAGER_REJECTED_WORKFLOW_CODES.map((code) => ({ code, legacyStatus: CM_STATUS.REJECTED, fallbackLabel: 'Status unavailable', color: '#dc2626' })),
];

export default function Reports() {
  const { applications, loading, error, refetch } = useCreditApplications();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const FileTextIcon = iconMap['FileText'];
  const ClockIcon = iconMap['Clock'];
  const CheckCircleIcon = iconMap['CheckCircle'];
  const XCircleIcon = iconMap['XCircle'];
  const CalendarIcon = iconMap['Calendar'];
  const BarChartIcon = iconMap['BarChart2'];
  const AlertCircleIcon = iconMap['AlertCircle'];
  const RefreshCwIcon = iconMap['RefreshCw'];

  const inRange = useMemo(
    () => applications.filter((app) => isWithinRange(app.createdAt, fromDate, toDate)),
    [applications, fromDate, toDate]
  );

  const totalRequestedAmount = useMemo(
    () => summarizeAmount(inRange, 'expectedLoanAmount'),
    [inRange]
  );

  const approvedAmount = useMemo(
    () => summarizeAmount(
      inRange.filter((app) => app.workflowStatusCode
        ? CREDIT_MANAGER_APPROVED_WORKFLOW_CODES.includes(app.workflowStatusCode)
        : app.status === CM_STATUS.APPROVED),
      'sanctionedLoanAmount'
    ),
    [inRange]
  );

  const rows = useMemo(() => {
    const total = inRange.length;
    return REPORT_STATUSES.map((status) => {
      const list = inRange.filter((app) => app.workflowStatusCode
        ? app.workflowStatusCode === status.code
        : app.status === status.legacyStatus);
      return {
        status: status.code,
        label: list.find((app) => app.workflowStatusName)?.workflowStatusName || status.fallbackLabel,
        color: status.color,
        count: list.length,
        requestedAmount: summarizeAmount(list, 'expectedLoanAmount').total,
        sanctionedAmount: summarizeAmount(list, 'sanctionedLoanAmount').total,
        percentage: total ? Math.round((list.length / total) * 10000) / 100 : 0,
      };
    });
  }, [inRange]);

  const countFor = (legacyStatus) => rows
    .filter((row) => REPORT_STATUSES.find((status) => status.code === row.status)?.legacyStatus === legacyStatus)
    .reduce((total, row) => total + row.count, 0);

  return (
    <div className="bo-dashboard">
      {error && (
        <div className="bo-table-error-container" role="alert">
          <div className="bo-error-flex">
            {AlertCircleIcon && <AlertCircleIcon size={24} className="bo-error-icon" />}
            <div className="bo-error-content">
              <h4>Unable to Load Report Data</h4>
              <p>{error}</p>
            </div>
          </div>
          <button type="button" className="bo-btn-retry" onClick={refetch}>
            {RefreshCwIcon && <RefreshCwIcon size={13} />}
            <span>Retry</span>
          </button>
        </div>
      )}

      <div className="stc-controls-card">
        <div className="stc-filter-row-bottom">
          <label className="stc-unified-date-box">
            {CalendarIcon && <CalendarIcon size={14} className="stc-date-icon" />}
            <span className="stc-date-prefix">From Date:</span>
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              className="stc-date-input"
              aria-label="From Date"
            />
          </label>
          <label className="stc-unified-date-box">
            {CalendarIcon && <CalendarIcon size={14} className="stc-date-icon" />}
            <span className="stc-date-prefix">To Date:</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="stc-date-input"
              aria-label="To Date"
            />
          </label>
          {(fromDate || toDate) && (
            <button
              type="button"
              className="stc-btn-reset-filter"
              onClick={() => {
                setFromDate('');
                setToDate('');
              }}
            >
              Reset
            </button>
          )}
          <div className="stc-count-badge" style={{ marginLeft: 'auto' }}>
            <strong>{inRange.length}</strong> Applications in Report
          </div>
        </div>
      </div>

      <section className="bo-kpi-grid" aria-label="Report Overview">
        <StatCard
          icon={FileTextIcon && <FileTextIcon size={22} strokeWidth={1.8} />}
          title="Total Applications"
          value={inRange.length}
          description="Applications in selected period"
          trend={formatAggregate(totalRequestedAmount, 'Total Requested Amount')}
          variant="default"
          loading={loading}
        />
        <StatCard
          icon={ClockIcon && <ClockIcon size={22} strokeWidth={1.8} />}
          title="Pending Review"
          value={countFor(CM_STATUS.PENDING)}
          description="Awaiting decision"
          variant="warning"
          loading={loading}
        />
        <StatCard
          icon={CheckCircleIcon && <CheckCircleIcon size={22} strokeWidth={1.8} />}
          title="Approved"
          value={countFor(CM_STATUS.APPROVED)}
          description="Credit approved"
          trend={formatAggregate(approvedAmount, 'Sanctioned')}
          trendDirection="up"
          variant="success"
          loading={loading}
        />
        <StatCard
          icon={XCircleIcon && <XCircleIcon size={22} strokeWidth={1.8} />}
          title="Rejected"
          value={countFor(CM_STATUS.REJECTED)}
          description="Declined in review"
          trendDirection="down"
          variant="danger"
          loading={loading}
        />
      </section>

      <div className="stc-table-card">
        <div className="stc-table-header">
          <h2 className="stc-table-title">
            {BarChartIcon && <BarChartIcon size={18} style={{ color: '#00593b' }} />}
            <span>Status-wise Credit Review Report</span>
          </h2>
        </div>

        {loading ? (
          <div className="bo-table-loading-container" aria-live="polite">
            <div className="bo-loading-spinner" aria-hidden="true" />
            <p className="bo-loading-text">Loading report...</p>
          </div>
        ) : (
          <div className="stc-table-scroll">
            <table className="stc-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Applications</th>
                  <th>Requested Loan Amount</th>
                  <th>Sanctioned Amount</th>
                  <th style={{ width: '40%' }}>Share of Received</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.status}>
                    <td>
                      <span className={`stc-pill ${row.status === 'APPLICATION_REJECTED' ? 'cm-pill--rejected' : row.status === 'CREDIT_APPROVED_MAKER_PENDING' ? 'stc-pill--verified' : 'stc-pill--pending'}`}>{row.label}</span>
                    </td>
                    <td><strong>{row.count}</strong></td>
                    <td><span className="stc-amount-cell">{formatCurrency(row.requestedAmount)}</span></td>
                    <td><span className="stc-amount-cell">{formatCurrency(row.sanctionedAmount)}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ minWidth: 56, fontWeight: 600 }}>{row.percentage}%</span>
                        <div className="bo-progress-track" style={{ flex: 1 }}>
                          <div
                            className="bo-progress-fill"
                            style={{ width: `${row.percentage}%`, backgroundColor: row.color }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
