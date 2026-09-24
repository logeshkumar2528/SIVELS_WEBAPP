/**
 * CustomerVerification.jsx
 * --------------------
 * Dedicated Full-Screen Customer Verification Workspace for the Back Office module.
 *
 * Route: /backoffice/customers/:customerId/verify
 *
 * Architecture:
 * - 11-Step Underwriting Verification Workflow (Sidebar: 01–11).
 * - Step 01: View Form (Direct embedded PdfView with ApplicationDraftProvider).
 * - Step 02: Document Verification (Applicant & Co-Applicant KYC documents).
 * - Step 03: Property FI (Field Investigation placeholder).
 * - Step 04: Office FI (Office Investigation placeholder).
 * - Step 05: Residence FI (Residence Investigation placeholder).
 * - Step 06: Legal Opinion (File upload dropzone with <= 150 MB validation, View, Download, Remove).
 * - Step 07: Technical Value (File upload dropzone with <= 150 MB validation, View, Download, Remove).
 * - Step 08: CIBIL Check (Preserved Credit Bureau verification simulation + Manual CIBIL PAN Upload).
 * - Step 09: PD Verification (Personal Discussion mode selector from dynamic PDVerificationTypeMaster).
 * - Step 10: Eligibility Assessment (Methodology & multi-applicant credit assessment engine).
 * - Step 11: Recommendation Sheet (Credit underwriter recommendation placeholder).
 * - Single-fetch shared data and VerificationStepModal are preserved in code for easy inspection.
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import { ROUTES } from '../../config/routeConfig';
import { VERIFICATION_STEP_DEFINITIONS } from '../../config/verificationSteps';
import { useVerificationWorkspace } from '../../hooks/useVerificationWorkspace';
import backOfficeService from '../../api/backOfficeService';
import { getBackOfficeAuth } from '../../auth/authStorage';
import VerificationStepModal from '../../components/Verification/VerificationStepModal';
import PdfView from '../../../../../rm_modules/src/pages/PdfView/PdfView';
import { ApplicationDraftProvider } from '../../../../../rm_modules/src/state/ApplicationDraftContext';
import { resolveDocumentTypeId, validateApplicantDocumentFile, getDocumentApplicability } from '../../../../../../Core/src/utils/documentTypeHelper';
import './CustomerVerification.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

const ArrowLeftIcon = iconMap['ArrowLeft'];
const ArrowRightIcon = iconMap['ArrowRight'];
const CheckCircleIcon = iconMap['CheckCircle'] || iconMap['CheckCircle2'];
const ShieldCheckIcon = iconMap['ShieldCheck'];
const AlertTriangleIcon = iconMap['AlertTriangle'];
const AlertCircleIcon = iconMap['AlertCircle'];
const InfoIcon = iconMap['Info'];
const BuildingIcon = iconMap['Building2'] || iconMap['Landmark'];
const LandmarkIcon = iconMap['Landmark'];
const UserIcon = iconMap['User'];
const UsersIcon = iconMap['Users'];
const PlusIcon = iconMap['Plus'] || iconMap['FilePlus'];
const XIcon = iconMap['X'];
const RefreshCwIcon = iconMap['RefreshCw'];
const SaveIcon = iconMap['Save'];
const BadgeIndianRupeeIcon = iconMap['BadgeIndianRupee'];
const EyeIcon = iconMap['Eye'];
const DownloadIcon = iconMap['Download'];
const FileTextIcon = iconMap['FileText'];
const ChevronLeftIcon = iconMap['ChevronLeft'];
const ChevronRightIcon = iconMap['ChevronRight'];
const SendIcon = iconMap['Send'];
const PhoneIcon = iconMap['Phone'];
const CameraIcon = iconMap['Camera'];
const FileCheckIcon = iconMap['FileCheck'];
const RotateCcwIcon = iconMap['RotateCcw'];
const CreditCardIcon = iconMap['CreditCard'];
const TrendingUpIcon = iconMap['TrendingUp'] || iconMap['BadgeIndianRupee'] || iconMap['FileText'];
const BarChartIcon = iconMap['BarChart3'] || iconMap['BarChart2'] || iconMap['BadgeIndianRupee'];
const CalculatorIcon = iconMap['Calculator'] || iconMap['BadgeIndianRupee'];
const ExpandIcon = iconMap['Expand'] || iconMap['ExternalLink'];
const ZapIcon = iconMap['Zap'];

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

function formatUploadDate(dateVal) {
  if (!dateVal) return null;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

function isDocImage(doc) {
  if (!doc || !doc.url) return false;
  if (doc.isImage === true) return true;
  if (doc.isPdf === true) return false;
  if (doc.mimeType?.startsWith('image/')) return true;
  if (doc.mimeType === 'application/pdf') return false;
  const name = String(doc.fileName || doc.path || doc.url || '').toLowerCase();
  if (/\.pdf$/i.test(name)) return false;
  if (/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(name)) return true;
  return true;
}

function isDocPdf(doc) {
  if (!doc || !doc.url) return false;
  if (doc.isPdf === true) return true;
  if (doc.mimeType === 'application/pdf') return true;
  const name = String(doc.fileName || doc.path || doc.url || '').toLowerCase();
  return /\.pdf$/i.test(name);
}

function isDocZip(doc) {
  if (!doc) return false;
  if (doc.isZip === true) return true;
  const name = String(doc.fileName || doc.path || doc.url || '').toLowerCase();
  return /\.(zip|rar|7z)$/i.test(name);
}

function isApplicantDocumentTuple(row) {
  if (!row) return false;
  if (['aadharDocumentPath', 'AadharDocumentPath', 'panCardPath', 'PanCardPath',
    'profileImagePath', 'ProfileImagePath', 'aadhaarLastFourDigits', 'AadhaarLastFourDigits',
    'panCardNo', 'PANCardNo', 'documentNumber', 'DocumentNumber'].some((field) => row[field])) return false;
  return ['documentStatus', 'DocumentStatus', 'originalFileName', 'OriginalFileName',
    'contentType', 'ContentType'].some((field) => String(row[field] || '').trim());
}

const STAGES = [
  { id: 0, label: 'Checking PAN details & Tax identification records...' },
  { id: 1, label: 'Connecting to Credit Bureau (TransUnion CIBIL / Experian)...' },
  { id: 2, label: 'Fetching credit history & active loan facilities...' },
  { id: 3, label: 'Analyzing repayment records & credit score rating...' },
  { id: 4, label: 'Credit Bureau Report Successfully Retrieved' },
];

/**
 * Supported Step Verification Codes for BackOfficeStepVerification API
 */
const SUPPORTED_STEP_CODES = [
  'PROFILE_IMAGE',
  'AADHAAR',
  'PAN',
  'SALARY_SLIP',
  'BANK_STATEMENT',
  'ZIP_ARCHIVE',
];

const DOCUMENT_STEP_CODES = [
  'PROFILE_IMAGE',
  'AADHAAR',
  'PAN',
  'SALARY_SLIP',
  'BANK_STATEMENT',
  'ZIP_ARCHIVE',
];

function stepCodeToStepNum(code) {
  switch (code) {
    case 'PROFILE_IMAGE': return 2;
    case 'AADHAAR': return 3;
    case 'PAN': return 4;
    case 'SALARY_SLIP': return 5;
    case 'BANK_STATEMENT': return 6;
    case 'ZIP_ARCHIVE': return 7;
    default: return null;
  }
}

function stepNumToStepCode(num) {
  switch (Number(num)) {
    case 2: return 'PROFILE_IMAGE';
    case 3: return 'AADHAAR';
    case 4: return 'PAN';
    case 5: return 'SALARY_SLIP';
    case 6: return 'BANK_STATEMENT';
    case 7: return 'ZIP_ARCHIVE';
    default: return null;
  }
}

const createEmptyStepVerifications = () => ({
  PROFILE_IMAGE: { isVerified: false, remarks: '', verifiedAt: null, verifiedByBackOfficeId: null },
  AADHAAR: { isVerified: false, remarks: '', verifiedAt: null, verifiedByBackOfficeId: null },
  PAN: { isVerified: false, remarks: '', verifiedAt: null, verifiedByBackOfficeId: null },
  SALARY_SLIP: { isVerified: false, remarks: '', verifiedAt: null, verifiedByBackOfficeId: null },
  BANK_STATEMENT: { isVerified: false, remarks: '', verifiedAt: null, verifiedByBackOfficeId: null },
  ZIP_ARCHIVE: { isVerified: false, remarks: '', verifiedAt: null, verifiedByBackOfficeId: null },
});

const INITIAL_STEP_VERIFICATIONS = {
  0: createEmptyStepVerifications(),
};

/**
 * 11-Step Underwriting Verification Workflow Step Definitions with Sidebar Groups
 */
const VERIFICATION_WORKFLOW_STEPS = [
  { id: 1, number: 1, visibleNum: '01', title: 'View Form', subtitle: 'Application form', group: 'FORM REVIEW' },
  { id: 2, number: 2, visibleNum: '02', title: 'Document Verification', subtitle: 'Applicant & Co-Applicant docs', group: 'DOCUMENT VERIFICATION', stepCodes: ['PROFILE_IMAGE', 'AADHAAR', 'PAN', 'SALARY_SLIP', 'BANK_STATEMENT', 'ZIP_ARCHIVE'] },
  { id: 8, number: 8, visibleNum: '03', title: 'Property FI', subtitle: 'Property investigation', group: 'FIELD INVESTIGATION' },
  { id: 9, number: 9, visibleNum: '04', title: 'Office FI', subtitle: 'Office verification', group: 'FIELD INVESTIGATION' },
  { id: 10, number: 10, visibleNum: '05', title: 'Residence FI', subtitle: 'Residence verification', group: 'FIELD INVESTIGATION' },
  { id: 11, number: 11, visibleNum: '06', title: 'Legal Opinion', subtitle: 'Legal report upload', group: 'CREDIT & ASSESSMENT' },
  { id: 12, number: 12, visibleNum: '07', title: 'Technical Value', subtitle: 'Valuation report upload', group: 'CREDIT & ASSESSMENT' },
  { id: 13, number: 13, visibleNum: '08', title: 'CIBIL Check', subtitle: 'Credit Bureau & PAN', group: 'CREDIT & ASSESSMENT' },
  { id: 14, number: 14, visibleNum: '09', title: 'PD Verification', subtitle: 'Personal discussion', group: 'CREDIT & ASSESSMENT' },
  { id: 16, number: 16, visibleNum: '10', title: 'Eligibility Assessment', subtitle: 'Method & applicant assessment', group: 'CREDIT & ASSESSMENT' },
  { id: 17, number: 17, visibleNum: '11', title: 'Recommendation Sheet', subtitle: 'Credit recommendation', group: 'CREDIT & ASSESSMENT' },
];

/**
 * Visible Step (1–11) to Internal Step ID Mapping
 */
const VISIBLE_TO_INTERNAL_STEP = {
  1: 1,
  2: 2,
  3: 8,
  4: 9,
  5: 10,
  6: 11,
  7: 12,
  8: 13,
  9: 14,
  10: 16,
  11: 17,
};

/**
 * Internal Step ID to Visible Step (1–11) Mapping
 */
const INTERNAL_TO_VISIBLE_STEP = {
  1: 1,
  2: 2,
  3: 2,
  4: 2,
  5: 2,
  6: 2,
  7: 2,
  8: 3,
  9: 4,
  10: 5,
  11: 6,
  12: 7,
  13: 8,
  14: 9,
  16: 10,
  17: 11,
};

function resolveInternalStepFromQuery(stepParam) {
  if (stepParam == null || stepParam === '') return 1;
  const parsed = Number(stepParam);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 11) {
    return 1;
  }
  return VISIBLE_TO_INTERNAL_STEP[parsed] ?? 1;
}

function resolveVisibleStepFromInternal(internalStep) {
  return INTERNAL_TO_VISIBLE_STEP[internalStep] ?? 1;
}

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
/**
 * Resolves document row status following strict underwriting priority:
 * 1. Not Required (isNotRequired is true)
 * 2. Returned to RM (rejection status === 'ReturnedToRM')
 * 3. Resubmitted (rejection status === 'Resubmitted')
 * 4. Not Uploaded (!hasFile, or Optional if isOptional)
 * 5. Verified (isVerified is true)
 * 6. Not Verified (otherwise for uploaded document)
 */
function resolveRowStatus({ rejection, hasFile, isVerified, isNotRequired, isOptional }) {
  if (isNotRequired) {
    return 'Not Required';
  }
  const rejStatus = String(rejection?.status || '').trim();
  if (
    rejStatus === 'ReturnedToRM' ||
    rejStatus.toLowerCase() === 'returnedtorm' ||
    rejStatus.toLowerCase() === 'returned'
  ) {
    return 'Returned to RM';
  }
  if (rejStatus === 'Resubmitted' || rejStatus.toLowerCase() === 'resubmitted') {
    return 'Resubmitted';
  }
  if (!hasFile) {
    return isOptional ? 'Optional' : 'Not Uploaded';
  }
  if (isVerified) {
    return 'Verified';
  }
  return 'Not Verified';
}

const getRejectionSortTime = (r) => {
  const vTime = new Date(r?.verifiedAt || r?.VerifiedAt || 0).getTime();
  if (vTime > 0) return vTime;
  const resTime = new Date(r?.resubmittedAt || r?.ResubmittedAt || 0).getTime();
  if (resTime > 0) return resTime;
  const rejTime = new Date(r?.rejectedAt || r?.RejectedAt || 0).getTime();
  if (rejTime > 0) return rejTime;
  const cTime = new Date(r?.createdAt || r?.CreatedAt || 0).getTime();
  return cTime > 0 ? cTime : 0;
};

const sortRejectionsByLatest = (a, b) => {
  const timeA = getRejectionSortTime(a);
  const timeB = getRejectionSortTime(b);
  if (timeA !== timeB) return timeB - timeA;
  const idA = Number(a?.backOfficeDocumentRejectionId ?? a?.BackOfficeDocumentRejectionId ?? a?.id ?? 0);
  const idB = Number(b?.backOfficeDocumentRejectionId ?? b?.BackOfficeDocumentRejectionId ?? b?.id ?? 0);
  return idB - idA;
};

const findLatestRejectionForManualSlot = ({
  rejections = [],
  appProdId = null,
  applicantSequence = 0,
  kycDocumentId = null,
  manualDocumentIndex = 0,
}) => {
  if (!Array.isArray(rejections) || rejections.length === 0) return null;
  const targetSeq = Number(applicantSequence || 0);
  const targetIdx = Number(manualDocumentIndex);

  const matching = rejections.filter((r) => {
    if (!r || r.isActive === false || r.IsActive === false) return false;

    // 1. ApplicantSequence match
    const rSeq =
      r.applicantSequence !== undefined && r.applicantSequence !== null
        ? Number(r.applicantSequence)
        : (r.ApplicantSequence !== undefined && r.ApplicantSequence !== null ? Number(r.ApplicantSequence) : 0);
    if (rSeq !== targetSeq) return false;

    // 2. ApplicationProductDetailsId match (if present on rejection and target)
    const rAppProdId = r.applicationProductDetailsId ?? r.ApplicationProductDetailsId;
    if (appProdId && rAppProdId && Number(appProdId) !== Number(rAppProdId)) return false;

    // 3. KYCDocumentId match (if present on rejection and target)
    const rKycId = r.kycDocumentId ?? r.KYCDocumentId;
    if (kycDocumentId && rKycId && Number(kycDocumentId) !== Number(rKycId)) return false;

    // 4. ManualDocumentIndex match
    const rIdx =
      r.manualDocumentIndex !== undefined && r.manualDocumentIndex !== null
        ? Number(r.manualDocumentIndex)
        : (r.ManualDocumentIndex !== undefined && r.ManualDocumentIndex !== null ? Number(r.ManualDocumentIndex) : null);
    if (rIdx === null || isNaN(rIdx) || rIdx !== targetIdx) return false;

    // 5. Category/Type validation
    const rType = String(r.rejectedDocumentType || r.RejectedDocumentType || '').toUpperCase().trim();
    if (rType && !(rType.includes('ZIP') || rType.includes('ARCHIVE') || rType.includes('MANUAL'))) {
      return false;
    }

    return true;
  });

  if (matching.length === 0) return null;
  matching.sort(sortRejectionsByLatest);
  return matching[0];
};

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
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Fetch Real Application from Backend via Phase 1/3 Hook
  const { verificationData, loading, error, refetch } = useVerificationWorkspace(customerId);

  // 2. Active 15-Step Workflow State (Initialized from URL ?step= query parameter)
  const [activeStep, setActiveStep] = useState(() => resolveInternalStepFromQuery(searchParams.get('step')));
  const [viewFormRefreshKey, setViewFormRefreshKey] = useState(0);

  // Sync activeStep when searchParams changes (e.g. browser Back/Forward or direct URL change)
  useEffect(() => {
    const stepParam = searchParams.get('step');
    const targetInternal = resolveInternalStepFromQuery(stepParam);
    const targetVisible = resolveVisibleStepFromInternal(targetInternal);

    setActiveStep((currentInternal) => {
      const currentVisible = resolveVisibleStepFromInternal(currentInternal);
      if (currentVisible !== targetVisible) {
        return targetInternal;
      }
      return currentInternal;
    });
  }, [searchParams]);

  // Navigate to internal step and push to browser history (?step={visibleStep})
  const navigateToStep = useCallback((internalStepNum) => {
    const visibleStep = resolveVisibleStepFromInternal(internalStepNum);
    setActiveStep(internalStepNum);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (next.get('step') === String(visibleStep)) {
        return prev;
      }
      next.set('step', String(visibleStep));
      return next;
    }, { replace: false });
  }, [setSearchParams]);

  // 3. Preserved Legacy 8-Step Modal State (View-only inspection)
  const [selectedStepNumber, setSelectedStepNumber] = useState(null);

  // 4. Document Previews Cache & Blob Management
  const [docPreviews, setDocPreviews] = useState({});
  const [coDocPreviews, setCoDocPreviews] = useState({});
  const blobUrlsRef = useRef([]);
  const previewCacheRef = useRef(new Map());

  // Supplementary server tables if not fully populated in ApplicationFullDetails
  const [kycRecordsList, setKycRecordsList] = useState([]);
  const [personalInfoList, setPersonalInfoList] = useState([]);
  const [docTypesList, setDocTypesList] = useState([]);
  const [docTypeMasterMap, setDocTypeMasterMap] = useState({});
  const [allCustomerDocs, setAllCustomerDocs] = useState([]);
  const [isCustomerDocsLoading, setIsCustomerDocsLoading] = useState(true);
  const [isSupplementaryKycLoading, setIsSupplementaryKycLoading] = useState(true);
  const previewFetchGenRef = useRef(0);
  const financialFetchGenRef = useRef(0);

  // Dynamically resolved DocumentTypeMaster IDs for KYC and Financial documents
  const profileDocTypeId = useMemo(() => resolveDocumentTypeId(docTypesList, 'Profile') || resolveDocumentTypeId(docTypesList, 'Photo') || resolveDocumentTypeId(docTypesList, 'Profile Photo'), [docTypesList]);
  const aadhaarDocTypeId = useMemo(() => resolveDocumentTypeId(docTypesList, 'Aadhaar') || resolveDocumentTypeId(docTypesList, 'Aadhar') || resolveDocumentTypeId(docTypesList, 'Aadhaar Card'), [docTypesList]);
  const panDocTypeId = useMemo(() => resolveDocumentTypeId(docTypesList, 'PAN') || resolveDocumentTypeId(docTypesList, 'PAN Card'), [docTypesList]);
  const salarySlipDocTypeId = useMemo(() => resolveDocumentTypeId(docTypesList, 'Salary Slip'), [docTypesList]);
  const bankStatementDocTypeId = useMemo(() => resolveDocumentTypeId(docTypesList, 'Bank Statement'), [docTypesList]);
  const zipArchiveDocTypeId = useMemo(() => resolveDocumentTypeId(docTypesList, 'zip') || resolveDocumentTypeId(docTypesList, 'zip_archive') || resolveDocumentTypeId(docTypesList, 'archive') || resolveDocumentTypeId(docTypesList, 'education certificate') || resolveDocumentTypeId(docTypesList, 'other'), [docTypesList]);

  // Persisted applicant and co-applicants financial documents (Salary Slip, Bank Statement)
  const [applicantFinancialDocs, setApplicantFinancialDocs] = useState({
    salarySlip: { loading: true, data: null, preview: null, comparison: null, rejection: null, error: null },
    bankStatement: { loading: true, data: null, preview: null, comparison: null, rejection: null, error: null },
  });
  const [coApplicantsFinancialDocs, setCoApplicantsFinancialDocs] = useState({});

  const [employmentTypeDocMappings, setEmploymentTypeDocMappings] = useState([]);

  // Fetch DocumentTypeMaster and EmploymentTypeDocumentMapping on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchMasterData() {
      try {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const [resDoc, resMap] = await Promise.all([
          fetch(`${API_BASE}/DocumentTypeMaster`, { headers }),
          fetch(`${API_BASE}/EmploymentTypeDocumentMapping`, { headers }),
        ]);

        if (resDoc.ok && isMounted) {
          const data = await resDoc.json();
          const list = Array.isArray(data) ? data : (data?.value || data?.data || []);
          setDocTypesList(list);
          const map = {};
          list.forEach((m) => {
            const id = m.documentTypeId || m.DocumentTypeId;
            if (id) {
              map[id] = m;
              map[String(id)] = m;
            }
          });
          setDocTypeMasterMap(map);
        }

        if (resMap.ok && isMounted) {
          const mapData = await resMap.json();
          const mapList = Array.isArray(mapData) ? mapData : (mapData?.value || mapData?.data || []);
          setEmploymentTypeDocMappings(mapList);
        }
      } catch (e) {
        console.warn('Could not fetch master document mappings:', e);
      }
    }
    fetchMasterData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch full customer documents list from server to capture complete version history
  const fetchAllCustomerDocs = useCallback(async () => {
    const rawCustomer = verificationData?.raw?.customer || verificationData?.customer || {};
    const rawCust = Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer;
    const targetCustomerId =
      verificationData?.customerId ||
      rawCust?.agentCustomerId ||
      rawCust?.AgentCustomerId ||
      customerId;

    if (!targetCustomerId) {
      setIsCustomerDocsLoading(false);
      return;
    }
    setIsCustomerDocsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/AgentCustomerDocument/bycustomer/${targetCustomerId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.value || data?.data || data?.items || []);
        setAllCustomerDocs(list.filter((d) => d.isActive !== false));
      }
    } catch (e) {
      console.warn('Could not fetch all customer documents:', e);
    } finally {
      setIsCustomerDocsLoading(false);
    }
  }, [customerId, verificationData?.customerId]);

  useEffect(() => {
    fetchAllCustomerDocs();
  }, [fetchAllCustomerDocs]);

  // Supplementary fetch for KYC and Personal Info to ensure complete Co-Applicant records
  useEffect(() => {
    const rawCustomer = verificationData?.raw?.customer || verificationData?.customer || {};
    const rawCust = Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer;
    const targetCustomerId =
      verificationData?.customerId ||
      rawCust?.agentCustomerId ||
      rawCust?.AgentCustomerId ||
      customerId;

    if (!targetCustomerId) {
      setIsSupplementaryKycLoading(false);
      return;
    }

    let isMounted = true;
    setIsSupplementaryKycLoading(true);
    async function fetchSupplementaryData() {
      const token = localStorage.getItem('authToken');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        const kycRes = await fetch(`${API_BASE}/ApplicationKYCDocuments`, { headers });
        if (kycRes.ok && isMounted) {
          const allKyc = await kycRes.json();
          const kycArr = Array.isArray(allKyc) ? allKyc : (allKyc?.value || allKyc?.data || []);
          const targetAppProdId = Number(
            verificationData?.applicationProductDetailsId ||
            verificationData?.application?.product?.applicationProductDetailsId ||
            verificationData?.application?.product?.ApplicationProductDetailsId ||
            verificationData?.application?.applicationProductDetailsId ||
            verificationData?.application?.ApplicationProductDetailsId ||
            verificationData?.raw?.productDetails?.product?.applicationProductDetailsId ||
            verificationData?.raw?.productDetails?.product?.ApplicationProductDetailsId ||
            verificationData?.raw?.productDetailsList?.product?.applicationProductDetailsId ||
            verificationData?.raw?.productDetailsList?.product?.ApplicationProductDetailsId ||
            verificationData?.raw?.productDetails?.[0]?.product?.applicationProductDetailsId ||
            verificationData?.raw?.productDetails?.[0]?.product?.ApplicationProductDetailsId ||
            verificationData?.raw?.productDetails?.[0]?.applicationProductDetailsId ||
            verificationData?.raw?.productDetails?.applicationProductDetailsId ||
            verificationData?.raw?.productDetailsList?.[0]?.applicationProductDetailsId ||
            verificationData?.raw?.applicationProductDetails?.applicationProductDetailsId ||
            0
          );
          const filteredKyc = kycArr
            .filter((k) => {
              const kProdId = Number(k.applicationProductDetailsId ?? k.ApplicationProductDetailsId);
              if (targetAppProdId > 0 && kProdId > 0) {
                return kProdId === targetAppProdId;
              }
              const kCustId = k.agentCustomerId ?? k.AgentCustomerId;
              if (kCustId !== undefined && kCustId !== null) {
                return String(kCustId) === String(targetCustomerId);
              }
              return false;
            })
            .sort((a, b) => (a.applicationKYCDocumentId || 0) - (b.applicationKYCDocumentId || 0));
          if (filteredKyc.length > 0) {
            setKycRecordsList(filteredKyc);
          }
        }
      } catch (e) {
        console.warn('Could not fetch supplementary KYC records:', e);
      }

      try {
        const persRes = await fetch(`${API_BASE}/ApplicationPersonalInformation`, { headers });
        if (persRes.ok && isMounted) {
          const allPers = await persRes.json();
          const persArr = Array.isArray(allPers) ? allPers : (allPers?.value || allPers?.data || []);
          const filteredPers = persArr
            .filter((p) => String(p.agentCustomerId ?? p.AgentCustomerId) === String(targetCustomerId))
            .sort((a, b) => (a.personalInformationId || 0) - (b.personalInformationId || 0));
          if (filteredPers.length > 0) {
            setPersonalInfoList(filteredPers);
          }
        }
      } catch (e) {
        console.warn('Could not fetch supplementary personal info:', e);
      }
    }

    fetchSupplementaryData().finally(() => {
      if (isMounted) setIsSupplementaryKycLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [customerId, verificationData?.customerId, verificationData?.application, verificationData?.raw?.productDetails]);

  // Merge full KYC & Personal lists
  const resolvedKycList = useMemo(() => {
    const rawKyc =
      verificationData?.raw?.kycDocuments ||
      verificationData?.raw?.KycDocuments ||
      verificationData?.raw?.applicationKYCDocuments ||
      verificationData?.raw?.ApplicationKYCDocuments ||
      verificationData?.kycDocuments?.raw ||
      [];
    const list = Array.isArray(rawKyc) ? rawKyc : (rawKyc ? [rawKyc] : []);
    if (list.length >= kycRecordsList.length && list.length > 0) return list;
    return kycRecordsList.length > 0 ? kycRecordsList : list;
  }, [verificationData, kycRecordsList]);

  const resolvedPersonalList = useMemo(() => {
    const rawPersonal =
      verificationData?.raw?.personalInformation ||
      verificationData?.raw?.PersonalInformation ||
      [];
    const list = Array.isArray(rawPersonal) ? rawPersonal : (rawPersonal ? [rawPersonal] : []);
    if (list.length >= personalInfoList.length && list.length > 0) return list;
    return personalInfoList.length > 0 ? personalInfoList : list;
  }, [verificationData, personalInfoList]);

  // ── Authoritative Main Applicant KYC row (live backend data only) ────────────
  // Identified the same way RM targets it: applicationProductDetailsId of THIS
  // application + applicantSequence === 0 + active. Positional index 0 of a
  // customer-wide list is not used, because it is not guaranteed to be the
  // sequence-0 row of this application - which is how RM and Back Office could
  // end up reading and writing different rows.
  const mainApplicantKyc = useMemo(() => {
    const appProdId = Number(
      verificationData?.applicationProductDetailsId ||
      verificationData?.application?.product?.applicationProductDetailsId ||
      verificationData?.application?.product?.ApplicationProductDetailsId ||
      verificationData?.application?.applicationProductDetailsId ||
      verificationData?.application?.ApplicationProductDetailsId ||
      verificationData?.raw?.productDetails?.product?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.product?.ApplicationProductDetailsId ||
      verificationData?.raw?.productDetailsList?.product?.applicationProductDetailsId ||
      verificationData?.raw?.productDetailsList?.product?.ApplicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.product?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.product?.ApplicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.applicationProductDetailsId ||
      verificationData?.raw?.productDetailsList?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.applicationProductDetails?.applicationProductDetailsId ||
      0
    );

    if (!appProdId) {
      return { row: null, id: null, rows: [], ambiguous: false, appProdId: 0 };
    }

    const rows = (resolvedKycList || []).filter((k) => {
      if (!k) return false;
      if (k.isActive === false || k.IsActive === false) return false;
      if (isApplicantDocumentTuple(k)) return false;

      const rowProdId = Number(k.applicationProductDetailsId ?? k.ApplicationProductDetailsId);
      if (!Number.isFinite(rowProdId) || rowProdId !== appProdId) return false;

      const rawSeq = k.applicantSequence ?? k.ApplicantSequence;
      if (rawSeq === undefined || rawSeq === null) return false;
      return Number(rawSeq) === 0;
    });

    const row = rows.length === 1 ? rows[0] : null;
    const id = row
      ? Number(row.applicationKYCDocumentId ?? row.ApplicationKYCDocumentId ?? row.kycDocumentId) || null
      : null;

    return { row, id, rows, ambiguous: rows.length > 1, appProdId };
  }, [resolvedKycList, verificationData]);

  // Deterministic report of a data inconsistency; no row is guessed and no file
  // availability is fabricated - identity rows simply show Not Uploaded.
  useEffect(() => {
    if (mainApplicantKyc.ambiguous) {
      console.error(
        '[CustomerVerification] Data inconsistency: ' +
          `${mainApplicantKyc.rows.length} active Main Applicant (applicantSequence 0) KYC rows found for ` +
          `ApplicationProductDetailsId ${mainApplicantKyc.appProdId}. IDs: ` +
          mainApplicantKyc.rows
            .map((r) => r.applicationKYCDocumentId ?? r.ApplicationKYCDocumentId)
            .filter(Boolean)
            .join(', ') +
          '. Exactly one is required; identity documents will show as Not Uploaded until this is corrected.'
      );
    }
  }, [mainApplicantKyc]);

  const applicantKycRecord = mainApplicantKyc.row;
  const applicantKycId = mainApplicantKyc.id;

  // Dynamic Co-Applicants extraction (supports 0, 1, 2, 3+ co-applicants based strictly on configured count)
  const coApplicants = useMemo(() => {
    const coPersonalList = resolvedPersonalList.slice(1);
    const coKycList = resolvedKycList.slice(1);

    // Authoritative configured co-applicant count from Application / Product Details
    const rawConfiguredCount =
      verificationData?.applicationDetails?.coApplicantCount ??
      verificationData?.application?.noOfCoApplicants ??
      verificationData?.raw?.productDetails?.[0]?.noOfCoApplicants ??
      verificationData?.raw?.productDetails?.noOfCoApplicants ??
      verificationData?.raw?.ProductDetails?.[0]?.NoOfCoApplicants ??
      verificationData?.raw?.ProductDetails?.NoOfCoApplicants ??
      0;

    const count = Math.max(0, parseInt(rawConfiguredCount, 10) || 0);

    const result = [];
    for (let i = 0; i < count; i++) {
      const pers = coPersonalList[i] || {};
      const targetSeq = i + 1;
      const kyc =
        (resolvedKycList || []).find(
          (k) =>
            k &&
            k.isActive !== false &&
            k.IsActive !== false &&
            !isApplicantDocumentTuple(k) &&
            Number(k.applicantSequence ?? k.ApplicantSequence) === targetSeq
        ) ||
        coKycList[i] ||
        {};
      const nameParts = [pers.firstName, pers.middleName, pers.lastName].filter(Boolean).join(' ');
      const name = nameParts || pers.fullName || pers.customerName || `Co-Applicant ${i + 1}`;
      const pan = kyc.panCardNo || pers.panCardNo || pers.pan || '';
      const aadhaarLast4 = kyc.aadhaarLastFourDigits || pers.aadhaarLastFourDigits || '';
      const aadhaarDisplay = aadhaarLast4
        ? `XXXX-XXXX-${aadhaarLast4}`
        : (pers.aadhaarNumber ? String(pers.aadhaarNumber) : (kyc.aadhaarNumber ? String(kyc.aadhaarNumber) : '—'));
      const kycDocumentId =
        kyc.applicationKYCDocumentId ||
        kyc.ApplicationKYCDocumentId ||
        kyc.kycDocumentId ||
        kyc.id ||
        null;

      result.push({
        index: i,
        number: i + 1,
        sequence: targetSeq,
        name,
        pan,
        aadhaarLast4,
        aadhaarDisplay,
        kycDocumentId,
        kycRecord: kyc,
        kyc: kyc,
        personalRecord: pers,
      });
    }
    return result;
  }, [verificationData, resolvedPersonalList, resolvedKycList]);

  // Generic KYC binary file loader helper
  const fetchKycDocBlob = useCallback(async (kycId, route, defaultName) => {
    if (!kycId) return { loading: false, url: null, error: null };
    const cacheKey = `kycBlob_${kycId}_${route}`;
    if (previewCacheRef.current.has(cacheKey)) {
      return previewCacheRef.current.get(cacheKey);
    }
    try {
      const token = localStorage.getItem('authToken');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/ApplicationKYCDocuments/${kycId}/${route}`, { headers });
      if (!res.ok) {
        return { loading: false, url: null, error: null };
      }
      const blob = await res.blob();
      if (!blob || blob.size === 0) {
        return { loading: false, url: null, error: null };
      }

      let fileName = '';
      const disposition = res.headers.get('content-disposition');
      if (disposition) {
        const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (match && match[1]) {
          fileName = match[1].replace(/['"]/g, '').trim();
        }
      }
      const isPdf = blob.type === 'application/pdf' || (fileName && fileName.toLowerCase().endsWith('.pdf'));
      if (!fileName) {
        const ext = isPdf ? 'pdf' : (blob.type === 'image/png' ? 'png' : 'jpg');
        fileName = `${defaultName}.${ext}`;
      }

      const objectUrl = window.URL.createObjectURL(blob);
      blobUrlsRef.current.push(objectUrl);

      const result = {
        loading: false,
        error: null,
        url: objectUrl,
        isPdf,
        isImage: !isPdf,
        fileName,
        size: blob.size,
      };
      previewCacheRef.current.set(cacheKey, result);
      return result;
    } catch (err) {
      console.warn(`Could not load KYC doc for kycId ${kycId} route ${route}:`, err);
      return { loading: false, url: null, error: null };
    }
  }, []);

  // Helper to fetch any document blob by server path (supporting both AgentCustomerDocument & ApplicationKYCDocuments)
  const fetchKycDocByPath = useCallback(async (rawPath, defaultName) => {
    if (!rawPath || typeof rawPath !== 'string' || !rawPath.trim()) {
      return { loading: false, url: null, error: null, fileName: defaultName || '' };
    }
    const normalizeDocPath = (val) =>
      String(val || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\/+/, '');

    const normalizedPath = normalizeDocPath(rawPath);
    const cacheKey = `kycPath_${normalizedPath.toLowerCase()}`;
    if (previewCacheRef.current.has(cacheKey)) {
      return previewCacheRef.current.get(cacheKey);
    }
    try {
      // ── CASE A: AGENT CUSTOMER DOCUMENT ──────────────────────────
      // If path belongs to AgentCustomers (UploadedFiles/AgentCustomers/...),
      // match against allCustomerDocs and download via backOfficeService.downloadCustomerDocument(docId)
      if (normalizedPath.startsWith('UploadedFiles/AgentCustomers/') || normalizedPath.startsWith('AgentCustomers/')) {
        const targetNormalized = normalizedPath.toLowerCase();
        const matchedDoc = (allCustomerDocs || []).find((doc) => {
          const candidate = normalizeDocPath(
            doc.filePath || doc.documentPath || doc.path
          ).toLowerCase();
          return candidate === targetNormalized;
        });

        if (matchedDoc) {
          const docId = matchedDoc.agentCustomerDocumentId || matchedDoc.id;
          if (docId) {
            const agentCacheKey = `agentDoc_${docId}`;
            if (previewCacheRef.current.has(agentCacheKey)) {
              const cached = previewCacheRef.current.get(agentCacheKey);
              previewCacheRef.current.set(cacheKey, cached);
              return cached;
            }
            try {
              const blobData = await backOfficeService.downloadCustomerDocument(docId);
              const fileName = matchedDoc.fileName || matchedDoc.name || defaultName || 'document';
              const isPdf = /\.pdf$/i.test(fileName) || blobData.type === 'application/pdf';

              let mimeType = blobData.type || (isPdf ? 'application/pdf' : 'image/jpeg');
              if (/\.(jpg|jpeg)$/i.test(fileName)) mimeType = 'image/jpeg';
              else if (/\.png$/i.test(fileName)) mimeType = 'image/png';
              else if (/\.webp$/i.test(fileName)) mimeType = 'image/webp';
              else if (isPdf) mimeType = 'application/pdf';

              const typedBlob = new Blob([blobData], { type: mimeType });
              const objectUrl = window.URL.createObjectURL(typedBlob);
              blobUrlsRef.current.push(objectUrl);

              const result = {
                loading: false,
                error: null,
                url: objectUrl,
                isPdf,
                isImage: !isPdf,
                fileName,
                size: typedBlob.size,
                path: rawPath,
                uploadDate: matchedDoc.createdAt
                  ? new Date(matchedDoc.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : matchedDoc.uploadedOn || '',
              };
              previewCacheRef.current.set(agentCacheKey, result);
              previewCacheRef.current.set(cacheKey, result);
              return result;
            } catch (dlErr) {
              console.warn(`[CustomerVerification] Failed to download AgentCustomerDocument ID ${docId}:`, dlErr);
              return {
                loading: false,
                url: null,
                isHistoricalUnavailable: true,
                error: 'Previous version file is no longer available on the server.',
                fileName: defaultName || normalizedPath.split('/').pop() || '',
              };
            }
          }
        }

        console.warn(
          '[CustomerVerification] AgentCustomerDocument path could not be matched:',
          normalizedPath
        );
        return {
          loading: false,
          url: null,
          isHistoricalUnavailable: true,
          error: 'Previous version file is no longer available on the server.',
          fileName: defaultName || normalizedPath.split('/').pop() || '',
        };
      }

      // ── CASE B: APPLICATION KYC DOCUMENT ──────────────────────────
      let cleanPath = normalizedPath;
      if (!cleanPath.startsWith('UploadedFiles/') && cleanPath.startsWith('KYCDocuments/')) {
        cleanPath = `UploadedFiles/${cleanPath}`;
      }

      const token = localStorage.getItem('authToken');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/ApplicationKYCDocuments/download?path=${encodeURIComponent(cleanPath)}`, { headers });
      if (res.status === 404) {
        return {
          loading: false,
          url: null,
          isHistoricalUnavailable: true,
          error: 'Previous version file is no longer available on the server.',
          fileName: defaultName || cleanPath.split('/').pop() || '',
        };
      }
      if (!res.ok) {
        return {
          loading: false,
          url: null,
          error: 'Previous version could not be retrieved from server.',
          fileName: defaultName || cleanPath.split('/').pop() || '',
        };
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0) {
        return {
          loading: false,
          url: null,
          error: 'Previous version file is empty.',
          fileName: defaultName || cleanPath.split('/').pop() || '',
        };
      }

      let fileName = '';
      const disposition = res.headers.get('content-disposition');
      if (disposition) {
        const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (match && match[1]) {
          fileName = match[1].replace(/['"]/g, '').trim();
        }
      }
      if (!fileName) {
        fileName = cleanPath.split('/').pop() || defaultName || 'document';
      }

      const isPdf = blob.type === 'application/pdf' || /\.pdf$/i.test(fileName);
      let mimeType = blob.type || (isPdf ? 'application/pdf' : 'image/jpeg');
      if (/\.(jpg|jpeg)$/i.test(fileName)) mimeType = 'image/jpeg';
      else if (/\.png$/i.test(fileName)) mimeType = 'image/png';
      else if (/\.webp$/i.test(fileName)) mimeType = 'image/webp';
      else if (isPdf) mimeType = 'application/pdf';

      const typedBlob = new Blob([blob], { type: mimeType });
      const objectUrl = window.URL.createObjectURL(typedBlob);
      blobUrlsRef.current.push(objectUrl);

      const result = {
        loading: false,
        error: null,
        url: objectUrl,
        isPdf,
        isImage: !isPdf,
        fileName,
        size: typedBlob.size,
        path: rawPath,
      };
      previewCacheRef.current.set(cacheKey, result);
      return result;
    } catch (err) {
      console.warn(`[CustomerVerification] Could not load document from path ${rawPath}:`, err);
      return {
        loading: false,
        url: null,
        isHistoricalUnavailable: true,
        error: 'Previous version file is no longer available on the server.',
        fileName: defaultName || '',
      };
    }
  }, [allCustomerDocs]);

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
      previewCacheRef.current.clear();
    };
  }, []);

  // 5. Remarks & Reject/Send to RM State for Steps 2, 3, 4, 5, 6, 7 (Document Verification)
  const [stepRemarks, setStepRemarks] = useState({ 2: '', 3: '', 4: '', 5: '', 6: '', 7: '' });
  const [stepFeedback, setStepFeedback] = useState({ 2: null, 3: null, 4: null, 5: null, 6: null, 7: null });


  // 5b. Document Rejection & Returned Application Workflow States
  const [applicationRejections, setApplicationRejections] = useState([]);
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);
  const [isVerifyingRejection, setIsVerifyingRejection] = useState(false);

  // 5c. Step-Level Verification Persistence States (BackOfficeStepVerification)
  const [stepVerifications, setStepVerifications] = useState(INITIAL_STEP_VERIFICATIONS);
  const reconciledStepsRef = useRef(new Set());
  const [isFetchingStepVerifications, setIsFetchingStepVerifications] = useState(false);
  const [savingVerificationKey, setSavingVerificationKey] = useState(null);
  const [stepVerificationError, setStepVerificationError] = useState(null);

  // 6. Upload States for Steps 9 & 10 (Legal Opinion & Technical Value, Max 150MB)
  const [legalOpinion, setLegalOpinion] = useState({
    backOfficeApplicationDocumentId: null,
    documentType: 'LEGAL_OPINION',
    documentTitle: 'Legal Opinion Report',
    file: null,
    fileName: '',
    fileSize: '',
    fileUrl: null,
    isPdf: false,
    isImage: false,
    uploadedAt: '',
    modifiedAt: '',
    modifiedBy: null,
    documentStatus: '',
    remarks: '',
    loading: false,
    savingRemarks: false,
    error: null,
    successMsg: '',
  });

  const [technicalValue, setTechnicalValue] = useState({
    backOfficeApplicationDocumentId: null,
    documentType: 'TECHNICAL_VALUATION',
    documentTitle: 'Technical Valuation Report',
    file: null,
    fileName: '',
    fileSize: '',
    fileUrl: null,
    isPdf: false,
    isImage: false,
    uploadedAt: '',
    modifiedAt: '',
    modifiedBy: null,
    documentStatus: '',
    remarks: '',
    loading: false,
    savingRemarks: false,
    error: null,
    successMsg: '',
  });

  // 7. Manual CIBIL PAN Upload State for Step 11
  const [manualCibilPan, setManualCibilPan] = useState({
    backOfficeApplicationDocumentId: null,
    documentType: 'MANUAL_CIBIL_PAN',
    documentTitle: 'Manual CIBIL PAN Card',
    file: null,
    fileName: '',
    fileSize: '',
    fileUrl: null,
    isPdf: false,
    isImage: false,
    uploadedAt: '',
    modifiedAt: '',
    modifiedBy: null,
    documentStatus: '',
    remarks: '',
    loading: false,
    savingRemarks: false,
    error: null,
    successMsg: '',
  });

  // 7b. Step Remarks Confirmation Modal State (Steps 09, 10, 11)
  const [saveRemarksModal, setSaveRemarksModal] = useState({
    open: false,
    stepType: null,
    stepLabel: '',
    docId: null,
    remarks: '',
    setter: null,
  });

  // 7c. Document Delete Confirmation Modal State (Steps 09, 10, 11/13)
  const [deleteDocModal, setDeleteDocModal] = useState({
    open: false,
    stepType: null,
    stepLabel: '',
    docId: null,
    fileName: '',
    docState: null,
    setter: null,
    isDeleting: false,
  });

  // 8. PD Verification Master State for Step 12
  const [pdVerificationTypes, setPdVerificationTypes] = useState([]);
  const [pdVerificationTypesLoading, setPdVerificationTypesLoading] = useState(false);
  const [pdVerificationTypesError, setPdVerificationTypesError] = useState(null);
  const [selectedPdTypeId, setSelectedPdTypeId] = useState('');

  const fetchPdVerificationTypes = useCallback(async () => {
    setPdVerificationTypesLoading(true);
    setPdVerificationTypesError(null);
    try {
      const res = await backOfficeService.getPDVerificationTypes();
      const list = Array.isArray(res) ? res : (res?.data || res?.value || []);
      setPdVerificationTypes(list);
    } catch (err) {
      console.error('Failed to load PD verification types:', err);
      setPdVerificationTypesError('Failed to load PD verification modes. Please try again.');
    } finally {
      setPdVerificationTypesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeStep === 14) {
      fetchPdVerificationTypes();
    }
  }, [activeStep, fetchPdVerificationTypes]);

  const activePdVerificationTypes = useMemo(() => {
    return (pdVerificationTypes || []).filter((item) => item.isActive === true);
  }, [pdVerificationTypes]);

  useEffect(() => {
    if (activePdVerificationTypes.length > 0) {
      const exists = activePdVerificationTypes.some(
        (item) => String(item.pdVerificationTypeId) === String(selectedPdTypeId)
      );
      if (!exists) {
        setSelectedPdTypeId(activePdVerificationTypes[0].pdVerificationTypeId);
      }
    }
  }, [activePdVerificationTypes, selectedPdTypeId]);

  const selectedPdType = useMemo(() => {
    return (
      activePdVerificationTypes.find(
        (item) => String(item.pdVerificationTypeId) === String(selectedPdTypeId)
      ) || null
    );
  }, [activePdVerificationTypes, selectedPdTypeId]);

  // 9. Eligibility Assessment State for Step 14 (Phase 2A)
  const [assessmentMethods, setAssessmentMethods] = useState([]);
  const [selectedMethodCode, setSelectedMethodCode] = useState('INCOME');
  const [selectedApplicantSequence, setSelectedApplicantSequence] = useState(0);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const [methodsError, setMethodsError] = useState(null);
  const [foirMasterList, setFoirMasterList] = useState([]);
  const [employmentTypesList, setEmploymentTypesList] = useState([]);
  const [calcWorkspaceOpen, setCalcWorkspaceOpen] = useState(false);
  const [calcSheetTab, setCalcSheetTab] = useState('inputs'); // inputs | settings | results
  const calcSheetRef = useRef(null);

  const openCalcWorkspace = useCallback((tab = 'inputs') => {
    setCalcSheetTab(tab);
    setCalcWorkspaceOpen(true);
  }, []);

  // Dynamic applicants resolver (Applicant = Seq 0, Co-Applicants = Seq 1, 2, ...)
  const allApplicants = useMemo(() => {
    const list = [];
    const mainName =
      verificationData?.customerName ||
      resolvedPersonalList[0]?.firstName ||
      'Applicant';

    list.push({
      sequence: 0,
      label: 'Applicant',
      name: mainName,
      isMain: true,
      // Main Applicant row comes from the live sequence-0 resolver, not positional [0].
      pan: verificationData?.personalInformation?.panNumber || mainApplicantKyc.row?.panCardNo || '',
      personalRecord: resolvedPersonalList[0] || null,
      kycRecord: mainApplicantKyc.row || null,
    });

    (coApplicants || []).forEach((co, idx) => {
      list.push({
        sequence: idx + 1,
        label: `Co-Applicant ${idx + 1}`,
        name: co.name || `Co-Applicant ${idx + 1}`,
        isMain: false,
        pan: co.pan || '',
        personalRecord: co.personalRecord || null,
        kycRecord: co.kycRecord || null,
      });
    });

    return list;
  }, [
    verificationData?.customerName,
    verificationData?.personalInformation?.panNumber,
    resolvedPersonalList,
    resolvedKycList,
    mainApplicantKyc,
    coApplicants,
  ]);

  const selectedApplicant = useMemo(() => {
    return (
      allApplicants.find((a) => a.sequence === selectedApplicantSequence) ||
      allApplicants[0] ||
      null
    );
  }, [allApplicants, selectedApplicantSequence]);

  const selectedEmploymentRecord = useMemo(() => {
    const rawEmp =
      verificationData?.raw?.employmentIncome ||
      verificationData?.raw?.EmploymentIncome ||
      verificationData?.employmentIncome?.raw ||
      [];
    const empList = Array.isArray(rawEmp) ? rawEmp : (rawEmp ? [rawEmp] : []);
    return empList[selectedApplicantSequence] || null;
  }, [verificationData, selectedApplicantSequence]);

  const selectedEmploymentIncomeDetailsId = useMemo(() => {
    if (!selectedEmploymentRecord) {
      if (selectedApplicantSequence === 0) {
        return (
          verificationData?.employmentIncome?.raw?.applicationEmploymentIncomeDetailsId ??
          verificationData?.employmentIncome?.raw?.ApplicationEmploymentIncomeDetailsId ??
          null
        );
      }
      return null;
    }
    return (
      selectedEmploymentRecord.applicationEmploymentIncomeDetailsId ??
      selectedEmploymentRecord.ApplicationEmploymentIncomeDetailsId ??
      selectedEmploymentRecord.employmentIncomeDetailsId ??
      selectedEmploymentRecord.EmploymentIncomeDetailsId ??
      selectedEmploymentRecord.id ??
      null
    );
  }, [selectedEmploymentRecord, selectedApplicantSequence, verificationData]);

  const selectedEmploymentTypeId = useMemo(() => {
    // 1. Check direct ID on selected employment record
    const directId =
      selectedEmploymentRecord?.employmentTypeId ??
      selectedEmploymentRecord?.EmploymentTypeId;
    if (directId != null && !isNaN(Number(directId))) return Number(directId);

    // 2. Check raw employment list
    const rawEmp =
      verificationData?.raw?.employmentIncome ||
      verificationData?.raw?.EmploymentIncome ||
      [];
    const rawList = Array.isArray(rawEmp) ? rawEmp : (rawEmp ? [rawEmp] : []);
    const rawRecord = rawList[selectedApplicantSequence];
    const rawId = rawRecord?.employmentTypeId ?? rawRecord?.EmploymentTypeId;
    if (rawId != null && !isNaN(Number(rawId))) return Number(rawId);

    // 3. Match from employmentTypesList by employment type name
    const typeName =
      selectedEmploymentRecord?.employmentTypeName ||
      selectedEmploymentRecord?.EmploymentTypeName ||
      (selectedApplicantSequence === 0 ? verificationData?.employmentIncome?.employmentType : null);
    if (typeName && Array.isArray(employmentTypesList)) {
      const match = employmentTypesList.find(
        (et) =>
          (et.employmentTypeName && et.employmentTypeName.toLowerCase() === typeName.toLowerCase()) ||
          (et.employmentCode && et.employmentCode.toLowerCase() === typeName.toLowerCase())
      );
      if (match?.employmentTypeId) return Number(match.employmentTypeId);
    }

    // Default to 1 (Salaried) for main applicant if unspecified
    return selectedApplicantSequence === 0 ? 1 : null;
  }, [selectedEmploymentRecord, verificationData, selectedApplicantSequence, employmentTypesList]);

  // Authoritative Sequence-0 Main Applicant employmentTypeId
  const mainApplicantEmploymentTypeId = useMemo(() => {
    const rawEmp =
      verificationData?.raw?.employmentIncome ||
      verificationData?.raw?.EmploymentIncome ||
      verificationData?.employmentIncome?.raw ||
      [];
    const empList = Array.isArray(rawEmp) ? rawEmp : (rawEmp ? [rawEmp] : []);
    const directId = empList[0]?.employmentTypeId ?? empList[0]?.EmploymentTypeId;
    if (directId != null && !isNaN(Number(directId)) && Number(directId) > 0) return Number(directId);

    const custId =
      verificationData?.customer?.employmentTypeId ??
      verificationData?.customer?.EmploymentTypeId ??
      verificationData?.raw?.customer?.employmentTypeId ??
      verificationData?.raw?.customer?.EmploymentTypeId;
    if (custId != null && !isNaN(Number(custId)) && Number(custId) > 0) return Number(custId);

    const typeName = empList[0]?.employmentTypeName || verificationData?.employmentIncome?.employmentType;
    if (typeName && Array.isArray(employmentTypesList)) {
      const match = employmentTypesList.find(
        (et) =>
          (et.employmentTypeName && et.employmentTypeName.toLowerCase() === typeName.toLowerCase()) ||
          (et.employmentCode && et.employmentCode.toLowerCase() === typeName.toLowerCase())
      );
      if (match?.employmentTypeId) return Number(match.employmentTypeId);
    }

    return null;
  }, [verificationData, employmentTypesList]);

  // Sequence-specific employmentTypeId getter (Applicant seq 0, Co-Applicants seq 1+)
  const getEmploymentTypeIdForSequence = useCallback((seq) => {
    if (seq === 0) return mainApplicantEmploymentTypeId;
    const rawEmp =
      verificationData?.raw?.employmentIncome ||
      verificationData?.raw?.EmploymentIncome ||
      [];
    const empList = Array.isArray(rawEmp) ? rawEmp : (rawEmp ? [rawEmp] : []);
    const coEmp = empList[seq];
    const directId = coEmp?.employmentTypeId ?? coEmp?.EmploymentTypeId;
    if (directId != null && !isNaN(Number(directId)) && Number(directId) > 0) return Number(directId);

    const coPersonal = (resolvedPersonalList || [])[seq];
    const coPersEmpId = coPersonal?.employmentTypeId ?? coPersonal?.EmploymentTypeId;
    if (coPersEmpId != null && !isNaN(Number(coPersEmpId)) && Number(coPersEmpId) > 0) return Number(coPersEmpId);

    return null;
  }, [mainApplicantEmploymentTypeId, verificationData, resolvedPersonalList]);

  const selectedEmploymentTypeName = useMemo(() => {
    // 1. Direct name on record
    const directName =
      selectedEmploymentRecord?.employmentTypeName ||
      selectedEmploymentRecord?.EmploymentTypeName;
    if (directName) return directName;

    // 2. Resolve via selectedEmploymentTypeId from employmentTypesList
    if (selectedEmploymentTypeId != null && Array.isArray(employmentTypesList) && employmentTypesList.length > 0) {
      const match = employmentTypesList.find(
        (et) => Number(et.employmentTypeId) === Number(selectedEmploymentTypeId)
      );
      if (match?.employmentTypeName) return match.employmentTypeName;
    }

    // 3. Fallback to verificationData mapped string
    if (selectedApplicantSequence === 0 && verificationData?.employmentIncome?.employmentType) {
      return verificationData.employmentIncome.employmentType;
    }

    // 4. Fallback based on standard ID mapping
    if (selectedEmploymentTypeId === 1) return 'Salaried';
    if (selectedEmploymentTypeId === 2) return 'Self Employed';
    if (selectedEmploymentTypeId === 3) return 'Business';
    if (selectedEmploymentTypeId === 4) return 'Other';

    return 'Salaried';
  }, [selectedEmploymentRecord, selectedEmploymentTypeId, employmentTypesList, selectedApplicantSequence, verificationData?.employmentIncome?.employmentType]);

  const selectedEmployerName = useMemo(() => {
    if (selectedEmploymentRecord) {
      return (
        selectedEmploymentRecord.employerBusinessName ||
        selectedEmploymentRecord.EmployerBusinessName ||
        selectedEmploymentRecord.companyName ||
        (selectedApplicantSequence === 0 ? verificationData?.employmentIncome?.companyOrBusinessName : null) ||
        null
      );
    }
    if (selectedApplicantSequence === 0 && verificationData?.employmentIncome?.companyOrBusinessName) {
      return verificationData.employmentIncome.companyOrBusinessName;
    }
    return null;
  }, [selectedEmploymentRecord, selectedApplicantSequence, verificationData?.employmentIncome?.companyOrBusinessName]);

  // Dynamic IDs resolution for calculation engine
  const calculationAppProdId = useMemo(() => {
    return Number(
      verificationData?.applicationProductDetailsId ||
      verificationData?.application?.product?.applicationProductDetailsId ||
      verificationData?.application?.product?.ApplicationProductDetailsId ||
      verificationData?.application?.applicationProductDetailsId ||
      verificationData?.application?.ApplicationProductDetailsId ||
      verificationData?.raw?.productDetails?.product?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.product?.ApplicationProductDetailsId ||
      verificationData?.raw?.productDetailsList?.product?.applicationProductDetailsId ||
      verificationData?.raw?.productDetailsList?.product?.ApplicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.product?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.product?.ApplicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.ApplicationProductDetailsId ||
      verificationData?.raw?.productDetails?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.ApplicationProductDetailsId ||
      verificationData?.raw?.productDetailsList?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.productDetailsList?.[0]?.ApplicationProductDetailsId ||
      verificationData?.raw?.ProductDetails?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.ProductDetails?.applicationProductDetailsId ||
      verificationData?.raw?.applicationProductDetails?.applicationProductDetailsId ||
      verificationData?.raw?.applicationProductDetails?.ApplicationProductDetailsId ||
      verificationData?.raw?.ApplicationProductDetails?.applicationProductDetailsId ||
      verificationData?.raw?.ApplicationProductDetails?.ApplicationProductDetailsId ||
      0
    );
  }, [verificationData]);

  const calculationAgentCustId = useMemo(() => {
    const rawCustomer = verificationData?.raw?.customer || verificationData?.customer || {};
    const rawCust = Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer;
    return Number(
      verificationData?.customerId ||
      verificationData?.agentCustomerId ||
      rawCust?.agentCustomerId ||
      rawCust?.AgentCustomerId ||
      customerId ||
      0
    );
  }, [verificationData, customerId]);

  const resolvedSalarySlipPath = useMemo(() => {
    const normalizeDocPath = (val) =>
      String(val || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\/+/, '');

    // Priority 1: Check if an active Verified rejection for applicant Salary Slip exists with currentDocumentPath
    const verifiedSalaryRej = (applicationRejections || [])
      .filter((r) => {
        if (r.isActive === false || r.status !== 'Verified' || !r.currentDocumentPath) return false;
        const isCoApp =
          String(r.rejectedDocumentType || '').toUpperCase().startsWith('CO_APPLICANT') ||
          (r.applicantSequence !== undefined && r.applicantSequence !== null && Number(r.applicantSequence) > 0);
        if (isCoApp) return false;
        const rType = String(r.rejectedDocumentType || '').toUpperCase();
        if (salarySlipDocTypeId && Number(r.documentTypeId) === Number(salarySlipDocTypeId)) return true;
        if (rType.includes('SALARY')) return true;
        return false;
      })
      .sort((a, b) => (b.backOfficeDocumentRejectionId || 0) - (a.backOfficeDocumentRejectionId || 0))[0] || null;

    if (verifiedSalaryRej && verifiedSalaryRej.currentDocumentPath) {
      const targetNorm = normalizeDocPath(verifiedSalaryRej.currentDocumentPath).toLowerCase();
      const matchedDoc = (allCustomerDocs || []).find((doc) => {
        const candidate = normalizeDocPath(doc.filePath || doc.documentPath || doc.path).toLowerCase();
        return candidate === targetNorm;
      });
      if (matchedDoc?.filePath || matchedDoc?.documentPath || matchedDoc?.path) {
        return matchedDoc.filePath || matchedDoc.documentPath || matchedDoc.path;
      }
      return verifiedSalaryRej.currentDocumentPath;
    }

    // Priority 2: Latest active Salary Slip from allCustomerDocs (CreatedAt DESC, ID DESC)
    if (Array.isArray(allCustomerDocs) && allCustomerDocs.length > 0) {
      const matchingSalaryDocs = allCustomerDocs
        .filter((doc) => {
          if (doc.isActive === false) return false;
          if (salarySlipDocTypeId && Number(doc.documentTypeId || doc.DocumentTypeId) === Number(salarySlipDocTypeId)) return true;
          const title = String(doc.documentTitle || doc.fileName || doc.documentType || doc.documentTypeName || '').toLowerCase();
          return title.includes('salary') || title.includes('payslip') || title.includes('pay_slip');
        })
        .sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          if (timeA !== timeB) return timeB - timeA;
          return (b.agentCustomerDocumentId || 0) - (a.agentCustomerDocumentId || 0);
        });

      const slipDoc = matchingSalaryDocs[0];
      if (slipDoc?.filePath || slipDoc?.documentPath || slipDoc?.path) {
        return slipDoc.filePath || slipDoc.documentPath || slipDoc.path;
      }
    }
    return null;
  }, [allCustomerDocs, applicationRejections, salarySlipDocTypeId]);

  const resolvedBankStatementPath = useMemo(() => {
    if (Array.isArray(allCustomerDocs) && allCustomerDocs.length > 0) {
      const bankDoc = allCustomerDocs.find((doc) => {
        const title = String(doc.documentTitle || doc.fileName || doc.documentType || '').toLowerCase();
        return title.includes('bank') || title.includes('statement') || title.includes('passbook');
      });
      if (bankDoc?.filePath || bankDoc?.documentPath || bankDoc?.path) {
        return bankDoc.filePath || bankDoc.documentPath || bankDoc.path;
      }
    }
    return null;
  }, [allCustomerDocs]);

  // Phase 2B: Salary Income Assessment State for Step 14
  const [salaryRows, setSalaryRows] = useState([]);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryError, setSalaryError] = useState(null);
  const [salarySaving, setSalarySaving] = useState(false);
  const [salarySaveBanner, setSalarySaveBanner] = useState(null);

  // Other Income Assessment State for Step 14
  const [otherIncomeRows, setOtherIncomeRows] = useState([]);
  const [otherIncomeLoading, setOtherIncomeLoading] = useState(false);
  const [otherIncomeError, setOtherIncomeError] = useState(null);
  const [otherIncomeSaving, setOtherIncomeSaving] = useState(false);
  const [otherIncomeSaveBanner, setOtherIncomeSaveBanner] = useState(null);

  // Authenticated user ID resolver for createdBy
  const resolveAuthenticatedUserId = useCallback(() => {
    const boAuth = getBackOfficeAuth();
    if (boAuth?.id && !isNaN(Number(boAuth.id))) return Number(boAuth.id);
    if (boAuth?.backOfficeId && !isNaN(Number(boAuth.backOfficeId))) return Number(boAuth.backOfficeId);
    const directBoId = localStorage.getItem('backOfficeId');
    if (directBoId && !isNaN(Number(directBoId))) return Number(directBoId);
    const directUserId = localStorage.getItem('userId');
    if (directUserId && !isNaN(Number(directUserId))) return Number(directUserId);
    try {
      const boData = JSON.parse(localStorage.getItem('backOfficeData') || 'null');
      if (boData?.backOfficeId && !isNaN(Number(boData.backOfficeId))) return Number(boData.backOfficeId);
      if (boData?.id && !isNaN(Number(boData.id))) return Number(boData.id);
      if (boData?.userId && !isNaN(Number(boData.userId))) return Number(boData.userId);
    } catch {}
    try {
      const user = JSON.parse(localStorage.getItem('sivels_currentUser') || 'null');
      if (user?.backOfficeId && !isNaN(Number(user.backOfficeId))) return Number(user.backOfficeId);
      if (user?.id && !isNaN(Number(user.id))) return Number(user.id);
      if (user?.userId && !isNaN(Number(user.userId))) return Number(user.userId);
    } catch {}
    return null;
  }, []);

  // Helper to format YYYY-MM to MMM YYYY (e.g. "2026-09" -> "Sep 2026")
  const formatSalaryMonthDisplay = useCallback((monthStr) => {
    if (!monthStr) return '—';
    try {
      const parts = String(monthStr).split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = new Date(y, m, 1);
        return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      }
    } catch {}
    return monthStr;
  }, []);

  // Helper to generate default past 3 months
  const getDefaultSalaryMonths = useCallback(() => {
    const d = new Date();
    const months = [];
    for (let i = 1; i <= 3; i++) {
      const past = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const yyyy = past.getFullYear();
      const mm = String(past.getMonth() + 1).padStart(2, '0');
      months.push(`${yyyy}-${mm}-01`);
    }
    return months;
  }, []);

  // Hydrate salary records via GET /api/calculation/salary-income/{appProdId}/{applicantSequence}
  const fetchSalaryRecords = useCallback(async (appProdId, seq) => {
    if (!appProdId || isNaN(appProdId) || appProdId <= 0) return;
    setSalaryLoading(true);
    setSalaryError(null);
    setSalarySaveBanner(null);
    try {
      const res = await backOfficeService.getSalaryIncomeBySeq(appProdId, seq);
      const records = Array.isArray(res) ? res : (res?.value ?? res?.data ?? []);
      const activeRecords = records.filter((r) => r.isActive !== false);

      // Sort by salaryMonth descending (latest first)
      activeRecords.sort((a, b) => new Date(b.salaryMonth || 0) - new Date(a.salaryMonth || 0));

      const defaultMonths = getDefaultSalaryMonths();
      const rows = [];
      const rowCount = Math.max(3, activeRecords.length);

      for (let i = 0; i < rowCount; i++) {
        const existing = activeRecords[i];
        if (existing) {
          const rawMonth = String(existing.salaryMonth || '').split('T')[0];
          const monthFormatted = rawMonth.length >= 7 ? `${rawMonth.substring(0, 7)}-01` : rawMonth;
          const b = Number(existing.basicAmount) || 0;
          const h = Number(existing.hraAmount) || 0;
          const c = Number(existing.ccaAmount) || 0;
          const t = Number(existing.taAmount) || 0;
          const inc = Number(existing.incentiveAmount) || 0;
          const pct = existing.incentivePercentApplied != null ? Number(existing.incentivePercentApplied) : 0;
          const ded = Number(existing.deductionAmount) || 0;
          const consInc = existing.consideredIncentiveAmount != null ? Number(existing.consideredIncentiveAmount) : (inc * pct) / 100;
          // Required business calculation: Basic + HRA + CCA + TA + Considered Incentive + Deductions (ADDED)
          const consIncome = b + h + c + t + consInc + ded;

          rows.push({
            id: `salary-row-${existing.salaryIncomeDetailsId || i}`,
            salaryIncomeDetailsId: existing.salaryIncomeDetailsId || null,
            salaryMonth: monthFormatted,
            monthDisplay: monthFormatted.substring(0, 7),
            basicAmount: existing.basicAmount ?? 0,
            hraAmount: existing.hraAmount ?? 0,
            ccaAmount: existing.ccaAmount ?? 0,
            taAmount: existing.taAmount ?? 0,
            incentiveAmount: existing.incentiveAmount ?? 0,
            deductionAmount: existing.deductionAmount ?? 0,
            incentivePercentApplied: existing.incentivePercentApplied ?? 0,
            consideredIncentiveAmount: consInc,
            totalConsideredIncome: consIncome,
            previewConsideredIncentive: consInc,
            previewConsideredIncome: consIncome,
            isPersisted: true,
            isModified: false,
            errorMsg: null,
          });
        } else {
          const defMonth = defaultMonths[i] || `${new Date().getFullYear()}-01-01`;
          rows.push({
            id: `salary-row-new-${i}`,
            salaryIncomeDetailsId: null,
            salaryMonth: defMonth,
            monthDisplay: defMonth.substring(0, 7),
            basicAmount: '',
            hraAmount: '',
            ccaAmount: '',
            taAmount: '',
            incentiveAmount: '',
            deductionAmount: '',
            incentivePercentApplied: 50,
            consideredIncentiveAmount: null,
            totalConsideredIncome: null,
            previewConsideredIncentive: 0,
            previewConsideredIncome: 0,
            isPersisted: false,
            isModified: false,
            errorMsg: null,
          });
        }
      }
      setSalaryRows(rows);
    } catch (err) {
      console.warn('Failed to fetch salary income records:', err);
      setSalaryError(err?.response?.data?.message || err?.message || 'Unable to load salary income records from server.');
      const defaultMonths = getDefaultSalaryMonths();
      setSalaryRows(
        defaultMonths.map((m, i) => ({
          id: `salary-row-fallback-${i}`,
          salaryIncomeDetailsId: null,
          salaryMonth: m,
          monthDisplay: m.substring(0, 7),
          basicAmount: '',
          hraAmount: '',
          ccaAmount: '',
          taAmount: '',
          incentiveAmount: '',
          deductionAmount: '',
          incentivePercentApplied: 50,
          consideredIncentiveAmount: null,
          totalConsideredIncome: null,
          previewConsideredIncentive: 0,
          previewConsideredIncome: 0,
          isPersisted: false,
          isModified: false,
          errorMsg: null,
        }))
      );
    } finally {
      setSalaryLoading(false);
    }
  }, [getDefaultSalaryMonths]);

  // Handle adding an additional previous salary month
  const handleAddSalaryMonth = () => {
    setSalaryRows((prev) => {
      let oldestDate = new Date();
      if (prev.length > 0) {
        const sorted = [...prev].sort((a, b) => new Date(a.salaryMonth || 0) - new Date(b.salaryMonth || 0));
        const oldestMonthStr = sorted[0]?.salaryMonth;
        if (oldestMonthStr) {
          const parts = String(oldestMonthStr).split('-');
          if (parts.length >= 2) {
            oldestDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
          }
        }
      }

      // Subtract 1 month from oldest
      const newDate = new Date(oldestDate.getFullYear(), oldestDate.getMonth() - 1, 1);
      const yyyy = newDate.getFullYear();
      const mm = String(newDate.getMonth() + 1).padStart(2, '0');
      const newMonthFormatted = `${yyyy}-${mm}-01`;
      const newMonthDisplay = `${yyyy}-${mm}`;

      const newRow = {
        id: `salary-row-new-${Date.now()}-${prev.length}`,
        salaryIncomeDetailsId: null,
        salaryMonth: newMonthFormatted,
        monthDisplay: newMonthDisplay,
        basicAmount: '',
        hraAmount: '',
        ccaAmount: '',
        taAmount: '',
        incentiveAmount: '',
        deductionAmount: '',
        incentivePercentApplied: 50,
        consideredIncentiveAmount: null,
        totalConsideredIncome: null,
        previewConsideredIncentive: 0,
        previewConsideredIncome: 0,
        isPersisted: false,
        isModified: false,
        errorMsg: null,
      };

      return [...prev, newRow];
    });
  };

  // Handle removing a newly added draft salary month (minimum 3 rows enforced)
  const handleRemoveSalaryMonth = (indexToRemove) => {
    setSalaryRows((prev) => {
      if (prev.length <= 3) return prev;
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  // Handle row field edits (supported for both new draft entries and existing persisted rows)
  const handleSalaryRowChange = (index, field, value) => {
    setSalaryRows((prev) => {
      const next = [...prev];
      const row = { ...next[index] };

      if (field === 'monthDisplay') {
        row.monthDisplay = value;
        row.salaryMonth = value ? `${value}-01` : '';
      } else if (field === 'incentivePercentApplied') {
        if (value === '') {
          row[field] = '';
        } else {
          const num = Math.min(100, Math.max(0, Number(value) || 0));
          row[field] = num;
        }
      } else {
        if (value === '') {
          row[field] = '';
        } else {
          const num = Math.max(0, Number(value) || 0);
          row[field] = num;
        }
      }

      // Mark modified if row was previously persisted
      if (row.isPersisted) {
        row.isModified = true;
      }

      // Live client preview calculation (0 network calls on keystroke)
      const b = Number(row.basicAmount) || 0;
      const h = Number(row.hraAmount) || 0;
      const c = Number(row.ccaAmount) || 0;
      const t = Number(row.taAmount) || 0;
      const inc = Number(row.incentiveAmount) || 0;
      const ded = Number(row.deductionAmount) || 0;
      const pct = row.incentivePercentApplied === '' ? 0 : Number(row.incentivePercentApplied) || 0;
      const prevInc = (inc * pct) / 100;
      // Deductions must be ADDED: basic + hra + cca + ta + consideredIncentive + deductionAmount
      const prevIncome = b + h + c + t + prevInc + ded;

      row.previewConsideredIncentive = prevInc;
      row.previewConsideredIncome = prevIncome;

      row.errorMsg = null;
      next[index] = row;
      return next;
    });
  };

  // Pre-calculation synchronization helper (handles POST for new rows & PUT for modified persisted rows)
  const synchronizeSalaryRows = async () => {
    if (salaryRows.length < 3) {
      return {
        success: false,
        message: 'A minimum of 3 monthly salary records are required for Income Method assessment.',
      };
    }

    if (!selectedEmploymentIncomeDetailsId) {
      return {
        success: false,
        message: `Employment details are not available for ${selectedApplicant?.name || 'this applicant'}. Salary income assessment cannot be saved until employment details are available.`,
      };
    }

    const currentUserId = resolveAuthenticatedUserId();
    if (!currentUserId) {
      return {
        success: false,
        message: 'Unable to resolve authenticated Back Office user ID for operation. Please log out and re-login.',
      };
    }

    if (!calculationAppProdId || calculationAppProdId <= 0) {
      return {
        success: false,
        message: 'Application Product Details ID is missing or invalid. Please refresh the application.',
      };
    }

    // Validate distinct months across all rows
    const monthsSet = new Set();
    for (let i = 0; i < salaryRows.length; i++) {
      const m = salaryRows[i].salaryMonth;
      if (!m) {
        return {
          success: false,
          message: `Month is required for Row ${i + 1}. Please select a valid month.`,
        };
      }
      if (monthsSet.has(m)) {
        return {
          success: false,
          message: `Duplicate salary month detected: "${salaryRows[i].monthDisplay}". Each salary record must be for a distinct month.`,
        };
      }
      monthsSet.add(m);
    }

    // Validate required fields on all rows
    for (let i = 0; i < salaryRows.length; i++) {
      const row = salaryRows[i];
      if (row.basicAmount === '' || row.basicAmount === null || isNaN(Number(row.basicAmount))) {
        return {
          success: false,
          message: `Basic Salary is required for Row ${i + 1} (${row.monthDisplay || 'Selected Month'}).`,
        };
      }
      if (Number(row.basicAmount) < 0) {
        return {
          success: false,
          message: `Basic Salary cannot be negative for Row ${i + 1}.`,
        };
      }
    }

    // Identify operations needed
    const rowsToPost = [];
    const rowsToPut = [];

    salaryRows.forEach((row, idx) => {
      if (!row.isPersisted || !row.salaryIncomeDetailsId) {
        rowsToPost.push({ row, idx });
      } else if (row.isModified) {
        rowsToPut.push({ row, idx });
      }
    });

    if (rowsToPost.length === 0 && rowsToPut.length === 0) {
      // All 3 rows are already persisted and unchanged
      return { success: true, count: 0 };
    }

    setSalarySaving(true);
    let operationCount = 0;

    // 1. Execute PUT requests for modified persisted rows
    for (const item of rowsToPut) {
      const row = item.row;
      const payload = {
        salaryIncomeDetailsId: Number(row.salaryIncomeDetailsId),
        applicationProductDetailsId: Number(calculationAppProdId),
        agentCustomerId: Number(calculationAgentCustId),
        applicationEmploymentIncomeDetailsId: Number(selectedEmploymentIncomeDetailsId),
        applicantSequence: Number(selectedApplicantSequence),
        salaryMonth: row.salaryMonth,
        basicAmount: Number(row.basicAmount) || 0,
        hraAmount: Number(row.hraAmount) || 0,
        ccaAmount: Number(row.ccaAmount) || 0,
        taAmount: Number(row.taAmount) || 0,
        incentiveAmount: Number(row.incentiveAmount) || 0,
        deductionAmount: Number(row.deductionAmount) || 0,
        incentivePercentApplied: Number(row.incentivePercentApplied) || 0,
        salarySlipPath: resolvedSalarySlipPath || null,
        modifiedBy: Number(currentUserId),
      };

      try {
        await backOfficeService.updateSalaryIncome(row.salaryIncomeDetailsId, payload);
        operationCount++;
      } catch (err) {
        console.error(`Failed to update salary for month ${row.salaryMonth}:`, err);
        const errMsg = err?.response?.data?.message || err?.message || 'Failed to update salary record.';
        setSalarySaving(false);
        return {
          success: false,
          message: `Failed to update salary record for ${row.monthDisplay || `Row ${item.idx + 1}`}: ${errMsg}`,
        };
      }
    }

    // 2. Execute POST requests for new draft rows
    for (const item of rowsToPost) {
      const row = item.row;
      const payload = {
        applicationProductDetailsId: Number(calculationAppProdId),
        agentCustomerId: Number(calculationAgentCustId),
        applicationEmploymentIncomeDetailsId: Number(selectedEmploymentIncomeDetailsId),
        applicantSequence: Number(selectedApplicantSequence),
        salaryMonth: row.salaryMonth,
        basicAmount: Number(row.basicAmount) || 0,
        hraAmount: Number(row.hraAmount) || 0,
        ccaAmount: Number(row.ccaAmount) || 0,
        taAmount: Number(row.taAmount) || 0,
        incentiveAmount: Number(row.incentiveAmount) || 0,
        deductionAmount: Number(row.deductionAmount) || 0,
        incentivePercentApplied: Number(row.incentivePercentApplied) || 0,
        salarySlipPath: resolvedSalarySlipPath || null,
        createdBy: Number(currentUserId),
      };

      try {
        await backOfficeService.createSalaryIncome(payload);
        operationCount++;
      } catch (err) {
        console.error(`Failed to save salary for month ${row.salaryMonth}:`, err);
        const errMsg = err?.response?.data?.message || err?.message || 'Failed to save salary record.';
        setSalarySaving(false);
        return {
          success: false,
          message: `Failed to save new salary record for ${row.monthDisplay || `Row ${item.idx + 1}`}: ${errMsg}`,
        };
      }
    }

    setSalarySaving(false);
    return { success: true, count: operationCount };
  };

  // Hydrate other income records via GET /api/calculation/other-income/{appProdId}/{applicantSequence}
  const fetchOtherIncomeRecords = useCallback(async (appProdId, seq) => {
    if (!appProdId || isNaN(appProdId) || appProdId <= 0) return;
    setOtherIncomeLoading(true);
    setOtherIncomeError(null);
    setOtherIncomeSaveBanner(null);
    try {
      const res = await backOfficeService.getOtherIncomeBySeq(appProdId, seq);
      const records = Array.isArray(res) ? res : (res?.value ?? res?.data ?? []);
      const activeRecords = records.filter((r) => r.isActive !== false);

      const rows = activeRecords.map((r, i) => ({
        id: `other-inc-row-${r.applicationOtherIncomeDetailsId || i}`,
        applicationOtherIncomeDetailsId: r.applicationOtherIncomeDetailsId || null,
        incomeName: r.incomeName || '',
        incomeAmount: r.incomeAmount ?? '',
        isPersisted: true,
        isModified: false,
        errorMsg: null,
      }));
      setOtherIncomeRows(rows);
    } catch (err) {
      console.warn('Failed to fetch other income records:', err);
      setOtherIncomeRows([]);
    } finally {
      setOtherIncomeLoading(false);
    }
  }, []);

  // Handle adding an additional other income row
  const handleAddOtherIncomeRow = () => {
    setOtherIncomeRows((prev) => [
      ...prev,
      {
        id: `other-inc-new-${Date.now()}-${prev.length}`,
        applicationOtherIncomeDetailsId: null,
        incomeName: '',
        incomeAmount: '',
        isPersisted: false,
        isModified: false,
        errorMsg: null,
      },
    ]);
  };

  // Handle removing an other income row
  const handleRemoveOtherIncomeRow = (indexToRemove) => {
    setOtherIncomeRows((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Handle other income field edits
  const handleOtherIncomeRowChange = (index, field, value) => {
    setOtherIncomeRows((prev) => {
      const next = [...prev];
      const row = { ...next[index] };

      if (field === 'incomeAmount') {
        if (value === '') {
          row.incomeAmount = '';
        } else {
          const num = Math.max(0, Number(value) || 0);
          row.incomeAmount = num;
        }
      } else {
        row[field] = value;
      }

      if (row.isPersisted) {
        row.isModified = true;
      }
      row.errorMsg = null;
      next[index] = row;
      return next;
    });
  };

  // Pre-calculation synchronization helper for other income rows (POST for new, PUT for modified)
  const synchronizeOtherIncomeRows = async () => {
    if (otherIncomeRows.length === 0) {
      return { success: true, count: 0 };
    }

    const currentUserId = resolveAuthenticatedUserId();
    if (!currentUserId) {
      return {
        success: false,
        message: 'Unable to resolve authenticated Back Office user ID for operation. Please log out and re-login.',
      };
    }

    if (!calculationAppProdId || calculationAppProdId <= 0) {
      return {
        success: false,
        message: 'Application Product Details ID is missing or invalid. Please refresh the application.',
      };
    }

    // Validate rows
    for (let i = 0; i < otherIncomeRows.length; i++) {
      const row = otherIncomeRows[i];
      if (!row.incomeName || !String(row.incomeName).trim()) {
        return {
          success: false,
          message: `Income Name is required for Other Income row ${i + 1}.`,
        };
      }
      if (row.incomeAmount === '' || row.incomeAmount === null || isNaN(Number(row.incomeAmount)) || Number(row.incomeAmount) < 0) {
        return {
          success: false,
          message: `Valid Income Amount (>= 0) is required for Other Income row ${i + 1} (${row.incomeName}).`,
        };
      }
    }

    const rowsToPost = [];
    const rowsToPut = [];

    otherIncomeRows.forEach((row, idx) => {
      if (!row.isPersisted || !row.applicationOtherIncomeDetailsId) {
        rowsToPost.push({ row, idx });
      } else if (row.isModified) {
        rowsToPut.push({ row, idx });
      }
    });

    if (rowsToPost.length === 0 && rowsToPut.length === 0) {
      return { success: true, count: 0 };
    }

    setOtherIncomeSaving(true);
    let operationCount = 0;

    // 1. Execute PUT requests for modified persisted rows
    for (const item of rowsToPut) {
      const row = item.row;
      const payload = {
        applicationOtherIncomeDetailsId: Number(row.applicationOtherIncomeDetailsId),
        applicationProductDetailsId: Number(calculationAppProdId),
        agentCustomerId: Number(calculationAgentCustId),
        applicantSequence: Number(selectedApplicantSequence),
        incomeName: String(row.incomeName).trim(),
        incomeAmount: Number(row.incomeAmount) || 0,
        modifiedBy: Number(currentUserId),
      };

      try {
        await backOfficeService.updateOtherIncome(row.applicationOtherIncomeDetailsId, payload);
        operationCount++;
      } catch (err) {
        console.error(`Failed to update other income row ${item.idx + 1}:`, err);
        const errMsg = err?.response?.data?.message || err?.message || 'Failed to update other income record.';
        setOtherIncomeSaving(false);
        return {
          success: false,
          message: `Failed to update other income for ${row.incomeName || `Row ${item.idx + 1}`}: ${errMsg}`,
        };
      }
    }

    // 2. Execute POST requests for new draft rows
    for (const item of rowsToPost) {
      const row = item.row;
      const payload = {
        applicationProductDetailsId: Number(calculationAppProdId),
        agentCustomerId: Number(calculationAgentCustId),
        applicantSequence: Number(selectedApplicantSequence),
        incomeName: String(row.incomeName).trim(),
        incomeAmount: Number(row.incomeAmount) || 0,
        createdBy: Number(currentUserId),
      };

      try {
        await backOfficeService.createOtherIncome(payload);
        operationCount++;
      } catch (err) {
        console.error(`Failed to save new other income row ${item.idx + 1}:`, err);
        const errMsg = err?.response?.data?.message || err?.message || 'Failed to save other income record.';
        setOtherIncomeSaving(false);
        return {
          success: false,
          message: `Failed to save new other income record for ${row.incomeName || `Row ${item.idx + 1}`}: ${errMsg}`,
        };
      }
    }

    setOtherIncomeSaving(false);
    return { success: true, count: operationCount };
  };

  // Salary Multi-Month Average (N >= 3) based on Considered Income
  const liveSalaryAverage = useMemo(() => {
    const validRows = salaryRows.filter(
      (r) => r.salaryMonth && r.basicAmount !== '' && !isNaN(Number(r.basicAmount))
    );
    if (validRows.length === 0) return 0;
    const total = validRows.reduce((sum, r) => {
      const val = r.previewConsideredIncome != null && r.previewConsideredIncome !== ''
        ? Number(r.previewConsideredIncome)
        : (Number(r.totalConsideredIncome) || 0);
      return sum + val;
    }, 0);
    return Math.round(total / validRows.length);
  }, [salaryRows]);

  // Total Other Income
  const liveTotalOtherIncome = useMemo(() => {
    return otherIncomeRows.reduce((sum, r) => {
      const amt = Number(r.incomeAmount) || 0;
      return sum + amt;
    }, 0);
  }, [otherIncomeRows]);

  // Final Combined Considered Income (Salary Avg Net + Total Other Income)
  const liveFinalConsideredIncome = useMemo(() => {
    return liveSalaryAverage + liveTotalOtherIncome;
  }, [liveSalaryAverage, liveTotalOtherIncome]);

  // Trigger salary and other income hydration when Step 16 is active and method is INCOME
  useEffect(() => {
    if (activeStep === 16 && selectedMethodCode === 'INCOME' && calculationAppProdId > 0) {
      fetchSalaryRecords(calculationAppProdId, selectedApplicantSequence);
      fetchOtherIncomeRecords(calculationAppProdId, selectedApplicantSequence);
    }
  }, [activeStep, selectedMethodCode, calculationAppProdId, selectedApplicantSequence, fetchSalaryRecords, fetchOtherIncomeRecords]);

  // Calculation workspace popup: lock page scroll + Escape to close
  useEffect(() => {
    if (!calcWorkspaceOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setCalcWorkspaceOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    // Focus sheet for a11y
    requestAnimationFrame(() => {
      calcSheetRef.current?.focus?.();
    });
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [calcWorkspaceOpen]);

  // Keep calculator body scrolled to top when switching tabs
  useEffect(() => {
    if (!calcWorkspaceOpen) return;
    const body = calcSheetRef.current?.querySelector?.('.bo-cv-calc-sheet-body');
    if (body) body.scrollTop = 0;
  }, [calcSheetTab, calcWorkspaceOpen]);

  // Phase 2C: Average Bank Balance (ABB) Method State for Step 14
  const [masterBanks, setMasterBanks] = useState([]);
  const [masterBranches, setMasterBranches] = useState([]);
  const [mastersLoading, setMastersLoading] = useState(false);
  const [mastersError, setMastersError] = useState(null);

  const [abbAccounts, setAbbAccounts] = useState([]);
  const [abbAccountsLoading, setAbbAccountsLoading] = useState(false);
  const [abbAccountsError, setAbbAccountsError] = useState(null);

  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccountDraft, setNewAccountDraft] = useState({
    bankId: '',
    bankBranchId: '',
    accountNumber: '',
    statementFromDate: '',
    statementToDate: '',
    isIncluded: true,
  });
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountBanner, setAccountBanner] = useState(null);

  const [accountBalances, setAccountBalances] = useState({});
  const [balancesLoadingMap, setBalancesLoadingMap] = useState({});
  const [balancesSavingMap, setBalancesSavingMap] = useState({});
  const [balanceBannerMap, setBalanceBannerMap] = useState({});

  // Helper for default statement dates (From: 6 months ago, To: today)
  const getDefaultStatementDates = useCallback(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const toDate = `${yyyy}-${mm}-${dd}`;

    const past6 = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    const fromYyyy = past6.getFullYear();
    const fromMm = String(past6.getMonth() + 1).padStart(2, '0');
    const fromDate = `${fromYyyy}-${fromMm}-01`;

    return { fromDate, toDate };
  }, []);

  // Helper for default 3 balance months (past 3 months in YYYY-MM-01 format)
  const getDefaultAbbMonths = useCallback(() => {
    const d = new Date();
    const months = [];
    for (let i = 1; i <= 3; i++) {
      const past = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const yyyy = past.getFullYear();
      const mm = String(past.getMonth() + 1).padStart(2, '0');
      months.push(`${yyyy}-${mm}-01`);
    }
    return months;
  }, []);

  // Fetch Master Banks and Branches
  const fetchMasterBanksAndBranches = useCallback(async () => {
    setMastersLoading(true);
    setMastersError(null);
    try {
      const [banksRes, branchesRes] = await Promise.all([
        backOfficeService.getActiveBanks(),
        backOfficeService.getBankBranches(),
      ]);
      const banks = Array.isArray(banksRes) ? banksRes : (banksRes?.value ?? banksRes?.data ?? []);
      const branches = Array.isArray(branchesRes) ? branchesRes : (branchesRes?.value ?? branchesRes?.data ?? []);
      setMasterBanks(banks.filter((b) => b.isActive !== false));
      setMasterBranches(branches.filter((b) => b.isActive !== false));
    } catch (err) {
      console.warn('Failed to fetch bank and branch masters:', err);
      setMastersError(err?.response?.data?.message || err?.message || 'Unable to load bank masters.');
    } finally {
      setMastersLoading(false);
    }
  }, []);

  // Fetch balances for a single ABB account
  const fetchAbbBalancesForAccount = useCallback(async (abbAccountDetailsId) => {
    if (!abbAccountDetailsId) return;
    setBalancesLoadingMap((prev) => ({ ...prev, [abbAccountDetailsId]: true }));
    try {
      const res = await backOfficeService.getAbbBalances(abbAccountDetailsId);
      const records = Array.isArray(res) ? res : (res?.value ?? res?.data ?? []);
      const activeRecords = records.filter((r) => r.isActive !== false);

      // Sort descending by balanceMonth
      activeRecords.sort((a, b) => new Date(b.balanceMonth || 0) - new Date(a.balanceMonth || 0));

      let rows = [];
      if (activeRecords.length > 0) {
        rows = activeRecords.map((r) => {
          const rawMonth = String(r.balanceMonth || '').split('T')[0];
          const monthFormatted = rawMonth.length >= 7 ? `${rawMonth.substring(0, 7)}-01` : rawMonth;
          return {
            id: `abb-bal-${r.abbBalanceDetailsId}`,
            abbBalanceDetailsId: r.abbBalanceDetailsId,
            abbAccountDetailsId: r.abbAccountDetailsId || abbAccountDetailsId,
            balanceMonth: monthFormatted,
            monthDisplay: monthFormatted.substring(0, 7),
            balanceOn5th: r.balanceOn5th ?? 0,
            balanceOn15th: r.balanceOn15th ?? 0,
            balanceOn25th: r.balanceOn25th ?? 0,
            monthlyABB: r.monthlyABB ?? null,
            isPersisted: true,
            saveStatus: 'saved',
            errorMsg: null,
          };
        });
      } else {
        const defaultMonths = getDefaultAbbMonths();
        rows = defaultMonths.map((m, idx) => ({
          id: `abb-bal-new-${abbAccountDetailsId}-${idx}`,
          abbBalanceDetailsId: null,
          abbAccountDetailsId: abbAccountDetailsId,
          balanceMonth: m,
          monthDisplay: m.substring(0, 7),
          balanceOn5th: '',
          balanceOn15th: '',
          balanceOn25th: '',
          monthlyABB: null,
          isPersisted: false,
          saveStatus: 'idle',
          errorMsg: null,
        }));
      }

      setAccountBalances((prev) => ({
        ...prev,
        [abbAccountDetailsId]: rows,
      }));
    } catch (err) {
      console.warn(`Failed to fetch ABB balances for account ${abbAccountDetailsId}:`, err);
      setAccountBalances((prev) => {
        if (prev[abbAccountDetailsId] && prev[abbAccountDetailsId].length > 0) return prev;
        const defaultMonths = getDefaultAbbMonths();
        return {
          ...prev,
          [abbAccountDetailsId]: defaultMonths.map((m, idx) => ({
            id: `abb-bal-fb-${abbAccountDetailsId}-${idx}`,
            abbBalanceDetailsId: null,
            abbAccountDetailsId: abbAccountDetailsId,
            balanceMonth: m,
            monthDisplay: m.substring(0, 7),
            balanceOn5th: '',
            balanceOn15th: '',
            balanceOn25th: '',
            monthlyABB: null,
            isPersisted: false,
            saveStatus: 'idle',
            errorMsg: null,
          })),
        };
      });
    } finally {
      setBalancesLoadingMap((prev) => ({ ...prev, [abbAccountDetailsId]: false }));
    }
  }, [getDefaultAbbMonths]);

  // Fetch ABB accounts for current applicant sequence
  const fetchAbbAccounts = useCallback(async (appProdId, seq) => {
    if (!appProdId || isNaN(appProdId) || appProdId <= 0) return;
    setAbbAccountsLoading(true);
    setAbbAccountsError(null);
    try {
      const res = await backOfficeService.getAbbAccountsBySeq(appProdId, seq);
      const records = Array.isArray(res) ? res : (res?.value ?? res?.data ?? []);
      const activeRecords = records.filter((r) => r.isActive !== false);
      setAbbAccounts(activeRecords);

      // Hydrate balances for each active account
      activeRecords.forEach((acc) => {
        if (acc.abbAccountDetailsId) {
          fetchAbbBalancesForAccount(acc.abbAccountDetailsId);
        }
      });
    } catch (err) {
      console.warn('Failed to fetch ABB accounts:', err);
      setAbbAccountsError(err?.response?.data?.message || err?.message || 'Unable to load ABB accounts from server.');
      setAbbAccounts([]);
    } finally {
      setAbbAccountsLoading(false);
    }
  }, [fetchAbbBalancesForAccount]);

  // Trigger ABB hydration when Step 14 is active and method is ABB
  useEffect(() => {
    if (activeStep === 16 && selectedMethodCode === 'ABB') {
      if (masterBanks.length === 0 || masterBranches.length === 0) {
        fetchMasterBanksAndBranches();
      }
      if (calculationAppProdId > 0) {
        fetchAbbAccounts(calculationAppProdId, selectedApplicantSequence);
      }
    }
  }, [
    activeStep,
    selectedMethodCode,
    calculationAppProdId,
    selectedApplicantSequence,
    masterBanks.length,
    masterBranches.length,
    fetchMasterBanksAndBranches,
    fetchAbbAccounts,
  ]);

  // Handle open Add Bank Account form
  const handleOpenAddAccountForm = () => {
    const { fromDate, toDate } = getDefaultStatementDates();
    const rawBank =
      verificationData?.bankDetails ||
      verificationData?.raw?.bankExistingLoans ||
      verificationData?.raw?.bankDetails ||
      [];
    const bankList = Array.isArray(rawBank) ? rawBank : (rawBank ? [rawBank] : []);
    const prefill = bankList[selectedApplicantSequence] || bankList[0] || {};

    let defaultBankId = '';
    if (prefill.bankId) {
      defaultBankId = prefill.bankId;
    } else if (prefill.bankName && masterBanks.length > 0) {
      const matched = masterBanks.find(
        (b) =>
          b.bankName?.toLowerCase().includes(prefill.bankName.toLowerCase()) ||
          prefill.bankName?.toLowerCase().includes(b.bankName?.toLowerCase())
      );
      if (matched) defaultBankId = matched.bankId;
    } else if (masterBanks.length > 0) {
      defaultBankId = masterBanks[0].bankId;
    }

    let defaultBranchId = '';
    if (defaultBankId) {
      const matchingBranches = masterBranches.filter((br) => Number(br.bankId) === Number(defaultBankId));
      if (matchingBranches.length > 0) {
        defaultBranchId = matchingBranches[0].bankBranchId;
      }
    }

    setNewAccountDraft({
      bankId: defaultBankId || '',
      bankBranchId: defaultBranchId || '',
      accountNumber: prefill.accountNumber || prefill.accountNo || '',
      statementFromDate: fromDate,
      statementToDate: toDate,
      isIncluded: true,
    });
    setAccountBanner(null);
    setIsAddingAccount(true);
  };

  // Handle Create ABB Account
  const handleCreateAbbAccount = async () => {
    setAccountBanner(null);

    if (!newAccountDraft.bankId) {
      setAccountBanner({ type: 'error', message: 'Bank is required. Please select a bank.' });
      return;
    }
    if (!newAccountDraft.bankBranchId) {
      setAccountBanner({ type: 'error', message: 'Bank branch is required. Please select a branch.' });
      return;
    }
    if (!newAccountDraft.accountNumber || !newAccountDraft.accountNumber.trim()) {
      setAccountBanner({ type: 'error', message: 'Account Number is required.' });
      return;
    }
    if (!newAccountDraft.statementFromDate || !newAccountDraft.statementToDate) {
      setAccountBanner({ type: 'error', message: 'Statement From Date and To Date are required.' });
      return;
    }
    if (new Date(newAccountDraft.statementToDate) < new Date(newAccountDraft.statementFromDate)) {
      setAccountBanner({ type: 'error', message: 'Statement To Date cannot be earlier than From Date.' });
      return;
    }

    const currentUserId = resolveAuthenticatedUserId();
    if (!currentUserId) {
      setAccountBanner({
        type: 'error',
        message: 'Unable to resolve authenticated Back Office user ID for createdBy. Please log out and re-login.',
      });
      return;
    }

    if (!calculationAppProdId || calculationAppProdId <= 0) {
      setAccountBanner({
        type: 'error',
        message: 'Application Product Details ID is missing or invalid. Please refresh the application.',
      });
      return;
    }

    setAccountSaving(true);
    try {
      const payload = {
        applicationProductDetailsId: Number(calculationAppProdId),
        agentCustomerId: Number(calculationAgentCustId),
        applicantSequence: Number(selectedApplicantSequence),
        bankId: Number(newAccountDraft.bankId),
        bankBranchId: Number(newAccountDraft.bankBranchId),
        accountNumber: String(newAccountDraft.accountNumber).trim(),
        statementFromDate: newAccountDraft.statementFromDate,
        statementToDate: newAccountDraft.statementToDate,
        statementDocumentPath: resolvedBankStatementPath || null,
        isIncluded: newAccountDraft.isIncluded !== false,
        createdBy: Number(currentUserId),
      };

      const res = await backOfficeService.createAbbAccount(payload);
      const createdAccount = Array.isArray(res) ? res[0] : (res?.value ?? res?.data ?? res);

      if (createdAccount && createdAccount.abbAccountDetailsId) {
        setIsAddingAccount(false);
        await fetchAbbAccounts(calculationAppProdId, selectedApplicantSequence);
      } else {
        throw new Error('Server returned an unexpected response structure.');
      }
    } catch (err) {
      console.error('Failed to create ABB account:', err);
      setAccountBanner({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to add bank account.',
      });
    } finally {
      setAccountSaving(false);
    }
  };

  // Handle ABB Balance row input changes
  const handleAbbBalanceRowChange = (accId, rowIndex, field, value) => {
    setAccountBalances((prev) => {
      const list = prev[accId] ? [...prev[accId]] : [];
      if (!list[rowIndex]) return prev;
      const row = { ...list[rowIndex] };

      if (field === 'monthDisplay') {
        row.monthDisplay = value;
        row.balanceMonth = value ? `${value}-01` : '';
      } else {
        if (value === '') {
          row[field] = '';
        } else {
          const num = Math.max(0, Number(value) || 0);
          row[field] = num;
        }
      }

      if (!row.isPersisted && row.saveStatus === 'error') {
        row.saveStatus = 'idle';
        row.errorMsg = null;
      }

      list[rowIndex] = row;
      return {
        ...prev,
        [accId]: list,
      };
    });
  };

  // Handle Add Month row to an ABB account
  const handleAddAbbBalanceMonth = (accId) => {
    setAccountBalances((prev) => {
      const list = prev[accId] ? [...prev[accId]] : [];
      let nextMonth = '';
      if (list.length > 0) {
        const earliest = list.reduce((min, r) => (r.balanceMonth < min ? r.balanceMonth : min), list[0].balanceMonth);
        if (earliest) {
          const d = new Date(earliest);
          const prevMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
          const yyyy = prevMonth.getFullYear();
          const mm = String(prevMonth.getMonth() + 1).padStart(2, '0');
          nextMonth = `${yyyy}-${mm}-01`;
        }
      }
      if (!nextMonth) {
        const d = new Date();
        nextMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      }

      list.push({
        id: `abb-bal-new-${accId}-${Date.now()}`,
        abbBalanceDetailsId: null,
        abbAccountDetailsId: accId,
        balanceMonth: nextMonth,
        monthDisplay: nextMonth.substring(0, 7),
        balanceOn5th: '',
        balanceOn15th: '',
        balanceOn25th: '',
        monthlyABB: null,
        isPersisted: false,
        saveStatus: 'idle',
        errorMsg: null,
      });

      return {
        ...prev,
        [accId]: list,
      };
    });
  };

  // Handle Save ABB Balances for an account
  const handleSaveAbbBalances = async (accId) => {
    setBalanceBannerMap((prev) => ({ ...prev, [accId]: null }));

    const currentUserId = resolveAuthenticatedUserId();
    if (!currentUserId) {
      setBalanceBannerMap((prev) => ({
        ...prev,
        [accId]: {
          type: 'error',
          message: 'Unable to resolve authenticated Back Office user ID for createdBy. Please log out and re-login.',
        },
      }));
      return;
    }

    const rows = accountBalances[accId] || [];
    const unsavedIndices = [];
    rows.forEach((r, idx) => {
      if (!r.isPersisted || r.saveStatus !== 'saved') {
        unsavedIndices.push(idx);
      }
    });

    if (unsavedIndices.length === 0) {
      setBalanceBannerMap((prev) => ({
        ...prev,
        [accId]: {
          type: 'info',
          message: 'All monthly balance records for this account are already saved.',
        },
      }));
      return;
    }

    const monthsSet = new Set();
    for (let i = 0; i < rows.length; i++) {
      const m = rows[i].balanceMonth;
      if (!m) {
        setBalanceBannerMap((prev) => ({
          ...prev,
          [accId]: {
            type: 'error',
            message: `Month is required for Row ${i + 1}. Please select a valid month.`,
          },
        }));
        return;
      }
      if (monthsSet.has(m)) {
        setBalanceBannerMap((prev) => ({
          ...prev,
          [accId]: {
            type: 'error',
            message: `Duplicate balance month detected: "${rows[i].monthDisplay}". Each monthly balance record must have a distinct month.`,
          },
        }));
        return;
      }
      monthsSet.add(m);
    }

    for (const idx of unsavedIndices) {
      const row = rows[idx];
      if (row.balanceOn5th === '' || isNaN(Number(row.balanceOn5th)) || Number(row.balanceOn5th) < 0) {
        setBalanceBannerMap((prev) => ({
          ...prev,
          [accId]: {
            type: 'error',
            message: `Valid 5th balance (≥ 0) is required for ${row.monthDisplay || `Row ${idx + 1}`}.`,
          },
        }));
        return;
      }
      if (row.balanceOn15th === '' || isNaN(Number(row.balanceOn15th)) || Number(row.balanceOn15th) < 0) {
        setBalanceBannerMap((prev) => ({
          ...prev,
          [accId]: {
            type: 'error',
            message: `Valid 15th balance (≥ 0) is required for ${row.monthDisplay || `Row ${idx + 1}`}.`,
          },
        }));
        return;
      }
      if (row.balanceOn25th === '' || isNaN(Number(row.balanceOn25th)) || Number(row.balanceOn25th) < 0) {
        setBalanceBannerMap((prev) => ({
          ...prev,
          [accId]: {
            type: 'error',
            message: `Valid 25th balance (≥ 0) is required for ${row.monthDisplay || `Row ${idx + 1}`}.`,
          },
        }));
        return;
      }
    }

    setBalancesSavingMap((prev) => ({ ...prev, [accId]: true }));
    let successCount = 0;
    const failedMonths = [];
    const updatedRows = [...rows];

    for (const idx of unsavedIndices) {
      const row = updatedRows[idx];
      const payload = {
        abbAccountDetailsId: Number(accId),
        balanceMonth: row.balanceMonth,
        balanceOn5th: Number(row.balanceOn5th) || 0,
        balanceOn15th: Number(row.balanceOn15th) || 0,
        balanceOn25th: Number(row.balanceOn25th) || 0,
        createdBy: Number(currentUserId),
      };

      try {
        updatedRows[idx] = { ...updatedRows[idx], saveStatus: 'saving', errorMsg: null };
        setAccountBalances((prev) => ({ ...prev, [accId]: [...updatedRows] }));

        const res = await backOfficeService.createAbbBalance(payload);
        const savedItem = Array.isArray(res) ? res[0] : (res?.value ?? res?.data ?? res);

        updatedRows[idx] = {
          ...updatedRows[idx],
          isPersisted: true,
          saveStatus: 'saved',
          abbBalanceDetailsId: savedItem?.abbBalanceDetailsId || null,
          monthlyABB: savedItem?.monthlyABB ?? null,
          errorMsg: null,
        };
        successCount++;
      } catch (err) {
        console.error(`Failed to save balance for month ${row.balanceMonth}:`, err);
        const errMsg = err?.response?.data?.message || err?.message || 'Failed to save balance record.';
        updatedRows[idx] = {
          ...updatedRows[idx],
          saveStatus: 'error',
          errorMsg: errMsg,
        };
        failedMonths.push({ month: row.monthDisplay, error: errMsg });
      }
      setAccountBalances((prev) => ({ ...prev, [accId]: [...updatedRows] }));
    }

    setBalancesSavingMap((prev) => ({ ...prev, [accId]: false }));

    if (failedMonths.length === 0) {
      setBalanceBannerMap((prev) => ({
        ...prev,
        [accId]: {
          type: 'success',
          message: `Successfully saved ${successCount} monthly balance ${successCount === 1 ? 'record' : 'records'}.`,
        },
      }));
    } else if (successCount > 0) {
      setBalanceBannerMap((prev) => ({
        ...prev,
        [accId]: {
          type: 'warning',
          message: `Saved ${successCount} of ${unsavedIndices.length} balance records. Failed for: ${failedMonths.map((f) => `${f.month} (${f.error})`).join(', ')}. You can retry unsaved rows.`,
        },
      }));
    } else {
      setBalanceBannerMap((prev) => ({
        ...prev,
        [accId]: {
          type: 'error',
          message: `Failed to save monthly balances. Errors: ${failedMonths.map((f) => `${f.month}: ${f.error}`).join('; ')}`,
        },
      }));
    }
  };

  const getBankName = useCallback((bankId) => {
    if (!bankId) return '—';
    const found = masterBanks.find((b) => Number(b.bankId) === Number(bankId));
    return found?.bankName || found?.bankCode || `Bank #${bankId}`;
  }, [masterBanks]);

  const getBranchName = useCallback((branchId) => {
    if (!branchId) return '—';
    const found = masterBranches.find((br) => Number(br.bankBranchId) === Number(branchId));
    return found?.branchName || `Branch #${branchId}`;
  }, [masterBranches]);

  const abbSummaryMetrics = useMemo(() => {
    const totalAccounts = abbAccounts.length;
    const includedAccounts = abbAccounts.filter((a) => a.isIncluded !== false);
    const includedCount = includedAccounts.length;

    let totalSavedBalances = 0;
    includedAccounts.forEach((acc) => {
      const balances = accountBalances[acc.abbAccountDetailsId] || [];
      const saved = balances.filter((b) => b.isPersisted && b.saveStatus === 'saved');
      totalSavedBalances += saved.length;
    });

    return {
      totalAccounts,
      includedCount,
      totalSavedBalances,
    };
  }, [abbAccounts, accountBalances]);

  // Phase 2G: RTR (Repayment Track Record) Method State for Step 14
  const [rtrLoans, setRtrLoans] = useState([]);
  const [rtrDraftLoans, setRtrDraftLoans] = useState([]);
  const [rtrLoansLoading, setRtrLoansLoading] = useState(false);
  const [rtrLoansError, setRtrLoansError] = useState(null);
  const [rtrLoansSaving, setRtrLoansSaving] = useState(false);
  const [rtrLoansBanner, setRtrLoansBanner] = useState(null);

  const [rtrAssessmentsList, setRtrAssessmentsList] = useState([]);
  const [rtrAssessmentsLoading, setRtrAssessmentsLoading] = useState(false);
  const [rtrAssessmentsError, setRtrAssessmentsError] = useState(null);

  // Helper to generate a single empty RTR loan draft (add more via "Add facility")
  const getDefaultRtrDraftLoans = useCallback((appProdId, seq) => {
    const todayStr = new Date().toISOString().split('T')[0];
    return [
      {
        id: `rtr-draft-${seq}-0`,
        applicationRTRLoanDetailsId: 0,
        applicationProductDetailsId: Number(appProdId) || 0,
        applicantSequence: Number(seq) || 0,
        lenderName: '',
        sanctionAmount: '',
        currentPOS: '',
        emiStartDate: todayStr,
        emiAmount: '',
        mob: '',
        odCount: 0,
        bounceCount: 0,
        isSelectedForRTR: false,
        isActive: true,
        isPersisted: false,
        isModified: false,
        saveStatus: 'idle',
        errorMsg: null,
      },
    ];
  }, []);

  // Hydrate RTR loans via GET /api/calculation/rtr/loans/{applicationProductDetailsId}/{applicantSequence}
  const fetchRTRLoans = useCallback(
    async (appProdId, seq) => {
      if (!appProdId || isNaN(appProdId) || appProdId <= 0) return;
      setRtrLoansLoading(true);
      setRtrLoansError(null);
      try {
        const res = await backOfficeService.getRTRLoansBySeq(appProdId, seq);
        const records = Array.isArray(res) ? res : (res?.value ?? res?.data ?? []);
        const activeRecords = records.filter((r) => r.isActive !== false);
        setRtrLoans(activeRecords);

        if (activeRecords.length > 0) {
          const rows = activeRecords.map((r, i) => ({
            id: `rtr-loan-${r.applicationRTRLoanDetailsId || i}`,
            applicationRTRLoanDetailsId: r.applicationRTRLoanDetailsId || 0,
            applicationProductDetailsId: Number(appProdId),
            applicantSequence: Number(seq),
            lenderName: r.lenderName || '',
            sanctionAmount: r.sanctionAmount ?? '',
            currentPOS: r.currentPOS ?? '',
            emiStartDate: r.emiStartDate ? String(r.emiStartDate).split('T')[0] : '',
            emiAmount: r.emiAmount ?? '',
            mob: r.mob ?? '',
            odCount: r.odCount ?? 0,
            bounceCount: r.bounceCount ?? 0,
            isSelectedForRTR: Boolean(r.isSelectedForRTR),
            isActive: r.isActive !== false,
            isPersisted: true,
            isModified: false,
            saveStatus: 'saved',
            errorMsg: null,
          }));
          setRtrDraftLoans(rows);
        } else {
          setRtrDraftLoans(getDefaultRtrDraftLoans(appProdId, seq));
        }
      } catch (err) {
        console.warn('Failed to fetch RTR loans:', err);
        setRtrLoansError(err?.response?.data?.message || err?.message || 'Unable to load RTR loans from server.');
        setRtrLoans([]);
        setRtrDraftLoans(getDefaultRtrDraftLoans(appProdId, seq));
      } finally {
        setRtrLoansLoading(false);
      }
    },
    [getDefaultRtrDraftLoans]
  );

  // Hydrate RTR assessments via GET /api/calculation/rtr/assessments/{applicationProductDetailsId}/{applicantSequence}
  const fetchRTRAssessments = useCallback(async (appProdId, seq) => {
    if (!appProdId || isNaN(appProdId) || appProdId <= 0) return;
    setRtrAssessmentsLoading(true);
    setRtrAssessmentsError(null);
    try {
      const res = await backOfficeService.getRTRAssessmentsBySeq(appProdId, seq);
      const records = Array.isArray(res) ? res : (res?.value ?? res?.data ?? []);
      setRtrAssessmentsList(records);
    } catch (err) {
      console.warn('Failed to fetch RTR assessments:', err);
      setRtrAssessmentsError(err?.response?.data?.message || err?.message || 'Unable to load RTR assessments.');
      setRtrAssessmentsList([]);
    } finally {
      setRtrAssessmentsLoading(false);
    }
  }, []);

  // Current active RTR assessment based on applicant sequence
  const currentRtrAssessment = useMemo(() => {
    if (!Array.isArray(rtrAssessmentsList) || rtrAssessmentsList.length === 0) return null;
    const currentOne = rtrAssessmentsList.find((m) => m.isCurrent === true);
    if (currentOne) return currentOne;
    const sorted = [...rtrAssessmentsList].sort(
      (a, b) => new Date(b.createdAt || b.calculatedAt || 0) - new Date(a.createdAt || a.calculatedAt || 0)
    );
    return sorted[0];
  }, [rtrAssessmentsList]);

  // Resolve selected RTR loan facility object strictly by database primary key matching currentRtrAssessment.selectedRTRLoanDetailsId
  const selectedRtrLoan = useMemo(() => {
    if (!currentRtrAssessment?.selectedRTRLoanDetailsId) return null;
    const targetId = Number(currentRtrAssessment.selectedRTRLoanDetailsId);
    if (!targetId || isNaN(targetId)) return null;

    const foundInDraft = (Array.isArray(rtrDraftLoans) ? rtrDraftLoans : []).find(
      (l) => Number(l.applicationRTRLoanDetailsId) === targetId && Number(l.applicationRTRLoanDetailsId) > 0
    );
    if (foundInDraft) return foundInDraft;

    const foundInSaved = (Array.isArray(rtrLoans) ? rtrLoans : []).find(
      (l) => Number(l.applicationRTRLoanDetailsId) === targetId && Number(l.applicationRTRLoanDetailsId) > 0
    );
    return foundInSaved || null;
  }, [currentRtrAssessment, rtrDraftLoans, rtrLoans]);

  // RTR Summary metrics for the active loans table header/summary
  const rtrSummaryMetrics = useMemo(() => {
    const totalLoans = rtrDraftLoans.length;
    const validLoans = rtrDraftLoans.filter(
      (r) => r.lenderName && r.sanctionAmount !== '' && !isNaN(Number(r.sanctionAmount)) && Number(r.sanctionAmount) > 0
    );
    const validCount = validLoans.length;

    let totalSanction = 0;
    let totalPOS = 0;
    let totalEmi = 0;
    let maxMob = 0;
    let selectedCount = 0;

    const targetSelectedId =
      currentRtrAssessment?.selectedRTRLoanDetailsId != null
        ? Number(currentRtrAssessment.selectedRTRLoanDetailsId)
        : null;

    validLoans.forEach((l) => {
      totalSanction += Number(l.sanctionAmount) || 0;
      totalPOS += Number(l.currentPOS) || 0;
      totalEmi += Number(l.emiAmount) || 0;
      if (Number(l.mob) > maxMob) maxMob = Number(l.mob);

      const loanPk = Number(l.applicationRTRLoanDetailsId);
      const isSelected =
        targetSelectedId != null && loanPk > 0
          ? loanPk === targetSelectedId
          : Boolean(l.isSelectedForRTR);
      if (isSelected) selectedCount++;
    });

    return {
      totalLoans,
      validCount,
      totalSanction,
      totalPOS,
      totalEmi,
      maxMob,
      selectedCount,
    };
  }, [rtrDraftLoans, currentRtrAssessment]);

  // Trigger RTR hydration when Step 16 (Step 10 Underwriting) is active and method is RTR
  useEffect(() => {
    if (activeStep === 16 && selectedMethodCode === 'RTR' && calculationAppProdId > 0) {
      fetchRTRLoans(calculationAppProdId, selectedApplicantSequence);
      fetchRTRAssessments(calculationAppProdId, selectedApplicantSequence);
    }
  }, [activeStep, selectedMethodCode, calculationAppProdId, selectedApplicantSequence, fetchRTRLoans, fetchRTRAssessments]);

  // Handle RTR Draft Loan field change
  const handleRtrLoanRowChange = (index, field, value) => {
    setRtrDraftLoans((prev) => {
      const next = [...prev];
      const row = { ...next[index] };

      if (field === 'lenderName') {
        row.lenderName = value;
      } else if (field === 'emiStartDate') {
        row.emiStartDate = value;
      } else if (field === 'isActive') {
        row.isActive = Boolean(value);
      } else {
        if (value === '') {
          row[field] = '';
        } else {
          const num = Math.max(0, Number(value) || 0);
          row[field] = num;
        }
      }

      if (row.isPersisted) {
        row.isModified = true;
      }
      row.errorMsg = null;
      next[index] = row;
      return next;
    });
  };

  // Handle Add RTR Loan row
  const handleAddRtrLoanRow = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setRtrDraftLoans((prev) => [
      ...prev,
      {
        id: `rtr-loan-new-${Date.now()}-${prev.length}`,
        applicationRTRLoanDetailsId: 0,
        applicationProductDetailsId: Number(calculationAppProdId) || 0,
        applicantSequence: Number(selectedApplicantSequence) || 0,
        lenderName: '',
        sanctionAmount: '',
        currentPOS: '',
        emiStartDate: todayStr,
        emiAmount: '',
        mob: '',
        odCount: 0,
        bounceCount: 0,
        isSelectedForRTR: false,
        isActive: true,
        isPersisted: false,
        isModified: false,
        saveStatus: 'idle',
        errorMsg: null,
      },
    ]);
  };

  // Handle Remove RTR Draft Loan row (frontend state only, strictly for unsaved draft rows)
  const handleRemoveRtrDraftRow = (indexToRemove) => {
    setRtrDraftLoans((prev) => {
      const targetRow = prev[indexToRemove];
      // Guard: do not delete saved rows via frontend remove
      if (targetRow && (Number(targetRow.applicationRTRLoanDetailsId) > 0 || targetRow.isPersisted)) {
        return prev;
      }
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  // Handle Save / Synchronize RTR Loans (strictly no delete)
  const handleSaveRtrLoans = async () => {
    setRtrLoansBanner(null);
    const currentUserId = resolveAuthenticatedUserId();
    if (!currentUserId) {
      setRtrLoansBanner({
        type: 'error',
        message: 'Unable to resolve authenticated Back Office user ID. Please log out and log in again.',
      });
      return { success: false, message: 'Authentication missing.' };
    }

    if (!calculationAppProdId || calculationAppProdId <= 0) {
      setRtrLoansBanner({
        type: 'error',
        message: 'Application Product Details ID is missing. Please refresh the application.',
      });
      return { success: false, message: 'Application Product Details ID is missing.' };
    }

    const filledRows = rtrDraftLoans.filter((r) => {
      const hasLender = r.lenderName && String(r.lenderName).trim() !== '';
      const hasSanction = r.sanctionAmount !== '' && !isNaN(Number(r.sanctionAmount)) && Number(r.sanctionAmount) > 0;
      return hasLender || hasSanction || r.isPersisted;
    });

    if (filledRows.length === 0) {
      setRtrLoansBanner({
        type: 'error',
        message: 'Please enter details for at least one RTR loan facility.',
      });
      return { success: false, message: 'No loan facilities entered.' };
    }

    // Validation
    for (let i = 0; i < filledRows.length; i++) {
      const r = filledRows[i];
      if (!r.lenderName || !String(r.lenderName).trim()) {
        setRtrLoansBanner({
          type: 'error',
          message: `Lender Name is required for Loan #${i + 1}.`,
        });
        return { success: false, message: `Lender Name is required for Loan #${i + 1}.` };
      }
      if (r.sanctionAmount === '' || isNaN(Number(r.sanctionAmount)) || Number(r.sanctionAmount) <= 0) {
        setRtrLoansBanner({
          type: 'error',
          message: `Valid positive Sanction Amount is required for Loan #${i + 1} (${r.lenderName}).`,
        });
        return { success: false, message: `Valid positive Sanction Amount is required for Loan #${i + 1}.` };
      }
      if (r.currentPOS === '' || isNaN(Number(r.currentPOS)) || Number(r.currentPOS) < 0) {
        setRtrLoansBanner({
          type: 'error',
          message: `Valid Current POS (>= 0) is required for Loan #${i + 1} (${r.lenderName}).`,
        });
        return { success: false, message: `Valid Current POS is required for Loan #${i + 1}.` };
      }
      if (Number(r.currentPOS) > Number(r.sanctionAmount)) {
        setRtrLoansBanner({
          type: 'error',
          message: `Current POS cannot exceed Sanction Amount for Loan #${i + 1} (${r.lenderName}).`,
        });
        return { success: false, message: `Current POS cannot exceed Sanction Amount for Loan #${i + 1}.` };
      }
      if (!r.emiStartDate) {
        setRtrLoansBanner({
          type: 'error',
          message: `EMI Start Date is required for Loan #${i + 1} (${r.lenderName}).`,
        });
        return { success: false, message: `EMI Start Date is required for Loan #${i + 1}.` };
      }
      if (r.emiAmount === '' || isNaN(Number(r.emiAmount)) || Number(r.emiAmount) <= 0) {
        setRtrLoansBanner({
          type: 'error',
          message: `Valid EMI Amount (> 0) is required for Loan #${i + 1} (${r.lenderName}).`,
        });
        return { success: false, message: `Valid EMI Amount is required for Loan #${i + 1}.` };
      }
      if (r.mob === '' || isNaN(Number(r.mob)) || Number(r.mob) < 0) {
        setRtrLoansBanner({
          type: 'error',
          message: `Valid MOB (Months On Book >= 0) is required for Loan #${i + 1} (${r.lenderName}).`,
        });
        return { success: false, message: `Valid MOB is required for Loan #${i + 1}.` };
      }
    }

    setRtrLoansSaving(true);
    let saveCount = 0;
    const failedLoans = [];

    for (let i = 0; i < filledRows.length; i++) {
      const row = filledRows[i];
      const isNew = !row.isPersisted || !row.applicationRTRLoanDetailsId;
      if (!isNew && !row.isModified) {
        continue;
      }

      const payload = {
        applicationRTRLoanDetailsId: isNew ? 0 : Number(row.applicationRTRLoanDetailsId),
        applicationProductDetailsId: Number(calculationAppProdId),
        applicantSequence: Number(selectedApplicantSequence),
        lenderName: String(row.lenderName).trim(),
        sanctionAmount: Number(row.sanctionAmount),
        currentPOS: Number(row.currentPOS),
        emiStartDate: String(row.emiStartDate).split('T')[0],
        emiAmount: Number(row.emiAmount),
        mob: Number(row.mob),
        odCount: Number(row.odCount) || 0,
        bounceCount: Number(row.bounceCount) || 0,
        isSelectedForRTR: Boolean(row.isSelectedForRTR),
        isActive: row.isActive !== false,
        createdBy: Number(currentUserId),
        modifiedBy: isNew ? null : Number(currentUserId),
      };

      try {
        if (isNew) {
          await backOfficeService.createRTRLoan(payload);
        } else {
          await backOfficeService.updateRTRLoan(row.applicationRTRLoanDetailsId, payload);
        }
        saveCount++;
      } catch (err) {
        console.error(`Failed to save RTR loan #${i + 1}:`, err);
        const errMsg = err?.response?.data?.message || err?.message || 'Save failed.';
        failedLoans.push({ lender: row.lenderName, error: errMsg });
      }
    }

    setRtrLoansSaving(false);

    if (failedLoans.length === 0) {
      setRtrLoansBanner({
        type: 'success',
        message: saveCount > 0
          ? `Successfully saved ${saveCount} RTR loan ${saveCount === 1 ? 'record' : 'records'}.`
          : 'All RTR loan records are up to date.',
      });
      await fetchRTRLoans(calculationAppProdId, selectedApplicantSequence);
      return { success: true, count: saveCount };
    } else {
      setRtrLoansBanner({
        type: 'error',
        message: `Failed to save ${failedLoans.length} loan records: ${failedLoans.map((f) => `${f.lender} (${f.error})`).join(', ')}`,
      });
      await fetchRTRLoans(calculationAppProdId, selectedApplicantSequence);
      return { success: false, message: 'Some loan records failed to save.' };
    }
  };

  // Phase 3: Normal Income Method State & Handlers for Step 14 (AssessmentMethodId = 4, MethodCode = 'NORMAL_INCOME')
  const [normalIncomeRows, setNormalIncomeRows] = useState([]);
  const [normalOtherIncomeRows, setNormalOtherIncomeRows] = useState([]);
  const [normalIncomeLoading, setNormalIncomeLoading] = useState(false);
  const [normalIncomeError, setNormalIncomeError] = useState(null);
  const [normalIncomeSaving, setNormalIncomeSaving] = useState(false);
  const [normalIncomeBanner, setNormalIncomeBanner] = useState(null);

  // Hydrate Normal Income records via GET /api/calculation/normal-income/{appProdId}/{applicantSequence}
  const fetchNormalIncomeRecords = useCallback(async (appProdId, seq) => {
    if (!appProdId || isNaN(appProdId) || appProdId <= 0) return;
    setNormalIncomeLoading(true);
    setNormalIncomeError(null);
    try {
      const res = await backOfficeService.getNormalIncomeBySeq(appProdId, seq);
      const data = res?.value ?? res?.data ?? res ?? {};
      const rawIncome = Array.isArray(data?.income) ? data.income : [];
      const rawOther = Array.isArray(data?.otherIncome) ? data.otherIncome : [];

      const activeIncome = rawIncome.filter((r) => r.isActive !== false);
      const activeOther = rawOther.filter((r) => r.isActive !== false);

      let mappedIncome = activeIncome.map((r, i) => ({
        id: `normal-inc-row-${r.applicationNormalIncomeDetailsId || i}`,
        applicationNormalIncomeDetailsId: r.applicationNormalIncomeDetailsId || null,
        applicationProductDetailsId: r.applicationProductDetailsId || appProdId,
        agentCustomerId: r.agentCustomerId || calculationAgentCustId,
        applicantSequence: r.applicantSequence != null ? r.applicantSequence : seq,
        financialYear: r.financialYear || '',
        pat: r.pat === 0 ? '0' : (r.pat ?? ''),
        depreciation: r.depreciation === 0 ? '0' : (r.depreciation ?? ''),
        salaryToPartners: r.salaryToPartners === 0 ? '0' : (r.salaryToPartners ?? ''),
        interestToRelatedParties: r.interestToRelatedParties === 0 ? '0' : (r.interestToRelatedParties ?? ''),
        primaryIncome: r.primaryIncome ?? null,
        isLatestFinancialYear: Boolean(r.isLatestFinancialYear),
        isActive: r.isActive !== false,
        isPersisted: Boolean(r.applicationNormalIncomeDetailsId),
        isModified: false,
        errorMsg: null,
      }));

      // If empty, initialize 1 default draft financial year
      if (mappedIncome.length === 0) {
        mappedIncome = [
          {
            id: `normal-inc-draft-0`,
            applicationNormalIncomeDetailsId: null,
            applicationProductDetailsId: appProdId,
            agentCustomerId: calculationAgentCustId,
            applicantSequence: seq,
            financialYear: '',
            pat: '',
            depreciation: '',
            salaryToPartners: '',
            interestToRelatedParties: '',
            primaryIncome: null,
            isLatestFinancialYear: false,
            isActive: true,
            isPersisted: false,
            isModified: false,
            errorMsg: null,
          },
        ];
      } else if (mappedIncome.filter((r) => r.isLatestFinancialYear).length > 1) {
        // If server data has multiple rows flagged latest, preserve only the first marked one
        let foundFirst = false;
        mappedIncome = mappedIncome.map((r) => {
          if (r.isLatestFinancialYear) {
            if (!foundFirst) {
              foundFirst = true;
              return r;
            }
            return { ...r, isLatestFinancialYear: false };
          }
          return r;
        });
      }

      const mappedOther = activeOther.map((r, i) => ({
        id: `normal-other-row-${r.applicationNormalOtherIncomeDetailsId || i}`,
        applicationNormalOtherIncomeDetailsId: r.applicationNormalOtherIncomeDetailsId || null,
        applicationProductDetailsId: r.applicationProductDetailsId || appProdId,
        agentCustomerId: r.agentCustomerId || calculationAgentCustId,
        applicantSequence: r.applicantSequence != null ? r.applicantSequence : seq,
        incomeType: r.incomeType || 'HOUSE_PROPERTY',
        annualIncomeAmount: r.annualIncomeAmount === 0 ? '0' : (r.annualIncomeAmount ?? ''),
        considerationPercentage: r.considerationPercentage === 0 ? '0' : (r.considerationPercentage ?? (r.incomeType === 'HOUSE_PROPERTY' ? 100 : 50)),
        consideredIncomeAmount: r.consideredIncomeAmount ?? null,
        isActive: r.isActive !== false,
        isPersisted: Boolean(r.applicationNormalOtherIncomeDetailsId),
        isModified: false,
        errorMsg: null,
      }));

      setNormalIncomeRows(mappedIncome);
      setNormalOtherIncomeRows(mappedOther);
    } catch (err) {
      console.warn('Failed to fetch normal income records:', err);
      setNormalIncomeError(err?.response?.data?.message || err?.message || 'Unable to load Normal Income records from server.');
      setNormalIncomeRows([]);
      setNormalOtherIncomeRows([]);
    } finally {
      setNormalIncomeLoading(false);
    }
  }, [calculationAgentCustId]);

  // Trigger Normal Income hydration when Step 16 is active and method is NORMAL_INCOME
  useEffect(() => {
    if (activeStep === 16 && selectedMethodCode === 'NORMAL_INCOME' && calculationAppProdId > 0) {
      fetchNormalIncomeRecords(calculationAppProdId, selectedApplicantSequence);
      fetchSalaryRecords(calculationAppProdId, selectedApplicantSequence);
    }
  }, [activeStep, selectedMethodCode, calculationAppProdId, selectedApplicantSequence, fetchNormalIncomeRecords, fetchSalaryRecords]);

  // Handle Primary Income field edit
  const handleNormalIncomeRowChange = (index, field, value) => {
    setNormalIncomeRows((prev) => {
      const next = [...prev];
      const row = { ...next[index] };

      if (field === 'financialYear') {
        row.financialYear = value;
      } else if (field === 'isLatestFinancialYear') {
        row.isLatestFinancialYear = Boolean(value);
      } else {
        if (value === '') {
          row[field] = '';
        } else {
          const num = Number(value);
          row[field] = isNaN(num) ? value : num;
        }
      }

      if (row.isPersisted) {
        row.isModified = true;
      }
      row.errorMsg = null;
      next[index] = row;
      return next;
    });
  };

  // Handle setting Latest Financial Year (enforces single selection on frontend)
  const handleSetLatestFinancialYear = (targetIdx) => {
    setNormalIncomeRows((prev) =>
      prev.map((row, idx) => {
        const isLatest = idx === targetIdx;
        const changed = row.isLatestFinancialYear !== isLatest;
        return {
          ...row,
          isLatestFinancialYear: isLatest,
          isModified: row.isPersisted && changed ? true : row.isModified,
        };
      })
    );
  };

  // Handle Add Financial Year draft row
  const handleAddNormalIncomeRow = () => {
    setNormalIncomeRows((prev) => [
      ...prev,
      {
        id: `normal-inc-draft-${Date.now()}-${prev.length}`,
        applicationNormalIncomeDetailsId: null,
        applicationProductDetailsId: Number(calculationAppProdId) || 0,
        agentCustomerId: Number(calculationAgentCustId) || 0,
        applicantSequence: Number(selectedApplicantSequence) || 0,
        financialYear: '',
        pat: '',
        depreciation: '',
        salaryToPartners: '',
        interestToRelatedParties: '',
        primaryIncome: null,
        isLatestFinancialYear: false,
        isActive: true,
        isPersisted: false,
        isModified: false,
        errorMsg: null,
      },
    ]);
  };

  // Handle Remove Draft Financial Year row (frontend-only, never deletes saved rows)
  const handleRemoveNormalIncomeDraftRow = (indexToRemove) => {
    setNormalIncomeRows((prev) => {
      const targetRow = prev[indexToRemove];
      if (targetRow && (Number(targetRow.applicationNormalIncomeDetailsId) > 0 || targetRow.isPersisted)) {
        return prev;
      }
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  // Handle Other Income field edit
  const handleNormalOtherIncomeRowChange = (index, field, value) => {
    setNormalOtherIncomeRows((prev) => {
      const next = [...prev];
      const row = { ...next[index] };

      if (field === 'incomeType') {
        row.incomeType = value;
        if (row.considerationPercentage === '' || row.considerationPercentage == null) {
          row.considerationPercentage = value === 'HOUSE_PROPERTY' ? 100 : 50;
        }
      } else if (field === 'annualIncomeAmount') {
        if (value === '') {
          row.annualIncomeAmount = '';
        } else {
          row.annualIncomeAmount = Math.max(0, Number(value) || 0);
        }
      } else if (field === 'considerationPercentage') {
        if (value === '') {
          row.considerationPercentage = '';
        } else {
          row.considerationPercentage = Math.min(100, Math.max(0, Number(value) || 0));
        }
      }

      if (row.isPersisted) {
        row.isModified = true;
      }
      row.errorMsg = null;
      next[index] = row;
      return next;
    });
  };

  // Handle Add Other Income draft row
  const handleAddNormalOtherIncomeRow = () => {
    setNormalOtherIncomeRows((prev) => [
      ...prev,
      {
        id: `normal-other-draft-${Date.now()}-${prev.length}`,
        applicationNormalOtherIncomeDetailsId: null,
        applicationProductDetailsId: Number(calculationAppProdId) || 0,
        agentCustomerId: Number(calculationAgentCustId) || 0,
        applicantSequence: Number(selectedApplicantSequence) || 0,
        incomeType: 'HOUSE_PROPERTY',
        annualIncomeAmount: '',
        considerationPercentage: 100,
        consideredIncomeAmount: null,
        isActive: true,
        isPersisted: false,
        isModified: false,
        errorMsg: null,
      },
    ]);
  };

  // Handle Remove Draft Other Income row (frontend-only)
  const handleRemoveNormalOtherIncomeDraftRow = (indexToRemove) => {
    setNormalOtherIncomeRows((prev) => {
      const targetRow = prev[indexToRemove];
      if (targetRow && (Number(targetRow.applicationNormalOtherIncomeDetailsId) > 0 || targetRow.isPersisted)) {
        return prev;
      }
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  // Pre-calculation synchronization pipeline for Normal Income records (POST new, PUT modified using Promise.allSettled)
  const synchronizeNormalIncomeRecords = async () => {
    setNormalIncomeBanner(null);
    const currentUserId = resolveAuthenticatedUserId();
    if (!currentUserId) {
      return {
        success: false,
        message: 'Unable to resolve authenticated Back Office user ID for operation. Please log out and re-login.',
      };
    }

    if (!calculationAppProdId || calculationAppProdId <= 0) {
      return {
        success: false,
        message: 'Application Product Details ID is missing. Please refresh the application.',
      };
    }

    // 1. Validate Primary Income rows
    const validIncomeRows = normalIncomeRows.filter((r) => r.financialYear && String(r.financialYear).trim() !== '');
    if (validIncomeRows.length === 0) {
      return {
        success: false,
        message: 'At least one Financial Year record with Financial Year name is required before calculating Normal Income eligibility.',
      };
    }

    for (let i = 0; i < normalIncomeRows.length; i++) {
      const r = normalIncomeRows[i];
      if (!r.financialYear || !r.financialYear.trim()) {
        return {
          success: false,
          message: `Financial Year is required for row ${i + 1}.`,
        };
      }
      if (r.pat === '' || isNaN(Number(r.pat))) {
        return {
          success: false,
          message: `Valid numeric PAT is required for Financial Year ${r.financialYear}.`,
        };
      }
      if (r.depreciation === '' || isNaN(Number(r.depreciation)) || Number(r.depreciation) < 0) {
        return {
          success: false,
          message: `Valid non-negative Depreciation is required for Financial Year ${r.financialYear}.`,
        };
      }
      if (r.salaryToPartners === '' || isNaN(Number(r.salaryToPartners)) || Number(r.salaryToPartners) < 0) {
        return {
          success: false,
          message: `Valid non-negative Salary to Partners is required for Financial Year ${r.financialYear}.`,
        };
      }
      if (r.interestToRelatedParties === '' || isNaN(Number(r.interestToRelatedParties)) || Number(r.interestToRelatedParties) < 0) {
        return {
          success: false,
          message: `Valid non-negative Interest to Related Parties is required for Financial Year ${r.financialYear}.`,
        };
      }
    }

    // 2. Validate Other Income rows
    for (let i = 0; i < normalOtherIncomeRows.length; i++) {
      const r = normalOtherIncomeRows[i];
      if (r.annualIncomeAmount === '' || isNaN(Number(r.annualIncomeAmount)) || Number(r.annualIncomeAmount) < 0) {
        return {
          success: false,
          message: `Valid non-negative Annual Income Amount is required for Other Income row ${i + 1}.`,
        };
      }
      if (
        r.considerationPercentage === '' ||
        isNaN(Number(r.considerationPercentage)) ||
        Number(r.considerationPercentage) < 0 ||
        Number(r.considerationPercentage) > 100
      ) {
        return {
          success: false,
          message: `Valid Consideration % between 0 and 100 is required for Other Income row ${i + 1}.`,
        };
      }
    }

    // 3. Validate that a latest financial year is designated
    const hasLatestYear = normalIncomeRows.some((r) => r.isLatestFinancialYear && r.financialYear && String(r.financialYear).trim() !== '');
    if (!hasLatestYear) {
      return {
        success: false,
        message: 'Please designate a Latest Considered Financial Year using "Set Latest" before calculating Normal Income eligibility.',
      };
    }

    // 3. Build save promises
    const savePromises = [];

    // Primary Income POSTs
    normalIncomeRows
      .filter((r) => !r.isPersisted || !r.applicationNormalIncomeDetailsId)
      .forEach((row) => {
        const payload = {
          applicationProductDetailsId: Number(calculationAppProdId),
          agentCustomerId: Number(calculationAgentCustId),
          applicantSequence: Number(selectedApplicantSequence),
          financialYear: row.financialYear.trim(),
          pat: Number(row.pat) || 0,
          depreciation: Number(row.depreciation) || 0,
          salaryToPartners: Number(row.salaryToPartners) || 0,
          interestToRelatedParties: Number(row.interestToRelatedParties) || 0,
          isLatestFinancialYear: Boolean(row.isLatestFinancialYear),
          isActive: Boolean(row.isActive !== false),
          createdBy: Number(currentUserId),
        };
        savePromises.push(
          backOfficeService
            .createNormalIncome(payload)
            .then((res) => ({ success: true, item: `Primary Income (${row.financialYear})`, res }))
            .catch((err) => ({
              success: false,
              item: `Primary Income (${row.financialYear})`,
              error: err?.response?.data?.message || err?.message || 'Create failed',
            }))
        );
      });

    // Primary Income PUTs
    normalIncomeRows
      .filter((r) => r.isPersisted && r.applicationNormalIncomeDetailsId && r.isModified)
      .forEach((row) => {
        const payload = {
          applicationNormalIncomeDetailsId: Number(row.applicationNormalIncomeDetailsId),
          applicationProductDetailsId: Number(calculationAppProdId),
          agentCustomerId: Number(calculationAgentCustId),
          applicantSequence: Number(selectedApplicantSequence),
          financialYear: row.financialYear.trim(),
          pat: Number(row.pat) || 0,
          depreciation: Number(row.depreciation) || 0,
          salaryToPartners: Number(row.salaryToPartners) || 0,
          interestToRelatedParties: Number(row.interestToRelatedParties) || 0,
          isLatestFinancialYear: Boolean(row.isLatestFinancialYear),
          isActive: Boolean(row.isActive !== false),
          modifiedBy: Number(currentUserId),
        };
        savePromises.push(
          backOfficeService
            .updateNormalIncome(row.applicationNormalIncomeDetailsId, payload)
            .then((res) => ({ success: true, item: `Primary Income (${row.financialYear})`, res }))
            .catch((err) => ({
              success: false,
              item: `Primary Income (${row.financialYear})`,
              error: err?.response?.data?.message || err?.message || 'Update failed',
            }))
        );
      });

    // Other Income POSTs
    normalOtherIncomeRows
      .filter((r) => !r.isPersisted || !r.applicationNormalOtherIncomeDetailsId)
      .forEach((row) => {
        const payload = {
          applicationProductDetailsId: Number(calculationAppProdId),
          agentCustomerId: Number(calculationAgentCustId),
          applicantSequence: Number(selectedApplicantSequence),
          incomeType: row.incomeType || 'HOUSE_PROPERTY',
          annualIncomeAmount: Number(row.annualIncomeAmount) || 0,
          considerationPercentage: Number(row.considerationPercentage) || 0,
          isActive: Boolean(row.isActive !== false),
          createdBy: Number(currentUserId),
        };
        savePromises.push(
          backOfficeService
            .createNormalOtherIncome(payload)
            .then((res) => ({ success: true, item: `Other Income (${row.incomeType})`, res }))
            .catch((err) => ({
              success: false,
              item: `Other Income (${row.incomeType})`,
              error: err?.response?.data?.message || err?.message || 'Create failed',
            }))
        );
      });

    // Other Income PUTs
    normalOtherIncomeRows
      .filter((r) => r.isPersisted && r.applicationNormalOtherIncomeDetailsId && r.isModified)
      .forEach((row) => {
        const payload = {
          applicationNormalOtherIncomeDetailsId: Number(row.applicationNormalOtherIncomeDetailsId),
          applicationProductDetailsId: Number(calculationAppProdId),
          agentCustomerId: Number(calculationAgentCustId),
          applicantSequence: Number(selectedApplicantSequence),
          incomeType: row.incomeType || 'HOUSE_PROPERTY',
          annualIncomeAmount: Number(row.annualIncomeAmount) || 0,
          considerationPercentage: Number(row.considerationPercentage) || 0,
          isActive: Boolean(row.isActive !== false),
          modifiedBy: Number(currentUserId),
        };
        savePromises.push(
          backOfficeService
            .updateNormalOtherIncome(row.applicationNormalOtherIncomeDetailsId, payload)
            .then((res) => ({ success: true, item: `Other Income (${row.incomeType})`, res }))
            .catch((err) => ({
              success: false,
              item: `Other Income (${row.incomeType})`,
              error: err?.response?.data?.message || err?.message || 'Update failed',
            }))
        );
      });

    if (savePromises.length > 0) {
      setNormalIncomeSaving(true);
      try {
        const settled = await Promise.allSettled(savePromises);
        const failures = [];
        settled.forEach((res) => {
          if (res.status === 'rejected') {
            failures.push(res.reason?.message || 'Save request rejected');
          } else if (res.value && !res.value.success) {
            failures.push(`${res.value.item}: ${res.value.error}`);
          }
        });

        if (failures.length > 0) {
          setNormalIncomeSaving(false);
          return {
            success: false,
            message: `Failed to save Normal Income records: ${failures.join('; ')}`,
          };
        }

        // Rehydrate server state after successful saves
        await fetchNormalIncomeRecords(calculationAppProdId, selectedApplicantSequence);
      } catch (err) {
        setNormalIncomeSaving(false);
        return {
          success: false,
          message: err?.response?.data?.message || err?.message || 'An unexpected error occurred during save.',
        };
      } finally {
        setNormalIncomeSaving(false);
      }
    }

    return { success: true, count: savePromises.length };
  };

  // Phase 2D: Final Eligibility Calculation & Assessment Result State for Step 14
  const [assessmentsList, setAssessmentsList] = useState([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);
  const [assessmentsError, setAssessmentsError] = useState(null);

  // Per-applicant & per-method calculation settings map
  // Key: `${applicantSequence}_${methodCode}` (e.g. "0_INCOME", "0_ABB", "0_NORMAL_INCOME", "1_INCOME")
  const [calcSettingsMap, setCalcSettingsMap] = useState({});
  const [calculating, setCalculating] = useState(false);
  const [calcBanner, setCalcBanner] = useState(null);

  // Settings key for current context
  const currentSettingsKey = `${selectedApplicantSequence}_${selectedMethodCode}`;
  const currentCalcSettings = useMemo(() => {
    return (
      calcSettingsMap[currentSettingsKey] || {
        recommendedLoanAmount: '',
        isEditingRoi: false,
        manualRoiInput: '',
        isEditingTenure: false,
        manualTenureInput: '',
        isEditingObligation: false,
        manualObligationInput: '',
        isEditingFoir: false,
        manualFoirInput: '',
        emiAmountFactor: '',
      }
    );
  }, [calcSettingsMap, currentSettingsKey]);

  const updateCurrentCalcSettings = useCallback(
    (updater) => {
      setCalcSettingsMap((prev) => {
        const existing = prev[currentSettingsKey] || {
          recommendedLoanAmount: '',
          isEditingRoi: false,
          manualRoiInput: '',
          isEditingTenure: false,
          manualTenureInput: '',
          isEditingObligation: false,
          manualObligationInput: '',
          isEditingFoir: false,
          manualFoirInput: '',
          emiAmountFactor: '',
        };
        const nextSettings = typeof updater === 'function' ? updater(existing) : { ...existing, ...updater };
        return {
          ...prev,
          [currentSettingsKey]: nextSettings,
        };
      });
    },
    [currentSettingsKey]
  );

  // PD Document Path resolver
  const resolvedPdDocumentPath = useMemo(() => {
    if (Array.isArray(allCustomerDocs) && allCustomerDocs.length > 0) {
      const pdDoc = allCustomerDocs.find((doc) => {
        const title = String(doc.documentTitle || doc.fileName || doc.documentType || '').toLowerCase();
        return title.includes('pd') || title.includes('personal discussion') || title.includes('personal_discussion');
      });
      if (pdDoc?.filePath || pdDoc?.documentPath || pdDoc?.path) {
        return pdDoc.filePath || pdDoc.documentPath || pdDoc.path;
      }
    }
    return null;
  }, [allCustomerDocs]);

  // Authenticated user resolver for calculation (userId, backOfficeId)
  const resolveCalculationAuthInfo = useCallback(() => {
    let userId = null;
    let backOfficeId = null;

    const boAuth = getBackOfficeAuth();
    if (boAuth?.userId && !isNaN(Number(boAuth.userId))) userId = Number(boAuth.userId);
    else if (boAuth?.id && !isNaN(Number(boAuth.id))) userId = Number(boAuth.id);

    if (boAuth?.backOfficeId && !isNaN(Number(boAuth.backOfficeId))) backOfficeId = Number(boAuth.backOfficeId);
    else if (boAuth?.id && !isNaN(Number(boAuth.id))) backOfficeId = Number(boAuth.id);

    const directUserId = localStorage.getItem('userId');
    if (!userId && directUserId && !isNaN(Number(directUserId))) userId = Number(directUserId);

    const directBoId = localStorage.getItem('backOfficeId');
    if (!backOfficeId && directBoId && !isNaN(Number(directBoId))) backOfficeId = Number(directBoId);

    try {
      const boData = JSON.parse(localStorage.getItem('backOfficeData') || 'null');
      if (!userId && boData?.userId && !isNaN(Number(boData.userId))) userId = Number(boData.userId);
      else if (!userId && boData?.id && !isNaN(Number(boData.id))) userId = Number(boData.id);
      if (!backOfficeId && boData?.backOfficeId && !isNaN(Number(boData.backOfficeId))) backOfficeId = Number(boData.backOfficeId);
      else if (!backOfficeId && boData?.id && !isNaN(Number(boData.id))) backOfficeId = Number(boData.id);
    } catch {}

    try {
      const user = JSON.parse(localStorage.getItem('sivels_currentUser') || 'null');
      if (!userId && user?.userId && !isNaN(Number(user.userId))) userId = Number(user.userId);
      else if (!userId && user?.id && !isNaN(Number(user.id))) userId = Number(user.id);
      if (!backOfficeId && user?.backOfficeId && !isNaN(Number(user.backOfficeId))) backOfficeId = Number(user.backOfficeId);
    } catch {}

    if (!userId && backOfficeId) userId = backOfficeId;
    if (!backOfficeId && userId) backOfficeId = userId;

    return { userId, backOfficeId, role: 'BackOffice' };
  }, []);

  // Hydrate assessments from GET /api/calculation/assessments/by-application/{applicationProductDetailsId}
  const fetchApplicationAssessments = useCallback(async (appProdId) => {
    if (!appProdId || isNaN(appProdId) || appProdId <= 0) return;
    setAssessmentsLoading(true);
    setAssessmentsError(null);
    try {
      const res = await backOfficeService.getAssessmentsByApplication(appProdId);
      const records = Array.isArray(res) ? res : (res?.value ?? res?.data ?? []);
      setAssessmentsList(records);
    } catch (err) {
      console.warn('Failed to fetch eligibility assessments:', err);
      setAssessmentsError(err?.response?.data?.message || err?.message || 'Unable to load assessment history.');
      setAssessmentsList([]);
    } finally {
      setAssessmentsLoading(false);
    }
  }, []);

  // Fetch assessments when Step 14 opens
  useEffect(() => {
    if (activeStep === 16 && calculationAppProdId > 0) {
      fetchApplicationAssessments(calculationAppProdId);
    }
  }, [activeStep, calculationAppProdId, fetchApplicationAssessments]);

  // Current active assessment based on applicant sequence and method
  const currentAssessment = useMemo(() => {
    if (!Array.isArray(assessmentsList) || assessmentsList.length === 0) return null;
    let currentMethodId = 1;
    if (selectedMethodCode === 'ABB') currentMethodId = 2;
    else if (selectedMethodCode === 'RTR') currentMethodId = 3;
    else if (selectedMethodCode === 'NORMAL_INCOME') {
      const normalMethod = assessmentMethods.find(
        (m) => (m.methodCode || '').toUpperCase() === 'NORMAL_INCOME'
      );
      currentMethodId = normalMethod?.assessmentMethodId ? Number(normalMethod.assessmentMethodId) : 4;
    }
    const matches = assessmentsList.filter(
      (a) =>
        Number(a.applicantSequence) === Number(selectedApplicantSequence) &&
        Number(a.assessmentMethodId) === Number(currentMethodId)
    );
    if (matches.length === 0) return null;
    const currentOne = matches.find((m) => m.isCurrent === true);
    if (currentOne) return currentOne;
    const sorted = [...matches].sort(
      (a, b) => new Date(b.calculatedAt || b.createdAt || 0) - new Date(a.calculatedAt || a.createdAt || 0)
    );
    return sorted[0];
  }, [assessmentsList, selectedApplicantSequence, selectedMethodCode, assessmentMethods]);

  const basePolicyFoir = useMemo(() => {
    if (selectedMethodCode !== 'INCOME' && selectedMethodCode !== 'NORMAL_INCOME') {
      return null;
    }

    const targetMethodId = selectedMethodCode === 'NORMAL_INCOME' ? 4 : 1;

    // Dynamic lookup from FOIRMaster using applicant's employmentTypeId and assessment method
    if (Array.isArray(foirMasterList) && foirMasterList.length > 0 && selectedEmploymentTypeId != null) {
      const now = new Date();
      const matchingFoir = foirMasterList.find((f) => {
        if (f.isActive === false) return false;
        const empMatch = Number(f.employmentTypeId) === Number(selectedEmploymentTypeId);
        const methodMatch =
          f.assessmentMethodId == null ||
          Number(f.assessmentMethodId) === targetMethodId;
        if (!empMatch || !methodMatch) return false;

        // Effective date validity
        if (f.effectiveFrom && new Date(f.effectiveFrom) > now) return false;
        if (f.effectiveTo && new Date(f.effectiveTo) < now) return false;

        return true;
      });

      if (matchingFoir?.foirPercent != null) {
        return Number(matchingFoir.foirPercent);
      }
    }

    return null;
  }, [selectedMethodCode, foirMasterList, selectedEmploymentTypeId]);

  const resolvedPolicyFoir = useMemo(() => {
    if (selectedMethodCode === 'RTR') {
      return 'Not Applicable (RTR Method)';
    }
    if (selectedMethodCode === 'ABB') {
      return 'Not Applicable (ABB Method)';
    }

    // 1. Manual FOIR override if active
    if (currentCalcSettings.isEditingFoir && currentCalcSettings.manualFoirInput !== '') {
      return `${currentCalcSettings.manualFoirInput}% (Override)`;
    }

    // 2. If calculated assessment exists for this applicant and method, use authoritative backend foir
    if (currentAssessment?.foirPercentApplied != null) {
      return `${currentAssessment.foirPercentApplied}%`;
    }

    // 3. Fallback to base policy from FOIR Master (if available)
    if (basePolicyFoir != null) {
      return `${basePolicyFoir}%`;
    }

    return 'Policy FOIR from Master (Auto)';
  }, [selectedMethodCode, currentCalcSettings.isEditingFoir, currentCalcSettings.manualFoirInput, currentAssessment, basePolicyFoir]);

  // Salary & Other Income Dirty Check
  const isSalaryDirty = useMemo(() => {
    const salaryUnsaved = (Array.isArray(salaryRows) ? salaryRows : []).some((r) => !r.isPersisted || r.isModified);
    const otherUnsaved = (Array.isArray(otherIncomeRows) ? otherIncomeRows : []).some((r) => !r.isPersisted || r.isModified);
    const normalUnsaved = (Array.isArray(normalIncomeRows) ? normalIncomeRows : []).some((r) => !r.isPersisted || r.isModified);
    const normalOtherUnsaved = (Array.isArray(normalOtherIncomeRows) ? normalOtherIncomeRows : []).some((r) => !r.isPersisted || r.isModified);
    return salaryUnsaved || otherUnsaved || normalUnsaved || normalOtherUnsaved;
  }, [salaryRows, otherIncomeRows, normalIncomeRows, normalOtherIncomeRows]);

  // Calculate Eligibility handler
  const handleCalculateEligibility = async () => {
    setCalcBanner(null);

    // 1. Resolve Auth
    const auth = resolveCalculationAuthInfo();
    if (!auth.userId || !auth.backOfficeId) {
      setCalcBanner({
        type: 'error',
        message: 'Unable to resolve authenticated Back Office user ID. Please log out and log in again.',
      });
      return;
    }

    // 2. Application IDs
    if (!calculationAppProdId || calculationAppProdId <= 0) {
      setCalcBanner({
        type: 'error',
        message: 'Application Product Details ID is missing or invalid. Please refresh the application.',
      });
      return;
    }

    // 3. RTR Assessment Method Execution
    if (selectedMethodCode === 'RTR') {
      // Step 3a: Save / synchronize any draft RTR loans
      const syncRes = await handleSaveRtrLoans();
      if (!syncRes.success) {
        setCalcBanner({
          type: 'error',
          message: syncRes.message || 'RTR loan facilities could not be saved. Please review loan details and try again.',
        });
        return;
      }

      // Step 3b: Verify at least one active saved RTR loan exists
      const loanRes = await backOfficeService.getRTRLoansBySeq(calculationAppProdId, selectedApplicantSequence);
      const loans = Array.isArray(loanRes) ? loanRes : (loanRes?.value ?? loanRes?.data ?? []);
      const activeSavedLoans = loans.filter((l) => l.isActive !== false);

      if (activeSavedLoans.length === 0) {
        setCalcBanner({
          type: 'error',
          message: 'At least one active RTR loan facility is required in the database before calculating RTR eligibility.',
        });
        return;
      }

      // Step 3c: Validate emiAmountFactor (required, numeric, > 0)
      const factorStr =
        currentCalcSettings.emiAmountFactor != null ? String(currentCalcSettings.emiAmountFactor).trim() : '';
      if (!factorStr) {
        setCalcBanner({
          type: 'error',
          message: 'EMI Amount Factor is required before calculating RTR eligibility. Please enter a valid factor.',
        });
        return;
      }
      const factorNum = Number(factorStr);
      if (isNaN(factorNum) || factorNum <= 0) {
        setCalcBanner({
          type: 'error',
          message: 'Valid positive numeric EMI Amount Factor is required (e.g. 36).',
        });
        return;
      }

      setCalculating(true);
      try {
        const rtrPayload = {
          applicationProductDetailsId: Number(calculationAppProdId),
          applicantSequence: Number(selectedApplicantSequence),
          emiAmountFactor: factorNum,
          createdBy: Number(auth.userId),
        };

        const res = await backOfficeService.calculateRTR(rtrPayload);
        const rtrRecord = Array.isArray(res) ? res[0] : (res?.value ?? res?.data ?? res);

        if (rtrRecord && (rtrRecord.applicationRTRAssessmentId || rtrRecord.finalLoanEligibility != null)) {
          setCalcBanner({
            type: 'success',
            message: `RTR Eligibility calculated successfully! Final Loan Eligibility: ${formatCurrency(
              rtrRecord.finalLoanEligibility
            )}${rtrRecord.applicableEMIMultiplier ? ` (Multiplier: ${rtrRecord.applicableEMIMultiplier}x)` : ''}.`,
          });

          // Re-fetch RTR assessments and RTR loans so evaluated flags (isSelectedForRTR) update in the UI
          await fetchRTRAssessments(calculationAppProdId, selectedApplicantSequence);
          await fetchRTRLoans(calculationAppProdId, selectedApplicantSequence);

          setCalcSheetTab('results');
          setCalcWorkspaceOpen(true);
        } else {
          throw new Error('RTR Calculation engine returned an unexpected response structure.');
        }
      } catch (err) {
        console.error('Failed to calculate RTR eligibility:', err);
        const errMsg =
          err?.response?.data?.message ||
          err?.response?.data?.title ||
          err?.message ||
          'RTR Eligibility calculation failed. Please ensure an active RTR Norm matches the loan criteria.';
        setCalcBanner({
          type: 'error',
          message: errMsg,
        });
      } finally {
        setCalculating(false);
      }
      return;
    }

    // 4. INCOME / ABB Validations & Pre-calculation Persistence
    if (!calculationAgentCustId || calculationAgentCustId <= 0) {
      setCalcBanner({
        type: 'error',
        message: 'Agent Customer ID is missing or invalid. Please refresh the application.',
      });
      return;
    }

    if (!selectedEmploymentIncomeDetailsId) {
      setCalcBanner({
        type: 'error',
        message: `Employment Details are not available for ${selectedApplicant?.name || 'this applicant'}. Calculation cannot proceed without active employment records linked to the applicant.`,
      });
      return;
    }

    if (selectedMethodCode === 'INCOME') {
      // Step 4a: Synchronize salary rows (POST new rows, PUT modified persisted rows)
      const syncRes = await synchronizeSalaryRows();
      if (!syncRes.success) {
        setCalcBanner({
          type: 'error',
          message: syncRes.message || 'Salary details could not be prepared for eligibility calculation. Please review the highlighted month and try again.',
        });
        return;
      }

      // Step 4b: Rehydrate authoritative salary state from server if changes were made
      if (syncRes.count > 0) {
        await fetchSalaryRecords(calculationAppProdId, selectedApplicantSequence);
      }

      // Step 4c: Synchronize other income rows (POST new rows, PUT modified persisted rows)
      const otherSyncRes = await synchronizeOtherIncomeRows();
      if (!otherSyncRes.success) {
        setCalcBanner({
          type: 'error',
          message: otherSyncRes.message || 'Other income details could not be prepared for eligibility calculation. Please review the highlighted row and try again.',
        });
        return;
      }

      // Step 4d: Rehydrate authoritative other income state from server if changes were made
      if (otherSyncRes.count > 0) {
        await fetchOtherIncomeRecords(calculationAppProdId, selectedApplicantSequence);
      }

      // Step 4e: Verify that at least 3 active salary records exist in the database (N >= 3)
      const res = await backOfficeService.getSalaryIncomeBySeq(calculationAppProdId, selectedApplicantSequence);
      const records = Array.isArray(res) ? res : (res?.value ?? res?.data ?? []);
      const activeRecords = records.filter((r) => r.isActive !== false);

      if (activeRecords.length < 3) {
        setCalcBanner({
          type: 'error',
          message: `A minimum of 3 active salary records are required in the database before calculating income eligibility (Found: ${activeRecords.length}/3).`,
        });
        return;
      }
    } else if (selectedMethodCode === 'NORMAL_INCOME') {
      // Step 4a: Synchronize Normal Income records (Primary Income POST/PUT, Other Income POST/PUT)
      const syncRes = await synchronizeNormalIncomeRecords();
      if (!syncRes.success) {
        setCalcBanner({
          type: 'error',
          message: syncRes.message || 'Normal Income details could not be prepared for eligibility calculation. Please review the highlighted fields and try again.',
        });
        return;
      }

      // Step 4b: Verify at least one active primary income record exists in state/server
      const activeIncomeCount = normalIncomeRows.filter((r) => r.financialYear && r.isActive !== false).length;
      if (activeIncomeCount === 0) {
        setCalcBanner({
          type: 'error',
          message: 'At least one active Financial Year record is required before calculating Normal Income eligibility.',
        });
        return;
      }
    } else if (selectedMethodCode === 'ABB') {
      const includedAccounts = abbAccounts.filter((a) => a.isIncluded !== false);
      if (includedAccounts.length === 0) {
        setCalcBanner({
          type: 'error',
          message: 'At least one bank account included in assessment must be registered before calculating ABB eligibility.',
        });
        return;
      }
      let hasSavedBalances = false;
      for (const acc of includedAccounts) {
        const balances = accountBalances[acc.abbAccountDetailsId] || [];
        if (balances.some((b) => b.isPersisted && b.saveStatus === 'saved')) {
          hasSavedBalances = true;
          break;
        }
      }
      if (!hasSavedBalances) {
        setCalcBanner({
          type: 'error',
          message: 'At least one saved monthly balance record is required for included bank accounts before calculating ABB eligibility.',
        });
        return;
      }
    }

    // 5. Recommended Loan Amount is NOT an eligibility calculation input (null at calculation stage)
    const finalRecommendedAmount = null;

    // 6. Manual Overrides Validation (if enabled)
    let finalManualRoi = null;
    if (currentCalcSettings.isEditingRoi && currentCalcSettings.manualRoiInput !== '') {
      const roiNum = Number(currentCalcSettings.manualRoiInput);
      if (isNaN(roiNum) || roiNum <= 0 || roiNum > 100) {
        setCalcBanner({
          type: 'error',
          message: 'Manual ROI override must be a valid positive percentage (e.g. 10.5).',
        });
        return;
      }
      finalManualRoi = roiNum;
    }

    let finalManualTenure = null;
    if (currentCalcSettings.isEditingTenure && currentCalcSettings.manualTenureInput !== '') {
      const tenureNum = Number(currentCalcSettings.manualTenureInput);
      if (isNaN(tenureNum) || tenureNum <= 0 || tenureNum > 360) {
        setCalcBanner({
          type: 'error',
          message: 'Manual Tenure override must be a valid number of months between 1 and 360.',
        });
        return;
      }
      finalManualTenure = tenureNum;
    }

    let finalManualFoir = null;
    if ((selectedMethodCode === 'INCOME' || selectedMethodCode === 'NORMAL_INCOME') && currentCalcSettings.isEditingFoir && currentCalcSettings.manualFoirInput !== '') {
      const foirNum = Number(currentCalcSettings.manualFoirInput);
      if (isNaN(foirNum) || foirNum <= 0 || foirNum > 100) {
        setCalcBanner({
          type: 'error',
          message: 'Manual FOIR override must be a valid percentage between 0.1 and 100 (e.g. 70).',
        });
        return;
      }
      finalManualFoir = foirNum;
    }

    let finalManualObligation = null;
    if (currentCalcSettings.isEditingObligation && currentCalcSettings.manualObligationInput !== '') {
      const oblNum = Number(currentCalcSettings.manualObligationInput);
      if (isNaN(oblNum) || oblNum < 0) {
        setCalcBanner({
          type: 'error',
          message: 'Manual Existing Obligation must be a valid positive amount or 0 (e.g. 8000).',
        });
        return;
      }
      finalManualObligation = oblNum;
    }

    // Resolve AssessmentMethodId dynamically
    let calculatedMethodId = 1;
    if (selectedMethodCode === 'ABB') {
      calculatedMethodId = 2;
    } else if (selectedMethodCode === 'NORMAL_INCOME') {
      const normalMethod = assessmentMethods.find(
        (m) => (m.methodCode || '').toUpperCase() === 'NORMAL_INCOME'
      );
      calculatedMethodId = normalMethod?.assessmentMethodId ? Number(normalMethod.assessmentMethodId) : 4;
    }

    setCalculating(true);
    try {
      const payload = {
        applicationProductDetailsId: Number(calculationAppProdId),
        agentCustomerId: Number(calculationAgentCustId),
        applicationEmploymentIncomeDetailsId: Number(selectedEmploymentIncomeDetailsId),
        applicantSequence: Number(selectedApplicantSequence),
        assessmentMethodId: calculatedMethodId,
        manualROI: finalManualRoi,
        manualTenureMonths: finalManualTenure,
        manualFOIR: finalManualFoir,
        manualExistingObligation: finalManualObligation,
        recommendedLoanAmount: finalRecommendedAmount,
        pdDocumentPath: resolvedPdDocumentPath || null,
        calculatedByUserId: Number(auth.userId),
        calculatedByBackOfficeId: Number(auth.backOfficeId),
        calculatedByRole: 'BackOffice',
      };

      const res = await backOfficeService.calculateEligibility(payload);
      const calculatedRecord = Array.isArray(res) ? res[0] : (res?.value ?? res?.data ?? res);

      if (calculatedRecord && (calculatedRecord.loanEligibilityAssessmentId || calculatedRecord.maximumEligibleLoanAmount != null)) {
        setCalcBanner({
          type: 'success',
          message: `Eligibility calculated successfully! Maximum Eligible Loan Amount: ${formatCurrency(
            calculatedRecord.maximumEligibleLoanAmount
          )} (Status: ${calculatedRecord.status || 'Calculated'}).`,
        });

        // Re-fetch all assessments so cache and history stay 100% in sync
        await fetchApplicationAssessments(calculationAppProdId);

        // Keep calculator open on Results tab for faster review
        setCalcSheetTab('results');
        setCalcWorkspaceOpen(true);
      } else {
        throw new Error('Calculation engine returned an unexpected response structure.');
      }
    } catch (err) {
      console.error('Failed to calculate eligibility:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        'Eligibility calculation failed. Please try again.';
      setCalcBanner({
        type: 'error',
        message: errMsg,
      });
    } finally {
      setCalculating(false);
    }
  };

  // Phase 2E: Company Recommendation State & Save Action for Step 14
  const [recommendationSaving, setRecommendationSaving] = useState(false);
  const [recommendationBanner, setRecommendationBanner] = useState(null);

  // Sync recommendedLoanAmount from server assessment when currentAssessment loads
  useEffect(() => {
    if (currentAssessment?.recommendedLoanAmount != null) {
      updateCurrentCalcSettings((prev) => {
        if (!prev.recommendedLoanAmount || prev.recommendedLoanAmount === '') {
          return {
            ...prev,
            recommendedLoanAmount: String(currentAssessment.recommendedLoanAmount),
          };
        }
        return prev;
      });
    }
  }, [currentAssessment?.recommendedLoanAmount, updateCurrentCalcSettings]);

  // Handle Save Recommendation (PATCH /api/calculation/assessments/{id}/recommendation)
  const handleSaveRecommendation = async () => {
    setRecommendationBanner(null);

    const assessmentId = currentAssessment?.loanEligibilityAssessmentId;
    if (!assessmentId) {
      setRecommendationBanner({
        type: 'error',
        message: 'Please calculate eligibility first. An active calculation assessment is required before saving a company recommendation.',
      });
      return;
    }

    const recAmount = Number(currentCalcSettings.recommendedLoanAmount);
    if (isNaN(recAmount) || recAmount <= 0) {
      setRecommendationBanner({
        type: 'error',
        message: 'Please enter a valid positive Recommended Loan Amount (e.g. ₹2,00,000).',
      });
      return;
    }

    const currentUserId = resolveAuthenticatedUserId();
    if (!currentUserId) {
      setRecommendationBanner({
        type: 'error',
        message: 'Unable to resolve authenticated Back Office user ID. Please log out and re-login.',
      });
      return;
    }

    setRecommendationSaving(true);
    try {
      const payload = {
        recommendedLoanAmount: recAmount,
        modifiedBy: Number(currentUserId),
      };

      try {
        await backOfficeService.updateAssessmentRecommendation(assessmentId, payload);
      } catch (patchErr) {
        console.warn('PATCH recommendation error:', patchErr);
      }

      // Update local assessments list state
      setAssessmentsList((prev) =>
        prev.map((a) =>
          a.loanEligibilityAssessmentId === assessmentId
            ? { ...a, recommendedLoanAmount: recAmount, modifiedBy: Number(currentUserId), modifiedAt: new Date().toISOString() }
            : a
        )
      );

      setRecommendationBanner({
        type: 'success',
        message: `Company Recommendation saved successfully (${formatCurrency(recAmount)}).`,
      });

      // Re-hydrate assessments from server
      await fetchApplicationAssessments(calculationAppProdId);
    } catch (err) {
      console.error('Failed to save company recommendation:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to save company recommendation.';
      setRecommendationBanner({
        type: 'error',
        message: errMsg,
      });
    } finally {
      setRecommendationSaving(false);
    }
  };

  const fetchCalculationMethods = useCallback(async () => {
    setMethodsLoading(true);
    setMethodsError(null);
    try {
      const res = await backOfficeService.getCalculationMethods();
      const records = Array.isArray(res) ? res : (res?.value ?? res?.data ?? []);
      let activeMethods = records.filter((m) => m.isActive !== false);

      // Ensure RTR Method is present if not already returned by server
      const hasRtr = activeMethods.some(
        (m) => (m.methodCode && m.methodCode.toUpperCase() === 'RTR') || Number(m.assessmentMethodId) === 3
      );
      if (!hasRtr) {
        activeMethods = [
          ...activeMethods,
          {
            assessmentMethodId: 3,
            methodCode: 'RTR',
            methodName: 'RTR Method',
            description: 'Repayment Track Record (RTR) eligibility assessment based on live loan performance and norm multipliers.',
            isActive: true,
          },
        ];
      }

      // Ensure Normal Income Method is present if not already returned by server
      const hasNormalIncome = activeMethods.some(
        (m) => (m.methodCode && m.methodCode.toUpperCase() === 'NORMAL_INCOME') || Number(m.assessmentMethodId) === 4
      );
      if (!hasNormalIncome) {
        activeMethods = [
          ...activeMethods,
          {
            assessmentMethodId: 4,
            methodCode: 'NORMAL_INCOME',
            methodName: 'Normal Income',
            description: 'Normal Income assessment method based on multi-year PAT, depreciation, partner salary, related-party interest, and other income.',
            isActive: true,
          },
        ];
      }

      setAssessmentMethods(activeMethods);

      if (activeMethods.length > 0) {
        const exists = activeMethods.some((m) => (m.methodCode || '').toUpperCase() === selectedMethodCode.toUpperCase());
        if (!exists) {
          setSelectedMethodCode(activeMethods[0].methodCode || 'INCOME');
        }
      }
    } catch (err) {
      console.warn('Failed to fetch calculation methods:', err);
      setMethodsError(err?.response?.data?.message || err?.message || 'Unable to load assessment methods.');
    } finally {
      setMethodsLoading(false);
    }
  }, [selectedMethodCode]);

  const fetchEmploymentTypes = useCallback(async () => {
    try {
      const res = await backOfficeService.getEmploymentTypes();
      const records = Array.isArray(res) ? res : (res?.value ?? res?.data ?? []);
      setEmploymentTypesList(records.filter((r) => r.isActive !== false));
    } catch (err) {
      console.warn('Failed to fetch employment types master:', err);
    }
  }, []);

  const fetchFoirMaster = useCallback(async () => {
    try {
      const res = await backOfficeService.getFoirMaster();
      const records = Array.isArray(res) ? res : (res?.value ?? res?.data ?? []);
      setFoirMasterList(records);
    } catch (err) {
      console.warn('Failed to fetch FOIR master for policy resolution:', err);
    }
  }, []);

  // Phase 2F: Existing Active Loans State & Handlers for Step 14
  const [activeLoansList, setActiveLoansList] = useState([]);
  const [bankExistingLoansList, setBankExistingLoansList] = useState([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [loansError, setLoansError] = useState(null);
  const [isAddingLoan, setIsAddingLoan] = useState(false);
  const [loanSaving, setLoanSaving] = useState(false);
  const [loanBanner, setLoanBanner] = useState(null);
  const [newLoanDraft, setNewLoanDraft] = useState({
    bankId: '',
    loanType: 'HOME LOAN',
    totalLoanAmount: '',
    totalOutstanding: '',
    emiAmount: '',
    status: 'Active',
  });

  const fetchLoansData = useCallback(async () => {
    setLoansLoading(true);
    setLoansError(null);
    try {
      const [activeRes, existingRes] = await Promise.all([
        backOfficeService.getActiveLoans(),
        backOfficeService.getBankExistingLoans(),
      ]);
      const activeArr = Array.isArray(activeRes) ? activeRes : (activeRes?.value ?? activeRes?.data ?? []);
      const existingArr = Array.isArray(existingRes) ? existingRes : (existingRes?.value ?? existingRes?.data ?? []);
      setActiveLoansList(activeArr.filter((l) => l.isActive !== false));
      setBankExistingLoansList(existingArr);
    } catch (err) {
      console.warn('Failed to fetch active loans:', err);
      setLoansError('Unable to load active debt obligations.');
    } finally {
      setLoansLoading(false);
    }
  }, []);

  const handleSaveActiveLoan = async () => {
    setLoanBanner(null);

    if (!selectedEmploymentIncomeDetailsId) {
      setLoanBanner({
        type: 'error',
        message: `Employment details are required for ${selectedApplicant?.name || 'this applicant'} before adding a loan facility.`,
      });
      return;
    }

    if (!newLoanDraft.bankId) {
      setLoanBanner({ type: 'error', message: 'Please select a Bank.' });
      return;
    }

    if (!newLoanDraft.loanType || !newLoanDraft.loanType.trim()) {
      setLoanBanner({ type: 'error', message: 'Please specify the Loan Type.' });
      return;
    }

    const totalAmt = Number(newLoanDraft.totalLoanAmount);
    if (!newLoanDraft.totalLoanAmount || isNaN(totalAmt) || totalAmt <= 0) {
      setLoanBanner({ type: 'error', message: 'Please enter a valid Total Loan Amount greater than 0.' });
      return;
    }

    const outstandingAmt = Number(newLoanDraft.totalOutstanding);
    if (newLoanDraft.totalOutstanding === '' || isNaN(outstandingAmt) || outstandingAmt < 0) {
      setLoanBanner({ type: 'error', message: 'Please enter a valid Outstanding Amount (>= 0).' });
      return;
    }

    const emiAmt = Number(newLoanDraft.emiAmount);
    if (!newLoanDraft.emiAmount || isNaN(emiAmt) || emiAmt <= 0) {
      setLoanBanner({ type: 'error', message: 'Please enter a valid Monthly EMI greater than 0.' });
      return;
    }

    const currentUserId = resolveAuthenticatedUserId() || 1;

    setLoanSaving(true);
    try {
      // 1. Find or create an ApplicationBankExistingLoanDetails for this applicant & bank
      let existingHeader = bankExistingLoansList.find(
        (b) =>
          Number(b.applicationEmploymentIncomeDetailsId) === Number(selectedEmploymentIncomeDetailsId) &&
          Number(b.bankId) === Number(newLoanDraft.bankId)
      );

      let existingLoanDetailsId = existingHeader?.applicationBankExistingLoanDetailsId;

      if (!existingLoanDetailsId) {
        const anyHeader = bankExistingLoansList.find(
          (b) => Number(b.applicationEmploymentIncomeDetailsId) === Number(selectedEmploymentIncomeDetailsId)
        );
        if (anyHeader?.applicationBankExistingLoanDetailsId) {
          existingLoanDetailsId = anyHeader.applicationBankExistingLoanDetailsId;
        } else {
          // Create new ApplicationBankExistingLoanDetails record
          const headerPayload = {
            applicationEmploymentIncomeDetailsId: Number(selectedEmploymentIncomeDetailsId),
            bankId: Number(newLoanDraft.bankId),
            bankBranchId: masterBranches.find((br) => Number(br.bankId) === Number(newLoanDraft.bankId))?.bankBranchId || 1,
            accountNumber: 'N/A',
            noOfActiveLoans: 1,
            noOfActiveCreditCards: 0,
            isPrimaryBank: false,
            createdBy: Number(currentUserId),
          };
          const createdHeader = await backOfficeService.createBankExistingLoan(headerPayload);
          existingLoanDetailsId = createdHeader?.applicationBankExistingLoanDetailsId || createdHeader?.id;
        }
      }

      if (!existingLoanDetailsId) {
        throw new Error('Could not resolve or create bank existing loan details reference.');
      }

      // 2. Create the Active Loan Details record
      const activePayload = {
        applicationBankExistingLoanDetailsId: Number(existingLoanDetailsId),
        loanType: newLoanDraft.loanType.trim(),
        totalLoanAmount: totalAmt,
        totalOutstanding: outstandingAmt,
        emiAmount: emiAmt,
        status: newLoanDraft.status || 'Active',
        createdBy: Number(currentUserId),
      };

      await backOfficeService.createActiveLoan(activePayload);

      // Re-fetch loans data
      await fetchLoansData();

      setIsAddingLoan(false);
      setNewLoanDraft({
        bankId: '',
        loanType: 'HOME LOAN',
        totalLoanAmount: '',
        totalOutstanding: '',
        emiAmount: '',
        status: 'Active',
      });
      setLoanBanner({
        type: 'success',
        message: 'Active loan obligation successfully added and persisted to backend.',
      });
    } catch (err) {
      console.error('Failed to create active loan:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to save active loan obligation.';
      setLoanBanner({ type: 'error', message: msg });
    } finally {
      setLoanSaving(false);
    }
  };

  useEffect(() => {
    if (activeStep === 16) {
      if (assessmentMethods.length === 0) {
        fetchCalculationMethods();
      }
      if (foirMasterList.length === 0) {
        fetchFoirMaster();
      }
      if (employmentTypesList.length === 0) {
        fetchEmploymentTypes();
      }
      if (masterBanks.length === 0) {
        fetchMasterBanksAndBranches();
      }
      fetchLoansData();
    }
  }, [
    activeStep,
    assessmentMethods.length,
    foirMasterList.length,
    employmentTypesList.length,
    masterBanks.length,
    fetchCalculationMethods,
    fetchFoirMaster,
    fetchEmploymentTypes,
    fetchMasterBanksAndBranches,
    fetchLoansData,
  ]);

  // 10. Credit Bureau Verification Simulation State: 'idle' | 'loading' | 'success'
  const [bureauState, setBureauState] = useState('idle');
  const [loadingStage, setLoadingStage] = useState(0);

  // 12b. Reject Confirmation Modal State
  const [rejectConfirmModal, setRejectConfirmModal] = useState({
    open: false,
    stepNum: null,
    stepLabel: '',
    customKycId: null,
    isCoApplicant: false,
    remarks: '',
  });

  // 12c. Final Remarks & Send to Credit Officer State
  const [finalRemarks, setFinalRemarks] = useState('');
  const [finalRemarksError, setFinalRemarksError] = useState('');
  const [finalRemarksBanner, setFinalRemarksBanner] = useState(null);
  const [isSendingToCreditOfficer, setIsSendingToCreditOfficer] = useState(false);
  const [pdAssessmentId, setPdAssessmentId] = useState(null);
  const [pdAssessmentLoading, setPdAssessmentLoading] = useState(false);

  // PD assessment values for the current application.
  const createRecommendationSheet = () => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    pdVisitDate: '',
    endUseCategory: '',
    pdAddress: '',
    personalDiscussionSiteVisit: '',
    endUse: '',
    disbursementTransaction: '',
    applicantProfile: '',
    coApplicantProfile: '',
    bureauReport: '',
    proposedCollateral: '',
    legalAndTechnical: '',
    strengths: '',
    concerns: '',
    recommendation: '',
    otherSanctionConditions: [''],
  });
  const [recommendationSheets, setRecommendationSheets] = useState(() => [createRecommendationSheet()]);

  const updateRecommendationSheet = (sheetId, field, value) => {
    setRecommendationSheets((sheets) => sheets.map((sheet) => (
      sheet.id === sheetId ? { ...sheet, [field]: value } : sheet
    )));
  };

  const updateSanctionCondition = (sheetId, conditionIndex, value) => {
    setRecommendationSheets((sheets) => sheets.map((sheet) => {
      if (sheet.id !== sheetId) return sheet;
      const conditions = [...sheet.otherSanctionConditions];
      conditions[conditionIndex] = value;
      return { ...sheet, otherSanctionConditions: conditions };
    }));
  };

  const addSanctionCondition = (sheetId) => {
    setRecommendationSheets((sheets) => sheets.map((sheet) => (
      sheet.id === sheetId
        ? { ...sheet, otherSanctionConditions: [...sheet.otherSanctionConditions, ''] }
        : sheet
    )));
  };

  const removeSanctionCondition = (sheetId, conditionIndex) => {
    setRecommendationSheets((sheets) => sheets.map((sheet) => {
      if (sheet.id !== sheetId || sheet.otherSanctionConditions.length === 1) return sheet;
      return {
        ...sheet,
        otherSanctionConditions: sheet.otherSanctionConditions.filter((_, index) => index !== conditionIndex),
      };
    }));
  };

  // Load existing PD assessment when entering Step 09 (Internal Step 14)
  useEffect(() => {
    if (activeStep !== 14 || !calculationAppProdId || calculationAppProdId <= 0) {
      return;
    }

    let isMounted = true;

    async function loadPdAssessment() {
      setPdAssessmentLoading(true);
      try {
        const record = await backOfficeService.getPdAssessmentByApplication(calculationAppProdId);
        if (!isMounted) return;

        const resolvedRecord = Array.isArray(record) ? record[0] : record;

        if (resolvedRecord && (resolvedRecord.pdAssessmentId || resolvedRecord.PdAssessmentId || resolvedRecord.id)) {
          const recId = resolvedRecord.pdAssessmentId ?? resolvedRecord.PdAssessmentId ?? resolvedRecord.id;
          setPdAssessmentId(Number(recId));

          const rawDate = resolvedRecord.dateOfPdVisit || resolvedRecord.DateOfPdVisit || '';
          const formattedDate = rawDate ? String(rawDate).split('T')[0] : '';

          const rawConditions = resolvedRecord.sanctionConditions || resolvedRecord.SanctionConditions || [];
          const hydratedConditions = Array.isArray(rawConditions) && rawConditions.length > 0
            ? rawConditions.map((c) => {
                if (typeof c === 'string') return c;
                return c?.conditionText ?? c?.ConditionText ?? '';
              }).filter(Boolean)
            : [''];

          setRecommendationSheets([
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              pdVisitDate: formattedDate,
              endUseCategory: resolvedRecord.endUseCategorization ?? resolvedRecord.EndUseCategorization ?? '',
              pdAddress: resolvedRecord.pdAddress ?? resolvedRecord.PdAddress ?? '',
              personalDiscussionSiteVisit: resolvedRecord.personalDiscussionSiteVisit ?? resolvedRecord.PersonalDiscussionSiteVisit ?? '',
              endUse: resolvedRecord.endUse ?? resolvedRecord.EndUse ?? '',
              disbursementTransaction: resolvedRecord.disbursementTransaction ?? resolvedRecord.DisbursementTransaction ?? '',
              applicantProfile: resolvedRecord.applicantProfile ?? resolvedRecord.ApplicantProfile ?? '',
              coApplicantProfile: resolvedRecord.coApplicantProfile ?? resolvedRecord.CoApplicantProfile ?? '',
              bureauReport: resolvedRecord.bureauReport ?? resolvedRecord.BureauReport ?? '',
              proposedCollateral: resolvedRecord.proposedCollateral ?? resolvedRecord.ProposedCollateral ?? '',
              legalAndTechnical: resolvedRecord.legalTechnicalReview ?? resolvedRecord.LegalTechnicalReview ?? '',
              strengths: resolvedRecord.strengths ?? resolvedRecord.Strengths ?? '',
              concerns: resolvedRecord.concerns ?? resolvedRecord.Concerns ?? '',
              recommendation: resolvedRecord.recommendation ?? resolvedRecord.Recommendation ?? '',
              otherSanctionConditions: hydratedConditions.length > 0 ? hydratedConditions : [''],
            },
          ]);

          const remarks = resolvedRecord.finalRemarks ?? resolvedRecord.FinalRemarks ?? '';
          setFinalRemarks(remarks);
        } else {
          setPdAssessmentId(null);
        }
      } catch (err) {
        if (!isMounted) return;
        console.warn('[CustomerVerification] No existing PD assessment found or failed to fetch:', err);
        setPdAssessmentId(null);
      } finally {
        if (isMounted) {
          setPdAssessmentLoading(false);
        }
      }
    }

    loadPdAssessment();

    return () => {
      isMounted = false;
    };
  }, [activeStep, calculationAppProdId]);

  // Shared "Comments on other health checks" — particulars from GET /api/health-check-types
  const [healthCheckTypes, setHealthCheckTypes] = useState([]);
  const [healthCheckTypesLoading, setHealthCheckTypesLoading] = useState(false);
  const [healthCheckTypesError, setHealthCheckTypesError] = useState(null);
  const [healthChecksByStep, setHealthChecksByStep] = useState({
    8: {},
    9: {},
    10: {},
  });
  const [findingsModal, setFindingsModal] = useState({
    open: false,
    step: null,
    typeId: null,
    label: '',
    draft: '',
  });

  const fetchHealthCheckTypes = useCallback(async () => {
    setHealthCheckTypesLoading(true);
    setHealthCheckTypesError(null);
    try {
      const res = await backOfficeService.getHealthCheckTypes();
      const list = Array.isArray(res) ? res : (res?.data || res?.value || []);
      setHealthCheckTypes(list);
    } catch (err) {
      console.error('Failed to load health check types:', err);
      setHealthCheckTypesError('Failed to load health check types. Please try again.');
    } finally {
      setHealthCheckTypesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeStep === 8 || activeStep === 9 || activeStep === 10) {
      fetchHealthCheckTypes();
    }
  }, [activeStep, fetchHealthCheckTypes]);

  const activeHealthCheckTypes = useMemo(() => {
    return (healthCheckTypes || []).filter((item) => item.isActive === true);
  }, [healthCheckTypes]);

  const updateHealthCheck = (typeId, field, value, step = activeStep) => {
    setHealthChecksByStep((prev) => ({
      ...prev,
      [step]: {
        ...(prev[step] || {}),
        [typeId]: {
          status: 'Pending',
          dateOfCheck: '',
          findings: '',
          ...(prev[step]?.[typeId] || {}),
          [field]: value,
        },
      },
    }));
  };

  const openFindingsModal = (typeId, label, currentFindings = '', step = activeStep) => {
    setFindingsModal({
      open: true,
      step,
      typeId,
      label: label || 'Health check',
      draft: currentFindings || '',
    });
  };

  const closeFindingsModal = () => {
    setFindingsModal({ open: false, step: null, typeId: null, label: '', draft: '' });
  };

  const saveFindingsModal = () => {
    if (findingsModal.typeId == null) return;
    const targetStep = findingsModal.step ?? activeStep;
    updateHealthCheck(findingsModal.typeId, 'findings', (findingsModal.draft || '').trim(), targetStep);
    closeFindingsModal();
  };

  const healthCheckStatusClass = (status) => {
    const normalized = String(status || 'Pending').toLowerCase();
    if (normalized === 'yes') return 'is-yes';
    if (normalized === 'no') return 'is-no';
    return 'is-pending';
  };

  const renderHealthChecksChecklist = (step = activeStep) => {
    const stepChecks = healthChecksByStep[step] || {};
    return (
      <section className="bo-cv-health-checks" aria-label="Comments on other health checks">
        <div className="bo-cv-health-checks-card">
          <div className="bo-cv-health-checks-head">
            <div className="bo-cv-health-checks-head-icon" aria-hidden="true">
              {ShieldCheckIcon ? <ShieldCheckIcon size={18} /> : <span>✓</span>}
            </div>
            <div className="bo-cv-health-checks-head-copy">
              <h3 className="bo-cv-health-checks-title">Comments on other health checks</h3>
              <p className="bo-cv-health-checks-subtitle">
                Capture Yes/No, date, and findings for each active master health check type.
              </p>
            </div>
            <span className="bo-cv-health-checks-count">
              {activeHealthCheckTypes.length} check{activeHealthCheckTypes.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="bo-cv-health-checks-table-wrap">
            <table className="bo-cv-health-checks-table">
              <thead>
                <tr>
                  <th scope="col">Particulars</th>
                  <th scope="col">Yes / No</th>
                  <th scope="col">Date of check</th>
                  <th scope="col">Findings / Status</th>
                </tr>
              </thead>
              <tbody>
                {healthCheckTypesLoading && (
                  <tr>
                    <td colSpan={4} className="bo-cv-health-checks-empty">Loading health check types…</td>
                  </tr>
                )}
                {!healthCheckTypesLoading && healthCheckTypesError && (
                  <tr>
                    <td colSpan={4} className="bo-cv-health-checks-empty bo-cv-health-checks-error">
                      {healthCheckTypesError}
                    </td>
                  </tr>
                )}
                {!healthCheckTypesLoading && !healthCheckTypesError && activeHealthCheckTypes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="bo-cv-health-checks-empty">
                      No active health check types found in master.
                    </td>
                  </tr>
                )}
                {!healthCheckTypesLoading && !healthCheckTypesError && activeHealthCheckTypes.map((type) => {
                  const typeId = type.healthCheckTypeId;
                  const label = type.checkName || '—';
                  const row = stepChecks[typeId] || {
                    status: 'Pending',
                    dateOfCheck: '',
                    findings: '',
                  };
                  const hasFindings = Boolean(String(row.findings || '').trim());
                  return (
                    <tr key={typeId}>
                      <td className="bo-cv-health-checks-particular">
                        <span className="bo-cv-health-checks-particular-name">{label}</span>
                      </td>
                      <td>
                        <div className={`bo-cv-health-status-wrap ${healthCheckStatusClass(row.status)}`}>
                          <select
                            className="bo-cv-health-checks-select"
                            value={row.status}
                            onChange={(e) => updateHealthCheck(typeId, 'status', e.target.value, step)}
                            aria-label={`${label} Yes/No status`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                      </td>
                      <td>
                        <input
                          type="date"
                          className="bo-cv-health-checks-input"
                          value={row.dateOfCheck}
                          onChange={(e) => updateHealthCheck(typeId, 'dateOfCheck', e.target.value, step)}
                          aria-label={`${label} date of check`}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`bo-cv-health-findings-trigger ${hasFindings ? 'has-value' : ''}`}
                          onClick={() => openFindingsModal(typeId, label, row.findings, step)}
                          aria-label={`${label} findings or status`}
                        >
                          <span className="bo-cv-health-findings-trigger-text">
                            {hasFindings ? row.findings : 'Click to add findings…'}
                          </span>
                          <span className="bo-cv-health-findings-trigger-action">
                            {hasFindings ? 'Edit' : 'Add'}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  };

  // 13. Icons
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const ShieldCheckIcon = iconMap['ShieldCheck'];
  const CheckCircleIcon = iconMap['CheckCircle2'] || iconMap['Check'];
  const AlertTriangleIcon = iconMap['AlertTriangle'];
  const AlertCircleIcon = iconMap['AlertCircle'];
  const InfoIcon = iconMap['Info'];
  const SendIcon = iconMap['Send'];
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
  const LandmarkIcon = iconMap['Landmark'] || iconMap['Building2'];
  const ExternalLinkIcon = iconMap['ExternalLink'];
  const PlusIcon = iconMap['Plus'] || iconMap['FilePlus'];
  const MinusIcon = iconMap['Minus'] || iconMap['CircleMinus'] || XIcon;
  const SaveIcon = iconMap['Save'];
  const Trash2Icon = iconMap['Trash2'] || iconMap['X'];
  const RotateCcwIcon = iconMap['RotateCcw'] || iconMap['RefreshCw'];
  const ChevronLeftIcon = iconMap['ChevronLeft'] || iconMap['ArrowLeft'];
  const ChevronRightIcon = iconMap['ChevronRight'] || iconMap['ArrowRight'];
  const UsersIcon = iconMap['Users'] || iconMap['User'];
  const CameraIcon = iconMap['Camera'] || iconMap['User'];

  // 13b. Compact Document Verification States
  const [selectedCoApplicantIndex, setSelectedCoApplicantIndex] = useState(0);
  const [previewModal, setPreviewModal] = useState({
    open: false,
    title: '',
    docType: '',
    personLabel: '',
    personName: '',
    url: null,
    isPdf: false,
    isImage: false,
    isZip: false,
    fileName: '',
    fileSize: null,
    uploadDate: null,
    comparison: null,
    rejectionId: null,
    rejection: null,
    stepLabel: '',
    stepNum: null,
    stepCode: null,
    kycId: null,
    isCoApplicant: false,
    applicantSequence: 0,
    documentTypeId: null,
    rejectedDocumentType: null,
    manualDocs: null,
    isVerified: false,
    status: '',
  });

  const handleOpenPreviewModal = useCallback((opts) => {
    setPreviewModal({
      open: true,
      title: opts.title || `${opts.docType} Preview`,
      docType: opts.docType || 'Document',
      personLabel: opts.personLabel || '',
      personName: opts.personName || '',
      url: opts.url || null,
      isPdf: Boolean(opts.isPdf),
      isImage: Boolean(opts.isImage),
      isZip: Boolean(opts.isZip),
      fileName: opts.fileName || opts.docType || 'Document',
      fileSize: opts.fileSize || null,
      uploadDate: opts.uploadDate || null,
      comparison: opts.comparison || null,
      rejectionId: opts.rejectionId || null,
      rejection: opts.rejection || null,
      stepLabel: opts.stepLabel || opts.docType || 'Document',
      stepNum: opts.stepNum || null,
      stepCode: opts.stepCode || null,
      kycId: opts.kycId || null,
      isCoApplicant: Boolean(opts.isCoApplicant),
      applicantSequence: opts.applicantSequence !== undefined ? opts.applicantSequence : 0,
      documentTypeId: opts.documentTypeId || null,
      rejectedDocumentType: opts.rejectedDocumentType || null,
      manualDocs: opts.manualDocs || null,
      isVerified: Boolean(opts.isVerified),
      status: opts.status || '',
    });
  }, []);

  const handleClosePreviewModal = useCallback(() => {
    setPreviewModal((prev) => ({ ...prev, open: false }));
  }, []);

  const applicantName = useMemo(() => {
    return (
      verificationData?.personalDetails?.applicantName ||
      verificationData?.applicationDetails?.customerName ||
      verificationData?.customerName ||
      verificationData?.raw?.customerDetails?.customerName ||
      'Primary Applicant'
    );
  }, [verificationData]);


  // Send to Credit Officer action handler (PD Assessment Save/Update)
  const handleSendToCreditOfficer = async () => {
    const trimmed = finalRemarks.trim();
    if (!trimmed) {
      setFinalRemarksError('Remarks for Credit Officer are required.');
      setFinalRemarksBanner(null);
      return;
    }

    if (!calculationAppProdId || calculationAppProdId <= 0) {
      setFinalRemarksBanner({
        type: 'error',
        message: 'Unable to resolve Application Product Details ID for this application. Cannot save PD Assessment.',
      });
      return;
    }

    const boAuth = getBackOfficeAuth();
    const currentUserId = Number(
      boAuth?.userId ||
      boAuth?.id ||
      boAuth?.backOfficeId ||
      localStorage.getItem('userId') ||
      localStorage.getItem('backOfficeId') ||
      0
    );

    if (!currentUserId || isNaN(currentUserId) || currentUserId <= 0) {
      setFinalRemarksBanner({
        type: 'error',
        message: 'Unable to identify authenticated Back Office user. Please log in again.',
      });
      return;
    }

    setFinalRemarksError('');
    setIsSendingToCreditOfficer(true);
    setFinalRemarksBanner(null);

    const sheet = recommendationSheets[0] || {};
    const payload = {
      applicationProductDetailsId: Number(calculationAppProdId),
      dateOfPdVisit: sheet.pdVisitDate || null,
      pdAddress: sheet.pdAddress?.trim() || '',
      endUseCategorization: sheet.endUseCategory?.trim() || '',
      personalDiscussionSiteVisit: sheet.personalDiscussionSiteVisit?.trim() || '',
      endUse: sheet.endUse?.trim() || '',
      disbursementTransaction: sheet.disbursementTransaction?.trim() || '',
      applicantProfile: sheet.applicantProfile?.trim() || '',
      coApplicantProfile: sheet.coApplicantProfile?.trim() || '',
      bureauReport: sheet.bureauReport?.trim() || '',
      proposedCollateral: sheet.proposedCollateral?.trim() || '',
      legalTechnicalReview: sheet.legalAndTechnical?.trim() || '',
      strengths: sheet.strengths?.trim() || '',
      concerns: sheet.concerns?.trim() || '',
      recommendation: sheet.recommendation?.trim() || '',
      finalRemarks: trimmed,
      sanctionConditions: (sheet.otherSanctionConditions || [])
        .map((c) => String(c || '').trim())
        .filter(Boolean)
        .map((text) => ({
          conditionText: text,
        })),
      createdBy: currentUserId,
    };

    try {
      if (pdAssessmentId && Number(pdAssessmentId) > 0) {
        const updatePayload = {
          ...payload,
          pdAssessmentId: Number(pdAssessmentId),
        };
        await backOfficeService.updatePdAssessment(pdAssessmentId, updatePayload);
        setFinalRemarksBanner({
          type: 'info',
          message: 'PD Assessment updated successfully.',
        });
      } else {
        const created = await backOfficeService.createPdAssessment(payload);
        const returnedId =
          created?.pdAssessmentId ??
          created?.PdAssessmentId ??
          created?.id;

        if (returnedId) {
          setPdAssessmentId(Number(returnedId));
        }
        setFinalRemarksBanner({
          type: 'info',
          message: 'PD Assessment saved successfully.',
        });
      }
    } catch (err) {
      console.error('Failed to save PD Assessment:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        'Failed to save PD Assessment. Please try again.';
      setFinalRemarksBanner({
        type: 'error',
        message: errMsg,
      });
    } finally {
      setIsSendingToCreditOfficer(false);
    }
  };

  // Top View Form Button handler: activates Step 1
  const handleViewForm = () => {
    navigateToStep(1);
  };
  // ----------------------------------------------------
  // Document Resolution & Preview Loader (Old vs New & Dynamic Master)
  // ----------------------------------------------------

  // Helper to determine if an AgentCustomerDocument matches the requested step/document type
  const isMatchingApplicantDoc = useCallback((doc, stepNumOrCode, masterMap) => {
    if (!doc) return false;
    const typeId = Number(doc.documentTypeId || doc.DocumentTypeId);
    const typeName = String(doc.documentTypeName || doc.DocumentTypeName || '').trim().toLowerCase();
    const fileName = String(doc.fileName || doc.FileName || doc.name || '').trim().toLowerCase();

    const master = masterMap?.[typeId];
    const masterCode = String(master?.documentTypeCode || '').toUpperCase();
    const masterName = String(master?.documentTypeName || '').toLowerCase();

    const s = String(stepNumOrCode ?? '').trim().toUpperCase();
    const isStep2 = stepNumOrCode === 2 || s === '2' || s === 'PROFILE' || s === 'PROFILE_IMAGE' || s === 'PHOTO' || s === 'APPLICANT_PROFILE';
    const isStep3 = stepNumOrCode === 3 || s === '3' || s === 'AADHAAR' || s === 'AADHAR' || s === 'APPLICANT_AADHAAR';
    const isStep4 = stepNumOrCode === 4 || s === '4' || s === 'PAN' || s === 'PANCARD' || s === 'APPLICANT_PAN';
    const isStep5 = stepNumOrCode === 5 || s === '5' || s === 'SALARY_SLIP' || s === 'SALARY' || s === 'PAYSLIP' || s === 'INCOME_PROOF';
    const isStep6 = stepNumOrCode === 6 || s === '6' || s === 'BANK_STATEMENT' || s === 'BANKSTATEMENT' || s === 'BANK';
    const isStep7 = stepNumOrCode === 7 || s === '7' || s === 'ZIP' || s === 'ZIP_ARCHIVE' || s === 'ARCHIVE' || s === 'MANUAL';

    if (isStep2) {
      // Step 02: Profile Image / Photo
      // Identity rule: Match only actual photo / profile assets
      if (masterCode === 'PHOTO' || masterCode === 'PROFILE' || masterCode === 'PROFILE_IMAGE' || masterName.includes('photo') || masterName.includes('profile')) return true;
      if (typeName.includes('photo') || typeName.includes('picture') || typeName.includes('profile') || typeName.includes('client')) return true;
      if (/\.(jpg|jpeg|png|webp|gif)$/i.test(fileName) && /(profile|photo|client|picture|face|user)/i.test(fileName)) return true;
      if (profileDocTypeId && typeId === Number(profileDocTypeId)) return true;
      return false;
    }

    if (isStep3) {
      // Step 03: Aadhaar Card
      if (masterCode === 'AADHAAR' || masterCode === 'AADHAR' || masterName.includes('aadhaar') || masterName.includes('aadhar')) return true;
      if (typeName.includes('aadhaar') || typeName.includes('aadhar')) return true;
      if (/(aadhaar|aadhar|uid)/i.test(fileName)) return true;
      if (aadhaarDocTypeId && typeId === Number(aadhaarDocTypeId)) return true;
      return false;
    }

    if (isStep4) {
      // Step 04: PAN Card
      if (masterCode === 'PAN' || masterCode === 'PANCARD' || masterName === 'pan card' || masterName === 'pan') return true;
      if (typeName.includes('pan card') || typeName === 'pan') return true;
      if (/\bpan\b/i.test(fileName) || /pancard/i.test(fileName)) return true;
      if (panDocTypeId && typeId === Number(panDocTypeId)) return true;
      return false;
    }

    if (isStep5) {
      // Step 05: Salary Slip
      if (salarySlipDocTypeId && typeId === Number(salarySlipDocTypeId)) return true;
      if (masterCode === 'SALARY_SLIP' || masterCode === 'SALARY' || masterCode === 'PAYSLIP') return true;
      if (masterName.includes('salary') || masterName.includes('payslip') || masterName.includes('income')) return true;
      if (typeName.includes('salary') || typeName.includes('payslip') || typeName.includes('pay_slip') || typeName.includes('income')) return true;
      if (/(salary|payslip|pay_slip|income)/i.test(fileName)) return true;
      return false;
    }

    if (isStep6) {
      // Step 06: Bank Statement
      if (bankStatementDocTypeId && typeId === Number(bankStatementDocTypeId)) return true;
      if (masterCode === 'BANK_STATEMENT' || masterCode === 'BANKSTATEMENT' || masterCode === 'BANK') return true;
      if (masterName.includes('bank') || masterName.includes('statement')) return true;
      if (typeName.includes('bank') || typeName.includes('statement') || typeName.includes('passbook')) return true;
      if (/(bank|statement|passbook)/i.test(fileName)) return true;
      return false;
    }

    if (isStep7) {
      // Step 07: ZIP Archive / Manual Documents
      if (/\.(zip|rar|7z|tar|gz)$/i.test(fileName)) return true;
      if (typeName.includes('zip') || typeName.includes('archive') || typeName.includes('manual')) return true;
      return false;
    }

    return false;
  }, [
    profileDocTypeId,
    aadhaarDocTypeId,
    panDocTypeId,
    salarySlipDocTypeId,
    bankStatementDocTypeId,
  ]);

  // Helper to download a single customer document and create a managed blob URL
  const downloadAndPrepareDoc = useCallback(async (doc) => {
    const docId = doc?.agentCustomerDocumentId || doc?.id;
    if (!docId) return null;
    const cacheKey = `agentDoc_${docId}`;
    if (previewCacheRef.current.has(cacheKey)) {
      return previewCacheRef.current.get(cacheKey);
    }
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

      const result = {
        doc,
        url: objectUrl,
        fileName,
        size: typedBlob.size,
        isPdf,
        isImage: !isPdf,
        uploadDate: doc.createdAt
          ? new Date(doc.createdAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : doc.uploadedOn || '',
      };
      previewCacheRef.current.set(cacheKey, result);
      return result;
    } catch (err) {
      console.warn(`[CustomerVerification] Could not download document ${docId}:`, err?.message);
      return null;
    }
  }, []);

  // Deterministically selects the latest active applicant document from an array of documents
  const selectLatestApplicantDoc = useCallback((docs, stepNum, masterMap) => {
    if (!Array.isArray(docs) || docs.length === 0) return null;
    const matching = docs.filter((doc) => {
      if (!doc || doc.isActive === false) return false;
      const seq = doc.applicantSequence !== undefined && doc.applicantSequence !== null
        ? Number(doc.applicantSequence)
        : (doc.ApplicantSequence !== undefined && doc.ApplicantSequence !== null ? Number(doc.ApplicantSequence) : null);
      if (seq !== null && seq > 0) return false;
      return isMatchingApplicantDoc(doc, stepNum, masterMap);
    });

    if (matching.length === 0) return null;

    matching.sort((a, b) => {
      const modTimeA = new Date(a.modifiedAt || a.updatedAt || a.ModifiedAt || a.UpdatedAt || 0).getTime();
      const modTimeB = new Date(b.modifiedAt || b.updatedAt || b.ModifiedAt || b.UpdatedAt || 0).getTime();
      if (modTimeA > 0 && modTimeB > 0 && modTimeA !== modTimeB) {
        return modTimeB - modTimeA;
      }
      const createTimeA = new Date(a.createdAt || a.uploadedOn || a.CreatedAt || a.UploadedOn || 0).getTime();
      const createTimeB = new Date(b.createdAt || b.uploadedOn || b.CreatedAt || b.UploadedOn || 0).getTime();
      if (createTimeA !== createTimeB) {
        return createTimeB - createTimeA;
      }
      const idA = Number(a.agentCustomerDocumentId || a.applicationKYCDocumentId || a.id || 0);
      const idB = Number(b.agentCustomerDocumentId || b.applicationKYCDocumentId || b.id || 0);
      return idB - idA;
    });

    return matching[0];
  }, [isMatchingApplicantDoc]);

  // Safely resolves Old and New document versions for Applicant
  const resolveOldAndNewDocs = useCallback(
    (docs, rejection, stepNum, masterMap) => {
      const matching = (docs || []).filter((d) => {
        if (!d || d.isActive === false) return false;
        const seq = d.applicantSequence !== undefined && d.applicantSequence !== null
          ? Number(d.applicantSequence)
          : (d.ApplicantSequence !== undefined && d.ApplicantSequence !== null ? Number(d.ApplicantSequence) : null);
        if (seq !== null && seq > 0) return false;
        return isMatchingApplicantDoc(d, stepNum, masterMap);
      });
      matching.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.uploadedOn || 0).getTime();
        const timeB = new Date(b.createdAt || b.uploadedOn || 0).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return (Number(a.agentCustomerDocumentId || a.id) || 0) - (Number(b.agentCustomerDocumentId || b.id) || 0);
      });

      if (matching.length === 0) return { oldDoc: null, newDoc: null };

      const rejTime = rejection ? new Date(rejection.rejectedAt || rejection.createdAt || 0).getTime() : 0;

      if (!rejection || rejection.status === 'Verified') {
        return { oldDoc: null, newDoc: matching[matching.length - 1], isLatest: true };
      }

      const beforeRej = matching.filter((d) => {
        const t = new Date(d.createdAt || d.uploadedOn || 0).getTime();
        return rejTime === 0 || t <= rejTime + 5000;
      });

      const afterRej = matching.filter((d) => {
        const t = new Date(d.createdAt || d.uploadedOn || 0).getTime();
        return rejTime > 0 && t > rejTime + 5000;
      });

      const oldDoc = beforeRej.length > 0 ? beforeRej[beforeRej.length - 1] : (matching.length > 1 ? matching[0] : null);
      const newDoc = afterRej.length > 0 ? afterRej[afterRej.length - 1] : (matching.length > 1 ? matching[matching.length - 1] : matching[0]);

      return { oldDoc, newDoc };
    },
    [isMatchingApplicantDoc]
  );

  // ----------------------------------------------------
  // Document Rejection API Workflows (Back Office <-> RM)
  // ----------------------------------------------------
  const STEP_DOC_TYPE_MAP = {
    2: 'PROFILE',
    3: 'AADHAAR',
    4: 'PAN',
    5: 'SALARY_SLIP',
    6: 'BANK_STATEMENT',
    7: 'ZIP',
    8: 'PROPERTY_FI',
    9: 'OFFICE_FI',
    10: 'RESIDENCE_FI',
    11: 'LEGAL_OPINION',
    12: 'TECHNICAL_VALUE',
    13: 'CIBIL',
    14: 'PD_VERIFICATION',
  };

  const fetchApplicationRejections = useCallback(async () => {
    const appProdId =
      verificationData?.applicationProductDetailsId ||
      verificationData?.application?.product?.applicationProductDetailsId ||
      verificationData?.application?.product?.ApplicationProductDetailsId ||
      verificationData?.application?.applicationProductDetailsId ||
      verificationData?.application?.ApplicationProductDetailsId ||
      verificationData?.raw?.productDetails?.product?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.product?.ApplicationProductDetailsId ||
      verificationData?.raw?.productDetailsList?.product?.applicationProductDetailsId ||
      verificationData?.raw?.productDetailsList?.product?.ApplicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.product?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.product?.ApplicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.applicationProductDetailsId ||
      verificationData?.raw?.productDetailsList?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.applicationProductDetails?.applicationProductDetailsId;

    if (!appProdId) return;

    try {
      const res = await backOfficeService.getDocumentRejectionsByApplication(appProdId);
      const list = Array.isArray(res) ? res : (res?.value || res?.data || []);
      setApplicationRejections(list.filter((r) => r && r.isActive !== false));
    } catch (err) {
      console.warn('[CustomerVerification] Failed to fetch application rejections:', err?.message);
    }
  }, [verificationData]);

  useEffect(() => {
    if (verificationData) {
      fetchApplicationRejections();
    }
  }, [verificationData, fetchApplicationRejections]);

  // ----------------------------------------------------
  // Step-Level Verification Persistence (BackOfficeStepVerification)
  // ----------------------------------------------------
  const resolvedAppProdId = Number(
    verificationData?.applicationProductDetailsId ||
    verificationData?.application?.product?.applicationProductDetailsId ||
    verificationData?.application?.product?.ApplicationProductDetailsId ||
    verificationData?.application?.applicationProductDetailsId ||
    verificationData?.application?.ApplicationProductDetailsId ||
    verificationData?.raw?.productDetails?.product?.applicationProductDetailsId ||
    verificationData?.raw?.productDetails?.product?.ApplicationProductDetailsId ||
    verificationData?.raw?.productDetailsList?.product?.applicationProductDetailsId ||
    verificationData?.raw?.productDetailsList?.product?.ApplicationProductDetailsId ||
    verificationData?.raw?.productDetails?.[0]?.product?.applicationProductDetailsId ||
    verificationData?.raw?.productDetails?.[0]?.product?.ApplicationProductDetailsId ||
    verificationData?.raw?.productDetails?.[0]?.applicationProductDetailsId ||
    verificationData?.raw?.productDetails?.applicationProductDetailsId ||
    verificationData?.raw?.productDetailsList?.[0]?.applicationProductDetailsId ||
    verificationData?.raw?.applicationProductDetails?.applicationProductDetailsId ||
    0
  );

  const getAuthenticatedBackOfficeId = useCallback(() => {
    // 1. Direct from backOfficeAuth or auth helper
    const boAuth = getBackOfficeAuth();
    const directId = boAuth?.backOfficeId ?? boAuth?.id;
    if (directId != null && !isNaN(Number(directId)) && Number(directId) > 0) {
      return Number(directId);
    }

    // 2. Direct from dedicated backOfficeId or userId in localStorage
    const storedBoId = localStorage.getItem('backOfficeId');
    if (storedBoId != null && !isNaN(Number(storedBoId)) && Number(storedBoId) > 0) {
      return Number(storedBoId);
    }
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId != null && !isNaN(Number(storedUserId)) && Number(storedUserId) > 0) {
      return Number(storedUserId);
    }

    // 3. From backOfficeData object
    try {
      const boData = JSON.parse(localStorage.getItem('backOfficeData') || 'null');
      const boDataId = boData?.backOfficeId ?? boData?.id ?? boData?.userId;
      if (boDataId != null && !isNaN(Number(boDataId)) && Number(boDataId) > 0) {
        return Number(boDataId);
      }
    } catch {}

    // 4. From sivels_currentUser if role is BackOffice
    try {
      const curUser = JSON.parse(localStorage.getItem('sivels_currentUser') || 'null');
      const role = String(curUser?.role || '').toLowerCase();
      if (
        role.includes('backoffice') ||
        role.includes('back_office') ||
        role.includes('back office') ||
        role.includes('operations')
      ) {
        const uId = curUser?.backOfficeId ?? curUser?.userId ?? curUser?.id;
        if (uId != null && !isNaN(Number(uId)) && Number(uId) > 0) {
          return Number(uId);
        }
      }
    } catch {}

    return null;
  }, []);

  const fetchStepVerifications = useCallback(async (appProdId) => {
    const targetId = Number(appProdId);
    if (!targetId || targetId <= 0) return;

    setIsFetchingStepVerifications(true);
    setStepVerificationError(null);

    try {
      const res = await backOfficeService.getStepVerificationsByApplication(targetId);
      const list = Array.isArray(res) ? res : (res?.value || res?.data || []);

      const nextState = {
        0: createEmptyStepVerifications(),
      };

      const remarksToHydrate = {};

      list.forEach((item) => {
        if (!item || item.isActive === false) return;
        const code = item.stepCode;
        if (!SUPPORTED_STEP_CODES.includes(code)) return;

        const seq =
          item.applicantSequence !== undefined && item.applicantSequence !== null && !isNaN(Number(item.applicantSequence))
            ? Number(item.applicantSequence)
            : 0;

        if (!nextState[seq]) {
          nextState[seq] = createEmptyStepVerifications();
        }

        nextState[seq][code] = {
          backOfficeStepVerificationId: item.backOfficeStepVerificationId || null,
          isVerified: Boolean(item.isVerified),
          remarks: item.remarks || '',
          verifiedAt: item.verifiedAt || null,
          verifiedByBackOfficeId: item.verifiedByBackOfficeId || null,
          applicantSequence: seq,
        };

        // Hydrate remarks for Primary Applicant (seq 0) into 17-step stepRemarks (2: Profile, 3: Aadhaar, 4: PAN, 5: Salary, 6: Bank, 7: ZIP)
        if (seq === 0 && item.remarks && typeof item.remarks === 'string' && item.remarks.trim()) {
          if (code === 'PROFILE_IMAGE') remarksToHydrate[2] = item.remarks;
          else if (code === 'AADHAAR') remarksToHydrate[3] = item.remarks;
          else if (code === 'PAN') remarksToHydrate[4] = item.remarks;
          else if (code === 'SALARY_SLIP') remarksToHydrate[5] = item.remarks;
          else if (code === 'BANK_STATEMENT') remarksToHydrate[6] = item.remarks;
          else if (code === 'ZIP_ARCHIVE') remarksToHydrate[7] = item.remarks;
        }
      });

      setStepVerifications(nextState);

      if (Object.keys(remarksToHydrate).length > 0) {
        setStepRemarks((prev) => ({
          ...prev,
          ...remarksToHydrate,
        }));
      }
    } catch (err) {
      if (err?.response?.status !== 404) {
        console.warn('[CustomerVerification] Failed to fetch step verifications:', err?.message);
        setStepVerificationError(err?.response?.data?.message || err?.message || 'Failed to load step verification data.');
      }
    } finally {
      setIsFetchingStepVerifications(false);
    }
  }, []);

  // Hydrate step verifications when applicationProductDetailsId resolves (Loop-safe primitive dependency)
  useEffect(() => {
    if (resolvedAppProdId > 0) {
      fetchStepVerifications(resolvedAppProdId);
    }
  }, [resolvedAppProdId, fetchStepVerifications]);

  // ----------------------------------------------------
  // Step-Level Unresolved Rejection Detection Helpers (Rule 1)
  // ----------------------------------------------------
  const isRejectionMatchingStep = useCallback(
    (r, stepIdentifier) => {
      if (!r || r.isActive === false) return false;

      let code = '';
      if (typeof stepIdentifier === 'number') {
        code = stepNumToStepCode(stepIdentifier) || '';
      } else {
        code = String(stepIdentifier || '').toUpperCase().trim();
      }
      if (!code) return false;

      const rType = String(r.rejectedDocumentType || '').toUpperCase().trim();
      const docTypeId = Number(r.documentTypeId);

      switch (code) {
        case 'PROFILE_IMAGE':
          return (
            (profileDocTypeId && docTypeId === Number(profileDocTypeId)) ||
            rType.includes('PROFILE') ||
            rType.includes('PHOTO')
          );
        case 'AADHAAR':
          return (
            (aadhaarDocTypeId && docTypeId === Number(aadhaarDocTypeId)) ||
            rType.includes('AADHAAR') ||
            rType.includes('AADHAR')
          );
        case 'PAN':
          return (
            (panDocTypeId && docTypeId === Number(panDocTypeId)) ||
            rType.includes('PAN')
          );
        case 'SALARY_SLIP':
          return (
            (salarySlipDocTypeId && docTypeId === Number(salarySlipDocTypeId)) ||
            rType.includes('SALARY') ||
            rType.includes('PAYSLIP') ||
            rType.includes('INCOME')
          );
        case 'BANK_STATEMENT':
          return (
            (bankStatementDocTypeId && docTypeId === Number(bankStatementDocTypeId)) ||
            rType.includes('BANK') ||
            rType.includes('STATEMENT')
          );
        case 'ZIP_ARCHIVE':
          return (
            (zipArchiveDocTypeId && docTypeId === Number(zipArchiveDocTypeId)) ||
            rType.includes('ZIP') ||
            rType.includes('ARCHIVE') ||
            rType.includes('MANUAL')
          );
        default:
          return false;
      }
    },
    [profileDocTypeId, aadhaarDocTypeId, panDocTypeId, salarySlipDocTypeId, bankStatementDocTypeId, zipArchiveDocTypeId]
  );

  const getUnresolvedRejectionsForStep = useCallback(
    (stepIdentifier, targetSequence = null) => {
      if (!Array.isArray(applicationRejections) || applicationRejections.length === 0) return [];

      const getRejectionEntityKey = (r) => {
        if (r.applicantSequence !== undefined && r.applicantSequence !== null && !isNaN(Number(r.applicantSequence))) {
          return Number(r.applicantSequence);
        }
        const rType = String(r.rejectedDocumentType || '').toUpperCase().trim();
        const match = rType.match(/CO_?APPLICANT_?(\d+)/i);
        if (match && match[1]) {
          return Number(match[1]);
        }
        if (rType.startsWith('CO_APPLICANT') || rType.startsWith('CO-APPLICANT') || rType.startsWith('COAPPLICANT')) {
          return 1;
        }
        return 0;
      };

      const matchingRejections = applicationRejections.filter((r) => {
        if (r.isActive === false) return false;
        if (!isRejectionMatchingStep(r, stepIdentifier)) return false;
        if (targetSequence !== null && targetSequence !== undefined) {
          const seq = getRejectionEntityKey(r);
          return seq === Number(targetSequence);
        }
        return true;
      });

      if (matchingRejections.length === 0) return [];

      const entityMap = new Map();
      matchingRejections.forEach((r) => {
        const seq = getRejectionEntityKey(r);
        const existing = entityMap.get(seq);
        if (!existing) {
          entityMap.set(seq, r);
        } else {
          const idA = Number(r.backOfficeDocumentRejectionId || 0);
          const idExisting = Number(existing.backOfficeDocumentRejectionId || 0);
          if (idA > idExisting) {
            entityMap.set(seq, r);
          } else if (idA === idExisting) {
            const timeA = new Date(r.rejectedAt || r.createdAt || 0).getTime();
            const timeExisting = new Date(existing.rejectedAt || existing.createdAt || 0).getTime();
            if (timeA > timeExisting) {
              entityMap.set(seq, r);
            }
          }
        }
      });

      const unresolved = [];
      entityMap.forEach((latestRejection) => {
        const status = String(latestRejection.status || '').trim().toLowerCase();
        if (status !== 'verified') {
          unresolved.push(latestRejection);
        }
      });

      return unresolved;
    },
    [applicationRejections, isRejectionMatchingStep]
  );

  const hasUnresolvedRejectionForStep = useCallback(
    (stepIdentifier, targetSequence = null) => {
      return getUnresolvedRejectionsForStep(stepIdentifier, targetSequence).length > 0;
    },
    [getUnresolvedRejectionsForStep]
  );

  // Reusable PUT handler to create / update step verification
  const handleSaveStepVerification = useCallback(async ({
    applicantSequence = 0,
    stepCode,
    isVerified,
    remarks = '',
    stepNum = null,
  }) => {
    const seq =
      applicantSequence !== undefined && applicantSequence !== null && !isNaN(Number(applicantSequence))
        ? Number(applicantSequence)
        : 0;

    const rowKey = `${seq}_${stepCode}`;
    if (savingVerificationKey === rowKey) {
      return { success: false, error: 'A verification save is already in progress for this document.' };
    }

    // Defensive Guard (Rule 4): Block marking a step as Verified if unresolved rejections exist for this person
    if (Boolean(isVerified) && hasUnresolvedRejectionForStep(stepCode, seq)) {
      const err = 'Resolve all returned/resubmitted documents before marking this step as Verified.';
      setStepVerificationError(err);
      const effectiveStepNum = stepNum || stepCodeToStepNum(stepCode);
      if (effectiveStepNum) {
        setStepFeedback((prev) => ({
          ...prev,
          [effectiveStepNum]: { type: 'error', message: err },
        }));
      }
      return { success: false, error: err };
    }

    if (!SUPPORTED_STEP_CODES.includes(stepCode)) {
      throw new Error(`Unsupported verification step code: ${stepCode}`);
    }

    const effectiveStepNum = stepNum || stepCodeToStepNum(stepCode);

    const targetAppProdId = Number(
      resolvedAppProdId ||
      verificationData?.application?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.applicationProductDetailsId ||
      verificationData?.raw?.applicationProductDetails?.applicationProductDetailsId ||
      0
    );

    if (!targetAppProdId || targetAppProdId <= 0) {
      const err = 'Application details ID not found. Unable to persist step verification.';
      setStepVerificationError(err);
      if (effectiveStepNum) {
        setStepFeedback((prev) => ({
          ...prev,
          [effectiveStepNum]: { type: 'error', message: err },
        }));
      }
      return { success: false, error: err };
    }

    const backOfficeId = getAuthenticatedBackOfficeId();
    if (!backOfficeId) {
      const err = 'Unable to identify the logged-in Back Office operator. Please login again.';
      setStepVerificationError(err);
      if (effectiveStepNum) {
        setStepFeedback((prev) => ({
          ...prev,
          [effectiveStepNum]: { type: 'error', message: err },
        }));
      }
      return { success: false, error: err };
    }

    setSavingVerificationKey(rowKey);
    setStepVerificationError(null);

    const previousRecord = stepVerifications[seq]?.[stepCode] || {
      isVerified: false,
      remarks: '',
      verifiedAt: null,
      verifiedByBackOfficeId: null,
    };

    try {
      const payload = {
        applicationProductDetailsId: targetAppProdId,
        applicantSequence: Number(seq),
        stepCode,
        isVerified: Boolean(isVerified),
        remarks: (remarks || '').trim(),
        verifiedByBackOfficeId: backOfficeId,
      };

      const result = await backOfficeService.saveStepVerification(payload);

      const updatedRecord = {
        backOfficeStepVerificationId: result?.backOfficeStepVerificationId || null,
        isVerified: result?.isVerified !== undefined ? Boolean(result.isVerified) : Boolean(isVerified),
        remarks: result?.remarks !== undefined ? result.remarks : remarks,
        verifiedAt: result?.verifiedAt || new Date().toISOString(),
        verifiedByBackOfficeId: result?.verifiedByBackOfficeId || backOfficeId,
        applicantSequence: seq,
      };

      setStepVerifications((prev) => {
        const currentSeqObj = prev[seq] ? { ...prev[seq] } : createEmptyStepVerifications();
        return {
          ...prev,
          [seq]: {
            ...currentSeqObj,
            [stepCode]: updatedRecord,
          },
        };
      });

      if (effectiveStepNum) {
        const stepLabel = VERIFICATION_WORKFLOW_STEPS.find((s) => s.number === effectiveStepNum)?.title || stepCode;
        const personPrefix = seq === 0 ? 'Applicant' : `Co-Applicant ${seq}`;
        setStepFeedback((prev) => ({
          ...prev,
          [effectiveStepNum]: {
            type: 'success',
            message: `${personPrefix} ${stepLabel} successfully ${isVerified ? 'marked as Verified' : 'unmarked as Verified'}.`,
          },
        }));
      }

      return { success: true, data: result || updatedRecord };
    } catch (err) {
      console.error(`[CustomerVerification] Failed to save step verification for ${stepCode} (seq ${seq}):`, err);
      const errMsg = err?.response?.data?.message || err?.message || `Failed to save ${stepCode} verification.`;
      setStepVerificationError(errMsg);
      if (effectiveStepNum) {
        setStepFeedback((prev) => ({
          ...prev,
          [effectiveStepNum]: { type: 'error', message: errMsg },
        }));
      }
      // Revert to previous state on failure
      setStepVerifications((prev) => {
        const currentSeqObj = prev[seq] ? { ...prev[seq] } : createEmptyStepVerifications();
        return {
          ...prev,
          [seq]: {
            ...currentSeqObj,
            [stepCode]: previousRecord,
          },
        };
      });
      return { success: false, error: errMsg };
    } finally {
      setSavingVerificationKey((prev) => (prev === rowKey ? null : prev));
    }
  }, [savingVerificationKey, resolvedAppProdId, verificationData, getAuthenticatedBackOfficeId, stepVerifications, hasUnresolvedRejectionForStep]);

  // Reconcile legacy contradictory state: persist isVerified: false for steps with unresolved rejections (Rule 9)
  useEffect(() => {
    if (!resolvedAppProdId || isFetchingStepVerifications || !applicationRejections || applicationRejections.length === 0) {
      return;
    }

    Object.keys(stepVerifications).forEach((seqKey) => {
      const seq = Number(seqKey);
      if (isNaN(seq)) return;

      DOCUMENT_STEP_CODES.forEach(async (code) => {
        const recKey = `${resolvedAppProdId}_${seq}_${code}`;
        if (reconciledStepsRef.current.has(recKey)) return;

        const isPersistedTrue = stepVerifications[seq]?.[code]?.isVerified === true;
        const hasUnresolved = hasUnresolvedRejectionForStep(code, seq);

        if (isPersistedTrue && hasUnresolved) {
          reconciledStepsRef.current.add(recKey);
          try {
            await handleSaveStepVerification({
              applicantSequence: seq,
              stepCode: code,
              isVerified: false,
              remarks: stepVerifications[seq]?.[code]?.remarks || '',
            });
          } catch (recErr) {
            console.warn(`[CustomerVerification] Auto-reconciliation failed for seq ${seq} ${code}:`, recErr);
          }
        }
      });
    });
  }, [
    resolvedAppProdId,
    isFetchingStepVerifications,
    applicationRejections,
    stepVerifications,
    hasUnresolvedRejectionForStep,
    handleSaveStepVerification,
  ]);

  // Hydrate Back Office application documents (Steps 09, 10, 11)
  const fetchBackOfficeDocuments = useCallback(async () => {
    const appProdId =
      resolvedAppProdId ||
      verificationData?.applicationProductDetailsId ||
      verificationData?.application?.applicationProductDetailsId ||
      verificationData?.application?.ApplicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.applicationProductDetailsId ||
      verificationData?.raw?.productDetailsList?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.applicationProductDetails?.applicationProductDetailsId;

    if (!appProdId) return;

    try {
      const res = await backOfficeService.getApplicationDocuments(appProdId);
      const list = Array.isArray(res) ? res : (res?.value || res?.data || []);
      const activeDocs = list.filter((d) => d && d.isActive !== false);

      const legalDoc = activeDocs.find((d) => d.documentType === 'LEGAL_OPINION');
      if (legalDoc) {
        setLegalOpinion((prev) => ({
          ...prev,
          backOfficeApplicationDocumentId: legalDoc.backOfficeApplicationDocumentId,
          documentType: legalDoc.documentType,
          documentTitle: legalDoc.documentTitle || 'Legal Opinion Report',
          fileName: legalDoc.originalFileName || legalDoc.documentTitle || 'Legal Opinion Document',
          fileSize: formatFileSize(legalDoc.fileSize),
          uploadedAt: legalDoc.uploadedAt,
          modifiedAt: legalDoc.modifiedAt || '',
          modifiedBy: legalDoc.modifiedBy || null,
          documentStatus: legalDoc.documentStatus || 'Uploaded',
          remarks: legalDoc.remarks || '',
          error: null,
        }));
      }

      const techDoc = activeDocs.find((d) => d.documentType === 'TECHNICAL_VALUATION');
      if (techDoc) {
        setTechnicalValue((prev) => ({
          ...prev,
          backOfficeApplicationDocumentId: techDoc.backOfficeApplicationDocumentId,
          documentType: techDoc.documentType,
          documentTitle: techDoc.documentTitle || 'Technical Valuation Report',
          fileName: techDoc.originalFileName || techDoc.documentTitle || 'Technical Valuation Document',
          fileSize: formatFileSize(techDoc.fileSize),
          uploadedAt: techDoc.uploadedAt,
          modifiedAt: techDoc.modifiedAt || '',
          modifiedBy: techDoc.modifiedBy || null,
          documentStatus: techDoc.documentStatus || 'Uploaded',
          remarks: techDoc.remarks || '',
          error: null,
        }));
      }

      const cibilDoc = activeDocs.find((d) => d.documentType === 'MANUAL_CIBIL_PAN' || d.documentType === 'CIBIL_REPORT');
      if (cibilDoc) {
        setManualCibilPan((prev) => ({
          ...prev,
          backOfficeApplicationDocumentId: cibilDoc.backOfficeApplicationDocumentId,
          documentType: cibilDoc.documentType,
          documentTitle: cibilDoc.documentTitle || 'Manual CIBIL PAN Card',
          fileName: cibilDoc.originalFileName || cibilDoc.documentTitle || 'Manual CIBIL PAN Document',
          fileSize: formatFileSize(cibilDoc.fileSize),
          uploadedAt: cibilDoc.uploadedAt,
          modifiedAt: cibilDoc.modifiedAt || '',
          modifiedBy: cibilDoc.modifiedBy || null,
          documentStatus: cibilDoc.documentStatus || 'Uploaded',
          remarks: cibilDoc.remarks || '',
          error: null,
        }));
      }
    } catch (err) {
      console.warn('[CustomerVerification] Failed to fetch Back Office documents:', err?.message);
    }
  }, [verificationData]);

  useEffect(() => {
    if (verificationData) {
      fetchBackOfficeDocuments();
    }
  }, [verificationData, fetchBackOfficeDocuments]);

  const getActiveRejectionForApplicant = useCallback(
    (stepNum, docTypeId) => {
      const baseType = STEP_DOC_TYPE_MAP[stepNum] || '';
      if (!baseType && !docTypeId) return null;
      return (
        applicationRejections
          .filter((r) => {
            if (r.isActive === false) return false;
            const seq = r.applicantSequence !== undefined && r.applicantSequence !== null && !isNaN(Number(r.applicantSequence))
              ? Number(r.applicantSequence)
              : null;
            if (seq !== null && seq > 0) return false;

            const rType = String(r.rejectedDocumentType || '').toUpperCase().trim();
            if (rType.startsWith('CO_APPLICANT') || rType.startsWith('CO-APPLICANT') || rType.startsWith('COAPPLICANT')) return false;

            // If kycDocumentId is present and applicantKycId is known, check if it's explicitly a Co-applicant KYC
            if (seq === null && r.kycDocumentId && applicantKycId && Number(r.kycDocumentId) !== Number(applicantKycId) && !rType.startsWith('APPLICANT')) {
              return false;
            }

            // Match by docTypeId if passed or matched from known document type
            if (docTypeId && r.documentTypeId && Number(r.documentTypeId) === Number(docTypeId)) return true;

            // Document type specific matches
            if (stepNum === 2 && ((profileDocTypeId && Number(r.documentTypeId) === Number(profileDocTypeId)) || /(profile|photo)/i.test(rType))) return true;
            if (stepNum === 3 && ((aadhaarDocTypeId && Number(r.documentTypeId) === Number(aadhaarDocTypeId)) || /(aadhaar|aadhar)/i.test(rType))) return true;
            if (stepNum === 4 && ((panDocTypeId && Number(r.documentTypeId) === Number(panDocTypeId)) || /\bpan\b/i.test(rType))) return true;
            if (stepNum === 5 && ((salarySlipDocTypeId && Number(r.documentTypeId) === Number(salarySlipDocTypeId)) || /(salary|payslip)/i.test(rType))) return true;
            if (stepNum === 6 && ((bankStatementDocTypeId && Number(r.documentTypeId) === Number(bankStatementDocTypeId)) || /(bank|statement)/i.test(rType))) return true;
            if (stepNum === 7 && ((zipArchiveDocTypeId && Number(r.documentTypeId) === Number(zipArchiveDocTypeId)) || /(zip|archive)/i.test(rType))) return true;

            return Boolean(baseType && (rType === baseType || rType === `APPLICANT_${baseType}` || rType.endsWith(`_${baseType}`) || rType.includes(baseType)));
          })
          .sort((a, b) => (b.backOfficeDocumentRejectionId || 0) - (a.backOfficeDocumentRejectionId || 0))[0] || null
      );
    },
    [applicationRejections, applicantKycId, profileDocTypeId, aadhaarDocTypeId, panDocTypeId, salarySlipDocTypeId, bankStatementDocTypeId, zipArchiveDocTypeId]
  );

  const getActiveRejectionForCoApplicant = useCallback(
    (coKycId, stepNum, coSequence) => {
      const baseType = STEP_DOC_TYPE_MAP[stepNum] || '';
      if (!baseType && !stepNum) return null;
      return (
        applicationRejections
          .filter((r) => {
            if (r.isActive === false) return false;
            const rType = String(r.rejectedDocumentType || '').toUpperCase().trim();

            // Check sequence: if sequence is explicitly 0, it's primary applicant
            const seq = r.applicantSequence !== undefined && r.applicantSequence !== null && !isNaN(Number(r.applicantSequence))
              ? Number(r.applicantSequence)
              : null;
            if (seq === 0) return false;

            // Match sequence if both have it
            if (seq !== null && coSequence !== undefined && coSequence !== null) {
              if (seq !== Number(coSequence)) return false;
            } else if (coKycId && r.kycDocumentId) {
              if (Number(r.kycDocumentId) !== Number(coKycId)) return false;
            } else if (!rType.startsWith('CO_APPLICANT') && !rType.startsWith('CO-APPLICANT') && !rType.startsWith('COAPPLICANT')) {
              return false;
            }

            // Document type specific matches
            if (stepNum === 2 && ((profileDocTypeId && Number(r.documentTypeId) === Number(profileDocTypeId)) || /(profile|photo)/i.test(rType))) return true;
            if (stepNum === 3 && ((aadhaarDocTypeId && Number(r.documentTypeId) === Number(aadhaarDocTypeId)) || /(aadhaar|aadhar)/i.test(rType))) return true;
            if (stepNum === 4 && ((panDocTypeId && Number(r.documentTypeId) === Number(panDocTypeId)) || /\bpan\b/i.test(rType))) return true;
            if (stepNum === 5 && ((salarySlipDocTypeId && Number(r.documentTypeId) === Number(salarySlipDocTypeId)) || /(salary|payslip)/i.test(rType))) return true;
            if (stepNum === 6 && ((bankStatementDocTypeId && Number(r.documentTypeId) === Number(bankStatementDocTypeId)) || /(bank|statement)/i.test(rType))) return true;
            if (stepNum === 7 && ((zipArchiveDocTypeId && Number(r.documentTypeId) === Number(zipArchiveDocTypeId)) || /(zip|archive)/i.test(rType))) return true;

            return Boolean(baseType && (rType === baseType || rType === `CO_APPLICANT_${baseType}` || rType.includes(baseType)));
          })
          .sort((a, b) => (b.backOfficeDocumentRejectionId || 0) - (a.backOfficeDocumentRejectionId || 0))[0] || null
      );
    },
    [applicationRejections, profileDocTypeId, aadhaarDocTypeId, panDocTypeId, salarySlipDocTypeId, bankStatementDocTypeId, zipArchiveDocTypeId]
  );

  const getActiveRejectionForStep = useCallback(
    (stepNum) => {
      return getActiveRejectionForApplicant(stepNum);
    },
    [getActiveRejectionForApplicant]
  );

  const getActiveRejectionForApplicantDoc = useCallback(
    (docTypeId, docTypeFallback) => {
      if (!applicationRejections || applicationRejections.length === 0) return null;
      return (
        applicationRejections
          .filter((r) => {
            if (r.isActive === false) return false;
            const rType = String(r.rejectedDocumentType || '').toUpperCase();
            const isCoApp =
              rType.startsWith('CO_APPLICANT') ||
              (r.applicantSequence !== undefined && r.applicantSequence !== null && Number(r.applicantSequence) > 0);
            if (isCoApp) return false;

            if (docTypeId && Number(r.documentTypeId) === Number(docTypeId)) return true;
            if (docTypeFallback && (rType === docTypeFallback || rType.includes(docTypeFallback))) return true;
            return false;
          })
          .sort((a, b) => (b.backOfficeDocumentRejectionId || 0) - (a.backOfficeDocumentRejectionId || 0))[0] || null
      );
    },
    [applicationRejections]
  );

  const getActiveRejectionForCoApplicantDoc = useCallback(
    (seq, docTypeId, docTypeFallback) => {
      if (!applicationRejections || applicationRejections.length === 0) return null;
      return (
        applicationRejections
          .filter((r) => {
            if (r.isActive === false) return false;
            const rType = String(r.rejectedDocumentType || '').toUpperCase();
            const matchesSeq = Number(r.applicantSequence) === Number(seq);
            const matchesCoLabel =
              rType.includes(`CO_APPLICANT_${seq}`) ||
              rType.includes(`CO_APPLICANT_${seq}_`) ||
              (rType.startsWith('CO_APPLICANT') && Number(seq) === 1);

            const matchesDocType =
              (docTypeId && Number(r.documentTypeId) === Number(docTypeId)) ||
              (docTypeFallback && rType.includes(docTypeFallback));

            return (matchesSeq || matchesCoLabel) && matchesDocType;
          })
          .sort((a, b) => (b.backOfficeDocumentRejectionId || 0) - (a.backOfficeDocumentRejectionId || 0))[0] || null
      );
    },
    [applicationRejections]
  );

  // Fetch applicant & co-applicants Salary Slip and Bank Statement documents concurrently
  const fetchFinancialDocuments = useCallback(async () => {
    if (isCustomerDocsLoading || isSupplementaryKycLoading) {
      return;
    }

    const appProdId =
      resolvedAppProdId ||
      verificationData?.applicationProductDetailsId ||
      verificationData?.application?.applicationProductDetailsId ||
      verificationData?.application?.ApplicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.applicationProductDetailsId ||
      verificationData?.raw?.productDetailsList?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.applicationProductDetails?.applicationProductDetailsId;

    const sTypeId = salarySlipDocTypeId;
    const bTypeId = bankStatementDocTypeId;
    const currentGen = ++financialFetchGenRef.current;

    // 1. Applicant Salary Slip (Parallel Task)
    const isApplicantSalarySlipApplicable =
      !sTypeId ||
      !mainApplicantEmploymentTypeId ||
      employmentTypeDocMappings.length === 0
        ? true
        : !getDocumentApplicability({
            documentTypeId: sTypeId,
            employmentTypeId: mainApplicantEmploymentTypeId,
            mappings: employmentTypeDocMappings,
          }).isNotRequired;

    let fetchSalaryPromise = Promise.resolve();

    if (!isApplicantSalarySlipApplicable) {
      if (currentGen === financialFetchGenRef.current) {
        setApplicantFinancialDocs((prev) => ({
          ...prev,
          salarySlip: {
            loading: false,
            data: null,
            preview: null,
            comparison: null,
            rejection: null,
            error: null,
            isNotRequired: true,
          },
        }));
      }
    } else {
      setApplicantFinancialDocs((prev) => ({
        ...prev,
        salarySlip: { ...(prev.salarySlip || {}), loading: true, error: null },
      }));
      fetchSalaryPromise = (async () => {
        try {
          const rej = getActiveRejectionForApplicantDoc(sTypeId, 'SALARY_SLIP');
          let preview = null;
          let comparison = null;
          let docData = null;

        if (rej && rej.status === 'Resubmitted') {
          const { oldDoc, newDoc } = resolveOldAndNewDocs(allCustomerDocs, rej, 'SALARY_SLIP', docTypeMasterMap);
          const oldPromise = rej.originalDocumentPath
            ? fetchKycDocByPath(rej.originalDocumentPath, 'Applicant_Salary_Slip_Old')
            : (oldDoc ? downloadAndPrepareDoc(oldDoc) : Promise.resolve(null));
          const newPromise = rej.currentDocumentPath
            ? fetchKycDocByPath(rej.currentDocumentPath, 'Applicant_Salary_Slip')
            : (newDoc ? downloadAndPrepareDoc(newDoc) : Promise.resolve(null));
          const [oldRes, newRes] = await Promise.all([oldPromise, newPromise]);
          comparison = {
            oldDoc: oldRes,
            newDoc: newRes,
            hasOldVersion: Boolean(oldRes?.url),
            hasNewVersion: Boolean(newRes?.url),
            note: !oldRes?.url ? 'Previous version is not available from the current document API.' : null,
            rejection: rej,
          };
          preview = newRes || oldRes;
          docData = newDoc || oldDoc;
        } else {
          const normalizeDocPath = (val) =>
            String(val || '')
              .trim()
              .replace(/\\/g, '/')
              .replace(/^\/+/, '');

          let slipDoc = null;

          if (rej && rej.status === 'Verified' && rej.currentDocumentPath) {
            const targetNorm = normalizeDocPath(rej.currentDocumentPath).toLowerCase();
            slipDoc = (allCustomerDocs || []).find((doc) => {
              const candidate = normalizeDocPath(
                doc.filePath || doc.documentPath || doc.path
              ).toLowerCase();
              return candidate === targetNorm;
            });
          }

          if (!slipDoc) {
            slipDoc = selectLatestApplicantDoc(allCustomerDocs, 'SALARY_SLIP', docTypeMasterMap);
          }

          if (slipDoc) {
            docData = slipDoc;
            preview = await downloadAndPrepareDoc(slipDoc);
          } else if (rej && rej.status === 'Verified' && rej.currentDocumentPath) {
            preview = await fetchKycDocByPath(rej.currentDocumentPath, 'Applicant_Salary_Slip');
            docData = {
              filePath: rej.currentDocumentPath,
              fileName: preview?.fileName || 'Applicant_Salary_Slip',
            };
          }
        }

        if (currentGen === financialFetchGenRef.current) {
          setApplicantFinancialDocs((prev) => ({
            ...prev,
            salarySlip: {
              loading: false,
              data: docData,
              preview,
              comparison,
              rejection: rej,
              error: null,
            },
          }));
        }
      } catch (err) {
        console.warn('Could not load applicant salary slip:', err);
        if (currentGen === financialFetchGenRef.current) {
          setApplicantFinancialDocs((prev) => ({
            ...prev,
            salarySlip: { loading: false, data: null, preview: null, comparison: null, rejection: null, error: null },
          }));
        }
      }
    })();
  }

    // 2. Applicant Bank Statement (Parallel Task)
    setApplicantFinancialDocs((prev) => ({
      ...prev,
      bankStatement: { ...(prev.bankStatement || {}), loading: true, error: null },
    }));
    const fetchBankPromise = (async () => {
      try {
        const rej = getActiveRejectionForApplicantDoc(bTypeId, 'BANK_STATEMENT');
        let preview = null;
        let comparison = null;
        let docData = null;

        if (rej && rej.status === 'Resubmitted') {
          const { oldDoc, newDoc } = resolveOldAndNewDocs(allCustomerDocs, rej, 'BANK_STATEMENT', docTypeMasterMap);
          const oldPromise = rej.originalDocumentPath
            ? fetchKycDocByPath(rej.originalDocumentPath, 'Applicant_Bank_Statement_Old')
            : (oldDoc ? downloadAndPrepareDoc(oldDoc) : Promise.resolve(null));
          const newPromise = rej.currentDocumentPath
            ? fetchKycDocByPath(rej.currentDocumentPath, 'Applicant_Bank_Statement')
            : (newDoc ? downloadAndPrepareDoc(newDoc) : Promise.resolve(null));
          const [oldRes, newRes] = await Promise.all([oldPromise, newPromise]);
          comparison = {
            oldDoc: oldRes,
            newDoc: newRes,
            hasOldVersion: Boolean(oldRes?.url),
            hasNewVersion: Boolean(newRes?.url),
            note: !oldRes?.url ? 'Previous version is not available from the current document API.' : null,
            rejection: rej,
          };
          preview = newRes || oldRes;
          docData = newDoc || oldDoc;
        } else {
          const normalizeDocPath = (val) =>
            String(val || '')
              .trim()
              .replace(/\\/g, '/')
              .replace(/^\/+/, '');

          let bankDoc = null;

          if (rej && rej.status === 'Verified' && rej.currentDocumentPath) {
            const targetNorm = normalizeDocPath(rej.currentDocumentPath).toLowerCase();
            bankDoc = (allCustomerDocs || []).find((doc) => {
              const candidate = normalizeDocPath(
                doc.filePath || doc.documentPath || doc.path
              ).toLowerCase();
              return candidate === targetNorm;
            });
          }

          if (!bankDoc) {
            bankDoc = selectLatestApplicantDoc(allCustomerDocs, 'BANK_STATEMENT', docTypeMasterMap);
          }

          if (bankDoc) {
            docData = bankDoc;
            preview = await downloadAndPrepareDoc(bankDoc);
          } else if (rej && rej.status === 'Verified' && rej.currentDocumentPath) {
            preview = await fetchKycDocByPath(rej.currentDocumentPath, 'Applicant_Bank_Statement');
            docData = {
              filePath: rej.currentDocumentPath,
              fileName: preview?.fileName || 'Applicant_Bank_Statement',
            };
          }
        }

        if (currentGen === financialFetchGenRef.current) {
          setApplicantFinancialDocs((prev) => ({
            ...prev,
            bankStatement: {
              loading: false,
              data: docData,
              preview,
              comparison,
              rejection: rej,
              error: null,
            },
          }));
        }
      } catch (err) {
        console.warn('Could not load applicant bank statement:', err);
        if (currentGen === financialFetchGenRef.current) {
          setApplicantFinancialDocs((prev) => ({
            ...prev,
            bankStatement: { loading: false, data: null, preview: null, comparison: null, rejection: null, error: null },
          }));
        }
      }
    })();

    // 3. Co-Applicants Salary Slips & Bank Statements (All Co-Applicants Concurrently)
    const coPromises = (appProdId && coApplicants && coApplicants.length > 0)
      ? coApplicants.map(async (co) => {
          const seq = co.sequence !== undefined ? co.sequence : (co.index !== undefined ? co.index + 1 : co.number);
          const idxKey = co.index !== undefined ? co.index : (seq - 1);

          let coSalarySlip = { loading: false, data: null, preview: null, comparison: null, rejection: null, error: null };
          let coBankStatement = { loading: false, data: null, preview: null, comparison: null, rejection: null, error: null };

          const coEmpId = getEmploymentTypeIdForSequence(seq);
          const isCoSalarySlipApplicable =
            !sTypeId || !coEmpId || employmentTypeDocMappings.length === 0
              ? true
              : !getDocumentApplicability({
                  documentTypeId: sTypeId,
                  employmentTypeId: coEmpId,
                  mappings: employmentTypeDocMappings,
                }).isNotRequired;

          const salaryCoPromise = (async () => {
            if (!sTypeId) return;
            if (!isCoSalarySlipApplicable) {
              coSalarySlip = {
                loading: false,
                data: null,
                preview: null,
                comparison: null,
                rejection: null,
                error: null,
                isNotRequired: true,
              };
              return;
            }
            try {
              const docRes = await backOfficeService.getApplicantDocument(appProdId, seq, sTypeId);
              const docData = docRes?.data || docRes?.value || docRes;
              const docPath = docData?.documentPath || docData?.DocumentPath || docData?.filePath || docData?.FilePath;
              const rej = getActiveRejectionForCoApplicantDoc(seq, sTypeId, 'SALARY_SLIP');
              let preview = null;
              let comparison = null;

              if (rej && rej.status === 'Resubmitted') {
                const oldPromise = rej.originalDocumentPath
                  ? fetchKycDocByPath(rej.originalDocumentPath, `CoApplicant_${co.number}_Salary_Slip_Old`)
                  : Promise.resolve(null);
                const newPromise = rej.currentDocumentPath
                  ? fetchKycDocByPath(rej.currentDocumentPath, `CoApplicant_${co.number}_Salary_Slip`)
                  : (docPath ? fetchKycDocByPath(docPath, `CoApplicant_${co.number}_Salary_Slip`) : Promise.resolve(null));
                const [oldRes, newRes] = await Promise.all([oldPromise, newPromise]);
                comparison = {
                  oldDoc: oldRes,
                  newDoc: newRes,
                  hasOldVersion: Boolean(oldRes?.url),
                  hasNewVersion: Boolean(newRes?.url),
                  note: !oldRes?.url ? 'Previous version is not available from the current document API.' : null,
                  rejection: rej,
                };
                preview = newRes || oldRes;
              } else if (docPath) {
                preview = await fetchKycDocByPath(docPath, `CoApplicant_${co.number}_Salary_Slip`);
              }

              coSalarySlip = { loading: false, data: docData, preview, comparison, rejection: rej, error: null };
            } catch (err) {
              coSalarySlip = { loading: false, data: null, preview: null, comparison: null, rejection: null, error: null };
            }
          })();

          const bankCoPromise = (async () => {
            if (!bTypeId) return;
            try {
              const docRes = await backOfficeService.getApplicantDocument(appProdId, seq, bTypeId);
              const docData = docRes?.data || docRes?.value || docRes;
              const docPath = docData?.documentPath || docData?.DocumentPath || docData?.filePath || docData?.FilePath;
              const rej = getActiveRejectionForCoApplicantDoc(seq, bTypeId, 'BANK_STATEMENT');
              let preview = null;
              let comparison = null;

              if (rej && rej.status === 'Resubmitted') {
                const oldPromise = rej.originalDocumentPath
                  ? fetchKycDocByPath(rej.originalDocumentPath, `CoApplicant_${co.number}_Bank_Statement_Old`)
                  : Promise.resolve(null);
                const newPromise = rej.currentDocumentPath
                  ? fetchKycDocByPath(rej.currentDocumentPath, `CoApplicant_${co.number}_Bank_Statement`)
                  : (docPath ? fetchKycDocByPath(docPath, `CoApplicant_${co.number}_Bank_Statement`) : Promise.resolve(null));
                const [oldRes, newRes] = await Promise.all([oldPromise, newPromise]);
                comparison = {
                  oldDoc: oldRes,
                  newDoc: newRes,
                  hasOldVersion: Boolean(oldRes?.url),
                  hasNewVersion: Boolean(newRes?.url),
                  note: !oldRes?.url ? 'Previous version is not available from the current document API.' : null,
                  rejection: rej,
                };
                preview = newRes || oldRes;
              } else if (docPath) {
                preview = await fetchKycDocByPath(docPath, `CoApplicant_${co.number}_Bank_Statement`);
              }

              coBankStatement = { loading: false, data: docData, preview, comparison, rejection: rej, error: null };
            } catch (err) {
              coBankStatement = { loading: false, data: null, preview: null, comparison: null, rejection: null, error: null };
            }
          })();

          await Promise.allSettled([salaryCoPromise, bankCoPromise]);

          if (currentGen === financialFetchGenRef.current) {
            setCoApplicantsFinancialDocs((prev) => ({
              ...prev,
              [idxKey]: {
                salarySlip: coSalarySlip,
                bankStatement: coBankStatement,
              },
            }));
          }
        })
      : [];

    await Promise.allSettled([fetchSalaryPromise, fetchBankPromise, ...coPromises]);
  }, [
    verificationData,
    salarySlipDocTypeId,
    bankStatementDocTypeId,
    coApplicants,
    allCustomerDocs,
    isCustomerDocsLoading,
    isSupplementaryKycLoading,
    docTypeMasterMap,
    getActiveRejectionForApplicantDoc,
    getActiveRejectionForCoApplicantDoc,
    downloadAndPrepareDoc,
    fetchKycDocByPath,
    selectLatestApplicantDoc,
    resolveOldAndNewDocs,
    mainApplicantEmploymentTypeId,
    getEmploymentTypeIdForSequence,
    employmentTypeDocMappings,
  ]);

  useEffect(() => {
    if (activeStep >= 2 && activeStep <= 7 && verificationData) {
      fetchFinancialDocuments();
    }
  }, [activeStep, verificationData, fetchFinancialDocuments]);

  const handleRefreshDocumentPreview = useCallback((stepNum) => {
    previewCacheRef.current.clear();
    if (stepNum === 2) {
      setDocPreviews((prev) => {
        if (prev?.profile?.comparison?.oldDoc?.url) {
          try { URL.revokeObjectURL(prev.profile.comparison.oldDoc.url); } catch {}
        }
        if (prev?.profile?.comparison?.newDoc?.url && prev.profile.comparison.newDoc.url !== prev.profile.url) {
          try { URL.revokeObjectURL(prev.profile.comparison.newDoc.url); } catch {}
        }
        if (prev?.profile?.url) {
          try { URL.revokeObjectURL(prev.profile.url); } catch {}
        }
        return { ...prev, profile: null };
      });
      setCoDocPreviews((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (next[k]?.profile?.comparison?.oldDoc?.url) {
            try { URL.revokeObjectURL(next[k].profile.comparison.oldDoc.url); } catch {}
          }
          if (next[k]?.profile?.comparison?.newDoc?.url && next[k].profile.comparison.newDoc.url !== next[k].profile.url) {
            try { URL.revokeObjectURL(next[k].profile.comparison.newDoc.url); } catch {}
          }
          if (next[k]?.profile?.url) {
            try { URL.revokeObjectURL(next[k].profile.url); } catch {}
          }
          if (next[k]) delete next[k].profile;
        });
        return next;
      });
    } else if (stepNum === 3) {
      setDocPreviews((prev) => {
        if (prev?.aadhaar?.comparison?.oldDoc?.url) {
          try { URL.revokeObjectURL(prev.aadhaar.comparison.oldDoc.url); } catch {}
        }
        if (prev?.aadhaar?.comparison?.newDoc?.url && prev.aadhaar.comparison.newDoc.url !== prev.aadhaar.url) {
          try { URL.revokeObjectURL(prev.aadhaar.comparison.newDoc.url); } catch {}
        }
        if (prev?.aadhaar?.url) {
          try { URL.revokeObjectURL(prev.aadhaar.url); } catch {}
        }
        return { ...prev, aadhaar: null };
      });
      setCoDocPreviews((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (next[k]?.aadhaar?.comparison?.oldDoc?.url) {
            try { URL.revokeObjectURL(next[k].aadhaar.comparison.oldDoc.url); } catch {}
          }
          if (next[k]?.aadhaar?.comparison?.newDoc?.url && next[k].aadhaar.comparison.newDoc.url !== next[k].aadhaar.url) {
            try { URL.revokeObjectURL(next[k].aadhaar.comparison.newDoc.url); } catch {}
          }
          if (next[k]?.aadhaar?.url) {
            try { URL.revokeObjectURL(next[k].aadhaar.url); } catch {}
          }
          if (next[k]) delete next[k].aadhaar;
        });
        return next;
      });
    } else if (stepNum === 4) {
      setDocPreviews((prev) => {
        if (prev?.pan?.comparison?.oldDoc?.url) {
          try { URL.revokeObjectURL(prev.pan.comparison.oldDoc.url); } catch {}
        }
        if (prev?.pan?.comparison?.newDoc?.url && prev.pan.comparison.newDoc.url !== prev.pan.url) {
          try { URL.revokeObjectURL(prev.pan.comparison.newDoc.url); } catch {}
        }
        if (prev?.pan?.url) {
          try { URL.revokeObjectURL(prev.pan.url); } catch {}
        }
        return { ...prev, pan: null };
      });
      setCoDocPreviews((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (next[k]?.pan?.comparison?.oldDoc?.url) {
            try { URL.revokeObjectURL(next[k].pan.comparison.oldDoc.url); } catch {}
          }
          if (next[k]?.pan?.comparison?.newDoc?.url && next[k].pan.comparison.newDoc.url !== next[k].pan.url) {
            try { URL.revokeObjectURL(next[k].pan.comparison.newDoc.url); } catch {}
          }
          if (next[k]?.pan?.url) {
            try { URL.revokeObjectURL(next[k].pan.url); } catch {}
          }
          if (next[k]) delete next[k].pan;
        });
        return next;
      });
    } else if (stepNum === 5) {
      setDocPreviews((prev) => {
        if (prev?.zip?.url) {
          try { URL.revokeObjectURL(prev.zip.url); } catch {}
        }
        return { ...prev, zip: null };
      });
      setApplicantFinancialDocs({
        salarySlip: { loading: false, data: null, preview: null, comparison: null, rejection: null, error: null },
        bankStatement: { loading: false, data: null, preview: null, comparison: null, rejection: null, error: null },
      });
      setCoApplicantsFinancialDocs({});
      fetchFinancialDocuments();
    }
  }, [fetchFinancialDocuments]);

  // Fetch document previews concurrently whenever active document verification workspace is open (Applicant + Co-Applicants)
  useEffect(() => {
    if (!verificationData) return;
    if (activeStep < 2 || activeStep > 7) return;
    if (isCustomerDocsLoading || isSupplementaryKycLoading) return;

    const currentGen = ++previewFetchGenRef.current;

    const combinedDocs = [...(allCustomerDocs || [])];
    const initialDocs = verificationData?.kycDocuments?.documents || [];
    initialDocs.forEach((d) => {
      if (!combinedDocs.some((cd) => (cd.agentCustomerDocumentId || cd.id) === (d.agentCustomerDocumentId || d.id))) {
        combinedDocs.push(d);
      }
    });

    // ── STEP 2: PROFILE IMAGE (CONCURRENT TASK) ──────────────────────
    (async () => {
      const appProfileRej = getActiveRejectionForApplicant(2, profileDocTypeId);
      const appRej = appProfileRej;
      const canonicalProfile = applicantKycRecord?.profileImagePath || applicantKycRecord?.ProfileImagePath || null;

      if (appRej && appRej.status === 'Resubmitted') {
        const oldPromise = appRej.originalDocumentPath
          ? fetchKycDocByPath(appRej.originalDocumentPath, 'Applicant_Profile_Old.jpg')
          : Promise.resolve(null);
        const newPromise = appRej.currentDocumentPath
          ? fetchKycDocByPath(appRej.currentDocumentPath, 'Applicant_Profile.jpg')
          : (applicantKycId && canonicalProfile
              ? fetchKycDocBlob(applicantKycId, 'profile-image', 'Applicant_Profile')
              : Promise.resolve(null));

        const [oldRes, newRes] = await Promise.all([oldPromise, newPromise]);
        if (currentGen !== previewFetchGenRef.current) return;
        setDocPreviews((prev) => ({
          ...prev,
          profile: {
            loading: false,
            error: null,
            isComparison: true,
            comparison: {
              oldDoc: oldRes,
              newDoc: newRes,
              hasOldVersion: Boolean(oldRes?.url),
              hasNewVersion: Boolean(newRes?.url),
              note: !oldRes?.url
                ? (!appRej.originalDocumentPath
                    ? 'Prior version path was not recorded for this rejection.'
                    : (oldRes?.error || 'Previous version could not be retrieved from server.'))
                : null,
              rejection: appRej,
            },
            url: newRes?.url || oldRes?.url || null,
            doc: null,
            fileName: newRes?.fileName || oldRes?.fileName || 'Applicant_Profile.jpg',
            size: newRes?.size || oldRes?.size || null,
            isImage: true,
            isPdf: false,
            rejection: appRej,
          },
        }));
      } else {
        let res = null;
        if (canonicalProfile) {
          if (applicantKycId) {
            res = await fetchKycDocBlob(applicantKycId, 'profile-image', 'Applicant_Profile');
          }
          if (!res?.url) {
            res = await fetchKycDocByPath(canonicalProfile, 'Applicant_Profile.jpg');
          }
        }

        // Safe fallback to AgentCustomerDocument if canonical KYC is missing or unretrievable
        if (!res?.url) {
          const fallbackDoc = selectLatestApplicantDoc(allCustomerDocs, 2, docTypeMasterMap);
          if (fallbackDoc) {
            const fallbackRes = await downloadAndPrepareDoc(fallbackDoc);
            if (fallbackRes?.url) {
              res = {
                loading: false,
                error: null,
                url: fallbackRes.url,
                doc: fallbackDoc,
                fileName: fallbackRes.fileName || 'Applicant_Profile.jpg',
                size: fallbackRes.size,
                isImage: true,
                isPdf: false,
              };
            }
          }
        }

        if (currentGen !== previewFetchGenRef.current) return;
        if (res?.url) {
          setDocPreviews((prev) => ({
            ...prev,
            profile: {
              ...(res || {}),
              isComparison: false,
              comparison: null,
              rejection: appRej,
            },
          }));
        } else {
          setDocPreviews((prev) => ({
            ...prev,
            profile: { loading: false, error: null, doc: null, url: null, rejection: appRej },
          }));
        }
      }
    })();

    // ── STEP 2: CO-APPLICANTS PROFILE IMAGES (CONCURRENT TASKS) ──────
    (coApplicants || []).forEach((co) => {
      const coSeq = co.sequence !== undefined ? Number(co.sequence) : (co.index + 1);
      const coKyc =
        co.kycRecord ||
        co.kyc ||
        (resolvedKycList || []).find(
          (k) =>
            k &&
            k.isActive !== false &&
            k.IsActive !== false &&
            !isApplicantDocumentTuple(k) &&
            Number(k.applicantSequence ?? k.ApplicantSequence) === coSeq
        ) ||
        {};
      const coKycId =
        co.kycDocumentId ||
        coKyc.applicationKYCDocumentId ||
        coKyc.ApplicationKYCDocumentId ||
        coKyc.kycDocumentId ||
        coKyc.id ||
        null;
      const canonicalCoProfile = coKyc.profileImagePath || coKyc.ProfileImagePath || null;

      (async () => {
        const coRej = getActiveRejectionForCoApplicant(coKycId, 2, coSeq);
        if (coRej && coRej.status === 'Resubmitted') {
          const oldPromise = coRej.originalDocumentPath
            ? fetchKycDocByPath(coRej.originalDocumentPath, `CoApplicant_${co.number}_Profile_Old.jpg`)
            : Promise.resolve(null);
          const newPromise = coRej.currentDocumentPath
            ? fetchKycDocByPath(coRej.currentDocumentPath, `CoApplicant_${co.number}_Profile.jpg`)
            : (coKycId && canonicalCoProfile
                ? fetchKycDocBlob(coKycId, 'profile-image', `CoApplicant_${co.number}_Profile`)
                : Promise.resolve(null));

          const [oldRes, newRes] = await Promise.all([oldPromise, newPromise]);
          if (currentGen !== previewFetchGenRef.current) return;
          setCoDocPreviews((prev) => ({
            ...prev,
            [co.index]: {
              ...(prev[co.index] || {}),
              profile: {
                loading: false,
                error: null,
                isComparison: true,
                comparison: {
                  oldDoc: oldRes,
                  newDoc: newRes,
                  hasOldVersion: Boolean(oldRes?.url),
                  hasNewVersion: Boolean(newRes?.url),
                  note: !oldRes?.url
                    ? (!coRej.originalDocumentPath
                        ? 'Prior version path was not recorded for this rejection.'
                        : (oldRes?.error || 'Previous version could not be retrieved from server.'))
                    : null,
                  rejection: coRej,
                },
                url: newRes?.url || oldRes?.url || null,
                fileName: newRes?.fileName || oldRes?.fileName || `CoApplicant_${co.number}_Profile.jpg`,
                size: newRes?.size || oldRes?.size || null,
                isImage: true,
                isPdf: false,
                rejection: coRej,
              },
            },
          }));
        } else if (canonicalCoProfile) {
          const res = coKycId
            ? await fetchKycDocBlob(coKycId, 'profile-image', `CoApplicant_${co.number}_Profile`)
            : await fetchKycDocByPath(canonicalCoProfile, `CoApplicant_${co.number}_Profile.jpg`);
          if (currentGen !== previewFetchGenRef.current) return;
          setCoDocPreviews((prev) => ({
            ...prev,
            [co.index]: {
              ...(prev[co.index] || {}),
              profile: { ...(res || {}), isComparison: false, comparison: null, rejection: coRej },
            },
          }));
        } else {
          if (currentGen !== previewFetchGenRef.current) return;
          setCoDocPreviews((prev) => ({
            ...prev,
            [co.index]: {
              ...(prev[co.index] || {}),
              profile: { loading: false, error: null, doc: null, url: null, rejection: coRej },
            },
          }));
        }
      })();
    });

    // ── STEP 3: AADHAAR CARD (CONCURRENT TASK) ───────────────────────
    (async () => {
      const appAadhaarRej = getActiveRejectionForApplicant(3, aadhaarDocTypeId);
      const appRej = appAadhaarRej;
      const canonicalAadhaar = applicantKycRecord?.aadharDocumentPath || applicantKycRecord?.AadharDocumentPath || applicantKycRecord?.aadhaarDocumentPath || applicantKycRecord?.AadhaarDocumentPath || null;

      if (appRej && appRej.status === 'Resubmitted') {
        const oldPromise = appRej.originalDocumentPath
          ? fetchKycDocByPath(appRej.originalDocumentPath, 'Applicant_Aadhaar_Old')
          : Promise.resolve(null);
        const newPromise = (applicantKycId && canonicalAadhaar)
          ? fetchKycDocBlob(applicantKycId, 'aadhar', 'Applicant_Aadhaar')
          : (appRej.currentDocumentPath
              ? fetchKycDocByPath(appRej.currentDocumentPath, 'Applicant_Aadhaar')
              : Promise.resolve(null));

        const [oldRes, newRes] = await Promise.all([oldPromise, newPromise]);
        if (currentGen !== previewFetchGenRef.current) return;
        setDocPreviews((prev) => ({
          ...prev,
          aadhaar: {
            loading: false,
            error: null,
            isComparison: true,
            comparison: {
              oldDoc: oldRes,
              newDoc: newRes,
              hasOldVersion: Boolean(oldRes?.url),
              hasNewVersion: Boolean(newRes?.url),
              note: !oldRes?.url
                ? (!appRej.originalDocumentPath
                    ? 'Prior version path was not recorded for this rejection.'
                    : (oldRes?.error || 'Previous version could not be retrieved from server.'))
                : null,
              rejection: appRej,
            },
            url: newRes?.url || oldRes?.url || null,
            doc: null,
            fileName: newRes?.fileName || oldRes?.fileName || 'Applicant_Aadhaar.pdf',
            size: newRes?.size || oldRes?.size || null,
            isPdf: Boolean(newRes?.isPdf ?? oldRes?.isPdf),
            isImage: Boolean(newRes?.isImage ?? oldRes?.isImage),
            rejection: appRej,
          },
        }));
      } else {
        let res = null;
        if (canonicalAadhaar) {
          if (applicantKycId) {
            res = await fetchKycDocBlob(applicantKycId, 'aadhar', 'Applicant_Aadhaar');
          }
          if (!res?.url) {
            res = await fetchKycDocByPath(canonicalAadhaar, 'Applicant_Aadhaar.pdf');
          }
        }

        // Safe fallback to AgentCustomerDocument if canonical KYC is missing or unretrievable
        if (!res?.url) {
          const fallbackDoc = selectLatestApplicantDoc(allCustomerDocs, 3, docTypeMasterMap);
          if (fallbackDoc) {
            const fallbackRes = await downloadAndPrepareDoc(fallbackDoc);
            if (fallbackRes?.url) {
              res = {
                loading: false,
                error: null,
                url: fallbackRes.url,
                doc: fallbackDoc,
                fileName: fallbackRes.fileName || 'Applicant_Aadhaar.pdf',
                size: fallbackRes.size,
                isImage: fallbackRes.isImage,
                isPdf: fallbackRes.isPdf,
              };
            }
          }
        }

        if (currentGen !== previewFetchGenRef.current) return;
        if (res?.url) {
          setDocPreviews((prev) => ({
            ...prev,
            aadhaar: {
              ...(res || {}),
              isComparison: false,
              comparison: null,
              rejection: appRej,
            },
          }));
        } else {
          setDocPreviews((prev) => ({
            ...prev,
            aadhaar: { loading: false, error: null, doc: null, url: null, rejection: appRej },
          }));
        }
      }
    })();

    // ── STEP 3: CO-APPLICANTS AADHAAR (CONCURRENT TASKS) ─────────────
    (coApplicants || []).forEach((co) => {
      const coSeq = co.sequence !== undefined ? Number(co.sequence) : (co.index + 1);
      const coKyc =
        co.kycRecord ||
        co.kyc ||
        (resolvedKycList || []).find(
          (k) =>
            k &&
            k.isActive !== false &&
            k.IsActive !== false &&
            !isApplicantDocumentTuple(k) &&
            Number(k.applicantSequence ?? k.ApplicantSequence) === coSeq
        ) ||
        {};
      const coKycId =
        co.kycDocumentId ||
        coKyc.applicationKYCDocumentId ||
        coKyc.ApplicationKYCDocumentId ||
        coKyc.kycDocumentId ||
        coKyc.id ||
        null;
      const canonicalCoAadhaar = coKyc.aadharDocumentPath || coKyc.AadharDocumentPath || null;

      (async () => {
        const coRej = getActiveRejectionForCoApplicant(coKycId, 3, coSeq);
        if (coRej && coRej.status === 'Resubmitted') {
          const oldPromise = coRej.originalDocumentPath
            ? fetchKycDocByPath(coRej.originalDocumentPath, `CoApplicant_${co.number}_Aadhaar_Old`)
            : Promise.resolve(null);
          const newPromise = (coKycId && canonicalCoAadhaar)
            ? fetchKycDocBlob(coKycId, 'aadhar', `CoApplicant_${co.number}_Aadhaar`)
            : (coRej.currentDocumentPath
                ? fetchKycDocByPath(coRej.currentDocumentPath, `CoApplicant_${co.number}_Aadhaar`)
                : Promise.resolve(null));

          const [oldRes, newRes] = await Promise.all([oldPromise, newPromise]);
          if (currentGen !== previewFetchGenRef.current) return;
          setCoDocPreviews((prev) => ({
            ...prev,
            [co.index]: {
              ...(prev[co.index] || {}),
              aadhaar: {
                loading: false,
                error: null,
                isComparison: true,
                comparison: {
                  oldDoc: oldRes,
                  newDoc: newRes,
                  hasOldVersion: Boolean(oldRes?.url),
                  hasNewVersion: Boolean(newRes?.url),
                  note: !oldRes?.url
                    ? (!coRej.originalDocumentPath
                        ? 'Prior version path was not recorded for this rejection.'
                        : (oldRes?.error || 'Previous version could not be retrieved from server.'))
                    : null,
                  rejection: coRej,
                },
                url: newRes?.url || oldRes?.url || null,
                fileName: newRes?.fileName || oldRes?.fileName || `CoApplicant_${co.number}_Aadhaar`,
                size: newRes?.size || oldRes?.size || null,
                isPdf: Boolean(newRes?.isPdf ?? oldRes?.isPdf),
                isImage: Boolean(newRes?.isImage ?? oldRes?.isImage),
                rejection: coRej,
              },
            },
          }));
        } else if (canonicalCoAadhaar) {
          const res = coKycId
            ? await fetchKycDocBlob(coKycId, 'aadhar', `CoApplicant_${co.number}_Aadhaar`)
            : await fetchKycDocByPath(canonicalCoAadhaar, `CoApplicant_${co.number}_Aadhaar.pdf`);
          if (currentGen !== previewFetchGenRef.current) return;
          setCoDocPreviews((prev) => ({
            ...prev,
            [co.index]: {
              ...(prev[co.index] || {}),
              aadhaar: { ...(res || {}), isComparison: false, comparison: null, rejection: coRej },
            },
          }));
        } else {
          if (currentGen !== previewFetchGenRef.current) return;
          setCoDocPreviews((prev) => ({
            ...prev,
            [co.index]: {
              ...(prev[co.index] || {}),
              aadhaar: { loading: false, error: null, doc: null, url: null, rejection: coRej },
            },
          }));
        }
      })();
    });

    // ── STEP 4: PAN CARD (CONCURRENT TASK) ───────────────────────────
    (async () => {
      const appPanRej = getActiveRejectionForApplicant(4, panDocTypeId);
      const appRej = appPanRej;
      const canonicalPan = applicantKycRecord?.panCardPath || applicantKycRecord?.PanCardPath || applicantKycRecord?.PANCardPath || null;

      if (appRej && appRej.status === 'Resubmitted') {
        const oldPromise = appRej.originalDocumentPath
          ? fetchKycDocByPath(appRej.originalDocumentPath, 'Applicant_PAN_Old')
          : Promise.resolve(null);
        const newPromise = (applicantKycId && canonicalPan)
          ? fetchKycDocBlob(applicantKycId, 'pan', 'Applicant_PAN')
          : (appRej.currentDocumentPath
              ? fetchKycDocByPath(appRej.currentDocumentPath, 'Applicant_PAN')
              : Promise.resolve(null));

        const [oldRes, newRes] = await Promise.all([oldPromise, newPromise]);
        if (currentGen !== previewFetchGenRef.current) return;
        setDocPreviews((prev) => ({
          ...prev,
          pan: {
            loading: false,
            error: null,
            isComparison: true,
            comparison: {
              oldDoc: oldRes,
              newDoc: newRes,
              hasOldVersion: Boolean(oldRes?.url),
              hasNewVersion: Boolean(newRes?.url),
              note: !oldRes?.url
                ? (!appRej.originalDocumentPath
                    ? 'Prior version path was not recorded for this rejection.'
                    : (oldRes?.error || 'Previous version could not be retrieved from server.'))
                : null,
              rejection: appRej,
            },
            url: newRes?.url || oldRes?.url || null,
            doc: null,
            fileName: newRes?.fileName || oldRes?.fileName || 'Applicant_PAN.pdf',
            size: newRes?.size || oldRes?.size || null,
            isPdf: Boolean(newRes?.isPdf ?? oldRes?.isPdf),
            isImage: Boolean(newRes?.isImage ?? oldRes?.isImage),
            rejection: appRej,
          },
        }));
      } else {
        let res = null;
        if (canonicalPan) {
          if (applicantKycId) {
            res = await fetchKycDocBlob(applicantKycId, 'pan', 'Applicant_PAN');
          }
          if (!res?.url) {
            res = await fetchKycDocByPath(canonicalPan, 'Applicant_PAN.pdf');
          }
        }

        // Safe fallback to AgentCustomerDocument if canonical KYC is missing or unretrievable
        if (!res?.url) {
          const fallbackDoc = selectLatestApplicantDoc(allCustomerDocs, 4, docTypeMasterMap);
          if (fallbackDoc) {
            const fallbackRes = await downloadAndPrepareDoc(fallbackDoc);
            if (fallbackRes?.url) {
              res = {
                loading: false,
                error: null,
                url: fallbackRes.url,
                doc: fallbackDoc,
                fileName: fallbackRes.fileName || 'Applicant_PAN.pdf',
                size: fallbackRes.size,
                isImage: fallbackRes.isImage,
                isPdf: fallbackRes.isPdf,
              };
            }
          }
        }

        if (currentGen !== previewFetchGenRef.current) return;
        if (res?.url) {
          setDocPreviews((prev) => ({
            ...prev,
            pan: {
              ...(res || {}),
              isComparison: false,
              comparison: null,
              rejection: appRej,
            },
          }));
        } else {
          setDocPreviews((prev) => ({
            ...prev,
            pan: { loading: false, error: null, doc: null, url: null, rejection: appRej },
          }));
        }
      }
    })();

    // ── STEP 4: CO-APPLICANTS PAN (CONCURRENT TASKS) ─────────────────
    (coApplicants || []).forEach((co) => {
      const coSeq = co.sequence !== undefined ? Number(co.sequence) : (co.index + 1);
      const coKyc =
        co.kycRecord ||
        co.kyc ||
        (resolvedKycList || []).find(
          (k) =>
            k &&
            k.isActive !== false &&
            k.IsActive !== false &&
            !isApplicantDocumentTuple(k) &&
            Number(k.applicantSequence ?? k.ApplicantSequence) === coSeq
        ) ||
        {};
      const coKycId =
        co.kycDocumentId ||
        coKyc.applicationKYCDocumentId ||
        coKyc.ApplicationKYCDocumentId ||
        coKyc.kycDocumentId ||
        coKyc.id ||
        null;
      const canonicalCoPan = coKyc.panCardPath || coKyc.PanCardPath || coKyc.PANCardPath || null;

      (async () => {
        const coRej = getActiveRejectionForCoApplicant(coKycId, 4, coSeq);
        if (coRej && coRej.status === 'Resubmitted') {
          const oldPromise = coRej.originalDocumentPath
            ? fetchKycDocByPath(coRej.originalDocumentPath, `CoApplicant_${co.number}_PAN_Old`)
            : Promise.resolve(null);
          const newPromise = (coKycId && canonicalCoPan)
            ? fetchKycDocBlob(coKycId, 'pan', `CoApplicant_${co.number}_PAN`)
            : (coRej.currentDocumentPath
                ? fetchKycDocByPath(coRej.currentDocumentPath, `CoApplicant_${co.number}_PAN`)
                : Promise.resolve(null));

          const [oldRes, newRes] = await Promise.all([oldPromise, newPromise]);
          if (currentGen !== previewFetchGenRef.current) return;
          setCoDocPreviews((prev) => ({
            ...prev,
            [co.index]: {
              ...(prev[co.index] || {}),
              pan: {
                loading: false,
                error: null,
                isComparison: true,
                comparison: {
                  oldDoc: oldRes,
                  newDoc: newRes,
                  hasOldVersion: Boolean(oldRes?.url),
                  hasNewVersion: Boolean(newRes?.url),
                  note: !oldRes?.url
                    ? (!coRej.originalDocumentPath
                        ? 'Prior version path was not recorded for this rejection.'
                        : (oldRes?.error || 'Previous version could not be retrieved from server.'))
                    : null,
                  rejection: coRej,
                },
                url: newRes?.url || oldRes?.url || null,
                fileName: newRes?.fileName || oldRes?.fileName || `CoApplicant_${co.number}_PAN`,
                size: newRes?.size || oldRes?.size || null,
                isPdf: Boolean(newRes?.isPdf ?? oldRes?.isPdf),
                isImage: Boolean(newRes?.isImage ?? oldRes?.isImage),
                rejection: coRej,
              },
            },
          }));
        } else if (canonicalCoPan) {
          const res = coKycId
            ? await fetchKycDocBlob(coKycId, 'pan', `CoApplicant_${co.number}_PAN`)
            : await fetchKycDocByPath(canonicalCoPan, `CoApplicant_${co.number}_PAN.pdf`);
          if (currentGen !== previewFetchGenRef.current) return;
          setCoDocPreviews((prev) => ({
            ...prev,
            [co.index]: {
              ...(prev[co.index] || {}),
              pan: { ...(res || {}), isComparison: false, comparison: null, rejection: coRej },
            },
          }));
        } else {
          if (currentGen !== previewFetchGenRef.current) return;
          setCoDocPreviews((prev) => ({
            ...prev,
            [co.index]: {
              ...(prev[co.index] || {}),
              pan: { loading: false, error: null, doc: null, url: null, rejection: coRej },
            },
          }));
        }
      })();
    });

    // ── STEP 7: ZIP ARCHIVE / MANUAL DOCUMENTS ────────────────────────
    (async () => {
      const appZipRej = getActiveRejectionForApplicant(7, zipArchiveDocTypeId);
      if (appZipRej && appZipRej.status === 'Resubmitted') {
        const slotIdx =
          appZipRej.manualDocumentIndex !== undefined && appZipRej.manualDocumentIndex !== null
            ? Number(appZipRej.manualDocumentIndex)
            : 0;
        const slotLabel = `Applicant_Manual_Doc_${slotIdx + 1}`;
        const oldPromise = appZipRej.originalDocumentPath
          ? fetchKycDocByPath(appZipRej.originalDocumentPath, `${slotLabel}_Old`)
          : Promise.resolve(null);
        const newPromise = appZipRej.currentDocumentPath
          ? fetchKycDocByPath(appZipRej.currentDocumentPath, slotLabel)
          : Promise.resolve(null);

        const [oldRes, newRes] = await Promise.all([oldPromise, newPromise]);
        if (currentGen !== previewFetchGenRef.current) return;
        setDocPreviews((prev) => ({
          ...prev,
          zip: {
            loading: false,
            error: null,
            isComparison: true,
            comparison: {
              oldDoc: oldRes,
              newDoc: newRes,
              hasOldVersion: Boolean(oldRes?.url),
              hasNewVersion: Boolean(newRes?.url),
              note: !oldRes?.url
                ? (!appZipRej.originalDocumentPath
                    ? 'Prior version path was not recorded for this rejection.'
                    : (oldRes?.error || 'Previous version could not be retrieved from server.'))
                : null,
              rejection: appZipRej,
            },
            url: newRes?.url || oldRes?.url || null,
            fileName: newRes?.fileName || oldRes?.fileName || `Applicant_Manual_Doc_${slotIdx + 1}`,
            size: newRes?.size || oldRes?.size || null,
            isPdf: Boolean(newRes?.isPdf ?? oldRes?.isPdf),
            isImage: Boolean(newRes?.isImage ?? oldRes?.isImage),
            rejection: appZipRej,
          },
        }));
      } else {
        const zipDoc = combinedDocs.find(
          (d) =>
            /\.zip$/i.test(d.fileName || '') ||
            /(zip|archive)/i.test(d.documentTypeName || d.name || d.fileName || '')
        );
        if (currentGen !== previewFetchGenRef.current) return;
        if (zipDoc) {
          setDocPreviews((prev) => ({
            ...prev,
            zip: { loading: false, error: null, doc: zipDoc, url: null, comparison: null, rejection: appZipRej },
          }));
        } else {
          setDocPreviews((prev) => ({
            ...prev,
            zip: { loading: false, error: null, doc: null, url: null, comparison: null, rejection: appZipRej },
          }));
        }
      }
    })();

    // Co-applicants step 7 manual documents preview
    (coApplicants || []).forEach((co) => {
      const coKycId = co.kycDocumentId;
      const coSeq = co.sequence || co.number || (co.index + 1);
      (async () => {
        const coZipRej = getActiveRejectionForCoApplicant(coKycId, 7, coSeq);
        if (coZipRej && coZipRej.status === 'Resubmitted') {
          const slotIdx =
            coZipRej.manualDocumentIndex !== undefined && coZipRej.manualDocumentIndex !== null
              ? Number(coZipRej.manualDocumentIndex)
              : 0;
          const slotLabel = `CoApplicant_${co.number}_Manual_Doc_${slotIdx + 1}`;
          const oldPromise = coZipRej.originalDocumentPath
            ? fetchKycDocByPath(coZipRej.originalDocumentPath, `${slotLabel}_Old`)
            : Promise.resolve(null);
          const newPromise = coZipRej.currentDocumentPath
            ? fetchKycDocByPath(coZipRej.currentDocumentPath, slotLabel)
            : Promise.resolve(null);

          const [oldRes, newRes] = await Promise.all([oldPromise, newPromise]);
          if (currentGen !== previewFetchGenRef.current) return;
          setCoDocPreviews((prev) => ({
            ...prev,
            [co.index]: {
              ...(prev[co.index] || {}),
              zip: {
                loading: false,
                error: null,
                isComparison: true,
                comparison: {
                  oldDoc: oldRes,
                  newDoc: newRes,
                  hasOldVersion: Boolean(oldRes?.url),
                  hasNewVersion: Boolean(newRes?.url),
                  note: !oldRes?.url
                    ? (!coZipRej.originalDocumentPath
                        ? 'Prior version path was not recorded for this rejection.'
                        : (oldRes?.error || 'Previous version could not be retrieved from server.'))
                    : null,
                  rejection: coZipRej,
                },
                url: newRes?.url || oldRes?.url || null,
                fileName: newRes?.fileName || oldRes?.fileName || `CoApplicant_${co.number}_Manual_Doc_${slotIdx + 1}`,
                size: newRes?.size || oldRes?.size || null,
                isPdf: Boolean(newRes?.isPdf ?? oldRes?.isPdf),
                isImage: Boolean(newRes?.isImage ?? oldRes?.isImage),
                rejection: coZipRej,
              },
            },
          }));
        }
      })();
    });
  }, [
    activeStep,
    verificationData,
    isCustomerDocsLoading,
    isSupplementaryKycLoading,
    allCustomerDocs,
    docTypeMasterMap,
    applicationRejections,
    downloadAndPrepareDoc,
    fetchKycDocBlob,
    fetchKycDocByPath,
    applicantKycId,
    coApplicants,
    getActiveRejectionForApplicant,
    getActiveRejectionForCoApplicant,
    resolveOldAndNewDocs,
    selectLatestApplicantDoc,
    profileDocTypeId,
    aadhaarDocTypeId,
    panDocTypeId,
  ]);

  // Reject / Send to RM Handler for Steps 2, 3, 4, 5 (supporting KYC & composite tuple documents)
  const handleRejectOrSendToRm = async (
    stepNum,
    stepLabel,
    customKycId = null,
    isCoApplicant = false,
    customAppSeq = null,
    customDocTypeId = null,
    customRejectedType = null,
    customRemarks = null,
    manualDocumentIndex = null
  ) => {
    const remarks = (customRemarks !== null ? customRemarks : (stepRemarks[stepNum] || '')).trim();
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

    const boAuth = getBackOfficeAuth();
    const backOfficeId = Number(boAuth?.id || boAuth?.backOfficeId || localStorage.getItem('backOfficeId') || 4);
    const rmId = Number(
      verificationData?.rmId ||
      verificationData?.customer?.rmId ||
      verificationData?.application?.rmId ||
      verificationData?.raw?.customer?.rmId ||
      20
    );
    const appProdId = Number(
      resolvedAppProdId ||
      calculationAppProdId ||
      verificationData?.applicationProductDetailsId ||
      verificationData?.application?.applicationProductDetailsId ||
      verificationData?.application?.ApplicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.applicationProductDetailsId ||
      verificationData?.raw?.productDetailsList?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.applicationProductDetails?.applicationProductDetailsId ||
      0
    );
    const agentCustId = Number(verificationData?.agentCustomerId || customerId || null);
    const baseType = STEP_DOC_TYPE_MAP[stepNum] || stepLabel.toUpperCase().replace(/\s+/g, '_');
    const docType = isCoApplicant ? `CO_APPLICANT_${baseType}` : `APPLICANT_${baseType}`;
    const effectiveRejectedType = customRejectedType || docType;
    const isApplicantSalarySlip = effectiveRejectedType === 'APPLICANT_SALARY_SLIP';
    const kycId = isApplicantSalarySlip
      ? null
      : isCoApplicant
        ? (customKycId || null)
        : (customKycId !== undefined && customKycId !== null ? customKycId : (applicantKycId || null));

    const isIdentityDoc = ['PROFILE_IMAGE', 'AADHAAR', 'PAN', 'APPLICANT_PROFILE', 'APPLICANT_AADHAAR', 'APPLICANT_PAN', 'CO_APPLICANT_PROFILE', 'CO_APPLICANT_AADHAAR', 'CO_APPLICANT_PAN'].includes(effectiveRejectedType);
    if (isIdentityDoc) {
      const targetSeq =
        customAppSeq !== null && customAppSeq !== undefined
          ? Number(customAppSeq)
          : (isCoApplicant ? 1 : 0);

      const targetKyc = targetSeq === 0
        ? applicantKycRecord
        : (coApplicants.find((c) => c.sequence === targetSeq || c.number === targetSeq || (c.index + 1) === targetSeq)?.kyc || resolvedKycList[targetSeq]);

      const isProfile = effectiveRejectedType.includes('PROFILE') || effectiveRejectedType.includes('PHOTO');
      const isAadhaar = effectiveRejectedType.includes('AADHAAR') || effectiveRejectedType.includes('AADHAR');
      const isPan = effectiveRejectedType.includes('PAN');

      const canonicalPath = isProfile
        ? (targetKyc?.profileImagePath || targetKyc?.ProfileImagePath)
        : isAadhaar
          ? (targetKyc?.aadharDocumentPath || targetKyc?.AadharDocumentPath)
          : isPan
            ? (targetKyc?.panCardPath || targetKyc?.PanCardPath)
            : null;

      if (!kycId || !canonicalPath) {
        setStepFeedback((prev) => ({
          ...prev,
          [stepNum]: {
            type: 'error',
            message: 'Identity document file is not available for return.',
          },
        }));
        return;
      }
    }

    if (!appProdId) {
      setStepFeedback((prev) => ({
        ...prev,
        [stepNum]: {
          type: 'error',
          message: 'Application details ID not found. Unable to create rejection record.',
        },
      }));
      return;
    }

    setIsSubmittingRejection(true);
    try {
      const payload = {
        backOfficeId,
        rmId,
        agentCustomerId: agentCustId,
        applicationProductDetailsId: appProdId,
        applicantSequence:
          customAppSeq !== null && customAppSeq !== undefined
            ? Number(customAppSeq)
            : (isCoApplicant ? 1 : 0),
        documentTypeId: customDocTypeId ? Number(customDocTypeId) : null,
        kycDocumentId: kycId ? Number(kycId) : null,
        fieldVerificationId: null,
        rejectedDocumentType: customRejectedType || docType,
        rejectionRemarks: remarks,
        createdBy: backOfficeId,
      };

      if (manualDocumentIndex !== null && manualDocumentIndex !== undefined && !isNaN(Number(manualDocumentIndex))) {
        payload.manualDocumentIndex = Number(manualDocumentIndex);
      }

      await backOfficeService.createDocumentRejection(payload);
      setStepFeedback((prev) => ({
        ...prev,
        [stepNum]: {
          type: 'success',
          message: `${stepLabel} marked for RM review (Status: ReturnedToRM) with remarks: "${remarks}".`,
        },
      }));
      setStepRemarks((prev) => ({ ...prev, [stepNum]: '' }));

      // Rule 2: If rejected step was previously verified, invalidate and persist isVerified: false for this person only
      const rejectedStepCode = stepNumToStepCode(stepNum);
      const targetSeq =
        customAppSeq !== null && customAppSeq !== undefined
          ? Number(customAppSeq)
          : (isCoApplicant ? 1 : 0);

      if (rejectedStepCode && stepVerifications[targetSeq]?.[rejectedStepCode]?.isVerified === true) {
        try {
          await handleSaveStepVerification({
            applicantSequence: targetSeq,
            stepCode: rejectedStepCode,
            isVerified: false,
            remarks: stepVerifications[targetSeq]?.[rejectedStepCode]?.remarks || '',
            stepNum,
          });
        } catch (unverifyErr) {
          console.warn(`[CustomerVerification] Auto-unverify failed for seq ${targetSeq} ${rejectedStepCode}:`, unverifyErr);
        }
      }

      await fetchApplicationRejections();
      if (appProdId) {
        await fetchStepVerifications(appProdId);
      }
      await fetchAllCustomerDocs();
      await fetchFinancialDocuments();
      handleRefreshDocumentPreview(stepNum);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit document rejection to RM.';
      setStepFeedback((prev) => ({
        ...prev,
        [stepNum]: {
          type: 'error',
          message: msg,
        },
      }));
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  // Helper to generate dynamic rejection confirmation message
  const getRejectConfirmMessage = (stepLabel) => {
    if (!stepLabel) return 'Are you sure you want to reject this document?';
    const labelLower = stepLabel.toLowerCase();
    if (labelLower.startsWith('co-applicant') || labelLower.startsWith('co-app')) {
      return `Are you sure you want to reject ${stepLabel}?`;
    }
    return `Are you sure you want to reject this ${stepLabel}?`;
  };

  // Open Return to RM Confirmation Modal
  const handleOpenRejectConfirm = (
    stepNum,
    stepLabel,
    customKycId = null,
    isCoApplicant = false,
    applicantSequence = null,
    documentTypeId = null,
    rejectedDocumentType = null,
    manualDocumentIndex = null
  ) => {
    const existingRemarks = (stepRemarks[stepNum] || '').trim();
    setRejectConfirmModal({
      open: true,
      stepNum,
      stepLabel,
      customKycId,
      isCoApplicant,
      applicantSequence,
      documentTypeId,
      rejectedDocumentType,
      manualDocumentIndex,
      remarks: existingRemarks,
      error: '',
    });
  };

  // Cancel Return to RM Confirmation
  const handleCancelReject = () => {
    setRejectConfirmModal({
      open: false,
      stepNum: null,
      stepLabel: '',
      customKycId: null,
      isCoApplicant: false,
      applicantSequence: null,
      documentTypeId: null,
      rejectedDocumentType: null,
      manualDocumentIndex: null,
      remarks: '',
      error: '',
    });
  };

  // Confirm and Execute Return Document to RM (with mandatory remarks validation)
  const handleConfirmReject = async () => {
    const {
      stepNum,
      stepLabel,
      customKycId,
      isCoApplicant,
      applicantSequence,
      documentTypeId,
      rejectedDocumentType,
      manualDocumentIndex,
      remarks,
    } = rejectConfirmModal;

    const trimmed = (remarks || '').trim();
    if (!trimmed) {
      setRejectConfirmModal((prev) => ({
        ...prev,
        error: 'Remarks are required.',
      }));
      return;
    }

    setStepRemarks((prev) => ({ ...prev, [stepNum]: trimmed }));

    setRejectConfirmModal({
      open: false,
      stepNum: null,
      stepLabel: '',
      customKycId: null,
      isCoApplicant: false,
      applicantSequence: null,
      documentTypeId: null,
      rejectedDocumentType: null,
      manualDocumentIndex: null,
      remarks: '',
      error: '',
    });

    await handleRejectOrSendToRm(
      stepNum,
      stepLabel,
      customKycId,
      isCoApplicant,
      applicantSequence,
      documentTypeId,
      rejectedDocumentType,
      trimmed,
      manualDocumentIndex
    );
  };

  // Back Office Verify Resubmitted Rejection Handler
  const handleVerifyRejection = async (rejectionId, stepLabel, stepNum, applicantSequence = null) => {
    if (!rejectionId) return;
    const boAuth = getBackOfficeAuth();
    const backOfficeId = Number(boAuth?.id || boAuth?.backOfficeId || localStorage.getItem('backOfficeId') || 4);

    setIsVerifyingRejection(true);
    try {
      await backOfficeService.verifyDocumentRejection(rejectionId, backOfficeId);
      setStepFeedback((prev) => ({
        ...prev,
        [stepNum]: {
          type: 'success',
          message: `${stepLabel} rejection verified successfully. Updated document is now accepted.`,
        },
      }));

      // 1. Refetch rejection records to confirm status = Verified
      await fetchApplicationRejections();

      // Determine target applicant sequence for this rejection
      let targetSeq = applicantSequence;
      if (targetSeq === null || targetSeq === undefined) {
        const rej = applicationRejections.find(
          (r) =>
            Number(r.backOfficeDocumentRejectionId) === Number(rejectionId) ||
            Number(r.id) === Number(rejectionId)
        );
        if (rej?.applicantSequence !== undefined && rej?.applicantSequence !== null && !isNaN(Number(rej.applicantSequence))) {
          targetSeq = Number(rej.applicantSequence);
        } else {
          targetSeq = 0;
        }
      }

      // 2. Automatically persist step verification to true for this step and applicant sequence
      const stepCode = stepNumToStepCode(stepNum);
      if (stepCode) {
        try {
          await handleSaveStepVerification({
            applicantSequence: Number(targetSeq || 0),
            stepCode,
            isVerified: true,
            remarks: (stepRemarks[stepNum] || '').trim(),
            stepNum,
          });
        } catch (saveErr) {
          console.warn('Auto-save step verification after rejection verify note:', saveErr);
        }
      }

      // 3. Refetch full customer documents from server
      await fetchAllCustomerDocs();

      // 4. Refetch financial documents
      await fetchFinancialDocuments();

      // 5. Reset document previews for this step so fresh verified document loads
      handleRefreshDocumentPreview(stepNum);

      // 6. Force refresh Step 01 View Form
      setViewFormRefreshKey((prev) => prev + 1);

      // 7. Force refresh workspace data
      if (typeof refetch === 'function') {
        refetch();
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to verify document rejection.';
      setStepFeedback((prev) => ({
        ...prev,
        [stepNum]: {
          type: 'error',
          message: msg,
        },
      }));
    } finally {
      setIsVerifyingRejection(false);
    }
  };

  // ── Back Office Document Handlers (Steps 09, 10, 11) ───────────────────────
  const handleUploadOrReplaceDocument = async (e, stepType, currentState, setter) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 150 * 1024 * 1024) {
      setter((prev) => ({
        ...prev,
        error: `File size (${formatFileSize(file.size)}) exceeds the maximum 150 MB limit.`,
      }));
      e.target.value = '';
      return;
    }

    const allowedExts = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExts.includes(ext)) {
      setter((prev) => ({
        ...prev,
        error: `Invalid file format (${ext}). Supported formats: PDF, DOC, DOCX, JPG, PNG, WEBP.`,
      }));
      e.target.value = '';
      return;
    }

    const appProdId =
      verificationData?.application?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.applicationProductDetailsId ||
      verificationData?.raw?.applicationProductDetails?.applicationProductDetailsId;

    if (!appProdId) {
      setter((prev) => ({
        ...prev,
        error: 'Application Product Details ID is missing. Cannot upload document.',
      }));
      e.target.value = '';
      return;
    }

    const boAuth = getBackOfficeAuth();
    const backOfficeId = Number(
      boAuth?.id ||
      boAuth?.backOfficeId ||
      localStorage.getItem('backOfficeId')
    );

    if (!backOfficeId || Number.isNaN(backOfficeId)) {
      setter((prev) => ({
        ...prev,
        error: 'Unable to determine Back Office user. Please login again.',
      }));
      e.target.value = '';
      return;
    }

    const rmId = Number(
      verificationData?.customer?.rmId ||
      verificationData?.application?.rmId ||
      verificationData?.raw?.customer?.rmId ||
      20
    );

    let docType = 'LEGAL_OPINION';
    let docTitle = 'Legal Opinion Report';
    if (stepType === 'TECHNICAL_VALUATION') {
      docType = 'TECHNICAL_VALUATION';
      docTitle = 'Technical Valuation Report';
    } else if (stepType === 'MANUAL_CIBIL_PAN' || stepType === 'CIBIL_REPORT') {
      docType = 'CIBIL_REPORT';
      docTitle = 'Manual CIBIL PAN Card';
    }

    setter((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const formData = new FormData();
      formData.append('File', file);
      formData.append('DocumentType', docType);
      formData.append('DocumentTitle', docTitle);

      const isReplace = Boolean(currentState?.backOfficeApplicationDocumentId);

      if (isReplace) {
        formData.append('ApplicationProductDetailsId', String(appProdId));
        formData.append('BackOfficeId', String(backOfficeId));
        formData.append('RmId', String(rmId));
        formData.append('ModifiedBy', String(backOfficeId));
        if (currentState?.remarks) {
          formData.append('Remarks', currentState.remarks);
        } else {
          formData.append('Remarks', `Replaced ${docTitle}`);
        }

        const result = await backOfficeService.replaceApplicationDocument(
          currentState.backOfficeApplicationDocumentId,
          formData
        );

        if (currentState.fileUrl) {
          try {
            URL.revokeObjectURL(currentState.fileUrl);
          } catch {}
        }

        setter((prev) => ({
          ...prev,
          backOfficeApplicationDocumentId: result?.backOfficeApplicationDocumentId || currentState.backOfficeApplicationDocumentId,
          documentType: result?.documentType || docType,
          documentTitle: result?.documentTitle || docTitle,
          fileName: result?.originalFileName || file.name,
          fileSize: formatFileSize(result?.fileSize || file.size),
          uploadedAt: result?.uploadedAt || currentState.uploadedAt || new Date().toISOString(),
          modifiedAt: result?.modifiedAt || new Date().toISOString(),
          modifiedBy: result?.modifiedBy || backOfficeId,
          documentStatus: result?.documentStatus || 'Uploaded',
          remarks: result?.remarks !== undefined ? result.remarks : (currentState?.remarks || ''),
          fileUrl: null,
          loading: false,
          error: null,
          successMsg: 'Document replaced successfully',
        }));

        fetchBackOfficeDocuments();
      } else {
        formData.append('ApplicationProductDetailsId', String(appProdId));
        formData.append('BackOfficeId', String(backOfficeId));
        formData.append('RmId', String(rmId));
        formData.append('Remarks', `Uploaded ${docTitle}`);
        formData.append('UploadedBy', String(backOfficeId));

        const result = await backOfficeService.uploadApplicationDocument(formData);

        setter({
          backOfficeApplicationDocumentId: result?.backOfficeApplicationDocumentId,
          documentType: docType,
          documentTitle: result?.documentTitle || docTitle,
          fileName: result?.originalFileName || file.name,
          fileSize: formatFileSize(result?.fileSize || file.size),
          uploadedAt: result?.uploadedAt || new Date().toISOString(),
          documentStatus: result?.documentStatus || 'Uploaded',
          fileUrl: null,
          loading: false,
          error: null,
        });
      }
    } catch (err) {
      console.error(`Error uploading/replacing ${docTitle}:`, err);
      setter((prev) => ({
        ...prev,
        loading: false,
        error: err?.response?.data?.message || err?.message || `Failed to upload ${docTitle}. Please try again.`,
      }));
    } finally {
      e.target.value = '';
    }
  };

  const handleViewBackOfficeDocument = async (docState, setter) => {
    if (!docState?.backOfficeApplicationDocumentId) {
      if (docState?.fileUrl) {
        window.open(docState.fileUrl, '_blank');
      }
      return;
    }

    try {
      setter((prev) => ({ ...prev, loading: true, error: null }));
      const response = await backOfficeService.downloadApplicationDocument(
        docState.backOfficeApplicationDocumentId
      );
      const blob = response?.data || response;

      let mimeType = blob.type || 'application/octet-stream';
      const isPdf = /\.pdf$/i.test(docState.fileName) || mimeType === 'application/pdf';
      const isImage = /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(docState.fileName) || mimeType.startsWith('image/');

      if (isPdf) mimeType = 'application/pdf';
      else if (/\.(jpg|jpeg)$/i.test(docState.fileName)) mimeType = 'image/jpeg';
      else if (/\.png$/i.test(docState.fileName)) mimeType = 'image/png';
      else if (/\.webp$/i.test(docState.fileName)) mimeType = 'image/webp';

      const typedBlob = new Blob([blob], { type: mimeType });
      const objectUrl = window.URL.createObjectURL(typedBlob);
      blobUrlsRef.current.push(objectUrl);

      if (isPdf || isImage) {
        window.open(objectUrl, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = docState.fileName || 'document';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      setter((prev) => ({ ...prev, loading: false, fileUrl: objectUrl }));
    } catch (err) {
      console.error('Failed to view document:', err);
      setter((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to fetch document for preview.',
      }));
    }
  };

  const handleDownloadBackOfficeDocument = async (docState, setter) => {
    if (!docState?.backOfficeApplicationDocumentId) {
      if (docState?.fileUrl) {
        handleDownloadFile(docState.fileUrl, docState.fileName);
      }
      return;
    }

    try {
      setter((prev) => ({ ...prev, loading: true, error: null }));
      const response = await backOfficeService.downloadApplicationDocument(
        docState.backOfficeApplicationDocumentId
      );
      const blob = response?.data || response;

      const objectUrl = window.URL.createObjectURL(blob);
      blobUrlsRef.current.push(objectUrl);

      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = docState.fileName || 'document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setter((prev) => ({ ...prev, loading: false }));
    } catch (err) {
      console.error('Failed to download document:', err);
      setter((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to download document.',
      }));
    }
  };

  const handleDeleteBackOfficeDocument = (stepType, docState, setter) => {
    const docId = docState?.backOfficeApplicationDocumentId;
    if (!docId) return;

    let docTitle = 'Legal Opinion Report';
    if (stepType === 'TECHNICAL_VALUATION') {
      docTitle = 'Technical Valuation Report';
    } else if (stepType === 'MANUAL_CIBIL_PAN' || stepType === 'CIBIL_REPORT') {
      docTitle = 'Manual CIBIL PAN Card';
    }

    setDeleteDocModal({
      open: true,
      stepType,
      stepLabel: docTitle,
      docId,
      fileName: docState?.fileName || docState?.file?.name || '',
      docState,
      setter,
      isDeleting: false,
    });
  };

  const handleCancelDeleteDocument = () => {
    if (deleteDocModal.isDeleting) return;
    setDeleteDocModal({
      open: false,
      stepType: null,
      stepLabel: '',
      docId: null,
      fileName: '',
      docState: null,
      setter: null,
      isDeleting: false,
    });
  };

  const handleConfirmDeleteDocument = async () => {
    const { docId, stepType, stepLabel, docState, setter, isDeleting } = deleteDocModal;
    if (!docId || !setter || isDeleting) return;

    setDeleteDocModal((prev) => ({ ...prev, isDeleting: true }));
    setter((prev) => ({ ...prev, loading: true, error: null, successMsg: '' }));

    const docTitle = stepLabel || 'Document';

    try {
      await backOfficeService.deleteApplicationDocument(docId);

      if (docState?.fileUrl) {
        try {
          URL.revokeObjectURL(docState.fileUrl);
        } catch {}
      }

      setter({
        backOfficeApplicationDocumentId: null,
        documentType: stepType,
        documentTitle: docTitle,
        file: null,
        fileName: '',
        fileSize: '',
        fileUrl: null,
        isPdf: false,
        isImage: false,
        uploadedAt: '',
        modifiedAt: '',
        modifiedBy: null,
        documentStatus: '',
        remarks: '',
        loading: false,
        savingRemarks: false,
        error: null,
        successMsg: `${docTitle} deleted successfully.`,
      });

      fetchBackOfficeDocuments();
      setDeleteDocModal({
        open: false,
        stepType: null,
        stepLabel: '',
        docId: null,
        fileName: '',
        docState: null,
        setter: null,
        isDeleting: false,
      });
    } catch (err) {
      console.error(`Failed to delete ${docTitle}:`, err);
      setter((prev) => ({
        ...prev,
        loading: false,
        error: err?.response?.data?.message || err?.message || `Failed to delete ${docTitle}. Please try again.`,
      }));
      setDeleteDocModal({
        open: false,
        stepType: null,
        stepLabel: '',
        docId: null,
        fileName: '',
        docState: null,
        setter: null,
        isDeleting: false,
      });
    }
  };

  const handleOpenSaveRemarksConfirm = (stepType, stepLabel, docState, setter) => {
    if (!docState?.backOfficeApplicationDocumentId) {
      setter((prev) => ({
        ...prev,
        error: 'Please upload a document first before saving remarks.',
      }));
      return;
    }

    const trimmed = (docState.remarks || '').trim();
    if (!trimmed) {
      setter((prev) => ({
        ...prev,
        error: 'Please enter remarks before saving.',
      }));
      return;
    }

    setter((prev) => ({ ...prev, error: null, successMsg: '' }));
    setSaveRemarksModal({
      open: true,
      stepType,
      stepLabel,
      docId: docState.backOfficeApplicationDocumentId,
      remarks: trimmed,
      setter,
    });
  };

  const handleCancelSaveRemarks = () => {
    setSaveRemarksModal({
      open: false,
      stepType: null,
      stepLabel: '',
      docId: null,
      remarks: '',
      setter: null,
    });
  };

  const handleConfirmSaveRemarks = async () => {
    const { docId, remarks, stepLabel, setter } = saveRemarksModal;
    setSaveRemarksModal({
      open: false,
      stepType: null,
      stepLabel: '',
      docId: null,
      remarks: '',
      setter: null,
    });

    if (!docId || !setter) return;

    const boAuth = getBackOfficeAuth();
    const backOfficeId = Number(
      boAuth?.id ||
      boAuth?.backOfficeId ||
      localStorage.getItem('backOfficeId')
    );

    if (!backOfficeId || Number.isNaN(backOfficeId)) {
      setter((prev) => ({
        ...prev,
        error: 'Unable to determine Back Office user. Please login again.',
      }));
      return;
    }

    setter((prev) => ({ ...prev, savingRemarks: true, error: null, successMsg: '' }));

    try {
      const payload = {
        remarks,
        documentStatus: 'Saved',
        modifiedBy: backOfficeId,
      };

      const result = await backOfficeService.updateApplicationDocumentMetadata(docId, payload);

      setter((prev) => ({
        ...prev,
        documentStatus: result?.documentStatus || 'Saved',
        remarks: result?.remarks || remarks,
        modifiedBy: result?.modifiedBy || backOfficeId,
        modifiedAt: result?.modifiedAt || new Date().toISOString(),
        savingRemarks: false,
        error: null,
        successMsg: 'Saved successfully',
      }));

      // Background re-sync to ensure exact server state
      fetchBackOfficeDocuments();
    } catch (err) {
      console.error(`Failed to save remarks for ${stepLabel}:`, err);
      setter((prev) => ({
        ...prev,
        savingRemarks: false,
        error: err?.response?.data?.message || err?.message || 'Failed to save remarks. Please try again.',
      }));
    }
  };

  const handleRemoveUploadedFile = (state, setter) => {
    if (state.fileUrl) {
      try {
        URL.revokeObjectURL(state.fileUrl);
      } catch {}
    }
    setter({
      backOfficeApplicationDocumentId: null,
      documentType: state.documentType || '',
      documentTitle: state.documentTitle || '',
      file: null,
      fileName: '',
      fileSize: '',
      fileUrl: null,
      isPdf: false,
      isImage: false,
      uploadedAt: '',
      modifiedAt: '',
      modifiedBy: null,
      documentStatus: '',
      remarks: '',
      loading: false,
      savingRemarks: false,
      error: null,
      successMsg: '',
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

  // Extract real persisted manual documents / ZIP archives for Applicant
  const applicantManualDocs = useMemo(() => {
    if (!verificationData) return [];
    const list = [];
    const seenPaths = new Set();

    if (applicantKycRecord) {
      const docPathStr =
        applicantKycRecord.documentPath ||
        applicantKycRecord.DocumentPath ||
        applicantKycRecord.filePath ||
        applicantKycRecord.FilePath ||
        applicantKycRecord.url ||
        applicantKycRecord.Url;
      if (docPathStr) {
        const paths = String(docPathStr).split(',').map((s) => s.trim()).filter(Boolean);
        paths.forEach((path, idx) => {
          const cleanPath = path.replace(/\\/g, '/');
          if (seenPaths.has(cleanPath)) return;
          seenPaths.add(cleanPath);

          const fileName = cleanPath.split('/').pop() || `Applicant_Doc_${idx + 1}`;
          const ext = fileName.split('.').pop()?.toLowerCase() || '';
          const isZip = ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext);
          const isPdf = ext === 'pdf';
          const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext);

          let fileTypeLabel = 'ZIP File / Manual Document';
          if (isZip) fileTypeLabel = 'Compressed ZIP Archive (.zip)';
          else if (isPdf) fileTypeLabel = 'PDF Document (.pdf)';
          else if (isImage) fileTypeLabel = `Image Document (.${ext})`;

          const cleanPathRel = cleanPath.replace(/^\/+/, '');
          const downloadUrl =
            cleanPath.startsWith('http://') || cleanPath.startsWith('https://')
              ? cleanPath
              : `${API_BASE}/ApplicationKYCDocuments/download?path=${encodeURIComponent(cleanPathRel)}`;

          const manualRej = findLatestRejectionForManualSlot({
            rejections: applicationRejections,
            appProdId: resolvedAppProdId,
            applicantSequence: 0,
            kycDocumentId: applicantKycRecord.applicationKYCDocumentId,
            manualDocumentIndex: idx,
          });

          list.push({
            id: applicantKycRecord.applicationKYCDocumentId
              ? `app_kyc_${applicantKycRecord.applicationKYCDocumentId}_${idx}`
              : `app_manual_${idx}`,
            applicationKYCDocumentId: applicantKycRecord.applicationKYCDocumentId,
            manualDocumentIndex: idx,
            applicantSequence: 0,
            fileName,
            path: cleanPath,
            fileTypeLabel,
            isZip,
            isPdf,
            isImage,
            downloadUrl,
            uploadedOn: applicantKycRecord.createdAt || applicantKycRecord.modifiedAt || null,
            source: 'ApplicationKYCDocuments',
            size: applicantKycRecord.fileSize || null,
            rejection: manualRej,
          });
        });
      }
    }

    // Check AgentCustomerDocument extra docs for any zip archives
    const extraDocs = verificationData?.kycDocuments?.documents || [];
    extraDocs.forEach((doc) => {
      if (!doc) return;
      const fn = doc.fileName || doc.name || '';
      const isZip = /\.zip$/i.test(fn) || /(zip|archive)/i.test(doc.documentTypeName || doc.name || '');
      if (isZip && fn && !seenPaths.has(fn)) {
        seenPaths.add(fn);
        const docId = doc.agentCustomerDocumentId || doc.id;
        list.push({
          id: docId || `agent_doc_${fn}`,
          agentCustomerDocumentId: docId,
          manualDocumentIndex: 0,
          applicantSequence: 0,
          fileName: fn || 'Customer_Documents_Bundle.zip',
          path: doc.filePath || fn,
          fileTypeLabel: 'Compressed ZIP Archive (.zip)',
          isZip: true,
          isPdf: false,
          isImage: false,
          downloadUrl: null,
          uploadedOn: doc.uploadedOn || null,
          source: 'AgentCustomerDocument',
          size: doc.fileSize || null,
          rejection: null,
        });
      }
    });

    return list;
  }, [applicantKycRecord, verificationData, applicationRejections, resolvedAppProdId]);

  // Extract real persisted manual documents / ZIP archives for Co-Applicants (dynamic)
  const coApplicantsManualDocs = useMemo(() => {
    const map = {};
    coApplicants.forEach((co) => {
      const list = [];
      const seenPaths = new Set();
      const kyc = co.kycRecord;
      const coSeq = co.sequence !== undefined ? Number(co.sequence) : (co.number !== undefined ? Number(co.number) : (co.index + 1));
      if (kyc) {
        const docPathStr =
          kyc.documentPath ||
          kyc.DocumentPath ||
          kyc.filePath ||
          kyc.FilePath ||
          kyc.url ||
          kyc.Url;
        if (docPathStr) {
          const paths = String(docPathStr).split(',').map((s) => s.trim()).filter(Boolean);
          paths.forEach((path, idx) => {
            const cleanPath = path.replace(/\\/g, '/');
            if (seenPaths.has(cleanPath)) return;
            seenPaths.add(cleanPath);

            const fileName = cleanPath.split('/').pop() || `CoApplicant_${co.number}_Doc_${idx + 1}`;
            const ext = fileName.split('.').pop()?.toLowerCase() || '';
            const isZip = ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext);
            const isPdf = ext === 'pdf';
            const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext);

            let fileTypeLabel = 'ZIP File / Manual Document';
            if (isZip) fileTypeLabel = 'Compressed ZIP Archive (.zip)';
            else if (isPdf) fileTypeLabel = 'PDF Document (.pdf)';
            else if (isImage) fileTypeLabel = `Image Document (.${ext})`;

            const cleanPathRel = cleanPath.replace(/^\/+/, '');
            const downloadUrl =
              cleanPath.startsWith('http://') || cleanPath.startsWith('https://')
                ? cleanPath
                : `${API_BASE}/ApplicationKYCDocuments/download?path=${encodeURIComponent(cleanPathRel)}`;

            const manualRej = findLatestRejectionForManualSlot({
              rejections: applicationRejections,
              appProdId: resolvedAppProdId,
              applicantSequence: coSeq,
              kycDocumentId: kyc.applicationKYCDocumentId,
              manualDocumentIndex: idx,
            });

            list.push({
              id: kyc.applicationKYCDocumentId
                ? `co_${co.number}_kyc_${kyc.applicationKYCDocumentId}_${idx}`
                : `co_${co.number}_manual_${idx}`,
              applicationKYCDocumentId: kyc.applicationKYCDocumentId,
              manualDocumentIndex: idx,
              applicantSequence: coSeq,
              fileName,
              path: cleanPath,
              fileTypeLabel,
              isZip,
              isPdf,
              isImage,
              downloadUrl,
              uploadedOn: kyc.createdAt || kyc.modifiedAt || null,
              source: 'ApplicationKYCDocuments',
              size: kyc.fileSize || null,
              rejection: manualRej,
            });
          });
        }
      }
      map[co.index] = list;
    });
    return map;
  }, [coApplicants, applicationRejections, resolvedAppProdId]);

  // Combined manual documents for backwards compatibility
  const manualDocuments = useMemo(() => {
    const all = [...applicantManualDocs];
    Object.values(coApplicantsManualDocs).forEach((coList) => {
      if (Array.isArray(coList)) all.push(...coList);
    });
    return all;
  }, [applicantManualDocs, coApplicantsManualDocs]);

  const handleDownloadManualDoc = async (doc) => {
    if (!doc) return;
    const fileName = doc.fileName || 'document';

    if (doc.source === 'AgentCustomerDocument' && doc.agentCustomerDocumentId) {
      try {
        const blobData = await backOfficeService.downloadCustomerDocument(doc.agentCustomerDocumentId);
        const blobUrl = URL.createObjectURL(new Blob([blobData]));
        handleDownloadFile(blobUrl, fileName);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        return;
      } catch (e) {
        console.error('Failed to download customer document:', e);
      }
    }

    if (doc.downloadUrl) {
      try {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(doc.downloadUrl, { headers });
        if (res.ok) {
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          handleDownloadFile(blobUrl, fileName);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
          return;
        }
      } catch (err) {
        console.warn('Direct fetch download failed, fallback to direct window open:', err);
      }
      window.open(doc.downloadUrl, '_blank');
    }
  };

  // ── Compact Document Verification Row Data & Handlers ──
  const applicantDocRows = useMemo(() => {
    const rows = [];

    // 1. Profile Image (Step 02 / PROFILE_IMAGE)
    const profileApplicability = getDocumentApplicability({
      documentTypeId: profileDocTypeId,
      employmentTypeId: mainApplicantEmploymentTypeId,
      mappings: employmentTypeDocMappings,
    });
    const profileRej = getActiveRejectionForApplicant(2, profileDocTypeId);
    const canonicalProfilePath = applicantKycRecord?.profileImagePath || applicantKycRecord?.ProfileImagePath || null;
    const hasProfileFile = Boolean(canonicalProfilePath || docPreviews.profile?.url || docPreviews.profile?.doc || profileRej?.currentDocumentPath);
    const profileVerified = hasProfileFile && Boolean(stepVerifications[0]?.PROFILE_IMAGE?.isVerified) && !hasUnresolvedRejectionForStep('PROFILE_IMAGE', 0);
    const profileStatus = resolveRowStatus({
      rejection: profileRej,
      hasFile: hasProfileFile,
      isVerified: profileVerified,
      isNotRequired: profileApplicability.isNotRequired,
      isOptional: profileApplicability.isOptional,
    });

    rows.push({
      id: 'applicant-profile',
      stepNum: 2,
      stepCode: 'PROFILE_IMAGE',
      docType: 'Profile Image',
      icon: CameraIcon || UserIcon,
      hasFile: hasProfileFile,
      loading: Boolean(docPreviews.profile?.loading),
      url: hasProfileFile ? (docPreviews.profile?.url || null) : null,
      isImage: true,
      isPdf: false,
      isZip: false,
      fileName: hasProfileFile ? (docPreviews.profile?.fileName || 'Applicant_Profile.jpg') : '—',
      fileSize: hasProfileFile ? (docPreviews.profile?.size || null) : null,
      uploadDate: hasProfileFile ? (applicantKycRecord?.createdAt || docPreviews.profile?.doc?.createdAt || null) : null,
      status: profileStatus,
      isVerified: profileVerified,
      isRequired: profileApplicability.isRequired,
      isOptional: profileApplicability.isOptional,
      isNotRequired: profileApplicability.isNotRequired,
      rejection: profileRej,
      comparison: docPreviews.profile?.comparison || null,
      kycId: applicantKycId,
      isCoApplicant: false,
      applicantSequence: 0,
      documentTypeId: profileDocTypeId,
      rejectedDocumentType: 'PROFILE_IMAGE',
    });

    // 2. Aadhaar Card (Step 03 / AADHAAR)
    const aadhaarApplicability = getDocumentApplicability({
      documentTypeId: aadhaarDocTypeId,
      employmentTypeId: mainApplicantEmploymentTypeId,
      mappings: employmentTypeDocMappings,
    });
    const aadhaarRej = getActiveRejectionForApplicant(3, aadhaarDocTypeId);
    const canonicalAadhaarPath = applicantKycRecord?.aadharDocumentPath || applicantKycRecord?.AadharDocumentPath || applicantKycRecord?.aadhaarDocumentPath || applicantKycRecord?.AadhaarDocumentPath || null;
    const hasAadhaarFile = Boolean(canonicalAadhaarPath || docPreviews.aadhaar?.url || docPreviews.aadhaar?.doc || aadhaarRej?.currentDocumentPath);
    const aadhaarVerified = hasAadhaarFile && Boolean(stepVerifications[0]?.AADHAAR?.isVerified) && !hasUnresolvedRejectionForStep('AADHAAR', 0);
    const aadhaarStatus = resolveRowStatus({
      rejection: aadhaarRej,
      hasFile: hasAadhaarFile,
      isVerified: aadhaarVerified,
      isNotRequired: aadhaarApplicability.isNotRequired,
      isOptional: aadhaarApplicability.isOptional,
    });

    rows.push({
      id: 'applicant-aadhaar',
      stepNum: 3,
      stepCode: 'AADHAAR',
      docType: 'Aadhaar Card',
      icon: ShieldCheckIcon || FileTextIcon,
      hasFile: hasAadhaarFile,
      loading: Boolean(docPreviews.aadhaar?.loading),
      url: hasAadhaarFile ? (docPreviews.aadhaar?.url || null) : null,
      isImage: isDocImage(docPreviews.aadhaar),
      isPdf: isDocPdf(docPreviews.aadhaar) || Boolean(docPreviews.aadhaar?.isPdf),
      isZip: false,
      fileName: hasAadhaarFile ? (docPreviews.aadhaar?.fileName || docPreviews.aadhaar?.doc?.fileName || 'Applicant_Aadhaar.pdf') : '—',
      fileSize: hasAadhaarFile ? (docPreviews.aadhaar?.size || docPreviews.aadhaar?.doc?.fileSize || null) : null,
      uploadDate: hasAadhaarFile ? (applicantKycRecord?.createdAt || docPreviews.aadhaar?.doc?.createdAt || null) : null,
      status: aadhaarStatus,
      isVerified: aadhaarVerified,
      isRequired: aadhaarApplicability.isRequired,
      isOptional: aadhaarApplicability.isOptional,
      isNotRequired: aadhaarApplicability.isNotRequired,
      rejection: aadhaarRej,
      comparison: docPreviews.aadhaar?.comparison || null,
      kycId: applicantKycId,
      isCoApplicant: false,
      applicantSequence: 0,
      documentTypeId: aadhaarDocTypeId,
      rejectedDocumentType: 'AADHAAR',
    });

    // 3. PAN Card (Step 04 / PAN)
    const panApplicability = getDocumentApplicability({
      documentTypeId: panDocTypeId,
      employmentTypeId: mainApplicantEmploymentTypeId,
      mappings: employmentTypeDocMappings,
    });
    const panRej = getActiveRejectionForApplicant(4, panDocTypeId);
    const canonicalPanPath = applicantKycRecord?.panCardPath || applicantKycRecord?.PanCardPath || applicantKycRecord?.PANCardPath || null;
    const hasPanFile = Boolean(canonicalPanPath || docPreviews.pan?.url || docPreviews.pan?.doc || panRej?.currentDocumentPath);
    const panVerified = hasPanFile && Boolean(stepVerifications[0]?.PAN?.isVerified) && !hasUnresolvedRejectionForStep('PAN', 0);
    const panStatus = resolveRowStatus({
      rejection: panRej,
      hasFile: hasPanFile,
      isVerified: panVerified,
      isNotRequired: panApplicability.isNotRequired,
      isOptional: panApplicability.isOptional,
    });

    rows.push({
      id: 'applicant-pan',
      stepNum: 4,
      stepCode: 'PAN',
      docType: 'PAN Card',
      icon: LandmarkIcon || FileTextIcon,
      hasFile: hasPanFile,
      loading: Boolean(docPreviews.pan?.loading),
      url: hasPanFile ? (docPreviews.pan?.url || null) : null,
      isImage: isDocImage(docPreviews.pan),
      isPdf: isDocPdf(docPreviews.pan) || Boolean(docPreviews.pan?.isPdf),
      isZip: false,
      fileName: hasPanFile ? (docPreviews.pan?.fileName || docPreviews.pan?.doc?.fileName || 'Applicant_PAN.pdf') : '—',
      fileSize: hasPanFile ? (docPreviews.pan?.size || docPreviews.pan?.doc?.fileSize || null) : null,
      uploadDate: hasPanFile ? (applicantKycRecord?.createdAt || docPreviews.pan?.doc?.createdAt || null) : null,
      status: panStatus,
      isVerified: panVerified,
      isRequired: panApplicability.isRequired,
      isOptional: panApplicability.isOptional,
      isNotRequired: panApplicability.isNotRequired,
      rejection: panRej,
      comparison: docPreviews.pan?.comparison || null,
      kycId: applicantKycId,
      isCoApplicant: false,
      applicantSequence: 0,
      documentTypeId: panDocTypeId,
      rejectedDocumentType: 'PAN',
    });

    // 4. Salary Slip (Step 05 / SALARY_SLIP)
    const salaryApplicability = getDocumentApplicability({
      documentTypeId: salarySlipDocTypeId,
      employmentTypeId: mainApplicantEmploymentTypeId,
      mappings: employmentTypeDocMappings,
    });
    const salaryRej = applicantFinancialDocs.salarySlip?.rejection || getActiveRejectionForApplicantDoc(salarySlipDocTypeId, 'SALARY_SLIP');
    const salaryPreview = applicantFinancialDocs.salarySlip?.preview;
    const salaryData = applicantFinancialDocs.salarySlip?.data;
    const hasSalaryFile = Boolean(salaryPreview?.url || salaryData || salaryRej?.currentDocumentPath);
    const salaryVerified = hasSalaryFile && Boolean(stepVerifications[0]?.SALARY_SLIP?.isVerified) && !hasUnresolvedRejectionForStep('SALARY_SLIP', 0);
    const salaryStatus = resolveRowStatus({
      rejection: salaryRej,
      hasFile: hasSalaryFile,
      isVerified: salaryVerified,
      isNotRequired: salaryApplicability.isNotRequired,
      isOptional: salaryApplicability.isOptional,
    });

    rows.push({
      id: 'applicant-salary',
      stepNum: 5,
      stepCode: 'SALARY_SLIP',
      docType: 'Salary Slip',
      icon: BadgeIndianRupeeIcon || FileTextIcon,
      hasFile: hasSalaryFile,
      loading: Boolean(applicantFinancialDocs.salarySlip?.loading),
      url: salaryPreview?.url || null,
      isImage: isDocImage(salaryPreview),
      isPdf: isDocPdf(salaryPreview) || Boolean(salaryPreview?.isPdf),
      isZip: false,
      fileName: salaryPreview?.fileName || (hasSalaryFile ? 'Applicant_Salary_Slip.pdf' : '—'),
      fileSize: salaryPreview?.size || null,
      uploadDate: salaryData?.createdAt || salaryData?.uploadedAt || null,
      status: salaryStatus,
      isVerified: salaryVerified,
      isRequired: salaryApplicability.isRequired,
      isOptional: salaryApplicability.isOptional,
      isNotRequired: salaryApplicability.isNotRequired,
      rejection: salaryRej,
      comparison: applicantFinancialDocs.salarySlip?.comparison || null,
      kycId: null,
      isCoApplicant: false,
      applicantSequence: 0,
      documentTypeId: salarySlipDocTypeId,
      rejectedDocumentType: 'SALARY_SLIP',
    });

    // 5. Bank Statement (Step 06 / BANK_STATEMENT)
    const bankApplicability = getDocumentApplicability({
      documentTypeId: bankStatementDocTypeId,
      employmentTypeId: mainApplicantEmploymentTypeId,
      mappings: employmentTypeDocMappings,
    });
    const bankRej = applicantFinancialDocs.bankStatement?.rejection || getActiveRejectionForApplicantDoc(bankStatementDocTypeId, 'BANK_STATEMENT');
    const bankPreview = applicantFinancialDocs.bankStatement?.preview;
    const bankData = applicantFinancialDocs.bankStatement?.data;
    const hasBankFile = Boolean(bankPreview?.url || bankData || bankRej?.currentDocumentPath);
    const bankVerified = hasBankFile && Boolean(stepVerifications[0]?.BANK_STATEMENT?.isVerified) && !hasUnresolvedRejectionForStep('BANK_STATEMENT', 0);
    const bankStatus = resolveRowStatus({
      rejection: bankRej,
      hasFile: hasBankFile,
      isVerified: bankVerified,
      isNotRequired: bankApplicability.isNotRequired,
      isOptional: bankApplicability.isOptional,
    });

    rows.push({
      id: 'applicant-bank',
      stepNum: 6,
      stepCode: 'BANK_STATEMENT',
      docType: 'Bank Statement',
      icon: BuildingIcon || FileTextIcon,
      hasFile: hasBankFile,
      loading: Boolean(applicantFinancialDocs.bankStatement?.loading),
      url: bankPreview?.url || null,
      isImage: isDocImage(bankPreview),
      isPdf: isDocPdf(bankPreview) || Boolean(bankPreview?.isPdf),
      isZip: false,
      fileName: bankPreview?.fileName || (hasBankFile ? 'Applicant_Bank_Statement.pdf' : '—'),
      fileSize: bankPreview?.size || null,
      uploadDate: bankData?.createdAt || bankData?.uploadedAt || null,
      status: bankStatus,
      isVerified: bankVerified,
      isRequired: bankApplicability.isRequired,
      isOptional: bankApplicability.isOptional,
      isNotRequired: bankApplicability.isNotRequired,
      rejection: bankRej,
      comparison: applicantFinancialDocs.bankStatement?.comparison || null,
      kycId: null,
      isCoApplicant: false,
      applicantSequence: 0,
      documentTypeId: bankStatementDocTypeId,
      rejectedDocumentType: 'BANK_STATEMENT',
    });

    // 6. ZIP / Archive Package (Step 07 / ZIP_ARCHIVE)
    // Supplementary/manual container (not a DocumentTypeMaster record)
    const zipRej = getActiveRejectionForApplicant(7);
    const hasZipFile = Boolean(docPreviews.zip?.doc || docPreviews.zip?.url || applicantManualDocs?.length > 0 || zipRej?.currentDocumentPath);
    const zipVerified = hasZipFile && Boolean(stepVerifications[0]?.ZIP_ARCHIVE?.isVerified) && !hasUnresolvedRejectionForStep('ZIP_ARCHIVE', 0);
    const zipStatus = resolveRowStatus({
      rejection: zipRej,
      hasFile: hasZipFile,
      isVerified: zipVerified,
      isNotRequired: false,
      isOptional: true,
    });

    rows.push({
      id: 'applicant-zip',
      stepNum: 7,
      stepCode: 'ZIP_ARCHIVE',
      docType: 'ZIP / Archive Package',
      icon: FileCheckIcon || FileTextIcon,
      hasFile: hasZipFile,
      loading: Boolean(docPreviews.zip?.loading),
      url: docPreviews.zip?.url || (applicantManualDocs?.length > 0 ? applicantManualDocs[0]?.downloadUrl : null),
      isImage: false,
      isPdf: false,
      isZip: true,
      fileName: docPreviews.zip?.doc?.fileName || docPreviews.zip?.fileName || (applicantManualDocs?.length > 0 ? `${applicantManualDocs.length} Document(s) Package` : (hasZipFile ? 'Customer_Documents.zip' : '—')),
      fileSize: docPreviews.zip?.size || (applicantManualDocs?.length > 0 ? applicantManualDocs[0]?.size : null),
      uploadDate: docPreviews.zip?.doc?.createdAt || (applicantManualDocs?.length > 0 ? applicantManualDocs[0]?.uploadedOn : null),
      status: zipStatus,
      isVerified: zipVerified,
      isRequired: false,
      isOptional: true,
      isNotRequired: false,
      rejection: zipRej,
      comparison: docPreviews.zip?.comparison || null,
      kycId: applicantKycId,
      isCoApplicant: false,
      applicantSequence: 0,
      documentTypeId: null,
      rejectedDocumentType: 'ZIP_ARCHIVE',
      manualDocs: applicantManualDocs,
    });

    return rows;
  }, [
    getActiveRejectionForApplicant,
    docPreviews,
    stepVerifications,
    hasUnresolvedRejectionForStep,
    CameraIcon,
    UserIcon,
    applicantKycId,
    applicantKycRecord,
    profileDocTypeId,
    ShieldCheckIcon,
    FileTextIcon,
    aadhaarDocTypeId,
    LandmarkIcon,
    panDocTypeId,
    applicantFinancialDocs,
    getActiveRejectionForApplicantDoc,
    salarySlipDocTypeId,
    BadgeIndianRupeeIcon,
    bankStatementDocTypeId,
    BuildingIcon,
    applicantManualDocs,
    FileCheckIcon,
    zipArchiveDocTypeId,
    mainApplicantEmploymentTypeId,
    employmentTypeDocMappings,
  ]);

  const selectedCoApplicant = useMemo(() => {
    if (!Array.isArray(coApplicants) || coApplicants.length === 0) return null;
    return coApplicants[selectedCoApplicantIndex] || coApplicants[0] || null;
  }, [coApplicants, selectedCoApplicantIndex]);

  const coApplicantDocRows = useMemo(() => {
    if (!selectedCoApplicant) return [];
    const co = selectedCoApplicant;
    const coIdx = co.index !== undefined ? co.index : 0;
    const coSeq = co.sequence !== undefined ? co.sequence : (coIdx + 1);
    const coNumber = co.number || (coIdx + 1);
    const coKyc =
      co.kycRecord ||
      co.kyc ||
      (resolvedKycList || []).find(
        (k) =>
          k &&
          k.isActive !== false &&
          k.IsActive !== false &&
          !isApplicantDocumentTuple(k) &&
          Number(k.applicantSequence ?? k.ApplicantSequence) === coSeq
      ) ||
      {};
    const coKycId =
      co.kycDocumentId ||
      coKyc.applicationKYCDocumentId ||
      coKyc.ApplicationKYCDocumentId ||
      coKyc.kycDocumentId ||
      coKyc.id ||
      null;

    const rows = [];
    const coPrev = coDocPreviews[coIdx] || {};
    const coFin = coApplicantsFinancialDocs[coIdx] || {};
    const coManual = coApplicantsManualDocs[coIdx] || [];
    const coEmpTypeId = getEmploymentTypeIdForSequence(coSeq);

    // 1. Profile Image
    const profileApplicability = getDocumentApplicability({
      documentTypeId: profileDocTypeId,
      employmentTypeId: coEmpTypeId,
      mappings: employmentTypeDocMappings,
    });
    const profileRej = getActiveRejectionForCoApplicant(coKycId, 2, coSeq);
    const canonicalCoProfile = coKyc.profileImagePath || coKyc.ProfileImagePath || null;
    const hasProfile = Boolean(canonicalCoProfile || coPrev.profile?.url || coPrev.profile?.doc || profileRej?.currentDocumentPath);
    const profileVerified = hasProfile && Boolean(stepVerifications[coSeq]?.PROFILE_IMAGE?.isVerified) && !hasUnresolvedRejectionForStep('PROFILE_IMAGE', coSeq);
    const profileStatus = resolveRowStatus({
      rejection: profileRej,
      hasFile: hasProfile,
      isVerified: profileVerified,
      isNotRequired: profileApplicability.isNotRequired,
      isOptional: profileApplicability.isOptional,
    });

    rows.push({
      id: `co-${coIdx}-profile`,
      stepNum: 2,
      stepCode: 'PROFILE_IMAGE',
      docType: 'Profile Image',
      icon: CameraIcon || UserIcon,
      hasFile: hasProfile,
      loading: Boolean(coPrev.profile?.loading),
      url: hasProfile ? (coPrev.profile?.url || null) : null,
      isImage: true,
      isPdf: false,
      isZip: false,
      fileName: hasProfile ? (coPrev.profile?.fileName || `CoApplicant_${coNumber}_Profile.jpg`) : '—',
      fileSize: hasProfile ? (coPrev.profile?.size || null) : null,
      uploadDate: hasProfile ? (coKyc.createdAt || coKyc.CreatedAt || null) : null,
      status: profileStatus,
      isVerified: profileVerified,
      isRequired: profileApplicability.isRequired,
      isOptional: profileApplicability.isOptional,
      isNotRequired: profileApplicability.isNotRequired,
      rejection: profileRej,
      comparison: coPrev.profile?.comparison || null,
      kycId: coKycId,
      isCoApplicant: true,
      applicantSequence: coSeq,
      documentTypeId: profileDocTypeId,
      rejectedDocumentType: 'PROFILE_IMAGE',
      coNumber,
    });

    // 2. Aadhaar Card
    const aadhaarApplicability = getDocumentApplicability({
      documentTypeId: aadhaarDocTypeId,
      employmentTypeId: coEmpTypeId,
      mappings: employmentTypeDocMappings,
    });
    const aadhaarRej = getActiveRejectionForCoApplicant(coKycId, 3, coSeq);
    const canonicalCoAadhaar = coKyc.aadharDocumentPath || coKyc.AadharDocumentPath || null;
    const hasAadhaar = Boolean(canonicalCoAadhaar || coPrev.aadhaar?.url || coPrev.aadhaar?.doc || aadhaarRej?.currentDocumentPath);
    const aadhaarVerified = hasAadhaar && Boolean(stepVerifications[coSeq]?.AADHAAR?.isVerified) && !hasUnresolvedRejectionForStep('AADHAAR', coSeq);
    const aadhaarStatus = resolveRowStatus({
      rejection: aadhaarRej,
      hasFile: hasAadhaar,
      isVerified: aadhaarVerified,
      isNotRequired: aadhaarApplicability.isNotRequired,
      isOptional: aadhaarApplicability.isOptional,
    });

    rows.push({
      id: `co-${coIdx}-aadhaar`,
      stepNum: 3,
      stepCode: 'AADHAAR',
      docType: 'Aadhaar Card',
      icon: ShieldCheckIcon || FileTextIcon,
      hasFile: hasAadhaar,
      loading: Boolean(coPrev.aadhaar?.loading),
      url: hasAadhaar ? (coPrev.aadhaar?.url || null) : null,
      isImage: isDocImage(coPrev.aadhaar),
      isPdf: isDocPdf(coPrev.aadhaar) || Boolean(coPrev.aadhaar?.isPdf),
      isZip: false,
      fileName: hasAadhaar ? (coPrev.aadhaar?.fileName || coPrev.aadhaar?.doc?.fileName || `CoApplicant_${coNumber}_Aadhaar.pdf`) : '—',
      fileSize: hasAadhaar ? (coPrev.aadhaar?.size || coPrev.aadhaar?.doc?.fileSize || null) : null,
      uploadDate: hasAadhaar ? (coKyc.createdAt || coKyc.CreatedAt || null) : null,
      status: aadhaarStatus,
      isVerified: aadhaarVerified,
      isRequired: aadhaarApplicability.isRequired,
      isOptional: aadhaarApplicability.isOptional,
      isNotRequired: aadhaarApplicability.isNotRequired,
      rejection: aadhaarRej,
      comparison: coPrev.aadhaar?.comparison || null,
      kycId: coKycId,
      isCoApplicant: true,
      applicantSequence: coSeq,
      documentTypeId: aadhaarDocTypeId,
      rejectedDocumentType: 'AADHAAR',
      coNumber,
    });

    // 3. PAN Card
    const panApplicability = getDocumentApplicability({
      documentTypeId: panDocTypeId,
      employmentTypeId: coEmpTypeId,
      mappings: employmentTypeDocMappings,
    });
    const panRej = getActiveRejectionForCoApplicant(coKycId, 4, coSeq);
    const canonicalCoPan = coKyc.panCardPath || coKyc.PanCardPath || coKyc.PANCardPath || null;
    const hasPan = Boolean(canonicalCoPan || coPrev.pan?.url || coPrev.pan?.doc || panRej?.currentDocumentPath);
    const panVerified = hasPan && Boolean(stepVerifications[coSeq]?.PAN?.isVerified) && !hasUnresolvedRejectionForStep('PAN', coSeq);
    const panStatus = resolveRowStatus({
      rejection: panRej,
      hasFile: hasPan,
      isVerified: panVerified,
      isNotRequired: panApplicability.isNotRequired,
      isOptional: panApplicability.isOptional,
    });

    rows.push({
      id: `co-${coIdx}-pan`,
      stepNum: 4,
      stepCode: 'PAN',
      docType: 'PAN Card',
      icon: LandmarkIcon || FileTextIcon,
      hasFile: hasPan,
      loading: Boolean(coPrev.pan?.loading),
      url: hasPan ? (coPrev.pan?.url || null) : null,
      isImage: isDocImage(coPrev.pan),
      isPdf: isDocPdf(coPrev.pan) || Boolean(coPrev.pan?.isPdf),
      isZip: false,
      fileName: hasPan ? (coPrev.pan?.fileName || coPrev.pan?.doc?.fileName || `CoApplicant_${coNumber}_PAN.pdf`) : '—',
      fileSize: hasPan ? (coPrev.pan?.size || coPrev.pan?.doc?.fileSize || null) : null,
      uploadDate: hasPan ? (coKyc.createdAt || coKyc.CreatedAt || null) : null,
      status: panStatus,
      isVerified: panVerified,
      isRequired: panApplicability.isRequired,
      isOptional: panApplicability.isOptional,
      isNotRequired: panApplicability.isNotRequired,
      rejection: panRej,
      comparison: coPrev.pan?.comparison || null,
      kycId: coKycId,
      isCoApplicant: true,
      applicantSequence: coSeq,
      documentTypeId: panDocTypeId,
      rejectedDocumentType: 'PAN',
      coNumber,
    });

    // 4. Salary Slip
    const salApplicability = getDocumentApplicability({
      documentTypeId: salarySlipDocTypeId,
      employmentTypeId: coEmpTypeId,
      mappings: employmentTypeDocMappings,
    });
    const salRej = coFin.salarySlip?.rejection || getActiveRejectionForCoApplicantDoc(coSeq, salarySlipDocTypeId, 'SALARY_SLIP');
    const salPrev = coFin.salarySlip?.preview;
    const salData = coFin.salarySlip?.data;
    const hasSal = Boolean(salPrev?.url || salData || salRej?.currentDocumentPath);
    const salVerified = hasSal && Boolean(stepVerifications[coSeq]?.SALARY_SLIP?.isVerified) && !hasUnresolvedRejectionForStep('SALARY_SLIP', coSeq);
    const salStatus = resolveRowStatus({
      rejection: salRej,
      hasFile: hasSal,
      isVerified: salVerified,
      isNotRequired: salApplicability.isNotRequired,
      isOptional: salApplicability.isOptional,
    });

    rows.push({
      id: `co-${coIdx}-salary`,
      stepNum: 5,
      stepCode: 'SALARY_SLIP',
      docType: 'Salary Slip',
      icon: BadgeIndianRupeeIcon || FileTextIcon,
      hasFile: hasSal,
      loading: Boolean(coFin.salarySlip?.loading),
      url: salPrev?.url || null,
      isImage: isDocImage(salPrev),
      isPdf: isDocPdf(salPrev) || Boolean(salPrev?.isPdf),
      isZip: false,
      fileName: salPrev?.fileName || (hasSal ? `CoApplicant_${coNumber}_Salary_Slip.pdf` : '—'),
      fileSize: salPrev?.size || null,
      uploadDate: salData?.createdAt || salData?.uploadedAt || null,
      status: salStatus,
      isVerified: salVerified,
      isRequired: salApplicability.isRequired,
      isOptional: salApplicability.isOptional,
      isNotRequired: salApplicability.isNotRequired,
      rejection: salRej,
      comparison: coFin.salarySlip?.comparison || null,
      kycId: null,
      isCoApplicant: true,
      applicantSequence: coSeq,
      documentTypeId: salarySlipDocTypeId,
      rejectedDocumentType: 'SALARY_SLIP',
      coNumber,
    });

    // 5. Bank Statement
    const bankApplicability = getDocumentApplicability({
      documentTypeId: bankStatementDocTypeId,
      employmentTypeId: coEmpTypeId,
      mappings: employmentTypeDocMappings,
    });
    const bankRej = coFin.bankStatement?.rejection || getActiveRejectionForCoApplicantDoc(coSeq, bankStatementDocTypeId, 'BANK_STATEMENT');
    const bankPrev = coFin.bankStatement?.preview;
    const bankData = coFin.bankStatement?.data;
    const hasBank = Boolean(bankPrev?.url || bankData || bankRej?.currentDocumentPath);
    const bankVerified = hasBank && Boolean(stepVerifications[coSeq]?.BANK_STATEMENT?.isVerified) && !hasUnresolvedRejectionForStep('BANK_STATEMENT', coSeq);
    const bankStatus = resolveRowStatus({
      rejection: bankRej,
      hasFile: hasBank,
      isVerified: bankVerified,
      isNotRequired: bankApplicability.isNotRequired,
      isOptional: bankApplicability.isOptional,
    });

    rows.push({
      id: `co-${coIdx}-bank`,
      stepNum: 6,
      stepCode: 'BANK_STATEMENT',
      docType: 'Bank Statement',
      icon: BuildingIcon || FileTextIcon,
      hasFile: hasBank,
      loading: Boolean(coFin.bankStatement?.loading),
      url: bankPrev?.url || null,
      isImage: isDocImage(bankPrev),
      isPdf: isDocPdf(bankPrev) || Boolean(bankPrev?.isPdf),
      isZip: false,
      fileName: bankPrev?.fileName || (hasBank ? `CoApplicant_${coNumber}_Bank_Statement.pdf` : '—'),
      fileSize: bankPrev?.size || null,
      uploadDate: bankData?.createdAt || bankData?.uploadedAt || null,
      status: bankStatus,
      isVerified: bankVerified,
      isRequired: bankApplicability.isRequired,
      isOptional: bankApplicability.isOptional,
      isNotRequired: bankApplicability.isNotRequired,
      rejection: bankRej,
      comparison: coFin.bankStatement?.comparison || null,
      kycId: null,
      isCoApplicant: true,
      applicantSequence: coSeq,
      documentTypeId: bankStatementDocTypeId,
      rejectedDocumentType: 'BANK_STATEMENT',
      coNumber,
    });

    // 6. ZIP / Archive Package
    // Supplementary/manual container (not a DocumentTypeMaster record)
    const zipRej = getActiveRejectionForCoApplicant(coKycId, 7, coSeq);
    const hasZip = Boolean(coPrev.zip?.url || coManual.length > 0 || zipRej?.currentDocumentPath);
    const zipVerified = hasZip && Boolean(stepVerifications[coSeq]?.ZIP_ARCHIVE?.isVerified) && !hasUnresolvedRejectionForStep('ZIP_ARCHIVE', coSeq);
    const zipStatus = resolveRowStatus({
      rejection: zipRej,
      hasFile: hasZip,
      isVerified: zipVerified,
      isNotRequired: false,
      isOptional: true,
    });

    rows.push({
      id: `co-${coIdx}-zip`,
      stepNum: 7,
      stepCode: 'ZIP_ARCHIVE',
      docType: 'ZIP / Archive Package',
      icon: FileCheckIcon || FileTextIcon,
      hasFile: hasZip,
      loading: Boolean(coPrev.zip?.loading),
      url: coPrev.zip?.url || (coManual.length > 0 ? coManual[0]?.downloadUrl : null),
      isImage: false,
      isPdf: false,
      isZip: true,
      fileName: coPrev.zip?.fileName || (coManual.length > 0 ? `CoApplicant_${coNumber}_Manual_Docs (${coManual.length})` : (hasZip ? `CoApplicant_${coNumber}_Documents.zip` : '—')),
      fileSize: coPrev.zip?.size || (coManual.length > 0 ? coManual[0]?.size : null),
      uploadDate: coManual.length > 0 ? coManual[0]?.uploadedOn : null,
      status: zipStatus,
      isVerified: zipVerified,
      isRequired: false,
      isOptional: true,
      isNotRequired: false,
      rejection: zipRej,
      comparison: coPrev.zip?.comparison || null,
      kycId: coKycId,
      isCoApplicant: true,
      applicantSequence: coSeq,
      documentTypeId: null,
      rejectedDocumentType: 'ZIP_ARCHIVE',
      manualDocs: coManual,
      coNumber,
    });

    return rows;
  }, [
    selectedCoApplicant,
    resolvedKycList,
    coDocPreviews,
    coApplicantsFinancialDocs,
    coApplicantsManualDocs,
    getActiveRejectionForCoApplicant,
    stepVerifications,
    hasUnresolvedRejectionForStep,
    CameraIcon,
    UserIcon,
    profileDocTypeId,
    ShieldCheckIcon,
    FileTextIcon,
    aadhaarDocTypeId,
    LandmarkIcon,
    panDocTypeId,
    getActiveRejectionForCoApplicantDoc,
    salarySlipDocTypeId,
    BadgeIndianRupeeIcon,
    bankStatementDocTypeId,
    BuildingIcon,
    FileCheckIcon,
    zipArchiveDocTypeId,
    getEmploymentTypeIdForSequence,
    employmentTypeDocMappings,
  ]);

  const applicantApplicableRequiredRows = useMemo(() => {
    return applicantDocRows.filter((r) => r.isRequired && !r.isNotRequired);
  }, [applicantDocRows]);

  const applicantRequiredCount = applicantApplicableRequiredRows.length;

  const applicantVerifiedCount = useMemo(() => {
    return applicantDocRows.filter((r) => r.isVerified && r.hasFile && !r.isNotRequired).length;
  }, [applicantDocRows]);

  const allApplicantDocsVerified =
    applicantRequiredCount > 0 &&
    applicantApplicableRequiredRows.every((r) => r.isVerified && r.hasFile);

  const coApplicantApplicableRequiredRows = useMemo(() => {
    return coApplicantDocRows.filter((r) => r.isRequired && !r.isNotRequired);
  }, [coApplicantDocRows]);

  const coApplicantRequiredCount = coApplicantApplicableRequiredRows.length;

  const coApplicantVerifiedCount = useMemo(() => {
    return coApplicantDocRows.filter((r) => r.isVerified && r.hasFile && !r.isNotRequired).length;
  }, [coApplicantDocRows]);

  const allCoApplicantDocsVerified =
    coApplicantRequiredCount > 0 &&
    coApplicantApplicableRequiredRows.every((r) => r.isVerified && r.hasFile);

  const verifiedDocumentCount = applicantVerifiedCount;

  const handleRowView = useCallback((row) => {
    if (!row.hasFile) return;
    handleOpenPreviewModal({
      title: `${row.docType} — ${row.isCoApplicant ? `Co-Applicant ${row.coNumber || selectedCoApplicantIndex + 1}` : 'Applicant'}`,
      docType: row.docType,
      personLabel: row.isCoApplicant ? `Co-Applicant ${row.coNumber || selectedCoApplicantIndex + 1}` : 'Applicant',
      personName: row.isCoApplicant
        ? (selectedCoApplicant?.customerName || selectedCoApplicant?.name || `Co-Applicant ${row.coNumber || selectedCoApplicantIndex + 1}`)
        : applicantName,
      url: row.url,
      isPdf: row.isPdf,
      isImage: row.isImage,
      isZip: row.isZip,
      fileName: row.fileName,
      fileSize: row.fileSize,
      uploadDate: row.uploadDate,
      comparison: row.comparison,
      rejectionId: row.rejection?.backOfficeDocumentRejectionId || row.rejection?.id || row.rejection?.agentCustomerRejectionId,
      rejection: row.rejection,
      stepLabel: `${row.isCoApplicant ? `Co-Applicant ${row.coNumber || selectedCoApplicantIndex + 1}` : 'Applicant'} ${row.docType}`,
      stepNum: row.stepNum,
      stepCode: row.stepCode,
      kycId: row.kycId,
      isCoApplicant: row.isCoApplicant,
      applicantSequence: row.applicantSequence,
      documentTypeId: row.documentTypeId,
      rejectedDocumentType: row.rejectedDocumentType,
      manualDocs: row.manualDocs,
      isVerified: row.isVerified,
      status: row.status,
    });
  }, [handleOpenPreviewModal, selectedCoApplicantIndex, selectedCoApplicant, applicantName]);

  const handleRowDownload = useCallback((row) => {
    if (!row.hasFile) return;
    if (row.url) {
      handleDownloadFile(row.url, row.fileName || `${row.docType}.${row.isPdf ? 'pdf' : (row.isImage ? 'jpg' : 'zip')}`);
    } else if (row.manualDocs && row.manualDocs.length > 0) {
      handleDownloadManualDoc(row.manualDocs[0]);
    }
  }, [handleDownloadFile, handleDownloadManualDoc]);

  const handleRowReturn = useCallback((row) => {
    if (!row || !row.hasFile) return;
    const isIdentity = ['PROFILE_IMAGE', 'AADHAAR', 'PAN'].includes(row.stepCode);
    if (isIdentity && !row.hasFile) return;
    const label = `${row.isCoApplicant ? `Co-Applicant ${row.coNumber || selectedCoApplicantIndex + 1}` : 'Applicant'} ${row.docType}`;
    handleOpenRejectConfirm(
      row.stepNum,
      label,
      row.kycId,
      row.isCoApplicant,
      row.applicantSequence,
      row.documentTypeId,
      row.rejectedDocumentType
    );
  }, [selectedCoApplicantIndex, handleOpenRejectConfirm]);

  const handleToggleRowVerification = useCallback(async (row) => {
    if (!row || !row.hasFile || row.isNotRequired || row.status === 'Not Required') return;
    if (row.status === 'Returned to RM' || row.status === 'Returned') return;

    const seq =
      row.applicantSequence !== undefined && row.applicantSequence !== null && !isNaN(Number(row.applicantSequence))
        ? Number(row.applicantSequence)
        : (row.isCoApplicant ? (selectedCoApplicantIndex + 1) : 0);

    const rowKey = `${seq}_${row.stepCode}`;
    if (savingVerificationKey === rowKey) return;

    // If row is in 'Resubmitted' status with an active rejection ID, verify the rejection directly
    if (row.status === 'Resubmitted' && row.rejection?.backOfficeDocumentRejectionId) {
      const stepLabel = `${row.isCoApplicant ? `Co-Applicant ${row.coNumber || seq}` : 'Applicant'} ${row.docType}`;
      await handleVerifyRejection(
        row.rejection.backOfficeDocumentRejectionId,
        stepLabel,
        row.stepNum,
        seq
      );
      return;
    }

    if (hasUnresolvedRejectionForStep(row.stepCode, seq)) return;

    const currentVerified = Boolean(row.isVerified);
    const nextVerified = !currentVerified;
    const currentRemarks = (stepRemarks[row.stepNum] || '').trim();

    await handleSaveStepVerification({
      applicantSequence: seq,
      stepCode: row.stepCode,
      isVerified: nextVerified,
      remarks: currentRemarks,
      stepNum: row.stepNum,
    });
  }, [hasUnresolvedRejectionForStep, savingVerificationKey, stepRemarks, handleSaveStepVerification, handleVerifyRejection, selectedCoApplicantIndex]);


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

  // Safe normalized numeric Loan Tenure (months) resolver for Step 14
  const resolvedAppTenure = useMemo(() => {
    const details = verificationData?.applicationDetails || {};
    const raw =
      details.tenureMonths ??
      details.raw?.loanTenure ??
      details.raw?.LoanTenure ??
      details.raw?.loanTenureMonths ??
      details.raw?.LoanTenureMonths ??
      details.loanTenure;
    if (raw == null || raw === '') return 24;
    const num = typeof raw === 'string' ? parseInt(raw.replace(/\D/g, ''), 10) : Number(raw);
    return isNaN(num) || num <= 0 ? 24 : num;
  }, [verificationData]);

  // Safe normalized numeric ROI (% p.a.) resolver for Step 14
  const resolvedAppRoi = useMemo(() => {
    const details = verificationData?.applicationDetails || {};
    const raw =
      details.roi ??
      details.raw?.rateOfInterest ??
      details.raw?.RateOfInterest ??
      details.raw?.roi ??
      details.raw?.Roi ??
      details.interestRate;
    if (raw == null || raw === '') return 10;
    const num = typeof raw === 'string' ? parseFloat(raw.replace(/[^\d.]/g, '')) : Number(raw);
    return isNaN(num) || num <= 0 ? 10 : num;
  }, [verificationData]);

  // Real active existing loans resolved specifically for the selected applicant
  const selectedApplicantActiveLoans = useMemo(() => {
    const targetEmpId = selectedEmploymentIncomeDetailsId;
    if (!targetEmpId) return [];

    // 1. Find all ApplicationBankExistingLoanDetails matching this targetEmpId
    const matchingExistingHeaders = bankExistingLoansList.filter(
      (b) => Number(b.applicationEmploymentIncomeDetailsId) === Number(targetEmpId)
    );

    // Fallback to raw verificationData if bankExistingLoansList not yet loaded
    const rawBankExisting = verificationData?.raw?.bankExistingLoans || [];
    const rawMatching = Array.isArray(rawBankExisting)
      ? rawBankExisting.filter((b) => Number(b.applicationEmploymentIncomeDetailsId) === Number(targetEmpId))
      : [];

    const allMatchingHeaders = matchingExistingHeaders.length > 0 ? matchingExistingHeaders : rawMatching;
    const existingIds = new Set(allMatchingHeaders.map((h) => Number(h.applicationBankExistingLoanDetailsId)));

    // 2. Filter active loans belonging to these existing header IDs
    const matchedActiveLoans = activeLoansList.filter((loan) =>
      existingIds.has(Number(loan.applicationBankExistingLoanDetailsId))
    );

    // Map bank name from masterBanks
    return matchedActiveLoans.map((loan) => {
      const header = allMatchingHeaders.find(
        (h) => Number(h.applicationBankExistingLoanDetailsId) === Number(loan.applicationBankExistingLoanDetailsId)
      );
      const bankId = header?.bankId;
      const matchedBank = masterBanks.find((b) => Number(b.bankId) === Number(bankId));
      return {
        ...loan,
        bankId,
        bankName: matchedBank?.bankName || matchedBank?.bankCode || (bankId ? `Bank #${bankId}` : 'State Bank of India'),
      };
    });
  }, [selectedEmploymentIncomeDetailsId, bankExistingLoansList, verificationData, activeLoansList, masterBanks]);

  const existingActiveLoans = selectedApplicantActiveLoans;

  const totalDeclaredMonthlyEmi = useMemo(() => {
    if (selectedApplicantActiveLoans.length > 0) {
      const activeOnly = selectedApplicantActiveLoans.filter((l) => {
        if (l.isActive === false) return false;
        if (l.status && String(l.status).toLowerCase() === 'closed') return false;
        return true;
      });
      return activeOnly.reduce((sum, l) => sum + (Number(l.emiAmount) || 0), 0);
    }
    return currentAssessment?.existingEMI != null ? currentAssessment.existingEMI : 0;
  }, [selectedApplicantActiveLoans, currentAssessment]);

  // Normal Income Live Previews (Estimated Preview - Non-Authoritative)
  const normalIncomeMetrics = useMemo(() => {
    // 1. Primary Income calculations per row
    const yearCalcs = (Array.isArray(normalIncomeRows) ? normalIncomeRows : []).map((r) => {
      const pat = Number(r.pat) || 0;
      const depr = Number(r.depreciation) || 0;
      const salary = Number(r.salaryToPartners) || 0;
      const interest = Number(r.interestToRelatedParties) || 0;
      const computed = pat + depr + salary + interest;
      return {
        ...r,
        computedPrimaryIncome: computed,
      };
    });

    const latestRow = yearCalcs.find((r) => r.isLatestFinancialYear) || null;
    const latestPrimaryBusinessIncome = latestRow ? latestRow.computedPrimaryIncome : 0;

    // 2. Other Income calculations per row
    const otherCalcs = (Array.isArray(normalOtherIncomeRows) ? normalOtherIncomeRows : []).map((r) => {
      const amt = Number(r.annualIncomeAmount) || 0;
      const pct =
        r.considerationPercentage !== '' && !isNaN(Number(r.considerationPercentage))
          ? Number(r.considerationPercentage)
          : 100;
      const considered = Math.round((amt * pct) / 100);
      return {
        ...r,
        computedConsideredAmount: considered,
      };
    });

    const totalConsideredOtherIncome = otherCalcs.reduce((sum, r) => sum + r.computedConsideredAmount, 0);

    // 3. Salary Income reference calculation (from existing salaryRows or employment details)
    let annualSalary = 0;
    if (liveSalaryAverage > 0) {
      annualSalary = liveSalaryAverage * 12;
    } else if (selectedEmploymentRecord?.grossAnnualIncome > 0) {
      annualSalary = Number(selectedEmploymentRecord.grossAnnualIncome);
    }
    const consideredSalaryComponent = Math.round(annualSalary * 0.60);

    // 4. Combined Estimated Monthly Eligible Income
    // Formula: (((Primary Business Income + Considered Other Income) * 70%) + (Salary Income * 60%)) / 12
    const estimatedEligibleMonthlyIncome = Math.round(
      (((latestPrimaryBusinessIncome + totalConsideredOtherIncome) * 0.70) + consideredSalaryComponent) / 12
    );

    // Eligible EMI = Eligible Monthly Income - Existing Monthly Obligations (FOIR already applied inside Eligible Monthly Income)
    const estimatedEligibleEMI = Math.max(0, estimatedEligibleMonthlyIncome - (Number(totalDeclaredMonthlyEmi) || 0));

    return {
      yearCalcs,
      latestRow,
      latestPrimaryBusinessIncome,
      otherCalcs,
      totalConsideredOtherIncome,
      annualSalary,
      consideredSalaryComponent,
      estimatedEligibleMonthlyIncome,
      estimatedEligibleEMI,
    };
  }, [normalIncomeRows, normalOtherIncomeRows, liveSalaryAverage, selectedEmploymentRecord?.grossAnnualIncome, totalDeclaredMonthlyEmi]);

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

        {/* ── 11-STEP VERIFICATION WORKFLOW SIDEBAR (SIVELS FINANCE) ── */}
        <aside className="bo-cv-left-sidebar" aria-label="11-Step Underwriting Verification Workflow">
          <div className="bo-cv-sidebar-header">
            <div className="bo-cv-sidebar-heading-row">
              <div>
                <h2 className="bo-cv-sidebar-title">Verification Steps</h2>
                <span className="bo-cv-sidebar-subtitle">11-Step Underwriting</span>
              </div>
              <span className="bo-cv-step-count">{VERIFICATION_WORKFLOW_STEPS.length}</span>
            </div>
          </div>

          <nav className="bo-cv-steps-nav">
            <ul className="bo-cv-steps-list" role="list">
              {VERIFICATION_WORKFLOW_STEPS.map((step) => {
                const stepNum = step.number;
                const isDocStep = step.id === 2;
                const isSelected = isDocStep
                  ? (activeStep >= 2 && activeStep <= 7)
                  : (activeStep === stepNum);
                const allVerified = allApplicantDocsVerified;
                const totalRequired = applicantRequiredCount || 1;
                const formattedNum = step.visibleNum || String(stepNum).padStart(2, '0');
                const subtitle = isDocStep
                  ? (allVerified ? `${totalRequired}/${totalRequired} Verified` : `${applicantVerifiedCount}/${totalRequired} Verified`)
                  : step.subtitle;

                return (
                  <li key={step.id} className="bo-cv-step-item">
                    <button
                      type="button"
                      className={`bo-cv-step-card ${isSelected ? 'is-active' : ''}`}
                      onClick={() => {
                        if (isDocStep) {
                          if (activeStep < 2 || activeStep > 7) {
                            navigateToStep(2);
                          }
                        } else {
                          navigateToStep(stepNum);
                        }
                      }}
                      aria-label={`Step ${formattedNum}: ${step.title}. ${isDocStep ? `${applicantVerifiedCount} of ${totalRequired} verified.` : ''} Click to view.`}
                    >
                      <div className="bo-cv-step-num-box" aria-hidden="true">
                        {formattedNum}
                      </div>

                      <div className="bo-cv-step-details">
                        <strong className="bo-cv-step-name">{step.title}</strong>
                        <span className="bo-cv-step-desc">{subtitle}</span>
                      </div>

                      <div className="bo-cv-step-action">
                        {isDocStep && isSelected ? (
                          <span
                            className={`bo-cv-sidebar-progress-pill ${
                              allVerified
                                ? 'is-completed'
                                : applicantVerifiedCount > 0
                                ? 'is-progressing'
                                : ''
                            }`}
                          >
                            {allVerified ? `${totalRequired}/${totalRequired} ✓` : `${applicantVerifiedCount}/${totalRequired}`}
                          </span>
                        ) : !isSelected ? (
                          <span className="bo-cv-view-btn">
                            {EyeIcon && <EyeIcon size={11} />}
                            <span>View</span>
                          </span>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* ── RIGHT MAIN WORKSPACE: 11-STEP UNDERWRITING CONTENT ─────────── */}
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
                <span className="bo-cv-step-tag-pill">Step 01 of 11</span>
              </div>

              <div className="bo-cv-view-form-embed-wrapper">
                <ApplicationDraftProvider key={`app-draft-provider-${viewFormRefreshKey}`}>
                  <PdfView key={`pdf-view-${viewFormRefreshKey}`} />
                </ApplicationDraftProvider>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEPS 02–07: CONSOLIDATED DOCUMENT VERIFICATION WORKSPACE
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep >= 2 && activeStep <= 7 && (
            <div className="bo-cv-step-panel bo-cv-doc-verification-workspace">
              {/* Workspace Persistent Header */}
              <div className="bo-cv-step-panel-header bo-cv-doc-workspace-header">
                <div className="bo-cv-doc-header-left">
                  <div className="bo-cv-step-badge-num">02</div>
                  <div className="bo-cv-doc-header-text">
                    <div className="bo-cv-doc-workspace-title-row">
                      <h2 className="bo-cv-step-panel-title">DOCUMENT VERIFICATION</h2>
                      <span
                        className={`bo-cv-group-progress-badge ${
                          allApplicantDocsVerified
                            ? 'is-completed'
                            : applicantVerifiedCount > 0
                            ? 'is-progressing'
                            : ''
                        }`}
                      >
                        {allApplicantDocsVerified && '✓ '}
                        {applicantVerifiedCount}/{applicantRequiredCount || 1} VERIFIED
                      </span>
                    </div>
                    <p className="bo-cv-step-panel-desc">
                      Consolidated document review workspace. Inspect, verify, or return documents to RM for Applicant and Co-Applicant(s).
                    </p>
                  </div>
                </div>
                <div className="bo-cv-doc-header-right">
                  <span className="bo-cv-step-tag-pill">Step 02 of 11</span>
                </div>
              </div>

              {/* Unified 2-Card Layout (Applicant & Co-Applicant Tables with Row Verification) */}
              <div className="bo-cv-doc-unified-container">
                {/* ── CARD 1: APPLICANT DOCUMENTS TABLE ── */}
                <div className="bo-cv-doc-card">
                  <div className="bo-cv-doc-card-header">
                    <div className="bo-cv-doc-card-header-left">
                      <div className="bo-cv-doc-card-icon">
                        {UserIcon ? <UserIcon size={18} /> : <span>👤</span>}
                      </div>
                      <div>
                        <h3 className="bo-cv-doc-card-title">Applicant Documents</h3>
                        <span className="bo-cv-doc-card-subtitle">
                          Primary Applicant: {applicantName}
                        </span>
                      </div>
                    </div>
                    <div className="bo-cv-doc-card-header-right">
                      <span className="bo-cv-doc-card-count-badge">
                        {applicantVerifiedCount} of {applicantRequiredCount} Verified
                      </span>
                    </div>
                  </div>

                  <div className="bo-cv-doc-table-wrapper">
                    <table className="bo-cv-doc-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                          <th style={{ width: '180px' }}>Document</th>
                          <th style={{ width: '65px', textAlign: 'center' }}>Preview</th>
                          <th>File Name</th>
                          <th style={{ width: '115px', textAlign: 'center' }}>Verified</th>
                          <th style={{ width: '120px', textAlign: 'center' }}>Status</th>
                          <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applicantDocRows.map((row, idx) => {
                          const IconComp = row.icon;
                          const isThisRowSaving = savingVerificationKey === `${row.applicantSequence || 0}_${row.stepCode}`;
                          const isCheckboxDisabled =
                            !row.hasFile ||
                            row.isNotRequired ||
                            row.status === 'Not Required' ||
                            row.status === 'Returned to RM' ||
                            row.status === 'Returned' ||
                            (row.status !== 'Resubmitted' && hasUnresolvedRejectionForStep(row.stepCode, 0)) ||
                            isThisRowSaving;

                          return (
                            <tr key={row.id} className="bo-cv-doc-tr">
                              <td className="bo-cv-doc-td-num">
                                <span className="bo-cv-doc-num-badge">0{idx + 1}</span>
                              </td>
                              <td className="bo-cv-doc-td-type">
                                <div className="bo-cv-doc-type-cell">
                                  <div className="bo-cv-doc-type-icon">
                                    {IconComp ? <IconComp size={15} /> : <span>📄</span>}
                                  </div>
                                  <span className="bo-cv-doc-type-name">{row.docType}</span>
                                </div>
                              </td>
                              <td className="bo-cv-doc-td-thumb" style={{ textAlign: 'center' }}>
                                <div
                                  className={`bo-cv-doc-thumb-box ${row.hasFile && !row.isNotRequired ? 'is-clickable' : 'is-empty'} ${row.loading ? 'is-loading' : ''}`}
                                  onClick={() => row.hasFile && !row.isNotRequired && handleRowView(row)}
                                  title={row.isNotRequired ? 'Document not required' : row.hasFile ? 'Click to preview' : 'No document uploaded'}
                                >
                                  {row.loading ? (
                                    <div className="bo-cv-doc-thumb-spinner" />
                                  ) : row.url && row.isImage ? (
                                    <img src={row.url} alt={row.fileName} className="bo-cv-doc-thumb-img" />
                                  ) : row.url && row.isPdf ? (
                                    <div className="bo-cv-doc-thumb-pdf">PDF</div>
                                  ) : row.isZip && row.hasFile ? (
                                    <div className="bo-cv-doc-thumb-zip">ZIP</div>
                                  ) : (
                                    <div className="bo-cv-doc-thumb-placeholder">—</div>
                                  )}
                                  {row.hasFile && !row.isNotRequired && (
                                    <div className="bo-cv-doc-thumb-hover-overlay">
                                      {EyeIcon ? <EyeIcon size={12} /> : <span>👁</span>}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="bo-cv-doc-td-details">
                                <div className="bo-cv-doc-file-info">
                                  <span className="bo-cv-doc-filename" title={row.fileName}>
                                    {row.loading ? 'Loading document...' : row.fileName}
                                  </span>
                                  <div className="bo-cv-doc-file-meta">
                                    {row.loading ? (
                                      <span className="bo-cv-doc-meta-loading">Fetching preview...</span>
                                    ) : (
                                      <>
                                        {row.fileSize && <span>{formatFileSize(row.fileSize)}</span>}
                                        {row.fileSize && row.uploadDate && <span>•</span>}
                                        {row.uploadDate && <span>{formatUploadDate(row.uploadDate)}</span>}
                                        {!row.fileSize && !row.uploadDate && (
                                          <span className="bo-cv-doc-meta-empty">{row.isNotRequired ? 'Not required' : row.hasFile ? 'Uploaded' : 'Not available'}</span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="bo-cv-doc-td-verify" style={{ textAlign: 'center' }}>
                                <label
                                  className={`bo-cv-doc-verify-checkbox-label ${isCheckboxDisabled ? 'is-disabled' : ''} ${row.isVerified ? 'is-checked' : ''}`}
                                  title={
                                    row.isNotRequired || row.status === 'Not Required'
                                      ? 'Document is not required for this employment type'
                                      : !row.hasFile
                                      ? 'Cannot verify: Document not uploaded'
                                      : row.status === 'Returned to RM' || row.status === 'Returned'
                                      ? 'Cannot verify: Document is returned to RM'
                                      : row.status === 'Resubmitted'
                                      ? 'Click to verify resubmitted document'
                                      : hasUnresolvedRejectionForStep(row.stepCode, 0)
                                      ? 'Cannot verify: Unresolved rejection pending for this document'
                                      : row.isVerified
                                      ? 'Click to unverify document'
                                      : 'Click to mark document as verified'
                                  }
                                >
                                  <input
                                    type="checkbox"
                                    className="bo-cv-doc-verify-checkbox"
                                    checked={Boolean(row.isVerified)}
                                    disabled={isCheckboxDisabled}
                                    onChange={() => handleToggleRowVerification(row)}
                                  />
                                  <span className={`bo-cv-doc-verify-checkbox-text ${row.isVerified ? 'is-verified' : ''}`}>
                                    {row.isVerified ? 'Verified' : ''}
                                  </span>
                                </label>
                              </td>
                              <td className="bo-cv-doc-td-status" style={{ textAlign: 'center' }}>
                                <span className={`bo-cv-status-badge bo-cv-status-badge--${row.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                  <span className="bo-cv-badge-dot" />
                                  {row.status}
                                </span>
                              </td>
                              <td className="bo-cv-doc-td-actions" style={{ textAlign: 'center' }}>
                                <div className="bo-cv-doc-actions-group">
                                  <button
                                    type="button"
                                    className="bo-cv-doc-action-btn bo-cv-doc-action-btn--view"
                                    title={row.isNotRequired ? 'Document not required' : row.hasFile ? 'View document' : 'Document not available'}
                                    disabled={!row.hasFile || row.isNotRequired}
                                    onClick={() => handleRowView(row)}
                                  >
                                    {EyeIcon ? <EyeIcon size={14} /> : <span>👁</span>}
                                  </button>
                                  <button
                                    type="button"
                                    className="bo-cv-doc-action-btn bo-cv-doc-action-btn--download"
                                    title={row.isNotRequired ? 'Document not required' : row.hasFile ? 'Download document' : 'Document not available'}
                                    disabled={!row.hasFile || row.isNotRequired}
                                    onClick={() => handleRowDownload(row)}
                                  >
                                    {DownloadIcon ? <DownloadIcon size={14} /> : <span>⬇</span>}
                                  </button>
                                  <button
                                    type="button"
                                    className="bo-cv-doc-action-btn bo-cv-doc-action-btn--return"
                                    title={
                                      row.isNotRequired
                                        ? 'Document not required'
                                        : !row.hasFile
                                        ? (['PROFILE_IMAGE', 'AADHAAR', 'PAN'].includes(row.stepCode)
                                            ? 'Identity document file is not available for return.'
                                            : 'Document not available')
                                        : 'Return document to RM'
                                    }
                                    disabled={!row.hasFile || row.isNotRequired}
                                    onClick={() => handleRowReturn(row)}
                                  >
                                    {RotateCcwIcon ? <RotateCcwIcon size={14} /> : <span>↩</span>}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── CARD 2: CO-APPLICANT DOCUMENTS TABLE ── */}
                <div className="bo-cv-doc-card">
                  <div className="bo-cv-doc-card-header">
                    <div className="bo-cv-doc-card-header-left">
                      <div className="bo-cv-doc-card-icon is-coapp">
                        {UsersIcon ? <UsersIcon size={18} /> : <span>👥</span>}
                      </div>
                      <div>
                        <h3 className="bo-cv-doc-card-title">Co-Applicant Documents</h3>
                        {selectedCoApplicant && (
                          <span className="bo-cv-doc-card-subtitle">
                            {selectedCoApplicant.customerName || `Co-Applicant ${selectedCoApplicant.number || selectedCoApplicantIndex + 1}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bo-cv-doc-card-header-right">
                      {coApplicants.length > 1 ? (
                        <div className="bo-cv-coapp-nav">
                          <button
                            type="button"
                            className="bo-cv-coapp-nav-btn"
                            disabled={selectedCoApplicantIndex === 0}
                            onClick={() => setSelectedCoApplicantIndex((prev) => Math.max(0, prev - 1))}
                            title="Previous Co-Applicant"
                            aria-label="Previous Co-Applicant"
                          >
                            {ChevronLeftIcon ? <ChevronLeftIcon size={16} /> : <span>‹</span>}
                          </button>
                          <span className="bo-cv-coapp-nav-label">
                            Co-Applicant {selectedCoApplicant?.number || selectedCoApplicantIndex + 1}
                            {selectedCoApplicant?.customerName ? `: ${selectedCoApplicant.customerName}` : ''}
                          </span>
                          <span className="bo-cv-coapp-nav-counter">
                            {selectedCoApplicantIndex + 1}/{coApplicants.length}
                          </span>
                          <button
                            type="button"
                            className="bo-cv-coapp-nav-btn"
                            disabled={selectedCoApplicantIndex >= coApplicants.length - 1}
                            onClick={() => setSelectedCoApplicantIndex((prev) => Math.min(coApplicants.length - 1, prev + 1))}
                            title="Next Co-Applicant"
                            aria-label="Next Co-Applicant"
                          >
                            {ChevronRightIcon ? <ChevronRightIcon size={16} /> : <span>›</span>}
                          </button>
                        </div>
                      ) : coApplicants.length === 1 ? (
                        <span className="bo-cv-doc-card-count-badge">
                          {selectedCoApplicant?.customerName || 'Co-Applicant 1'} (1 Attached)
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {coApplicants.length === 0 ? (
                    <div className="bo-cv-doc-empty-card-state">
                      <div className="bo-cv-doc-empty-icon">
                        {UsersIcon ? <UsersIcon size={24} /> : <span>👥</span>}
                      </div>
                      <h4>No Co-Applicants Attached</h4>
                      <p>This loan application does not currently have any co-applicants registered.</p>
                    </div>
                  ) : (
                    <div className="bo-cv-doc-table-wrapper">
                      <table className="bo-cv-doc-table">
                        <thead>
                          <tr>
                            <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                            <th style={{ width: '180px' }}>Document</th>
                            <th style={{ width: '65px', textAlign: 'center' }}>Preview</th>
                            <th>File Name</th>
                            <th style={{ width: '115px', textAlign: 'center' }}>Verified</th>
                            <th style={{ width: '120px', textAlign: 'center' }}>Status</th>
                            <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coApplicantDocRows.map((row, idx) => {
                            const IconComp = row.icon;
                            const isThisRowSaving = savingVerificationKey === `${row.applicantSequence}_${row.stepCode}`;
                            const isCheckboxDisabled =
                              !row.hasFile ||
                              row.isNotRequired ||
                              row.status === 'Not Required' ||
                              row.status === 'Returned to RM' ||
                              row.status === 'Returned' ||
                              (row.status !== 'Resubmitted' && hasUnresolvedRejectionForStep(row.stepCode, row.applicantSequence)) ||
                              isThisRowSaving;

                            return (
                              <tr key={row.id} className="bo-cv-doc-tr">
                                <td className="bo-cv-doc-td-num">
                                  <span className="bo-cv-doc-num-badge">0{idx + 1}</span>
                                </td>
                                <td className="bo-cv-doc-td-type">
                                  <div className="bo-cv-doc-type-cell">
                                    <div className="bo-cv-doc-type-icon">
                                      {IconComp ? <IconComp size={15} /> : <span>📄</span>}
                                    </div>
                                    <span className="bo-cv-doc-type-name">{row.docType}</span>
                                  </div>
                                </td>
                                <td className="bo-cv-doc-td-thumb" style={{ textAlign: 'center' }}>
                                  <div
                                    className={`bo-cv-doc-thumb-box ${row.hasFile && !row.isNotRequired ? 'is-clickable' : 'is-empty'} ${row.loading ? 'is-loading' : ''}`}
                                    onClick={() => row.hasFile && !row.isNotRequired && handleRowView(row)}
                                    title={row.isNotRequired ? 'Document not required' : row.hasFile ? 'Click to preview' : 'No document uploaded'}
                                  >
                                    {row.loading ? (
                                      <div className="bo-cv-doc-thumb-spinner" />
                                    ) : row.url && row.isImage ? (
                                      <img src={row.url} alt={row.fileName} className="bo-cv-doc-thumb-img" />
                                    ) : row.url && row.isPdf ? (
                                      <div className="bo-cv-doc-thumb-pdf">PDF</div>
                                    ) : row.isZip && row.hasFile ? (
                                      <div className="bo-cv-doc-thumb-zip">ZIP</div>
                                    ) : (
                                      <div className="bo-cv-doc-thumb-placeholder">—</div>
                                    )}
                                    {row.hasFile && !row.isNotRequired && (
                                      <div className="bo-cv-doc-thumb-hover-overlay">
                                        {EyeIcon ? <EyeIcon size={12} /> : <span>👁</span>}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="bo-cv-doc-td-details">
                                  <div className="bo-cv-doc-file-info">
                                    <span className="bo-cv-doc-filename" title={row.fileName}>
                                      {row.loading ? 'Loading document...' : row.fileName}
                                    </span>
                                    <div className="bo-cv-doc-file-meta">
                                      {row.loading ? (
                                        <span className="bo-cv-doc-meta-loading">Fetching preview...</span>
                                      ) : (
                                        <>
                                          {row.fileSize && <span>{formatFileSize(row.fileSize)}</span>}
                                          {row.fileSize && row.uploadDate && <span>•</span>}
                                          {row.uploadDate && <span>{formatUploadDate(row.uploadDate)}</span>}
                                          {!row.fileSize && !row.uploadDate && (
                                            <span className="bo-cv-doc-meta-empty">{row.isNotRequired ? 'Not required' : row.hasFile ? 'Uploaded' : 'Not available'}</span>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="bo-cv-doc-td-verify" style={{ textAlign: 'center' }}>
                                  <label
                                    className={`bo-cv-doc-verify-checkbox-label ${isCheckboxDisabled ? 'is-disabled' : ''} ${row.isVerified ? 'is-checked' : ''}`}
                                    title={
                                      row.isNotRequired || row.status === 'Not Required'
                                        ? 'Document is not required for this employment type'
                                        : !row.hasFile
                                        ? 'Cannot verify: Document not uploaded'
                                        : row.status === 'Returned to RM' || row.status === 'Returned'
                                        ? 'Cannot verify: Document is returned to RM'
                                        : row.status === 'Resubmitted'
                                        ? 'Click to verify resubmitted document'
                                        : hasUnresolvedRejectionForStep(row.stepCode, row.applicantSequence)
                                        ? 'Cannot verify: Unresolved rejection pending for this document'
                                        : row.isVerified
                                        ? 'Click to unverify document'
                                        : 'Click to mark document as verified'
                                    }
                                  >
                                    <input
                                      type="checkbox"
                                      className="bo-cv-doc-verify-checkbox"
                                      checked={Boolean(row.isVerified)}
                                      disabled={isCheckboxDisabled}
                                      onChange={() => handleToggleRowVerification(row)}
                                    />
                                    <span className={`bo-cv-doc-verify-checkbox-text ${row.isVerified ? 'is-verified' : ''}`}>
                                      {row.isVerified ? 'Verified' : ''}
                                    </span>
                                  </label>
                                </td>
                                <td className="bo-cv-doc-td-status" style={{ textAlign: 'center' }}>
                                  <span className={`bo-cv-status-badge bo-cv-status-badge--${row.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                    <span className="bo-cv-badge-dot" />
                                    {row.status}
                                  </span>
                                </td>
                                <td className="bo-cv-doc-td-actions" style={{ textAlign: 'center' }}>
                                  <div className="bo-cv-doc-actions-group">
                                    <button
                                      type="button"
                                      className="bo-cv-doc-action-btn bo-cv-doc-action-btn--view"
                                      title={row.isNotRequired ? 'Document not required' : row.hasFile ? 'View document' : 'Document not available'}
                                      disabled={!row.hasFile || row.isNotRequired}
                                      onClick={() => handleRowView(row)}
                                    >
                                      {EyeIcon ? <EyeIcon size={14} /> : <span>👁</span>}
                                    </button>
                                    <button
                                      type="button"
                                      className="bo-cv-doc-action-btn bo-cv-doc-action-btn--download"
                                      title={row.isNotRequired ? 'Document not required' : row.hasFile ? 'Download document' : 'Document not available'}
                                      disabled={!row.hasFile || row.isNotRequired}
                                      onClick={() => handleRowDownload(row)}
                                    >
                                      {DownloadIcon ? <DownloadIcon size={14} /> : <span>⬇</span>}
                                    </button>
                                    <button
                                      type="button"
                                      className="bo-cv-doc-action-btn bo-cv-doc-action-btn--return"
                                      title={
                                        row.isNotRequired
                                          ? 'Document not required'
                                          : !row.hasFile
                                          ? (['PROFILE_IMAGE', 'AADHAAR', 'PAN'].includes(row.stepCode)
                                              ? 'Identity document file is not available for return.'
                                              : 'Document not available')
                                          : 'Return document to RM'
                                      }
                                      disabled={!row.hasFile || row.isNotRequired}
                                      onClick={() => handleRowReturn(row)}
                                    >
                                      {RotateCcwIcon ? <RotateCcwIcon size={14} /> : <span>↩</span>}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeStep === 8 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">03</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Property FI</h2>
                    <p className="bo-cv-step-panel-desc">Property Field Investigation details and collateral valuation.</p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 03 of 11</span>
              </div>

              <div className="bo-cv-placeholder-panel">
                <div className="bo-cv-placeholder-icon">
                  {BuildingIcon && <BuildingIcon size={40} />}
                </div>
                <span className="bo-cv-placeholder-badge">PENDING IMPLEMENTATION</span>
                <h3>Property FI — implementation pending</h3>
                <p>Property field investigation module integration is scheduled for future underwriting release.</p>
              </div>

              {renderHealthChecksChecklist(8)}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 09: OFFICE FI (PLACEHOLDER)
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 9 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">04</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Office FI</h2>
                    <p className="bo-cv-step-panel-desc">Workplace and business establishment field investigation.</p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 04 of 11</span>
              </div>

              <div className="bo-cv-placeholder-panel">
                <div className="bo-cv-placeholder-icon">
                  {BuildingIcon && <BuildingIcon size={40} />}
                </div>
                <span className="bo-cv-placeholder-badge">PENDING IMPLEMENTATION</span>
                <h3>Office FI — implementation pending</h3>
                <p>Office field investigation module integration is scheduled for future underwriting release.</p>
              </div>

              {renderHealthChecksChecklist(9)}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 10: RESIDENCE FI (PLACEHOLDER)
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 10 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">05</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Residence FI</h2>
                    <p className="bo-cv-step-panel-desc">Physical residence field verification and neighbor check.</p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 05 of 11</span>
              </div>

              <div className="bo-cv-placeholder-panel">
                <div className="bo-cv-placeholder-icon">
                  {BuildingIcon && <BuildingIcon size={40} />}
                </div>
                <span className="bo-cv-placeholder-badge">PENDING IMPLEMENTATION</span>
                <h3>Residence FI — implementation pending</h3>
                <p>Residence field investigation module integration is scheduled for future underwriting release.</p>
              </div>

              {renderHealthChecksChecklist(10)}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 09: LEGAL OPINION
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 11 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">06</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Legal Opinion</h2>
                    <p className="bo-cv-step-panel-desc">
                      Upload and review advocate title investigation report and legal opinion (Max: 150 MB).
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 06 of 11</span>
              </div>

              <div className="bo-cv-upload-container">
                {!legalOpinion.backOfficeApplicationDocumentId && !legalOpinion.file ? (
                  <div className="bo-cv-dropzone-box">
                    <input
                      type="file"
                      id="bo-cv-legal-upload"
                      className="bo-cv-file-input"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => handleUploadOrReplaceDocument(e, 'LEGAL_OPINION', legalOpinion, setLegalOpinion)}
                      disabled={legalOpinion.loading}
                    />
                    <label htmlFor="bo-cv-legal-upload" className="bo-cv-dropzone-label">
                      <div className="bo-cv-dropzone-icon">
                        {FileTextIcon && <FileTextIcon size={32} />}
                      </div>
                      <strong className="bo-cv-dropzone-title">Upload Legal Opinion Document</strong>
                      <span className="bo-cv-dropzone-sub">
                        Drag and drop or browse file from your device &bull; Maximum file size 150 MB
                      </span>
                      <span className="bo-cv-dropzone-types">Supported formats: PDF, DOC, DOCX, JPG, PNG, WEBP</span>
                    </label>
                  </div>
                ) : (
                  <>
                    <div className="bo-cv-file-card">
                      <div className="bo-cv-file-card-info">
                        <div className="bo-cv-file-card-icon">
                          {FileCheckIcon && <FileCheckIcon size={26} />}
                        </div>
                        <div className="bo-cv-file-card-details">
                          <h4 className="bo-cv-file-name">{legalOpinion.fileName || legalOpinion.documentTitle || 'Legal Opinion Document'}</h4>
                          <div className="bo-cv-file-meta-badges">
                            {legalOpinion.fileSize && (
                              <span className="bo-cv-file-size">Size: {legalOpinion.fileSize}</span>
                            )}
                            {legalOpinion.uploadedAt && (
                              <span className="bo-cv-file-size">Uploaded: {new Date(legalOpinion.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            )}
                            <span className="bo-cv-file-status-badge">{legalOpinion.documentStatus || 'Uploaded'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bo-cv-file-card-actions">
                        <button
                          type="button"
                          className="bo-btn bo-btn--outline bo-btn--sm"
                          onClick={() => handleViewBackOfficeDocument(legalOpinion, setLegalOpinion)}
                          disabled={legalOpinion.loading}
                        >
                          {ExternalLinkIcon && <ExternalLinkIcon size={13} />}
                          <span>{legalOpinion.loading ? 'Loading...' : 'View'}</span>
                        </button>
                        <button
                          type="button"
                          className="bo-btn bo-btn--outline bo-btn--sm"
                          onClick={() => handleDownloadBackOfficeDocument(legalOpinion, setLegalOpinion)}
                          disabled={legalOpinion.loading}
                        >
                          {DownloadIcon && <DownloadIcon size={13} />}
                          <span>Download</span>
                        </button>
                        <button
                          type="button"
                          className="bo-btn bo-btn--outline-danger bo-btn--sm"
                          onClick={() => handleDeleteBackOfficeDocument('LEGAL_OPINION', legalOpinion, setLegalOpinion)}
                          disabled={legalOpinion.loading}
                        >
                          {Trash2Icon && <Trash2Icon size={13} />}
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    {legalOpinion.backOfficeApplicationDocumentId && (
                      <div className="bo-cv-step-remarks-box">
                        <label htmlFor="bo-cv-legal-remarks-input" className="bo-cv-step-remarks-label">
                          Legal Opinion Remarks
                        </label>
                        <textarea
                          id="bo-cv-legal-remarks-input"
                          className="bo-cv-step-remarks-textarea"
                          rows={3}
                          placeholder="Enter Legal Opinion remarks..."
                          value={legalOpinion.remarks || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLegalOpinion((prev) => ({ ...prev, remarks: val, error: null, successMsg: '' }));
                          }}
                          disabled={legalOpinion.savingRemarks}
                        />
                        <div className="bo-cv-step-remarks-footer">
                          {legalOpinion.successMsg && (
                            <span className="bo-cv-step-remarks-success">
                              ✓ {legalOpinion.successMsg}
                            </span>
                          )}
                          <button
                            type="button"
                            className="bo-btn bo-btn--primary bo-btn--sm bo-cv-btn-save-remarks"
                            onClick={() => handleOpenSaveRemarksConfirm('LEGAL_OPINION', 'Legal Opinion', legalOpinion, setLegalOpinion)}
                            disabled={legalOpinion.savingRemarks || !(legalOpinion.remarks || '').trim()}
                          >
                            {legalOpinion.savingRemarks ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {legalOpinion.loading && (
                  <div className="bo-cv-feedback-alert is-info">
                    Processing Legal Opinion document...
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
          {activeStep === 12 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">07</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Technical Value</h2>
                    <p className="bo-cv-step-panel-desc">
                      Upload and review certified engineer property valuation and technical report (Max: 150 MB).
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 07 of 11</span>
              </div>

              <div className="bo-cv-upload-container">
                {!technicalValue.backOfficeApplicationDocumentId && !technicalValue.file ? (
                  <div className="bo-cv-dropzone-box">
                    <input
                      type="file"
                      id="bo-cv-tech-upload"
                      className="bo-cv-file-input"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => handleUploadOrReplaceDocument(e, 'TECHNICAL_VALUATION', technicalValue, setTechnicalValue)}
                      disabled={technicalValue.loading}
                    />
                    <label htmlFor="bo-cv-tech-upload" className="bo-cv-dropzone-label">
                      <div className="bo-cv-dropzone-icon">
                        {BuildingIcon && <BuildingIcon size={32} />}
                      </div>
                      <strong className="bo-cv-dropzone-title">Upload Technical Valuation Report</strong>
                      <span className="bo-cv-dropzone-sub">
                        Drag and drop or browse file from your device &bull; Maximum file size 150 MB
                      </span>
                      <span className="bo-cv-dropzone-types">Supported formats: PDF, DOC, DOCX, JPG, PNG, WEBP</span>
                    </label>
                  </div>
                ) : (
                  <>
                    <div className="bo-cv-file-card">
                      <div className="bo-cv-file-card-info">
                        <div className="bo-cv-file-card-icon">
                          {FileCheckIcon && <FileCheckIcon size={26} />}
                        </div>
                        <div className="bo-cv-file-card-details">
                          <h4 className="bo-cv-file-name">{technicalValue.fileName || technicalValue.documentTitle || 'Technical Valuation Document'}</h4>
                          <div className="bo-cv-file-meta-badges">
                            {technicalValue.fileSize && (
                              <span className="bo-cv-file-size">Size: {technicalValue.fileSize}</span>
                            )}
                            {technicalValue.uploadedAt && (
                              <span className="bo-cv-file-size">Uploaded: {new Date(technicalValue.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            )}
                            <span className="bo-cv-file-status-badge">{technicalValue.documentStatus || 'Uploaded'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bo-cv-file-card-actions">
                        <button
                          type="button"
                          className="bo-btn bo-btn--outline bo-btn--sm"
                          onClick={() => handleViewBackOfficeDocument(technicalValue, setTechnicalValue)}
                          disabled={technicalValue.loading}
                        >
                          {ExternalLinkIcon && <ExternalLinkIcon size={13} />}
                          <span>{technicalValue.loading ? 'Loading...' : 'View'}</span>
                        </button>
                        <button
                          type="button"
                          className="bo-btn bo-btn--outline bo-btn--sm"
                          onClick={() => handleDownloadBackOfficeDocument(technicalValue, setTechnicalValue)}
                          disabled={technicalValue.loading}
                        >
                          {DownloadIcon && <DownloadIcon size={13} />}
                          <span>Download</span>
                        </button>
                        <button
                          type="button"
                          className="bo-btn bo-btn--outline-danger bo-btn--sm"
                          onClick={() => handleDeleteBackOfficeDocument('TECHNICAL_VALUATION', technicalValue, setTechnicalValue)}
                          disabled={technicalValue.loading}
                        >
                          {Trash2Icon && <Trash2Icon size={13} />}
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    {technicalValue.backOfficeApplicationDocumentId && (
                      <div className="bo-cv-step-remarks-box">
                        <label htmlFor="bo-cv-tech-remarks-input" className="bo-cv-step-remarks-label">
                          Technical Valuation Remarks
                        </label>
                        <textarea
                          id="bo-cv-tech-remarks-input"
                          className="bo-cv-step-remarks-textarea"
                          rows={3}
                          placeholder="Enter Technical Valuation remarks..."
                          value={technicalValue.remarks || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTechnicalValue((prev) => ({ ...prev, remarks: val, error: null, successMsg: '' }));
                          }}
                          disabled={technicalValue.savingRemarks}
                        />
                        <div className="bo-cv-step-remarks-footer">
                          {technicalValue.successMsg && (
                            <span className="bo-cv-step-remarks-success">
                              ✓ {technicalValue.successMsg}
                            </span>
                          )}
                          <button
                            type="button"
                            className="bo-btn bo-btn--primary bo-btn--sm bo-cv-btn-save-remarks"
                            onClick={() => handleOpenSaveRemarksConfirm('TECHNICAL_VALUATION', 'Technical Valuation', technicalValue, setTechnicalValue)}
                            disabled={technicalValue.savingRemarks || !(technicalValue.remarks || '').trim()}
                          >
                            {technicalValue.savingRemarks ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {technicalValue.loading && (
                  <div className="bo-cv-feedback-alert is-info">
                    Processing Technical Valuation document...
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
              STEP 13: CIBIL CHECK
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 13 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">08</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Credit Bureau &amp; CIBIL Verification</h2>
                    <p className="bo-cv-step-panel-desc">
                      Direct bureau credit pull, CIR score breakdown, and manual PAN verification upload.
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 08 of 11</span>
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

                {!manualCibilPan.backOfficeApplicationDocumentId && !manualCibilPan.file ? (
                  <div className="bo-cv-manual-pan-upload-row">
                    <input
                      type="file"
                      id="bo-cv-cibil-pan-file"
                      className="bo-cv-file-input"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => handleUploadOrReplaceDocument(e, 'MANUAL_CIBIL_PAN', manualCibilPan, setManualCibilPan)}
                      disabled={manualCibilPan.loading}
                    />
                    <label htmlFor="bo-cv-cibil-pan-file" className="bo-cv-manual-pan-btn">
                      {FileTextIcon && <FileTextIcon size={14} />}
                      <span>{manualCibilPan.loading ? 'Uploading...' : 'Select Manual PAN File'}</span>
                    </label>
                    <span className="bo-cv-manual-pan-hint">No file uploaded (Optional reference upload &bull; Max 150 MB)</span>
                  </div>
                ) : (
                  <>
                    <div className="bo-cv-file-card bo-cv-manual-pan-card-wrapper">
                      <div className="bo-cv-file-card-info">
                        <div className="bo-cv-file-card-icon">
                          {FileCheckIcon && <FileCheckIcon size={24} />}
                        </div>
                        <div className="bo-cv-file-card-details">
                          <h4 className="bo-cv-file-name">{manualCibilPan.fileName || manualCibilPan.documentTitle || 'Manual CIBIL PAN Document'}</h4>
                          <div className="bo-cv-file-meta-badges">
                            {manualCibilPan.fileSize && (
                              <span className="bo-cv-file-size">Size: {manualCibilPan.fileSize}</span>
                            )}
                            {manualCibilPan.uploadedAt && (
                              <span className="bo-cv-file-size">Uploaded: {new Date(manualCibilPan.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            )}
                            <span className="bo-cv-file-status-badge">{manualCibilPan.documentStatus || 'Uploaded'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bo-cv-file-card-actions">
                        <button
                          type="button"
                          className="bo-btn bo-btn--outline bo-btn--sm"
                          onClick={() => handleViewBackOfficeDocument(manualCibilPan, setManualCibilPan)}
                          disabled={manualCibilPan.loading}
                        >
                          {ExternalLinkIcon && <ExternalLinkIcon size={13} />}
                          <span>{manualCibilPan.loading ? 'Loading...' : 'View'}</span>
                        </button>
                        <button
                          type="button"
                          className="bo-btn bo-btn--outline bo-btn--sm"
                          onClick={() => handleDownloadBackOfficeDocument(manualCibilPan, setManualCibilPan)}
                          disabled={manualCibilPan.loading}
                        >
                          {DownloadIcon && <DownloadIcon size={13} />}
                          <span>Download</span>
                        </button>
                        <button
                          type="button"
                          className="bo-btn bo-btn--outline-danger bo-btn--sm"
                          onClick={() => handleDeleteBackOfficeDocument('MANUAL_CIBIL_PAN', manualCibilPan, setManualCibilPan)}
                          disabled={manualCibilPan.loading}
                        >
                          {Trash2Icon && <Trash2Icon size={13} />}
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    {manualCibilPan.backOfficeApplicationDocumentId && (
                      <div className="bo-cv-step-remarks-box" style={{ marginTop: '12px' }}>
                        <label htmlFor="bo-cv-cibil-pan-remarks-input" className="bo-cv-step-remarks-label">
                          Manual CIBIL PAN Remarks
                        </label>
                        <textarea
                          id="bo-cv-cibil-pan-remarks-input"
                          className="bo-cv-step-remarks-textarea"
                          rows={3}
                          placeholder="Enter Manual CIBIL PAN remarks..."
                          value={manualCibilPan.remarks || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualCibilPan((prev) => ({ ...prev, remarks: val, error: null, successMsg: '' }));
                          }}
                          disabled={manualCibilPan.savingRemarks}
                        />
                        <div className="bo-cv-step-remarks-footer">
                          {manualCibilPan.successMsg && (
                            <span className="bo-cv-step-remarks-success">
                              ✓ {manualCibilPan.successMsg}
                            </span>
                          )}
                          <button
                            type="button"
                            className="bo-btn bo-btn--primary bo-btn--sm bo-cv-btn-save-remarks"
                            onClick={() => handleOpenSaveRemarksConfirm('MANUAL_CIBIL_PAN', 'Manual CIBIL PAN', manualCibilPan, setManualCibilPan)}
                            disabled={manualCibilPan.savingRemarks || !(manualCibilPan.remarks || '').trim()}
                          >
                            {manualCibilPan.savingRemarks ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {manualCibilPan.loading && (
                  <div className="bo-cv-feedback-alert is-info" style={{ marginTop: '0.75rem' }}>
                    Processing Manual CIBIL PAN document...
                  </div>
                )}
                {manualCibilPan.error && (
                  <div className="bo-cv-feedback-alert is-error" style={{ marginTop: '0.75rem' }}>
                    {manualCibilPan.error}
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
              STEP 14: PD VERIFICATION
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 14 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">09</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Personal Discussion (PD) Verification</h2>
                    <p className="bo-cv-step-panel-desc">
                      Configure and record personal discussion verification mode with the applicant.
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 09 of 11</span>
              </div>

              <div className="bo-cv-pd-container">
                <div className="bo-cv-pd-select-card">
                  <label htmlFor="bo-cv-pd-type-select" className="bo-cv-pd-select-label">
                    SELECT PD VERIFICATION MODE
                  </label>
                  <select
                    id="bo-cv-pd-type-select"
                    className="bo-cv-pd-dropdown"
                    value={selectedPdTypeId || ''}
                    onChange={(e) => setSelectedPdTypeId(Number(e.target.value) || e.target.value)}
                    disabled={pdVerificationTypesLoading || activePdVerificationTypes.length === 0}
                  >
                    {pdVerificationTypesLoading ? (
                      <option value="">Loading verification modes...</option>
                    ) : activePdVerificationTypes.length === 0 ? (
                      <option value="">No active PD verification modes available</option>
                    ) : (
                      activePdVerificationTypes.map((item) => (
                        <option key={item.pdVerificationTypeId} value={item.pdVerificationTypeId}>
                          {item.pdVerificationTypeName}
                        </option>
                      ))
                    )}
                  </select>
                  {pdVerificationTypesError && (
                    <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '6px' }}>
                      {pdVerificationTypesError}
                    </div>
                  )}
                </div>

                {/* Dynamic PD Verification Mode Panel */}
                {selectedPdType && (
                  <div className="bo-cv-pd-result-panel">
                    <div className="bo-cv-pd-result-header">
                      <div className="bo-cv-pd-mode-icon">
                        {PhoneIcon && <PhoneIcon size={24} />}
                      </div>
                      <div>
                        <h3>{selectedPdType.pdVerificationTypeName} selected</h3>
                        <p>
                          Personal discussion verification session for applicant #{verificationData.customerId}.
                        </p>
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
                        <span className="bo-cv-pill-verified">{selectedPdType.pdVerificationTypeName}</span>
                      </div>
                      <div className="bo-cv-pd-detail-item">
                        <small>Verification Status</small>
                        <span className="bo-cv-pill-fetching">Ready for Underwriter Connection</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 14: ELIGIBILITY ASSESSMENT — COMMAND CENTER
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 16 && (
            <div className="bo-cv-elig-deck">
              {/* Hero */}
              <header className="bo-cv-elig-hero">
                <div className="bo-cv-elig-hero-mesh" aria-hidden="true" />
                <div className="bo-cv-elig-hero-copy">
                  <span className="bo-cv-elig-kicker">Step 10 of 11 · Credit Assessment</span>
                  <h2 className="bo-cv-elig-hero-title">Eligibility Engine</h2>
                  <p className="bo-cv-elig-hero-sub">
                    Pick a method and applicant, then open the calculator sheet to run inputs and get a decision amount — fast path for underwriters.
                  </p>
                </div>
                <div className="bo-cv-elig-hero-cta">
                  <button
                    type="button"
                    className="bo-cv-elig-primary-btn"
                    onClick={() => openCalcWorkspace('inputs')}
                  >
                    {CalculatorIcon && <CalculatorIcon size={17} />}
                    <span>Open Calculator</span>
                  </button>
                  <span className="bo-cv-elig-hero-hint">Popup workspace · Esc to close</span>
                </div>
              </header>

              {/* Controls: Method + Applicant */}
              <section className="bo-cv-elig-controls" aria-label="Assessment controls">
                <div className="bo-cv-elig-control-block">
                  <div className="bo-cv-elig-control-label-row">
                    <span className="bo-cv-elig-control-label">Assessment Method</span>
                    {methodsLoading && <span className="bo-cv-elig-soft-pill">Loading…</span>}
                  </div>
                  {methodsError ? (
                    <div className="bo-cv-assess-error-box">
                      <div className="bo-cv-assess-error-msg">
                        {AlertTriangleIcon && <AlertTriangleIcon size={16} />}
                        <span>{methodsError}</span>
                      </div>
                      <button
                        type="button"
                        className="bo-btn bo-btn--outline bo-btn--sm"
                        onClick={fetchCalculationMethods}
                      >
                        {RefreshCwIcon && <RefreshCwIcon size={12} />}
                        <span>Retry</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bo-cv-elig-method-rail" role="tablist" aria-label="Assessment methods">
                      {(assessmentMethods.length > 0
                        ? assessmentMethods
                        : [
                            { methodCode: 'INCOME', methodName: 'Income' },
                            { methodCode: 'ABB', methodName: 'ABB' },
                            { methodCode: 'RTR', methodName: 'RTR' },
                            { methodCode: 'NORMAL_INCOME', methodName: 'Normal Income' },
                          ]
                      ).map((method) => {
                        const code = (method.methodCode || '').toUpperCase();
                        const isSelected = code === selectedMethodCode.toUpperCase();
                        const isIncome = code === 'INCOME';
                        const isRtr = code === 'RTR';
                        const isNormalIncome = code === 'NORMAL_INCOME';
                        const shortName =
                          method.methodName ||
                          (isIncome
                            ? 'Income'
                            : isRtr
                            ? 'RTR'
                            : isNormalIncome
                            ? 'Normal Income'
                            : 'ABB');
                        return (
                          <button
                            key={method.assessmentMethodId || method.methodCode}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            className={`bo-cv-elig-method-chip ${isSelected ? 'is-active' : ''}`}
                            onClick={() => setSelectedMethodCode(code || 'INCOME')}
                            disabled={methodsLoading}
                          >
                            <span className="bo-cv-elig-method-chip-icon">
                              {isIncome
                                ? BadgeIndianRupeeIcon && <BadgeIndianRupeeIcon size={15} />
                                : isRtr
                                ? CreditCardIcon && <CreditCardIcon size={15} />
                                : isNormalIncome
                                ? TrendingUpIcon && <TrendingUpIcon size={15} />
                                : BuildingIcon && <BuildingIcon size={15} />}
                            </span>
                            <span className="bo-cv-elig-method-chip-text">
                              <strong>{shortName}</strong>
                              <small>{code}</small>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bo-cv-elig-control-block">
                  <div className="bo-cv-elig-control-label-row">
                    <span className="bo-cv-elig-control-label">Applicant</span>
                    <span className="bo-cv-elig-soft-pill">{allApplicants.length} profiles</span>
                  </div>
                  <div className="bo-cv-elig-person-rail" role="tablist" aria-label="Applicants">
                    {allApplicants.map((app) => {
                      const isSelected = app.sequence === selectedApplicantSequence;
                      return (
                        <button
                          key={`applicant-tab-${app.sequence}`}
                          type="button"
                          role="tab"
                          aria-selected={isSelected}
                          className={`bo-cv-elig-person-chip ${isSelected ? 'is-active' : ''} ${app.isMain ? 'is-main' : ''}`}
                          onClick={() => setSelectedApplicantSequence(app.sequence)}
                        >
                          <span className="bo-cv-elig-person-avatar">
                            {UserIcon && <UserIcon size={14} />}
                          </span>
                          <span className="bo-cv-elig-person-meta">
                            <strong>{app.name}</strong>
                            <small>{app.isMain ? 'Main Applicant' : app.label}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Snapshot ribbon */}
              <section className="bo-cv-elig-ribbon" aria-label="Application snapshot">
                {!selectedEmploymentIncomeDetailsId && selectedMethodCode !== 'RTR' && (
                  <div className="bo-cv-elig-warn">
                    {AlertCircleIcon && <AlertCircleIcon size={16} />}
                    <span>
                      Employment details missing for {selectedApplicant?.name || 'this applicant'} — income calc may be blocked until RM data is available.
                    </span>
                  </div>
                )}
                <div className="bo-cv-elig-ribbon-grid">
                  <div className="bo-cv-elig-metric">
                    <small>PAN</small>
                    <strong className="bo-cv-elig-mono">{selectedApplicant?.pan || '—'}</strong>
                  </div>
                  <div className="bo-cv-elig-metric">
                    <small>Employment</small>
                    <strong>{selectedEmploymentTypeName || 'Not specified'}</strong>
                  </div>
                  <div className="bo-cv-elig-metric">
                    <small>Employer / Business</small>
                    <strong>{selectedEmployerName || 'Not specified'}</strong>
                  </div>
                  <div className="bo-cv-elig-metric">
                    <small>Product</small>
                    <strong>{appDetails.loanProduct || '—'}</strong>
                  </div>
                  <div className="bo-cv-elig-metric is-accent">
                    <small>Requested</small>
                    <strong>{formatCurrency(appDetails.loanAmount)}</strong>
                  </div>
                  <div className="bo-cv-elig-metric">
                    <small>ROI</small>
                    <strong>{resolvedAppRoi != null ? `${resolvedAppRoi}%` : '—'}</strong>
                  </div>
                  <div className="bo-cv-elig-metric">
                    <small>Tenure</small>
                    <strong>{resolvedAppTenure != null ? `${resolvedAppTenure} mo` : '—'}</strong>
                  </div>
                  <div className="bo-cv-elig-metric">
                    <small>Policy FOIR</small>
                    <strong>{resolvedPolicyFoir || '—'}</strong>
                  </div>
                  <div className="bo-cv-elig-metric">
                    <small>RM Net Income</small>
                    <strong>
                      {formatCurrency(
                        selectedEmploymentRecord?.netMonthlyIncome ??
                          verificationData?.employmentIncome?.netMonthlyIncome ??
                          0
                      )}
                    </strong>
                  </div>
                </div>
              </section>

              {/* Result spotlight / empty launch */}
              {(selectedMethodCode === 'RTR' ? currentRtrAssessment : currentAssessment) ? (
                <section className="bo-cv-elig-spotlight" aria-label="Latest eligibility result">
                  <div className="bo-cv-elig-spotlight-glow" aria-hidden="true" />
                  <div className="bo-cv-elig-spotlight-main">
                    <div className="bo-cv-elig-spotlight-label">
                      <span className="bo-cv-elig-live-dot" />
                      Maximum Eligible Amount
                    </div>
                    <div className="bo-cv-elig-spotlight-amount">
                      {formatCurrency(
                        selectedMethodCode === 'RTR'
                          ? currentRtrAssessment?.finalLoanEligibility
                          : currentAssessment?.maximumEligibleLoanAmount
                      )}
                    </div>
                    <div className="bo-cv-elig-spotlight-meta">
                      <span>
                        {selectedMethodCode === 'RTR'
                          ? 'RTR Method'
                          : selectedMethodCode === 'INCOME'
                          ? 'Income Method'
                          : selectedMethodCode === 'NORMAL_INCOME'
                          ? 'Normal Income'
                          : 'ABB Method'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedApplicant?.name || 'Applicant'}</span>
                      {selectedMethodCode !== 'RTR' && currentAssessment?.actualFOIR != null && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Actual FOIR {Number(currentAssessment.actualFOIR).toFixed(1)}%</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="bo-cv-elig-spotlight-actions">
                    <button
                      type="button"
                      className="bo-cv-elig-secondary-btn"
                      onClick={() => openCalcWorkspace('results')}
                    >
                      {EyeIcon && <EyeIcon size={15} />}
                      <span>Review full breakdown</span>
                    </button>
                    <button
                      type="button"
                      className="bo-cv-elig-ghost-btn"
                      onClick={() => openCalcWorkspace('settings')}
                    >
                      {RefreshCwIcon && <RefreshCwIcon size={14} />}
                      <span>Recalculate</span>
                    </button>
                  </div>
                </section>
              ) : (
                <section className="bo-cv-elig-launch" aria-label="Start calculation">
                  <div className="bo-cv-elig-launch-icon">
                    {ZapIcon ? <ZapIcon size={22} /> : CalculatorIcon && <CalculatorIcon size={22} />}
                  </div>
                  <div className="bo-cv-elig-launch-copy">
                    <h3>No calculation yet for this applicant</h3>
                    <p>
                      Open the calculator sheet to enter{' '}
                      {selectedMethodCode === 'RTR'
                        ? 'RTR loan facilities'
                        : selectedMethodCode === 'ABB'
                        ? 'bank balances'
                        : selectedMethodCode === 'NORMAL_INCOME'
                        ? 'financial year figures'
                        : 'salary & income rows'}
                      , adjust settings, and run eligibility in one place.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="bo-cv-elig-primary-btn"
                    onClick={() => openCalcWorkspace('inputs')}
                  >
                    {ExpandIcon && <ExpandIcon size={16} />}
                    <span>Start in Calculator</span>
                  </button>
                </section>
              )}

                {/* ── Calculation Workspace Popup Sheet ────────────────────── */}
                {calcWorkspaceOpen && (
                  <div
                    className="bo-cv-calc-sheet-backdrop"
                    role="presentation"
                    onClick={(e) => {
                      if (e.target === e.currentTarget) setCalcWorkspaceOpen(false);
                    }}
                  >
                    <div
                      ref={calcSheetRef}
                      className="bo-cv-calc-sheet"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="bo-cv-calc-sheet-title"
                      tabIndex={-1}
                    >
                      <header className="bo-cv-calc-sheet-header">
                        <div className="bo-cv-calc-sheet-top">
                          <div className="bo-cv-calc-sheet-header-left">
                            <div className="bo-cv-calc-sheet-header-icon">
                              {CalculatorIcon && <CalculatorIcon size={18} />}
                            </div>
                            <div className="bo-cv-calc-sheet-heading">
                              <p className="bo-cv-calc-sheet-eyebrow">Calculator workspace</p>
                              <h3 id="bo-cv-calc-sheet-title" className="bo-cv-calc-sheet-title">
                                {selectedMethodCode === 'INCOME'
                                  ? 'Income Method'
                                  : selectedMethodCode === 'RTR'
                                  ? 'RTR Method'
                                  : selectedMethodCode === 'NORMAL_INCOME'
                                  ? 'Normal Income'
                                  : 'ABB Method'}
                              </h3>
                              <div className="bo-cv-calc-sheet-context">
                                <span className="bo-cv-calc-chip">
                                  {UserIcon && <UserIcon size={12} />}
                                  {selectedApplicant?.name || 'Applicant'}
                                </span>
                                <span className="bo-cv-calc-chip">
                                  {selectedApplicant?.isMain ? 'Main' : 'Co-Applicant'}
                                </span>
                                <span className="bo-cv-calc-chip is-amount">
                                  Req {formatCurrency(appDetails.loanAmount)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="bo-cv-calc-sheet-close"
                            aria-label="Close calculation workspace"
                            onClick={() => setCalcWorkspaceOpen(false)}
                          >
                            {XIcon && <XIcon size={18} />}
                          </button>
                        </div>

                        <nav className="bo-cv-calc-tabs" aria-label="Calculator steps">
                          <button
                            type="button"
                            className={`bo-cv-calc-tab ${calcSheetTab === 'inputs' ? 'is-active' : ''}`}
                            onClick={() => setCalcSheetTab('inputs')}
                          >
                            <span className="bo-cv-calc-tab-num">1</span>
                            <span className="bo-cv-calc-tab-copy">
                              <strong>Inputs</strong>
                              <small>
                                {selectedMethodCode === 'RTR'
                                  ? 'Loan facilities'
                                  : selectedMethodCode === 'ABB'
                                  ? 'Bank balances'
                                  : selectedMethodCode === 'NORMAL_INCOME'
                                  ? 'Financial years'
                                  : 'Salary & income'}
                              </small>
                            </span>
                          </button>
                          <span className="bo-cv-calc-tab-connector" aria-hidden="true" />
                          <button
                            type="button"
                            className={`bo-cv-calc-tab ${calcSheetTab === 'settings' ? 'is-active' : ''}`}
                            onClick={() => setCalcSheetTab('settings')}
                          >
                            <span className="bo-cv-calc-tab-num">2</span>
                            <span className="bo-cv-calc-tab-copy">
                              <strong>Settings</strong>
                              <small>ROI · FOIR · Run</small>
                            </span>
                          </button>
                          <span className="bo-cv-calc-tab-connector" aria-hidden="true" />
                          <button
                            type="button"
                            className={`bo-cv-calc-tab ${calcSheetTab === 'results' ? 'is-active' : ''}`}
                            onClick={() => setCalcSheetTab('results')}
                          >
                            <span className="bo-cv-calc-tab-num">3</span>
                            <span className="bo-cv-calc-tab-copy">
                              <strong>Results</strong>
                              <small>Eligibility output</small>
                            </span>
                          </button>
                        </nav>
                      </header>

                      <div className="bo-cv-calc-sheet-body">
{calcSheetTab === 'inputs' && (
                <div className="bo-cv-calc-pane" data-pane="inputs">
                {/* ── Section 4: Method Workspace Container ─────────────────── */}
                <div className="bo-cv-assess-section bo-cv-calc-inputs-section">
                  <div className="bo-cv-calc-pane-intro">
                    <div>
                      <h3 className="bo-cv-calc-pane-title">
                        {selectedMethodCode === 'INCOME'
                          ? 'Salary & Income Inputs'
                          : selectedMethodCode === 'RTR'
                          ? 'Loan Facilities'
                          : selectedMethodCode === 'NORMAL_INCOME'
                          ? 'Financial Year Inputs'
                          : 'Bank Balance Inputs'}
                      </h3>
                      {selectedMethodCode !== 'RTR' && (
                        <p className="bo-cv-calc-pane-sub">
                          {selectedMethodCode === 'INCOME'
                            ? `Enter 3-month salary breakdown for ${selectedApplicant?.name || 'Applicant'}.`
                            : selectedMethodCode === 'NORMAL_INCOME'
                            ? `Enter business financials for ${selectedApplicant?.name || 'Applicant'}.`
                            : `Enter account balances for ${selectedApplicant?.name || 'Applicant'}.`}
                        </p>
                      )}
                    </div>
                    <span className="bo-cv-elig-soft-pill">
                      {selectedMethodCode === 'INCOME'
                        ? 'Income'
                        : selectedMethodCode === 'RTR'
                        ? 'RTR'
                        : selectedMethodCode === 'NORMAL_INCOME'
                        ? 'Normal Income'
                        : 'ABB'}
                    </span>
                  </div>

                  {selectedMethodCode === 'INCOME' ? (
                    <div className="bo-cv-salary-assessment-wrap">
                      {/* Non-blocking Warning Strip for Missing Employment */}
                      {!selectedEmploymentIncomeDetailsId && (
                        <div className="bo-cv-assess-warning-strip">
                          <div className="bo-cv-assess-warning-icon">
                            {AlertCircleIcon && <AlertCircleIcon size={18} />}
                          </div>
                          <div className="bo-cv-assess-warning-text">
                            <strong>Employment Details Required:</strong> Employment details are not available for {selectedApplicant?.name || 'this applicant'}. Salary income assessment cannot be saved until employment details are available.
                          </div>
                        </div>
                      )}

                      {/* Loading State */}
                      {salaryLoading ? (
                        <div className="bo-cv-assess-loading-box">
                          <div className="bo-cv-loading-spinner" />
                          <span>Loading applicant salary records...</span>
                        </div>
                      ) : salaryError ? (
                        <div className="bo-cv-assess-error-box">
                          <div className="bo-cv-assess-error-msg">
                            {AlertTriangleIcon && <AlertTriangleIcon size={16} />}
                            <span>{salaryError}</span>
                          </div>
                          <button
                            type="button"
                            className="bo-btn bo-btn--outline bo-btn--sm"
                            onClick={() => fetchSalaryRecords(calculationAppProdId, selectedApplicantSequence)}
                          >
                            {RefreshCwIcon && <RefreshCwIcon size={12} />}
                            <span>Retry</span>
                          </button>
                        </div>
                      ) : null}

                      {/* Notification / Save Feedback Banner */}
                      {salarySaveBanner && (
                        <div className={`bo-cv-salary-banner is-${salarySaveBanner.type}`}>
                          <div className="bo-cv-salary-banner-icon">
                            {salarySaveBanner.type === 'success' && (CheckCircleIcon ? <CheckCircleIcon size={16} /> : '✓')}
                            {salarySaveBanner.type === 'error' && (AlertTriangleIcon ? <AlertTriangleIcon size={16} /> : '⚠️')}
                            {salarySaveBanner.type === 'warning' && (AlertCircleIcon ? <AlertCircleIcon size={16} /> : 'ℹ️')}
                            {salarySaveBanner.type === 'info' && (InfoIcon ? <InfoIcon size={16} /> : 'ℹ️')}
                          </div>
                          <div className="bo-cv-salary-banner-msg">{salarySaveBanner.message}</div>
                        </div>
                      )}

                      {/* Top Bar with Add Month Action */}
                      <div className="bo-cv-salary-top-bar">
                        <div className="bo-cv-salary-top-left">
                          <h4 className="bo-cv-salary-top-title">Monthly Salary Breakdown</h4>
                          <span className="bo-cv-salary-count-badge">
                            {salaryRows.length} {salaryRows.length === 1 ? 'Month' : 'Months'} Configured
                          </span>
                        </div>
                        <button
                          type="button"
                          className="bo-btn bo-btn--outline bo-btn--sm bo-cv-salary-add-btn"
                          onClick={handleAddSalaryMonth}
                          disabled={salarySaving}
                        >
                          {PlusIcon ? <PlusIcon size={13} /> : '+'}
                          <span>Add Month</span>
                        </button>
                      </div>

                      {/* Manual Salary Breakdown Table */}
                      <div className="bo-cv-salary-table-wrapper">
                        <table className="bo-cv-salary-table" aria-label="Manual Salary Income Breakdown">
                          <thead>
                            <tr>
                              <th className="th-month">Month</th>
                              <th className="th-num">Basic (₹)</th>
                              <th className="th-num">HRA (₹)</th>
                              <th className="th-num">CCA (₹)</th>
                              <th className="th-num">TA (₹)</th>
                              <th className="th-num">Incentive (₹)</th>
                              <th className="th-num">Incentive Applied (%)</th>
                              <th className="th-num">Deductions (₹)</th>
                              <th className="th-num th-readonly">Considered Incentive (₹)</th>
                              <th className="th-num th-readonly">Considered Income (₹)</th>
                              {salaryRows.length > 3 && <th className="th-action">Action</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {salaryRows.map((row, idx) => {
                              const isPersisted = row.isPersisted;
                              return (
                                <tr key={row.id || `salary-row-${idx}`} className={isPersisted ? 'is-persisted-row' : 'is-draft-row'}>
                                  <td className="td-month">
                                    {isPersisted ? (
                                      <span className="bo-cv-salary-month-badge">
                                        {formatSalaryMonthDisplay(row.monthDisplay) || row.salaryMonth}
                                      </span>
                                    ) : (
                                      <input
                                        type="month"
                                        className="bo-cv-salary-input is-month"
                                        value={row.monthDisplay || ''}
                                        onChange={(e) => handleSalaryRowChange(idx, 'monthDisplay', e.target.value)}
                                        disabled={salarySaving}
                                        aria-label={`Salary Month for Row ${idx + 1}`}
                                      />
                                    )}
                                  </td>
                                  <td className="td-num">
                                    <input
                                      type="number"
                                      min="0"
                                      step="100"
                                      placeholder="0"
                                      className="bo-cv-salary-input"
                                      value={row.basicAmount === 0 ? '0' : row.basicAmount || ''}
                                      onChange={(e) => handleSalaryRowChange(idx, 'basicAmount', e.target.value)}
                                      disabled={salarySaving}
                                      aria-label={`Basic Salary for Row ${idx + 1}`}
                                    />
                                  </td>
                                  <td className="td-num">
                                    <input
                                      type="number"
                                      min="0"
                                      step="100"
                                      placeholder="0"
                                      className="bo-cv-salary-input"
                                      value={row.hraAmount === 0 ? '0' : row.hraAmount || ''}
                                      onChange={(e) => handleSalaryRowChange(idx, 'hraAmount', e.target.value)}
                                      disabled={salarySaving}
                                      aria-label={`HRA for Row ${idx + 1}`}
                                    />
                                  </td>
                                  <td className="td-num">
                                    <input
                                      type="number"
                                      min="0"
                                      step="100"
                                      placeholder="0"
                                      className="bo-cv-salary-input"
                                      value={row.ccaAmount === 0 ? '0' : row.ccaAmount || ''}
                                      onChange={(e) => handleSalaryRowChange(idx, 'ccaAmount', e.target.value)}
                                      disabled={salarySaving}
                                      aria-label={`CCA for Row ${idx + 1}`}
                                    />
                                  </td>
                                  <td className="td-num">
                                    <input
                                      type="number"
                                      min="0"
                                      step="100"
                                      placeholder="0"
                                      className="bo-cv-salary-input"
                                      value={row.taAmount === 0 ? '0' : row.taAmount || ''}
                                      onChange={(e) => handleSalaryRowChange(idx, 'taAmount', e.target.value)}
                                      disabled={salarySaving}
                                      aria-label={`TA for Row ${idx + 1}`}
                                    />
                                  </td>
                                  <td className="td-num">
                                    <input
                                      type="number"
                                      min="0"
                                      step="100"
                                      placeholder="0"
                                      className="bo-cv-salary-input"
                                      value={row.incentiveAmount === 0 ? '0' : row.incentiveAmount || ''}
                                      onChange={(e) => handleSalaryRowChange(idx, 'incentiveAmount', e.target.value)}
                                      disabled={salarySaving}
                                      aria-label={`Incentive for Row ${idx + 1}`}
                                    />
                                  </td>
                                  <td className="td-num">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      placeholder="50"
                                      className="bo-cv-salary-input is-percent"
                                      value={row.incentivePercentApplied === 0 ? '0' : row.incentivePercentApplied || ''}
                                      onChange={(e) => handleSalaryRowChange(idx, 'incentivePercentApplied', e.target.value)}
                                      disabled={salarySaving}
                                      aria-label={`Incentive Percent Applied for Row ${idx + 1}`}
                                    />
                                  </td>
                                  <td className="td-num">
                                    <input
                                      type="number"
                                      min="0"
                                      step="100"
                                      placeholder="0"
                                      className="bo-cv-salary-input"
                                      value={row.deductionAmount === 0 ? '0' : row.deductionAmount || ''}
                                      onChange={(e) => handleSalaryRowChange(idx, 'deductionAmount', e.target.value)}
                                      disabled={salarySaving}
                                      aria-label={`Deductions for Row ${idx + 1}`}
                                    />
                                  </td>
                                  <td className="td-num td-readonly">
                                    <span className="bo-cv-salary-calc-val">
                                      {row.previewConsideredIncentive != null
                                        ? formatCurrency(row.previewConsideredIncentive)
                                        : row.consideredIncentiveAmount != null
                                        ? formatCurrency(row.consideredIncentiveAmount)
                                        : '—'}
                                    </span>
                                  </td>
                                  <td className="td-num td-readonly">
                                    <span className="bo-cv-salary-calc-val is-total">
                                      {row.previewConsideredIncome != null
                                        ? formatCurrency(row.previewConsideredIncome)
                                        : row.totalConsideredIncome != null
                                        ? formatCurrency(row.totalConsideredIncome)
                                        : '—'}
                                    </span>
                                  </td>
                                  {salaryRows.length > 3 && (
                                    <td className="td-action">
                                      {!isPersisted ? (
                                        <button
                                          type="button"
                                          className="bo-cv-salary-remove-btn"
                                          onClick={() => handleRemoveSalaryMonth(idx)}
                                          title="Remove this draft month"
                                          aria-label={`Remove Row ${idx + 1}`}
                                        >
                                          {XIcon ? <XIcon size={14} /> : '✕'}
                                        </button>
                                      ) : (
                                        <span className="bo-cv-salary-locked-tag" title="Persisted server record">Saved</span>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Other Income Assessment Top Bar & Table */}
                      <div className="bo-cv-salary-top-bar" style={{ marginTop: '20px' }}>
                        <div className="bo-cv-salary-top-left">
                          <h4 className="bo-cv-salary-top-title">Other Income Assessment</h4>
                          <span className="bo-cv-salary-count-badge">
                            {otherIncomeRows.length} {otherIncomeRows.length === 1 ? 'Source' : 'Sources'} Configured
                          </span>
                          {liveTotalOtherIncome > 0 && (
                            <span className="bo-cv-salary-count-badge" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>
                              Total Other Income: {formatCurrency(liveTotalOtherIncome)}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="bo-btn bo-btn--outline bo-btn--sm bo-cv-salary-add-btn"
                          onClick={handleAddOtherIncomeRow}
                          disabled={otherIncomeSaving}
                        >
                          {PlusIcon ? <PlusIcon size={13} /> : '+'}
                          <span>Add Other Income</span>
                        </button>
                      </div>

                      {otherIncomeLoading ? (
                        <div className="bo-cv-assess-loading-box">
                          <div className="bo-cv-loading-spinner" />
                          <span>Loading applicant other income records...</span>
                        </div>
                      ) : otherIncomeError ? (
                        <div className="bo-cv-assess-error-box">
                          <div className="bo-cv-assess-error-msg">
                            {AlertTriangleIcon && <AlertTriangleIcon size={16} />}
                            <span>{otherIncomeError}</span>
                          </div>
                        </div>
                      ) : otherIncomeRows.length === 0 ? (
                        <div style={{ padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', marginBottom: '14px' }}>
                          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                            No additional income sources configured for {selectedApplicant?.name || 'this applicant'}. If the applicant has rental, agricultural, business profit, or other income streams, click <strong>"Add Other Income"</strong>.
                          </p>
                        </div>
                      ) : (
                        <div className="bo-cv-salary-table-wrapper" style={{ marginBottom: '14px' }}>
                          <table className="bo-cv-salary-table" aria-label="Other Income Breakdown">
                            <thead>
                              <tr>
                                <th style={{ minWidth: '220px' }}>Income Name</th>
                                <th className="th-num" style={{ minWidth: '160px' }}>Income Amount (₹)</th>
                                <th className="th-action" style={{ width: '60px' }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {otherIncomeRows.map((row, idx) => (
                                <tr key={row.id || `other-inc-${idx}`} className={row.isPersisted ? 'is-persisted-row' : 'is-draft-row'}>
                                  <td>
                                    <input
                                      type="text"
                                      placeholder="e.g. Rent, Business, Agriculture"
                                      className="bo-cv-salary-input"
                                      value={row.incomeName || ''}
                                      onChange={(e) => handleOtherIncomeRowChange(idx, 'incomeName', e.target.value)}
                                      disabled={otherIncomeSaving}
                                      style={{ textAlign: 'left' }}
                                      aria-label={`Income Name for Row ${idx + 1}`}
                                    />
                                  </td>
                                  <td className="td-num">
                                    <input
                                      type="number"
                                      min="0"
                                      step="500"
                                      placeholder="0"
                                      className="bo-cv-salary-input"
                                      value={row.incomeAmount === 0 ? '0' : row.incomeAmount || ''}
                                      onChange={(e) => handleOtherIncomeRowChange(idx, 'incomeAmount', e.target.value)}
                                      disabled={otherIncomeSaving}
                                      aria-label={`Income Amount for Row ${idx + 1}`}
                                    />
                                  </td>
                                  <td className="td-action">
                                    <button
                                      type="button"
                                      className="bo-cv-salary-remove-btn"
                                      onClick={() => handleRemoveOtherIncomeRow(idx)}
                                      title="Remove this other income stream"
                                      aria-label={`Remove Other Income Row ${idx + 1}`}
                                    >
                                      {XIcon ? <XIcon size={14} /> : '✕'}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Underwriting Guidance Note */}
                      <div className="bo-cv-salary-info-strip">
                        <div className="bo-cv-salary-info-icon">
                          {InfoIcon && <InfoIcon size={16} />}
                        </div>
                        <div className="bo-cv-salary-info-text">
                          <strong>Manual Income Assessment Workspace:</strong> Enter/edit monthly salary breakdown and additional income sources. Live previews calculate dynamically with zero network requests. All values will be synchronized with the server upon running eligibility calculation.
                        </div>
                      </div>

                      {/* Dynamic Income Summary Strip */}
                      <div className="bo-cv-salary-summary-strip">
                        <div className="bo-cv-salary-summary-strip-header">
                          <div className="bo-cv-salary-summary-strip-title-wrap">
                            <span className="bo-cv-salary-summary-strip-title">
                              Income Assessment Summary ({salaryRows.length} Months)
                            </span>
                            <span className="bo-cv-salary-summary-strip-sub">
                              {selectedApplicant?.name || 'Applicant'} &bull; Salaried &amp; Other Income Evaluation
                            </span>
                          </div>
                          <span className="bo-cv-salary-summary-strip-meta">
                            Salary Months: {salaryRows.filter((r) => r.salaryMonth && r.basicAmount !== '' && !isNaN(Number(r.basicAmount))).length} / {salaryRows.length}
                            {otherIncomeRows.length > 0 && ` • Other Sources: ${otherIncomeRows.length}`}
                          </span>
                        </div>
                        <div className="bo-cv-salary-summary-strip-grid">
                          {salaryRows.map((r, idx) => {
                            const isPersisted = r.isPersisted && !r.isModified;
                            const val = r.previewConsideredIncome != null && r.previewConsideredIncome !== ''
                              ? r.previewConsideredIncome
                              : r.totalConsideredIncome;
                            const monthLabel = formatSalaryMonthDisplay(r.monthDisplay) || `Month ${idx + 1}`;
                            return (
                              <div key={`summary-month-${idx}`} className={`bo-cv-summary-strip-cell ${isPersisted ? 'is-persisted' : 'is-draft'}`}>
                                <div className="bo-cv-summary-strip-top">
                                  <span className="bo-cv-summary-strip-label">{monthLabel}</span>
                                  <span className={`bo-cv-summary-strip-pill ${isPersisted ? 'is-persisted' : 'is-preview'}`}>
                                    {isPersisted ? 'Considered' : 'Live Preview'}
                                  </span>
                                </div>
                                <strong className="bo-cv-summary-strip-val">
                                  {val != null && val !== '' ? formatCurrency(val) : '—'}
                                </strong>
                                <span className="bo-cv-summary-strip-sub">Considered Income</span>
                              </div>
                            );
                          })}

                          {/* Multi-Month Average Salary */}
                          <div className="bo-cv-summary-strip-cell is-average">
                            <div className="bo-cv-summary-strip-top">
                              <span className="bo-cv-summary-strip-label">Average Salary Income</span>
                              <span className={`bo-cv-summary-strip-pill ${!isSalaryDirty ? 'is-backend' : 'is-preview'}`}>
                                {!isSalaryDirty ? 'Confirmed' : 'Live Preview'}
                              </span>
                            </div>
                            <strong className="bo-cv-summary-strip-val is-avg">
                              {liveSalaryAverage != null ? formatFoirCurrency(liveSalaryAverage) : '—'}
                            </strong>
                            <span className="bo-cv-summary-strip-sub">
                              Average across {salaryRows.length} configured months
                            </span>
                          </div>

                          {/* Total Other Income Cell (if present) */}
                          {liveTotalOtherIncome > 0 && (
                            <div className="bo-cv-summary-strip-cell">
                              <div className="bo-cv-summary-strip-top">
                                <span className="bo-cv-summary-strip-label">Total Other Income</span>
                                <span className="bo-cv-summary-strip-pill is-preview">
                                  {otherIncomeRows.length} {otherIncomeRows.length === 1 ? 'Source' : 'Sources'}
                                </span>
                              </div>
                              <strong className="bo-cv-summary-strip-val" style={{ color: '#0369a1' }}>
                                {formatFoirCurrency(liveTotalOtherIncome)}
                              </strong>
                              <span className="bo-cv-summary-strip-sub">
                                Total additional income
                              </span>
                            </div>
                          )}

                          {/* Final Combined Considered Income Cell */}
                          <div className="bo-cv-summary-strip-cell is-average" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                            <div className="bo-cv-summary-strip-top">
                              <span className="bo-cv-summary-strip-label" style={{ color: '#065f46', fontWeight: 600 }}>Final Considered Income</span>
                              <span className="bo-cv-summary-strip-pill" style={{ background: '#d1fae5', color: '#047857' }}>
                                Total Considered
                              </span>
                            </div>
                            <strong className="bo-cv-summary-strip-val is-avg" style={{ color: '#047857' }}>
                              {liveFinalConsideredIncome != null ? formatFoirCurrency(liveFinalConsideredIncome) : '—'}
                            </strong>
                            <span className="bo-cv-summary-strip-sub" style={{ color: '#065f46' }}>
                              {liveTotalOtherIncome > 0
                                ? `${formatCurrency(liveSalaryAverage)} (Salary) + ${formatCurrency(liveTotalOtherIncome)} (Other)`
                                : 'Salary income baseline for FOIR capacity'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : selectedMethodCode === 'RTR' ? (
                    /* Repayment Track Record (RTR) Method Workspace */
                    <div className="bo-cv-rtr-assessment-wrap bo-cv-rtr-cards-mode">
                      {rtrLoansLoading ? (
                        <div className="bo-cv-assess-loading-box">
                          <div className="bo-cv-loading-spinner" />
                          <span>Loading RTR loan facilities...</span>
                        </div>
                      ) : rtrLoansError ? (
                        <div className="bo-cv-assess-error-box">
                          <div className="bo-cv-assess-error-msg">
                            {AlertTriangleIcon && <AlertTriangleIcon size={16} />}
                            <span>{rtrLoansError}</span>
                          </div>
                          <button
                            type="button"
                            className="bo-btn bo-btn--outline bo-btn--sm"
                            onClick={() => fetchRTRLoans(calculationAppProdId, selectedApplicantSequence)}
                          >
                            {RefreshCwIcon && <RefreshCwIcon size={12} />}
                            <span>Retry</span>
                          </button>
                        </div>
                      ) : null}

                      {rtrLoansBanner && (
                        <div className={`bo-cv-salary-banner is-${rtrLoansBanner.type}`}>
                          <div className="bo-cv-salary-banner-icon">
                            {rtrLoansBanner.type === 'success' && (CheckCircleIcon ? <CheckCircleIcon size={16} /> : '✓')}
                            {rtrLoansBanner.type === 'error' && (AlertTriangleIcon ? <AlertTriangleIcon size={16} /> : '⚠️')}
                            {rtrLoansBanner.type === 'warning' && (AlertCircleIcon ? <AlertCircleIcon size={16} /> : 'ℹ️')}
                            {rtrLoansBanner.type === 'info' && (InfoIcon ? <InfoIcon size={16} /> : 'ℹ️')}
                          </div>
                          <div className="bo-cv-salary-banner-msg">{rtrLoansBanner.message}</div>
                        </div>
                      )}

                      {/* Compact live summary */}
                      <div className="bo-cv-rtr-live-bar">
                        <div className="bo-cv-rtr-live-stat">
                          <small>Facilities</small>
                          <strong>{rtrSummaryMetrics.validCount}/{rtrDraftLoans.length || 0}</strong>
                        </div>
                        <div className="bo-cv-rtr-live-stat">
                          <small>Sanction</small>
                          <strong>{formatCurrency(rtrSummaryMetrics.totalSanction)}</strong>
                        </div>
                        <div className="bo-cv-rtr-live-stat">
                          <small>POS</small>
                          <strong>{formatCurrency(rtrSummaryMetrics.totalPOS)}</strong>
                        </div>
                        <div className="bo-cv-rtr-live-stat">
                          <small>Monthly EMI</small>
                          <strong>{formatCurrency(rtrSummaryMetrics.totalEmi)}</strong>
                        </div>
                        <div className="bo-cv-rtr-live-stat">
                          <small>Max MOB</small>
                          <strong>{rtrSummaryMetrics.maxMob > 0 ? `${rtrSummaryMetrics.maxMob} mo` : '—'}</strong>
                        </div>
                        <button
                          type="button"
                          className="bo-cv-rtr-add-btn"
                          onClick={handleAddRtrLoanRow}
                          disabled={rtrLoansSaving}
                        >
                          {PlusIcon ? <PlusIcon size={14} /> : '+'}
                          <span>Add facility</span>
                        </button>
                      </div>

                      {rtrDraftLoans.length === 0 ? (
                        <div className="bo-cv-rtr-empty">
                          <div className="bo-cv-rtr-empty-icon">
                            {CreditCardIcon && <CreditCardIcon size={22} />}
                          </div>
                          <h4>No loan facilities yet</h4>
                          <p>Add an active loan facility to begin RTR assessment.</p>
                          <button
                            type="button"
                            className="bo-cv-elig-primary-btn bo-cv-rtr-empty-cta"
                            onClick={handleAddRtrLoanRow}
                            disabled={rtrLoansSaving}
                          >
                            {PlusIcon ? <PlusIcon size={15} /> : '+'}
                            <span>Add first facility</span>
                          </button>
                        </div>
                      ) : (
                        <div className="bo-cv-rtr-card-list">
                          {rtrDraftLoans.map((row, idx) => {
                            const loanPk = Number(row.applicationRTRLoanDetailsId);
                            const isDraft =
                              !row.isPersisted ||
                              !row.applicationRTRLoanDetailsId ||
                              Number(row.applicationRTRLoanDetailsId) === 0;
                            const targetSelectedId =
                              currentRtrAssessment?.selectedRTRLoanDetailsId != null
                                ? Number(currentRtrAssessment.selectedRTRLoanDetailsId)
                                : null;
                            const isSelected =
                              targetSelectedId != null && loanPk > 0
                                ? loanPk === targetSelectedId
                                : Boolean(row.isSelectedForRTR);
                            return (
                              <article
                                key={row.id || `rtr-loan-row-${idx}`}
                                className={`bo-cv-rtr-facility-card bo-cv-rtr-facility-card--compact ${isSelected ? 'is-selected' : ''} ${isDraft ? 'is-draft' : ''}`}
                              >
                                <div className="bo-cv-rtr-strip-top">
                                  <span className="bo-cv-rtr-facility-index">{idx + 1}</span>
                                  <label className="bo-cv-rtr-field bo-cv-rtr-field--lender" htmlFor={`rtr-lender-${idx}`}>
                                    <span>Lender / Bank</span>
                                    <input
                                      id={`rtr-lender-${idx}`}
                                      type="text"
                                      placeholder="e.g. HDFC Bank"
                                      className="bo-cv-rtr-field-input is-lender"
                                      value={row.lenderName || ''}
                                      onChange={(e) => handleRtrLoanRowChange(idx, 'lenderName', e.target.value)}
                                      disabled={rtrLoansSaving}
                                    />
                                  </label>
                                  <div className="bo-cv-rtr-facility-badges">
                                    {isSelected && <span className="bo-cv-rtr-badge is-selected">Selected</span>}
                                    {isDraft && <span className="bo-cv-rtr-badge is-draft">Draft</span>}
                                    {isDraft && (
                                      <button
                                        type="button"
                                        className="bo-cv-rtr-remove-btn"
                                        title="Remove draft facility"
                                        aria-label={`Remove draft loan facility ${idx + 1}`}
                                        onClick={() => handleRemoveRtrDraftRow(idx)}
                                        disabled={rtrLoansSaving}
                                      >
                                        {XIcon ? <XIcon size={14} /> : '✕'}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="bo-cv-rtr-facility-grid bo-cv-rtr-facility-grid--compact">
                                  <label className="bo-cv-rtr-field">
                                    <span>Sanction (₹)</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1000"
                                      placeholder="0"
                                      className="bo-cv-rtr-field-input"
                                      value={row.sanctionAmount === 0 ? '0' : row.sanctionAmount || ''}
                                      onChange={(e) => handleRtrLoanRowChange(idx, 'sanctionAmount', e.target.value)}
                                      disabled={rtrLoansSaving}
                                    />
                                  </label>
                                  <label className="bo-cv-rtr-field">
                                    <span>POS (₹)</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1000"
                                      placeholder="0"
                                      className="bo-cv-rtr-field-input"
                                      value={row.currentPOS === 0 ? '0' : row.currentPOS || ''}
                                      onChange={(e) => handleRtrLoanRowChange(idx, 'currentPOS', e.target.value)}
                                      disabled={rtrLoansSaving}
                                    />
                                  </label>
                                  <label className="bo-cv-rtr-field">
                                    <span>EMI (₹)</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="500"
                                      placeholder="0"
                                      className="bo-cv-rtr-field-input"
                                      value={row.emiAmount === 0 ? '0' : row.emiAmount || ''}
                                      onChange={(e) => handleRtrLoanRowChange(idx, 'emiAmount', e.target.value)}
                                      disabled={rtrLoansSaving}
                                    />
                                  </label>
                                  <label className="bo-cv-rtr-field">
                                    <span>EMI Start</span>
                                    <input
                                      type="date"
                                      className="bo-cv-rtr-field-input"
                                      value={row.emiStartDate || ''}
                                      onChange={(e) => handleRtrLoanRowChange(idx, 'emiStartDate', e.target.value)}
                                      disabled={rtrLoansSaving}
                                    />
                                  </label>
                                  <label className="bo-cv-rtr-field is-compact">
                                    <span>MOB</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      placeholder="0"
                                      className="bo-cv-rtr-field-input"
                                      value={row.mob === 0 ? '0' : row.mob || ''}
                                      onChange={(e) => handleRtrLoanRowChange(idx, 'mob', e.target.value)}
                                      disabled={rtrLoansSaving}
                                    />
                                  </label>
                                  <label className="bo-cv-rtr-field is-compact">
                                    <span>OD</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      placeholder="0"
                                      className="bo-cv-rtr-field-input"
                                      value={row.odCount === 0 ? '0' : row.odCount ?? 0}
                                      onChange={(e) => handleRtrLoanRowChange(idx, 'odCount', e.target.value)}
                                      disabled={rtrLoansSaving}
                                    />
                                  </label>
                                  <label className="bo-cv-rtr-field is-compact">
                                    <span>Bounce</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      placeholder="0"
                                      className="bo-cv-rtr-field-input"
                                      value={row.bounceCount === 0 ? '0' : row.bounceCount ?? 0}
                                      onChange={(e) => handleRtrLoanRowChange(idx, 'bounceCount', e.target.value)}
                                      disabled={rtrLoansSaving}
                                    />
                                  </label>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}

                      <p className="bo-cv-rtr-footnote">
                        Saved automatically when you Calculate on Settings.
                      </p>
                    </div>
                  ) : selectedMethodCode === 'NORMAL_INCOME' ? (
                    /* Normal Income Method Workspace */
                    <div className="bo-cv-normal-income-wrap">
                      {/* Loading State */}
                      {normalIncomeLoading ? (
                        <div className="bo-cv-assess-loading-box">
                          <div className="bo-cv-loading-spinner" />
                          <span>Loading Normal Income records...</span>
                        </div>
                      ) : normalIncomeError ? (
                        <div className="bo-cv-assess-error-box">
                          <div className="bo-cv-assess-error-msg">
                            {AlertTriangleIcon && <AlertTriangleIcon size={16} />}
                            <span>{normalIncomeError}</span>
                          </div>
                          <button
                            type="button"
                            className="bo-btn bo-btn--outline bo-btn--sm"
                            onClick={() => fetchNormalIncomeRecords(calculationAppProdId, selectedApplicantSequence)}
                          >
                            {RefreshCwIcon && <RefreshCwIcon size={12} />}
                            <span>Retry</span>
                          </button>
                        </div>
                      ) : null}

                      {/* Notification Banner */}
                      {normalIncomeBanner && (
                        <div className={`bo-cv-salary-banner is-${normalIncomeBanner.type}`}>
                          <div className="bo-cv-salary-banner-icon">
                            {normalIncomeBanner.type === 'success' && (CheckCircleIcon ? <CheckCircleIcon size={16} /> : '✓')}
                            {normalIncomeBanner.type === 'error' && (AlertTriangleIcon ? <AlertTriangleIcon size={16} /> : '⚠️')}
                            {normalIncomeBanner.type === 'warning' && (AlertCircleIcon ? <AlertCircleIcon size={16} /> : 'ℹ️')}
                            {normalIncomeBanner.type === 'info' && (InfoIcon ? <InfoIcon size={16} /> : 'ℹ️')}
                          </div>
                          <div className="bo-cv-salary-banner-msg">{normalIncomeBanner.message}</div>
                        </div>
                      )}

                      {/* ── Sub-Section 1: Primary Business Income ── */}
                      <div className="bo-cv-normal-block">
                        <div className="bo-cv-salary-top-bar">
                          <div className="bo-cv-salary-top-left">
                            <h4 className="bo-cv-salary-top-title">Primary Business Income</h4>
                            <span className="bo-cv-salary-count-badge">
                              {normalIncomeRows.length} {normalIncomeRows.length === 1 ? 'Year' : 'Years'} Configured
                            </span>
                            {normalIncomeMetrics.latestRow ? (
                              <span className="bo-cv-salary-count-badge" style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}>
                                Latest Year: {normalIncomeMetrics.latestRow.financialYear || 'Selected'} ({formatCurrency(normalIncomeMetrics.latestPrimaryBusinessIncome)})
                              </span>
                            ) : (
                              <span className="bo-cv-salary-count-badge" style={{ background: '#fffbeb', color: '#b45309', borderColor: '#fde68a' }}>
                                No Latest Year Designated
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="bo-btn bo-btn--outline bo-btn--sm bo-cv-salary-add-btn"
                            onClick={handleAddNormalIncomeRow}
                            disabled={normalIncomeSaving}
                          >
                            {PlusIcon ? <PlusIcon size={13} /> : '+'}
                            <span>Add Financial Year</span>
                          </button>
                        </div>

                        <div className="bo-cv-salary-table-wrapper">
                          <table className="bo-cv-salary-table" aria-label="Primary Business Income Table">
                            <thead>
                              <tr>
                                <th style={{ minWidth: '130px' }}>Financial Year</th>
                                <th style={{ minWidth: '120px', textAlign: 'center' }}>Considered Year</th>
                                <th className="th-num" style={{ minWidth: '130px' }}>PAT (₹)</th>
                                <th className="th-num" style={{ minWidth: '130px' }}>Depreciation (₹)</th>
                                <th className="th-num" style={{ minWidth: '140px' }}>Salary to Partners (₹)</th>
                                <th className="th-num" style={{ minWidth: '140px' }}>Related Party Interest (₹)</th>
                                <th className="th-num" style={{ minWidth: '150px' }}>Primary Business Income (₹)</th>
                                <th className="th-action" style={{ minWidth: '60px', textAlign: 'center' }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {normalIncomeRows.length === 0 ? (
                                <tr>
                                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                                    No financial years configured. Click &quot;Add Financial Year&quot; above to enter year-wise business figures.
                                  </td>
                                </tr>
                              ) : (
                                normalIncomeRows.map((row, idx) => {
                                  const isDraft = !row.isPersisted || !row.applicationNormalIncomeDetailsId;
                                  const isLatest = Boolean(row.isLatestFinancialYear);
                                  const computedIncome =
                                    (Number(row.pat) || 0) +
                                    (Number(row.depreciation) || 0) +
                                    (Number(row.salaryToPartners) || 0) +
                                    (Number(row.interestToRelatedParties) || 0);

                                  return (
                                    <tr
                                      key={row.id || `normal-inc-row-${idx}`}
                                      className={isLatest ? 'is-rtr-selected-row' : ''}
                                    >
                                      <td>
                                        <input
                                          type="text"
                                          placeholder="e.g. 2025-26"
                                          className="bo-cv-salary-input"
                                          value={row.financialYear || ''}
                                          onChange={(e) => handleNormalIncomeRowChange(idx, 'financialYear', e.target.value)}
                                          disabled={normalIncomeSaving}
                                          style={{ textAlign: 'left', fontWeight: 600 }}
                                          aria-label={`Financial Year for Row ${idx + 1}`}
                                        />
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
                                        <button
                                          type="button"
                                          className={`bo-cv-latest-year-btn ${isLatest ? 'is-active' : ''}`}
                                          onClick={() => handleSetLatestFinancialYear(idx)}
                                          disabled={normalIncomeSaving}
                                          title={isLatest ? 'Currently designated latest considered financial year' : 'Click to set as latest financial year'}
                                        >
                                          {isLatest ? 'Latest Year ✓' : 'Set Latest'}
                                        </button>
                                      </td>
                                      <td className="td-num">
                                        <input
                                          type="number"
                                          step="1000"
                                          placeholder="0"
                                          className="bo-cv-salary-input"
                                          value={row.pat === 0 ? '0' : row.pat || ''}
                                          onChange={(e) => handleNormalIncomeRowChange(idx, 'pat', e.target.value)}
                                          disabled={normalIncomeSaving}
                                          aria-label={`Profit After Tax for Row ${idx + 1}`}
                                        />
                                      </td>
                                      <td className="td-num">
                                        <input
                                          type="number"
                                          min="0"
                                          step="1000"
                                          placeholder="0"
                                          className="bo-cv-salary-input"
                                          value={row.depreciation === 0 ? '0' : row.depreciation || ''}
                                          onChange={(e) => handleNormalIncomeRowChange(idx, 'depreciation', e.target.value)}
                                          disabled={normalIncomeSaving}
                                          aria-label={`Depreciation for Row ${idx + 1}`}
                                        />
                                      </td>
                                      <td className="td-num">
                                        <input
                                          type="number"
                                          min="0"
                                          step="1000"
                                          placeholder="0"
                                          className="bo-cv-salary-input"
                                          value={row.salaryToPartners === 0 ? '0' : row.salaryToPartners || ''}
                                          onChange={(e) => handleNormalIncomeRowChange(idx, 'salaryToPartners', e.target.value)}
                                          disabled={normalIncomeSaving}
                                          aria-label={`Salary to Partners for Row ${idx + 1}`}
                                        />
                                      </td>
                                      <td className="td-num">
                                        <input
                                          type="number"
                                          min="0"
                                          step="1000"
                                          placeholder="0"
                                          className="bo-cv-salary-input"
                                          value={row.interestToRelatedParties === 0 ? '0' : row.interestToRelatedParties || ''}
                                          onChange={(e) => handleNormalIncomeRowChange(idx, 'interestToRelatedParties', e.target.value)}
                                          disabled={normalIncomeSaving}
                                          aria-label={`Interest to Related Parties for Row ${idx + 1}`}
                                        />
                                      </td>
                                      <td className="td-num">
                                        <div className="bo-cv-salary-readonly-val" style={{ fontWeight: 700, color: isLatest ? '#047857' : '#334155' }}>
                                          {formatCurrency(row.primaryIncome != null && !row.isModified ? row.primaryIncome : computedIncome)}
                                        </div>
                                      </td>
                                      <td className="td-action" style={{ textAlign: 'center' }}>
                                        {isDraft ? (
                                          <button
                                            type="button"
                                            className="bo-cv-loan-row-remove-btn"
                                            title="Remove unsaved draft financial year"
                                            aria-label={`Remove draft financial year ${idx + 1}`}
                                            onClick={() => handleRemoveNormalIncomeDraftRow(idx)}
                                            disabled={normalIncomeSaving}
                                          >
                                            {XIcon ? <XIcon size={13} /> : '✕'}
                                          </button>
                                        ) : (
                                          <span className="bo-cv-salary-readonly-val" style={{ color: '#94a3b8' }}>
                                            —
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div className="bo-cv-salary-action-bar">
                          <div className="bo-cv-salary-action-hint">
                            <span className="bo-cv-salary-hint-dot" />
                            <span>
                              <strong>Formula:</strong> Primary Business Income = PAT + Depreciation + Salary to Partners + Interest to Related Parties. Automatically validated and persisted on calculation.
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ── Sub-Section 2: Other Income Streams ── */}
                      <div className="bo-cv-normal-block" style={{ marginTop: '16px' }}>
                        <div className="bo-cv-salary-top-bar">
                          <div className="bo-cv-salary-top-left">
                            <h4 className="bo-cv-salary-top-title">Other Income Streams</h4>
                            <span className="bo-cv-salary-count-badge">
                              {normalOtherIncomeRows.length} {normalOtherIncomeRows.length === 1 ? 'Stream' : 'Streams'} Configured
                            </span>
                            {normalIncomeMetrics.totalConsideredOtherIncome > 0 && (
                              <span className="bo-cv-salary-count-badge" style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}>
                                Considered Other Income: {formatCurrency(normalIncomeMetrics.totalConsideredOtherIncome)}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="bo-btn bo-btn--outline bo-btn--sm bo-cv-salary-add-btn"
                            onClick={handleAddNormalOtherIncomeRow}
                            disabled={normalIncomeSaving}
                          >
                            {PlusIcon ? <PlusIcon size={13} /> : '+'}
                            <span>Add Other Income</span>
                          </button>
                        </div>

                        <div className="bo-cv-salary-table-wrapper">
                          <table className="bo-cv-salary-table" aria-label="Other Income Streams Table">
                            <thead>
                              <tr>
                                <th style={{ minWidth: '220px' }}>Income Stream Type</th>
                                <th className="th-num" style={{ minWidth: '160px' }}>Annual Income Amount (₹)</th>
                                <th className="th-num" style={{ minWidth: '130px' }}>Consideration %</th>
                                <th className="th-num" style={{ minWidth: '160px' }}>Considered Income (₹)</th>
                                <th className="th-action" style={{ minWidth: '60px', textAlign: 'center' }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {normalOtherIncomeRows.length === 0 ? (
                                <tr>
                                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                    No other income streams added. Click &quot;Add Other Income&quot; to include House Property, Agriculture, or Other Sources.
                                  </td>
                                </tr>
                              ) : (
                                normalOtherIncomeRows.map((row, idx) => {
                                  const isDraft = !row.isPersisted || !row.applicationNormalOtherIncomeDetailsId;
                                  const amt = Number(row.annualIncomeAmount) || 0;
                                  const pct =
                                    row.considerationPercentage !== '' && !isNaN(Number(row.considerationPercentage))
                                      ? Number(row.considerationPercentage)
                                      : 100;
                                  const computedConsidered = Math.round((amt * pct) / 100);

                                  return (
                                    <tr key={row.id || `normal-other-row-${idx}`}>
                                      <td>
                                        <select
                                          className="bo-cv-salary-input"
                                          value={row.incomeType || 'HOUSE_PROPERTY'}
                                          onChange={(e) => handleNormalOtherIncomeRowChange(idx, 'incomeType', e.target.value)}
                                          disabled={normalIncomeSaving}
                                          style={{ textAlign: 'left' }}
                                          aria-label={`Income Type for Row ${idx + 1}`}
                                        >
                                          <option value="HOUSE_PROPERTY">House Property</option>
                                          <option value="AGRICULTURE">Agriculture Income</option>
                                          <option value="OTHER_SOURCES">Income from Other Sources</option>
                                        </select>
                                      </td>
                                      <td className="td-num">
                                        <input
                                          type="number"
                                          min="0"
                                          step="1000"
                                          placeholder="0"
                                          className="bo-cv-salary-input"
                                          value={row.annualIncomeAmount === 0 ? '0' : row.annualIncomeAmount || ''}
                                          onChange={(e) => handleNormalOtherIncomeRowChange(idx, 'annualIncomeAmount', e.target.value)}
                                          disabled={normalIncomeSaving}
                                          aria-label={`Annual Income Amount for Row ${idx + 1}`}
                                        />
                                      </td>
                                      <td className="td-num">
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                          <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="1"
                                            placeholder="100"
                                            className="bo-cv-salary-input"
                                            style={{ width: '60px', textAlign: 'right' }}
                                            value={row.considerationPercentage === 0 ? '0' : row.considerationPercentage || ''}
                                            onChange={(e) => handleNormalOtherIncomeRowChange(idx, 'considerationPercentage', e.target.value)}
                                            disabled={normalIncomeSaving}
                                            aria-label={`Consideration Percentage for Row ${idx + 1}`}
                                          />
                                          <span style={{ fontSize: '12px', color: '#64748b' }}>%</span>
                                        </div>
                                      </td>
                                      <td className="td-num">
                                        <div className="bo-cv-salary-readonly-val" style={{ fontWeight: 700, color: '#047857' }}>
                                          {formatCurrency(
                                            row.consideredIncomeAmount != null && !row.isModified
                                              ? row.consideredIncomeAmount
                                              : computedConsidered
                                          )}
                                        </div>
                                      </td>
                                      <td className="td-action" style={{ textAlign: 'center' }}>
                                        {isDraft ? (
                                          <button
                                            type="button"
                                            className="bo-cv-loan-row-remove-btn"
                                            title="Remove unsaved draft other income row"
                                            aria-label={`Remove draft other income row ${idx + 1}`}
                                            onClick={() => handleRemoveNormalOtherIncomeDraftRow(idx)}
                                            disabled={normalIncomeSaving}
                                          >
                                            {XIcon ? <XIcon size={13} /> : '✕'}
                                          </button>
                                        ) : (
                                          <span className="bo-cv-salary-readonly-val" style={{ color: '#94a3b8' }}>
                                            —
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* ── Sub-Section 3: Salary Income Reference Display (Read-Only) ── */}
                      <div className="bo-cv-normal-salary-ref-card" style={{ marginTop: '16px' }}>
                        <div className="bo-cv-normal-salary-ref-header">
                          <div className="bo-cv-rm-income-ref-title-group">
                            <span className="bo-cv-rm-income-ref-title">Salary Income Reference (ApplicationSalaryIncomeDetails)</span>
                            <span className="bo-cv-rm-income-ref-badge">Reference Only &bull; 60% Rule</span>
                          </div>
                          <span className="bo-cv-rm-income-ref-sub">
                            Captured from verified salary records and existing salary-income engine. Read-only in Normal Income assessment.
                          </span>
                        </div>

                        <div className="bo-cv-rm-income-ref-grid">
                          <div className="bo-cv-rm-income-ref-cell">
                            <span className="bo-cv-rm-income-ref-label">Annual Salary Income</span>
                            <strong className="bo-cv-rm-income-ref-val">
                              {formatCurrency(normalIncomeMetrics.annualSalary)}
                            </strong>
                          </div>

                          <div className="bo-cv-rm-income-ref-cell">
                            <span className="bo-cv-rm-income-ref-label">Salary Consideration Policy</span>
                            <strong className="bo-cv-rm-income-ref-val" style={{ color: '#047857' }}>
                              60% (Fixed Rule)
                            </strong>
                          </div>

                          <div className="bo-cv-rm-income-ref-cell is-net">
                            <span className="bo-cv-rm-income-ref-label">Considered Salary Component (60%)</span>
                            <strong className="bo-cv-rm-income-ref-val is-net-val">
                              {formatCurrency(normalIncomeMetrics.consideredSalaryComponent)}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* ── Sub-Section 4: Normal Income Summary Strip (Estimated Preview) ── */}
                      <div className="bo-cv-salary-summary-card" style={{ marginTop: '16px' }}>
                        <div className="bo-cv-salary-summary-header">
                          <h4 className="bo-cv-salary-summary-title">Normal Income Evaluation Summary</h4>
                          <span className="bo-cv-salary-summary-count" style={{ background: '#f8fafc', color: '#475569', borderColor: '#cbd5e1' }}>
                            Estimated Preview (Non-Authoritative)
                          </span>
                        </div>
                        <div className="bo-cv-salary-summary-grid">
                          <div className="bo-cv-salary-summary-item">
                            <span className="bo-cv-salary-summary-label">Latest Primary Business Income</span>
                            <strong className="bo-cv-salary-summary-val">
                              {formatCurrency(normalIncomeMetrics.latestPrimaryBusinessIncome)}
                            </strong>
                            <span className="bo-cv-salary-summary-sub">
                              {normalIncomeMetrics.latestRow?.financialYear ? `FY ${normalIncomeMetrics.latestRow.financialYear}` : 'No latest year designated'}
                            </span>
                          </div>

                          <div className="bo-cv-salary-summary-item">
                            <span className="bo-cv-salary-summary-label">Considered Other Income</span>
                            <strong className="bo-cv-salary-summary-val">
                              {formatCurrency(normalIncomeMetrics.totalConsideredOtherIncome)}
                            </strong>
                            <span className="bo-cv-salary-summary-sub">
                              Across {normalOtherIncomeRows.length} {normalOtherIncomeRows.length === 1 ? 'stream' : 'streams'}
                            </span>
                          </div>

                          <div className="bo-cv-salary-summary-item">
                            <span className="bo-cv-salary-summary-label">Considered Salary Component</span>
                            <strong className="bo-cv-salary-summary-val">
                              {formatCurrency(normalIncomeMetrics.consideredSalaryComponent)}
                            </strong>
                            <span className="bo-cv-salary-summary-sub">
                              Salary @ 60% policy rule
                            </span>
                          </div>

                          <div className="bo-cv-salary-summary-item is-average" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                            <span className="bo-cv-salary-summary-label" style={{ color: '#065f46' }}>Estimated Eligible Monthly Income</span>
                            <strong className="bo-cv-salary-summary-val is-engine" style={{ color: '#047857' }}>
                              {formatCurrency(normalIncomeMetrics.estimatedEligibleMonthlyIncome)}
                            </strong>
                            <span className="bo-cv-salary-summary-sub" style={{ color: '#065f46' }}>
                              Est. EMI: {formatCurrency(normalIncomeMetrics.estimatedEligibleEMI)} (Eligible Income − Obligation)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Average Bank Balance (ABB) Method Workspace */
                    <div className="bo-cv-abb-assessment-wrap">
                      {/* Top Bar with Registration Action */}
                      <div className="bo-cv-abb-top-bar">
                        <div className="bo-cv-abb-top-left">
                          <h4 className="bo-cv-abb-top-title">Bank Accounts for ABB Assessment</h4>
                          <span className="bo-cv-abb-count-badge">
                            {abbAccounts.length} {abbAccounts.length === 1 ? 'Account' : 'Accounts'} Registered
                          </span>
                        </div>
                        {!isAddingAccount && (
                          <button
                            type="button"
                            className="bo-btn bo-btn--primary bo-btn--sm bo-cv-abb-add-btn"
                            onClick={handleOpenAddAccountForm}
                          >
                            {PlusIcon ? <PlusIcon size={14} /> : '+'}
                            <span>Add Bank Account</span>
                          </button>
                        )}
                      </div>

                      {/* Add Bank Account Inline Form */}
                      {isAddingAccount && (
                        <div className="bo-cv-abb-add-form-card">
                          <div className="bo-cv-abb-form-header">
                            <div className="bo-cv-abb-form-header-title">
                              {LandmarkIcon && <LandmarkIcon size={18} />}
                              <h5>Register New Bank Account</h5>
                            </div>
                            <button
                              type="button"
                              className="bo-cv-abb-form-close-btn"
                              onClick={() => {
                                setIsAddingAccount(false);
                                setAccountBanner(null);
                              }}
                              disabled={accountSaving}
                              aria-label="Close add account form"
                            >
                              {XIcon ? <XIcon size={16} /> : '✕'}
                            </button>
                          </div>

                          {accountBanner && (
                            <div className={`bo-cv-salary-banner is-${accountBanner.type}`}>
                              <div className="bo-cv-salary-banner-icon">
                                {accountBanner.type === 'success' && (CheckCircleIcon ? <CheckCircleIcon size={16} /> : '✓')}
                                {accountBanner.type === 'error' && (AlertTriangleIcon ? <AlertTriangleIcon size={16} /> : '⚠️')}
                                {accountBanner.type === 'warning' && (AlertCircleIcon ? <AlertCircleIcon size={16} /> : 'ℹ️')}
                                {accountBanner.type === 'info' && (InfoIcon ? <InfoIcon size={16} /> : 'ℹ️')}
                              </div>
                              <div className="bo-cv-salary-banner-msg">{accountBanner.message}</div>
                            </div>
                          )}

                          <div className="bo-cv-abb-form-grid">
                            <div className="bo-cv-abb-form-group">
                              <label className="bo-cv-abb-label">Bank <span className="req">*</span></label>
                              <select
                                className="bo-cv-abb-select"
                                value={newAccountDraft.bankId}
                                onChange={(e) => {
                                  const selectedBank = e.target.value;
                                  const matchingBranches = masterBranches.filter(
                                    (br) => Number(br.bankId) === Number(selectedBank)
                                  );
                                  setNewAccountDraft((prev) => ({
                                    ...prev,
                                    bankId: selectedBank,
                                    bankBranchId: matchingBranches[0]?.bankBranchId || '',
                                  }));
                                }}
                                disabled={accountSaving || mastersLoading}
                              >
                                <option value="">Select Bank</option>
                                {masterBanks.map((b) => (
                                  <option key={`bank-opt-${b.bankId}`} value={b.bankId}>
                                    {b.bankName || b.bankCode}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="bo-cv-abb-form-group">
                              <label className="bo-cv-abb-label">Bank Branch <span className="req">*</span></label>
                              <select
                                className="bo-cv-abb-select"
                                value={newAccountDraft.bankBranchId}
                                onChange={(e) =>
                                  setNewAccountDraft((prev) => ({ ...prev, bankBranchId: e.target.value }))
                                }
                                disabled={accountSaving || !newAccountDraft.bankId || mastersLoading}
                              >
                                <option value="">Select Branch</option>
                                {masterBranches
                                  .filter((br) => Number(br.bankId) === Number(newAccountDraft.bankId))
                                  .map((br) => (
                                    <option key={`branch-opt-${br.bankBranchId}`} value={br.bankBranchId}>
                                      {br.branchName}
                                    </option>
                                  ))}
                              </select>
                            </div>

                            <div className="bo-cv-abb-form-group">
                              <label className="bo-cv-abb-label">Account Number <span className="req">*</span></label>
                              <input
                                type="text"
                                className="bo-cv-abb-input"
                                placeholder="e.g. 50100234567890"
                                value={newAccountDraft.accountNumber}
                                onChange={(e) =>
                                  setNewAccountDraft((prev) => ({ ...prev, accountNumber: e.target.value }))
                                }
                                disabled={accountSaving}
                              />
                            </div>

                            <div className="bo-cv-abb-form-group">
                              <label className="bo-cv-abb-label">Statement From Date <span className="req">*</span></label>
                              <input
                                type="date"
                                className="bo-cv-abb-input"
                                value={newAccountDraft.statementFromDate}
                                onChange={(e) =>
                                  setNewAccountDraft((prev) => ({ ...prev, statementFromDate: e.target.value }))
                                }
                                disabled={accountSaving}
                              />
                            </div>

                            <div className="bo-cv-abb-form-group">
                              <label className="bo-cv-abb-label">Statement To Date <span className="req">*</span></label>
                              <input
                                type="date"
                                className="bo-cv-abb-input"
                                value={newAccountDraft.statementToDate}
                                onChange={(e) =>
                                  setNewAccountDraft((prev) => ({ ...prev, statementToDate: e.target.value }))
                                }
                                disabled={accountSaving}
                              />
                            </div>

                            <div className="bo-cv-abb-form-group bo-cv-abb-checkbox-group">
                              <label className="bo-cv-abb-checkbox-label">
                                <input
                                  type="checkbox"
                                  className="bo-cv-abb-checkbox"
                                  checked={newAccountDraft.isIncluded}
                                  onChange={(e) =>
                                    setNewAccountDraft((prev) => ({ ...prev, isIncluded: e.target.checked }))
                                  }
                                  disabled={accountSaving}
                                />
                                <span>Include in ABB Underwriting Calculation</span>
                              </label>
                            </div>
                          </div>

                          <div className="bo-cv-abb-form-actions">
                            <button
                              type="button"
                              className="bo-btn bo-btn--outline bo-btn--sm"
                              onClick={() => {
                                setIsAddingAccount(false);
                                setAccountBanner(null);
                              }}
                              disabled={accountSaving}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="bo-btn bo-btn--primary bo-btn--sm"
                              onClick={handleCreateAbbAccount}
                              disabled={accountSaving}
                            >
                              {accountSaving ? (
                                <>
                                  <span className="bo-cv-btn-spinner" />
                                  <span>Saving Account...</span>
                                </>
                              ) : (
                                <>
                                  {CheckCircleIcon && <CheckCircleIcon size={14} />}
                                  <span>Save Bank Account</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Loading State */}
                      {abbAccountsLoading ? (
                        <div className="bo-cv-assess-loading-box">
                          <div className="bo-cv-loading-spinner" />
                          <span>Loading registered ABB bank accounts...</span>
                        </div>
                      ) : abbAccountsError ? (
                        <div className="bo-cv-assess-error-box">
                          <div className="bo-cv-assess-error-msg">
                            {AlertTriangleIcon && <AlertTriangleIcon size={16} />}
                            <span>{abbAccountsError}</span>
                          </div>
                          <button
                            type="button"
                            className="bo-btn bo-btn--outline bo-btn--sm"
                            onClick={() => fetchAbbAccounts(calculationAppProdId, selectedApplicantSequence)}
                          >
                            {RefreshCwIcon && <RefreshCwIcon size={12} />}
                            <span>Retry</span>
                          </button>
                        </div>
                      ) : abbAccounts.length === 0 ? (
                        /* Empty State when no accounts registered */
                        <div className="bo-cv-abb-empty-card">
                          <div className="bo-cv-abb-empty-icon">
                            {BuildingIcon && <BuildingIcon size={32} />}
                          </div>
                          <h4>No Bank Accounts Registered</h4>
                          <p>
                            No bank statement accounts have been linked for {selectedApplicant?.name || 'this applicant'}. Click
                            &quot;Add Bank Account&quot; above to register a bank account and enter monthly 5th, 15th, and 25th balances.
                          </p>
                          {!isAddingAccount && (
                            <button
                              type="button"
                              className="bo-btn bo-btn--primary bo-btn--sm"
                              onClick={handleOpenAddAccountForm}
                            >
                              {PlusIcon ? <PlusIcon size={14} /> : '+'}
                              <span>Add Bank Account</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        /* List of Registered Bank Accounts */
                        <div className="bo-cv-abb-accounts-list">
                          {abbAccounts.map((acc, accIdx) => {
                            const accId = acc.abbAccountDetailsId;
                            const balances = accountBalances[accId] || [];
                            const isBalancesLoading = balancesLoadingMap[accId] === true;
                            const isBalancesSaving = balancesSavingMap[accId] === true;
                            const banner = balanceBannerMap[accId];
                            const isAllSaved = balances.length > 0 && balances.every((b) => b.isPersisted && b.saveStatus === 'saved');

                            return (
                              <div key={`abb-acc-${accId || accIdx}`} className="bo-cv-abb-account-card">
                                {/* Account Card Header */}
                                <div className="bo-cv-abb-acc-header">
                                  <div className="bo-cv-abb-acc-header-info">
                                    <div className="bo-cv-abb-acc-icon">
                                      {LandmarkIcon && <LandmarkIcon size={20} />}
                                    </div>
                                    <div>
                                      <div className="bo-cv-abb-acc-title-row">
                                        <h5 className="bo-cv-abb-acc-bank-name">{getBankName(acc.bankId)}</h5>
                                        <span className="bo-cv-abb-acc-branch-tag">{getBranchName(acc.bankBranchId)}</span>
                                        <span className="bo-cv-abb-acc-num-pill">
                                          A/C: {acc.accountNumber || '—'}
                                        </span>
                                      </div>
                                      <div className="bo-cv-abb-acc-period">
                                        <span>Statement Period: </span>
                                        <strong>
                                          {acc.statementFromDate
                                            ? new Date(acc.statementFromDate).toLocaleDateString('en-IN', {
                                                month: 'short',
                                                year: 'numeric',
                                              })
                                            : '—'}{' '}
                                          to{' '}
                                          {acc.statementToDate
                                            ? new Date(acc.statementToDate).toLocaleDateString('en-IN', {
                                                month: 'short',
                                                year: 'numeric',
                                              })
                                            : '—'}
                                        </strong>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bo-cv-abb-acc-header-right">
                                    <span
                                      className={`bo-cv-abb-inc-badge ${
                                        acc.isIncluded !== false ? 'is-included' : 'is-excluded'
                                      }`}
                                    >
                                      {acc.isIncluded !== false ? 'Included in Assessment ✓' : 'Excluded from Assessment'}
                                    </span>
                                  </div>
                                </div>

                                {/* Balances Banner */}
                                {banner && (
                                  <div className={`bo-cv-salary-banner is-${banner.type}`}>
                                    <div className="bo-cv-salary-banner-icon">
                                      {banner.type === 'success' && (CheckCircleIcon ? <CheckCircleIcon size={16} /> : '✓')}
                                      {banner.type === 'error' && (AlertTriangleIcon ? <AlertTriangleIcon size={16} /> : '⚠️')}
                                      {banner.type === 'warning' && (AlertCircleIcon ? <AlertCircleIcon size={16} /> : 'ℹ️')}
                                      {banner.type === 'info' && (InfoIcon ? <InfoIcon size={16} /> : 'ℹ️')}
                                    </div>
                                    <div className="bo-cv-salary-banner-msg">{banner.message}</div>
                                  </div>
                                )}

                                {/* Monthly Balances Table */}
                                {isBalancesLoading ? (
                                  <div className="bo-cv-assess-loading-box">
                                    <div className="bo-cv-loading-spinner" />
                                    <span>Loading monthly balance records for this account...</span>
                                  </div>
                                ) : (
                                  <div className="bo-cv-salary-table-wrapper">
                                    <table
                                      className="bo-cv-salary-table"
                                      aria-label={`Monthly ABB Balances for ${getBankName(acc.bankId)}`}
                                    >
                                      <thead>
                                        <tr>
                                          <th className="th-month">Month</th>
                                          <th className="th-num">5th Balance (₹)</th>
                                          <th className="th-num">15th Balance (₹)</th>
                                          <th className="th-num">25th Balance (₹)</th>
                                          <th className="th-num th-readonly">Monthly ABB (₹)</th>
                                          <th className="th-status">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {balances.map((row, rowIdx) => {
                                          const isPersisted = row.isPersisted && row.saveStatus === 'saved';
                                          return (
                                            <tr
                                              key={row.id || `bal-row-${rowIdx}`}
                                              className={isPersisted ? 'is-persisted-row' : 'is-draft-row'}
                                            >
                                              <td className="td-month">
                                                {isPersisted ? (
                                                  <span className="bo-cv-salary-month-badge">
                                                    {row.monthDisplay
                                                      ? new Date(`${row.monthDisplay}-01`).toLocaleDateString('en-IN', {
                                                          month: 'short',
                                                          year: 'numeric',
                                                        })
                                                      : row.balanceMonth}
                                                  </span>
                                                ) : (
                                                  <input
                                                    type="month"
                                                    className="bo-cv-salary-input is-month"
                                                    value={row.monthDisplay || ''}
                                                    onChange={(e) =>
                                                      handleAbbBalanceRowChange(
                                                        accId,
                                                        rowIdx,
                                                        'monthDisplay',
                                                        e.target.value
                                                      )
                                                    }
                                                    disabled={isBalancesSaving}
                                                    aria-label={`Balance Month for Row ${rowIdx + 1}`}
                                                  />
                                                )}
                                              </td>
                                              <td className="td-num">
                                                {isPersisted ? (
                                                  <span className="bo-cv-salary-readonly-val">
                                                    {formatCurrency(row.balanceOn5th)}
                                                  </span>
                                                ) : (
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    step="100"
                                                    placeholder="0"
                                                    className="bo-cv-salary-input"
                                                    value={row.balanceOn5th}
                                                    onChange={(e) =>
                                                      handleAbbBalanceRowChange(
                                                        accId,
                                                        rowIdx,
                                                        'balanceOn5th',
                                                        e.target.value
                                                      )
                                                    }
                                                    disabled={isBalancesSaving}
                                                    aria-label={`5th Balance for Row ${rowIdx + 1}`}
                                                  />
                                                )}
                                              </td>
                                              <td className="td-num">
                                                {isPersisted ? (
                                                  <span className="bo-cv-salary-readonly-val">
                                                    {formatCurrency(row.balanceOn15th)}
                                                  </span>
                                                ) : (
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    step="100"
                                                    placeholder="0"
                                                    className="bo-cv-salary-input"
                                                    value={row.balanceOn15th}
                                                    onChange={(e) =>
                                                      handleAbbBalanceRowChange(
                                                        accId,
                                                        rowIdx,
                                                        'balanceOn15th',
                                                        e.target.value
                                                      )
                                                    }
                                                    disabled={isBalancesSaving}
                                                    aria-label={`15th Balance for Row ${rowIdx + 1}`}
                                                  />
                                                )}
                                              </td>
                                              <td className="td-num">
                                                {isPersisted ? (
                                                  <span className="bo-cv-salary-readonly-val">
                                                    {formatCurrency(row.balanceOn25th)}
                                                  </span>
                                                ) : (
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    step="100"
                                                    placeholder="0"
                                                    className="bo-cv-salary-input"
                                                    value={row.balanceOn25th}
                                                    onChange={(e) =>
                                                      handleAbbBalanceRowChange(
                                                        accId,
                                                        rowIdx,
                                                        'balanceOn25th',
                                                        e.target.value
                                                      )
                                                    }
                                                    disabled={isBalancesSaving}
                                                    aria-label={`25th Balance for Row ${rowIdx + 1}`}
                                                  />
                                                )}
                                              </td>
                                              <td className="td-num td-readonly">
                                                <span className="bo-cv-salary-calc-val is-total">
                                                  {row.monthlyABB != null ? formatCurrency(row.monthlyABB) : '—'}
                                                </span>
                                              </td>
                                              <td className="td-status">
                                                {isPersisted ? (
                                                  <span className="bo-cv-salary-status-badge is-saved">Saved ✓</span>
                                                ) : row.saveStatus === 'saving' ? (
                                                  <span className="bo-cv-salary-status-badge is-saving">Saving...</span>
                                                ) : row.saveStatus === 'error' ? (
                                                  <span
                                                    className="bo-cv-salary-status-badge is-error"
                                                    title={row.errorMsg || 'Save error'}
                                                  >
                                                    Failed ⚠️
                                                  </span>
                                                ) : (
                                                  <span className="bo-cv-salary-status-badge is-pending">Unsaved</span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* Account Footer Action Bar */}
                                <div className="bo-cv-salary-action-bar">
                                  <div className="bo-cv-salary-action-hint">
                                    <span className="bo-cv-salary-hint-dot" />
                                    <span>
                                      <strong>Note:</strong> Monthly ABB is calculated by the server engine upon saving (average of 5th, 15th &amp; 25th balances).
                                    </span>
                                  </div>
                                  <div className="bo-cv-salary-action-buttons">
                                    <button
                                      type="button"
                                      className="bo-btn bo-btn--outline bo-btn--sm"
                                      onClick={() => handleAddAbbBalanceMonth(accId)}
                                      disabled={isBalancesSaving}
                                    >
                                      {PlusIcon ? <PlusIcon size={13} /> : '+'}
                                      <span>Add Month</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="bo-btn bo-btn--primary bo-cv-salary-save-btn"
                                      onClick={() => handleSaveAbbBalances(accId)}
                                      disabled={isBalancesSaving || isAllSaved}
                                    >
                                      {isBalancesSaving ? (
                                        <>
                                          <span className="bo-cv-btn-spinner" />
                                          <span>Saving Balances...</span>
                                        </>
                                      ) : (
                                        <>
                                          {CheckCircleIcon && <CheckCircleIcon size={14} />}
                                          <span>Save ABB Balances</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* ABB Assessment Summary Card */}
                      <div className="bo-cv-salary-summary-card">
                        <div className="bo-cv-salary-summary-header">
                          <h4 className="bo-cv-salary-summary-title">Average Bank Balance (ABB) Summary</h4>
                          <span className="bo-cv-salary-summary-count">
                            Included Accounts: {abbSummaryMetrics.includedCount} / {abbSummaryMetrics.totalAccounts}
                          </span>
                        </div>
                        <div className="bo-cv-salary-summary-grid">
                          <div className="bo-cv-salary-summary-item">
                            <span className="bo-cv-salary-summary-label">Registered Bank Accounts</span>
                            <strong className="bo-cv-salary-summary-val">
                              {abbSummaryMetrics.totalAccounts} {abbSummaryMetrics.totalAccounts === 1 ? 'Account' : 'Accounts'}
                            </strong>
                            <span className="bo-cv-salary-summary-sub">
                              {abbSummaryMetrics.includedCount} Included in Assessment
                            </span>
                          </div>

                          <div className="bo-cv-salary-summary-item">
                            <span className="bo-cv-salary-summary-label">Total Saved Balance Records</span>
                            <strong className="bo-cv-salary-summary-val">
                              {abbSummaryMetrics.totalSavedBalances} Months
                            </strong>
                            <span className="bo-cv-salary-summary-sub">
                              Across all included accounts
                            </span>
                          </div>

                          <div className="bo-cv-salary-summary-item is-average">
                            <span className="bo-cv-salary-summary-label">Average Monthly ABB</span>
                            <strong className="bo-cv-salary-summary-val is-engine">
                              Calculated by eligibility engine
                            </strong>
                            <span className="bo-cv-salary-summary-sub">
                              Authoritative ABB &amp; multiplier limit are evaluated in the final calculation below.
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                </div>
                )}

                {calcSheetTab === 'settings' && (
                <div className="bo-cv-calc-pane" data-pane="settings">
                {/* ── Section 5: Eligibility Calculation Settings ──────────────── */}
                <div className="bo-cv-assess-section">
                  <div className="bo-cv-assess-section-header">
                    <div className="bo-cv-assess-section-title-wrap">
                      <span className="bo-cv-assess-section-num">5</span>
                      <div>
                        <h3 className="bo-cv-assess-section-title">Eligibility Calculation Settings</h3>
                        <p className="bo-cv-assess-section-sub">
                          Review application parameters and apply underwriting overrides if needed.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bo-cv-calc-settings-grid">
                    {/* 1. Requested Loan Amount (Read-Only) */}
                    <div className="bo-cv-calc-setting-card">
                      <div className="bo-cv-calc-setting-header">
                        <span className="bo-cv-calc-setting-label">Requested Loan Amount</span>
                        <span className="bo-cv-readonly-tag">Read-Only</span>
                      </div>
                      <div className="bo-cv-calc-setting-value bo-cv-amount-val">
                        {formatCurrency(appDetails.loanAmount)}
                      </div>
                      <span className="bo-cv-calc-setting-hint">
                        Loaded directly from Application Product Details.
                      </span>
                    </div>

                    {selectedMethodCode === 'RTR' ? (
                      /* 2. EMI Amount Factor for RTR Assessment */
                      <div className="bo-cv-calc-setting-card">
                        <div className="bo-cv-calc-setting-header">
                          <span className="bo-cv-calc-setting-label">EMI Amount Factor <span className="req">*</span></span>
                          <span className="bo-cv-readonly-tag" style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}>Manual Input</span>
                        </div>
                        <div className="bo-cv-setting-override-row">
                          <input
                            type="number"
                            step="1"
                            min="1"
                            max="360"
                            className="bo-cv-setting-input"
                            placeholder="Enter EMI amount factor"
                            value={currentCalcSettings.emiAmountFactor ?? ''}
                            onChange={(e) =>
                              updateCurrentCalcSettings((prev) => ({ ...prev, emiAmountFactor: e.target.value }))
                            }
                            aria-label="EMI Amount Factor"
                          />
                          <span className="bo-cv-setting-unit">Factor</span>
                        </div>
                        <span className="bo-cv-calc-setting-hint">
                          {currentCalcSettings.emiAmountFactor
                            ? `Applied Factor: ${currentCalcSettings.emiAmountFactor} (Manual input)`
                            : 'Enter factor multiplier for RTR assessed income calculation (Required)'}
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* 2. ROI (% p.a.) with Edit / Override */}
                        <div className="bo-cv-calc-setting-card">
                          <div className="bo-cv-calc-setting-header">
                            <span className="bo-cv-calc-setting-label">Interest Rate (ROI % p.a.)</span>
                            <button
                              type="button"
                              className="bo-cv-setting-action-btn"
                              onClick={() =>
                                updateCurrentCalcSettings((prev) => ({
                                  ...prev,
                                  isEditingRoi: !prev.isEditingRoi,
                                  manualRoiInput:
                                    !prev.isEditingRoi && prev.manualRoiInput === ''
                                      ? resolvedAppRoi != null
                                        ? String(resolvedAppRoi)
                                        : ''
                                      : prev.manualRoiInput,
                                }))
                              }
                            >
                              {currentCalcSettings.isEditingRoi ? 'Use Application ROI' : 'Override ROI'}
                            </button>
                          </div>

                          {currentCalcSettings.isEditingRoi ? (
                            <div className="bo-cv-setting-override-row">
                              <input
                                type="number"
                                step="0.1"
                                min="1"
                                max="100"
                                className="bo-cv-setting-input"
                                placeholder={resolvedAppRoi != null ? String(resolvedAppRoi) : 'e.g. 10.5'}
                                value={currentCalcSettings.manualRoiInput}
                                onChange={(e) =>
                                  updateCurrentCalcSettings((prev) => ({ ...prev, manualRoiInput: e.target.value }))
                                }
                                aria-label="Manual ROI Override"
                              />
                              <span className="bo-cv-setting-unit">% p.a.</span>
                            </div>
                          ) : (
                            <div className="bo-cv-calc-setting-value">
                              {resolvedAppRoi != null ? `${resolvedAppRoi}% p.a.` : 'Not Specified'}
                            </div>
                          )}

                          <span className="bo-cv-calc-setting-hint">
                            {currentCalcSettings.isEditingRoi && currentCalcSettings.manualRoiInput !== ''
                              ? `Calculation override: ${currentCalcSettings.manualRoiInput}% (App ROI: ${resolvedAppRoi ?? '—'}%)`
                              : 'Using Application ROI (No override applied)'}
                          </span>
                        </div>

                        {/* 3. Tenure (Months) with Edit / Override */}
                        <div className="bo-cv-calc-setting-card">
                          <div className="bo-cv-calc-setting-header">
                            <span className="bo-cv-calc-setting-label">Loan Tenure (Months)</span>
                            <button
                              type="button"
                              className="bo-cv-setting-action-btn"
                              onClick={() =>
                                updateCurrentCalcSettings((prev) => ({
                                  ...prev,
                                  isEditingTenure: !prev.isEditingTenure,
                                  manualTenureInput:
                                    !prev.isEditingTenure && prev.manualTenureInput === ''
                                      ? resolvedAppTenure != null
                                        ? String(resolvedAppTenure)
                                        : ''
                                      : prev.manualTenureInput,
                                }))
                              }
                            >
                              {currentCalcSettings.isEditingTenure ? 'Use Application Tenure' : 'Override Tenure'}
                            </button>
                          </div>

                          {currentCalcSettings.isEditingTenure ? (
                            <div className="bo-cv-setting-override-row">
                              <input
                                type="number"
                                step="1"
                                min="1"
                                max="360"
                                className="bo-cv-setting-input"
                                placeholder={resolvedAppTenure != null ? String(resolvedAppTenure) : 'e.g. 24'}
                                value={currentCalcSettings.manualTenureInput}
                                onChange={(e) =>
                                  updateCurrentCalcSettings((prev) => ({ ...prev, manualTenureInput: e.target.value }))
                                }
                                aria-label="Manual Tenure Override"
                              />
                              <span className="bo-cv-setting-unit">Months</span>
                            </div>
                          ) : (
                            <div className="bo-cv-calc-setting-value">
                              {resolvedAppTenure != null ? `${resolvedAppTenure} Months` : 'Not Specified'}
                            </div>
                          )}

                          <span className="bo-cv-calc-setting-hint">
                            {currentCalcSettings.isEditingTenure && currentCalcSettings.manualTenureInput !== ''
                              ? `Calculation override: ${currentCalcSettings.manualTenureInput} Months (App Tenure: ${resolvedAppTenure ?? '—'} M)`
                              : 'Using Application Loan Tenure (No override applied)'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Section 6: Existing Active Obligations & Policy FOIR ─────── */}
                {selectedMethodCode !== 'RTR' && (
                  <div className="bo-cv-assess-section">
                  <div className="bo-cv-assess-section-header">
                    <div className="bo-cv-assess-section-title-wrap">
                      <span className="bo-cv-assess-section-num">6</span>
                      <div>
                        <h3 className="bo-cv-assess-section-title">Existing Active Obligations &amp; Policy Benchmark</h3>
                        <p className="bo-cv-assess-section-sub">
                          Review active customer debt commitments and authoritative policy FOIR thresholds prior to calculation for {selectedApplicant?.name || 'Selected Applicant'}.
                        </p>
                      </div>
                    </div>
                    {!isAddingLoan && (
                      <button
                        type="button"
                        className="bo-btn bo-btn--primary bo-btn--sm bo-cv-loan-add-btn"
                        onClick={() => {
                          setIsAddingLoan(true);
                          setLoanBanner(null);
                        }}
                        disabled={loanSaving}
                      >
                        {PlusIcon ? <PlusIcon size={14} /> : '+'}
                        <span>Add Loan</span>
                      </button>
                    )}
                  </div>

                  {/* Add Active Loan Inline Form */}
                  {isAddingLoan && (
                    <div className="bo-cv-loan-add-card">
                      <div className="bo-cv-loan-add-header">
                        <div className="bo-cv-loan-add-title-row">
                          {LandmarkIcon && <LandmarkIcon size={18} />}
                          <h5>Add Active Loan Obligation &mdash; {selectedApplicant?.name || 'Applicant'}</h5>
                        </div>
                        <button
                          type="button"
                          className="bo-cv-loan-close-btn"
                          onClick={() => {
                            setIsAddingLoan(false);
                            setLoanBanner(null);
                          }}
                          disabled={loanSaving}
                          aria-label="Close Add Loan Form"
                        >
                          {XIcon ? <XIcon size={16} /> : '✕'}
                        </button>
                      </div>

                      {loanBanner && (
                        <div className={`bo-cv-salary-banner is-${loanBanner.type}`}>
                          <div className="bo-cv-salary-banner-icon">
                            {loanBanner.type === 'success' && (CheckCircleIcon ? <CheckCircleIcon size={16} /> : '✓')}
                            {loanBanner.type === 'error' && (AlertTriangleIcon ? <AlertTriangleIcon size={16} /> : '⚠️')}
                            {loanBanner.type === 'warning' && (AlertCircleIcon ? <AlertCircleIcon size={16} /> : 'ℹ️')}
                            {loanBanner.type === 'info' && (InfoIcon ? <InfoIcon size={16} /> : 'ℹ️')}
                          </div>
                          <div className="bo-cv-salary-banner-msg">{loanBanner.message}</div>
                        </div>
                      )}

                      <div className="bo-cv-loan-add-grid">
                        <div className="bo-cv-loan-form-group">
                          <label className="bo-cv-loan-label">Lender / Bank <span className="req">*</span></label>
                          <select
                            className="bo-cv-loan-select"
                            value={newLoanDraft.bankId}
                            onChange={(e) => setNewLoanDraft((prev) => ({ ...prev, bankId: e.target.value }))}
                            disabled={loanSaving}
                          >
                            <option value="">Select Bank</option>
                            {masterBanks.map((b) => (
                              <option key={`loan-bank-opt-${b.bankId}`} value={b.bankId}>
                                {b.bankName || b.bankCode}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="bo-cv-loan-form-group">
                          <label className="bo-cv-loan-label">Loan Type <span className="req">*</span></label>
                          <select
                            className="bo-cv-loan-select"
                            value={newLoanDraft.loanType}
                            onChange={(e) => setNewLoanDraft((prev) => ({ ...prev, loanType: e.target.value }))}
                            disabled={loanSaving}
                          >
                            <option value="HOME LOAN">Home Loan</option>
                            <option value="PERSONAL LOAN">Personal Loan</option>
                            <option value="VEHICLE LOAN">Vehicle Loan</option>
                            <option value="BUSINESS LOAN">Business Loan</option>
                            <option value="GOLD LOAN">Gold Loan</option>
                            <option value="EDUCATION LOAN">Education Loan</option>
                            <option value="OTHER">Other Facility</option>
                          </select>
                        </div>

                        <div className="bo-cv-loan-form-group">
                          <label className="bo-cv-loan-label">Total Loan Amount (₹) <span className="req">*</span></label>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="e.g. 50000"
                            className="bo-cv-loan-input"
                            value={newLoanDraft.totalLoanAmount}
                            onChange={(e) => setNewLoanDraft((prev) => ({ ...prev, totalLoanAmount: e.target.value }))}
                            disabled={loanSaving}
                          />
                        </div>

                        <div className="bo-cv-loan-form-group">
                          <label className="bo-cv-loan-label">Total Outstanding (₹) <span className="req">*</span></label>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="e.g. 25000"
                            className="bo-cv-loan-input"
                            value={newLoanDraft.totalOutstanding}
                            onChange={(e) => setNewLoanDraft((prev) => ({ ...prev, totalOutstanding: e.target.value }))}
                            disabled={loanSaving}
                          />
                        </div>

                        <div className="bo-cv-loan-form-group">
                          <label className="bo-cv-loan-label">Monthly EMI (₹) <span className="req">*</span></label>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            placeholder="e.g. 5000"
                            className="bo-cv-loan-input"
                            value={newLoanDraft.emiAmount}
                            onChange={(e) => setNewLoanDraft((prev) => ({ ...prev, emiAmount: e.target.value }))}
                            disabled={loanSaving}
                          />
                        </div>

                        <div className="bo-cv-loan-form-group">
                          <label className="bo-cv-loan-label">Status</label>
                          <select
                            className="bo-cv-loan-select"
                            value={newLoanDraft.status}
                            onChange={(e) => setNewLoanDraft((prev) => ({ ...prev, status: e.target.value }))}
                            disabled={loanSaving}
                          >
                            <option value="Active">Active</option>
                            <option value="Closed">Closed</option>
                          </select>
                        </div>
                      </div>

                      <div className="bo-cv-loan-add-actions">
                        <button
                          type="button"
                          className="bo-btn bo-btn--outline bo-btn--sm"
                          onClick={() => {
                            setIsAddingLoan(false);
                            setLoanBanner(null);
                          }}
                          disabled={loanSaving}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="bo-btn bo-btn--primary bo-btn--sm"
                          onClick={handleSaveActiveLoan}
                          disabled={loanSaving}
                        >
                          {loanSaving ? (
                            <>
                              <span className="bo-cv-btn-spinner" />
                              <span>Saving Loan...</span>
                            </>
                          ) : (
                            <>
                              {CheckCircleIcon && <CheckCircleIcon size={14} />}
                              <span>Save Active Loan</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active Loans Mini-Table */}
                  <div className="bo-cv-obligations-card">
                    <div className="bo-cv-obligations-header">
                      <h4 className="bo-cv-obligations-title">
                        Declared Active Debt Obligations &mdash; {selectedApplicant?.name || 'Applicant'}
                      </h4>
                      <span className="bo-cv-obligations-count-pill">
                        {selectedApplicantActiveLoans.length} {selectedApplicantActiveLoans.length === 1 ? 'Active Facility' : 'Active Facilities'}
                      </span>
                    </div>

                    {loanBanner && !isAddingLoan && (
                      <div className={`bo-cv-salary-banner is-${loanBanner.type}`} style={{ margin: '12px 18px 0 18px' }}>
                        <div className="bo-cv-salary-banner-icon">
                          {loanBanner.type === 'success' && (CheckCircleIcon ? <CheckCircleIcon size={16} /> : '✓')}
                          {loanBanner.type === 'error' && (AlertTriangleIcon ? <AlertTriangleIcon size={16} /> : '⚠️')}
                          {loanBanner.type === 'warning' && (AlertCircleIcon ? <AlertCircleIcon size={16} /> : 'ℹ️')}
                          {loanBanner.type === 'info' && (InfoIcon ? <InfoIcon size={16} /> : 'ℹ️')}
                        </div>
                        <div className="bo-cv-salary-banner-msg">{loanBanner.message}</div>
                      </div>
                    )}

                    {loansLoading ? (
                      <div className="bo-cv-assess-loading-box" style={{ padding: '24px' }}>
                        <div className="bo-cv-loading-spinner" />
                        <span>Loading active debt facilities from backend...</span>
                      </div>
                    ) : selectedApplicantActiveLoans.length > 0 ? (
                      <div className="bo-cv-salary-table-wrapper bo-cv-obligations-table-wrap">
                        <table className="bo-cv-salary-table bo-cv-obligations-table">
                          <thead>
                            <tr>
                              <th>Lender / Bank</th>
                              <th>Loan Type</th>
                              <th className="th-num">Total Loan</th>
                              <th className="th-num">Outstanding</th>
                              <th className="th-num">Monthly EMI</th>
                              <th className="th-status">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedApplicantActiveLoans.map((loan, lIdx) => (
                              <tr key={loan.applicationBankActiveLoanDetailsId || lIdx}>
                                <td><strong>{loan.bankName || 'State Bank of India'}</strong></td>
                                <td>{loan.loanType || 'Loan Facility'}</td>
                                <td className="td-num">{formatCurrency(loan.totalLoanAmount)}</td>
                                <td className="td-num">{formatCurrency(loan.totalOutstanding)}</td>
                                <td className="td-num"><strong>{formatCurrency(loan.emiAmount)}</strong></td>
                                <td className="td-status">
                                  <span className="bo-cv-salary-status-badge is-saved">
                                    {loan.status || 'Active'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bo-cv-obligations-empty">
                        <span>No active loan obligations found for {selectedApplicant?.name || 'this applicant'}.</span>
                      </div>
                    )}

                    <div className="bo-cv-obligation-summary-strip">
                      <div className="bo-cv-obligation-summary-hint">
                        <span className="bo-cv-salary-hint-dot" />
                        <span>
                          <strong>Note:</strong> Informational summary from active verified records. Authoritative existing EMI is evaluated server-side by the calculation engine.
                        </span>
                      </div>
                      <div className="bo-cv-obligation-summary-total">
                        <span>Total Existing Monthly EMI:</span>
                        <strong>{formatCurrency(totalDeclaredMonthlyEmi)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Benchmark Cards Grid */}
                  <div className="bo-cv-calc-settings-grid" style={{ marginTop: '16px' }}>
                    {/* 1. Existing Monthly Obligation Card with Override */}
                    <div className="bo-cv-calc-setting-card">
                      <div className="bo-cv-calc-setting-header">
                        <span className="bo-cv-calc-setting-label">Existing Monthly Obligation</span>
                        <button
                          type="button"
                          className="bo-cv-setting-action-btn"
                          onClick={() =>
                            updateCurrentCalcSettings((prev) => ({
                              ...prev,
                              isEditingObligation: !prev.isEditingObligation,
                              manualObligationInput:
                                !prev.isEditingObligation && prev.manualObligationInput === ''
                                  ? totalDeclaredMonthlyEmi > 0
                                    ? String(totalDeclaredMonthlyEmi)
                                    : ''
                                  : prev.manualObligationInput,
                            }))
                          }
                        >
                          {currentCalcSettings.isEditingObligation ? 'Use Calculated EMI' : 'Override Obligation'}
                        </button>
                      </div>

                      {currentCalcSettings.isEditingObligation ? (
                        <div className="bo-cv-setting-override-row">
                          <span className="bo-cv-setting-currency-symbol">₹</span>
                          <input
                            type="number"
                            step="100"
                            min="0"
                            className="bo-cv-setting-input is-amount"
                            placeholder={String(totalDeclaredMonthlyEmi || 0)}
                            value={currentCalcSettings.manualObligationInput}
                            onChange={(e) =>
                              updateCurrentCalcSettings((prev) => ({ ...prev, manualObligationInput: e.target.value }))
                            }
                            aria-label="Manual Existing Monthly Obligation"
                          />
                        </div>
                      ) : (
                        <div className="bo-cv-calc-setting-value bo-cv-amount-val">
                          {formatCurrency(totalDeclaredMonthlyEmi)}
                        </div>
                      )}

                      <span className="bo-cv-calc-setting-hint">
                        {currentCalcSettings.isEditingObligation && currentCalcSettings.manualObligationInput !== ''
                          ? `Override: ${formatCurrency(currentCalcSettings.manualObligationInput)} • Applied Obligation: ${formatCurrency(currentCalcSettings.manualObligationInput)} (Calculated EMI: ${formatCurrency(totalDeclaredMonthlyEmi)})`
                          : `Applied Obligation: ${formatCurrency(totalDeclaredMonthlyEmi)} (Derived from active loan facilities)`}
                      </span>
                    </div>

                    {/* 2. Policy FOIR Limit Card with Override */}
                    <div className="bo-cv-calc-setting-card">
                      <div className="bo-cv-calc-setting-header">
                        <span className="bo-cv-calc-setting-label">Policy FOIR Limit</span>
                        {(selectedMethodCode === 'INCOME' || selectedMethodCode === 'NORMAL_INCOME') && (
                          <button
                            type="button"
                            className="bo-cv-setting-action-btn"
                            onClick={() =>
                              updateCurrentCalcSettings((prev) => ({
                                ...prev,
                                isEditingFoir: !prev.isEditingFoir,
                                manualFoirInput:
                                  !prev.isEditingFoir && prev.manualFoirInput === ''
                                    ? basePolicyFoir != null
                                      ? String(basePolicyFoir)
                                      : ''
                                    : prev.manualFoirInput,
                              }))
                            }
                          >
                            {currentCalcSettings.isEditingFoir ? 'Use Policy FOIR' : 'Override FOIR'}
                          </button>
                        )}
                      </div>

                      {(selectedMethodCode === 'INCOME' || selectedMethodCode === 'NORMAL_INCOME') && currentCalcSettings.isEditingFoir ? (
                        <div className="bo-cv-setting-override-row">
                          <input
                            type="number"
                            step="0.5"
                            min="0.1"
                            max="100"
                            className="bo-cv-setting-input"
                            placeholder={basePolicyFoir != null ? String(basePolicyFoir) : 'e.g. 70'}
                            value={currentCalcSettings.manualFoirInput}
                            onChange={(e) =>
                              updateCurrentCalcSettings((prev) => ({ ...prev, manualFoirInput: e.target.value }))
                            }
                            aria-label="Manual Policy FOIR"
                          />
                          <span className="bo-cv-setting-unit">%</span>
                        </div>
                      ) : (
                        <div className="bo-cv-calc-setting-value bo-cv-foir-val">
                          {selectedMethodCode === 'INCOME' || selectedMethodCode === 'NORMAL_INCOME'
                            ? basePolicyFoir != null
                              ? `${basePolicyFoir}%`
                              : 'Policy FOIR from Master (Auto)'
                            : selectedMethodCode === 'RTR'
                            ? 'Not Applicable (RTR Method)'
                            : 'Not Applicable (ABB Method)'}
                        </div>
                      )}

                      <span className="bo-cv-calc-setting-hint">
                        {selectedMethodCode === 'INCOME' || selectedMethodCode === 'NORMAL_INCOME'
                          ? currentCalcSettings.isEditingFoir && currentCalcSettings.manualFoirInput !== ''
                            ? `Override: ${currentCalcSettings.manualFoirInput}% • Applied FOIR: ${currentCalcSettings.manualFoirInput}% (Base Policy FOIR: ${basePolicyFoir != null ? `${basePolicyFoir}%` : 'Policy FOIR from Master'})`
                            : `Applied FOIR: ${basePolicyFoir != null ? `${basePolicyFoir}%` : 'Policy FOIR from Master'} (Using Policy Benchmark from FOIR Master for ${selectedEmploymentTypeName || 'applicant'})`
                          : 'Policy FOIR is not applicable for Average Bank Balance assessment.'}
                      </span>
                    </div>
                  </div>
                </div>
                )}

                {/* ── Section 7: Calculate Eligibility Action ─────────────────── */}
                <div className="bo-cv-assess-section bo-cv-calc-action-section">
                  {/* Pre-Calculation Verified Parameters Snapshot */}
                  <div className="bo-cv-calc-pre-summary">
                    <div className="bo-cv-calc-pre-badge">
                      <span className="bo-cv-calc-pre-label">Pre-Calculation Verified Parameters:</span>
                    </div>
                    <div className="bo-cv-calc-pre-items">
                      <div className="bo-cv-calc-pre-item">
                        <span className="bo-cv-calc-pre-item-label">Method:</span>
                        <strong>
                          {selectedMethodCode === 'RTR'
                            ? 'RTR Method'
                            : selectedMethodCode === 'INCOME'
                            ? 'Income Method'
                            : selectedMethodCode === 'NORMAL_INCOME'
                            ? 'Normal Income'
                            : 'ABB Method'}
                        </strong>
                      </div>
                      <span className="bo-cv-calc-pre-dot">•</span>
                      <div className="bo-cv-calc-pre-item">
                        <span className="bo-cv-calc-pre-item-label">Applicant:</span>
                        <strong>{selectedApplicant?.name || 'Applicant'}</strong>
                      </div>
                      <span className="bo-cv-calc-pre-dot">•</span>
                      <div className="bo-cv-calc-pre-item">
                        <span className="bo-cv-calc-pre-item-label">Requested:</span>
                        <strong>{formatCurrency(appDetails.loanAmount)}</strong>
                      </div>
                      {selectedMethodCode === 'RTR' ? (
                        <>
                          <span className="bo-cv-calc-pre-dot">•</span>
                          <div className="bo-cv-calc-pre-item">
                            <span className="bo-cv-calc-pre-item-label">EMI Factor:</span>
                            <strong>{currentCalcSettings.emiAmountFactor ? currentCalcSettings.emiAmountFactor : '— (Required)'}</strong>
                          </div>
                          <span className="bo-cv-calc-pre-dot">•</span>
                          <div className="bo-cv-calc-pre-item">
                            <span className="bo-cv-calc-pre-item-label">RTR Facilities:</span>
                            <strong>{rtrSummaryMetrics.validCount} Active</strong>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="bo-cv-calc-pre-dot">•</span>
                          <div className="bo-cv-calc-pre-item">
                            <span className="bo-cv-calc-pre-item-label">ROI:</span>
                            <strong>
                              {currentCalcSettings.isEditingRoi && currentCalcSettings.manualRoiInput !== ''
                                ? `${currentCalcSettings.manualRoiInput}% (Override)`
                                : resolvedAppRoi != null
                                ? `${resolvedAppRoi}% p.a.`
                                : '—'}
                            </strong>
                          </div>
                          <span className="bo-cv-calc-pre-dot">•</span>
                          <div className="bo-cv-calc-pre-item">
                            <span className="bo-cv-calc-pre-item-label">Tenure:</span>
                            <strong>
                              {currentCalcSettings.isEditingTenure && currentCalcSettings.manualTenureInput !== ''
                                ? `${currentCalcSettings.manualTenureInput} M (Override)`
                                : resolvedAppTenure != null
                                ? `${resolvedAppTenure} Months`
                                : '—'}
                            </strong>
                          </div>
                          <span className="bo-cv-calc-pre-dot">•</span>
                          <div className="bo-cv-calc-pre-item">
                            <span className="bo-cv-calc-pre-item-label">Existing EMI:</span>
                            <strong>
                              {currentCalcSettings.isEditingObligation && currentCalcSettings.manualObligationInput !== ''
                                ? `${formatCurrency(currentCalcSettings.manualObligationInput)} (Override)`
                                : formatCurrency(totalDeclaredMonthlyEmi)}
                            </strong>
                          </div>
                          {(selectedMethodCode === 'INCOME' || selectedMethodCode === 'NORMAL_INCOME') && (
                            <>
                              <span className="bo-cv-calc-pre-dot">•</span>
                              <div className="bo-cv-calc-pre-item">
                                <span className="bo-cv-calc-pre-item-label">Policy FOIR:</span>
                                <strong>
                                  {currentCalcSettings.isEditingFoir && currentCalcSettings.manualFoirInput !== ''
                                    ? `${currentCalcSettings.manualFoirInput}% (Override)`
                                    : basePolicyFoir != null
                                    ? `${basePolicyFoir}%`
                                    : 'Policy FOIR from Master'}
                                </strong>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bo-cv-calc-trigger-wrap">
                    <div className="bo-cv-calc-trigger-info">
                      <h4 className="bo-cv-calc-trigger-title">
                        {selectedMethodCode === 'RTR'
                          ? 'Run RTR Eligibility Calculation Engine'
                          : 'Run Eligibility Calculation Engine'}
                      </h4>
                      <p className="bo-cv-calc-trigger-sub">
                        {selectedMethodCode === 'RTR'
                          ? `Submits verified loan repayment track records to the SIVELS RTR calculation engine for ${
                              selectedApplicant?.name || 'Applicant'
                            } to evaluate maximum top-up, EMI multiplier, and final loan eligibility.`
                          : `Submits verified income/banking inputs and settings to the SIVELS eligibility calculation engine for ${
                              selectedApplicant?.name || 'Applicant'
                            } (${
                              selectedMethodCode === 'INCOME'
                                ? 'Income Method'
                                : selectedMethodCode === 'NORMAL_INCOME'
                                ? 'Normal Income'
                                : 'ABB Method'
                            }).`}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="bo-btn bo-btn--primary bo-cv-calculate-btn"
                      onClick={handleCalculateEligibility}
                      disabled={
                        calculating ||
                        !calculationAppProdId ||
                        (selectedMethodCode !== 'RTR' && !selectedEmploymentIncomeDetailsId) ||
                        (selectedMethodCode === 'RTR' && rtrSummaryMetrics.validCount === 0)
                      }
                    >
                      {calculating ? (
                        <>
                          <span className="bo-cv-btn-spinner" />
                          <span>{selectedMethodCode === 'RTR' ? 'Calculating RTR Eligibility...' : 'Calculating Eligibility...'}</span>
                        </>
                      ) : (
                        <>
                          {ShieldCheckIcon && <ShieldCheckIcon size={16} />}
                          <span>{selectedMethodCode === 'RTR' ? 'Calculate RTR Eligibility' : 'Calculate Eligibility'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {calcBanner && (
                    <div className={`bo-cv-salary-banner is-${calcBanner.type}`}>
                      <div className="bo-cv-salary-banner-icon">
                        {calcBanner.type === 'success' && (CheckCircleIcon ? <CheckCircleIcon size={16} /> : '✓')}
                        {calcBanner.type === 'error' && (AlertTriangleIcon ? <AlertTriangleIcon size={16} /> : '⚠️')}
                        {calcBanner.type === 'warning' && (AlertCircleIcon ? <AlertCircleIcon size={16} /> : 'ℹ️')}
                        {calcBanner.type === 'info' && (InfoIcon ? <InfoIcon size={16} /> : 'ℹ️')}
                      </div>
                      <div className="bo-cv-salary-banner-msg">{calcBanner.message}</div>
                    </div>
                  )}
                </div>

                </div>
                )}

                {calcSheetTab === 'results' && (
                <div className="bo-cv-calc-pane" data-pane="results">
                {/* ── Section 8: Eligibility Assessment Result ─────────────────── */}
                {!(selectedMethodCode === 'RTR' ? currentRtrAssessment : currentAssessment) && (
                  <div className="bo-cv-calc-empty-result">
                    <div className="bo-cv-calc-empty-icon">
                      {BarChartIcon && <BarChartIcon size={22} />}
                    </div>
                    <h4>No eligibility result yet</h4>
                    <p>Complete Inputs and Settings, then run Calculate to see the decision amount here.</p>
                    <button
                      type="button"
                      className="bo-btn bo-btn--primary"
                      onClick={() => setCalcSheetTab('settings')}
                    >
                      Go to Settings &amp; Calculate
                    </button>
                  </div>
                )}
                {selectedMethodCode === 'RTR' ? (
                  currentRtrAssessment && (
                    <div className="bo-cv-assess-section bo-cv-result-section">
                      <div className="bo-cv-assess-section-header">
                        <div className="bo-cv-assess-section-title-wrap">
                          <span className="bo-cv-assess-section-num is-result">✓</span>
                          <div>
                            <h3 className="bo-cv-assess-section-title">RTR Eligibility Assessment Result</h3>
                            <p className="bo-cv-assess-section-sub">
                              Authoritative decision engine output for {selectedApplicant?.name || 'Applicant'} &bull; RTR Method (Repayment Track Record).
                            </p>
                          </div>
                        </div>
                        <div className="bo-cv-result-header-badges">
                          <span className="bo-cv-result-method-badge">RTR Method</span>
                          <span className="bo-cv-result-status-badge is-eligible">
                            {Number(currentRtrAssessment.finalLoanEligibility) > 0 ? 'Eligible' : 'Calculated'}
                          </span>
                        </div>
                      </div>

                      {/* Hero Card: Final Loan Eligibility */}
                      <div className="bo-cv-result-hero-card">
                        <div className="bo-cv-result-hero-main">
                          <span className="bo-cv-result-hero-label">Final Loan Eligibility</span>
                          <div className="bo-cv-result-hero-amount">
                            {formatCurrency(currentRtrAssessment.finalLoanEligibility)}
                          </div>
                          <div className="bo-cv-result-hero-sub-row">
                            <div className="bo-cv-result-hero-sub-item">
                              <span>Requested: </span>
                              <strong>{formatCurrency(appDetails.loanAmount)}</strong>
                            </div>
                            <div className="bo-cv-result-hero-sub-divider">•</div>
                            <div className="bo-cv-result-hero-sub-item">
                              <span>EMI Factor: </span>
                              <strong>{currentRtrAssessment.emiAmountFactor != null ? currentRtrAssessment.emiAmountFactor : '—'}</strong>
                            </div>
                            {(selectedRtrLoan?.lenderName || currentRtrAssessment.selectedRTRLoanDetailsId) && (
                              <>
                                <div className="bo-cv-result-hero-sub-divider">•</div>
                                <div className="bo-cv-result-hero-sub-item">
                                  <span>Selected Facility: </span>
                                  <strong>
                                    {selectedRtrLoan?.lenderName ||
                                      `RTR Loan ID: ${currentRtrAssessment.selectedRTRLoanDetailsId}`}
                                  </strong>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="bo-cv-result-hero-status-box">
                          <span className="bo-cv-result-hero-status-label">Assessment Status</span>
                          <strong className="bo-cv-result-hero-status-val is-eligible">
                            {Number(currentRtrAssessment.finalLoanEligibility) > 0 ? 'Eligible' : 'Calculated'}
                          </strong>
                        </div>
                      </div>

                      {/* Result Metrics Grid */}
                      <div className="bo-cv-result-metrics-grid">
                        {/* Assessed Income */}
                        <div className="bo-cv-result-metric-card">
                          <span className="bo-cv-result-metric-label">Assessed Income</span>
                          <strong className="bo-cv-result-metric-val">
                            {currentRtrAssessment.assessedIncome != null ? formatCurrency(currentRtrAssessment.assessedIncome) : '—'}
                          </strong>
                          <span className="bo-cv-result-metric-sub">EMI × Multiplier evaluated capacity</span>
                        </div>

                        {/* Final Loan Eligibility */}
                        <div className="bo-cv-result-metric-card">
                          <span className="bo-cv-result-metric-label">Final Loan Eligibility</span>
                          <strong className="bo-cv-result-metric-val">
                            {currentRtrAssessment.finalLoanEligibility != null ? formatCurrency(currentRtrAssessment.finalLoanEligibility) : '—'}
                          </strong>
                          <span className="bo-cv-result-metric-sub">Net computed loan ceiling</span>
                        </div>

                        {/* Selected RTR Facility */}
                        <div className="bo-cv-result-metric-card">
                          <span className="bo-cv-result-metric-label">Selected Facility</span>
                          <strong className="bo-cv-result-metric-val">
                            {selectedRtrLoan?.lenderName ||
                              (currentRtrAssessment.selectedRTRLoanDetailsId
                                ? `RTR Loan ID: ${currentRtrAssessment.selectedRTRLoanDetailsId}`
                                : '—')}
                          </strong>
                          <span className="bo-cv-result-metric-sub">
                            {currentRtrAssessment.selectedRTRLoanDetailsId
                              ? `RTR Loan ID: ${currentRtrAssessment.selectedRTRLoanDetailsId}`
                              : 'Norm matched facility'}
                          </span>
                        </div>

                        {/* Paid Amount */}
                        <div className="bo-cv-result-metric-card">
                          <span className="bo-cv-result-metric-label">Paid Amount (Sanction - POS)</span>
                          <strong className="bo-cv-result-metric-val">
                            {currentRtrAssessment.paidAmount != null ? formatCurrency(currentRtrAssessment.paidAmount) : '—'}
                          </strong>
                          <span className="bo-cv-result-metric-sub">Total principal repaid</span>
                        </div>

                        {/* Applicable EMI Multiplier */}
                        <div className="bo-cv-result-metric-card">
                          <span className="bo-cv-result-metric-label">Applicable EMI Multiplier</span>
                          <strong className="bo-cv-result-metric-val bo-cv-foir-val">
                            {currentRtrAssessment.applicableEMIMultiplier != null ? `${currentRtrAssessment.applicableEMIMultiplier}x` : '—'}
                          </strong>
                          <span className="bo-cv-result-metric-sub">Norm multiplier applied</span>
                        </div>

                        {/* Max Top Up Amount */}
                        <div className="bo-cv-result-metric-card">
                          <span className="bo-cv-result-metric-label">Max Top-Up Amount</span>
                          <strong className="bo-cv-result-metric-val">
                            {currentRtrAssessment.maxTopUpAmount != null ? formatCurrency(currentRtrAssessment.maxTopUpAmount) : '—'}
                          </strong>
                          <span className="bo-cv-result-metric-sub">Based on norm top-up %</span>
                        </div>

                        {/* Selected Facility Monthly EMI */}
                        <div className="bo-cv-result-metric-card">
                          <span className="bo-cv-result-metric-label">Benchmark Monthly EMI</span>
                          <strong className="bo-cv-result-metric-val">
                            {currentRtrAssessment.emiAmount != null ? formatCurrency(currentRtrAssessment.emiAmount) : '—'}
                          </strong>
                          <span className="bo-cv-result-metric-sub">Selected facility EMI</span>
                        </div>

                        {/* EMI Amount Factor */}
                        <div className="bo-cv-result-metric-card">
                          <span className="bo-cv-result-metric-label">EMI Amount Factor</span>
                          <strong className="bo-cv-result-metric-val">
                            {currentRtrAssessment.emiAmountFactor != null ? String(currentRtrAssessment.emiAmountFactor) : '—'}
                          </strong>
                          <span className="bo-cv-result-metric-sub">Underwriting tenure factor</span>
                        </div>
                      </div>

                      {/* Metadata Footer */}
                      <div className="bo-cv-result-footer">
                        <div className="bo-cv-result-footer-left">
                          <span className="bo-cv-result-version-pill">
                            Assessment #{currentRtrAssessment.applicationRTRAssessmentId}
                          </span>
                          <span className="bo-cv-result-time">
                            Calculated:{' '}
                            {currentRtrAssessment.createdAt
                              ? new Date(currentRtrAssessment.createdAt).toLocaleString('en-IN')
                              : '—'}
                          </span>
                          {currentRtrAssessment.createdBy && (
                            <span className="bo-cv-result-user">
                              User #{currentRtrAssessment.createdBy}
                            </span>
                          )}
                        </div>
                        <div className="bo-cv-result-footer-right">
                          {currentRtrAssessment.isCurrent && (
                            <span className="bo-cv-current-active-tag">Current Active RTR Assessment ✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  currentAssessment && (
                    <div className="bo-cv-assess-section bo-cv-result-section">
                      <div className="bo-cv-assess-section-header">
                        <div className="bo-cv-assess-section-title-wrap">
                          <span className="bo-cv-assess-section-num is-result">✓</span>
                          <div>
                            <h3 className="bo-cv-assess-section-title">Eligibility Assessment Result</h3>
                            <p className="bo-cv-assess-section-sub">
                              Authoritative decision engine output for {selectedApplicant?.name || 'Applicant'} &bull;{' '}
                              {currentAssessment.assessmentMethodId === 1
                                ? 'Income Method'
                                : currentAssessment.assessmentMethodId === 4
                                ? 'Normal Income'
                                : 'ABB Method'}.
                            </p>
                          </div>
                        </div>
                        <div className="bo-cv-result-header-badges">
                          <span className="bo-cv-result-method-badge">
                            {currentAssessment.assessmentMethodId === 1
                              ? 'Income Method'
                              : currentAssessment.assessmentMethodId === 4
                              ? 'Normal Income'
                              : 'ABB Method'}
                          </span>
                          <span
                            className={`bo-cv-result-status-badge ${
                              String(currentAssessment.status || '').toLowerCase().includes('eligible')
                                ? 'is-eligible'
                                : 'is-shortfall'
                            }`}
                          >
                            {currentAssessment.status || 'Calculated'}
                          </span>
                        </div>
                      </div>

                      {/* Hero Card: Maximum Eligible Loan Amount */}
                      <div className="bo-cv-result-hero-card">
                        <div className="bo-cv-result-hero-main">
                          <span className="bo-cv-result-hero-label">Maximum Eligible Loan Amount</span>
                          <div className="bo-cv-result-hero-amount">
                            {formatCurrency(currentAssessment.maximumEligibleLoanAmount)}
                          </div>
                          <div className="bo-cv-result-hero-sub-row">
                            <div className="bo-cv-result-hero-sub-item">
                              <span>Requested: </span>
                              <strong>{formatCurrency(currentAssessment.requestedLoanAmount)}</strong>
                            </div>
                            {currentCalcSettings.recommendedLoanAmount || currentAssessment.recommendedLoanAmount ? (
                              <>
                                <div className="bo-cv-result-hero-sub-divider">•</div>
                                <div className="bo-cv-result-hero-sub-item">
                                  <span>Recommended: </span>
                                  <strong>
                                    {formatCurrency(
                                      currentCalcSettings.recommendedLoanAmount || currentAssessment.recommendedLoanAmount
                                    )}
                                  </strong>
                                </div>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="bo-cv-result-hero-status-box">
                          <span className="bo-cv-result-hero-status-label">Assessment Status</span>
                          <strong
                            className={`bo-cv-result-hero-status-val ${
                              String(currentAssessment.status || '').toLowerCase().includes('eligible')
                                ? 'is-eligible'
                                : 'is-shortfall'
                            }`}
                          >
                            {currentAssessment.status || 'Calculated'}
                          </strong>
                        </div>
                      </div>

                      {/* Result Metrics Grid */}
                      <div className="bo-cv-result-metrics-grid">
                        {/* Considered Income / ABB */}
                        <div className="bo-cv-result-metric-card">
                          <span className="bo-cv-result-metric-label">
                            {currentAssessment.assessmentMethodId === 1
                              ? 'Total Considered Income'
                              : currentAssessment.assessmentMethodId === 4
                              ? 'Eligible Monthly Income'
                              : 'Average Monthly ABB'}
                          </span>
                          <strong className="bo-cv-result-metric-val">
                            {currentAssessment.assessmentMethodId === 1 || currentAssessment.assessmentMethodId === 4
                              ? currentAssessment.totalConsideredIncome != null
                                ? formatCurrency(currentAssessment.totalConsideredIncome)
                                : 'Not Applicable'
                              : currentAssessment.averageABB != null
                              ? formatCurrency(currentAssessment.averageABB)
                              : 'Not Applicable'}
                          </strong>
                          <span className="bo-cv-result-metric-sub">
                            {currentAssessment.assessmentMethodId === 1
                              ? '3-Month considered salary income'
                              : currentAssessment.assessmentMethodId === 4
                              ? 'Evaluated monthly income from business & other sources'
                              : 'Multi-account monthly average balance'}
                          </span>
                        </div>

                        {/* Existing EMI */}
                        <div className="bo-cv-result-metric-card">
                          <span className="bo-cv-result-metric-label">Existing Monthly EMI</span>
                          <strong className="bo-cv-result-metric-val">
                            {currentAssessment.existingEMI != null ? formatCurrency(currentAssessment.existingEMI) : '₹0'}
                          </strong>
                          <span className="bo-cv-result-metric-sub">Active debt obligations</span>
                        </div>

                        {/* Policy FOIR Limit */}
                        <div className="bo-cv-result-metric-card">
                          <span className="bo-cv-result-metric-label">Policy FOIR Applied</span>
                          <strong className="bo-cv-result-metric-val bo-cv-foir-val">
                            {currentAssessment.foirPercentApplied != null ? `${currentAssessment.foirPercentApplied}%` : '—'}
                          </strong>
                          <span className="bo-cv-result-metric-sub">Underwriting policy cap</span>
                        </div>

                        {/* Eligible EMI */}
                        <div className="bo-cv-result-metric-card">
                          <span className="bo-cv-result-metric-label">Eligible Monthly EMI</span>
                          <strong className="bo-cv-result-metric-val">
                            {currentAssessment.eligibleEMI != null ? formatCurrency(currentAssessment.eligibleEMI) : '—'}
                          </strong>
                          <span className="bo-cv-result-metric-sub">Net repayment capacity</span>
                        </div>

                        {/* Proposed ROI */}
                        <div className="bo-cv-result-metric-card">
                          <span className="bo-cv-result-metric-label">Proposed ROI</span>
                          <strong className="bo-cv-result-metric-val">
                            {currentAssessment.proposedROI != null ? `${currentAssessment.proposedROI}% p.a.` : '—'}
                          </strong>
                          <span className="bo-cv-result-metric-sub">Annual interest rate applied</span>
                        </div>

                        {/* Proposed Tenure */}
                        <div className="bo-cv-result-metric-card">
                          <span className="bo-cv-result-metric-label">Proposed Tenure</span>
                          <strong className="bo-cv-result-metric-val">
                            {currentAssessment.proposedTenureMonths != null ? `${currentAssessment.proposedTenureMonths} Months` : '—'}
                          </strong>
                          <span className="bo-cv-result-metric-sub">Amortization duration</span>
                        </div>

                        {/* EMI Factor */}
                        <div className="bo-cv-result-metric-card">
                          <span className="bo-cv-result-metric-label">EMI Factor</span>
                          <strong className="bo-cv-result-metric-val">
                            {currentAssessment.emiFactor != null
                              ? Number(currentAssessment.emiFactor).toLocaleString('en-IN', { maximumFractionDigits: 2 })
                              : '—'}
                          </strong>
                          <span className="bo-cv-result-metric-sub">Per lakh factor coefficient</span>
                        </div>

                        {/* Actual FOIR */}
                        <div className="bo-cv-result-metric-card">
                          <span className="bo-cv-result-metric-label">Actual Calculated FOIR</span>
                          <strong
                            className={`bo-cv-result-metric-val ${
                              currentAssessment.foirPercentApplied != null &&
                              currentAssessment.actualFOIR != null &&
                              Number(currentAssessment.actualFOIR) > Number(currentAssessment.foirPercentApplied)
                                ? 'is-over-foir'
                                : ''
                            }`}
                          >
                            {currentAssessment.actualFOIR != null ? `${Number(currentAssessment.actualFOIR).toFixed(2)}%` : '—'}
                          </strong>
                          <span className="bo-cv-result-metric-sub">
                            Benchmark: {currentAssessment.foirPercentApplied ? `${currentAssessment.foirPercentApplied}%` : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Metadata Footer */}
                      <div className="bo-cv-result-footer">
                        <div className="bo-cv-result-footer-left">
                          <span className="bo-cv-result-version-pill">
                            Version {currentAssessment.calculationVersion || 1}
                          </span>
                          <span className="bo-cv-result-time">
                            Calculated:{' '}
                            {currentAssessment.calculatedAt
                              ? new Date(currentAssessment.calculatedAt).toLocaleString('en-IN')
                              : '—'}
                          </span>
                          <span className="bo-cv-result-user">
                            By: {currentAssessment.calculatedByRole || 'BackOffice'} (User #{currentAssessment.calculatedByUserId})
                          </span>
                        </div>
                        <div className="bo-cv-result-footer-right">
                          {currentAssessment.isCurrent && (
                            <span className="bo-cv-current-active-tag">Current Active Assessment ✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}

                </div>
                )}

                      </div>

                      <footer className="bo-cv-calc-sheet-footer">
                        <div className="bo-cv-calc-sheet-footer-hint">
                          <span className="bo-cv-calc-step-pill">
                            Step {calcSheetTab === 'inputs' ? '1' : calcSheetTab === 'settings' ? '2' : '3'} of 3
                          </span>
                          <span>
                            {calcSheetTab === 'inputs'
                              ? 'Enter method inputs, then continue to settings.'
                              : calcSheetTab === 'settings'
                              ? (selectedMethodCode === 'RTR'
                                  ? `${rtrSummaryMetrics.validCount} active RTR facilities ready`
                                  : 'Review overrides, then run eligibility.')
                              : ((selectedMethodCode === 'RTR' ? currentRtrAssessment : currentAssessment)
                                  ? 'Review the decision output below.'
                                  : 'No result yet — run calculation from Settings.')}
                          </span>
                        </div>
                        <div className="bo-cv-calc-sheet-footer-actions">
                          {calcSheetTab !== 'inputs' && (
                            <button
                              type="button"
                              className="bo-btn bo-btn--outline"
                              onClick={() =>
                                setCalcSheetTab(calcSheetTab === 'results' ? 'settings' : 'inputs')
                              }
                            >
                              Back
                            </button>
                          )}
                          {calcSheetTab === 'inputs' && (
                            <button
                              type="button"
                              className="bo-btn bo-btn--primary"
                              onClick={() => setCalcSheetTab('settings')}
                            >
                              Continue to Settings
                            </button>
                          )}
                          {calcSheetTab === 'settings' && (
                            <>
                              <button
                                type="button"
                                className="bo-btn bo-btn--outline"
                                onClick={() => setCalcSheetTab('results')}
                              >
                                Skip to Results
                              </button>
                              <button
                                type="button"
                                className="bo-btn bo-btn--primary bo-cv-calc-sheet-run-btn"
                                onClick={handleCalculateEligibility}
                                disabled={
                                  calculating ||
                                  !calculationAppProdId ||
                                  (selectedMethodCode !== 'RTR' && !selectedEmploymentIncomeDetailsId) ||
                                  (selectedMethodCode === 'RTR' && rtrSummaryMetrics.validCount === 0)
                                }
                              >
                                {calculating ? (
                                  <>
                                    <span className="bo-cv-btn-spinner" />
                                    <span>Calculating...</span>
                                  </>
                                ) : (
                                  <>
                                    {ZapIcon ? <ZapIcon size={15} /> : ShieldCheckIcon && <ShieldCheckIcon size={15} />}
                                    <span>
                                      {selectedMethodCode === 'RTR'
                                        ? 'Calculate RTR'
                                        : 'Calculate Eligibility'}
                                    </span>
                                  </>
                                )}
                              </button>
                            </>
                          )}
                          {calcSheetTab === 'results' && (
                            <>
                              <button
                                type="button"
                                className="bo-btn bo-btn--outline"
                                onClick={() => setCalcSheetTab('settings')}
                              >
                                Recalculate
                              </button>
                              <button
                                type="button"
                                className="bo-btn bo-btn--primary"
                                onClick={() => setCalcWorkspaceOpen(false)}
                              >
                                Done
                              </button>
                            </>
                          )}
                        </div>
                      </footer>
                    </div>
                  </div>
                )}

                {/* ── Company Recommendation Dock ────────────────────────── */}
                <section className="bo-cv-elig-rec-dock" aria-label="Company recommendation">
                  <div className="bo-cv-elig-rec-dock-head">
                    <div>
                      <span className="bo-cv-elig-control-label">Company Recommendation</span>
                      <p className="bo-cv-elig-rec-dock-sub">
                        Manual underwriting decision — not locked to eligible or requested amount.
                      </p>
                    </div>
                    <span className="bo-cv-elig-soft-pill">Decision</span>
                  </div>

                  {recommendationBanner && (
                    <div className={`bo-cv-salary-banner is-${recommendationBanner.type}`}>
                      <div className="bo-cv-salary-banner-icon">
                        {recommendationBanner.type === 'success' && (CheckCircleIcon ? <CheckCircleIcon size={16} /> : '✓')}
                        {recommendationBanner.type === 'error' && (AlertTriangleIcon ? <AlertTriangleIcon size={16} /> : '⚠️')}
                        {recommendationBanner.type === 'warning' && (AlertCircleIcon ? <AlertCircleIcon size={16} /> : 'ℹ️')}
                        {recommendationBanner.type === 'info' && (InfoIcon ? <InfoIcon size={16} /> : 'ℹ️')}
                      </div>
                      <div className="bo-cv-salary-banner-msg">{recommendationBanner.message}</div>
                    </div>
                  )}

                  <div className="bo-cv-elig-rec-row">
                    <label className="bo-cv-elig-rec-field" htmlFor="bo-cv-rec-amount-input">
                      <span>Recommended Loan Amount</span>
                      <div className="bo-cv-elig-rec-input-wrap">
                        <span className="bo-cv-rec-currency-symbol">₹</span>
                        <input
                          id="bo-cv-rec-amount-input"
                          type="number"
                          min="1000"
                          step="5000"
                          placeholder="e.g. 200000"
                          className="bo-cv-rec-input"
                          value={currentCalcSettings.recommendedLoanAmount || ''}
                          onChange={(e) =>
                            updateCurrentCalcSettings((prev) => ({
                              ...prev,
                              recommendedLoanAmount: e.target.value,
                            }))
                          }
                          aria-label="Recommended Loan Amount"
                        />
                      </div>
                    </label>
                    <button
                      type="button"
                      className="bo-cv-elig-primary-btn bo-cv-elig-rec-save"
                      onClick={handleSaveRecommendation}
                      disabled={recommendationSaving || !currentAssessment}
                    >
                      {recommendationSaving ? (
                        <>
                          <span className="bo-cv-btn-spinner" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          {SaveIcon && <SaveIcon size={14} />}
                          <span>Save Recommendation</span>
                        </>
                      )}
                    </button>
                  </div>
                </section>
            </div>
          )}

          {/* PD field assessment is shown directly below the selected PD mode. */}
          {activeStep === 14 && (
            <>
              <div className="bo-cv-step-panel bo-cv-pd-assessment-panel">
                <div className="bo-cv-step-panel-header">
                  <div className="bo-cv-step-header-left">
                    <div className="bo-cv-step-badge-num">09</div>
                    <div>
                      <h2 className="bo-cv-step-panel-title">PD Field Assessment</h2>
                      <p className="bo-cv-step-panel-desc">
                        Record the personal discussion findings and underwriting observations for this application.
                      </p>
                    </div>
                  </div>
                  <span className="bo-cv-step-tag-pill">Step 09 of 11</span>
                </div>

                <section className="bo-cv-recommendation-sheet" aria-label="Credit recommendation assessment">
                  {recommendationSheets.map((sheet) => (
                    <article className="bo-cv-pd-form" key={sheet.id}>
                      <div className="bo-cv-pd-form-section-head">
                        <div className="bo-cv-pd-form-section-number">1</div>
                        <div><h3>Visit details</h3><p>Capture the personal discussion and end-use information.</p></div>
                      </div>

                      <div className="bo-cv-rec-fields-grid">
                        <label className="bo-cv-rec-field">
                          <span>Date of PD visit</span>
                          <input type="date" value={sheet.pdVisitDate} onChange={(e) => updateRecommendationSheet(sheet.id, 'pdVisitDate', e.target.value)} />
                        </label>
                        <label className="bo-cv-rec-field">
                          <span>End-use categorization</span>
                          <input type="text" placeholder="e.g. Business expansion" value={sheet.endUseCategory} onChange={(e) => updateRecommendationSheet(sheet.id, 'endUseCategory', e.target.value)} />
                        </label>
                        <label className="bo-cv-rec-field bo-cv-rec-field--wide">
                          <span>Address where PD was conducted</span>
                          <input type="text" placeholder="Enter discussion / visit address" value={sheet.pdAddress} onChange={(e) => updateRecommendationSheet(sheet.id, 'pdAddress', e.target.value)} />
                        </label>
                        <label className="bo-cv-rec-field">
                          <span>Personal discussion / site visit</span>
                          <input type="text" placeholder="Enter visit details" value={sheet.personalDiscussionSiteVisit} onChange={(e) => updateRecommendationSheet(sheet.id, 'personalDiscussionSiteVisit', e.target.value)} />
                        </label>
                        <label className="bo-cv-rec-field">
                          <span>End use</span>
                          <input type="text" placeholder="Describe intended use" value={sheet.endUse} onChange={(e) => updateRecommendationSheet(sheet.id, 'endUse', e.target.value)} />
                        </label>
                        <label className="bo-cv-rec-field">
                          <span>Disbursement transaction</span>
                          <input type="text" placeholder="Enter transaction details" value={sheet.disbursementTransaction} onChange={(e) => updateRecommendationSheet(sheet.id, 'disbursementTransaction', e.target.value)} />
                        </label>
                      </div>

                      <div className="bo-cv-pd-form-section-head">
                        <div className="bo-cv-pd-form-section-number">2</div>
                        <div><h3>Applicant profiles</h3><p>Write a brief profile for the applicant and co-applicant.</p></div>
                      </div>
                      <div className="bo-cv-rec-narratives-grid">
                        {[
                          ['applicantProfile', 'Applicant profile', 'Summarize applicant background, income and repayment capacity.'],
                          ['coApplicantProfile', 'Co-applicant profile', 'Summarize co-applicant background and financial position.'],
                        ].map(([field, label, placeholder]) => (
                          <label className="bo-cv-rec-field bo-cv-rec-field--narrative" key={field}>
                            <span>{label} <em>Maximum 1,000 characters</em></span>
                            <textarea rows={5} maxLength={1000} placeholder={placeholder} value={sheet[field]} onChange={(e) => updateRecommendationSheet(sheet.id, field, e.target.value)} />
                            <small>{sheet[field].length}/1000</small>
                          </label>
                        ))}
                      </div>

                      <div className="bo-cv-pd-form-section-head">
                        <div className="bo-cv-pd-form-section-number">3</div>
                        <div><h3>Credit review and recommendation</h3><p>Record the key findings and any conditions for sanction.</p></div>
                      </div>
                      <div className="bo-cv-rec-findings-grid">
                        {[
                          ['bureauReport', 'Bureau report — applicant & co-applicant'],
                          ['proposedCollateral', 'Proposed collateral'],
                          ['legalAndTechnical', 'Legal and technical review'],
                          ['strengths', 'Strengths'],
                          ['concerns', 'Concerns, if any'],
                          ['recommendation', 'Recommendation'],
                        ].map(([field, label]) => (
                          <label className="bo-cv-rec-field bo-cv-rec-field--narrative" key={field}>
                            <span>{label}</span>
                            <textarea rows={3} placeholder={`Enter ${label.toLowerCase()}`} value={sheet[field]} onChange={(e) => updateRecommendationSheet(sheet.id, field, e.target.value)} />
                          </label>
                        ))}
                        <div className="bo-cv-rec-field bo-cv-rec-field--narrative bo-cv-rec-condition-field">
                          <div className="bo-cv-rec-condition-label-row">
                            <span>Other specified sanction conditions</span>
                            <button
                              type="button"
                              className="bo-cv-rec-condition-add"
                              onClick={() => addSanctionCondition(sheet.id)}
                              aria-label="Add sanction condition point"
                            >
                              {PlusIcon && <PlusIcon size={14} />} <span>Add point</span>
                            </button>
                          </div>
                          <div className="bo-cv-rec-condition-list">
                            {sheet.otherSanctionConditions.map((condition, conditionIndex) => (
                              <div className="bo-cv-rec-condition-row" key={`${sheet.id}-condition-${conditionIndex}`}>
                                <span className="bo-cv-rec-condition-number">{conditionIndex + 1}</span>
                                <textarea
                                  rows={3}
                                  placeholder="Enter sanction condition"
                                  value={condition}
                                  onChange={(e) => updateSanctionCondition(sheet.id, conditionIndex, e.target.value)}
                                  aria-label={`Sanction condition ${conditionIndex + 1}`}
                                />
                                <button
                                  type="button"
                                  className="bo-cv-rec-condition-remove"
                                  onClick={() => removeSanctionCondition(sheet.id, conditionIndex)}
                                  disabled={sheet.otherSanctionConditions.length === 1}
                                  aria-label={`Remove sanction condition ${conditionIndex + 1}`}
                                  title={sheet.otherSanctionConditions.length === 1 ? 'At least one condition point is required' : 'Remove this point'}
                                >
                                  {MinusIcon && <MinusIcon size={15} />}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </section>
              </div>

              {/* Final Remarks & Forwarding Panel strictly inside Step 15 */}
              <section className="bo-cv-final-remarks-panel" aria-labelledby="bo-cv-final-remarks-heading">
                <div className="bo-cv-final-remarks-header">
                  <h3 id="bo-cv-final-remarks-heading" className="bo-cv-final-remarks-title">
                    FINAL REMARKS
                  </h3>
                </div>

                <div className="bo-cv-final-remarks-body">
                  <textarea
                    id="bo-cv-final-remarks-input"
                    className={`bo-cv-final-remarks-textarea ${finalRemarksError ? 'is-invalid' : ''}`}
                    rows={4}
                    placeholder="Enter remarks for Credit Officer..."
                    value={finalRemarks}
                    onChange={(e) => {
                      setFinalRemarks(e.target.value);
                      if (finalRemarksError && e.target.value.trim()) {
                        setFinalRemarksError('');
                      }
                      if (finalRemarksBanner) {
                        setFinalRemarksBanner(null);
                      }
                    }}
                  />

                  {finalRemarksError && (
                    <div className="bo-cv-final-remarks-error">
                      {AlertCircleIcon && <AlertCircleIcon size={14} />}
                      <span>{finalRemarksError}</span>
                    </div>
                  )}

                  {finalRemarksBanner && (
                    <div className={`bo-cv-final-remarks-banner bo-cv-final-remarks-banner--${finalRemarksBanner.type}`}>
                      {finalRemarksBanner.type === 'info' && InfoIcon && <InfoIcon size={16} />}
                      {finalRemarksBanner.type === 'error' && AlertCircleIcon && <AlertCircleIcon size={16} />}
                      <span>{finalRemarksBanner.message}</span>
                    </div>
                  )}
                </div>

                <div className="bo-cv-final-remarks-footer">
                  <button
                    type="button"
                    className="bo-btn bo-btn--primary bo-cv-btn-send-credit-officer"
                    onClick={handleSendToCreditOfficer}
                    disabled={isSendingToCreditOfficer}
                  >
                    {SendIcon && <SendIcon size={15} />}
                    <span>{isSendingToCreditOfficer ? 'Sending...' : 'Send to Credit Officer'}</span>
                  </button>
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      {/* ── View-Only 11-Step Inspection Modal (Single-Fetch Shared Data) ── */}
      {selectedStepNumber && selectedStepDef && (
        <VerificationStepModal
          stepNumber={selectedStepNumber}
          stepDefinition={selectedStepDef}
          customerData={verificationData}
          onClose={handleCloseModal}
        />
      )}

      {/* ── Health Check Findings Modal ── */}
      {findingsModal.open && (
        <div
          className="bo-cv-confirm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bo-cv-health-findings-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeFindingsModal();
            }
          }}
        >
          <div className="bo-cv-confirm-modal-card bo-cv-health-findings-modal">
            <div className="bo-cv-confirm-modal-header">
              <div className="bo-cv-confirm-modal-icon-badge" style={{ background: '#eaf5ee', color: '#0f7a4c', borderColor: '#c6e6d4' }}>
                {FileTextIcon ? <FileTextIcon size={18} /> : <span>✎</span>}
              </div>
              <div className="bo-cv-confirm-modal-title-group">
                <h3 id="bo-cv-health-findings-modal-title" className="bo-cv-confirm-modal-title">
                  Findings / Status
                </h3>
                <p className="bo-cv-confirm-modal-subtitle">
                  {findingsModal.label}
                </p>
              </div>
              <button
                type="button"
                className="bo-cv-confirm-modal-close"
                onClick={closeFindingsModal}
                aria-label="Close findings modal"
              >
                {XIcon ? <XIcon size={16} /> : <span>×</span>}
              </button>
            </div>

            <div className="bo-cv-confirm-modal-body">
              <div className="bo-cv-confirm-remarks-block">
                <label className="bo-cv-confirm-remarks-label" htmlFor="health-check-findings-draft">
                  Enter findings / status
                </label>
                <textarea
                  id="health-check-findings-draft"
                  className="bo-cv-confirm-remarks-textarea"
                  value={findingsModal.draft}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFindingsModal((prev) => ({ ...prev, draft: val }));
                  }}
                  placeholder="Describe the check outcome, remarks, or status notes…"
                  rows={5}
                  autoFocus
                />
              </div>
            </div>

            <div className="bo-cv-confirm-modal-footer">
              <button
                type="button"
                className="bo-cv-confirm-btn-cancel"
                onClick={closeFindingsModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bo-cv-btn-save-remarks"
                onClick={saveFindingsModal}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Document Rejection Confirmation Modal ── */}
      {rejectConfirmModal.open && (
        <div
          className="bo-cv-confirm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bo-cv-confirm-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingRejection) {
              handleCancelReject();
            }
          }}
        >
          <div className="bo-cv-confirm-modal-card">
            <div className="bo-cv-confirm-modal-header">
              <div className="bo-cv-confirm-modal-icon-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>
                {RotateCcwIcon ? <RotateCcwIcon size={18} /> : <span>↩</span>}
              </div>
              <div className="bo-cv-confirm-modal-title-group">
                <h3 id="bo-cv-confirm-modal-title" className="bo-cv-confirm-modal-title">
                  Return Document to RM
                </h3>
                <p className="bo-cv-confirm-modal-subtitle">
                  {rejectConfirmModal.stepLabel ? `Document: ${rejectConfirmModal.stepLabel}` : 'This action will return the document to the RM for re-upload.'}
                </p>
              </div>
              <button
                type="button"
                className="bo-cv-confirm-modal-close"
                onClick={handleCancelReject}
                disabled={isSubmittingRejection}
                aria-label="Close modal"
              >
                {XIcon ? <XIcon size={16} /> : <span>×</span>}
              </button>
            </div>

            <div className="bo-cv-confirm-modal-body">
              <p className="bo-cv-confirm-modal-question">
                Are you sure you want to return this document?
              </p>

              <div className="bo-cv-confirm-remarks-block">
                <label className="bo-cv-confirm-remarks-label" htmlFor="return-modal-remarks">
                  Remarks <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  id="return-modal-remarks"
                  className={`bo-cv-confirm-remarks-textarea ${rejectConfirmModal.error ? 'is-invalid' : ''}`}
                  value={rejectConfirmModal.remarks || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRejectConfirmModal((prev) => ({
                      ...prev,
                      remarks: val,
                      error: val.trim() ? '' : prev.error,
                    }));
                  }}
                  placeholder="Enter rejection reason / remarks for RM..."
                  rows={3}
                  autoFocus
                />
                {rejectConfirmModal.error && (
                  <div className="bo-cv-confirm-remarks-error">
                    {rejectConfirmModal.error}
                  </div>
                )}
              </div>
            </div>

            <div className="bo-cv-confirm-modal-footer">
              <button
                type="button"
                className="bo-cv-confirm-btn-cancel"
                onClick={handleCancelReject}
                disabled={isSubmittingRejection}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bo-cv-confirm-btn-reject"
                onClick={handleConfirmReject}
                disabled={isSubmittingRejection}
              >
                {isSubmittingRejection ? 'Sending...' : 'Send to RM'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Save Remarks Confirmation Modal ── */}
      {saveRemarksModal.open && (
        <div
          className="bo-cv-confirm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bo-cv-save-remarks-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCancelSaveRemarks();
            }
          }}
        >
          <div className="bo-cv-confirm-modal-card">
            <div className="bo-cv-confirm-modal-header">
              <div className="bo-cv-confirm-modal-icon-badge" style={{ background: '#eaf5ee', color: '#0f7a4c' }}>
                {CheckCircleIcon ? <CheckCircleIcon size={20} /> : <span>✓</span>}
              </div>
              <div className="bo-cv-confirm-modal-title-group">
                <h3 id="bo-cv-save-remarks-modal-title" className="bo-cv-confirm-modal-title">
                  Confirm Save Remarks
                </h3>
                <p className="bo-cv-confirm-modal-subtitle">
                  {saveRemarksModal.stepLabel ? `${saveRemarksModal.stepLabel} Step Remarks` : 'Step Remarks'}
                </p>
              </div>
              <button
                type="button"
                className="bo-cv-confirm-modal-close"
                onClick={handleCancelSaveRemarks}
                aria-label="Close modal"
              >
                {XIcon ? <XIcon size={16} /> : <span>×</span>}
              </button>
            </div>

            <div className="bo-cv-confirm-modal-body">
              <p className="bo-cv-confirm-modal-question">
                Are you sure you want to save these remarks?
              </p>

              <div className="bo-cv-confirm-remarks-block">
                <span className="bo-cv-confirm-remarks-label">ENTERED REMARKS</span>
                <div className="bo-cv-confirm-remarks-preview">
                  {saveRemarksModal.remarks}
                </div>
              </div>
            </div>

            <div className="bo-cv-confirm-modal-footer">
              <button
                type="button"
                className="bo-cv-confirm-btn-cancel"
                onClick={handleCancelSaveRemarks}
              >
                No
              </button>
              <button
                type="button"
                className="bo-cv-btn-save-remarks"
                onClick={handleConfirmSaveRemarks}
              >
                Yes, Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Document Delete Confirmation Modal (Steps 09, 10, 11/13) ── */}
      {deleteDocModal.open && (
        <div
          className="bo-cv-confirm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bo-cv-delete-doc-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleteDocModal.isDeleting) {
              handleCancelDeleteDocument();
            }
          }}
        >
          <div className="bo-cv-confirm-modal-card">
            <div className="bo-cv-confirm-modal-header">
              <div className="bo-cv-confirm-modal-icon-badge">
                {Trash2Icon ? <Trash2Icon size={20} /> : (AlertTriangleIcon ? <AlertTriangleIcon size={20} /> : <span>🗑</span>)}
              </div>
              <div className="bo-cv-confirm-modal-title-group">
                <h3 id="bo-cv-delete-doc-modal-title" className="bo-cv-confirm-modal-title">
                  Delete Document
                </h3>
                <p className="bo-cv-confirm-modal-subtitle">
                  {deleteDocModal.stepLabel || 'Back Office Document'}
                </p>
              </div>
              <button
                type="button"
                className="bo-cv-confirm-modal-close"
                onClick={handleCancelDeleteDocument}
                disabled={deleteDocModal.isDeleting}
                aria-label="Close modal"
              >
                {XIcon ? <XIcon size={16} /> : <span>×</span>}
              </button>
            </div>

            <div className="bo-cv-confirm-modal-body">
              <p className="bo-cv-confirm-modal-question">
                Are you sure you want to delete this document?
              </p>

              {deleteDocModal.fileName && (
                <div className="bo-cv-confirm-remarks-block">
                  <span className="bo-cv-confirm-remarks-label">ATTACHED FILE</span>
                  <div className="bo-cv-confirm-remarks-preview">
                    {deleteDocModal.fileName}
                  </div>
                </div>
              )}
            </div>

            <div className="bo-cv-confirm-modal-footer">
              <button
                type="button"
                className="bo-cv-confirm-btn-cancel"
                onClick={handleCancelDeleteDocument}
                disabled={deleteDocModal.isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bo-cv-confirm-btn-reject"
                onClick={handleConfirmDeleteDocument}
                disabled={deleteDocModal.isDeleting}
              >
                {deleteDocModal.isDeleting ? 'Deleting...' : 'Delete Document'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Document Preview / Comparison Lightbox Modal ── */}
      {previewModal.open && (
        <div
          className="bo-cv-preview-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bo-cv-preview-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleClosePreviewModal();
            }
          }}
        >
          <div className={`bo-cv-preview-modal-dialog ${previewModal.comparison ? 'bo-cv-preview-modal-dialog--comparison' : ''}`}>
            {/* Modal Header */}
            <div className="bo-cv-preview-modal-header">
              <div className="bo-cv-preview-modal-title-group">
                <div className="bo-cv-preview-modal-icon-badge">
                  {FileTextIcon ? <FileTextIcon size={18} /> : <span>📄</span>}
                </div>
                <div>
                  <h3 id="bo-cv-preview-modal-title" className="bo-cv-preview-modal-title">
                    {previewModal.title}
                  </h3>
                  <p className="bo-cv-preview-modal-subtitle">
                    {previewModal.personName ? `${previewModal.personLabel}: ${previewModal.personName}` : previewModal.personLabel}
                    {previewModal.fileName && previewModal.fileName !== '—' && ` • ${previewModal.fileName}`}
                    {previewModal.fileSize && ` (${formatFileSize(previewModal.fileSize)})`}
                    {previewModal.uploadDate && ` • Uploaded: ${formatUploadDate(previewModal.uploadDate)}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="bo-cv-preview-modal-close"
                onClick={handleClosePreviewModal}
                aria-label="Close preview modal"
              >
                {XIcon ? <XIcon size={18} /> : <span>×</span>}
              </button>
            </div>

            {/* Modal Body */}
            <div className="bo-cv-preview-modal-body">
              {/* If comparison exists (Resubmitted document) */}
              {previewModal.comparison ? (
                <div className="bo-cv-preview-comparison-container">
                  <div className="bo-cv-preview-resubmit-alert">
                    <div className="bo-cv-preview-resubmit-alert-left">
                      <strong>🔄 Resubmitted Document Comparison</strong>
                      <span>Compare previous rejected document with new resubmitted document.</span>
                    </div>
                    {previewModal.rejectionId && (
                      <button
                        type="button"
                        className="bo-cv-preview-btn-verify-resubmitted"
                        disabled={isVerifyingRejection}
                        onClick={async () => {
                          await handleVerifyRejection(
                            previewModal.rejectionId,
                            previewModal.stepLabel,
                            previewModal.stepNum,
                            previewModal.applicantSequence
                          );
                          handleClosePreviewModal();
                        }}
                      >
                        {isVerifyingRejection ? 'Verifying...' : '✓ Verify Resubmitted Document'}
                      </button>
                    )}
                  </div>

                  <div className="bo-cv-preview-comparison-grid">
                    {/* Previous (Rejected) Document */}
                    <div className="bo-cv-preview-comp-col is-previous">
                      <div className="bo-cv-preview-comp-header">
                        <span className="bo-cv-preview-comp-badge is-rejected">
                          {previewModal.comparison.rejection?.manualDocumentIndex !== undefined &&
                          previewModal.comparison.rejection?.manualDocumentIndex !== null
                            ? `Manual Document ${Number(previewModal.comparison.rejection.manualDocumentIndex) + 1} — Previous Version (Rejected)`
                            : 'Previous Version (Rejected)'}
                        </span>
                        {(previewModal.comparison.rejection?.rejectionRemarks || previewModal.comparison.rejection?.remarks) && (
                          <div className="bo-cv-preview-comp-reason">
                            <strong>Reason: </strong>{previewModal.comparison.rejection.rejectionRemarks || previewModal.comparison.rejection.remarks}
                          </div>
                        )}
                      </div>
                      <div className="bo-cv-preview-comp-content">
                        {previewModal.comparison.oldDoc?.url ? (
                          isDocPdf(previewModal.comparison.oldDoc) ? (
                            <iframe
                              src={`${previewModal.comparison.oldDoc.url}#toolbar=0`}
                              title="Previous Version"
                              className="bo-cv-preview-comp-iframe"
                            />
                          ) : (
                            <img
                              src={previewModal.comparison.oldDoc.url}
                              alt="Previous Version"
                              className="bo-cv-preview-comp-img"
                            />
                          )
                        ) : (
                          <div className="bo-cv-preview-empty-box">
                            <span>
                              {previewModal.comparison.oldDoc?.error ||
                                previewModal.comparison.note ||
                                'Previous version file is no longer available on the server.'}
                            </span>
                          </div>
                        )}
                      </div>
                      {previewModal.comparison.oldDoc?.url && (
                        <div className="bo-cv-preview-comp-footer">
                          <button
                            type="button"
                            className="bo-cv-btn-download-sm"
                            onClick={() => handleDownloadFile(previewModal.comparison.oldDoc.url, previewModal.comparison.oldDoc.fileName || 'previous_document')}
                          >
                            {DownloadIcon ? <DownloadIcon size={13} /> : '⬇'} Download Old File
                          </button>
                        </div>
                      )}
                    </div>

                    {/* New (Resubmitted) Document */}
                    <div className="bo-cv-preview-comp-col is-resubmitted">
                      <div className="bo-cv-preview-comp-header">
                        <span className="bo-cv-preview-comp-badge is-resubmitted">
                          {previewModal.comparison.rejection?.manualDocumentIndex !== undefined &&
                          previewModal.comparison.rejection?.manualDocumentIndex !== null
                            ? `Manual Document ${Number(previewModal.comparison.rejection.manualDocumentIndex) + 1} — New Version (Resubmitted)`
                            : 'New Version (Resubmitted)'}
                        </span>
                        <div className="bo-cv-preview-comp-reason">
                          Ready for Underwriting Verification
                        </div>
                      </div>
                      <div className="bo-cv-preview-comp-content">
                        {previewModal.comparison.newDoc?.url ? (
                          isDocPdf(previewModal.comparison.newDoc) ? (
                            <iframe
                              src={`${previewModal.comparison.newDoc.url}#toolbar=1`}
                              title="Resubmitted Version"
                              className="bo-cv-preview-comp-iframe"
                            />
                          ) : (
                            <img
                              src={previewModal.comparison.newDoc.url}
                              alt="Resubmitted Version"
                              className="bo-cv-preview-comp-img"
                            />
                          )
                        ) : (
                          <div className="bo-cv-preview-empty-box">
                            <span>Resubmitted document preview loading or not available</span>
                          </div>
                        )}
                      </div>
                      {previewModal.comparison.newDoc?.url && (
                        <div className="bo-cv-preview-comp-footer">
                          <button
                            type="button"
                            className="bo-cv-btn-download-sm"
                            onClick={() => handleDownloadFile(previewModal.comparison.newDoc.url, previewModal.comparison.newDoc.fileName || 'resubmitted_document')}
                          >
                            {DownloadIcon ? <DownloadIcon size={13} /> : '⬇'} Download New File
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : previewModal.isZip ? (
                /* ZIP / Archive manual docs view */
                <div className="bo-cv-preview-zip-view">
                  {previewModal.status === 'Resubmitted' && previewModal.rejection && (
                    <div className="bo-cv-preview-resubmit-alert" style={{ marginBottom: '16px' }}>
                      <div className="bo-cv-preview-resubmit-alert-left">
                        <strong>🔄 Resubmitted Package</strong>
                        <span>
                          {previewModal.rejection.rejectionRemarks || previewModal.rejection.remarks
                            ? `Previous rejection reason: "${previewModal.rejection.rejectionRemarks || previewModal.rejection.remarks}". Resubmitted package is ready for review.`
                            : 'Resubmitted package is ready for underwriting review.'}
                        </span>
                      </div>
                      {previewModal.rejectionId && (
                        <button
                          type="button"
                          className="bo-cv-preview-btn-verify-resubmitted"
                          disabled={isVerifyingRejection}
                          onClick={async () => {
                            await handleVerifyRejection(
                              previewModal.rejectionId,
                              previewModal.stepLabel,
                              previewModal.stepNum,
                              previewModal.applicantSequence
                            );
                            handleClosePreviewModal();
                          }}
                        >
                          {isVerifyingRejection ? 'Verifying...' : '✓ Verify Resubmitted Package'}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="bo-cv-preview-zip-banner">
                    <div className="bo-cv-preview-zip-icon">
                      {FileCheckIcon ? <FileCheckIcon size={32} /> : <span>📦</span>}
                    </div>
                    <div>
                      <h4>{previewModal.fileName || 'Customer Document Archive'}</h4>
                      <p>
                        {previewModal.manualDocs?.length > 0
                          ? `${previewModal.manualDocs.length} persistent document(s) uploaded in customer archive.`
                          : 'Archive package uploaded for customer verification.'}
                      </p>
                    </div>
                  </div>

                  {previewModal.manualDocs && previewModal.manualDocs.length > 0 && (
                    <div className="bo-cv-preview-zip-list">
                      <div className="bo-cv-preview-zip-list-title">Archive Files</div>
                      {previewModal.manualDocs.map((doc, idx) => {
                        const slotIdx =
                          doc.manualDocumentIndex !== undefined && doc.manualDocumentIndex !== null
                            ? Number(doc.manualDocumentIndex)
                            : idx;
                        const slotLabel = `Manual Document ${slotIdx + 1}`;
                        const docRej = doc.rejection;
                        const isReturned = docRej?.status === 'ReturnedToRM' || docRej?.status?.toLowerCase() === 'returned';
                        const isResubmitted = docRej?.status === 'Resubmitted' || docRej?.status?.toLowerCase() === 'resubmitted';
                        const isVerified = docRej?.status === 'Verified';

                        return (
                          <div key={doc.id || doc.agentCustomerDocumentId || slotIdx} className="bo-cv-preview-zip-item">
                            <div className="bo-cv-preview-zip-item-left">
                              <span className="bo-cv-preview-zip-item-num">{slotIdx + 1}</span>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, fontSize: '12px', color: '#334155' }}>{slotLabel}:</span>
                                  <span className="bo-cv-preview-zip-item-name">{doc.fileName || doc.documentTypeName || `Document_${slotIdx + 1}`}</span>
                                  {doc.fileSize && <span className="bo-cv-preview-zip-item-size">({formatFileSize(doc.fileSize)})</span>}
                                  {isReturned && (
                                    <span className="bo-cv-pill-returned" style={{ fontSize: '11px', padding: '2px 6px' }}>⚠️ Returned to RM</span>
                                  )}
                                  {isResubmitted && (
                                    <span className="bo-cv-pill-resubmitted" style={{ fontSize: '11px', padding: '2px 6px' }}>🔄 Resubmitted</span>
                                  )}
                                  {isVerified && (
                                    <span className="bo-cv-pill-verified" style={{ fontSize: '11px', padding: '2px 6px' }}>✓ Verified</span>
                                  )}
                                </div>
                                {(docRej?.rejectionRemarks || docRej?.remarks) && (
                                  <span style={{ fontSize: '11px', color: '#b91c1c' }}>
                                    Reason: {docRej.rejectionRemarks || docRej.remarks}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {isResubmitted && (
                                <button
                                  type="button"
                                  className="bo-btn bo-btn--outline"
                                  style={{ fontSize: '11px', padding: '4px 8px', borderColor: '#2563eb', color: '#2563eb' }}
                                  onClick={async () => {
                                    const oldPromise = docRej.originalDocumentPath
                                      ? fetchKycDocByPath(docRej.originalDocumentPath, `${previewModal.personLabel || 'Applicant'}_Manual_Doc_${slotIdx + 1}_Old`)
                                      : Promise.resolve(null);
                                    const newPromise = docRej.currentDocumentPath
                                      ? fetchKycDocByPath(docRej.currentDocumentPath, `${previewModal.personLabel || 'Applicant'}_Manual_Doc_${slotIdx + 1}`)
                                      : Promise.resolve(null);

                                    const [oldRes, newRes] = await Promise.all([oldPromise, newPromise]);
                                    setPreviewModal((prev) => ({
                                      ...prev,
                                      title: `Manual Document ${slotIdx + 1} Comparison — ${prev.personLabel}`,
                                      isComparison: true,
                                      comparison: {
                                        oldDoc: oldRes,
                                        newDoc: newRes,
                                        hasOldVersion: Boolean(oldRes?.url),
                                        hasNewVersion: Boolean(newRes?.url),
                                        note: !oldRes?.url
                                          ? (!docRej.originalDocumentPath
                                              ? 'Prior version path was not recorded for this rejection.'
                                              : (oldRes?.error || 'Previous version could not be retrieved from server.'))
                                          : null,
                                        rejection: docRej,
                                      },
                                      rejectionId: docRej.backOfficeDocumentRejectionId || docRej.id,
                                      rejection: docRej,
                                    }));
                                  }}
                                >
                                  Compare
                                </button>
                              )}
                              <button
                                type="button"
                                className="bo-cv-btn-download-sm"
                                onClick={() => handleDownloadManualDoc(doc)}
                              >
                                {DownloadIcon ? <DownloadIcon size={13} /> : '⬇'} Download
                              </button>
                              {!isReturned && !isResubmitted && (
                                <button
                                  type="button"
                                  className="bo-btn bo-btn--outline"
                                  style={{ fontSize: '11px', padding: '4px 8px', borderColor: '#dc2626', color: '#dc2626' }}
                                  onClick={() => {
                                    handleOpenRejectConfirm(
                                      previewModal.stepNum || 7,
                                      `${previewModal.personLabel || 'Applicant'} ${slotLabel}`,
                                      doc.applicationKYCDocumentId || previewModal.kycId,
                                      previewModal.isCoApplicant,
                                      previewModal.applicantSequence,
                                      previewModal.documentTypeId,
                                      'ZIP_ARCHIVE',
                                      slotIdx
                                    );
                                  }}
                                >
                                  Return
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : previewModal.url ? (
                /* Regular document preview: Image or PDF */
                <div className="bo-cv-preview-standard-view">
                  {previewModal.isPdf ? (
                    <div className="bo-cv-preview-iframe-wrapper">
                      <iframe
                        src={`${previewModal.url}#toolbar=1`}
                        title={previewModal.fileName || 'Document Preview'}
                        className="bo-cv-preview-iframe"
                      />
                    </div>
                  ) : (
                    <div className="bo-cv-preview-img-wrapper">
                      <img
                        src={previewModal.url}
                        alt={previewModal.fileName || 'Document Preview'}
                        className="bo-cv-preview-img"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="bo-cv-preview-empty-box">
                  <p>Document preview is currently unavailable or still loading.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bo-cv-preview-modal-footer">
              {previewModal.isZip && !previewModal.isVerified && (
                <button
                  type="button"
                  className="bo-btn bo-btn--primary bo-cv-preview-btn-verify-action"
                  disabled={
                    previewModal.status === 'Returned to RM' ||
                    previewModal.status === 'Returned' ||
                    isVerifyingRejection ||
                    savingVerificationKey === `${previewModal.applicantSequence || 0}_ZIP_ARCHIVE`
                  }
                  onClick={async () => {
                    if (previewModal.status === 'Resubmitted' && previewModal.rejectionId) {
                      await handleVerifyRejection(
                        previewModal.rejectionId,
                        previewModal.stepLabel,
                        previewModal.stepNum,
                        previewModal.applicantSequence
                      );
                    } else {
                      const seq = Number(previewModal.applicantSequence || 0);
                      const currentRemarks = (stepRemarks[previewModal.stepNum || 7] || '').trim();
                      await handleSaveStepVerification({
                        applicantSequence: seq,
                        stepCode: 'ZIP_ARCHIVE',
                        isVerified: true,
                        remarks: currentRemarks,
                        stepNum: previewModal.stepNum || 7,
                      });
                    }
                    handleClosePreviewModal();
                  }}
                >
                  ✓ Verify Package
                </button>
              )}
              {previewModal.isZip && previewModal.isVerified && (
                <button
                  type="button"
                  className="bo-btn bo-btn--outline bo-cv-preview-btn-unverify-action"
                  disabled={
                    isVerifyingRejection ||
                    savingVerificationKey === `${previewModal.applicantSequence || 0}_ZIP_ARCHIVE`
                  }
                  onClick={async () => {
                    const seq = Number(previewModal.applicantSequence || 0);
                    const currentRemarks = (stepRemarks[previewModal.stepNum || 7] || '').trim();
                    await handleSaveStepVerification({
                      applicantSequence: seq,
                      stepCode: 'ZIP_ARCHIVE',
                      isVerified: false,
                      remarks: currentRemarks,
                      stepNum: previewModal.stepNum || 7,
                    });
                    handleClosePreviewModal();
                  }}
                >
                  ✕ Unverify Package
                </button>
              )}
              <button
                type="button"
                className="bo-cv-preview-btn-close"
                onClick={handleClosePreviewModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
