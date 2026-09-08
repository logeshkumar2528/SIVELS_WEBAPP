/**
 * CustomerVerification.jsx
 * --------------------
 * Dedicated Full-Screen Customer Verification Workspace for the Back Office module.
 *
 * Route: /backoffice/customers/:customerId/verify
 *
 * Architecture:
 * - Phase 3 Real API Integration: Connected to `GET /ApplicationFullDetails/:agentCustomerId`
 *   and `/AgentCustomerDocument/bycustomer/:agentCustomerId` via `useVerificationWorkspace`.
 * - Zero Dummy Data Dependencies: `getVerificationData` and `verificationDummyData` removed completely.
 * - Standalone full-page underwriting workspace without the standard Back Office dashboard sidebar.
 * - Compact Verification Header (Customer Name, App ID, Product, Amount, Status summary).
 * - Left Sidebar: Dedicated "Application Steps" (12 RM Modules, View-Only).
 * - Right Area: Credit Bureau / PAN / CIBIL Verification Workspace (Frontend Simulation).
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import { ROUTES } from '../../config/routeConfig';
import { VERIFICATION_STEP_DEFINITIONS } from '../../config/verificationSteps';
import { useVerificationWorkspace } from '../../hooks/useVerificationWorkspace';
import backOfficeService from '../../api/backOfficeService';
import VerificationStepModal from '../../components/Verification/VerificationStepModal';
import './CustomerVerification.css';

function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount) || amount === 0) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function formatFoirCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount) || amount === '') return '—';
  const num = Number(amount);
  return num % 1 === 0
    ? `₹${num.toLocaleString('en-IN')}`
    : `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Matches the current applicant to FOIR calculation records from backend.
 * Uses agentCustomerId, applicationEmploymentIncomeDetailsId, and applicationProductDetailsId.
 * Sorts matching records descending by calculationId/createdAt.
 */
function findMatchingFoirCalculation(records = [], { agentCustomerId, employmentIncomeId, productDetailsId }) {
  if (!Array.isArray(records) || records.length === 0) return null;

  const validAgentId = agentCustomerId != null && agentCustomerId !== '' ? String(agentCustomerId) : null;
  const validEmpId = employmentIncomeId != null && employmentIncomeId !== '' ? String(employmentIncomeId) : null;
  const validProdId = productDetailsId != null && productDetailsId !== '' ? String(productDetailsId) : null;

  const matches = records.filter((item) => {
    const itemAgentId = item.agentCustomerId ?? item.AgentCustomerId;
    const itemEmpId = item.applicationEmploymentIncomeDetailsId ?? item.ApplicationEmploymentIncomeDetailsId;
    const itemProdId = item.applicationProductDetailsId ?? item.ApplicationProductDetailsId;

    if (validAgentId && itemAgentId != null && String(itemAgentId) === validAgentId) {
      return true;
    }
    if (validEmpId && itemEmpId != null && String(itemEmpId) === validEmpId) {
      return true;
    }
    if (validProdId && itemProdId != null && String(itemProdId) === validProdId) {
      return true;
    }
    return false;
  });

  if (matches.length === 0) return null;

  // Sort descending by calculationId or createdAt (latest first)
  matches.sort((a, b) => {
    const calcIdA = Number(a.calculationId ?? a.CalculationId ?? a.id ?? a.Id ?? 0);
    const calcIdB = Number(b.calculationId ?? b.CalculationId ?? b.id ?? b.Id ?? 0);
    if (calcIdA !== calcIdB) {
      return calcIdB - calcIdA;
    }
    const dateA = new Date(a.createdAt || a.CreatedAt || 0).getTime();
    const dateB = new Date(b.createdAt || b.CreatedAt || 0).getTime();
    return dateB - dateA;
  });

  return matches[0];
}

const STAGES = [
  { id: 0, label: 'Checking PAN details & Tax identification records...' },
  { id: 1, label: 'Connecting to Credit Bureau (TransUnion CIBIL / Experian)...' },
  { id: 2, label: 'Fetching credit history & active loan facilities...' },
  { id: 3, label: 'Analyzing repayment records & credit score rating...' },
  { id: 4, label: 'Credit Bureau Report Successfully Retrieved' },
];

