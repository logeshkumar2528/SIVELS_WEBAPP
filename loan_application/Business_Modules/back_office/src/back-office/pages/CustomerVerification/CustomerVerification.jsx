/**
 * CustomerVerification.jsx
 * --------------------
 * Dedicated Full-Screen Customer Verification Workspace for the Back Office module.
 *
 * Route: /backoffice/customers/:customerId/verify
 *
 * Architecture:
 * - 15-Step Underwriting Verification Workflow (Sidebar: 01–15).
 * - Step 01: View Form (Direct embedded PdfView with ApplicationDraftProvider).
 * - Step 02: Profile Image (Applicant photograph with uncropped preview, remarks, Reject/Send to RM).
 * - Step 03: Aadhaar Card (Applicant KYC Aadhaar with image/PDF preview, remarks, Reject/Send to RM).
 * - Step 04: PAN Card (Applicant KYC PAN with image/PDF preview, remarks, Reject/Send to RM).
 * - Step 05: ZIP File (Customer document ZIP archive package or graceful empty state).
 * - Step 06: Property FI (Field Investigation placeholder).
 * - Step 07: Office FI (Office Investigation placeholder).
 * - Step 08: Residence FI (Residence Investigation placeholder).
 * - Step 09: Legal Opinion (File upload dropzone with <= 150 MB validation, View, Download, Remove).
 * - Step 10: Technical Value (File upload dropzone with <= 150 MB validation, View, Download, Remove).
 * - Step 11: CIBIL Check (Preserved Credit Bureau verification simulation + Manual CIBIL PAN Upload).
 * - Step 12: PD Verification (Personal Discussion call type selector: Video Call / Tele Call / Audio Call).
 * - Step 13: Eligibility Calculation (Preserved live FOIR calculation, recalculate, Approve/Not Approve modal).
 * - Step 14: Eligibility Fit (Underwriting Fit selector: Fit / Conditional Fit / Not Fit).
 * - Step 15: Recommendation Sheet (Credit underwriter recommendation placeholder).
 * - Legacy 8-step sidebar code and VerificationStepModal are preserved in code for easy restoration.
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import { ROUTES } from '../../config/routeConfig';
import { VERIFICATION_STEP_DEFINITIONS } from '../../config/verificationSteps';
import { useVerificationWorkspace } from '../../hooks/useVerificationWorkspace';
import backOfficeService from '../../api/backOfficeService';
import { getBackOfficeAuth } from '../../auth/authStorage';
import VerificationStepModal from '../../components/Verification/VerificationStepModal';
import PdfView from '../../../../../rm_modules/src/pages/PdfView/PdfView';
import { ApplicationDraftProvider } from '../../../../../rm_modules/src/state/ApplicationDraftContext';
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

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

const STAGES = [
  { id: 0, label: 'Checking PAN details & Tax identification records...' },
  { id: 1, label: 'Connecting to Credit Bureau (TransUnion CIBIL / Experian)...' },
  { id: 2, label: 'Fetching credit history & active loan facilities...' },
  { id: 3, label: 'Analyzing repayment records & credit score rating...' },
  { id: 4, label: 'Credit Bureau Report Successfully Retrieved' },
];

const FOIR_LOADING_STAGES = [
  'Reading applicant income details',
  'Checking existing monthly obligations',
  'Applying the FOIR policy threshold',
  'Preparing the eligibility summary',
];

/**
 * 15-Step Underwriting Verification Workflow Step Definitions
 */
