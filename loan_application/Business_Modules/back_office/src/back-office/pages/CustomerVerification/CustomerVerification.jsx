/**
 * CustomerVerification.jsx
 * --------------------
 * Dedicated Full-Screen Customer Verification Workspace for the Back Office module.
 *
 * Route: /backoffice/customers/:customerId/verify
 *
 * Architecture:
 * - Standalone full-page underwriting workspace without the standard Back Office sidebar.
 * - Compact Verification Header (Customer Name, App ID, Product, Amount, Status summary).
 * - Left Sidebar: Dedicated "Application Steps" (12 RM Modules, View-Only).
 * - Right Area: Credit Bureau / PAN / CIBIL Verification Workspace.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import { ROUTES } from '../../config/routeConfig';
import {
  VERIFICATION_STEP_DEFINITIONS,
  getVerificationData,
  getCreditReport,
} from '../../data/verificationDummyData';
import VerificationStepModal from '../../components/Verification/VerificationStepModal';
import './CustomerVerification.css';

function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

const STAGES = [
  { id: 0, label: 'Checking PAN details (ABCDE1234F)...' },
  { id: 1, label: 'Connecting to Credit Bureau (CIBIL / Experian)...' },
  { id: 2, label: 'Fetching credit history & active loan facilities...' },
  { id: 3, label: 'Analyzing repayment records & credit score...' },
  { id: 4, label: 'Credit Bureau Report Successfully Retrieved' },
];

export default function CustomerVerification() {
  const { customerId } = useParams();
  const navigate = useNavigate();

  // Retrieve centralized customer verification data
  const customerData = useMemo(() => {
    return getVerificationData(customerId);
  }, [customerId]);

  // Credit Bureau Verification State: 'idle' | 'loading' | 'success'
  const [bureauState, setBureauState] = useState('idle');
  const [loadingStage, setLoadingStage] = useState(0);

  // Step modal state (view-only inspection of 12 RM steps)
  const [selectedStepNumber, setSelectedStepNumber] = useState(null);

  // Icons
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const ShieldCheckIcon = iconMap['ShieldCheck'];
  const CheckCircleIcon = iconMap['CheckCircle2'] || iconMap['Check'];
  const ClockIcon = iconMap['Clock'];
  const AlertTriangleIcon = iconMap['AlertTriangle'];
  const FileTextIcon = iconMap['FileText'];
  const BuildingIcon = iconMap['Building2'] || iconMap['Landmark'];
  const RefreshCwIcon = iconMap['RefreshCw'];
  const CreditCardIcon = iconMap['CreditCard'] || iconMap['Landmark'];
  const LockIcon = iconMap['Lock'] || iconMap['ShieldCheck'];
  const EyeIcon = iconMap['Eye'] || iconMap['FileText'];
  const TrendingUpIcon = iconMap['TrendingUp'];
  const CheckIcon = iconMap['Check'] || iconMap['CheckCircle2'];

  // Staged loading effect (approx 2.4s simulation)
  useEffect(() => {
    let t1, t2, t3, t4;
    if (bureauState === 'loading') {
      setLoadingStage(0);
      t1 = setTimeout(() => setLoadingStage(1), 500);
      t2 = setTimeout(() => setLoadingStage(2), 1100);
      t3 = setTimeout(() => setLoadingStage(3), 1700);
      t4 = setTimeout(() => {
        setLoadingStage(4);
        setBureauState('success');
      }, 2300);
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [bureauState]);

  // Credit Report Data (retrieved from centralized store)
  const creditReport = useMemo(() => {
    return getCreditReport(customerId);
  }, [customerId]);

  // Handlers
  const handleFetchCreditReport = () => {
    setBureauState('loading');
  };

  const handleRefreshReport = () => {
    setBureauState('loading');
  };

  const handleOpenStep = (stepNumber) => {
    setSelectedStepNumber(stepNumber);
  };

  const handleCloseModal = () => {
    setSelectedStepNumber(null);
  };

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(ROUTES.CUSTOMERS);
    }
  };

  // ----------------------------------------------------
  // Invalid Customer ID Fallback View
  // ----------------------------------------------------
  if (!customerData) {
    return (
      <div className="bo-cv-page-wrap">
        <header className="bo-cv-header">
          <div className="bo-cv-header-left">
            <button type="button" className="bo-cv-back-btn" onClick={() => navigate(ROUTES.CUSTOMERS)}>
              {ArrowLeftIcon && <ArrowLeftIcon size={15} />}
              <span>Back to Customers</span>
            </button>
          </div>
        </header>
        <div className="bo-cv-not-found-container">
          <div className="bo-cv-not-found-card">
            <div className="bo-cv-not-found-icon">
              {AlertTriangleIcon && <AlertTriangleIcon size={32} />}
            </div>
            <h2>Customer Verification Record Not Found</h2>
            <p>
              No active application or customer profile was found matching ID: <strong>{customerId}</strong>.
              Please return to the customer queue and select a valid application.
            </p>
            <button
              type="button"
              className="bo-btn bo-btn--primary"
              onClick={() => navigate(ROUTES.CUSTOMERS)}
            >
              {ArrowLeftIcon && <ArrowLeftIcon size={16} />}
              <span>Back to Customer Monitoring</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedStepDef = selectedStepNumber
    ? VERIFICATION_STEP_DEFINITIONS.find((s) => s.number === selectedStepNumber)
    : null;

  const appDetails = customerData.applicationDetails || {};
  const panNumber = customerData.personalInformation?.panNumber || 'ABCDE1234F';

  return (
    <div className="bo-cv-page-wrap">
      {/* ── 1. Compact Verification Header ────────────────────────────── */}
      <header className="bo-cv-header">
        {/* Left: Back button */}
        <div className="bo-cv-header-left">
          <button
            type="button"
            className="bo-cv-back-btn"
            onClick={handleBack}
            aria-label="Return to customer monitoring"
          >
            {ArrowLeftIcon && <ArrowLeftIcon size={14} />}
            <span>Back to Customers</span>
          </button>
        </div>

        {/* Center / Main Information */}
        <div className="bo-cv-header-center">
          <div className="bo-cv-lead-info">
            <h1 className="bo-cv-cust-title">{customerData.customerName}</h1>
            <div className="bo-cv-meta-inline">
              <span className="bo-cv-app-id">Application: {customerData.applicationId}</span>
              <span className="bo-cv-dot">&bull;</span>
              <span className="bo-cv-product-amount">
                {appDetails.loanProduct} &bull; <strong>{formatCurrency(appDetails.loanAmount)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Small verification status summary */}
        <div className="bo-cv-header-right">
          <div className="bo-cv-status-badge-item">
            <span className="bo-cv-status-lbl">Application:</span>
            <span className="bo-cv-pill-pending">Pending</span>
          </div>

          <div className="bo-cv-status-badge-item">
            <span className="bo-cv-status-lbl">PAN:</span>
            <span className="bo-cv-pan-badge">{panNumber}</span>
          </div>

          <div className="bo-cv-status-badge-item">
            <span className="bo-cv-status-lbl">Bureau Status:</span>
            {bureauState === 'success' ? (
              <span className="bo-cv-pill-verified">Verified ✓</span>
            ) : bureauState === 'loading' ? (
              <span className="bo-cv-pill-fetching">Fetching...</span>
            ) : (
              <span className="bo-cv-pill-unverified">Not Verified</span>
            )}
          </div>
        </div>
      </header>

      {/* ── 2. Dedicated 2-Column Workspace Body ──────────────────────── */}
      <div className="bo-cv-workspace-body">
        {/* ── LEFT SIDEBAR: ONLY 12 RM APPLICATION STEPS ──────────────── */}
        <aside className="bo-cv-left-sidebar" aria-label="12 RM Application Steps">
          <div className="bo-cv-sidebar-header">
            <h2 className="bo-cv-sidebar-title">Application Steps</h2>
            <span className="bo-cv-sidebar-subtitle">12 Application Modules</span>
          </div>

          <nav className="bo-cv-steps-nav">
            <ul className="bo-cv-steps-list" role="list">
              {VERIFICATION_STEP_DEFINITIONS.map((step) => {
                const stepNum = step.number;
                const isSelected = selectedStepNumber === stepNum;
                const formattedNum = String(stepNum).padStart(2, '0');

                return (
                  <li key={step.id} className="bo-cv-step-item">
                    <button
                      type="button"
                      className={`bo-cv-step-card ${isSelected ? 'is-active' : ''}`}
                      onClick={() => handleOpenStep(stepNum)}
                      aria-label={`Step ${stepNum}: ${step.name}. Click to view details.`}
                    >
                      <div className="bo-cv-step-num-box">
                        {formattedNum}
                      </div>

                      <div className="bo-cv-step-details">
                        <strong className="bo-cv-step-name">{step.name}</strong>
                        <span className="bo-cv-step-desc">{step.description}</span>
                      </div>

                      <div className="bo-cv-step-action">
                        <span className="bo-cv-view-btn">
                          {EyeIcon && <EyeIcon size={12} />}
                          <span>View</span>
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* ── RIGHT MAIN WORKSPACE: CREDIT BUREAU & CIBIL VERIFICATION ─── */}
        <main className="bo-cv-main-content" id="main-verification-content">
          {/* ── STATE 1: BEFORE CIBIL VERIFICATION UI (IDLE) ─────────── */}
          {bureauState === 'idle' && (
            <div className="bo-cv-idle-section">
              <div className="bo-cv-bureau-card">
                <div className="bo-cv-card-header">
                  <div className="bo-cv-icon-wrap">
                    {ShieldCheckIcon && <ShieldCheckIcon size={22} />}
                  </div>
                  <div>
                    <h2 className="bo-cv-card-title">Credit Bureau Verification</h2>
                    <p className="bo-cv-card-subtitle">
                      Retrieve applicant credit profile using PAN information.
                    </p>
                  </div>
                </div>

                <div className="bo-cv-pan-field-group">
                  <div className="bo-cv-pan-col">
                    <label className="bo-cv-field-lbl">Applicant PAN</label>
                    <div className="bo-cv-pan-display-row">
                      <span className="bo-cv-pan-box-lead">{panNumber}</span>
                      <span className="bo-cv-auto-tag">
                        {CheckCircleIcon && <CheckCircleIcon size={13} />}
                        <span>Auto-fetched from Applicant KYC Documents</span>
                      </span>
                    </div>
                  </div>

                  <div className="bo-cv-applicant-col">
                    <label className="bo-cv-field-lbl">Applicant Name</label>
                    <strong className="bo-cv-applicant-name">{customerData.customerName}</strong>
                  </div>
                </div>

                <div className="bo-cv-card-footer">
                  <button
                    type="button"
                    className="bo-cv-fetch-btn"
                    onClick={handleFetchCreditReport}
                  >
                    <span>Fetch Credit Report</span>
                    {ArrowRightIcon && <ArrowRightIcon size={16} />}
                  </button>

                  <span className="bo-cv-secure-tag">
                    {LockIcon && <LockIcon size={13} />}
                    <span>Secure Bureau Inquiry &bull; TransUnion CIBIL &amp; Experian</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── STATE 2: DUMMY CREDIT REPORT FETCH INTERACTION (LOADING) */}
          {bureauState === 'loading' && (
            <div className="bo-cv-loading-section">
              <div className="bo-cv-bureau-card bo-cv-loading-card">
                <div className="bo-cv-loading-header">
                  <div className="bo-cv-spinner-box">
                    {RefreshCwIcon && <RefreshCwIcon size={22} className="bo-cv-spin" />}
                  </div>
                  <div>
                    <h3 className="bo-cv-card-title">Fetching Credit Bureau Report...</h3>
                    <p className="bo-cv-card-subtitle">
                      Querying credit bureaus with applicant PAN <strong>{panNumber}</strong>.
                    </p>
                  </div>
                </div>

                <div className="bo-cv-progress-bar-bg">
                  <div
                    className="bo-cv-progress-bar-fill"
                    style={{ width: `${((loadingStage + 1) / STAGES.length) * 100}%` }}
                  />
                </div>

                <div className="bo-cv-stages-list">
                  {STAGES.map((stage) => {
                    const isDone = loadingStage > stage.id;
                    const isCurrent = loadingStage === stage.id;

                    return (
                      <div
                        key={stage.id}
                        className={`bo-cv-stage-row ${isDone ? 'is-done' : isCurrent ? 'is-active' : 'is-pending'}`}
                      >
                        <span className="bo-cv-stage-indicator">
                          {isDone ? '✓' : isCurrent ? '●' : '○'}
                        </span>
                        <span className="bo-cv-stage-text">{stage.label}</span>
                        <span className="bo-cv-stage-badge">
                          {isDone ? 'Done' : isCurrent ? 'In Progress' : 'Waiting'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── STATE 3: AFTER FETCH – CIBIL SCORE DASHBOARD (SUCCESS) ─── */}
          {bureauState === 'success' && creditReport && (
            <div className="bo-cv-dashboard">
              {/* 1. Top Section: CIBIL Score & Credit Health Summary */}
              <div className="bo-cv-score-section-card">
                <div className="bo-cv-score-left">
                  <div className="bo-cv-score-circle">
                    <span className="bo-cv-score-kicker">CIBIL SCORE</span>
                    <strong className="bo-cv-score-val">{creditReport.creditScore}</strong>
                    <span className="bo-cv-score-rating-pill">{creditReport.scoreRating}</span>
                    <small className="bo-cv-score-range">Range: 300 &ndash; 900</small>
                  </div>

                  <div className="bo-cv-score-info">
                    <div className="bo-cv-health-title-row">
                      <h3 className="bo-cv-health-title">Healthy Credit Profile</h3>
                      <span className="bo-cv-risk-tag">Low Default Risk</span>
                    </div>
                    <p className="bo-cv-health-desc">
                      Applicant demonstrates a strong repayment history with manageable credit exposure and no recent significant delinquency.
                    </p>
                  </div>
                </div>

                <div className="bo-cv-score-right-action">
                  <button
                    type="button"
                    className="bo-cv-refetch-btn"
                    onClick={handleRefreshReport}
                    title="Re-run credit bureau query"
                  >
                    {RefreshCwIcon && <RefreshCwIcon size={13} />}
                    <span>Re-fetch</span>
                  </button>
                </div>
              </div>

              {/* 2. Section 10: Credit Summary Cards (6 Compact Cards) */}
              <div className="bo-cv-kpi-grid">
                <div className="bo-cv-kpi-card">
                  <span className="bo-cv-kpi-title">Active Loan Accounts</span>
                  <strong className="bo-cv-kpi-val text-primary">{creditReport.summaryMetrics.activeLoansCount}</strong>
                  <span className="bo-cv-kpi-sub">Regular Debt Servicing</span>
                </div>

                <div className="bo-cv-kpi-card">
                  <span className="bo-cv-kpi-title">Closed Loan Accounts</span>
                  <strong className="bo-cv-kpi-val">{creditReport.summaryMetrics.closedLoansCount}</strong>
                  <span className="bo-cv-kpi-sub">Healthy Closure History</span>
                </div>

                <div className="bo-cv-kpi-card">
                  <span className="bo-cv-kpi-title">Credit Cards</span>
                  <strong className="bo-cv-kpi-val">{creditReport.summaryMetrics.creditCardsCount} Cards</strong>
                  <span className="bo-cv-kpi-sub">Total Credit Limit: {formatCurrency(creditReport.summaryMetrics.totalCreditCardLimit)}</span>
                </div>

                <div className="bo-cv-kpi-card">
                  <span className="bo-cv-kpi-title">Total Outstanding</span>
                  <strong className="bo-cv-kpi-val">{formatCurrency(creditReport.summaryMetrics.totalOutstandingAmount)}</strong>
                  <span className="bo-cv-kpi-sub">Across Active Credit Facilities</span>
                </div>

                <div className="bo-cv-kpi-card">
                  <span className="bo-cv-kpi-title">Monthly EMI Obligation</span>
                  <strong className="bo-cv-kpi-val">{formatCurrency(creditReport.summaryMetrics.monthlyEmiObligation)} / Month</strong>
                  <span className="bo-cv-kpi-sub">Estimated Debt Burden</span>
                </div>

                <div className="bo-cv-kpi-card">
                  <span className="bo-cv-kpi-title">Payment Track Record</span>
                  <strong className="bo-cv-kpi-val text-success">{creditReport.summaryMetrics.paymentHistoryPercentage}</strong>
                  <span className="bo-cv-kpi-sub">0 Major Defaults</span>
                </div>
              </div>

              {/* 3. Section 11: Active Loans Section */}
              <div className="bo-cv-section-box">
                <div className="bo-cv-section-head">
                  <h3 className="bo-cv-section-title">Active Loan Accounts</h3>
                  <span className="bo-cv-count-tag">{creditReport.activeLoans.length} Accounts</span>
                </div>

                <div className="bo-cv-table-wrap">
                  <table className="bo-cv-table">
                    <thead>
                      <tr>
                        <th>Loan Type</th>
                        <th>Lender</th>
                        <th>Original Amount</th>
                        <th>Outstanding</th>
                        <th>EMI</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditReport.activeLoans.map((loan) => (
                        <tr key={loan.id}>
                          <td><strong>{loan.loanType}</strong></td>
                          <td>{loan.lender}</td>
                          <td>{formatCurrency(loan.originalAmount)}</td>
                          <td><strong>{formatCurrency(loan.outstanding)}</strong></td>
                          <td>{formatCurrency(loan.emi)}</td>
                          <td>
                            <span className="bo-cv-badge-active">{loan.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Section 12: Closed Loans Section */}
              <div className="bo-cv-section-box">
                <div className="bo-cv-section-head">
                  <h3 className="bo-cv-section-title">Closed Loan Accounts</h3>
                  <span className="bo-cv-count-tag">{creditReport.closedLoans.length} Accounts</span>
                </div>

                <div className="bo-cv-table-wrap">
                  <table className="bo-cv-table">
                    <thead>
                      <tr>
                        <th>Loan Type</th>
                        <th>Lender</th>
                        <th>Loan Amount</th>
                        <th>Closed Date</th>
                        <th>Payment Record</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditReport.closedLoans.map((loan) => (
                        <tr key={loan.id}>
                          <td><strong>{loan.loanType}</strong></td>
                          <td>{loan.lender}</td>
                          <td>{loan.loanAmountFormatted || formatCurrency(loan.loanAmount)}</td>
                          <td>{loan.closedDate}</td>
                          <td>
                            <span className="bo-cv-badge-closed">✓ {loan.paymentRecord}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. Section 13: Credit Card Exposure */}
              <div className="bo-cv-section-box">
                <div className="bo-cv-section-head">
                  <h3 className="bo-cv-section-title">Credit Card Exposure</h3>
                  <span className="bo-cv-count-tag">{creditReport.creditCards.length} Cards</span>
                </div>

                <div className="bo-cv-cc-grid">
                  {creditReport.creditCards.map((card) => (
                    <div key={card.id} className="bo-cv-cc-card">
                      <div className="bo-cv-cc-head">
                        <strong className="bo-cv-cc-name">{card.cardName}</strong>
                        <span className="bo-cv-badge-active">{card.status}</span>
                      </div>

                      <div className="bo-cv-cc-metrics">
                        <div>
                          <small>Credit Limit</small>
                          <strong>{formatCurrency(card.creditLimit)}</strong>
                        </div>
                        <div>
                          <small>Current Outstanding</small>
                          <strong>{formatCurrency(card.currentOutstanding)}</strong>
                        </div>
                        <div>
                          <small>Utilization</small>
                          <strong>{card.utilizationPercent}%</strong>
                        </div>
                      </div>

                      <div className="bo-cv-cc-bar-bg">
                        <div
                          className="bo-cv-cc-bar-fill"
                          style={{ width: `${card.utilizationPercent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Section 14: Credit Utilization */}
              <div className="bo-cv-section-box">
                <div className="bo-cv-section-head">
                  <h3 className="bo-cv-section-title">Credit Utilization</h3>
                  <span className="bo-cv-util-pct-badge">{creditReport.creditUtilization.utilizationPercent}% Healthy</span>
                </div>

                <div className="bo-cv-util-metrics-row">
                  <div className="bo-cv-util-cell">
                    <small>Total Credit Limit</small>
                    <strong>{formatCurrency(creditReport.creditUtilization.totalLimit)}</strong>
                  </div>
                  <div className="bo-cv-util-cell">
                    <small>Used Credit</small>
                    <strong>{formatCurrency(creditReport.creditUtilization.usedCredit)}</strong>
                  </div>
                  <div className="bo-cv-util-cell">
                    <small>Available Credit</small>
                    <strong className="text-success">{formatCurrency(creditReport.creditUtilization.availableCredit)}</strong>
                  </div>
                  <div className="bo-cv-util-cell">
                    <small>Utilization</small>
                    <strong>{creditReport.creditUtilization.utilizationPercent}%</strong>
                  </div>
                </div>

                <div className="bo-cv-util-progress-bar">
                  <div
                    className="bo-cv-util-progress-fill"
                    style={{ width: `${creditReport.creditUtilization.utilizationPercent}%` }}
                  />
                </div>
              </div>

              {/* 7. Section 15: Repayment Behaviour */}
              <div className="bo-cv-section-box">
                <div className="bo-cv-section-head">
                  <h3 className="bo-cv-section-title">Repayment Behaviour</h3>
                  <span className="bo-cv-badge-closed">Clean Conduct</span>
                </div>

                <div className="bo-cv-repay-grid">
                  <div className="bo-cv-repay-cell">
                    <small>On-Time Payments</small>
                    <strong className="text-success">{creditReport.repaymentBehaviour.onTimePayments}</strong>
                  </div>
                  <div className="bo-cv-repay-cell">
                    <small>Delayed Payments</small>
                    <strong>{creditReport.repaymentBehaviour.delayedPayments}</strong>
                  </div>
                  <div className="bo-cv-repay-cell">
                    <small>Current DPD</small>
                    <strong>{creditReport.repaymentBehaviour.currentDpd}</strong>
                  </div>
                  <div className="bo-cv-repay-cell">
                    <small>Maximum DPD</small>
                    <span>{creditReport.repaymentBehaviour.maximumDpd}</span>
                  </div>
                  <div className="bo-cv-repay-cell">
                    <small>Recent Defaults</small>
                    <span className="text-success font-semibold">{creditReport.repaymentBehaviour.recentDefaults}</span>
                  </div>
                </div>
              </div>

              {/* 8. Section 16: Underwriting Risk Insight */}
              <div className="bo-cv-insight-box">
                <div className="bo-cv-insight-head">
                  <div className="bo-cv-insight-title-group">
                    <h3 className="bo-cv-insight-title">Underwriting Insight</h3>
                    <span className="bo-cv-risk-assess-tag">
                      Risk Assessment: <strong>{creditReport.underwritingAssessment.riskAssessment}</strong>
                    </span>
                  </div>

                  <span className="bo-cv-decision-tag">
                    {creditReport.underwritingAssessment.recommendedDecision}
                  </span>
                </div>

                <div className="bo-cv-highlights-list">
                  {creditReport.underwritingAssessment.highlights.map((h, i) => (
                    <div
                      key={i}
                      className={`bo-cv-highlight-item ${h.type === 'warning' ? 'is-warning' : 'is-check'}`}
                    >
                      <span className="bo-cv-highlight-icon">
                        {h.type === 'warning' ? '⚠' : '✓'}
                      </span>
                      <span>{h.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── View-Only 12-Step Inspection Modal ──────────────────────────── */}
      {selectedStepNumber && selectedStepDef && (
        <VerificationStepModal
          stepNumber={selectedStepNumber}
          stepDefinition={selectedStepDef}
          customerData={customerData}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