/**
 * Builds simulated Credit Bureau report dynamically from customer verification data.
 */
function createBureauReport(customerData) {
  const pan = customerData?.personalInformation?.panNumber || 'ABCDE1234F';
  const score = 748;
  const rating = 'EXCELLENT';
  const customerName = customerData?.customerName || 'Customer';
  const loanAmount = customerData?.applicationDetails?.loanAmount || 450000;

  return {
    customerId: customerData?.customerId,
    customerName,
    panNumber: pan,
    bureauName: 'TransUnion CIBIL & Experian Credit Information',
    reportId: `CIR-2026-${String(customerData?.customerId || '').replace(/\D/g, '').padStart(4, '0')}89`,
    reportDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    reportTimestamp: 'Just Now',
    creditScore: score,
    scoreRating: rating,
    scoreRange: '300 - 900',
    creditVintage: '8 Years Credit History',
    reportStatus: 'Successfully Retrieved & Verified',

    summaryMetrics: {
      activeLoansCount: 2,
      closedLoansCount: 3,
      creditCardsCount: 2,
      totalCreditCardLimit: 350000,
      totalOutstandingAmount: Math.round(loanAmount * 0.75),
      monthlyEmiObligation: Math.round(loanAmount * 0.05),
      paymentHistoryPercentage: '98% On-Time',
      zeroDefaultsNote: '0 Major Defaults',
    },

    activeLoans: [
      {
        id: 'ACT_01',
        loanType: 'Personal Loan',
        lender: 'HDFC Bank',
        originalAmount: 500000,
        outstanding: 210000,
        emi: 12500,
        status: 'Active',
      },
      {
        id: 'ACT_02',
        loanType: 'Vehicle Loan',
        lender: 'ICICI Bank',
        originalAmount: 800000,
        outstanding: 135000,
        emi: 20200,
        status: 'Active',
      },
    ],

    closedLoans: [
      {
        id: 'CLS_01',
        loanType: 'Home Improvement Loan',
        lender: 'Axis Bank',
        loanAmount: 300000,
        closedDate: '15 Mar 2024',
        paymentRecord: 'Closed Successfully',
      },
      {
        id: 'CLS_02',
        loanType: 'Consumer Durable Loan',
        lender: 'Bajaj Finance',
        loanAmount: 80000,
        loanAmountFormatted: '₹80,000',
        closedDate: '10 Jan 2023',
        paymentRecord: 'Closed Successfully',
      },
      {
        id: 'CLS_03',
        loanType: 'Education Loan',
        lender: 'State Bank of India',
        loanAmount: 250000,
        closedDate: '20 Aug 2022',
        paymentRecord: 'Closed Successfully',
      },
    ],

    creditCards: [
      {
        id: 'CC_01',
        cardName: 'HDFC Bank Credit Card',
        lender: 'HDFC Bank',
        creditLimit: 200000,
        currentOutstanding: 45000,
        utilizationPercent: 22,
        status: 'Active',
      },
      {
        id: 'CC_02',
        cardName: 'ICICI Bank Credit Card',
        lender: 'ICICI Bank',
        creditLimit: 150000,
        currentOutstanding: 25000,
        utilizationPercent: 16,
        status: 'Active',
      },
    ],

    creditUtilization: {
      totalLimit: 350000,
      usedCredit: 70000,
      availableCredit: 280000,
      utilizationPercent: 20,
    },

    repaymentBehaviour: {
      onTimePayments: '98%',
      delayedPayments: '2%',
      currentDpd: '0 Days',
      maximumDpd: '15 Days',
      recentDefaults: 'None',
    },

    underwritingAssessment: {
      riskAssessment: 'LOW',
      recommendedDecision: 'Eligible for Underwriting Sign-off',
      highlights: [
        { type: 'check', text: 'Strong repayment history with zero recent 90+ DPD default' },
        { type: 'check', text: 'Healthy revolving credit utilization below 25%' },
        { type: 'check', text: 'Clean banking conduct and active tax compliance' },
        { type: 'warning', text: 'Existing debt obligations should be factored into FOIR' },
      ],
    },
  };
}