const VERIFICATION_WORKFLOW_STEPS = [
  { id: 1, number: 1, title: 'View Form', subtitle: 'Application form' },
  { id: 2, number: 2, title: 'Profile Image', subtitle: 'Applicant photo' },
  { id: 3, number: 3, title: 'Aadhaar Card', subtitle: 'Identity & Address' },
  { id: 4, number: 4, title: 'PAN Card', subtitle: 'Tax identification' },
  { id: 5, number: 5, title: 'ZIP File', subtitle: 'Customer archive' },
  { id: 6, number: 6, title: 'Property FI', subtitle: 'Property investigation' },
  { id: 7, number: 7, title: 'Office FI', subtitle: 'Office verification' },
  { id: 8, number: 8, title: 'Residence FI', subtitle: 'Residence verification' },
  { id: 9, number: 9, title: 'Legal Opinion', subtitle: 'Legal report upload' },
  { id: 10, number: 10, title: 'Technical Value', subtitle: 'Valuation report upload' },
  { id: 11, number: 11, title: 'CIBIL Check', subtitle: 'Credit Bureau & PAN' },
  { id: 12, number: 12, title: 'PD Verification', subtitle: 'Personal discussion' },
  { id: 13, number: 13, title: 'Eligibility Calculation', subtitle: 'FOIR ratio calculation' },
  { id: 14, number: 14, title: 'Eligibility Fit', subtitle: 'Underwriting fit status' },
  { id: 15, number: 15, title: 'Recommendation Sheet', subtitle: 'Credit recommendation' },
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

  // 2. Active 15-Step Workflow State (Default: Step 1 — View Form)
  const [activeStep, setActiveStep] = useState(1);

  // 3. Preserved Legacy 8-Step Modal State (View-only inspection)
  const [selectedStepNumber, setSelectedStepNumber] = useState(null);

  // 4. Document Previews Cache & Blob Management
  const [docPreviews, setDocPreviews] = useState({});
  const blobUrlsRef = useRef([]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      blobUrlsRef.current = [];
    };
  }, []);

  // 5. Remarks & Reject/Send to RM State for Steps 2, 3, 4, 5
  const [stepRemarks, setStepRemarks] = useState({ 2: '', 3: '', 4: '', 5: '' });
  const [stepFeedback, setStepFeedback] = useState({ 2: null, 3: null, 4: null, 5: null });

  // 6. Upload States for Steps 9 & 10 (Legal Opinion & Technical Value, Max 150MB)
  const [legalOpinion, setLegalOpinion] = useState({
    file: null,
    fileName: '',
    fileSize: '',
    fileUrl: null,
    isPdf: false,
    error: null,
  });

  const [technicalValue, setTechnicalValue] = useState({
    file: null,
    fileName: '',
    fileSize: '',
    fileUrl: null,
    isPdf: false,
    error: null,
  });

  // 7. Manual CIBIL PAN Upload State for Step 11
  const [manualCibilPan, setManualCibilPan] = useState({
    file: null,
    fileName: '',
    fileSize: '',
    fileUrl: null,
    error: null,
  });

  // 8. PD Verification Call Type State for Step 12
  const [pdCallType, setPdCallType] = useState('Video Call');

  // 9. Eligibility Fit State for Step 14
  const [eligibilityFit, setEligibilityFit] = useState('Fit');

  // 10. Credit Bureau Verification Simulation State: 'idle' | 'loading' | 'success'
  const [bureauState, setBureauState] = useState('idle');
  const [loadingStage, setLoadingStage] = useState(0);

  // 11. FOIR Calculation State: 'idle' | 'loading' | 'success' | 'empty' | 'error'
  const [foirState, setFoirState] = useState('idle');
  const [foirData, setFoirData] = useState(null);
  const [foirError, setFoirError] = useState(null);
  const [foirLoadingStage, setFoirLoadingStage] = useState(0);

  // 12. FOIR Decision Remarks Modal State (Approve / Not Approve)
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState(null); // 'approve' | 'notApprove'
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [, setConfirmedDecision] = useState(null);

  // 13. Icons
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
  const FileTextIcon = iconMap['FileText'] || iconMap['FileCheck'] || iconMap['Eye'];
  const XIcon = iconMap['X'] || iconMap['XCircle'];
  const DownloadIcon = iconMap['Download'];
  const UserIcon = iconMap['User'] || iconMap['UserRound'];
  const PhoneIcon = iconMap['Phone'];
  const BuildingIcon = iconMap['Building2'] || iconMap['Landmark'];
  const ExternalLinkIcon = iconMap['ExternalLink'];

  // Top View Form Button handler: activates Step 1
  const handleViewForm = () => {
    setActiveStep(1);
  };

  const handleOpenDecisionModal = (type) => {
    setDecisionType(type);
    setDecisionRemarks('');
    setDecisionError('');
    setDecisionModalOpen(true);
  };

  const handleCloseDecisionModal = () => {
    setDecisionModalOpen(false);
    setDecisionType(null);
    setDecisionRemarks('');
    setDecisionError('');
  };

  const handleConfirmDecision = () => {
    const trimmed = decisionRemarks.trim();
    if (!trimmed) {
      setDecisionError('Remarks are required.');
      return;
    }
    setConfirmedDecision({
      type: decisionType,
      remarks: trimmed,
      date: new Date().toISOString(),
    });
    setDecisionModalOpen(false);
    setDecisionType(null);
    setDecisionRemarks('');
  };
  // ----------------------------------------------------
  // Document Resolution & Preview Loader
  // ----------------------------------------------------
  const loadDocumentPreview = useCallback(async (docKey, doc) => {
    const docId = doc?.agentCustomerDocumentId || doc?.id;
    if (!docId) {
      setDocPreviews((prev) => ({
        ...prev,
        [docKey]: { loading: false, error: 'Document identifier not found', doc: null, url: null },
      }));
      return;
    }

    setDocPreviews((prev) => ({
      ...prev,
      [docKey]: { loading: true, error: null, doc, url: null },
    }));

    try {
      const blobData = await backOfficeService.downloadCustomerDocument(docId);
      const fileName = doc?.fileName || doc?.name || '';
      const isPdf = /\.pdf$/i.test(fileName) || blobData.type === 'application/pdf';

      let mimeType = blobData.type || (isPdf ? 'application/pdf' : 'image/jpeg');
      if (/\.(jpg|jpeg)$/i.test(fileName)) mimeType = 'image/jpeg';
      else if (/\.png$/i.test(fileName)) mimeType = 'image/png';
      else if (/\.webp$/i.test(fileName)) mimeType = 'image/webp';
      else if (isPdf) mimeType = 'application/pdf';

      const typedBlob = new Blob([blobData], { type: mimeType });
      const objectUrl = window.URL.createObjectURL(typedBlob);
      blobUrlsRef.current.push(objectUrl);

      setDocPreviews((prev) => ({
        ...prev,
        [docKey]: {
          loading: false,
          error: null,
          doc,
          url: objectUrl,
          isPdf,
          isImage: !isPdf,
        },
      }));
    } catch (err) {
      console.warn(`[CustomerVerification] Could not download document preview for ${docKey}:`, err?.message);
      setDocPreviews((prev) => ({
        ...prev,
        [docKey]: {
          loading: false,
          error: 'Document file preview could not be loaded from the server.',
          doc,
          url: null,
        },
      }));
    }
  }, []);

  // Fetch document preview whenever an active document step is opened
  useEffect(() => {
    if (!verificationData) return;
    const docs = verificationData?.kycDocuments?.documents || [];

    if (activeStep === 2 && !docPreviews.profile) {
      const profileDoc = docs.find(
        (d) =>
          d.documentTypeId === 6 ||
          /(photo|picture|client|profile)/i.test(d.documentTypeName || d.name || d.fileName || '')
      );
      if (profileDoc) {
        loadDocumentPreview('profile', profileDoc);
      } else {
        setDocPreviews((prev) => ({ ...prev, profile: { loading: false, error: null, doc: null, url: null } }));
      }
    }

    if (activeStep === 3 && !docPreviews.aadhaar) {
      const aadhaarDoc = docs.find(
        (d) =>
          d.documentTypeId === 1 ||
          /(aadhaar|aadhar)/i.test(d.documentTypeName || d.name || d.fileName || '')
      );
      if (aadhaarDoc) {
        loadDocumentPreview('aadhaar', aadhaarDoc);
      } else {
        setDocPreviews((prev) => ({ ...prev, aadhaar: { loading: false, error: null, doc: null, url: null } }));
      }
    }

    if (activeStep === 4 && !docPreviews.pan) {
      const panDoc = docs.find(
        (d) =>
          d.documentTypeId === 2 ||
          /\bpan\b/i.test(d.documentTypeName || d.name || d.fileName || '')
      );
      if (panDoc) {
        loadDocumentPreview('pan', panDoc);
      } else {
        setDocPreviews((prev) => ({ ...prev, pan: { loading: false, error: null, doc: null, url: null } }));
      }
    }

    if (activeStep === 5 && !docPreviews.zip) {
      const zipDoc = docs.find(
        (d) =>
          /\.zip$/i.test(d.fileName || '') ||
          /(zip|archive)/i.test(d.documentTypeName || d.name || d.fileName || '')
      );
      if (zipDoc) {
        setDocPreviews((prev) => ({
          ...prev,
          zip: { loading: false, error: null, doc: zipDoc, url: null },
        }));
      } else {
        setDocPreviews((prev) => ({ ...prev, zip: { loading: false, error: null, doc: null, url: null } }));
      }
    }
  }, [activeStep, verificationData, docPreviews, loadDocumentPreview]);

  // Remarks & Send to RM Handler for Steps 2, 3, 4
  const handleRejectOrSendToRm = (stepNum, stepLabel) => {
    const remarks = (stepRemarks[stepNum] || '').trim();
    if (!remarks) {
      setStepFeedback((prev) => ({
        ...prev,
        [stepNum]: {
          type: 'error',
          message: `Please enter remarks before rejecting / sending ${stepLabel} to RM.`,
        },
      }));
      return;
    }

    setStepFeedback((prev) => ({
      ...prev,
      [stepNum]: {
        type: 'success',
        message: `${stepLabel} marked for RM review with remarks: "${remarks}".`,
      },
    }));
  };

  // File Upload Handlers (Steps 9 & 10)
  const handleFileUpload = (e, setter, label) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 150 * 1024 * 1024) {
      setter({
        file: null,
        fileName: '',
        fileSize: '',
        fileUrl: null,
        isPdf: false,
        error: `File size (${formatFileSize(file.size)}) exceeds the maximum 150 MB limit for ${label}.`,
      });
      return;
    }

    const fileUrl = window.URL.createObjectURL(file);
    blobUrlsRef.current.push(fileUrl);

    setter({
      file,
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      fileUrl,
      isPdf: /\.pdf$/i.test(file.name),
      error: null,
    });
  };

  const handleRemoveUploadedFile = (state, setter) => {
    if (state.fileUrl) {
      try {
        URL.revokeObjectURL(state.fileUrl);
      } catch {}
    }
    setter({
      file: null,
      fileName: '',
      fileSize: '',
      fileUrl: null,
      isPdf: false,
      error: null,
    });
  };

  const handleDownloadFile = (url, name) => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = name || 'document';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 5a. Initial Load: Fetch latest FOIR calculation snapshot via GET /by-customer/{agentCustomerId}
  useEffect(() => {
    const rawCustomer = verificationData?.raw?.customer || verificationData?.customer || {};
    const rawCust = Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer;
    const targetCustomerId =
      verificationData?.customerId ||
      rawCust?.agentCustomerId ||
      rawCust?.AgentCustomerId ||
      customerId;

    if (!targetCustomerId) return;

    let isMounted = true;

    const fetchLatestFoir = async () => {
      try {
        const res = await backOfficeService.getFoirCalculationsByCustomer(targetCustomerId);
        if (!isMounted) return;

        const records = Array.isArray(res) ? res : (res?.value ?? res?.data ?? res?.result ?? []);
        // Backend returns records newest-first (latest calculation snapshot at index 0)
        const latestResult = records.length > 0 ? records[0] : null;

        if (latestResult) {
          setFoirData(latestResult);
          setFoirState('success');
        } else {
          setFoirData(null);
          setFoirState('idle');
        }
      } catch (err) {
        if (!isMounted) return;
        // If 404 or no calculation records exist yet, keep idle state for user to trigger first calculation
        console.warn('No existing FOIR records found for customer:', err?.message);
        setFoirData(null);
        setFoirState('idle');
      }
    };

    fetchLatestFoir();

    return () => {
      isMounted = false;
    };
  }, [verificationData?.customerId, customerId]);

  const handleCalculateFoir = async () => {
    if (foirState === 'loading') return;

    const startedAt = Date.now();
    setFoirState('loading');
    setFoirLoadingStage(0);
    setFoirError(null);

    try {
      // Resolve application IDs from current verification data
      const rawCustomer = verificationData?.raw?.customer || verificationData?.customer || {};
      const rawCust = Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer;
      const rawEmp = verificationData?.raw?.employmentIncome || verificationData?.employmentIncome?.raw || verificationData?.raw?.EmploymentIncome || {};
      const rawEmpItem = Array.isArray(rawEmp) ? rawEmp[0] : rawEmp;
      const rawProd = verificationData?.raw?.productDetails || verificationData?.applicationDetails?.raw || verificationData?.raw?.ProductDetails || verificationData?.raw?.applicationProductDetails || {};
      const rawProdItem = Array.isArray(rawProd) ? rawProd[0] : rawProd;

      const agentCustId =
        verificationData?.customerId ||
        rawCust?.agentCustomerId ||
        rawCust?.AgentCustomerId ||
        verificationData?.raw?.agentCustomerId ||
        verificationData?.raw?.AgentCustomerId ||
        customerId;

      const empIncomeId =
        rawEmpItem?.applicationEmploymentIncomeDetailsId ||
        rawEmpItem?.ApplicationEmploymentIncomeDetailsId ||
        rawEmpItem?.employmentIncomeDetailsId ||
        rawEmpItem?.EmploymentIncomeDetailsId ||
        rawEmpItem?.id ||
        rawEmpItem?.Id ||
        verificationData?.employmentIncome?.raw?.applicationEmploymentIncomeDetailsId ||
        verificationData?.employmentIncome?.raw?.ApplicationEmploymentIncomeDetailsId;

      const prodDetailsId =
        rawProdItem?.applicationProductDetailsId ||
        rawProdItem?.ApplicationProductDetailsId ||
        rawProdItem?.productDetailsId ||
        rawProdItem?.ProductDetailsId ||
        rawProdItem?.id ||
        rawProdItem?.Id ||
        verificationData?.applicationDetails?.raw?.applicationProductDetailsId ||
        verificationData?.applicationDetails?.raw?.ApplicationProductDetailsId;

      const auth = getBackOfficeAuth();
      const loggedInUserId =
        auth?.id ||
        localStorage.getItem('backOfficeId') ||
        (() => {
          try {
            const bo = JSON.parse(localStorage.getItem('backOfficeData') || 'null');
            if (bo?.backOfficeId || bo?.id || bo?.userId) return bo.backOfficeId || bo.id || bo.userId;
            const cu = JSON.parse(localStorage.getItem('sivels_currentUser') || 'null');
            if (cu?.backOfficeId || cu?.userId || cu?.id) return cu.backOfficeId || cu.userId || cu.id;
          } catch {}
          return null;
        })() ||
        1;

      if (!agentCustId || !empIncomeId || !prodDetailsId) {
        const missing = [];
        if (!agentCustId) missing.push('Customer ID');
        if (!empIncomeId) missing.push('Employment Income ID');
        if (!prodDetailsId) missing.push('Product Details ID');
        throw new Error(`Unable to calculate FOIR: Required identifier(s) [${missing.join(', ')}] not found in application data.`);
      }

      const payload = {
        agentCustomerId: Number(agentCustId),
        applicationEmploymentIncomeDetailsId: Number(empIncomeId),
        applicationProductDetailsId: Number(prodDetailsId),
        createdBy: Number(loggedInUserId) || 1,
      };

      const res = await backOfficeService.calculateFoir(payload);

      // Smooth visual transition for progress stages
      const elapsed = Date.now() - startedAt;
      if (elapsed < 800) {
        await new Promise((resolve) => setTimeout(resolve, 800 - elapsed));
      }

      const freshResult = (res && typeof res === 'object' && !Array.isArray(res))
        ? res
        : (Array.isArray(res) ? res[0] : (res?.data ?? res?.value ?? res?.result ?? res));

      if (freshResult) {
        setFoirData(freshResult);
        setFoirState('success');
      } else {
        throw new Error('Calculation service did not return a result record.');
      }
    } catch (err) {
      console.error('Error calculating FOIR:', err);
      setFoirError(err?.response?.data?.message || err?.message || 'Unable to connect to FOIR calculation service.');
      setFoirState('error');
    }
  };

  useEffect(() => {
    if (foirState !== 'loading') return undefined;

    const timers = FOIR_LOADING_STAGES.slice(1).map((_, index) => (
      setTimeout(() => setFoirLoadingStage(index + 1), (index + 1) * 360)
    ));

    return () => timers.forEach(clearTimeout);
  }, [foirState]);

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
    navigate(ROUTES.CUSTOMERS);
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
              <span className="bo-cv-pill-fetching">Pending</span>
            ) : (
              <span className="bo-cv-pill-unverified">Not Verified</span>
            )}
          </div>
        </div>
      </header>

      {/* ── 2. Dedicated 2-Column Workspace Body ──────────────────────── */}
      <div className="bo-cv-workspace-body">
        {/* ── HIDDEN LEGACY 8-STEP SIDEBAR (PRESERVED FOR FUTURE RESTORATION) ── */}
        {false && (
          <aside className="bo-cv-left-sidebar" aria-label="Legacy Application Steps">
            <div className="bo-cv-sidebar-header">
              <div className="bo-cv-sidebar-heading-row">
                <div>
                  <h2 className="bo-cv-sidebar-title">Application Steps</h2>
                  <span className="bo-cv-sidebar-subtitle">Verification checklist</span>
                </div>
                <span className="bo-cv-step-count">08</span>
              </div>
            </div>

            <nav className="bo-cv-steps-nav">
              <ul className="bo-cv-steps-list" role="list">
                {VERIFICATION_STEP_DEFINITIONS.filter((step) => step.number <= 8).map((step) => {
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
                        <div className="bo-cv-step-num-box" aria-hidden="true">
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
        )}

        {/* ── NEW 15-STEP VERIFICATION WORKFLOW SIDEBAR (SIVELS FINANCE) ── */}
        <aside className="bo-cv-left-sidebar" aria-label="15-Step Underwriting Verification Workflow">
          <div className="bo-cv-sidebar-header">
            <div className="bo-cv-sidebar-heading-row">
              <div>
                <h2 className="bo-cv-sidebar-title">Verification Steps</h2>
                <span className="bo-cv-sidebar-subtitle">15-Step Underwriting</span>
              </div>
              <span className="bo-cv-step-count">15</span>
            </div>
          </div>

          <nav className="bo-cv-steps-nav">
            <ul className="bo-cv-steps-list" role="list">
              {VERIFICATION_WORKFLOW_STEPS.map((step) => {
                const stepNum = step.number;
                const isSelected = activeStep === stepNum;
                const formattedNum = String(stepNum).padStart(2, '0');

                return (
                  <li key={step.id} className="bo-cv-step-item">
                    <button
                      type="button"
                      className={`bo-cv-step-card ${isSelected ? 'is-active' : ''}`}
                      onClick={() => setActiveStep(stepNum)}
                      aria-label={`Step ${stepNum}: ${step.title}. Click to view.`}
                    >
                      <div className="bo-cv-step-num-box" aria-hidden="true">
                        {formattedNum}
                      </div>

                      <div className="bo-cv-step-details">
                        <strong className="bo-cv-step-name">{step.title}</strong>
                        <span className="bo-cv-step-desc">{step.subtitle}</span>
                      </div>

                      {!isSelected && (
                        <div className="bo-cv-step-action">
                          <span className="bo-cv-view-btn">
                            {EyeIcon && <EyeIcon size={11} />}
                            <span>View</span>
                          </span>
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* ── RIGHT MAIN WORKSPACE: 15-STEP UNDERWRITING CONTENT ─────────── */}
        <main className="bo-cv-main-content" id="main-verification-content">

          {/* ══════════════════════════════════════════════════════════════════
              STEP 01: VIEW FORM
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 1 && (
            <div className="bo-cv-step-panel bo-cv-view-form-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">01</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">View Submitted Application Form</h2>
                    <p className="bo-cv-step-panel-desc">
                      Full read-only loan application form submitted by the applicant and relationship manager.
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 01 of 15</span>
              </div>

              <div className="bo-cv-view-form-embed-wrapper">
                <ApplicationDraftProvider>
                  <PdfView />
                </ApplicationDraftProvider>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 02: PROFILE IMAGE
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 2 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">02</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Applicant Profile Image</h2>
                    <p className="bo-cv-step-panel-desc">
                      Inspect the authentic applicant photograph uploaded during customer onboarding.
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 02 of 15</span>
              </div>

              <div className="bo-cv-doc-display-container">
                {docPreviews.profile?.loading ? (
                  <div className="bo-cv-doc-loading-box">
                    <div className="bo-cv-loading-spinner" />
                    <span>Loading applicant profile photograph...</span>
                  </div>
                ) : docPreviews.profile?.url ? (
                  <div className="bo-cv-image-preview-frame">
                    <img
                      src={docPreviews.profile.url}
                      alt={`Profile of ${verificationData.customerName}`}
                      className="bo-cv-uncropped-img"
                    />
                    <div className="bo-cv-doc-meta-row">
                      <div className="bo-cv-doc-meta-left">
                        <span><strong>File:</strong> {docPreviews.profile.doc?.fileName || 'Profile Image'}</span>
                        {docPreviews.profile.doc?.uploadedOn && (
                          <span><strong>Uploaded:</strong> {docPreviews.profile.doc.uploadedOn}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="bo-btn bo-btn--outline bo-btn--sm"
                        onClick={() => handleDownloadFile(docPreviews.profile.url, docPreviews.profile.doc?.fileName || 'profile_image.jpg')}
                      >
                        {DownloadIcon && <DownloadIcon size={13} />}
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bo-cv-empty-doc-card">
                    <div className="bo-cv-empty-doc-icon">
                      {UserIcon && <UserIcon size={36} />}
                    </div>
                    <h4>No Profile Image Document Found</h4>
                    <p>
                      {docPreviews.profile?.error ||
                        'No uploaded customer photograph is currently available for this application.'}
                    </p>
                  </div>
                )}

                {/* Remarks & Reject / Send to RM */}
                <div className="verification-action-bar">
                  <div className="verification-remarks-field">
                    <label htmlFor="bo-cv-remarks-profile">VERIFICATION REMARKS</label>
                    <textarea
                      id="bo-cv-remarks-profile"
                      className="bo-cv-remarks-input"
                      rows={3}
                      placeholder="Enter remarks or discrepancy details for applicant profile image..."
                      value={stepRemarks[2] || ''}
                      onChange={(e) => {
                        setStepRemarks({ ...stepRemarks, 2: e.target.value });
                        if (stepFeedback[2]) setStepFeedback({ ...stepFeedback, 2: null });
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    className="reject-rm-btn"
                    onClick={() => handleRejectOrSendToRm(2, 'Profile Image')}
                  >
                    <span>Reject / Send to RM</span>
                  </button>
                </div>

                {stepFeedback[2] && (
                  <div className={`bo-cv-feedback-alert ${stepFeedback[2].type === 'error' ? 'is-error' : 'is-success'}`}>
                    {stepFeedback[2].message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 03: AADHAAR CARD
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 3 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">03</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Applicant Aadhaar Card</h2>
                    <p className="bo-cv-step-panel-desc">
                      Verify applicant Aadhaar identity card and address document.
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 03 of 15</span>
              </div>

              <div className="bo-cv-doc-display-container">
                {docPreviews.aadhaar?.loading ? (
                  <div className="bo-cv-doc-loading-box">
                    <div className="bo-cv-doc-loading-spinner" />
                    <span>Loading applicant Aadhaar document...</span>
                  </div>
                ) : docPreviews.aadhaar?.url ? (
                  <div className="bo-cv-image-preview-frame">
                    {docPreviews.aadhaar.isPdf ? (
                      <div className="bo-cv-pdf-frame-wrapper">
                        <iframe
                          src={docPreviews.aadhaar.url}
                          title="Aadhaar Document PDF"
                          className="bo-cv-doc-iframe"
                        />
                      </div>
                    ) : (
                      <img
                        src={docPreviews.aadhaar.url}
                        alt="Aadhaar Card"
                        className="bo-cv-uncropped-img"
                      />
                    )}

                    <div className="bo-cv-doc-meta-row">
                      <div className="bo-cv-doc-meta-left">
                        <span><strong>Document:</strong> {docPreviews.aadhaar.doc?.fileName || 'Aadhaar Card'}</span>
                        {verificationData.personalInformation?.aadhaarNumber && (
                          <span><strong>Aadhaar No:</strong> {verificationData.personalInformation.aadhaarNumber}</span>
                        )}
                        {docPreviews.aadhaar.doc?.uploadedOn && (
                          <span><strong>Uploaded:</strong> {docPreviews.aadhaar.doc.uploadedOn}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="bo-btn bo-btn--outline bo-btn--sm"
                        onClick={() => handleDownloadFile(docPreviews.aadhaar.url, docPreviews.aadhaar.doc?.fileName || 'aadhaar_card.pdf')}
                      >
                        {DownloadIcon && <DownloadIcon size={13} />}
                        <span>Download Document</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bo-cv-empty-doc-card">
                    <div className="bo-cv-empty-doc-icon">
                      {ShieldCheckIcon && <ShieldCheckIcon size={36} />}
                    </div>
                    <h4>No Aadhaar Document Found</h4>
                    <p>
                      {docPreviews.aadhaar?.error ||
                        'No uploaded Aadhaar proof is currently available for this applicant.'}
                    </p>
                  </div>
                )}

                {/* Remarks & Reject / Send to RM */}
                <div className="verification-action-bar">
                  <div className="verification-remarks-field">
                    <label htmlFor="bo-cv-remarks-aadhaar">VERIFICATION REMARKS</label>
                    <textarea
                      id="bo-cv-remarks-aadhaar"
                      className="bo-cv-remarks-input"
                      rows={3}
                      placeholder="Enter remarks or discrepancy details for Aadhaar verification..."
                      value={stepRemarks[3] || ''}
                      onChange={(e) => {
                        setStepRemarks({ ...stepRemarks, 3: e.target.value });
                        if (stepFeedback[3]) setStepFeedback({ ...stepFeedback, 3: null });
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    className="reject-rm-btn"
                    onClick={() => handleRejectOrSendToRm(3, 'Aadhaar Card')}
                  >
                    <span>Reject / Send to RM</span>
                  </button>
                </div>

                {stepFeedback[3] && (
                  <div className={`bo-cv-feedback-alert ${stepFeedback[3].type === 'error' ? 'is-error' : 'is-success'}`}>
                    {stepFeedback[3].message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 04: PAN CARD
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 4 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">04</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Applicant PAN Card</h2>
                    <p className="bo-cv-step-panel-desc">
                      Inspect Permanent Account Number tax identification document.
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 04 of 15</span>
              </div>

              <div className="bo-cv-doc-display-container">
                {docPreviews.pan?.loading ? (
                  <div className="bo-cv-doc-loading-box">
                    <div className="bo-cv-doc-loading-spinner" />
                    <span>Loading applicant PAN Card document...</span>
                  </div>
                ) : docPreviews.pan?.url ? (
                  <div className="bo-cv-image-preview-frame">
                    {docPreviews.pan.isPdf ? (
                      <div className="bo-cv-pdf-frame-wrapper">
                        <iframe
                          src={docPreviews.pan.url}
                          title="PAN Document PDF"
                          className="bo-cv-doc-iframe"
                        />
                      </div>
                    ) : (
                      <img
                        src={docPreviews.pan.url}
                        alt="PAN Card"
                        className="bo-cv-uncropped-img"
                      />
                    )}

                    <div className="bo-cv-doc-meta-row">
                      <div className="bo-cv-doc-meta-left">
                        <span><strong>Document:</strong> {docPreviews.pan.doc?.fileName || 'PAN Card'}</span>
                        <span><strong>PAN:</strong> {panNumber}</span>
                        {docPreviews.pan.doc?.uploadedOn && (
                          <span><strong>Uploaded:</strong> {docPreviews.pan.doc.uploadedOn}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="bo-btn bo-btn--outline bo-btn--sm"
                        onClick={() => handleDownloadFile(docPreviews.pan.url, docPreviews.pan.doc?.fileName || 'pan_card.pdf')}
                      >
                        {DownloadIcon && <DownloadIcon size={13} />}
                        <span>Download Document</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bo-cv-empty-doc-card">
                    <div className="bo-cv-empty-doc-icon">
                      {FileTextIcon && <FileTextIcon size={36} />}
                    </div>
                    <h4>No PAN Card Document Found</h4>
                    <p>
                      {docPreviews.pan?.error ||
                        'No uploaded PAN document is currently available for this applicant.'}
                    </p>
                  </div>
                )}

                {/* Remarks & Reject / Send to RM */}
                <div className="verification-action-bar">
                  <div className="verification-remarks-field">
                    <label htmlFor="bo-cv-remarks-pan">VERIFICATION REMARKS</label>
                    <textarea
                      id="bo-cv-remarks-pan"
                      className="bo-cv-remarks-input"
                      rows={3}
                      placeholder="Enter remarks or discrepancy details for PAN verification..."
                      value={stepRemarks[4] || ''}
                      onChange={(e) => {
                        setStepRemarks({ ...stepRemarks, 4: e.target.value });
                        if (stepFeedback[4]) setStepFeedback({ ...stepFeedback, 4: null });
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    className="reject-rm-btn"
                    onClick={() => handleRejectOrSendToRm(4, 'PAN Card')}
                  >
                    <span>Reject / Send to RM</span>
                  </button>
                </div>

                {stepFeedback[4] && (
                  <div className={`bo-cv-feedback-alert ${stepFeedback[4].type === 'error' ? 'is-error' : 'is-success'}`}>
                    {stepFeedback[4].message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 05: ZIP FILE
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 5 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">05</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Customer ZIP Archive</h2>
                    <p className="bo-cv-step-panel-desc">
                      Download or inspect bundled documentation archive for this customer application.
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 05 of 15</span>
              </div>

              <div className="bo-cv-doc-display-container">
                {docPreviews.zip?.doc ? (
                  <div className="bo-cv-zip-card">
                    <div className="bo-cv-zip-header">
                      <div className="bo-cv-zip-icon-box">
                        {FileCheckIcon && <FileCheckIcon size={28} />}
                      </div>
                      <div className="bo-cv-zip-info">
                        <h4>{docPreviews.zip.doc.fileName || 'Customer_Documents_Bundle.zip'}</h4>
                        <span className="bo-cv-zip-type">Compressed ZIP Archive (.zip)</span>
                      </div>
                    </div>
                    <div className="bo-cv-zip-actions">
                      <button
                        type="button"
                        className="bo-btn bo-btn--primary"
                        onClick={async () => {
                          const docId = docPreviews.zip.doc.agentCustomerDocumentId || docPreviews.zip.doc.id;
                          if (docId) {
                            try {
                              const blobData = await backOfficeService.downloadCustomerDocument(docId);
                              const typedBlob = new Blob([blobData], { type: 'application/zip' });
                              const url = URL.createObjectURL(typedBlob);
                              handleDownloadFile(url, docPreviews.zip.doc.fileName || 'Customer_Documents.zip');
                              URL.revokeObjectURL(url);
                            } catch (e) {
                              console.error('Failed to download ZIP file:', e);
                            }
                          }
                        }}
                      >
                        {DownloadIcon && <DownloadIcon size={14} />}
                        <span>Download ZIP File</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bo-cv-empty-doc-card">
                    <div className="bo-cv-empty-doc-icon">
                      {FileCheckIcon && <FileCheckIcon size={36} />}
                    </div>
                    <h4>No ZIP File Available</h4>
                    <p>No compressed document bundle was uploaded for this customer application.</p>
                  </div>
                )}

                {/* Remarks & Reject / Send to RM */}
                <div className="verification-action-bar">
                  <div className="verification-remarks-field">
                    <label htmlFor="bo-cv-remarks-zip">VERIFICATION REMARKS</label>
                    <textarea
                      id="bo-cv-remarks-zip"
                      className="bo-cv-remarks-input"
                      rows={3}
                      placeholder="Enter remarks or discrepancy details for customer ZIP archive..."
                      value={stepRemarks[5] || ''}
                      onChange={(e) => {
                        setStepRemarks({ ...stepRemarks, 5: e.target.value });
                        if (stepFeedback[5]) setStepFeedback({ ...stepFeedback, 5: null });
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    className="reject-rm-btn"
                    onClick={() => handleRejectOrSendToRm(5, 'ZIP File')}
                  >
                    <span>Reject / Send to RM</span>
                  </button>
                </div>

                {stepFeedback[5] && (
                  <div className={`bo-cv-feedback-alert ${stepFeedback[5].type === 'error' ? 'is-error' : 'is-success'}`}>
                    {stepFeedback[5].message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 06: PROPERTY FI (PLACEHOLDER)
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 6 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">06</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Property FI</h2>
                    <p className="bo-cv-step-panel-desc">Property Field Investigation details and collateral valuation.</p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 06 of 15</span>
              </div>

              <div className="bo-cv-placeholder-panel">
                <div className="bo-cv-placeholder-icon">
                  {BuildingIcon && <BuildingIcon size={40} />}
                </div>
                <span className="bo-cv-placeholder-badge">PENDING IMPLEMENTATION</span>
                <h3>Property FI — implementation pending</h3>
                <p>Property field investigation module integration is scheduled for future underwriting release.</p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 07: OFFICE FI (PLACEHOLDER)
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 7 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">07</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Office FI</h2>
                    <p className="bo-cv-step-panel-desc">Workplace and business establishment field investigation.</p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 07 of 15</span>
              </div>

              <div className="bo-cv-placeholder-panel">
                <div className="bo-cv-placeholder-icon">
                  {BuildingIcon && <BuildingIcon size={40} />}
                </div>
                <span className="bo-cv-placeholder-badge">PENDING IMPLEMENTATION</span>
                <h3>Office FI — implementation pending</h3>
                <p>Office field investigation module integration is scheduled for future underwriting release.</p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 08: RESIDENCE FI (PLACEHOLDER)
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 8 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">08</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Residence FI</h2>
                    <p className="bo-cv-step-panel-desc">Physical residence field verification and neighbor check.</p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 08 of 15</span>
              </div>

              <div className="bo-cv-placeholder-panel">
                <div className="bo-cv-placeholder-icon">
                  {BuildingIcon && <BuildingIcon size={40} />}
                </div>
                <span className="bo-cv-placeholder-badge">PENDING IMPLEMENTATION</span>
                <h3>Residence FI — implementation pending</h3>
                <p>Residence field investigation module integration is scheduled for future underwriting release.</p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 09: LEGAL OPINION
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 9 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">09</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Legal Opinion</h2>
                    <p className="bo-cv-step-panel-desc">
                      Upload and review advocate title investigation report and legal opinion (Max: 150 MB).
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 09 of 15</span>
              </div>

              <div className="bo-cv-upload-container">
                {!legalOpinion.file ? (
                  <div className="bo-cv-dropzone-box">
                    <input
                      type="file"
                      id="bo-cv-legal-upload"
                      className="bo-cv-file-input"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, setLegalOpinion, 'Legal Opinion')}
                    />
                    <label htmlFor="bo-cv-legal-upload" className="bo-cv-dropzone-label">
                      <div className="bo-cv-dropzone-icon">
                        {FileTextIcon && <FileTextIcon size={32} />}
                      </div>
                      <strong className="bo-cv-dropzone-title">Upload Legal Opinion Document</strong>
                      <span className="bo-cv-dropzone-sub">
                        Drag and drop or browse file from your device &bull; Maximum file size 150 MB
                      </span>
                      <span className="bo-cv-dropzone-types">Supported formats: PDF, DOC, DOCX, JPG, PNG</span>
                    </label>
                  </div>
                ) : (
                  <div className="bo-cv-file-card">
                    <div className="bo-cv-file-card-info">
                      <div className="bo-cv-file-card-icon">
                        {FileCheckIcon && <FileCheckIcon size={26} />}
                      </div>
                      <div>
                        <h4 className="bo-cv-file-name">{legalOpinion.fileName}</h4>
                        <span className="bo-cv-file-size">File Size: {legalOpinion.fileSize}</span>
                      </div>
                    </div>
                    <div className="bo-cv-file-card-actions">
                      {legalOpinion.fileUrl && (
                        <>
                          <button
                            type="button"
                            className="bo-btn bo-btn--outline bo-btn--sm"
                            onClick={() => window.open(legalOpinion.fileUrl, '_blank')}
                          >
                            {ExternalLinkIcon && <ExternalLinkIcon size={13} />}
                            <span>View Preview</span>
                          </button>
                          <button
                            type="button"
                            className="bo-btn bo-btn--outline bo-btn--sm"
                            onClick={() => handleDownloadFile(legalOpinion.fileUrl, legalOpinion.fileName)}
                          >
                            {DownloadIcon && <DownloadIcon size={13} />}
                            <span>Download</span>
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="bo-btn bo-btn--outline-danger bo-btn--sm"
                        onClick={() => handleRemoveUploadedFile(legalOpinion, setLegalOpinion)}
                      >
                        {XIcon && <XIcon size={13} />}
                        <span>Remove / Replace</span>
                      </button>
                    </div>
                  </div>
                )}

                {legalOpinion.error && (
                  <div className="bo-cv-feedback-alert is-error">
                    {legalOpinion.error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 10: TECHNICAL VALUE
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 10 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">10</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Technical Value</h2>
                    <p className="bo-cv-step-panel-desc">
                      Upload and review certified engineer property valuation and technical report (Max: 150 MB).
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 10 of 15</span>
              </div>

              <div className="bo-cv-upload-container">
                {!technicalValue.file ? (
                  <div className="bo-cv-dropzone-box">
                    <input
                      type="file"
                      id="bo-cv-tech-upload"
                      className="bo-cv-file-input"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, setTechnicalValue, 'Technical Value')}
                    />
                    <label htmlFor="bo-cv-tech-upload" className="bo-cv-dropzone-label">
                      <div className="bo-cv-dropzone-icon">
                        {BuildingIcon && <BuildingIcon size={32} />}
                      </div>
                      <strong className="bo-cv-dropzone-title">Upload Technical Valuation Report</strong>
                      <span className="bo-cv-dropzone-sub">
                        Drag and drop or browse file from your device &bull; Maximum file size 150 MB
                      </span>
                      <span className="bo-cv-dropzone-types">Supported formats: PDF, DOC, DOCX, JPG, PNG</span>
                    </label>
                  </div>
                ) : (
                  <div className="bo-cv-file-card">
                    <div className="bo-cv-file-card-info">
                      <div className="bo-cv-file-card-icon">
                        {FileCheckIcon && <FileCheckIcon size={26} />}
                      </div>
                      <div>
                        <h4 className="bo-cv-file-name">{technicalValue.fileName}</h4>
                        <span className="bo-cv-file-size">File Size: {technicalValue.fileSize}</span>
                      </div>
                    </div>
                    <div className="bo-cv-file-card-actions">
                      {technicalValue.fileUrl && (
                        <>
                          <button
                            type="button"
                            className="bo-btn bo-btn--outline bo-btn--sm"
                            onClick={() => window.open(technicalValue.fileUrl, '_blank')}
                          >
                            {ExternalLinkIcon && <ExternalLinkIcon size={13} />}
                            <span>View Preview</span>
                          </button>
                          <button
                            type="button"
                            className="bo-btn bo-btn--outline bo-btn--sm"
                            onClick={() => handleDownloadFile(technicalValue.fileUrl, technicalValue.fileName)}
                          >
                            {DownloadIcon && <DownloadIcon size={13} />}
                            <span>Download</span>
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="bo-btn bo-btn--outline-danger bo-btn--sm"
                        onClick={() => handleRemoveUploadedFile(technicalValue, setTechnicalValue)}
                      >
                        {XIcon && <XIcon size={13} />}
                        <span>Remove / Replace</span>
                      </button>
                    </div>
                  </div>
                )}

                {technicalValue.error && (
                  <div className="bo-cv-feedback-alert is-error">
                    {technicalValue.error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 11: CIBIL CHECK
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 11 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">11</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Credit Bureau &amp; CIBIL Verification</h2>
                    <p className="bo-cv-step-panel-desc">
                      Direct bureau credit pull, CIR score breakdown, and manual PAN verification upload.
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 11 of 15</span>
              </div>

              {/* Manual CIBIL PAN Card Upload Reference Section */}
              <div className="bo-cv-manual-pan-section">
                <div className="bo-cv-manual-pan-header">
                  <div className="bo-cv-manual-pan-title-group">
                    <h3 className="bo-cv-manual-pan-title">Manual CIBIL PAN Card Upload</h3>
                    <p className="bo-cv-manual-pan-subtitle">
                      Upload an additional reference PAN document for manual CIBIL bureau verification. This does not alter the applicant's official KYC PAN.
                    </p>
                  </div>
                </div>

                {!manualCibilPan.file ? (
                  <div className="bo-cv-manual-pan-upload-row">
                    <input
                      type="file"
                      id="bo-cv-cibil-pan-file"
                      className="bo-cv-file-input"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, setManualCibilPan, 'Manual CIBIL PAN')}
                    />
                    <label htmlFor="bo-cv-cibil-pan-file" className="bo-cv-manual-pan-btn">
                      {FileTextIcon && <FileTextIcon size={14} />}
                      <span>Select Manual PAN File</span>
                    </label>
                    <span className="bo-cv-manual-pan-hint">No file selected (Optional reference upload)</span>
                  </div>
                ) : (
                  <div className="bo-cv-manual-pan-selected-card">
                    <div className="bo-cv-manual-pan-file-info">
                      {FileCheckIcon && <FileCheckIcon size={18} />}
                      <strong>{manualCibilPan.fileName}</strong>
                      <span>({manualCibilPan.fileSize})</span>
                    </div>
                    <button
                      type="button"
                      className="bo-btn bo-btn--outline-danger bo-btn--sm"
                      onClick={() => handleRemoveUploadedFile(manualCibilPan, setManualCibilPan)}
                    >
                      {XIcon && <XIcon size={12} />}
                      <span>Remove</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ── EXISTING WORKING CIBIL / CREDIT BUREAU LOGIC ── */}
              {/* STATE 1: IDLE PAN Verification Card */}
              {bureauState === 'idle' && (
                <div className="bo-cv-idle-section">
                  <div className="bo-cv-bureau-card">
                    <div className="bo-cv-card-header">
                      <div className="bo-cv-icon-wrap">
                        {ShieldCheckIcon && <ShieldCheckIcon size={22} />}
                      </div>
                      <div>
                        <h3 className="bo-cv-card-title">Credit Bureau Verification</h3>
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

              {/* STATE 2: LOADING SIMULATION */}
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

                    <div className="bo-cv-loading-summary">
                      <div>
                        <span className="bo-cv-loading-kicker">SECURE BUREAU CHECK</span>
                        <strong>{STAGES[loadingStage]?.label}</strong>
                      </div>
                      <span className="bo-cv-loading-count">{loadingStage + 1} of {STAGES.length}</span>
                    </div>

                    <div className="bo-cv-progress-bar-bg">
                      <div
                        className="bo-cv-progress-bar-fill"
                        style={{ width: `${((loadingStage + 1) / STAGES.length) * 100}%` }}
                      />
                    </div>

                    <div className="bo-cv-progress-caption">
                      <span>Verifying applicant credit profile</span>
                      <strong>{Math.round(((loadingStage + 1) / STAGES.length) * 100)}%</strong>
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

              {/* STATE 3: DASHBOARD SUCCESS */}
              {bureauState === 'success' && creditReport && (
                <div className="bo-cv-dashboard">
                  {/* 1. Score & Health Summary */}
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

                  {/* 2. KPI Cards */}
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

                  {/* 3. Active Loans Table */}
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

                  {/* 4. Closed Loans */}
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

                  {/* 5. Credit Cards */}
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

                  {/* 8. Underwriting Insight */}
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
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 12: PD VERIFICATION
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 12 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">12</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Personal Discussion (PD) Verification</h2>
                    <p className="bo-cv-step-panel-desc">
                      Configure and record personal discussion verification mode with the applicant.
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 12 of 15</span>
              </div>

              <div className="bo-cv-pd-container">
                <div className="bo-cv-pd-select-card">
                  <label htmlFor="bo-cv-pd-type-select" className="bo-cv-pd-select-label">
                    SELECT PD VERIFICATION MODE
                  </label>
                  <select
                    id="bo-cv-pd-type-select"
                    className="bo-cv-pd-dropdown"
                    value={pdCallType}
                    onChange={(e) => setPdCallType(e.target.value)}
                  >
                    <option value="Video Call">Video Call</option>
                    <option value="Tele Call">Tele Call</option>
                    <option value="Audio Call">Audio Call</option>
                  </select>
                </div>

                {/* PD Call Type Panels */}
                {pdCallType === 'Video Call' && (
                  <div className="bo-cv-pd-result-panel">
                    <div className="bo-cv-pd-result-header">
                      <div className="bo-cv-pd-mode-icon">
                        {PhoneIcon && <PhoneIcon size={24} />}
                      </div>
                      <div>
                        <h3>Video Call selected</h3>
                        <p>Face-to-face biometric and identity verification session for applicant #{verificationData.customerId}.</p>
                      </div>
                    </div>
                    <div className="bo-cv-pd-details-grid">
                      <div className="bo-cv-pd-detail-item">
                        <small>Applicant</small>
                        <strong>{verificationData.customerName}</strong>
                      </div>
                      <div className="bo-cv-pd-detail-item">
                        <small>Contact Mobile</small>
                        <strong>{verificationData.personalInformation?.mobile ? `+91 ${verificationData.personalInformation.mobile}` : 'Available'}</strong>
                      </div>
                      <div className="bo-cv-pd-detail-item">
                        <small>Session Type</small>
                        <span className="bo-cv-pill-verified">Live Video Interaction</span>
                      </div>
                      <div className="bo-cv-pd-detail-item">
                        <small>Verification Status</small>
                        <span className="bo-cv-pill-fetching">Ready for Underwriter Connection</span>
                      </div>
                    </div>
                  </div>
                )}

                {pdCallType === 'Tele Call' && (
                  <div className="bo-cv-pd-result-panel">
                    <div className="bo-cv-pd-result-header">
                      <div className="bo-cv-pd-mode-icon">
                        {PhoneIcon && <PhoneIcon size={24} />}
                      </div>
                      <div>
                        <h3>Tele Call selected</h3>
                        <p>Telephonic underwriting discussion and business profile inquiry.</p>
                      </div>
                    </div>
                    <div className="bo-cv-pd-details-grid">
                      <div className="bo-cv-pd-detail-item">
                        <small>Applicant</small>
                        <strong>{verificationData.customerName}</strong>
                      </div>
                      <div className="bo-cv-pd-detail-item">
                        <small>Contact Mobile</small>
                        <strong>{verificationData.personalInformation?.mobile ? `+91 ${verificationData.personalInformation.mobile}` : 'Available'}</strong>
                      </div>
                      <div className="bo-cv-pd-detail-item">
                        <small>Session Type</small>
                        <span className="bo-cv-pill-verified">Telephonic Inquiry</span>
                      </div>
                      <div className="bo-cv-pd-detail-item">
                        <small>Verification Status</small>
                        <span className="bo-cv-pill-fetching">Ready for Underwriter Call</span>
                      </div>
                    </div>
                  </div>
                )}

                {pdCallType === 'Audio Call' && (
                  <div className="bo-cv-pd-result-panel">
                    <div className="bo-cv-pd-result-header">
                      <div className="bo-cv-pd-mode-icon">
                        {PhoneIcon && <PhoneIcon size={24} />}
                      </div>
                      <div>
                        <h3>Audio Call selected</h3>
                        <p>VoIP audio conference verification and recorded declaration discussion.</p>
                      </div>
                    </div>
                    <div className="bo-cv-pd-details-grid">
                      <div className="bo-cv-pd-detail-item">
                        <small>Applicant</small>
                        <strong>{verificationData.customerName}</strong>
                      </div>
                      <div className="bo-cv-pd-detail-item">
                        <small>Contact Mobile</small>
                        <strong>{verificationData.personalInformation?.mobile ? `+91 ${verificationData.personalInformation.mobile}` : 'Available'}</strong>
                      </div>
                      <div className="bo-cv-pd-detail-item">
                        <small>Session Type</small>
                        <span className="bo-cv-pill-verified">Recorded Audio Bridge</span>
                      </div>
                      <div className="bo-cv-pd-detail-item">
                        <small>Verification Status</small>
                        <span className="bo-cv-pill-fetching">Ready for Underwriter Audio Bridge</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 13: ELIGIBILITY CALCULATION (FOIR)
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 13 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">13</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Eligibility Calculation (FOIR)</h2>
                    <p className="bo-cv-step-panel-desc">
                      Calculate Fixed Obligation to Income Ratio, determine loan eligibility, and sign off underwriting decision.
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 13 of 15</span>
              </div>

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
                      disabled={foirState === 'loading'}
                    >
                      {RefreshCwIcon && <RefreshCwIcon size={14} className={foirState === 'loading' ? 'bo-cv-spin' : ''} />}
                      <span>{foirState === 'loading' ? 'Calculating FOIR...' : 'Calculate FOIR'}</span>
                    </button>
                  </div>
                )}

                {foirState === 'loading' && (
                  <div className="bo-cv-foir-card bo-cv-foir-loading-card">
                    <div className="bo-cv-foir-processing-head">
                      <div className="bo-cv-foir-processing-orb"><span /></div>
                      <div>
                        <span className="bo-cv-foir-processing-kicker">LIVE ELIGIBILITY CHECK</span>
                        <h4 className="bo-cv-foir-title">Calculating FOIR<span className="bo-cv-running-dots" aria-hidden="true">...</span></h4>
                        <p className="bo-cv-foir-subtitle">Applicant #{verificationData?.customerId} · secure calculation in progress</p>
                      </div>
                    </div>
                    <div className="bo-cv-foir-processing-body">
                      <div className="bo-cv-foir-progress-track"><i style={{ width: `${((foirLoadingStage + 1) / FOIR_LOADING_STAGES.length) * 100}%` }} /></div>
                      <div className="bo-cv-foir-processing-meta"><strong>{FOIR_LOADING_STAGES[foirLoadingStage]}</strong><span>{Math.round(((foirLoadingStage + 1) / FOIR_LOADING_STAGES.length) * 100)}%</span></div>
                      <div className="bo-cv-foir-process-steps">
                        {FOIR_LOADING_STAGES.map((stage, index) => (
                          <span key={stage} className={index <= foirLoadingStage ? 'is-complete' : ''}><i>{index < foirLoadingStage ? '✓' : index === foirLoadingStage ? '•' : ''}</i>{stage}</span>
                        ))}
                      </div>
                    </div>
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
                        disabled={foirState === 'loading'}
                      >
                        {RefreshCwIcon && <RefreshCwIcon size={13} className={foirState === 'loading' ? 'bo-cv-spin' : ''} />}
                        <span>{foirState === 'loading' ? 'Calculating FOIR...' : 'Retry Calculation'}</span>
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
                        disabled={foirState === 'loading'}
                      >
                        {RefreshCwIcon && <RefreshCwIcon size={13} className={foirState === 'loading' ? 'bo-cv-spin' : ''} />}
                        <span>{foirState === 'loading' ? 'Calculating FOIR...' : 'Calculate Again'}</span>
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
                  const requestedLoanAmount = foirData.requestedLoanAmount ?? foirData.RequestedLoanAmount;
                  const proposedTenureMonths = foirData.proposedTenureMonths ?? foirData.ProposedTenureMonths ?? foirData.tenureMonths;
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
                          disabled={foirState === 'loading'}
                          title="Re-run FOIR calculation"
                        >
                          {RefreshCwIcon && <RefreshCwIcon size={13} className={foirState === 'loading' ? 'bo-cv-spin' : ''} />}
                          <span>{foirState === 'loading' ? 'Calculating FOIR...' : 'Re-calculate FOIR'}</span>
                        </button>
                      </div>

                      <div className="bo-cv-foir-result-strip">
                        <div className="bo-cv-foir-result-status">
                          <span className="bo-cv-foir-result-label">Decision snapshot</span>
                          <strong>{isEligible ? 'Applicant appears eligible' : 'Additional review recommended'}</strong>
                          <small>Based on the returned income and obligation values</small>
                        </div>
                        <div className="bo-cv-foir-result-actions">
                          <button
                            type="button"
                            className="bo-cv-foir-btn-approve"
                            onClick={() => handleOpenDecisionModal('approve')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="bo-cv-foir-btn-not-approve"
                            onClick={() => handleOpenDecisionModal('notApprove')}
                          >
                            Not Approve
                          </button>
                        </div>
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

                        {/* 6. Requested Loan Amount */}
                        <div className="bo-cv-foir-cell">
                          <span className="bo-cv-foir-cell-lbl">Requested Loan Amount</span>
                          <strong className="bo-cv-foir-cell-val">{formatFoirCurrency(requestedLoanAmount)}</strong>
                        </div>

                        {/* 7. Proposed Tenure (Months) */}
                        <div className="bo-cv-foir-cell">
                          <span className="bo-cv-foir-cell-lbl">Proposed Tenure (Months)</span>
                          <strong className="bo-cv-foir-cell-val">
                            {proposedTenureMonths !== undefined && proposedTenureMonths !== null && proposedTenureMonths !== '' ? `${proposedTenureMonths} Months` : '—'}
                          </strong>
                        </div>

                        {/* 8. Status */}
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
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 14: ELIGIBILITY FIT
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 14 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">14</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Eligibility Fit</h2>
                    <p className="bo-cv-step-panel-desc">
                      Assign underwriting classification and sanction suitability decision.
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 14 of 15</span>
              </div>

              <div className="bo-cv-fit-container">
                <div className="bo-cv-fit-select-card">
                  <label htmlFor="bo-cv-fit-select" className="bo-cv-fit-select-label">
                    SELECT ELIGIBILITY FIT STATUS
                  </label>
                  <select
                    id="bo-cv-fit-select"
                    className="bo-cv-fit-dropdown"
                    value={eligibilityFit}
                    onChange={(e) => setEligibilityFit(e.target.value)}
                  >
                    <option value="Fit">Fit</option>
                    <option value="Conditional Fit">Conditional Fit</option>
                    <option value="Not Fit">Not Fit</option>
                  </select>
                </div>

                <div className={`bo-cv-fit-result-card is-${eligibilityFit.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="bo-cv-fit-result-head">
                    <span className="bo-cv-fit-badge">{eligibilityFit}</span>
                    <h3>Application Underwriting Fit: {eligibilityFit}</h3>
                  </div>
                  <p className="bo-cv-fit-desc">
                    {eligibilityFit === 'Fit' &&
                      'Applicant satisfies all standard underwriting metrics, income obligations, and bureau vintage guidelines for immediate approval.'}
                    {eligibilityFit === 'Conditional Fit' &&
                      'Applicant conditionally satisfies underwriting criteria subject to additional co-applicant documentation, collateral security, or special risk committee sign-off.'}
                    {eligibilityFit === 'Not Fit' &&
                      'Applicant does not meet minimum underwriting credit thresholds or debt servicing capacity under current lending guidelines.'}
                  </p>
                  <div className="bo-cv-fit-meta-note">
                    <span>* Frontend underwriting fit selection (Non-persisted demo status)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 15: RECOMMENDATION SHEET (PLACEHOLDER)
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 15 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">15</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Recommendation Sheet</h2>
                    <p className="bo-cv-step-panel-desc">
                      Final underwriting credit appraisal and sanction committee recommendation summary.
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 15 of 15</span>
              </div>

              <div className="bo-cv-placeholder-panel">
                <div className="bo-cv-placeholder-icon">
                  {FileTextIcon && <FileTextIcon size={40} />}
                </div>
                <span className="bo-cv-placeholder-badge">PENDING IMPLEMENTATION</span>
                <h3>Recommendation Sheet — implementation pending</h3>
                <p>Final credit recommendation and sanction summary export will be integrated here.</p>
              </div>
            </div>
          )}

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

      {/* ── FOIR Decision Remarks Modal (Approve / Not Approve) ── */}
      {decisionModalOpen && (
        <div
          className="bo-cv-decision-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bo-cv-decision-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseDecisionModal();
            }
          }}
        >
          <div className="bo-cv-decision-modal-card">
            <div className="bo-cv-decision-modal-header">
              <div className="bo-cv-decision-modal-title-group">
                <h3 id="bo-cv-decision-modal-title" className="bo-cv-decision-modal-title">
                  {decisionType === 'approve' ? 'Approve FOIR' : 'Not Approve FOIR'}
                </h3>
                <p className="bo-cv-decision-modal-subtitle">
                  Add remarks before confirming this decision.
                </p>
              </div>
              <button
                type="button"
                className="bo-cv-decision-modal-close"
                onClick={handleCloseDecisionModal}
                aria-label="Close modal"
              >
                {XIcon ? <XIcon size={16} /> : <span>×</span>}
              </button>
            </div>

            <div className="bo-cv-decision-modal-body">
              <label htmlFor="bo-cv-decision-remarks" className="bo-cv-decision-label">
                REMARKS
              </label>
              <textarea
                id="bo-cv-decision-remarks"
                className={`bo-cv-decision-textarea ${decisionError ? 'has-error' : ''}`}
                rows={4}
                value={decisionRemarks}
                onChange={(e) => {
                  setDecisionRemarks(e.target.value);
                  if (decisionError && e.target.value.trim()) {
                    setDecisionError('');
                  }
                }}
                placeholder={
                  decisionType === 'approve'
                    ? 'Enter approval remarks...'
                    : 'Enter reason / remarks...'
                }
                autoFocus
              />
              {decisionError && (
                <span className="bo-cv-decision-error-msg">{decisionError}</span>
              )}
            </div>

            <div className="bo-cv-decision-modal-footer">
              <button
                type="button"
                className="bo-cv-decision-btn-cancel"
                onClick={handleCloseDecisionModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className={
                  decisionType === 'approve'
                    ? 'bo-cv-decision-btn-confirm-approve'
                    : 'bo-cv-decision-btn-confirm-reject'
                }
                onClick={handleConfirmDecision}
              >
                {decisionType === 'approve' ? 'Confirm Approve' : 'Confirm Not Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