/**
 * Resolves standard status badge text and class.
 */
function getStatusInfo(status) {
  if (status === null || status === undefined) {
    return { label: 'Pending', className: 'bo-cv-pill-pending' };
  }

  if (typeof status === 'number') {
    switch (status) {
      case 4:
        return { label: 'Approved', className: 'bo-cv-pill-verified' };
      case 2:
      case 3:
        return { label: 'Under Review', className: 'bo-cv-pill-fetching' };
      case 5:
      case 6:
        return { label: 'Rejected', className: 'bo-cv-pill-unverified' };
      case 1:
      case 0:
      default:
        return { label: 'Pending', className: 'bo-cv-pill-pending' };
    }
  }

  const s = String(status).toLowerCase();
  if (s.includes('approved')) return { label: 'Approved', className: 'bo-cv-pill-verified' };
  if (s.includes('review') || s.includes('logged to ho')) return { label: 'Under Review', className: 'bo-cv-pill-fetching' };
  if (s.includes('reject') || s.includes('return')) return { label: 'Rejected', className: 'bo-cv-pill-unverified' };
  return { label: 'Pending', className: 'bo-cv-pill-pending' };
}

export default function CustomerVerification() {
  const { customerId } = useParams();
  const navigate = useNavigate();

  // 1. Fetch Real Application from Backend via Phase 1/3 Hook
  const { verificationData, loading, error, refetch } = useVerificationWorkspace(customerId);

  // 2. Credit Bureau Verification Simulation State: 'idle' | 'loading' | 'success'
  const [bureauState, setBureauState] = useState('idle');
  const [loadingStage, setLoadingStage] = useState(0);

  // 3. Step modal state (view-only inspection of 12 RM steps)
  const [selectedStepNumber, setSelectedStepNumber] = useState(null);

  // 4. Icons
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const ShieldCheckIcon = iconMap['ShieldCheck'];
  const CheckCircleIcon = iconMap['CheckCircle2'] || iconMap['Check'];
  const AlertTriangleIcon = iconMap['AlertTriangle'];
  const RefreshCwIcon = iconMap['RefreshCw'];
  const LockIcon = iconMap['Lock'] || iconMap['ShieldCheck'];
  const EyeIcon = iconMap['Eye'] || iconMap['FileText'];
  const BadgeIndianRupeeIcon = iconMap['BadgeIndianRupee'] || iconMap['Wallet'];
  const FileCheckIcon = iconMap['FileCheck'] || iconMap['FileText'];

  // 5. FOIR Calculation State: 'idle' | 'loading' | 'success' | 'empty' | 'error'
  const [foirState, setFoirState] = useState('idle');
  const [foirData, setFoirData] = useState(null);
  const [foirError, setFoirError] = useState(null);

  const handleCalculateFoir = async () => {
    setFoirState('loading');
    setFoirError(null);

    try {
      const res = await backOfficeService.getFoirEligibilityCalculations();
      const records = Array.isArray(res) ? res : (res?.value ?? res?.data ?? res?.result ?? []);

      // Resolve application IDs from current verification data
      const rawCustomer = verificationData?.raw?.customer || verificationData?.customer || {};
      const rawCust = Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer;
      const rawEmp = verificationData?.raw?.employmentIncome || verificationData?.employmentIncome?.raw || {};
      const rawEmpItem = Array.isArray(rawEmp) ? rawEmp[0] : rawEmp;
      const rawProd = verificationData?.raw?.productDetails || verificationData?.applicationDetails?.raw || {};
      const rawProdItem = Array.isArray(rawProd) ? rawProd[0] : rawProd;

      const agentCustId =
        verificationData?.customerId ||
        rawCust?.agentCustomerId ||
        rawCust?.AgentCustomerId ||
        verificationData?.raw?.agentCustomerId ||
        verificationData?.raw?.AgentCustomerId;

      const empIncomeId =
        rawEmpItem?.applicationEmploymentIncomeDetailsId ||
        rawEmpItem?.ApplicationEmploymentIncomeDetailsId ||
        verificationData?.employmentIncome?.employmentIncomeDetailsId;

      const prodDetailsId =
        rawProdItem?.applicationProductDetailsId ||
        rawProdItem?.ApplicationProductDetailsId ||
        verificationData?.applicationDetails?.productDetailsId;

      const matched = findMatchingFoirCalculation(records, {
        agentCustomerId: agentCustId,
        employmentIncomeId: empIncomeId,
        productDetailsId: prodDetailsId,
      });

      if (matched) {
        setFoirData(matched);
        setFoirState('success');
      } else {
        setFoirData(null);
        setFoirState('empty');
      }
    } catch (err) {
      console.error('Error fetching FOIR calculation:', err);
      setFoirError(err?.response?.data?.message || err?.message || 'Unable to connect to FOIR calculation service.');
      setFoirState('error');
    }
  };

  // Staged loading effect for CIBIL simulation (approx 2.3s)
  useEffect(() => {
    let t1, t2, t3, t4;
    if (bureauState === 'loading') {
      setLoadingStage(0);
      t1 = setTimeout(() => setLoadingStage(1), 450);
      t2 = setTimeout(() => setLoadingStage(2), 1000);
      t3 = setTimeout(() => setLoadingStage(3), 1600);
      t4 = setTimeout(() => {
        setLoadingStage(4);
        setBureauState('success');
      }, 2200);
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [bureauState]);

  // Credit Report Data (built dynamically from real verificationData)
  const creditReport = useMemo(() => {
    if (!verificationData) return null;
    return createBureauReport(verificationData);
  }, [verificationData]);

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
  // 1. Loading State View
  // ----------------------------------------------------
  if (loading) {
    return (
      <div className="bo-cv-page-wrap">
        <header className="bo-cv-header">
          <div className="bo-cv-header-left">
            <button type="button" className="bo-cv-back-btn" onClick={handleBack}>
              {ArrowLeftIcon && <ArrowLeftIcon size={14} />}
              <span>Back to Customers</span>
            </button>
          </div>
        </header>
        <div className="bo-cv-loading-fullscreen" role="status" aria-live="polite">
          <div className="bo-cv-loading-spinner" aria-hidden="true" />
          <h2>Loading Customer Application</h2>
          <p>Fetching application and verification details for Customer #{customerId}...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 2. Error State View (With Retry Action)
  // ----------------------------------------------------
  if (error && !verificationData) {
    return (
      <div className="bo-cv-page-wrap">
        <header className="bo-cv-header">
          <div className="bo-cv-header-left">
            <button type="button" className="bo-cv-back-btn" onClick={handleBack}>
              {ArrowLeftIcon && <ArrowLeftIcon size={14} />}
              <span>Back to Customers</span>
            </button>
          </div>
        </header>
        <div className="bo-cv-error-fullscreen" role="alert">
          <div className="bo-cv-error-card">
            <div className="bo-cv-error-icon">
              {AlertTriangleIcon && <AlertTriangleIcon size={32} />}
            </div>
            <h2>Unable to Load Customer Verification Details</h2>
            <p>{error}</p>
            <div className="bo-cv-error-actions">
              <button type="button" className="bo-btn bo-btn--primary" onClick={refetch}>
                {RefreshCwIcon && <RefreshCwIcon size={14} />}
                <span>Retry</span>
              </button>
              <button
                type="button"
                className="bo-btn bo-btn--outline"
                onClick={() => navigate(ROUTES.CUSTOMERS)}
              >
                <span>Back to Customer Monitoring</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 3. Not Found View
  // ----------------------------------------------------
  if (!verificationData) {
    return (
      <div className="bo-cv-page-wrap">
        <header className="bo-cv-header">
          <div className="bo-cv-header-left">
            <button type="button" className="bo-cv-back-btn" onClick={() => navigate(ROUTES.CUSTOMERS)}>
              {ArrowLeftIcon && <ArrowLeftIcon size={14} />}
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
              No active application was found matching Customer ID: <strong>{customerId}</strong>.
              Please return to Customer Monitoring and select a valid application.
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

  const appDetails = verificationData.applicationDetails || {};
  const panNumber = verificationData.personalInformation?.panNumber || 'Not Available';
  const statusInfo = getStatusInfo(verificationData.overallStatus);

  return (
    <div className="bo-cv-page-wrap">
      {/* ── 1. Compact Verification Header (Real API Data) ──────────────── */}
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
            <h1 className="bo-cv-cust-title">{verificationData.customerName}</h1>
            <div className="bo-cv-meta-inline">
              <span className="bo-cv-app-id">{verificationData.applicationId}</span>
              <span className="bo-cv-dot">&bull;</span>
              <span className="bo-cv-product-amount">
                {appDetails.loanProduct} &bull; <strong>{formatCurrency(appDetails.loanAmount)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Verification status summary badges */}
        <div className="bo-cv-header-right">
          <div className="bo-cv-status-badge-item">
            <span className="bo-cv-status-lbl">Application:</span>
            <span className={statusInfo.className}>{statusInfo.label}</span>
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
        {/* ── LEFT SIDEBAR: ONLY 12 RM APPLICATION STEPS (SIVELS DEEP GREEN) ── */}
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
                    <strong className="bo-cv-applicant-name">{verificationData.customerName}</strong>
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

          {/* ── STATE 2: CREDIT REPORT FETCH INTERACTION (LOADING SIMULATION) */}
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

          {/* ── STATE 3: AFTER FETCH – CIBIL SCORE DASHBOARD (SUCCESS SIMULATION) */}
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

              {/* 2. Credit Summary KPI Cards */}
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
                  <span className="bo-cv-kpi-sub">Across Active Facilities</span>
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

              {/* 3. Active Loans Section */}
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

              {/* 4. Closed Loans Section */}
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

              {/* 5. Credit Card Exposure */}
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

              {/* 6. Credit Utilization */}
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

              {/* 7. Repayment Behaviour */}
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

              {/* 8. Underwriting Risk Insight */}
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

          {/* ── 9. FOIR ELIGIBILITY CALCULATION SECTION ─────────────────── */}
          <div className="bo-cv-foir-section" id="foir-calculation-section">
            {foirState === 'idle' && (
              <div className="bo-cv-foir-idle-card">
                <div className="bo-cv-foir-idle-content">
                  <div className="bo-cv-foir-idle-icon">
                    {BadgeIndianRupeeIcon ? <BadgeIndianRupeeIcon size={22} /> : <FileCheckIcon size={22} />}
                  </div>
                  <div>
                    <h3 className="bo-cv-foir-title">FOIR Eligibility Calculation</h3>
                    <p className="bo-cv-foir-subtitle">
                      Calculate Fixed Obligation to Income Ratio and evaluate applicant loan eligibility.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="bo-btn bo-btn--primary bo-cv-calc-foir-btn"
                  onClick={handleCalculateFoir}
                >
                  {RefreshCwIcon && <RefreshCwIcon size={14} />}
                  <span>Calculate FOIR</span>
                </button>
              </div>
            )}

            {foirState === 'loading' && (
              <div className="bo-cv-foir-card bo-cv-foir-loading-card">
                <div className="bo-cv-foir-loading-inner">
                  <div className="bo-cv-spinner-box">
                    {RefreshCwIcon && <RefreshCwIcon size={22} className="bo-cv-spin" />}
                  </div>
                  <div>
                    <h4 className="bo-cv-foir-title">Calculating FOIR Eligibility...</h4>
                    <p className="bo-cv-foir-subtitle">
                      Querying FOIREligibilityCalculation for applicant #{verificationData?.customerId}...
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="bo-btn bo-btn--primary bo-cv-calc-foir-btn"
                  disabled
                >
                  {RefreshCwIcon && <RefreshCwIcon size={14} className="bo-cv-spin" />}
                  <span>Calculating...</span>
                </button>
              </div>
            )}

            {foirState === 'error' && (
              <div className="bo-cv-foir-card bo-cv-foir-error-card">
                <div className="bo-cv-foir-header">
                  <div className="bo-cv-foir-title-group">
                    <h3 className="bo-cv-foir-title text-danger">FOIR Calculation Failed</h3>
                    <p className="bo-cv-foir-subtitle">{foirError}</p>
                  </div>
                  <button
                    type="button"
                    className="bo-btn bo-btn--outline bo-cv-foir-recalc-btn"
                    onClick={handleCalculateFoir}
                  >
                    {RefreshCwIcon && <RefreshCwIcon size={13} />}
                    <span>Retry Calculation</span>
                  </button>
                </div>
              </div>
            )}

            {foirState === 'empty' && (
              <div className="bo-cv-foir-card bo-cv-foir-empty-card">
                <div className="bo-cv-foir-header">
                  <div className="bo-cv-foir-title-group">
                    <h3 className="bo-cv-foir-title">FOIR Calculation Result</h3>
                    <p className="bo-cv-foir-subtitle">
                      No matching FOIR calculation record was found for this applicant (Customer #{verificationData?.customerId}).
                    </p>
                  </div>
                  <button
                    type="button"
                    className="bo-btn bo-btn--primary bo-cv-calc-foir-btn"
                    onClick={handleCalculateFoir}
                  >
                    {RefreshCwIcon && <RefreshCwIcon size={13} />}
                    <span>Calculate Again</span>
                  </button>
                </div>
              </div>
            )}

            {foirState === 'success' && foirData && (() => {
              const monthlyIncome = foirData.monthlyIncome ?? foirData.MonthlyIncome;
              const existingEMI = foirData.existingEMI ?? foirData.ExistingEMI ?? foirData.existingEmi ?? foirData.ExistingEmi ?? 0;
              const eligibleIncome = foirData.eligibleIncome ?? foirData.EligibleIncome;
              const netServiceableIncome = foirData.netServiceableIncome ?? foirData.NetServiceableIncome;
              const foirPercentApplied = foirData.foirPercentApplied ?? foirData.FoirPercentApplied ?? foirData.proposedFOIR ?? foirData.ProposedFOIR;
              const actualFOIR = foirData.actualFOIR ?? foirData.ActualFOIR ?? foirData.actualFoir ?? foirData.ActualFoir;
              const requestedLoanAmount = foirData.requestedLoanAmount ?? foirData.RequestedLoanAmount;
              const proposedTenureMonths = foirData.proposedTenureMonths ?? foirData.ProposedTenureMonths ?? foirData.tenureMonths;
              const emiFactor = foirData.emiFactor ?? foirData.EmiFactor;
              const loanEligibilityAmount = foirData.loanEligibilityAmount ?? foirData.LoanEligibilityAmount;
              const status = foirData.status ?? foirData.Status ?? 'Under Review';
              const isEligible = String(status).trim().toLowerCase() === 'eligible';

              return (
                <div className="bo-cv-foir-card bo-cv-foir-success-card">
                  <div className="bo-cv-foir-header">
                    <div className="bo-cv-foir-title-group">
                      <div className="bo-cv-foir-title-row">
                        <div className="bo-cv-foir-badge-icon">
                          {BadgeIndianRupeeIcon ? <BadgeIndianRupeeIcon size={18} /> : <FileCheckIcon size={18} />}
                        </div>
                        <h3 className="bo-cv-foir-title">FOIR Calculation Result</h3>
                        <span className={`bo-cv-foir-status-badge ${isEligible ? 'is-eligible' : 'is-not-eligible'}`}>
                          {status}
                        </span>
                      </div>
                      <p className="bo-cv-foir-subtitle">
                        Fixed Obligation to Income Ratio analysis based on applicant income and existing debt obligations.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="bo-btn bo-btn--outline bo-cv-foir-recalc-btn"
                      onClick={handleCalculateFoir}
                      title="Re-run FOIR calculation"
                    >
                      {RefreshCwIcon && <RefreshCwIcon size={13} />}
                      <span>Re-calculate FOIR</span>
                    </button>
                  </div>

                  <div className="bo-cv-foir-grid">
                    {/* 1. Monthly Income */}
                    <div className="bo-cv-foir-cell">
                      <span className="bo-cv-foir-cell-lbl">Monthly Income</span>
                      <strong className="bo-cv-foir-cell-val text-primary">{formatFoirCurrency(monthlyIncome)}</strong>
                    </div>

                    {/* 2. Existing EMI */}
                    <div className="bo-cv-foir-cell">
                      <span className="bo-cv-foir-cell-lbl">Existing EMI</span>
                      <strong className="bo-cv-foir-cell-val">{formatFoirCurrency(existingEMI)}</strong>
                    </div>

                    {/* 3. Eligible Income */}
                    <div className="bo-cv-foir-cell">
                      <span className="bo-cv-foir-cell-lbl">Eligible Income</span>
                      <strong className="bo-cv-foir-cell-val text-success">{formatFoirCurrency(eligibleIncome)}</strong>
                    </div>

                    {/* 4. Net Serviceable Income */}
                    <div className="bo-cv-foir-cell">
                      <span className="bo-cv-foir-cell-lbl">Net Serviceable Income</span>
                      <strong className="bo-cv-foir-cell-val text-success">{formatFoirCurrency(netServiceableIncome)}</strong>
                    </div>

                    {/* 5. FOIR % */}
                    <div className="bo-cv-foir-cell">
                      <span className="bo-cv-foir-cell-lbl">FOIR %</span>
                      <strong className="bo-cv-foir-cell-val">
                        {foirPercentApplied !== undefined && foirPercentApplied !== null && foirPercentApplied !== '' ? `${foirPercentApplied}%` : '—'}
                      </strong>
                    </div>

                    {/* 6. Actual FOIR */}
                    <div className="bo-cv-foir-cell">
                      <span className="bo-cv-foir-cell-lbl">Actual FOIR</span>
                      <strong className="bo-cv-foir-cell-val">{formatFoirCurrency(actualFOIR)}</strong>
                    </div>

                    {/* 7. Requested Loan Amount */}
                    <div className="bo-cv-foir-cell">
                      <span className="bo-cv-foir-cell-lbl">Requested Loan Amount</span>
                      <strong className="bo-cv-foir-cell-val">{formatFoirCurrency(requestedLoanAmount)}</strong>
                    </div>

                    {/* 8. Proposed Tenure (Months) */}
                    <div className="bo-cv-foir-cell">
                      <span className="bo-cv-foir-cell-lbl">Proposed Tenure (Months)</span>
                      <strong className="bo-cv-foir-cell-val">
                        {proposedTenureMonths !== undefined && proposedTenureMonths !== null && proposedTenureMonths !== '' ? `${proposedTenureMonths} Months` : '—'}
                      </strong>
                    </div>

                    {/* 9. EMI Factor */}
                    <div className="bo-cv-foir-cell">
                      <span className="bo-cv-foir-cell-lbl">EMI Factor</span>
                      <strong className="bo-cv-foir-cell-val">
                        {emiFactor !== undefined && emiFactor !== null && emiFactor !== '' ? Number(emiFactor).toLocaleString('en-IN', { maximumFractionDigits: 4 }) : '—'}
                      </strong>
                    </div>

                    {/* 10. Loan Eligibility Amount */}
                    <div className="bo-cv-foir-cell">
                      <span className="bo-cv-foir-cell-lbl">Loan Eligibility Amount</span>
                      <strong className={`bo-cv-foir-cell-val ${isEligible ? 'text-success' : 'text-danger'}`}>
                        {formatFoirCurrency(loanEligibilityAmount)}
                      </strong>
                    </div>

                    {/* 11. Status */}
                    <div className="bo-cv-foir-cell">
                      <span className="bo-cv-foir-cell-lbl">Status</span>
                      <span className={`bo-cv-foir-status-pill ${isEligible ? 'is-eligible' : 'is-not-eligible'}`}>
                        {status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </main>
      </div>

      {/* ── View-Only 12-Step Inspection Modal (Single-Fetch Shared Data) ── */}
      {selectedStepNumber && selectedStepDef && (
        <VerificationStepModal
          stepNumber={selectedStepNumber}
          stepDefinition={selectedStepDef}
          customerData={verificationData}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
