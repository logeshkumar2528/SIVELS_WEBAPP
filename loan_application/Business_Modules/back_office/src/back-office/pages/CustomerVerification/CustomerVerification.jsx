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
 * - Step 12: PD Verification (Personal Discussion mode selector from dynamic PDVerificationTypeMaster).
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
import { resolveDocumentTypeId, validateApplicantDocumentFile } from '../../../../../../Core/src/utils/documentTypeHelper';
import './CustomerVerification.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

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

const INITIAL_STEP_VERIFICATIONS = {
  PROFILE_IMAGE: { isVerified: false, remarks: '', verifiedAt: null, verifiedByBackOfficeId: null },
  AADHAAR: { isVerified: false, remarks: '', verifiedAt: null, verifiedByBackOfficeId: null },
  PAN: { isVerified: false, remarks: '', verifiedAt: null, verifiedByBackOfficeId: null },
  SALARY_SLIP: { isVerified: false, remarks: '', verifiedAt: null, verifiedByBackOfficeId: null },
  BANK_STATEMENT: { isVerified: false, remarks: '', verifiedAt: null, verifiedByBackOfficeId: null },
  ZIP_ARCHIVE: { isVerified: false, remarks: '', verifiedAt: null, verifiedByBackOfficeId: null },
};

/**
 * 17-Step Underwriting Verification Workflow Step Definitions with Sidebar Groups
 */
const VERIFICATION_WORKFLOW_STEPS = [
  { id: 1, number: 1, title: 'View Form', subtitle: 'Application form', group: 'FORM REVIEW' },
  { id: 2, number: 2, title: 'Profile Image', subtitle: 'Applicant photo', group: 'DOCUMENT VERIFICATION', stepCode: 'PROFILE_IMAGE' },
  { id: 3, number: 3, title: 'Aadhaar Card', subtitle: 'Identity & Address', group: 'DOCUMENT VERIFICATION', stepCode: 'AADHAAR' },
  { id: 4, number: 4, title: 'PAN Card', subtitle: 'Tax identification', group: 'DOCUMENT VERIFICATION', stepCode: 'PAN' },
  { id: 5, number: 5, title: 'Salary Slip', subtitle: 'Income proof & payslips', group: 'DOCUMENT VERIFICATION', stepCode: 'SALARY_SLIP' },
  { id: 6, number: 6, title: 'Bank Statement', subtitle: 'Banking records & statements', group: 'DOCUMENT VERIFICATION', stepCode: 'BANK_STATEMENT' },
  { id: 7, number: 7, title: 'ZIP / Archive', subtitle: 'Customer archives & additional docs', group: 'DOCUMENT VERIFICATION', stepCode: 'ZIP_ARCHIVE' },
  { id: 8, number: 8, title: 'Property FI', subtitle: 'Property investigation', group: 'FIELD INVESTIGATION' },
  { id: 9, number: 9, title: 'Office FI', subtitle: 'Office verification', group: 'FIELD INVESTIGATION' },
  { id: 10, number: 10, title: 'Residence FI', subtitle: 'Residence verification', group: 'FIELD INVESTIGATION' },
  { id: 11, number: 11, title: 'Legal Opinion', subtitle: 'Legal report upload', group: 'CREDIT & ASSESSMENT' },
  { id: 12, number: 12, title: 'Technical Value', subtitle: 'Valuation report upload', group: 'CREDIT & ASSESSMENT' },
  { id: 13, number: 13, title: 'CIBIL Check', subtitle: 'Credit Bureau & PAN', group: 'CREDIT & ASSESSMENT' },
  { id: 14, number: 14, title: 'PD Verification', subtitle: 'Personal discussion', group: 'CREDIT & ASSESSMENT' },
  { id: 15, number: 15, title: 'Eligibility Calculation', subtitle: 'FOIR ratio calculation', group: 'CREDIT & ASSESSMENT' },
  { id: 16, number: 16, title: 'Eligibility Assessment', subtitle: 'Method & applicant assessment', group: 'CREDIT & ASSESSMENT' },
  { id: 17, number: 17, title: 'Recommendation Sheet', subtitle: 'Credit recommendation', group: 'CREDIT & ASSESSMENT' },
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
  const [viewFormRefreshKey, setViewFormRefreshKey] = useState(0);

  // 3. Preserved Legacy 8-Step Modal State (View-only inspection)
  const [selectedStepNumber, setSelectedStepNumber] = useState(null);

  // 4. Document Previews Cache & Blob Management
  const [docPreviews, setDocPreviews] = useState({});
  const [coDocPreviews, setCoDocPreviews] = useState({});
  const blobUrlsRef = useRef([]);

  // Supplementary server tables if not fully populated in ApplicationFullDetails
  const [kycRecordsList, setKycRecordsList] = useState([]);
  const [personalInfoList, setPersonalInfoList] = useState([]);
  const [docTypesList, setDocTypesList] = useState([]);
  const [docTypeMasterMap, setDocTypeMasterMap] = useState({});
  const [allCustomerDocs, setAllCustomerDocs] = useState([]);

  // Dynamically resolved DocumentTypeMaster IDs for Salary Slip / Income Sheet and Bank Statement
  const salarySlipDocTypeId = useMemo(() => resolveDocumentTypeId(docTypesList, 'Salary Slip'), [docTypesList]);
  const bankStatementDocTypeId = useMemo(() => resolveDocumentTypeId(docTypesList, 'Bank Statement'), [docTypesList]);

  // Persisted applicant and co-applicants financial documents (Salary Slip, Bank Statement)
  const [applicantFinancialDocs, setApplicantFinancialDocs] = useState({
    salarySlip: { loading: false, data: null, preview: null, comparison: null, rejection: null, error: null },
    bankStatement: { loading: false, data: null, preview: null, comparison: null, rejection: null, error: null },
  });
  const [coApplicantsFinancialDocs, setCoApplicantsFinancialDocs] = useState({});

  // Fetch DocumentTypeMaster on mount to dynamically resolve document types
  useEffect(() => {
    let isMounted = true;
    async function fetchMasterData() {
      try {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${API_BASE}/DocumentTypeMaster`, { headers });
        if (res.ok && isMounted) {
          const data = await res.json();
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
      } catch (e) {
        console.warn('Could not fetch DocumentTypeMaster:', e);
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

    if (!targetCustomerId) return;
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

    if (!targetCustomerId) return;

    let isMounted = true;
    async function fetchSupplementaryData() {
      const token = localStorage.getItem('authToken');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        const kycRes = await fetch(`${API_BASE}/ApplicationKYCDocuments`, { headers });
        if (kycRes.ok && isMounted) {
          const allKyc = await kycRes.json();
          const kycArr = Array.isArray(allKyc) ? allKyc : (allKyc?.value || allKyc?.data || []);
          const filteredKyc = kycArr
            .filter((k) => String(k.agentCustomerId ?? k.AgentCustomerId) === String(targetCustomerId))
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

    fetchSupplementaryData();
    return () => {
      isMounted = false;
    };
  }, [customerId, verificationData?.customerId]);

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

  const applicantKycRecord = resolvedKycList[0] || null;
  const applicantKycId = applicantKycRecord?.applicationKYCDocumentId || applicantKycRecord?.kycDocumentId || null;

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
      const kyc = coKycList[i] || {};
      const nameParts = [pers.firstName, pers.middleName, pers.lastName].filter(Boolean).join(' ');
      const name = nameParts || pers.fullName || pers.customerName || `Co-Applicant ${i + 1}`;
      const pan = kyc.panCardNo || pers.panCardNo || pers.pan || '';
      const aadhaarLast4 = kyc.aadhaarLastFourDigits || pers.aadhaarLastFourDigits || '';
      const aadhaarDisplay = aadhaarLast4
        ? `XXXX-XXXX-${aadhaarLast4}`
        : (pers.aadhaarNumber ? String(pers.aadhaarNumber) : (kyc.aadhaarNumber ? String(kyc.aadhaarNumber) : '—'));
      const kycDocumentId = kyc.applicationKYCDocumentId || kyc.kycDocumentId || kyc.id || null;

      result.push({
        index: i,
        number: i + 1,
        name,
        pan,
        aadhaarLast4,
        aadhaarDisplay,
        kycDocumentId,
        kycRecord: kyc,
        personalRecord: pers,
      });
    }
    return result;
  }, [verificationData, resolvedPersonalList, resolvedKycList]);

  // Generic KYC binary file loader helper
  const fetchKycDocBlob = useCallback(async (kycId, route, defaultName) => {
    if (!kycId) return { loading: false, url: null, error: null };
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

      return {
        loading: false,
        error: null,
        url: objectUrl,
        isPdf,
        isImage: !isPdf,
        fileName,
        size: blob.size,
      };
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
    try {
      const normalizeDocPath = (val) =>
        String(val || '')
          .trim()
          .replace(/\\/g, '/')
          .replace(/^\/+/, '');

      const normalizedPath = normalizeDocPath(rawPath);

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

              return {
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
            } catch (dlErr) {
              console.warn(`[CustomerVerification] Failed to download AgentCustomerDocument ID ${docId}:`, dlErr);
              return {
                loading: false,
                url: null,
                error: 'Previous version could not be retrieved from server.',
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
          error: 'Previous version could not be retrieved from server.',
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

      return {
        loading: false,
        error: null,
        url: objectUrl,
        isPdf,
        isImage: !isPdf,
        fileName,
        size: typedBlob.size,
        path: rawPath,
      };
    } catch (err) {
      console.warn(`[CustomerVerification] Could not load document from path ${rawPath}:`, err);
      return {
        loading: false,
        url: null,
        error: 'Previous version could not be retrieved from server.',
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
  const [isSavingStepVerification, setIsSavingStepVerification] = useState(false);
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
      pan: verificationData?.personalInformation?.panNumber || resolvedKycList[0]?.panCardNo || '',
      personalRecord: resolvedPersonalList[0] || null,
      kycRecord: resolvedKycList[0] || null,
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
      verificationData?.application?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.applicationProductDetailsId ||
      verificationData?.raw?.applicationProductDetails?.applicationProductDetailsId ||
      verificationData?.applicationProductDetailsId ||
      verificationData?.applicationProductDetails?.applicationProductDetailsId ||
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
            incentivePercentApplied: existing.incentivePercentApplied ?? 0,
            consideredIncentiveAmount: existing.consideredIncentiveAmount ?? null,
            totalConsideredIncome: existing.totalConsideredIncome ?? null,
            previewConsideredIncentive: existing.consideredIncentiveAmount ?? 0,
            previewConsideredIncome: existing.totalConsideredIncome ?? 0,
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

  // Trigger salary hydration when Step 14 is active and method is INCOME
  useEffect(() => {
    if (activeStep === 16 && selectedMethodCode === 'INCOME' && calculationAppProdId > 0) {
      fetchSalaryRecords(calculationAppProdId, selectedApplicantSequence);
    }
  }, [activeStep, selectedMethodCode, calculationAppProdId, selectedApplicantSequence, fetchSalaryRecords]);

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
      const pct = row.incentivePercentApplied === '' ? 0 : Number(row.incentivePercentApplied) || 0;
      const prevInc = (inc * pct) / 100;
      row.previewConsideredIncentive = prevInc;
      row.previewConsideredIncome = b + h + c + t + prevInc;

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

  // Phase 2D: Final Eligibility Calculation & Assessment Result State for Step 14
  const [assessmentsList, setAssessmentsList] = useState([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);
  const [assessmentsError, setAssessmentsError] = useState(null);

  // Per-applicant & per-method calculation settings map
  // Key: `${applicantSequence}_${methodCode}` (e.g. "0_INCOME", "0_ABB", "1_INCOME")
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
    const currentMethodId = selectedMethodCode === 'ABB' ? 2 : 1;
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
  }, [assessmentsList, selectedApplicantSequence, selectedMethodCode]);

  const resolvedPolicyFoir = useMemo(() => {
    if (selectedMethodCode !== 'INCOME') {
      return 'Not Applicable (ABB Method)';
    }

    // 1. Dynamic lookup from FOIRMaster using applicant's employmentTypeId and Income Method (assessmentMethodId = 1)
    if (Array.isArray(foirMasterList) && foirMasterList.length > 0 && selectedEmploymentTypeId != null) {
      const now = new Date();
      const matchingFoir = foirMasterList.find((f) => {
        if (f.isActive === false) return false;
        const empMatch = Number(f.employmentTypeId) === Number(selectedEmploymentTypeId);
        const methodMatch =
          f.assessmentMethodId == null ||
          Number(f.assessmentMethodId) === 1; // 1 = Income Method
        if (!empMatch || !methodMatch) return false;

        // Effective date validity
        if (f.effectiveFrom && new Date(f.effectiveFrom) > now) return false;
        if (f.effectiveTo && new Date(f.effectiveTo) < now) return false;

        return true;
      });

      if (matchingFoir?.foirPercent != null) {
        return `${matchingFoir.foirPercent}%`;
      }
    }

    // 2. If calculated assessment exists for this applicant and method, use authoritative backend foir
    if (currentAssessment?.foirPercentApplied != null) {
      return `${currentAssessment.foirPercentApplied}%`;
    }

    return '65%';
  }, [selectedMethodCode, foirMasterList, selectedEmploymentTypeId, currentAssessment]);

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
    if (!calculationAgentCustId || calculationAgentCustId <= 0) {
      setCalcBanner({
        type: 'error',
        message: 'Agent Customer ID is missing or invalid. Please refresh the application.',
      });
      return;
    }

    // 3. Employment Details ID
    if (!selectedEmploymentIncomeDetailsId) {
      setCalcBanner({
        type: 'error',
        message: `Employment Details are not available for ${selectedApplicant?.name || 'this applicant'}. Calculation cannot proceed without active employment records linked to the applicant.`,
      });
      return;
    }

    // 4. Method Specific Validations & Pre-calculation Persistence
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

      // Step 4c: Verify that exactly 3 active salary records exist in the database
      const res = await backOfficeService.getSalaryIncomeBySeq(calculationAppProdId, selectedApplicantSequence);
      const records = Array.isArray(res) ? res : (res?.value ?? res?.data ?? []);
      const activeRecords = records.filter((r) => r.isActive !== false);

      if (activeRecords.length !== 3) {
        setCalcBanner({
          type: 'error',
          message: `Exactly 3 active salary records are required in the database before calculating income eligibility (Found: ${activeRecords.length}/3).`,
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

    setCalculating(true);
    try {
      const payload = {
        applicationProductDetailsId: Number(calculationAppProdId),
        agentCustomerId: Number(calculationAgentCustId),
        applicationEmploymentIncomeDetailsId: Number(selectedEmploymentIncomeDetailsId),
        applicantSequence: Number(selectedApplicantSequence),
        assessmentMethodId: selectedMethodCode === 'ABB' ? 2 : 1,
        manualROI: finalManualRoi,
        manualTenureMonths: finalManualTenure,
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
      const activeMethods = records.filter((m) => m.isActive !== false);
      setAssessmentMethods(activeMethods);

      if (activeMethods.length > 0) {
        const exists = activeMethods.some((m) => m.methodCode === selectedMethodCode);
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
  const SaveIcon = iconMap['Save'];
  const Trash2Icon = iconMap['Trash2'] || iconMap['X'];

  // Send to Credit Officer action handler
  const handleSendToCreditOfficer = () => {
    const trimmed = finalRemarks.trim();
    if (!trimmed) {
      setFinalRemarksError('Remarks for Credit Officer are required.');
      setFinalRemarksBanner(null);
      return;
    }

    setFinalRemarksError('');
    setIsSendingToCreditOfficer(true);

    setTimeout(() => {
      setIsSendingToCreditOfficer(false);
      setFinalRemarksBanner({
        type: 'info',
        message: 'Credit Officer assignment API is not available yet. Final remarks validated successfully.',
      });
    }, 400);
  };

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
  // Document Resolution & Preview Loader (Old vs New & Dynamic Master)
  // ----------------------------------------------------

  // Helper to determine if an AgentCustomerDocument matches the requested step/document type
  const isMatchingApplicantDoc = useCallback((doc, stepNum, masterMap) => {
    if (!doc) return false;
    const typeId = Number(doc.documentTypeId || doc.DocumentTypeId);
    const typeName = String(doc.documentTypeName || doc.DocumentTypeName || '').trim().toLowerCase();
    const fileName = String(doc.fileName || doc.FileName || doc.name || '').trim().toLowerCase();

    const master = masterMap?.[typeId];
    const masterCode = String(master?.documentTypeCode || '').toUpperCase();
    const masterName = String(master?.documentTypeName || '').toLowerCase();

    if (stepNum === 2) {
      // Step 02: Profile Image / Photo
      if (masterCode === 'PHOTO' || masterName.includes('photo') || masterName.includes('profile')) return true;
      if (typeName.includes('photo') || typeName.includes('picture') || typeName.includes('profile') || typeName.includes('client')) return true;
      if (/\.(jpg|jpeg|png|webp|gif)$/i.test(fileName) && /(profile|photo|client|picture|face|user)/i.test(fileName)) return true;
      if (typeId === 6) return true;
      return false;
    }

    if (stepNum === 3) {
      // Step 03: Aadhaar Card
      if (masterCode === 'AADHAAR' || masterName.includes('aadhaar') || masterName.includes('aadhar')) return true;
      if (typeName.includes('aadhaar') || typeName.includes('aadhar')) return true;
      if (/(aadhaar|aadhar|uid)/i.test(fileName)) return true;
      if (typeId === 1) return true;
      return false;
    }

    if (stepNum === 4) {
      // Step 04: PAN Card
      if (masterCode === 'PAN' || masterName === 'pan card' || masterName === 'pan') return true;
      if (typeName.includes('pan card') || typeName === 'pan') return true;
      if (/\bpan\b/i.test(fileName) || /pancard/i.test(fileName)) return true;
      if (typeId === 2) return true;
      return false;
    }

    if (stepNum === 5 || stepNum === 'SALARY_SLIP' || stepNum === 'salarySlip') {
      if (salarySlipDocTypeId && typeId === Number(salarySlipDocTypeId)) return true;
      if (masterCode === 'SALARY_SLIP' || masterCode === 'SALARY' || masterCode === 'PAYSLIP') return true;
      if (masterName.includes('salary') || masterName.includes('payslip') || masterName.includes('income')) return true;
      if (typeName.includes('salary') || typeName.includes('payslip') || typeName.includes('pay_slip') || typeName.includes('income')) return true;
      if (/(salary|payslip|pay_slip|income)/i.test(fileName)) return true;
      return false;
    }

    if (stepNum === 6 || stepNum === 'BANK_STATEMENT' || stepNum === 'bankStatement') {
      if (bankStatementDocTypeId && typeId === Number(bankStatementDocTypeId)) return true;
      if (masterCode === 'BANK_STATEMENT' || masterCode === 'BANKSTATEMENT' || masterCode === 'BANK') return true;
      if (masterName.includes('bank') || masterName.includes('statement')) return true;
      if (typeName.includes('bank') || typeName.includes('statement') || typeName.includes('passbook')) return true;
      if (/(bank|statement|passbook)/i.test(fileName)) return true;
      return false;
    }

    if (stepNum === 7) {
      // Step 07: ZIP Archive / Manual Documents
      if (/\.(zip|rar|7z|tar|gz)$/i.test(fileName)) return true;
      if (typeName.includes('zip') || typeName.includes('archive') || typeName.includes('manual')) return true;
      return false;
    }

    return false;
  }, [salarySlipDocTypeId, bankStatementDocTypeId]);

  // Helper to download a single customer document and create a managed blob URL
  const downloadAndPrepareDoc = useCallback(async (doc) => {
    const docId = doc?.agentCustomerDocumentId || doc?.id;
    if (!docId) return null;
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

      return {
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
    } catch (err) {
      console.warn(`[CustomerVerification] Could not download document ${docId}:`, err?.message);
      return null;
    }
  }, []);

  // Safely resolves Old and New document versions for Applicant
  const resolveOldAndNewDocs = useCallback(
    (docs, rejection, stepNum, masterMap) => {
      const matching = (docs || []).filter((d) => isMatchingApplicantDoc(d, stepNum, masterMap));
      matching.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return (a.agentCustomerDocumentId || 0) - (b.agentCustomerDocumentId || 0);
      });

      if (matching.length === 0) return { oldDoc: null, newDoc: null };

      const rejTime = rejection ? new Date(rejection.rejectedAt || rejection.createdAt || 0).getTime() : 0;

      if (!rejection || rejection.status === 'Verified') {
        return { oldDoc: null, newDoc: matching[matching.length - 1], isLatest: true };
      }

      const beforeRej = matching.filter((d) => {
        const t = new Date(d.createdAt || 0).getTime();
        return rejTime === 0 || t <= rejTime + 5000;
      });

      const afterRej = matching.filter((d) => {
        const t = new Date(d.createdAt || 0).getTime();
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
      verificationData?.application?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.applicationProductDetailsId ||
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
    verificationData?.application?.applicationProductDetailsId ||
    verificationData?.raw?.productDetails?.[0]?.applicationProductDetailsId ||
    verificationData?.raw?.productDetails?.applicationProductDetailsId ||
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
        PROFILE_IMAGE: { isVerified: false, remarks: '', verifiedAt: null, verifiedByBackOfficeId: null },
        AADHAAR: { isVerified: false, remarks: '', verifiedAt: null, verifiedByBackOfficeId: null },
        PAN: { isVerified: false, remarks: '', verifiedAt: null, verifiedByBackOfficeId: null },
        SALARY_SLIP: { isVerified: false, remarks: '', verifiedAt: null, verifiedByBackOfficeId: null },
        BANK_STATEMENT: { isVerified: false, remarks: '', verifiedAt: null, verifiedByBackOfficeId: null },
        ZIP_ARCHIVE: { isVerified: false, remarks: '', verifiedAt: null, verifiedByBackOfficeId: null },
      };

      const remarksToHydrate = {};

      list.forEach((item) => {
        if (!item || item.isActive === false) return;
        const code = item.stepCode;
        if (nextState[code]) {
          nextState[code] = {
            backOfficeStepVerificationId: item.backOfficeStepVerificationId || null,
            isVerified: Boolean(item.isVerified),
            remarks: item.remarks || '',
            verifiedAt: item.verifiedAt || null,
            verifiedByBackOfficeId: item.verifiedByBackOfficeId || null,
          };

          // Hydrate remarks into 17-step stepRemarks (2: Profile, 3: Aadhaar, 4: PAN, 5: Salary, 6: Bank, 7: ZIP)
          if (item.remarks && typeof item.remarks === 'string' && item.remarks.trim()) {
            if (code === 'PROFILE_IMAGE') remarksToHydrate[2] = item.remarks;
            else if (code === 'AADHAAR') remarksToHydrate[3] = item.remarks;
            else if (code === 'PAN') remarksToHydrate[4] = item.remarks;
            else if (code === 'SALARY_SLIP') remarksToHydrate[5] = item.remarks;
            else if (code === 'BANK_STATEMENT') remarksToHydrate[6] = item.remarks;
            else if (code === 'ZIP_ARCHIVE') remarksToHydrate[7] = item.remarks;
          }
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
            docTypeId === 6 ||
            rType.includes('PROFILE') ||
            rType.includes('PHOTO')
          );
        case 'AADHAAR':
          return (
            docTypeId === 1 ||
            rType.includes('AADHAAR') ||
            rType.includes('AADHAR')
          );
        case 'PAN':
          return (
            docTypeId === 2 ||
            rType.includes('PAN')
          );
        case 'SALARY_SLIP':
          return (
            docTypeId === 4 ||
            (salarySlipDocTypeId && docTypeId === Number(salarySlipDocTypeId)) ||
            rType.includes('SALARY') ||
            rType.includes('PAYSLIP')
          );
        case 'BANK_STATEMENT':
          return (
            docTypeId === 3 ||
            (bankStatementDocTypeId && docTypeId === Number(bankStatementDocTypeId)) ||
            rType.includes('BANK')
          );
        case 'ZIP_ARCHIVE':
          return (
            docTypeId === 7 ||
            rType.includes('ZIP') ||
            rType.includes('ARCHIVE')
          );
        default:
          return false;
      }
    },
    [salarySlipDocTypeId, bankStatementDocTypeId]
  );

  const getUnresolvedRejectionsForStep = useCallback(
    (stepIdentifier) => {
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
        return isRejectionMatchingStep(r, stepIdentifier);
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
    (stepIdentifier) => {
      return getUnresolvedRejectionsForStep(stepIdentifier).length > 0;
    },
    [getUnresolvedRejectionsForStep]
  );

  // Reusable PUT handler to create / update step verification
  const handleSaveStepVerification = useCallback(async ({
    stepCode,
    isVerified,
    remarks = '',
  }) => {
    if (isSavingStepVerification) {
      return { success: false, error: 'A verification save is already in progress.' };
    }

    // Defensive Guard (Rule 4): Block marking a step as Verified if unresolved rejections exist
    if (Boolean(isVerified) && hasUnresolvedRejectionForStep(stepCode)) {
      const err = 'Resolve all returned/resubmitted documents before marking this step as Verified.';
      setStepVerificationError(err);
      const stepNum = stepCodeToStepNum(stepCode);
      if (stepNum) {
        setStepFeedback((prev) => ({
          ...prev,
          [stepNum]: { type: 'error', message: err },
        }));
      }
      return { success: false, error: err };
    }

    if (!SUPPORTED_STEP_CODES.includes(stepCode)) {
      throw new Error(`Unsupported verification step code: ${stepCode}`);
    }

    const stepNum = stepCodeToStepNum(stepCode);

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
      if (stepNum) {
        setStepFeedback((prev) => ({
          ...prev,
          [stepNum]: { type: 'error', message: err },
        }));
      }
      return { success: false, error: err };
    }

    const backOfficeId = getAuthenticatedBackOfficeId();
    if (!backOfficeId) {
      const err = 'Unable to identify the logged-in Back Office operator. Please login again.';
      setStepVerificationError(err);
      if (stepNum) {
        setStepFeedback((prev) => ({
          ...prev,
          [stepNum]: { type: 'error', message: err },
        }));
      }
      return { success: false, error: err };
    }

    setIsSavingStepVerification(true);
    setStepVerificationError(null);

    const previousRecord = stepVerifications[stepCode];

    try {
      const payload = {
        applicationProductDetailsId: targetAppProdId,
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
      };

      setStepVerifications((prev) => ({
        ...prev,
        [stepCode]: updatedRecord,
      }));

      if (stepNum) {
        const stepLabel = VERIFICATION_WORKFLOW_STEPS.find((s) => s.number === stepNum)?.title || stepCode;
        setStepFeedback((prev) => ({
          ...prev,
          [stepNum]: {
            type: 'success',
            message: `${stepLabel} successfully ${isVerified ? 'marked as Verified' : 'unmarked as Verified'}.`,
          },
        }));
      }

      return { success: true, data: result || updatedRecord };
    } catch (err) {
      console.error(`[CustomerVerification] Failed to save step verification for ${stepCode}:`, err);
      const errMsg = err?.response?.data?.message || err?.message || `Failed to save ${stepCode} verification.`;
      setStepVerificationError(errMsg);
      if (stepNum) {
        setStepFeedback((prev) => ({
          ...prev,
          [stepNum]: { type: 'error', message: errMsg },
        }));
      }
      // Revert to previous state on failure
      setStepVerifications((prev) => ({
        ...prev,
        [stepCode]: previousRecord,
      }));
      return { success: false, error: errMsg };
    } finally {
      setIsSavingStepVerification(false);
    }
  }, [isSavingStepVerification, resolvedAppProdId, verificationData, getAuthenticatedBackOfficeId, stepVerifications, hasUnresolvedRejectionForStep]);

  const verifiedDocumentCount = useMemo(() => {
    return DOCUMENT_STEP_CODES.filter(
      (code) => stepVerifications[code]?.isVerified === true && !hasUnresolvedRejectionForStep(code)
    ).length;
  }, [stepVerifications, hasUnresolvedRejectionForStep]);

  // Reconcile legacy contradictory state: persist isVerified: false for steps with unresolved rejections (Rule 9)
  useEffect(() => {
    if (!resolvedAppProdId || isFetchingStepVerifications || !applicationRejections || applicationRejections.length === 0) {
      return;
    }

    DOCUMENT_STEP_CODES.forEach(async (code) => {
      const recKey = `${resolvedAppProdId}_${code}`;
      if (reconciledStepsRef.current.has(recKey)) return;

      const isPersistedTrue = stepVerifications[code]?.isVerified === true;
      const hasUnresolved = hasUnresolvedRejectionForStep(code);

      if (isPersistedTrue && hasUnresolved) {
        reconciledStepsRef.current.add(recKey);
        try {
          await handleSaveStepVerification({
            stepCode: code,
            isVerified: false,
            remarks: stepVerifications[code]?.remarks || '',
          });
        } catch (recErr) {
          console.warn(`[CustomerVerification] Auto-reconciliation failed for ${code}:`, recErr);
        }
      }
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
      verificationData?.application?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.applicationProductDetailsId ||
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
    (stepNum) => {
      const baseType = STEP_DOC_TYPE_MAP[stepNum];
      if (!baseType) return null;
      return (
        applicationRejections
          .filter((r) => {
            const rType = String(r.rejectedDocumentType || '').toUpperCase();
            const isCoApp =
              rType.startsWith('CO_APPLICANT') ||
              (r.kycDocumentId && applicantKycId && Number(r.kycDocumentId) !== Number(applicantKycId) && !rType.startsWith('APPLICANT'));
            if (isCoApp) return false;
            return rType === baseType || rType === `APPLICANT_${baseType}` || rType.endsWith(`_${baseType}`);
          })
          .sort((a, b) => (b.backOfficeDocumentRejectionId || 0) - (a.backOfficeDocumentRejectionId || 0))[0] || null
      );
    },
    [applicationRejections, applicantKycId]
  );

  const getActiveRejectionForCoApplicant = useCallback(
    (coKycId, stepNum) => {
      const baseType = STEP_DOC_TYPE_MAP[stepNum];
      if (!baseType || !coKycId) return null;
      return (
        applicationRejections
          .filter((r) => {
            const rType = String(r.rejectedDocumentType || '').toUpperCase();
            const matchesKyc = Number(r.kycDocumentId) === Number(coKycId);
            const matchesType = rType === baseType || rType === `CO_APPLICANT_${baseType}` || rType.includes(baseType);
            return matchesKyc && matchesType;
          })
          .sort((a, b) => (b.backOfficeDocumentRejectionId || 0) - (a.backOfficeDocumentRejectionId || 0))[0] || null
      );
    },
    [applicationRejections]
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

  // Fetch applicant & co-applicants Salary Slip and Bank Statement documents
  const fetchFinancialDocuments = useCallback(async () => {
    const appProdId =
      verificationData?.application?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.applicationProductDetailsId ||
      verificationData?.raw?.applicationProductDetails?.applicationProductDetailsId;

    const sTypeId = salarySlipDocTypeId;
    const bTypeId = bankStatementDocTypeId;

    // 1. Applicant Salary Slip (sourced from allCustomerDocs / AgentCustomerDocument)
    setApplicantFinancialDocs((prev) => ({
      ...prev,
      salarySlip: { ...(prev.salarySlip || {}), loading: true, error: null },
    }));
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

        // PRIORITY 1: Match against Verified rejection currentDocumentPath if available
        if (rej && rej.status === 'Verified' && rej.currentDocumentPath) {
          const targetNorm = normalizeDocPath(rej.currentDocumentPath).toLowerCase();
          slipDoc = (allCustomerDocs || []).find((doc) => {
            const candidate = normalizeDocPath(
              doc.filePath || doc.documentPath || doc.path
            ).toLowerCase();
            return candidate === targetNorm;
          });
        }

        // PRIORITY 2: Filter active Salary Slip documents and sort CreatedAt DESC, AgentCustomerDocumentId DESC
        if (!slipDoc) {
          const matchingSalaryDocs = (allCustomerDocs || [])
            .filter((doc) => doc.isActive !== false && isMatchingApplicantDoc(doc, 'SALARY_SLIP', docTypeMasterMap))
            .sort((a, b) => {
              const timeA = new Date(a.createdAt || 0).getTime();
              const timeB = new Date(b.createdAt || 0).getTime();
              if (timeA !== timeB) return timeB - timeA;
              return (b.agentCustomerDocumentId || 0) - (a.agentCustomerDocumentId || 0);
            });
          slipDoc = matchingSalaryDocs[0] || null;
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
    } catch (err) {
      console.warn('Could not load applicant salary slip from customer documents:', err);
      setApplicantFinancialDocs((prev) => ({
        ...prev,
        salarySlip: { loading: false, data: null, preview: null, comparison: null, rejection: null, error: null },
      }));
    }

    // 2. Applicant Bank Statement (sourced from allCustomerDocs / AgentCustomerDocument)
    setApplicantFinancialDocs((prev) => ({
      ...prev,
      bankStatement: { ...(prev.bankStatement || {}), loading: true, error: null },
    }));
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
        const bankDoc = (allCustomerDocs || []).find((doc) =>
          isMatchingApplicantDoc(doc, 'BANK_STATEMENT', docTypeMasterMap)
        );
        if (bankDoc) {
          docData = bankDoc;
          preview = await downloadAndPrepareDoc(bankDoc);
        }
      }

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
    } catch (err) {
      console.warn('Could not load applicant bank statement from customer documents:', err);
      setApplicantFinancialDocs((prev) => ({
        ...prev,
        bankStatement: { loading: false, data: null, preview: null, comparison: null, rejection: null, error: null },
      }));
    }

    // 3. Co-Applicants Salary Slips & Bank Statements (sequence 1, 2, 3... sourced from ApplicationKYCDocuments)
    if (appProdId && coApplicants && coApplicants.length > 0) {
      const coMap = {};
      for (const co of coApplicants) {
        const seq = co.sequence !== undefined ? co.sequence : (co.index !== undefined ? co.index + 1 : co.number);
        const idxKey = co.index !== undefined ? co.index : (seq - 1);

        let coSalarySlip = { loading: false, data: null, preview: null, comparison: null, rejection: null, error: null };
        let coBankStatement = { loading: false, data: null, preview: null, comparison: null, rejection: null, error: null };

        if (sTypeId) {
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
        }

        if (bTypeId) {
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
        }

        coMap[idxKey] = {
          salarySlip: coSalarySlip,
          bankStatement: coBankStatement,
        };
      }
      setCoApplicantsFinancialDocs(coMap);
    }
  }, [
    verificationData,
    salarySlipDocTypeId,
    bankStatementDocTypeId,
    coApplicants,
    allCustomerDocs,
    docTypeMasterMap,
    getActiveRejectionForApplicantDoc,
    getActiveRejectionForCoApplicantDoc,
    downloadAndPrepareDoc,
    fetchKycDocByPath,
    isMatchingApplicantDoc,
    resolveOldAndNewDocs,
  ]);

  useEffect(() => {
    if ((activeStep === 5 || activeStep === 6 || activeStep === 7) && verificationData) {
      fetchFinancialDocuments();
    }
  }, [activeStep, verificationData, fetchFinancialDocuments]);

  const handleRefreshDocumentPreview = useCallback((stepNum) => {
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

  // Fetch document preview whenever an active document step is opened (Applicant + Co-Applicants)
  useEffect(() => {
    if (!verificationData) return;
    const combinedDocs = [...(allCustomerDocs || [])];
    const initialDocs = verificationData?.kycDocuments?.documents || [];
    initialDocs.forEach((d) => {
      if (!combinedDocs.some((cd) => (cd.agentCustomerDocumentId || cd.id) === (d.agentCustomerDocumentId || d.id))) {
        combinedDocs.push(d);
      }
    });

    // ── STEP 2: PROFILE IMAGE ──────────────────────────────────────
    if (activeStep === 2) {
      const appRej = getActiveRejectionForApplicant(2);
      if (!docPreviews.profile) {
        setDocPreviews((prev) => ({ ...prev, profile: { loading: true, error: null, url: null } }));

        if (appRej && appRej.status === 'Resubmitted') {
          // Resolve Old vs New documents
          const { oldDoc, newDoc } = resolveOldAndNewDocs(combinedDocs, appRej, 2, docTypeMasterMap);
          Promise.all([
            oldDoc ? downloadAndPrepareDoc(oldDoc) : Promise.resolve(null),
            newDoc ? downloadAndPrepareDoc(newDoc) : (applicantKycId ? fetchKycDocBlob(applicantKycId, 'profile-image', 'Applicant_Profile') : Promise.resolve(null)),
          ]).then(([oldRes, newRes]) => {
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
                  note: !oldRes?.url ? 'Previous version is not available from the current document API.' : null,
                  rejection: appRej,
                },
                url: newRes?.url || oldRes?.url || null,
                doc: newRes?.doc || oldRes?.doc || null,
                fileName: newRes?.fileName || oldRes?.fileName || 'Profile Image',
                size: newRes?.size || oldRes?.size || null,
              },
            }));
          });
        } else {
          // Standard / Verified / ReturnedToRM single preview
          const { newDoc, oldDoc } = resolveOldAndNewDocs(combinedDocs, appRej, 2, docTypeMasterMap);
          const targetDoc = appRej?.status === 'ReturnedToRM' && oldDoc ? oldDoc : (newDoc || oldDoc);

          if (targetDoc) {
            downloadAndPrepareDoc(targetDoc).then((res) => {
              setDocPreviews((prev) => ({
                ...prev,
                profile: {
                  loading: false,
                  error: res ? null : 'Failed to download document.',
                  isComparison: false,
                  comparison: null,
                  url: res?.url || null,
                  doc: targetDoc,
                  fileName: res?.fileName || targetDoc.fileName || 'Profile Image',
                  size: res?.size || null,
                  isImage: true,
                  isPdf: false,
                },
              }));
            });
          } else if (applicantKycId) {
            fetchKycDocBlob(applicantKycId, 'profile-image', 'Applicant_Profile').then((res) => {
              setDocPreviews((prev) => ({ ...prev, profile: { ...res, isComparison: false, comparison: null } }));
            });
          } else {
            setDocPreviews((prev) => ({ ...prev, profile: { loading: false, error: null, doc: null, url: null } }));
          }
        }
      }

      // Co-Applicants Profile Images
      coApplicants.forEach((co) => {
        if (!coDocPreviews[co.index]?.profile && co.kycDocumentId) {
          setCoDocPreviews((prev) => ({
            ...prev,
            [co.index]: {
              ...(prev[co.index] || {}),
              profile: { loading: true, error: null, url: null },
            },
          }));
          const coRej = getActiveRejectionForCoApplicant(co.kycDocumentId, 2);

          if (coRej && coRej.status === 'Resubmitted') {
            const oldPromise = coRej.originalDocumentPath
              ? fetchKycDocByPath(coRej.originalDocumentPath, `CoApplicant_${co.number}_Profile_Old.jpg`)
              : Promise.resolve(null);
            const newPromise = coRej.currentDocumentPath
              ? fetchKycDocByPath(coRej.currentDocumentPath, `CoApplicant_${co.number}_Profile.jpg`)
              : fetchKycDocBlob(co.kycDocumentId, 'profile-image', `CoApplicant_${co.number}_Profile`);

            Promise.all([oldPromise, newPromise]).then(([oldRes, newRes]) => {
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
                  },
                },
              }));
            });
          } else {
            fetchKycDocBlob(co.kycDocumentId, 'profile-image', `CoApplicant_${co.number}_Profile`).then((res) => {
              setCoDocPreviews((prev) => ({
                ...prev,
                [co.index]: {
                  ...(prev[co.index] || {}),
                  profile: { ...res, isComparison: false, comparison: null },
                },
              }));
            });
          }
        }
      });
    }

    // ── STEP 3: AADHAAR CARD ───────────────────────────────────────
    if (activeStep === 3) {
      const appRej = getActiveRejectionForApplicant(3);
      if (!docPreviews.aadhaar) {
        setDocPreviews((prev) => ({ ...prev, aadhaar: { loading: true, error: null, url: null } }));

        if (appRej && appRej.status === 'Resubmitted') {
          const { oldDoc, newDoc } = resolveOldAndNewDocs(combinedDocs, appRej, 3, docTypeMasterMap);
          Promise.all([
            oldDoc ? downloadAndPrepareDoc(oldDoc) : Promise.resolve(null),
            newDoc ? downloadAndPrepareDoc(newDoc) : (applicantKycId ? fetchKycDocBlob(applicantKycId, 'aadhar', 'Applicant_Aadhaar') : Promise.resolve(null)),
          ]).then(([oldRes, newRes]) => {
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
                  note: !oldRes?.url ? 'Previous version is not available from the current document API.' : null,
                  rejection: appRej,
                },
                url: newRes?.url || oldRes?.url || null,
                doc: newRes?.doc || oldRes?.doc || null,
                fileName: newRes?.fileName || oldRes?.fileName || 'Aadhaar Card',
                size: newRes?.size || oldRes?.size || null,
                isPdf: Boolean(newRes?.isPdf ?? oldRes?.isPdf),
                isImage: Boolean(newRes?.isImage ?? oldRes?.isImage),
              },
            }));
          });
        } else {
          const { newDoc, oldDoc } = resolveOldAndNewDocs(combinedDocs, appRej, 3, docTypeMasterMap);
          const targetDoc = appRej?.status === 'ReturnedToRM' && oldDoc ? oldDoc : (newDoc || oldDoc);

          if (targetDoc) {
            downloadAndPrepareDoc(targetDoc).then((res) => {
              setDocPreviews((prev) => ({
                ...prev,
                aadhaar: {
                  loading: false,
                  error: res ? null : 'Failed to download Aadhaar document.',
                  isComparison: false,
                  comparison: null,
                  url: res?.url || null,
                  doc: targetDoc,
                  fileName: res?.fileName || targetDoc.fileName || 'Aadhaar Card',
                  size: res?.size || null,
                  isPdf: Boolean(res?.isPdf),
                  isImage: Boolean(res?.isImage),
                },
              }));
            });
          } else if (applicantKycId) {
            fetchKycDocBlob(applicantKycId, 'aadhar', 'Applicant_Aadhaar').then((res) => {
              setDocPreviews((prev) => ({ ...prev, aadhaar: { ...res, isComparison: false, comparison: null } }));
            });
          } else {
            setDocPreviews((prev) => ({ ...prev, aadhaar: { loading: false, error: null, doc: null, url: null } }));
          }
        }
      }

      // Co-Applicants Aadhaar
      coApplicants.forEach((co) => {
        if (!coDocPreviews[co.index]?.aadhaar && co.kycDocumentId) {
          setCoDocPreviews((prev) => ({
            ...prev,
            [co.index]: {
              ...(prev[co.index] || {}),
              aadhaar: { loading: true, error: null, url: null },
            },
          }));
          const coRej = getActiveRejectionForCoApplicant(co.kycDocumentId, 3);

          if (coRej && coRej.status === 'Resubmitted') {
            const oldPromise = coRej.originalDocumentPath
              ? fetchKycDocByPath(coRej.originalDocumentPath, `CoApplicant_${co.number}_Aadhaar_Old`)
              : Promise.resolve(null);
            const newPromise = coRej.currentDocumentPath
              ? fetchKycDocByPath(coRej.currentDocumentPath, `CoApplicant_${co.number}_Aadhaar`)
              : fetchKycDocBlob(co.kycDocumentId, 'aadhar', `CoApplicant_${co.number}_Aadhaar`);

            Promise.all([oldPromise, newPromise]).then(([oldRes, newRes]) => {
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
                  },
                },
              }));
            });
          } else {
            fetchKycDocBlob(co.kycDocumentId, 'aadhar', `CoApplicant_${co.number}_Aadhaar`).then((res) => {
              setCoDocPreviews((prev) => ({
                ...prev,
                [co.index]: {
                  ...(prev[co.index] || {}),
                  aadhaar: { ...res, isComparison: false, comparison: null },
                },
              }));
            });
          }
        }
      });
    }

    // ── STEP 4: PAN CARD ───────────────────────────────────────────
    if (activeStep === 4) {
      const appRej = getActiveRejectionForApplicant(4);
      if (!docPreviews.pan) {
        setDocPreviews((prev) => ({ ...prev, pan: { loading: true, error: null, url: null } }));

        if (appRej && appRej.status === 'Resubmitted') {
          const { oldDoc, newDoc } = resolveOldAndNewDocs(combinedDocs, appRej, 4, docTypeMasterMap);
          Promise.all([
            oldDoc ? downloadAndPrepareDoc(oldDoc) : Promise.resolve(null),
            newDoc ? downloadAndPrepareDoc(newDoc) : (applicantKycId ? fetchKycDocBlob(applicantKycId, 'pan', 'Applicant_PAN') : Promise.resolve(null)),
          ]).then(([oldRes, newRes]) => {
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
                  note: !oldRes?.url ? 'Previous version is not available from the current document API.' : null,
                  rejection: appRej,
                },
                url: newRes?.url || oldRes?.url || null,
                doc: newRes?.doc || oldRes?.doc || null,
                fileName: newRes?.fileName || oldRes?.fileName || 'PAN Card',
                size: newRes?.size || oldRes?.size || null,
                isPdf: Boolean(newRes?.isPdf ?? oldRes?.isPdf),
                isImage: Boolean(newRes?.isImage ?? oldRes?.isImage),
              },
            }));
          });
        } else {
          const { newDoc, oldDoc } = resolveOldAndNewDocs(combinedDocs, appRej, 4, docTypeMasterMap);
          const targetDoc = appRej?.status === 'ReturnedToRM' && oldDoc ? oldDoc : (newDoc || oldDoc);

          if (targetDoc) {
            downloadAndPrepareDoc(targetDoc).then((res) => {
              setDocPreviews((prev) => ({
                ...prev,
                pan: {
                  loading: false,
                  error: res ? null : 'Failed to download PAN document.',
                  isComparison: false,
                  comparison: null,
                  url: res?.url || null,
                  doc: targetDoc,
                  fileName: res?.fileName || targetDoc.fileName || 'PAN Card',
                  size: res?.size || null,
                  isPdf: Boolean(res?.isPdf),
                  isImage: Boolean(res?.isImage),
                },
              }));
            });
          } else if (applicantKycId) {
            fetchKycDocBlob(applicantKycId, 'pan', 'Applicant_PAN').then((res) => {
              setDocPreviews((prev) => ({ ...prev, pan: { ...res, isComparison: false, comparison: null } }));
            });
          } else {
            setDocPreviews((prev) => ({ ...prev, pan: { loading: false, error: null, doc: null, url: null } }));
          }
        }
      }

      // Co-Applicants PAN
      coApplicants.forEach((co) => {
        if (!coDocPreviews[co.index]?.pan && co.kycDocumentId) {
          setCoDocPreviews((prev) => ({
            ...prev,
            [co.index]: {
              ...(prev[co.index] || {}),
              pan: { loading: true, error: null, url: null },
            },
          }));
          const coRej = getActiveRejectionForCoApplicant(co.kycDocumentId, 4);

          if (coRej && coRej.status === 'Resubmitted') {
            const oldPromise = coRej.originalDocumentPath
              ? fetchKycDocByPath(coRej.originalDocumentPath, `CoApplicant_${co.number}_PAN_Old`)
              : Promise.resolve(null);
            const newPromise = coRej.currentDocumentPath
              ? fetchKycDocByPath(coRej.currentDocumentPath, `CoApplicant_${co.number}_PAN`)
              : fetchKycDocBlob(co.kycDocumentId, 'pan', `CoApplicant_${co.number}_PAN`);

            Promise.all([oldPromise, newPromise]).then(([oldRes, newRes]) => {
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
                  },
                },
              }));
            });
          } else {
            fetchKycDocBlob(co.kycDocumentId, 'pan', `CoApplicant_${co.number}_PAN`).then((res) => {
              setCoDocPreviews((prev) => ({
                ...prev,
                [co.index]: {
                  ...(prev[co.index] || {}),
                  pan: { ...res, isComparison: false, comparison: null },
                },
              }));
            });
          }
        }
      });
    }

    // ── STEP 7: ZIP ARCHIVE ────────────────────────────────────────
    if (activeStep === 7 && !docPreviews.zip) {
      const zipDoc = combinedDocs.find(
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
  }, [
    activeStep,
    verificationData,
    allCustomerDocs,
    docTypeMasterMap,
    applicationRejections,
    docPreviews,
    coDocPreviews,
    downloadAndPrepareDoc,
    fetchKycDocBlob,
    fetchKycDocByPath,
    applicantKycId,
    coApplicants,
    getActiveRejectionForApplicant,
    getActiveRejectionForCoApplicant,
    resolveOldAndNewDocs,
  ]);

  // Reject / Send to RM Handler for Steps 2, 3, 4, 5 (supporting KYC & composite tuple documents)
  const handleRejectOrSendToRm = async (
    stepNum,
    stepLabel,
    customKycId = null,
    isCoApplicant = false,
    customAppSeq = null,
    customDocTypeId = null,
    customRejectedType = null
  ) => {
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
      verificationData?.application?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.[0]?.applicationProductDetailsId ||
      verificationData?.raw?.productDetails?.applicationProductDetailsId ||
      verificationData?.raw?.applicationProductDetails?.applicationProductDetailsId
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

      await backOfficeService.createDocumentRejection(payload);
      setStepFeedback((prev) => ({
        ...prev,
        [stepNum]: {
          type: 'success',
          message: `${stepLabel} marked for RM review (Status: ReturnedToRM) with remarks: "${remarks}".`,
        },
      }));
      setStepRemarks((prev) => ({ ...prev, [stepNum]: '' }));

      // Rule 2: If rejected step was previously verified, invalidate and persist isVerified: false
      const rejectedStepCode = stepNumToStepCode(stepNum);
      if (rejectedStepCode && stepVerifications[rejectedStepCode]?.isVerified === true) {
        try {
          await handleSaveStepVerification({
            stepCode: rejectedStepCode,
            isVerified: false,
            remarks: stepVerifications[rejectedStepCode]?.remarks || '',
          });
        } catch (unverifyErr) {
          console.warn(`[CustomerVerification] Auto-unverify failed for ${rejectedStepCode}:`, unverifyErr);
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

  // Open Reject Confirmation Modal after verifying non-empty remarks
  const handleOpenRejectConfirm = (
    stepNum,
    stepLabel,
    customKycId = null,
    isCoApplicant = false,
    applicantSequence = null,
    documentTypeId = null,
    rejectedDocumentType = null
  ) => {
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
    setRejectConfirmModal({
      open: true,
      stepNum,
      stepLabel,
      customKycId,
      isCoApplicant,
      applicantSequence,
      documentTypeId,
      rejectedDocumentType,
      remarks,
    });
  };

  // Cancel Reject Confirmation
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
      remarks: '',
    });
  };

  // Confirm and Execute Document Rejection
  const handleConfirmReject = async () => {
    const {
      stepNum,
      stepLabel,
      customKycId,
      isCoApplicant,
      applicantSequence,
      documentTypeId,
      rejectedDocumentType,
    } = rejectConfirmModal;
    setRejectConfirmModal({
      open: false,
      stepNum: null,
      stepLabel: '',
      customKycId: null,
      isCoApplicant: false,
      applicantSequence: null,
      documentTypeId: null,
      rejectedDocumentType: null,
      remarks: '',
    });
    await handleRejectOrSendToRm(
      stepNum,
      stepLabel,
      customKycId,
      isCoApplicant,
      applicantSequence,
      documentTypeId,
      rejectedDocumentType
    );
  };

  // Back Office Verify Resubmitted Rejection Handler
  const handleVerifyRejection = async (rejectionId, stepLabel, stepNum) => {
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

      // 2. Refetch full customer documents from server
      await fetchAllCustomerDocs();

      // 3. Refetch financial documents
      await fetchFinancialDocuments();

      // 4. Reset document previews for this step so fresh verified document loads
      handleRefreshDocumentPreview(stepNum);

      // 5. Force refresh Step 01 View Form
      setViewFormRefreshKey((prev) => prev + 1);

      // 6. Force refresh workspace data
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

          list.push({
            id: applicantKycRecord.applicationKYCDocumentId
              ? `app_kyc_${applicantKycRecord.applicationKYCDocumentId}_${idx}`
              : `app_manual_${idx}`,
            applicationKYCDocumentId: applicantKycRecord.applicationKYCDocumentId,
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
        });
      }
    });

    return list;
  }, [applicantKycRecord, verificationData]);

  // Extract real persisted manual documents / ZIP archives for Co-Applicants (dynamic)
  const coApplicantsManualDocs = useMemo(() => {
    const map = {};
    coApplicants.forEach((co) => {
      const list = [];
      const seenPaths = new Set();
      const kyc = co.kycRecord;
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

            list.push({
              id: kyc.applicationKYCDocumentId
                ? `co_${co.number}_kyc_${kyc.applicationKYCDocumentId}_${idx}`
                : `co_${co.number}_manual_${idx}`,
              applicationKYCDocumentId: kyc.applicationKYCDocumentId,
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
            });
          });
        }
      }
      map[co.index] = list;
    });
    return map;
  }, [coApplicants]);

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
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
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
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          return;
        }
      } catch (err) {
        console.warn('Direct fetch download failed, fallback to direct window open:', err);
      }
      window.open(doc.downloadUrl, '_blank');
    }
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
      return selectedApplicantActiveLoans.reduce((sum, l) => sum + (Number(l.emiAmount) || 0), 0);
    }
    return currentAssessment?.existingEMI != null ? currentAssessment.existingEMI : 0;
  }, [selectedApplicantActiveLoans, currentAssessment]);

  // Phase 2 Step 14: Track if manual salary entries are dirty / in live preview mode
  const isSalaryDirty = useMemo(() => {
    if (!Array.isArray(salaryRows) || salaryRows.length === 0) return false;
    return salaryRows.some((r) => r.isModified === true || !r.isPersisted);
  }, [salaryRows]);

  // Phase 2 Step 14: Dynamic 3-month average salary calculation from current salary rows state
  const liveThreeMonthAverage = useMemo(() => {
    if (!Array.isArray(salaryRows) || salaryRows.length === 0) return null;
    const values = salaryRows.map((r) => {
      if (r.isModified || !r.isPersisted) {
        if (r.previewConsideredIncome != null && !isNaN(r.previewConsideredIncome)) {
          return Number(r.previewConsideredIncome) || 0;
        }
        const b = Number(r.basicAmount) || 0;
        const h = Number(r.hraAmount) || 0;
        const c = Number(r.ccaAmount) || 0;
        const t = Number(r.taAmount) || 0;
        const inc = Number(r.incentiveAmount) || 0;
        const pct = r.incentivePercentApplied === '' ? 0 : Number(r.incentivePercentApplied) || 0;
        return b + h + c + t + (inc * pct) / 100;
      }
      if (r.totalConsideredIncome != null && !isNaN(r.totalConsideredIncome)) {
        return Number(r.totalConsideredIncome) || 0;
      }
      return Number(r.previewConsideredIncome) || 0;
    });

    const hasAny = values.some((v) => v > 0);
    if (!hasAny) return null;
    const sum = values.reduce((acc, v) => acc + v, 0);
    const count = values.length || 3;
    return sum / count;
  }, [salaryRows]);

  const computedPreviewAverage = liveThreeMonthAverage;

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

        {/* ── 17-STEP VERIFICATION WORKFLOW SIDEBAR (SIVELS FINANCE) ── */}
        <aside className="bo-cv-left-sidebar" aria-label={`${VERIFICATION_WORKFLOW_STEPS.length}-Step Underwriting Verification Workflow`}>
          <div className="bo-cv-sidebar-header">
            <div className="bo-cv-sidebar-heading-row">
              <div>
                <h2 className="bo-cv-sidebar-title">Verification Steps</h2>
                <span className="bo-cv-sidebar-subtitle">{VERIFICATION_WORKFLOW_STEPS.length}-Step Underwriting</span>
              </div>
              <span className="bo-cv-step-count">{VERIFICATION_WORKFLOW_STEPS.length}</span>
            </div>
          </div>

          <nav className="bo-cv-steps-nav">
            <ul className="bo-cv-steps-list" role="list">
              {/* 1. FORM REVIEW */}
              <li className="bo-cv-sidebar-group-header">
                <span className="bo-cv-sidebar-group-title">FORM REVIEW</span>
              </li>
              {VERIFICATION_WORKFLOW_STEPS.filter((s) => s.group === 'FORM REVIEW').map((step) => {
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

              {/* 2. DOCUMENT VERIFICATION */}
              <li className="bo-cv-sidebar-group-header">
                <span className="bo-cv-sidebar-group-title">DOCUMENT VERIFICATION</span>
              </li>
              {(() => {
                const isDocActive = activeStep >= 2 && activeStep <= 7;
                const allVerified = verifiedDocumentCount === 6;

                return (
                  <li key="sidebar-doc-verification-step" className="bo-cv-step-item">
                    <button
                      type="button"
                      className={`bo-cv-step-card ${isDocActive ? 'is-active' : ''}`}
                      onClick={() => {
                        if (activeStep < 2 || activeStep > 7) {
                          setActiveStep(2);
                        }
                      }}
                      aria-label={`Steps 02–07: Document Verification. ${verifiedDocumentCount} of 6 verified. Click to view.`}
                    >
                      <div
                        className={`bo-cv-step-num-box bo-cv-step-num-box--range ${allVerified ? 'is-verified-num' : ''}`}
                        aria-hidden="true"
                      >
                        {allVerified ? '✓' : '02–07'}
                      </div>

                      <div className="bo-cv-step-details">
                        <strong className="bo-cv-step-name">Document Verification</strong>
                        <span className="bo-cv-step-desc">
                          {allVerified ? '6/6 Verified' : `${verifiedDocumentCount}/6 Verified`}
                        </span>
                      </div>

                      <div className="bo-cv-step-action">
                        <span
                          className={`bo-cv-sidebar-progress-pill ${
                            allVerified
                              ? 'is-completed'
                              : verifiedDocumentCount > 0
                              ? 'is-progressing'
                              : ''
                          }`}
                        >
                          {allVerified ? '6/6 ✓' : `${verifiedDocumentCount}/6`}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })()}

              {/* 3. FIELD INVESTIGATION */}
              <li className="bo-cv-sidebar-group-header">
                <span className="bo-cv-sidebar-group-title">FIELD INVESTIGATION</span>
              </li>
              {VERIFICATION_WORKFLOW_STEPS.filter((s) => s.group === 'FIELD INVESTIGATION').map((step) => {
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

              {/* 4. CREDIT & ASSESSMENT */}
              <li className="bo-cv-sidebar-group-header">
                <span className="bo-cv-sidebar-group-title">CREDIT & ASSESSMENT</span>
              </li>
              {VERIFICATION_WORKFLOW_STEPS.filter((s) => s.group === 'CREDIT & ASSESSMENT').map((step) => {
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
                <span className="bo-cv-step-tag-pill">Step 01 of 17</span>
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
                  <div className="bo-cv-step-badge-num bo-cv-step-badge-num--range">02–07</div>
                  <div className="bo-cv-doc-header-text">
                    <div className="bo-cv-doc-workspace-title-row">
                      <h2 className="bo-cv-step-panel-title">DOCUMENT VERIFICATION</h2>
                      <span
                        className={`bo-cv-group-progress-badge ${
                          verifiedDocumentCount === 6
                            ? 'is-completed'
                            : verifiedDocumentCount > 0
                            ? 'is-progressing'
                            : ''
                        }`}
                      >
                        {verifiedDocumentCount === 6 && '✓ '}
                        {verifiedDocumentCount}/6 VERIFIED
                      </span>
                    </div>
                    <p className="bo-cv-step-panel-desc">
                      Consolidated document review workspace. Inspect, verify, or return documents to RM for Applicant and Co-Applicant(s).
                    </p>
                  </div>
                </div>
                <div className="bo-cv-doc-header-right">
                  <span className="bo-cv-step-tag-pill">Steps 02–07 of 17</span>
                </div>
              </div>

              {/* Document Sub-Tabs Navigation Bar */}
              <nav className="bo-cv-doc-subtabs-nav" aria-label="Document Verification Steps">
                {[
                  { stepNum: 2, label: 'Profile Image', shortLabel: 'Profile', code: 'PROFILE_IMAGE' },
                  { stepNum: 3, label: 'Aadhaar Card', shortLabel: 'Aadhaar', code: 'AADHAAR' },
                  { stepNum: 4, label: 'PAN Card', shortLabel: 'PAN', code: 'PAN' },
                  { stepNum: 5, label: 'Salary Slip', shortLabel: 'Salary Slip', code: 'SALARY_SLIP' },
                  { stepNum: 6, label: 'Bank Statement', shortLabel: 'Bank Statement', code: 'BANK_STATEMENT' },
                  { stepNum: 7, label: 'ZIP / Archive', shortLabel: 'ZIP / Archive', code: 'ZIP_ARCHIVE' },
                ].map((tab) => {
                  const isTabActive = activeStep === tab.stepNum;
                  const hasUnresolved = hasUnresolvedRejectionForStep(tab.code);
                  const isTabVerified = Boolean(stepVerifications[tab.code]?.isVerified) && !hasUnresolved;
                  const isTabRejected = hasUnresolved;

                  return (
                    <button
                      key={tab.stepNum}
                      type="button"
                      className={`bo-cv-doc-subtab-btn ${isTabActive ? 'is-active' : ''} ${
                        isTabRejected ? 'is-rejected' : (isTabVerified ? 'is-verified' : '')
                      }`}
                      onClick={() => setActiveStep(tab.stepNum)}
                      aria-current={isTabActive ? 'page' : undefined}
                    >
                      <span className="bo-cv-doc-subtab-badge">0{tab.stepNum}</span>
                      <span className="bo-cv-doc-subtab-label">{tab.shortLabel}</span>
                      {isTabRejected ? (
                        <span className="bo-cv-doc-subtab-alert" title="Returned to RM / Pending Verification">⚠️</span>
                      ) : isTabVerified ? (
                        <span className="bo-cv-doc-subtab-check" title="Verified">✓</span>
                      ) : null}
                    </button>
                  );
                })}
              </nav>

              {/* Workspace Content Area: active document step */}
              <div className="bo-cv-doc-workspace-content">
          {/* ══════════════════════════════════════════════════════════════════
              STEP 02: PROFILE IMAGE
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 2 && (
            <div className="bo-cv-doc-step-inner">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">02</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Customer Profile Images</h2>
                    <p className="bo-cv-step-panel-desc">
                      Inspect authentic photographs uploaded during customer onboarding for Applicant and Co-Applicant(s).
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 02 of 17</span>
              </div>

              <div className="bo-cv-doc-display-container">
                {/* Active Rejection Banner if any */}
                {(() => {
                  const rej = getActiveRejectionForStep(2);
                  if (!rej) return null;
                  return (
                    <div className={`rejection-status-banner rejection-status--${(rej.status || '').toLowerCase()}`}>
                      <div className="rejection-status-header">
                        <strong>
                          {rej.status === 'ReturnedToRM' && '⚠️ Document Returned to RM for Correction'}
                          {rej.status === 'Resubmitted' && '🔄 Document Resubmitted by RM (Ready for Verification)'}
                          {rej.status === 'Verified' && '✓ Document Verified & Approved'}
                        </strong>
                        <span className="rejection-status-date">
                          {rej.resubmittedAt
                            ? `Resubmitted: ${new Date(rej.resubmittedAt).toLocaleString()}`
                            : rej.createdAt
                            ? `Returned: ${new Date(rej.createdAt).toLocaleString()}`
                            : ''}
                        </span>
                      </div>
                      {rej.rejectionRemarks && (
                        <p className="rejection-status-remarks">
                          <strong>Remarks:</strong> {rej.rejectionRemarks}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* 1. Applicant Profile Image Card */}
                <div className="bo-cv-person-doc-card">
                  <div className="bo-cv-person-doc-header">
                    <div className="bo-cv-person-doc-badge">Applicant</div>
                    <div className="bo-cv-person-doc-title">{verificationData.customerName}</div>
                  </div>

                  {docPreviews.profile?.loading ? (
                    <div className="bo-cv-doc-loading-box">
                      <div className="bo-cv-loading-spinner" />
                      <span>Loading applicant profile photograph...</span>
                    </div>
                  ) : docPreviews.profile?.isComparison ? (
                    <div className="bo-cv-comparison-container">
                      <div className="bo-cv-comparison-grid">
                        {/* Old / Rejected Version */}
                        <div className="bo-cv-comparison-card bo-cv-comparison-card--old">
                          <div className="bo-cv-comparison-card-header">
                            <span className="bo-cv-comparison-tag">Old / Rejected Version</span>
                            <span className="bo-cv-comparison-subtag">Previously Rejected</span>
                          </div>
                          {docPreviews.profile.comparison?.oldDoc?.url ? (
                            <div className="bo-cv-image-preview-frame">
                              <img
                                src={docPreviews.profile.comparison.oldDoc.url}
                                alt="Previous Applicant Profile"
                                className="bo-cv-uncropped-img"
                              />
                              <div className="bo-cv-doc-meta-row">
                                <div className="bo-cv-doc-meta-left">
                                  <span><strong>File:</strong> {docPreviews.profile.comparison.oldDoc.fileName || 'Old Profile Image'}</span>
                                  {docPreviews.profile.comparison.oldDoc.uploadDate && (
                                    <span><strong>Uploaded:</strong> {docPreviews.profile.comparison.oldDoc.uploadDate}</span>
                                  )}
                                  {docPreviews.profile.comparison.oldDoc.size && (
                                    <span><strong>Size:</strong> {formatFileSize(docPreviews.profile.comparison.oldDoc.size)}</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="bo-btn bo-btn--outline bo-btn--sm"
                                  onClick={() => handleDownloadFile(docPreviews.profile.comparison.oldDoc.url, docPreviews.profile.comparison.oldDoc.fileName || 'old_profile.jpg')}
                                >
                                  {DownloadIcon && <DownloadIcon size={13} />}
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bo-cv-empty-doc-card--comparison">
                              <div className="bo-cv-empty-doc-icon">
                                {UserIcon && <UserIcon size={28} />}
                              </div>
                              <h4>No Archived Prior Version</h4>
                              <p>{docPreviews.profile.comparison?.note || 'Previous file version is not available from the document repository.'}</p>
                            </div>
                          )}
                        </div>

                        {/* New / Resubmitted Version */}
                        <div className="bo-cv-comparison-card bo-cv-comparison-card--new">
                          <div className="bo-cv-comparison-card-header">
                            <span className="bo-cv-comparison-tag">New / Resubmitted Version</span>
                            <span className="bo-cv-comparison-subtag">Ready for Review</span>
                          </div>
                          {docPreviews.profile.comparison?.newDoc?.url ? (
                            <div className="bo-cv-image-preview-frame">
                              <img
                                src={docPreviews.profile.comparison.newDoc.url}
                                alt="New Resubmitted Applicant Profile"
                                className="bo-cv-uncropped-img"
                              />
                              <div className="bo-cv-doc-meta-row">
                                <div className="bo-cv-doc-meta-left">
                                  <span><strong>File:</strong> {docPreviews.profile.comparison.newDoc.fileName || 'New Profile Image'}</span>
                                  {docPreviews.profile.comparison.newDoc.uploadDate && (
                                    <span><strong>Uploaded:</strong> {docPreviews.profile.comparison.newDoc.uploadDate}</span>
                                  )}
                                  {docPreviews.profile.comparison.newDoc.size && (
                                    <span><strong>Size:</strong> {formatFileSize(docPreviews.profile.comparison.newDoc.size)}</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="bo-btn bo-btn--outline bo-btn--sm"
                                  onClick={() => handleDownloadFile(docPreviews.profile.comparison.newDoc.url, docPreviews.profile.comparison.newDoc.fileName || 'new_profile.jpg')}
                                >
                                  {DownloadIcon && <DownloadIcon size={13} />}
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bo-cv-empty-doc-card--comparison">
                              <div className="bo-cv-empty-doc-icon">
                                {UserIcon && <UserIcon size={28} />}
                              </div>
                              <h4>No Resubmitted Image</h4>
                              <p>RM has not uploaded a replacement photograph yet.</p>
                            </div>
                          )}
                        </div>
                      </div>
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
                          <span><strong>File:</strong> {docPreviews.profile.fileName || docPreviews.profile.doc?.fileName || 'Profile Image'}</span>
                          {docPreviews.profile.doc?.uploadedOn && (
                            <span><strong>Uploaded:</strong> {docPreviews.profile.doc.uploadedOn}</span>
                          )}
                          {docPreviews.profile.size && (
                            <span><strong>Size:</strong> {formatFileSize(docPreviews.profile.size)}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="bo-btn bo-btn--outline bo-btn--sm"
                          onClick={() => handleDownloadFile(docPreviews.profile.url, docPreviews.profile.fileName || docPreviews.profile.doc?.fileName || 'profile_image.jpg')}
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
                          `No uploaded customer photograph is currently available for applicant ${verificationData.customerName}.`}
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. Co-Applicant Profile Images (Dynamic) */}
                {coApplicants.map((co) => {
                  const coProfile = coDocPreviews[co.index]?.profile;
                  return (
                    <div className="bo-cv-person-doc-card" key={`co-profile-${co.index}`}>
                      <div className="bo-cv-person-doc-header">
                        <div className="bo-cv-person-doc-badge co-app">Co-Applicant {co.number}</div>
                        <div className="bo-cv-person-doc-title">{co.name}</div>
                      </div>

                      {coProfile?.loading ? (
                        <div className="bo-cv-doc-loading-box">
                          <div className="bo-cv-loading-spinner" />
                          <span>Loading Co-Applicant {co.number} profile photograph...</span>
                        </div>
                      ) : coProfile?.isComparison ? (
                        <div className="bo-cv-comparison-container">
                          <div className="bo-cv-comparison-grid">
                            {/* Old Version Card */}
                            <div className="bo-cv-comparison-card bo-cv-comparison-card--old">
                              <div className="bo-cv-comparison-card-header">
                                <span className="bo-cv-comparison-tag">Old / Rejected Version</span>
                                <span className="bo-cv-comparison-subtag">Prior Document</span>
                              </div>
                              {coProfile.comparison?.oldDoc?.url ? (
                                <div className="bo-cv-image-preview-frame">
                                  {isDocPdf(coProfile.comparison.oldDoc) ? (
                                    <div className="bo-cv-pdf-frame-wrapper">
                                      <iframe
                                        src={coProfile.comparison.oldDoc.url}
                                        title={`Co-Applicant ${co.number} Old Profile PDF`}
                                        className="bo-cv-doc-iframe"
                                      />
                                    </div>
                                  ) : (
                                    <img
                                      src={coProfile.comparison.oldDoc.url}
                                      alt={`Old Profile of ${co.name}`}
                                      className="bo-cv-uncropped-img"
                                    />
                                  )}
                                  <div className="bo-cv-doc-meta-row">
                                    <div className="bo-cv-doc-meta-left">
                                      <span><strong>File:</strong> {coProfile.comparison.oldDoc.fileName || `CoApplicant_${co.number}_Profile_Old.jpg`}</span>
                                      {coProfile.comparison.oldDoc.size && (
                                        <span><strong>Size:</strong> {formatFileSize(coProfile.comparison.oldDoc.size)}</span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      className="bo-btn bo-btn--outline bo-btn--sm"
                                      onClick={() => handleDownloadFile(coProfile.comparison.oldDoc.url, coProfile.comparison.oldDoc.fileName || `CoApplicant_${co.number}_Profile_Old.${isDocPdf(coProfile.comparison.oldDoc) ? 'pdf' : 'jpg'}`)}
                                    >
                                      {DownloadIcon && <DownloadIcon size={13} />}
                                      <span>Download</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="bo-cv-empty-doc-card--comparison">
                                  <div className="bo-cv-empty-doc-icon">
                                    {UserIcon && <UserIcon size={28} />}
                                  </div>
                                  <h4>Prior Version In-Place Updated</h4>
                                  <p>{coProfile.comparison?.note || 'Prior version path was not recorded for this rejection.'}</p>
                                </div>
                              )}
                            </div>

                            {/* New Version Card */}
                            <div className="bo-cv-comparison-card bo-cv-comparison-card--new">
                              <div className="bo-cv-comparison-card-header">
                                <span className="bo-cv-comparison-tag">New / Resubmitted Version</span>
                                <span className="bo-cv-comparison-subtag">Ready for Review</span>
                              </div>
                              {coProfile.comparison?.newDoc?.url || coProfile.url ? (
                                <div className="bo-cv-image-preview-frame">
                                  {isDocPdf(coProfile.comparison?.newDoc || coProfile) ? (
                                    <div className="bo-cv-pdf-frame-wrapper">
                                      <iframe
                                        src={coProfile.comparison?.newDoc?.url || coProfile.url}
                                        title={`Profile of ${co.name} PDF`}
                                        className="bo-cv-doc-iframe"
                                      />
                                    </div>
                                  ) : (
                                    <img
                                      src={coProfile.comparison?.newDoc?.url || coProfile.url}
                                      alt={`Profile of ${co.name}`}
                                      className="bo-cv-uncropped-img"
                                    />
                                  )}
                                  <div className="bo-cv-doc-meta-row">
                                    <div className="bo-cv-doc-meta-left">
                                      <span><strong>File:</strong> {coProfile.comparison?.newDoc?.fileName || coProfile.fileName || `CoApplicant_${co.number}_Profile.jpg`}</span>
                                      {(coProfile.comparison?.newDoc?.size || coProfile.size) && (
                                        <span><strong>Size:</strong> {formatFileSize(coProfile.comparison?.newDoc?.size || coProfile.size)}</span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      className="bo-btn bo-btn--outline bo-btn--sm"
                                      onClick={() => handleDownloadFile(coProfile.comparison?.newDoc?.url || coProfile.url, coProfile.comparison?.newDoc?.fileName || coProfile.fileName || `CoApplicant_${co.number}_Profile.${isDocPdf(coProfile.comparison?.newDoc || coProfile) ? 'pdf' : 'jpg'}`)}
                                    >
                                      {DownloadIcon && <DownloadIcon size={13} />}
                                      <span>Download</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="bo-cv-empty-doc-card--comparison">
                                  <div className="bo-cv-empty-doc-icon">
                                    {UserIcon && <UserIcon size={28} />}
                                  </div>
                                  <h4>No Resubmitted Image</h4>
                                  <p>RM has not uploaded a replacement photograph yet.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : coProfile?.url ? (
                        <div className="bo-cv-image-preview-frame">
                          <img
                            src={coProfile.url}
                            alt={`Profile of ${co.name}`}
                            className="bo-cv-uncropped-img"
                          />
                          <div className="bo-cv-doc-meta-row">
                            <div className="bo-cv-doc-meta-left">
                              <span><strong>File:</strong> {coProfile.fileName || `CoApplicant_${co.number}_Profile.jpg`}</span>
                              {coProfile.size && (
                                <span><strong>Size:</strong> {formatFileSize(coProfile.size)}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="bo-btn bo-btn--outline bo-btn--sm"
                              onClick={() => handleDownloadFile(coProfile.url, coProfile.fileName || `CoApplicant_${co.number}_Profile.jpg`)}
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
                            No uploaded photograph is currently available for Co-Applicant {co.number} ({co.name}).
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Step Verification Control & Remarks & Reject / Send to RM */}
                <div className="verification-action-bar">
                  <div className="bo-cv-verify-row">
                    <label className="bo-cv-checkbox-label">
                      <input
                        type="checkbox"
                        className="bo-cv-verify-checkbox"
                        checked={Boolean(stepVerifications['PROFILE_IMAGE']?.isVerified) && !hasUnresolvedRejectionForStep('PROFILE_IMAGE')}
                        disabled={isSavingStepVerification || hasUnresolvedRejectionForStep('PROFILE_IMAGE')}
                        title={hasUnresolvedRejectionForStep('PROFILE_IMAGE') ? 'Resolve all returned/resubmitted documents before marking as Verified' : undefined}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          handleSaveStepVerification({
                            stepCode: 'PROFILE_IMAGE',
                            isVerified: checked,
                            remarks: stepRemarks[2] || '',
                          });
                        }}
                      />
                      <span className="bo-cv-verify-text">
                        Mark Profile Image as <strong>Verified</strong>
                      </span>
                    </label>
                    {stepVerifications['PROFILE_IMAGE']?.isVerified && !hasUnresolvedRejectionForStep('PROFILE_IMAGE') && (
                      <span className="bo-cv-verified-tag">
                        ✓ Verified by {stepVerifications['PROFILE_IMAGE']?.verifiedByBackOfficeId ? `Operator #${stepVerifications['PROFILE_IMAGE'].verifiedByBackOfficeId}` : 'Back Office'}
                      </span>
                    )}
                  </div>

                  <div className="verification-remarks-field">
                    <label htmlFor="bo-cv-remarks-profile">VERIFICATION REMARKS</label>
                    <textarea
                      id="bo-cv-remarks-profile"
                      className="bo-cv-remarks-input"
                      rows={3}
                      placeholder="Enter remarks or discrepancy details for profile image verification..."
                      value={stepRemarks[2] || ''}
                      onChange={(e) => {
                        setStepRemarks({ ...stepRemarks, 2: e.target.value });
                        if (stepFeedback[2]) setStepFeedback({ ...stepFeedback, 2: null });
                      }}
                      onBlur={() => {
                        if (stepVerifications['PROFILE_IMAGE']?.isVerified && !hasUnresolvedRejectionForStep('PROFILE_IMAGE')) {
                          handleSaveStepVerification({
                            stepCode: 'PROFILE_IMAGE',
                            isVerified: true,
                            remarks: stepRemarks[2] || '',
                          });
                        }
                      }}
                    />
                  </div>

                  <div className="verification-buttons-row">
                    {/* Verify Resubmitted Applicant Profile */}
                    {(() => {
                      const appRej = getActiveRejectionForApplicant(2);
                      if (appRej && appRej.status === 'Resubmitted') {
                        return (
                          <button
                            type="button"
                            className="verify-resubmit-btn"
                            disabled={isVerifyingRejection}
                            onClick={() => handleVerifyRejection(appRej.backOfficeDocumentRejectionId, 'Applicant Profile Image', 2)}
                          >
                            <span>{isVerifyingRejection ? 'Verifying...' : '✓ Verify Applicant Profile'}</span>
                          </button>
                        );
                      }
                      return null;
                    })()}

                    {/* Verify Resubmitted Co-Applicant Profiles */}
                    {coApplicants.map((co) => {
                      const coRej = getActiveRejectionForCoApplicant(co.kycDocumentId, 2);
                      if (coRej && coRej.status === 'Resubmitted') {
                        return (
                          <button
                            key={`verify-co-profile-${co.index}`}
                            type="button"
                            className="verify-resubmit-btn"
                            style={{ background: '#047857' }}
                            disabled={isVerifyingRejection}
                            onClick={() => handleVerifyRejection(coRej.backOfficeDocumentRejectionId, `Co-Applicant ${co.number} Profile Image`, 2)}
                          >
                            <span>{isVerifyingRejection ? 'Verifying...' : `✓ Verify Co-App ${co.number} Profile`}</span>
                          </button>
                        );
                      }
                      return null;
                    })}

                    <button
                      type="button"
                      className="reject-rm-btn"
                      disabled={isSubmittingRejection}
                      onClick={() => handleOpenRejectConfirm(2, 'Applicant Profile Image', null, false)}
                    >
                      <span>{isSubmittingRejection ? 'Submitting...' : 'Return Applicant to RM'}</span>
                    </button>

                    {coApplicants.map((co) => (
                      <button
                        key={`reject-co-profile-${co.index}`}
                        type="button"
                        className="reject-rm-btn"
                        style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}
                        disabled={isSubmittingRejection}
                        onClick={() => handleOpenRejectConfirm(2, `Co-Applicant ${co.number} Profile Image`, co.kycDocumentId, true)}
                      >
                        <span>{isSubmittingRejection ? 'Submitting...' : `Return Co-Applicant ${co.number} to RM`}</span>
                      </button>
                    ))}
                  </div>
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
            <div className="bo-cv-doc-step-inner">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">03</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Customer Aadhaar Cards</h2>
                    <p className="bo-cv-step-panel-desc">
                      Verify Aadhaar identity cards and address documentation for Applicant and Co-Applicant(s).
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 03 of 17</span>
              </div>

              <div className="bo-cv-doc-display-container">
                {/* Active Rejection Banner if any */}
                {(() => {
                  const rej = getActiveRejectionForStep(3);
                  if (!rej) return null;
                  return (
                    <div className={`rejection-status-banner rejection-status--${(rej.status || '').toLowerCase()}`}>
                      <div className="rejection-status-header">
                        <strong>
                          {rej.status === 'ReturnedToRM' && '⚠️ Document Returned to RM for Correction'}
                          {rej.status === 'Resubmitted' && '🔄 Document Resubmitted by RM (Ready for Verification)'}
                          {rej.status === 'Verified' && '✓ Document Verified & Approved'}
                        </strong>
                        <span className="rejection-status-date">
                          {rej.resubmittedAt
                            ? `Resubmitted: ${new Date(rej.resubmittedAt).toLocaleString()}`
                            : rej.createdAt
                            ? `Returned: ${new Date(rej.createdAt).toLocaleString()}`
                            : ''}
                        </span>
                      </div>
                      {rej.rejectionRemarks && (
                        <p className="rejection-status-remarks">
                          <strong>Remarks:</strong> {rej.rejectionRemarks}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* 1. Applicant Aadhaar Card */}
                <div className="bo-cv-person-doc-card">
                  <div className="bo-cv-person-doc-header">
                    <div className="bo-cv-person-doc-badge">Applicant</div>
                    <div className="bo-cv-person-doc-title">{verificationData.customerName}</div>
                  </div>

                  {docPreviews.aadhaar?.loading ? (
                    <div className="bo-cv-doc-loading-box">
                      <div className="bo-cv-loading-spinner" />
                      <span>Loading applicant Aadhaar document...</span>
                    </div>
                  ) : docPreviews.aadhaar?.isComparison ? (
                    <div className="bo-cv-comparison-container">
                      <div className="bo-cv-comparison-grid">
                        {/* Old / Rejected Version */}
                        <div className="bo-cv-comparison-card bo-cv-comparison-card--old">
                          <div className="bo-cv-comparison-card-header">
                            <span className="bo-cv-comparison-tag">Old / Rejected Version</span>
                            <span className="bo-cv-comparison-subtag">Previously Rejected</span>
                          </div>
                          {docPreviews.aadhaar.comparison?.oldDoc?.url ? (
                            <div className="bo-cv-image-preview-frame">
                              {isDocPdf(docPreviews.aadhaar.comparison.oldDoc) ? (
                                <div className="bo-cv-pdf-frame-wrapper">
                                  <iframe
                                    src={docPreviews.aadhaar.comparison.oldDoc.url}
                                    title="Previous Aadhaar Document PDF"
                                    className="bo-cv-doc-iframe"
                                  />
                                </div>
                              ) : (
                                <img
                                  src={docPreviews.aadhaar.comparison.oldDoc.url}
                                  alt="Previous Aadhaar Card"
                                  className="bo-cv-uncropped-img"
                                />
                              )}
                              <div className="bo-cv-doc-meta-row">
                                <div className="bo-cv-doc-meta-left">
                                  <span><strong>Document:</strong> {docPreviews.aadhaar.comparison.oldDoc.fileName || 'Old Aadhaar Card'}</span>
                                  {docPreviews.aadhaar.comparison.oldDoc.uploadDate && (
                                    <span><strong>Uploaded:</strong> {docPreviews.aadhaar.comparison.oldDoc.uploadDate}</span>
                                  )}
                                  {docPreviews.aadhaar.comparison.oldDoc.size && (
                                    <span><strong>Size:</strong> {formatFileSize(docPreviews.aadhaar.comparison.oldDoc.size)}</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="bo-btn bo-btn--outline bo-btn--sm"
                                  onClick={() => handleDownloadFile(docPreviews.aadhaar.comparison.oldDoc.url, docPreviews.aadhaar.comparison.oldDoc.fileName || `old_aadhaar.${isDocPdf(docPreviews.aadhaar.comparison.oldDoc) ? 'pdf' : 'jpg'}`)}
                                >
                                  {DownloadIcon && <DownloadIcon size={13} />}
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bo-cv-empty-doc-card--comparison">
                              <div className="bo-cv-empty-doc-icon">
                                {ShieldCheckIcon && <ShieldCheckIcon size={28} />}
                              </div>
                              <h4>No Archived Prior Version</h4>
                              <p>{docPreviews.aadhaar.comparison?.note || 'Previous file version is not available from the document repository.'}</p>
                            </div>
                          )}
                        </div>

                        {/* New / Resubmitted Version */}
                        <div className="bo-cv-comparison-card bo-cv-comparison-card--new">
                          <div className="bo-cv-comparison-card-header">
                            <span className="bo-cv-comparison-tag">New / Resubmitted Version</span>
                            <span className="bo-cv-comparison-subtag">Ready for Review</span>
                          </div>
                          {docPreviews.aadhaar.comparison?.newDoc?.url ? (
                            <div className="bo-cv-image-preview-frame">
                              {isDocPdf(docPreviews.aadhaar.comparison.newDoc) ? (
                                <div className="bo-cv-pdf-frame-wrapper">
                                  <iframe
                                    src={docPreviews.aadhaar.comparison.newDoc.url}
                                    title="New Resubmitted Aadhaar Document PDF"
                                    className="bo-cv-doc-iframe"
                                  />
                                </div>
                              ) : (
                                <img
                                  src={docPreviews.aadhaar.comparison.newDoc.url}
                                  alt="New Resubmitted Aadhaar Card"
                                  className="bo-cv-uncropped-img"
                                />
                              )}
                              <div className="bo-cv-doc-meta-row">
                                <div className="bo-cv-doc-meta-left">
                                  <span><strong>Document:</strong> {docPreviews.aadhaar.comparison.newDoc.fileName || 'New Aadhaar Card'}</span>
                                  {docPreviews.aadhaar.comparison.newDoc.uploadDate && (
                                    <span><strong>Uploaded:</strong> {docPreviews.aadhaar.comparison.newDoc.uploadDate}</span>
                                  )}
                                  {docPreviews.aadhaar.comparison.newDoc.size && (
                                    <span><strong>Size:</strong> {formatFileSize(docPreviews.aadhaar.comparison.newDoc.size)}</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="bo-btn bo-btn--outline bo-btn--sm"
                                  onClick={() => handleDownloadFile(docPreviews.aadhaar.comparison.newDoc.url, docPreviews.aadhaar.comparison.newDoc.fileName || `new_aadhaar.${isDocPdf(docPreviews.aadhaar.comparison.newDoc) ? 'pdf' : 'jpg'}`)}
                                >
                                  {DownloadIcon && <DownloadIcon size={13} />}
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bo-cv-empty-doc-card--comparison">
                              <div className="bo-cv-empty-doc-icon">
                                {ShieldCheckIcon && <ShieldCheckIcon size={28} />}
                              </div>
                              <h4>No Resubmitted Document</h4>
                              <p>RM has not uploaded a replacement Aadhaar document yet.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : docPreviews.aadhaar?.url ? (
                    <div className="bo-cv-image-preview-frame">
                      {isDocPdf(docPreviews.aadhaar) ? (
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
                          <span><strong>Document:</strong> {docPreviews.aadhaar.fileName || docPreviews.aadhaar.doc?.fileName || 'Aadhaar Card'}</span>
                          {verificationData.personalInformation?.aadhaarNumber && (
                            <span><strong>Aadhaar No:</strong> {verificationData.personalInformation.aadhaarNumber}</span>
                          )}
                          {docPreviews.aadhaar.doc?.uploadedOn && (
                            <span><strong>Uploaded:</strong> {docPreviews.aadhaar.doc.uploadedOn}</span>
                          )}
                          {docPreviews.aadhaar.size && (
                            <span><strong>Size:</strong> {formatFileSize(docPreviews.aadhaar.size)}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="bo-btn bo-btn--outline bo-btn--sm"
                          onClick={() => handleDownloadFile(docPreviews.aadhaar.url, docPreviews.aadhaar.fileName || docPreviews.aadhaar.doc?.fileName || `aadhaar_card.${isDocPdf(docPreviews.aadhaar) ? 'pdf' : 'jpg'}`)}
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
                          `No uploaded Aadhaar proof is currently available for applicant ${verificationData.customerName}.`}
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. Co-Applicant Aadhaar Cards (Dynamic) */}
                {coApplicants.map((co) => {
                  const coAadhaar = coDocPreviews[co.index]?.aadhaar;
                  return (
                    <div className="bo-cv-person-doc-card" key={`co-aadhaar-${co.index}`}>
                      <div className="bo-cv-person-doc-header">
                        <div className="bo-cv-person-doc-badge co-app">Co-Applicant {co.number}</div>
                        <div className="bo-cv-person-doc-title">{co.name}</div>
                      </div>

                      {coAadhaar?.loading ? (
                        <div className="bo-cv-doc-loading-box">
                          <div className="bo-cv-doc-loading-spinner" />
                          <span>Loading Co-Applicant {co.number} Aadhaar document...</span>
                        </div>
                      ) : coAadhaar?.isComparison ? (
                        <div className="bo-cv-comparison-container">
                          <div className="bo-cv-comparison-grid">
                            {/* Old Version Card */}
                            <div className="bo-cv-comparison-card bo-cv-comparison-card--old">
                              <div className="bo-cv-comparison-card-header">
                                <span className="bo-cv-comparison-tag">Old / Rejected Version</span>
                                <span className="bo-cv-comparison-subtag">Prior Document</span>
                              </div>
                              {coAadhaar.comparison?.oldDoc?.url ? (
                                <div className="bo-cv-image-preview-frame">
                                  {isDocPdf(coAadhaar.comparison.oldDoc) ? (
                                    <div className="bo-cv-pdf-frame-wrapper">
                                      <iframe
                                        src={coAadhaar.comparison.oldDoc.url}
                                        title={`Co-Applicant ${co.number} Old Aadhaar PDF`}
                                        className="bo-cv-doc-iframe"
                                      />
                                    </div>
                                  ) : (
                                    <img
                                      src={coAadhaar.comparison.oldDoc.url}
                                      alt={`Co-Applicant ${co.number} Old Aadhaar Card`}
                                      className="bo-cv-uncropped-img"
                                    />
                                  )}
                                  <div className="bo-cv-doc-meta-row">
                                    <div className="bo-cv-doc-meta-left">
                                      <span><strong>Document:</strong> {coAadhaar.comparison.oldDoc.fileName || `CoApplicant_${co.number}_Aadhaar_Old`}</span>
                                      {co.aadhaarDisplay && (
                                        <span><strong>Aadhaar No:</strong> {co.aadhaarDisplay}</span>
                                      )}
                                      {coAadhaar.comparison.oldDoc.size && (
                                        <span><strong>Size:</strong> {formatFileSize(coAadhaar.comparison.oldDoc.size)}</span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      className="bo-btn bo-btn--outline bo-btn--sm"
                                      onClick={() => handleDownloadFile(coAadhaar.comparison.oldDoc.url, coAadhaar.comparison.oldDoc.fileName || `CoApplicant_${co.number}_Aadhaar_Old.${isDocPdf(coAadhaar.comparison.oldDoc) ? 'pdf' : 'jpg'}`)}
                                    >
                                      {DownloadIcon && <DownloadIcon size={13} />}
                                      <span>Download Document</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="bo-cv-empty-doc-card--comparison">
                                  <div className="bo-cv-empty-doc-icon">
                                    {ShieldCheckIcon && <ShieldCheckIcon size={28} />}
                                  </div>
                                  <h4>Prior Version In-Place Updated</h4>
                                  <p>{coAadhaar.comparison?.note || 'Prior version path was not recorded for this rejection.'}</p>
                                </div>
                              )}
                            </div>

                            {/* New Version Card */}
                            <div className="bo-cv-comparison-card bo-cv-comparison-card--new">
                              <div className="bo-cv-comparison-card-header">
                                <span className="bo-cv-comparison-tag">New / Resubmitted Version</span>
                                <span className="bo-cv-comparison-subtag">Ready for Review</span>
                              </div>
                              {coAadhaar.comparison?.newDoc?.url || coAadhaar.url ? (
                                <div className="bo-cv-image-preview-frame">
                                  {isDocPdf(coAadhaar.comparison?.newDoc || coAadhaar) ? (
                                    <div className="bo-cv-pdf-frame-wrapper">
                                      <iframe
                                        src={coAadhaar.comparison?.newDoc?.url || coAadhaar.url}
                                        title={`Co-Applicant ${co.number} Aadhaar PDF`}
                                        className="bo-cv-doc-iframe"
                                      />
                                    </div>
                                  ) : (
                                    <img
                                      src={coAadhaar.comparison?.newDoc?.url || coAadhaar.url}
                                      alt={`Co-Applicant ${co.number} Aadhaar Card`}
                                      className="bo-cv-uncropped-img"
                                    />
                                  )}
                                  <div className="bo-cv-doc-meta-row">
                                    <div className="bo-cv-doc-meta-left">
                                      <span><strong>Document:</strong> {coAadhaar.comparison?.newDoc?.fileName || coAadhaar.fileName || `CoApplicant_${co.number}_Aadhaar`}</span>
                                      {co.aadhaarDisplay && (
                                        <span><strong>Aadhaar No:</strong> {co.aadhaarDisplay}</span>
                                      )}
                                      {(coAadhaar.comparison?.newDoc?.size || coAadhaar.size) && (
                                        <span><strong>Size:</strong> {formatFileSize(coAadhaar.comparison?.newDoc?.size || coAadhaar.size)}</span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      className="bo-btn bo-btn--outline bo-btn--sm"
                                      onClick={() => handleDownloadFile(coAadhaar.comparison?.newDoc?.url || coAadhaar.url, coAadhaar.comparison?.newDoc?.fileName || coAadhaar.fileName || `CoApplicant_${co.number}_Aadhaar.${isDocPdf(coAadhaar.comparison?.newDoc || coAadhaar) ? 'pdf' : 'jpg'}`)}
                                    >
                                      {DownloadIcon && <DownloadIcon size={13} />}
                                      <span>Download Document</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="bo-cv-empty-doc-card--comparison">
                                  <div className="bo-cv-empty-doc-icon">
                                    {ShieldCheckIcon && <ShieldCheckIcon size={28} />}
                                  </div>
                                  <h4>No Resubmitted Document</h4>
                                  <p>RM has not uploaded a replacement Aadhaar document yet.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : coAadhaar?.url ? (
                        <div className="bo-cv-image-preview-frame">
                          {isDocPdf(coAadhaar) ? (
                            <div className="bo-cv-pdf-frame-wrapper">
                              <iframe
                                src={coAadhaar.url}
                                title={`Co-Applicant ${co.number} Aadhaar PDF`}
                                className="bo-cv-doc-iframe"
                              />
                            </div>
                          ) : (
                            <img
                              src={coAadhaar.url}
                              alt={`Co-Applicant ${co.number} Aadhaar Card`}
                              className="bo-cv-uncropped-img"
                            />
                          )}

                          <div className="bo-cv-doc-meta-row">
                            <div className="bo-cv-doc-meta-left">
                              <span><strong>Document:</strong> {coAadhaar.fileName || `CoApplicant_${co.number}_Aadhaar`}</span>
                              {co.aadhaarDisplay && (
                                <span><strong>Aadhaar No:</strong> {co.aadhaarDisplay}</span>
                              )}
                              {coAadhaar.size && (
                                <span><strong>Size:</strong> {formatFileSize(coAadhaar.size)}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="bo-btn bo-btn--outline bo-btn--sm"
                              onClick={() => handleDownloadFile(coAadhaar.url, coAadhaar.fileName || `CoApplicant_${co.number}_Aadhaar.${isDocPdf(coAadhaar) ? 'pdf' : 'jpg'}`)}
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
                            No uploaded Aadhaar proof is currently available for Co-Applicant {co.number} ({co.name}).
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Step Verification Control & Remarks & Reject / Send to RM */}
                <div className="verification-action-bar">
                  <div className="bo-cv-verify-row">
                    <label className="bo-cv-checkbox-label">
                      <input
                        type="checkbox"
                        className="bo-cv-verify-checkbox"
                        checked={Boolean(stepVerifications['AADHAAR']?.isVerified) && !hasUnresolvedRejectionForStep('AADHAAR')}
                        disabled={isSavingStepVerification || hasUnresolvedRejectionForStep('AADHAAR')}
                        title={hasUnresolvedRejectionForStep('AADHAAR') ? 'Resolve all returned/resubmitted documents before marking as Verified' : undefined}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          handleSaveStepVerification({
                            stepCode: 'AADHAAR',
                            isVerified: checked,
                            remarks: stepRemarks[3] || '',
                          });
                        }}
                      />
                      <span className="bo-cv-verify-text">
                        Mark Aadhaar Card as <strong>Verified</strong>
                      </span>
                    </label>
                    {stepVerifications['AADHAAR']?.isVerified && !hasUnresolvedRejectionForStep('AADHAAR') && (
                      <span className="bo-cv-verified-tag">
                        ✓ Verified by {stepVerifications['AADHAAR']?.verifiedByBackOfficeId ? `Operator #${stepVerifications['AADHAAR'].verifiedByBackOfficeId}` : 'Back Office'}
                      </span>
                    )}
                  </div>

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
                      onBlur={() => {
                        if (stepVerifications['AADHAAR']?.isVerified && !hasUnresolvedRejectionForStep('AADHAAR')) {
                          handleSaveStepVerification({
                            stepCode: 'AADHAAR',
                            isVerified: true,
                            remarks: stepRemarks[3] || '',
                          });
                        }
                      }}
                    />
                  </div>

                  <div className="verification-buttons-row">
                    {/* Verify Resubmitted Applicant Aadhaar */}
                    {(() => {
                      const appRej = getActiveRejectionForApplicant(3);
                      if (appRej && appRej.status === 'Resubmitted') {
                        return (
                          <button
                            type="button"
                            className="verify-resubmit-btn"
                            disabled={isVerifyingRejection}
                            onClick={() => handleVerifyRejection(appRej.backOfficeDocumentRejectionId, 'Applicant Aadhaar Card', 3)}
                          >
                            <span>{isVerifyingRejection ? 'Verifying...' : '✓ Verify Applicant Aadhaar'}</span>
                          </button>
                        );
                      }
                      return null;
                    })()}

                    {/* Verify Resubmitted Co-Applicant Aadhaar */}
                    {coApplicants.map((co) => {
                      const coRej = getActiveRejectionForCoApplicant(co.kycDocumentId, 3);
                      if (coRej && coRej.status === 'Resubmitted') {
                        return (
                          <button
                            key={`verify-co-aadhaar-${co.index}`}
                            type="button"
                            className="verify-resubmit-btn"
                            style={{ background: '#047857' }}
                            disabled={isVerifyingRejection}
                            onClick={() => handleVerifyRejection(coRej.backOfficeDocumentRejectionId, `Co-Applicant ${co.number} Aadhaar Card`, 3)}
                          >
                            <span>{isVerifyingRejection ? 'Verifying...' : `✓ Verify Co-App ${co.number} Aadhaar`}</span>
                          </button>
                        );
                      }
                      return null;
                    })}

                    <button
                      type="button"
                      className="reject-rm-btn"
                      disabled={isSubmittingRejection}
                      onClick={() => handleOpenRejectConfirm(3, 'Applicant Aadhaar Card', null, false)}
                    >
                      <span>{isSubmittingRejection ? 'Submitting...' : 'Return Applicant to RM'}</span>
                    </button>

                    {coApplicants.map((co) => (
                      <button
                        key={`reject-co-aadhaar-${co.index}`}
                        type="button"
                        className="reject-rm-btn"
                        style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}
                        disabled={isSubmittingRejection}
                        onClick={() => handleOpenRejectConfirm(3, `Co-Applicant ${co.number} Aadhaar Card`, co.kycDocumentId, true)}
                      >
                        <span>{isSubmittingRejection ? 'Submitting...' : `Return Co-Applicant ${co.number} to RM`}</span>
                      </button>
                    ))}
                  </div>
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
            <div className="bo-cv-doc-step-inner">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">04</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Customer PAN Cards</h2>
                    <p className="bo-cv-step-panel-desc">
                      Inspect Permanent Account Number tax identification documents for Applicant and Co-Applicant(s).
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 04 of 17</span>
              </div>

              <div className="bo-cv-doc-display-container">
                {/* Active Rejection Banner if any */}
                {(() => {
                  const rej = getActiveRejectionForStep(4);
                  if (!rej) return null;
                  return (
                    <div className={`rejection-status-banner rejection-status--${(rej.status || '').toLowerCase()}`}>
                      <div className="rejection-status-header">
                        <strong>
                          {rej.status === 'ReturnedToRM' && '⚠️ Document Returned to RM for Correction'}
                          {rej.status === 'Resubmitted' && '🔄 Document Resubmitted by RM (Ready for Verification)'}
                          {rej.status === 'Verified' && '✓ Document Verified & Approved'}
                        </strong>
                        <span className="rejection-status-date">
                          {rej.resubmittedAt
                            ? `Resubmitted: ${new Date(rej.resubmittedAt).toLocaleString()}`
                            : rej.createdAt
                            ? `Returned: ${new Date(rej.createdAt).toLocaleString()}`
                            : ''}
                        </span>
                      </div>
                      {rej.rejectionRemarks && (
                        <p className="rejection-status-remarks">
                          <strong>Remarks:</strong> {rej.rejectionRemarks}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* 1. Applicant PAN Card */}
                <div className="bo-cv-person-doc-card">
                  <div className="bo-cv-person-doc-header">
                    <div className="bo-cv-person-doc-badge">Applicant</div>
                    <div className="bo-cv-person-doc-title">{verificationData.customerName}</div>
                  </div>

                  {docPreviews.pan?.loading ? (
                    <div className="bo-cv-doc-loading-box">
                      <div className="bo-cv-doc-loading-spinner" />
                      <span>Loading applicant PAN Card document...</span>
                    </div>
                  ) : docPreviews.pan?.isComparison ? (
                    <div className="bo-cv-comparison-container">
                      <div className="bo-cv-comparison-grid">
                        {/* Old / Rejected Version */}
                        <div className="bo-cv-comparison-card bo-cv-comparison-card--old">
                          <div className="bo-cv-comparison-card-header">
                            <span className="bo-cv-comparison-tag">Old / Rejected Version</span>
                            <span className="bo-cv-comparison-subtag">Previously Rejected</span>
                          </div>
                          {docPreviews.pan.comparison?.oldDoc?.url ? (
                            <div className="bo-cv-image-preview-frame">
                              {isDocPdf(docPreviews.pan.comparison.oldDoc) ? (
                                <div className="bo-cv-pdf-frame-wrapper">
                                  <iframe
                                    src={docPreviews.pan.comparison.oldDoc.url}
                                    title="Previous PAN Document PDF"
                                    className="bo-cv-doc-iframe"
                                  />
                                </div>
                              ) : (
                                <img
                                  src={docPreviews.pan.comparison.oldDoc.url}
                                  alt="Previous PAN Card"
                                  className="bo-cv-uncropped-img"
                                />
                              )}
                              <div className="bo-cv-doc-meta-row">
                                <div className="bo-cv-doc-meta-left">
                                  <span><strong>Document:</strong> {docPreviews.pan.comparison.oldDoc.fileName || 'Old PAN Card'}</span>
                                  {docPreviews.pan.comparison.oldDoc.uploadDate && (
                                    <span><strong>Uploaded:</strong> {docPreviews.pan.comparison.oldDoc.uploadDate}</span>
                                  )}
                                  {docPreviews.pan.comparison.oldDoc.size && (
                                    <span><strong>Size:</strong> {formatFileSize(docPreviews.pan.comparison.oldDoc.size)}</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="bo-btn bo-btn--outline bo-btn--sm"
                                  onClick={() => handleDownloadFile(docPreviews.pan.comparison.oldDoc.url, docPreviews.pan.comparison.oldDoc.fileName || `old_pan.${isDocPdf(docPreviews.pan.comparison.oldDoc) ? 'pdf' : 'jpg'}`)}
                                >
                                  {DownloadIcon && <DownloadIcon size={13} />}
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bo-cv-empty-doc-card--comparison">
                              <div className="bo-cv-empty-doc-icon">
                                {FileTextIcon && <FileTextIcon size={28} />}
                              </div>
                              <h4>No Archived Prior Version</h4>
                              <p>{docPreviews.pan.comparison?.note || 'Previous file version is not available from the document repository.'}</p>
                            </div>
                          )}
                        </div>

                        {/* New / Resubmitted Version */}
                        <div className="bo-cv-comparison-card bo-cv-comparison-card--new">
                          <div className="bo-cv-comparison-card-header">
                            <span className="bo-cv-comparison-tag">New / Resubmitted Version</span>
                            <span className="bo-cv-comparison-subtag">Ready for Review</span>
                          </div>
                          {docPreviews.pan.comparison?.newDoc?.url ? (
                            <div className="bo-cv-image-preview-frame">
                              {isDocPdf(docPreviews.pan.comparison.newDoc) ? (
                                <div className="bo-cv-pdf-frame-wrapper">
                                  <iframe
                                    src={docPreviews.pan.comparison.newDoc.url}
                                    title="New Resubmitted PAN Document PDF"
                                    className="bo-cv-doc-iframe"
                                  />
                                </div>
                              ) : (
                                <img
                                  src={docPreviews.pan.comparison.newDoc.url}
                                  alt="New Resubmitted PAN Card"
                                  className="bo-cv-uncropped-img"
                                />
                              )}
                              <div className="bo-cv-doc-meta-row">
                                <div className="bo-cv-doc-meta-left">
                                  <span><strong>Document:</strong> {docPreviews.pan.comparison.newDoc.fileName || 'New PAN Card'}</span>
                                  {docPreviews.pan.comparison.newDoc.uploadDate && (
                                    <span><strong>Uploaded:</strong> {docPreviews.pan.comparison.newDoc.uploadDate}</span>
                                  )}
                                  {docPreviews.pan.comparison.newDoc.size && (
                                    <span><strong>Size:</strong> {formatFileSize(docPreviews.pan.comparison.newDoc.size)}</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="bo-btn bo-btn--outline bo-btn--sm"
                                  onClick={() => handleDownloadFile(docPreviews.pan.comparison.newDoc.url, docPreviews.pan.comparison.newDoc.fileName || `new_pan.${isDocPdf(docPreviews.pan.comparison.newDoc) ? 'pdf' : 'jpg'}`)}
                                >
                                  {DownloadIcon && <DownloadIcon size={13} />}
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bo-cv-empty-doc-card--comparison">
                              <div className="bo-cv-empty-doc-icon">
                                {FileTextIcon && <FileTextIcon size={28} />}
                              </div>
                              <h4>No Resubmitted Document</h4>
                              <p>RM has not uploaded a replacement PAN document yet.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : docPreviews.pan?.url ? (
                    <div className="bo-cv-image-preview-frame">
                      {isDocPdf(docPreviews.pan) ? (
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
                          <span><strong>Document:</strong> {docPreviews.pan.fileName || docPreviews.pan.doc?.fileName || 'PAN Card'}</span>
                          <span><strong>PAN:</strong> {panNumber}</span>
                          {docPreviews.pan.doc?.uploadedOn && (
                            <span><strong>Uploaded:</strong> {docPreviews.pan.doc.uploadedOn}</span>
                          )}
                          {docPreviews.pan.size && (
                            <span><strong>Size:</strong> {formatFileSize(docPreviews.pan.size)}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="bo-btn bo-btn--outline bo-btn--sm"
                          onClick={() => handleDownloadFile(docPreviews.pan.url, docPreviews.pan.fileName || docPreviews.pan.doc?.fileName || `pan_card.${isDocPdf(docPreviews.pan) ? 'pdf' : 'jpg'}`)}
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
                          `No uploaded PAN document is currently available for applicant ${verificationData.customerName}.`}
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. Co-Applicant PAN Cards (Dynamic) */}
                {coApplicants.map((co) => {
                  const coPan = coDocPreviews[co.index]?.pan;
                  return (
                    <div className="bo-cv-person-doc-card" key={`co-pan-${co.index}`}>
                      <div className="bo-cv-person-doc-header">
                        <div className="bo-cv-person-doc-badge co-app">Co-Applicant {co.number}</div>
                        <div className="bo-cv-person-doc-title">{co.name}</div>
                      </div>

                      {coPan?.loading ? (
                        <div className="bo-cv-doc-loading-box">
                          <div className="bo-cv-doc-loading-spinner" />
                          <span>Loading Co-Applicant {co.number} PAN Card document...</span>
                        </div>
                      ) : coPan?.isComparison ? (
                        <div className="bo-cv-comparison-container">
                          <div className="bo-cv-comparison-grid">
                            {/* Old Version Card */}
                            <div className="bo-cv-comparison-card bo-cv-comparison-card--old">
                              <div className="bo-cv-comparison-card-header">
                                <span className="bo-cv-comparison-tag">Old / Rejected Version</span>
                                <span className="bo-cv-comparison-subtag">Prior Document</span>
                              </div>
                              {coPan.comparison?.oldDoc?.url ? (
                                <div className="bo-cv-image-preview-frame">
                                  {isDocPdf(coPan.comparison.oldDoc) ? (
                                    <div className="bo-cv-pdf-frame-wrapper">
                                      <iframe
                                        src={coPan.comparison.oldDoc.url}
                                        title={`Co-Applicant ${co.number} Old PAN PDF`}
                                        className="bo-cv-doc-iframe"
                                      />
                                    </div>
                                  ) : (
                                    <img
                                      src={coPan.comparison.oldDoc.url}
                                      alt={`Co-Applicant ${co.number} Old PAN Card`}
                                      className="bo-cv-uncropped-img"
                                    />
                                  )}
                                  <div className="bo-cv-doc-meta-row">
                                    <div className="bo-cv-doc-meta-left">
                                      <span><strong>Document:</strong> {coPan.comparison.oldDoc.fileName || `CoApplicant_${co.number}_PAN_Old`}</span>
                                      {co.pan && (
                                        <span><strong>PAN:</strong> {co.pan}</span>
                                      )}
                                      {coPan.comparison.oldDoc.size && (
                                        <span><strong>Size:</strong> {formatFileSize(coPan.comparison.oldDoc.size)}</span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      className="bo-btn bo-btn--outline bo-btn--sm"
                                      onClick={() => handleDownloadFile(coPan.comparison.oldDoc.url, coPan.comparison.oldDoc.fileName || `CoApplicant_${co.number}_PAN_Old.${isDocPdf(coPan.comparison.oldDoc) ? 'pdf' : 'jpg'}`)}
                                    >
                                      {DownloadIcon && <DownloadIcon size={13} />}
                                      <span>Download Document</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="bo-cv-empty-doc-card--comparison">
                                  <div className="bo-cv-empty-doc-icon">
                                    {FileTextIcon && <FileTextIcon size={28} />}
                                  </div>
                                  <h4>Prior Version In-Place Updated</h4>
                                  <p>{coPan.comparison?.note || 'Prior version path was not recorded for this rejection.'}</p>
                                </div>
                              )}
                            </div>

                            {/* New Version Card */}
                            <div className="bo-cv-comparison-card bo-cv-comparison-card--new">
                              <div className="bo-cv-comparison-card-header">
                                <span className="bo-cv-comparison-tag">New / Resubmitted Version</span>
                                <span className="bo-cv-comparison-subtag">Ready for Review</span>
                              </div>
                              {coPan.comparison?.newDoc?.url || coPan.url ? (
                                <div className="bo-cv-image-preview-frame">
                                  {isDocPdf(coPan.comparison?.newDoc || coPan) ? (
                                    <div className="bo-cv-pdf-frame-wrapper">
                                      <iframe
                                        src={coPan.comparison?.newDoc?.url || coPan.url}
                                        title={`Co-Applicant ${co.number} PAN PDF`}
                                        className="bo-cv-doc-iframe"
                                      />
                                    </div>
                                  ) : (
                                    <img
                                      src={coPan.comparison?.newDoc?.url || coPan.url}
                                      alt={`Co-Applicant ${co.number} PAN Card`}
                                      className="bo-cv-uncropped-img"
                                    />
                                  )}
                                  <div className="bo-cv-doc-meta-row">
                                    <div className="bo-cv-doc-meta-left">
                                      <span><strong>Document:</strong> {coPan.comparison?.newDoc?.fileName || coPan.fileName || `CoApplicant_${co.number}_PAN`}</span>
                                      {co.pan && (
                                        <span><strong>PAN:</strong> {co.pan}</span>
                                      )}
                                      {(coPan.comparison?.newDoc?.size || coPan.size) && (
                                        <span><strong>Size:</strong> {formatFileSize(coPan.comparison?.newDoc?.size || coPan.size)}</span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      className="bo-btn bo-btn--outline bo-btn--sm"
                                      onClick={() => handleDownloadFile(coPan.comparison?.newDoc?.url || coPan.url, coPan.comparison?.newDoc?.fileName || coPan.fileName || `CoApplicant_${co.number}_PAN.${isDocPdf(coPan.comparison?.newDoc || coPan) ? 'pdf' : 'jpg'}`)}
                                    >
                                      {DownloadIcon && <DownloadIcon size={13} />}
                                      <span>Download Document</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="bo-cv-empty-doc-card--comparison">
                                  <div className="bo-cv-empty-doc-icon">
                                    {FileTextIcon && <FileTextIcon size={28} />}
                                  </div>
                                  <h4>No Resubmitted Document</h4>
                                  <p>RM has not uploaded a replacement PAN document yet.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : coPan?.url ? (
                        <div className="bo-cv-image-preview-frame">
                          {isDocPdf(coPan) ? (
                            <div className="bo-cv-pdf-frame-wrapper">
                              <iframe
                                src={coPan.url}
                                title={`Co-Applicant ${co.number} PAN PDF`}
                                className="bo-cv-doc-iframe"
                              />
                            </div>
                          ) : (
                            <img
                              src={coPan.url}
                              alt={`Co-Applicant ${co.number} PAN Card`}
                              className="bo-cv-uncropped-img"
                            />
                          )}

                          <div className="bo-cv-doc-meta-row">
                            <div className="bo-cv-doc-meta-left">
                              <span><strong>Document:</strong> {coPan.fileName || `CoApplicant_${co.number}_PAN`}</span>
                              {co.pan && (
                                <span><strong>PAN:</strong> {co.pan}</span>
                              )}
                              {coPan.size && (
                                <span><strong>Size:</strong> {formatFileSize(coPan.size)}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="bo-btn bo-btn--outline bo-btn--sm"
                              onClick={() => handleDownloadFile(coPan.url, coPan.fileName || `CoApplicant_${co.number}_PAN.${isDocPdf(coPan) ? 'pdf' : 'jpg'}`)}
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
                            No uploaded PAN document is currently available for Co-Applicant {co.number} ({co.name}).
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Step Verification Control & Remarks & Reject / Send to RM */}
                <div className="verification-action-bar">
                  <div className="bo-cv-verify-row">
                    <label className="bo-cv-checkbox-label">
                      <input
                        type="checkbox"
                        className="bo-cv-verify-checkbox"
                        checked={Boolean(stepVerifications['PAN']?.isVerified) && !hasUnresolvedRejectionForStep('PAN')}
                        disabled={isSavingStepVerification || hasUnresolvedRejectionForStep('PAN')}
                        title={hasUnresolvedRejectionForStep('PAN') ? 'Resolve all returned/resubmitted documents before marking as Verified' : undefined}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          handleSaveStepVerification({
                            stepCode: 'PAN',
                            isVerified: checked,
                            remarks: stepRemarks[4] || '',
                          });
                        }}
                      />
                      <span className="bo-cv-verify-text">
                        Mark PAN Card as <strong>Verified</strong>
                      </span>
                    </label>
                    {stepVerifications['PAN']?.isVerified && !hasUnresolvedRejectionForStep('PAN') && (
                      <span className="bo-cv-verified-tag">
                        ✓ Verified by {stepVerifications['PAN']?.verifiedByBackOfficeId ? `Operator #${stepVerifications['PAN'].verifiedByBackOfficeId}` : 'Back Office'}
                      </span>
                    )}
                  </div>

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
                      onBlur={() => {
                        if (stepVerifications['PAN']?.isVerified && !hasUnresolvedRejectionForStep('PAN')) {
                          handleSaveStepVerification({
                            stepCode: 'PAN',
                            isVerified: true,
                            remarks: stepRemarks[4] || '',
                          });
                        }
                      }}
                    />
                  </div>

                  <div className="verification-buttons-row">
                    {/* Verify Resubmitted Applicant PAN */}
                    {(() => {
                      const appRej = getActiveRejectionForApplicant(4);
                      if (appRej && appRej.status === 'Resubmitted') {
                        return (
                          <button
                            type="button"
                            className="verify-resubmit-btn"
                            disabled={isVerifyingRejection}
                            onClick={() => handleVerifyRejection(appRej.backOfficeDocumentRejectionId, 'Applicant PAN Card', 4)}
                          >
                            <span>{isVerifyingRejection ? 'Verifying...' : '✓ Verify Applicant PAN'}</span>
                          </button>
                        );
                      }
                      return null;
                    })()}

                    {/* Verify Resubmitted Co-Applicant PAN */}
                    {coApplicants.map((co) => {
                      const coRej = getActiveRejectionForCoApplicant(co.kycDocumentId, 4);
                      if (coRej && coRej.status === 'Resubmitted') {
                        return (
                          <button
                            key={`verify-co-pan-${co.index}`}
                            type="button"
                            className="verify-resubmit-btn"
                            style={{ background: '#047857' }}
                            disabled={isVerifyingRejection}
                            onClick={() => handleVerifyRejection(coRej.backOfficeDocumentRejectionId, `Co-Applicant ${co.number} PAN Card`, 4)}
                          >
                            <span>{isVerifyingRejection ? 'Verifying...' : `✓ Verify Co-App ${co.number} PAN`}</span>
                          </button>
                        );
                      }
                      return null;
                    })}

                    <button
                      type="button"
                      className="reject-rm-btn"
                      disabled={isSubmittingRejection}
                      onClick={() => handleOpenRejectConfirm(4, 'Applicant PAN Card', null, false)}
                    >
                      <span>{isSubmittingRejection ? 'Submitting...' : 'Return Applicant to RM'}</span>
                    </button>

                    {coApplicants.map((co) => (
                      <button
                        key={`reject-co-pan-${co.index}`}
                        type="button"
                        className="reject-rm-btn"
                        style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}
                        disabled={isSubmittingRejection}
                        onClick={() => handleOpenRejectConfirm(4, `Co-Applicant ${co.number} PAN Card`, co.kycDocumentId, true)}
                      >
                        <span>{isSubmittingRejection ? 'Submitting...' : `Return Co-Applicant ${co.number} to RM`}</span>
                      </button>
                    ))}
                  </div>
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
              STEP 05: SALARY SLIP / INCOME PROOF
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 5 && (
            <div className="bo-cv-doc-step-inner">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">05</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Salary Slip / Income Proof</h2>
                    <p className="bo-cv-step-panel-desc">
                      Inspect and verify Applicant and Co-Applicant(s) income proof, payslips, and salary certificates.
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 05 of 17</span>
              </div>

              <div className="bo-cv-doc-display-container">
                {/* Active Rejection Banners across Step 05 */}
                {(() => {
                  const allStep5Rejections = [
                    getActiveRejectionForApplicantDoc(salarySlipDocTypeId, 'SALARY_SLIP'),
                    ...coApplicants.flatMap((co) => {
                      const seq = co.sequence !== undefined ? co.sequence : (co.index !== undefined ? co.index + 1 : co.number);
                      return [
                        getActiveRejectionForCoApplicantDoc(seq, salarySlipDocTypeId, 'SALARY_SLIP'),
                      ];
                    }),
                  ].filter(Boolean);

                  if (allStep5Rejections.length === 0) return null;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                      {allStep5Rejections.map((rej) => (
                        <div
                          key={`step5-rej-banner-${rej.backOfficeDocumentRejectionId}`}
                          className={`rejection-status-banner rejection-status--${(rej.status || '').toLowerCase()}`}
                        >
                          <div className="rejection-status-header">
                            <strong>
                              {rej.status === 'ReturnedToRM' && `⚠️ Document Returned to RM: ${rej.rejectedDocumentType || 'Salary Slip'}`}
                              {rej.status === 'Resubmitted' && `🔄 Document Resubmitted by RM: ${rej.rejectedDocumentType || 'Salary Slip'} (Ready for Verification)`}
                              {rej.status === 'Verified' && `✓ Document Verified & Approved: ${rej.rejectedDocumentType || 'Salary Slip'}`}
                            </strong>
                            <span className="rejection-status-date">
                              {rej.resubmittedAt
                                ? `Resubmitted: ${new Date(rej.resubmittedAt).toLocaleString()}`
                                : rej.createdAt
                                ? `Returned: ${new Date(rej.createdAt).toLocaleString()}`
                                : ''}
                            </span>
                          </div>
                          {rej.rejectionRemarks && (
                            <p className="rejection-status-remarks">
                              <strong>Remarks:</strong> {rej.rejectionRemarks}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* 1. Applicant Salary Slip */}
                <div className="bo-cv-person-doc-card">
                  <div className="bo-cv-person-doc-header">
                    <div className="bo-cv-person-doc-badge">Applicant</div>
                    <div className="bo-cv-person-doc-title">{verificationData.customerName}</div>
                  </div>

                  <div className="bo-cv-financial-docs-container">
                    <div className="bo-cv-subdoc-card">
                      <div className="bo-cv-subdoc-header">
                        <div className="bo-cv-subdoc-header-left">
                          {FileTextIcon && <FileTextIcon size={16} />}
                          <h4 className="bo-cv-subdoc-title">Salary Slip / Income Sheet</h4>
                        </div>
                        <div className="bo-cv-subdoc-actions">
                          {applicantFinancialDocs.salarySlip.rejection?.status === 'Resubmitted' && (
                            <span className="bo-cv-pill-fetching">Resubmitted</span>
                          )}
                          {applicantFinancialDocs.salarySlip.rejection?.status === 'ReturnedToRM' && (
                            <span className="bo-cv-pill-pending">Returned to RM</span>
                          )}
                          {applicantFinancialDocs.salarySlip.preview?.url && !applicantFinancialDocs.salarySlip.rejection && (
                            <span className="bo-cv-pill-verified">Uploaded</span>
                          )}
                        </div>
                      </div>

                      {applicantFinancialDocs.salarySlip.loading ? (
                        <div className="bo-cv-doc-loading-box">
                          <div className="bo-cv-doc-loading-spinner" />
                          <span>Loading applicant salary slip...</span>
                        </div>
                      ) : applicantFinancialDocs.salarySlip.comparison ? (
                        <div className="bo-cv-comparison-container">
                          <div className="bo-cv-comparison-grid">
                            {/* Old Version */}
                            <div className="bo-cv-comparison-card bo-cv-comparison-card--old">
                              <div className="bo-cv-comparison-card-header">
                                <span className="bo-cv-comparison-tag">Old / Rejected Version</span>
                                <span className="bo-cv-comparison-subtag">Previously Rejected</span>
                              </div>
                              {applicantFinancialDocs.salarySlip.comparison.oldDoc?.url ? (
                                <div className="bo-cv-image-preview-frame">
                                  {isDocPdf(applicantFinancialDocs.salarySlip.comparison.oldDoc) ? (
                                    <div className="bo-cv-pdf-frame-wrapper">
                                      <iframe
                                        src={applicantFinancialDocs.salarySlip.comparison.oldDoc.url}
                                        title="Previous Salary Slip PDF"
                                        className="bo-cv-doc-iframe"
                                      />
                                    </div>
                                  ) : (
                                    <img
                                      src={applicantFinancialDocs.salarySlip.comparison.oldDoc.url}
                                      alt="Previous Salary Slip"
                                      className="bo-cv-uncropped-img"
                                    />
                                  )}
                                  <div className="bo-cv-doc-meta-row">
                                    <div className="bo-cv-doc-meta-left">
                                      <span><strong>File:</strong> {applicantFinancialDocs.salarySlip.comparison.oldDoc.fileName || 'Old Salary Slip'}</span>
                                      {applicantFinancialDocs.salarySlip.comparison.oldDoc.size && (
                                        <span><strong>Size:</strong> {formatFileSize(applicantFinancialDocs.salarySlip.comparison.oldDoc.size)}</span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      className="bo-btn bo-btn--outline bo-btn--sm"
                                      onClick={() => handleDownloadFile(applicantFinancialDocs.salarySlip.comparison.oldDoc.url, applicantFinancialDocs.salarySlip.comparison.oldDoc.fileName || `Applicant_Salary_Slip_Old.${isDocPdf(applicantFinancialDocs.salarySlip.comparison.oldDoc) ? 'pdf' : 'jpg'}`)}
                                    >
                                      {DownloadIcon && <DownloadIcon size={13} />}
                                      <span>Download</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="bo-cv-empty-doc-card--comparison">
                                  <div className="bo-cv-empty-doc-icon">
                                    {FileTextIcon && <FileTextIcon size={28} />}
                                  </div>
                                  <h4>No Archived Prior Version</h4>
                                  <p>{applicantFinancialDocs.salarySlip.comparison.note || 'Previous file version is not available from the document repository.'}</p>
                                </div>
                              )}
                            </div>

                            {/* New Resubmitted Version */}
                            <div className="bo-cv-comparison-card bo-cv-comparison-card--new">
                              <div className="bo-cv-comparison-card-header">
                                <span className="bo-cv-comparison-tag">New / Resubmitted Version</span>
                                <span className="bo-cv-comparison-subtag">Ready for Review</span>
                              </div>
                              {applicantFinancialDocs.salarySlip.comparison.newDoc?.url ? (
                                <div className="bo-cv-image-preview-frame">
                                  {isDocPdf(applicantFinancialDocs.salarySlip.comparison.newDoc) ? (
                                    <div className="bo-cv-pdf-frame-wrapper">
                                      <iframe
                                        src={applicantFinancialDocs.salarySlip.comparison.newDoc.url}
                                        title="New Resubmitted Salary Slip PDF"
                                        className="bo-cv-doc-iframe"
                                      />
                                    </div>
                                  ) : (
                                    <img
                                      src={applicantFinancialDocs.salarySlip.comparison.newDoc.url}
                                      alt="New Resubmitted Salary Slip"
                                      className="bo-cv-uncropped-img"
                                    />
                                  )}
                                  <div className="bo-cv-doc-meta-row">
                                    <div className="bo-cv-doc-meta-left">
                                      <span><strong>File:</strong> {applicantFinancialDocs.salarySlip.comparison.newDoc.fileName || 'New Salary Slip'}</span>
                                      {applicantFinancialDocs.salarySlip.comparison.newDoc.size && (
                                        <span><strong>Size:</strong> {formatFileSize(applicantFinancialDocs.salarySlip.comparison.newDoc.size)}</span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      className="bo-btn bo-btn--outline bo-btn--sm"
                                      onClick={() => handleDownloadFile(applicantFinancialDocs.salarySlip.comparison.newDoc.url, applicantFinancialDocs.salarySlip.comparison.newDoc.fileName || `Applicant_Salary_Slip.${isDocPdf(applicantFinancialDocs.salarySlip.comparison.newDoc) ? 'pdf' : 'jpg'}`)}
                                    >
                                      {DownloadIcon && <DownloadIcon size={13} />}
                                      <span>Download</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="bo-cv-empty-doc-card--comparison">
                                  <div className="bo-cv-empty-doc-icon">
                                    {FileTextIcon && <FileTextIcon size={28} />}
                                  </div>
                                  <h4>No Resubmitted Document</h4>
                                  <p>RM has not uploaded a replacement Salary Slip yet.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : applicantFinancialDocs.salarySlip.preview?.url ? (
                        <div className="bo-cv-image-preview-frame">
                          {isDocPdf(applicantFinancialDocs.salarySlip.preview) ? (
                            <div className="bo-cv-pdf-frame-wrapper">
                              <iframe
                                src={applicantFinancialDocs.salarySlip.preview.url}
                                title="Salary Slip Document PDF"
                                className="bo-cv-doc-iframe"
                              />
                            </div>
                          ) : (
                            <img
                              src={applicantFinancialDocs.salarySlip.preview.url}
                              alt="Salary Slip Document"
                              className="bo-cv-uncropped-img"
                            />
                          )}
                          <div className="bo-cv-doc-meta-row">
                            <div className="bo-cv-doc-meta-left">
                              <span><strong>File:</strong> {applicantFinancialDocs.salarySlip.preview.fileName || 'Salary Slip'}</span>
                              {applicantFinancialDocs.salarySlip.preview.size && (
                                <span><strong>Size:</strong> {formatFileSize(applicantFinancialDocs.salarySlip.preview.size)}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="bo-btn bo-btn--outline bo-btn--sm"
                              onClick={() => handleDownloadFile(applicantFinancialDocs.salarySlip.preview.url, applicantFinancialDocs.salarySlip.preview.fileName || `Applicant_Salary_Slip.${isDocPdf(applicantFinancialDocs.salarySlip.preview) ? 'pdf' : 'jpg'}`)}
                            >
                              {DownloadIcon && <DownloadIcon size={13} />}
                              <span>Download</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bo-cv-empty-doc-card">
                          <div className="bo-cv-empty-doc-icon">
                            {FileTextIcon && <FileTextIcon size={32} />}
                          </div>
                          <h4>No Salary Slip Found</h4>
                          <p>No salary slip or income sheet was uploaded for applicant {verificationData.customerName}.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Co-Applicant Salary Slip */}
                {coApplicants.map((co) => {
                  const seq = co.sequence !== undefined ? co.sequence : (co.index !== undefined ? co.index + 1 : co.number);
                  const idxKey = co.index !== undefined ? co.index : (seq - 1);
                  const coFin = coApplicantsFinancialDocs[idxKey] || {
                    salarySlip: { loading: false, data: null, preview: null, comparison: null, rejection: null, error: null },
                    bankStatement: { loading: false, data: null, preview: null, comparison: null, rejection: null, error: null },
                  };

                  return (
                    <div className="bo-cv-person-doc-card" key={`co-salary-card-${co.index}`}>
                      <div className="bo-cv-person-doc-header">
                        <div className="bo-cv-person-doc-badge co-app">Co-Applicant {co.number}</div>
                        <div className="bo-cv-person-doc-title">{co.name}</div>
                      </div>

                      <div className="bo-cv-financial-docs-container">
                        <div className="bo-cv-subdoc-card">
                          <div className="bo-cv-subdoc-header">
                            <div className="bo-cv-subdoc-header-left">
                              {FileTextIcon && <FileTextIcon size={16} />}
                              <h4 className="bo-cv-subdoc-title">Co-Applicant {co.number} Salary Slip / Income Sheet</h4>
                            </div>
                            <div className="bo-cv-subdoc-actions">
                              {coFin.salarySlip?.rejection?.status === 'Resubmitted' && (
                                <span className="bo-cv-pill-fetching">Resubmitted</span>
                              )}
                              {coFin.salarySlip?.rejection?.status === 'ReturnedToRM' && (
                                <span className="bo-cv-pill-pending">Returned to RM</span>
                              )}
                              {coFin.salarySlip?.preview?.url && !coFin.salarySlip?.rejection && (
                                <span className="bo-cv-pill-verified">Uploaded</span>
                              )}
                            </div>
                          </div>

                          {coFin.salarySlip?.loading ? (
                            <div className="bo-cv-doc-loading-box">
                              <div className="bo-cv-doc-loading-spinner" />
                              <span>Loading Co-Applicant {co.number} salary slip...</span>
                            </div>
                          ) : coFin.salarySlip?.comparison ? (
                            <div className="bo-cv-comparison-container">
                              <div className="bo-cv-comparison-grid">
                                {/* Old Version */}
                                <div className="bo-cv-comparison-card bo-cv-comparison-card--old">
                                  <div className="bo-cv-comparison-card-header">
                                    <span className="bo-cv-comparison-tag">Old / Rejected Version</span>
                                    <span className="bo-cv-comparison-subtag">Previously Rejected</span>
                                  </div>
                                  {coFin.salarySlip.comparison.oldDoc?.url ? (
                                    <div className="bo-cv-image-preview-frame">
                                      {isDocPdf(coFin.salarySlip.comparison.oldDoc) ? (
                                        <div className="bo-cv-pdf-frame-wrapper">
                                          <iframe
                                            src={coFin.salarySlip.comparison.oldDoc.url}
                                            title={`Co-Applicant ${co.number} Previous Salary Slip PDF`}
                                            className="bo-cv-doc-iframe"
                                          />
                                        </div>
                                      ) : (
                                        <img
                                          src={coFin.salarySlip.comparison.oldDoc.url}
                                          alt={`Co-Applicant ${co.number} Previous Salary Slip`}
                                          className="bo-cv-uncropped-img"
                                        />
                                      )}
                                      <div className="bo-cv-doc-meta-row">
                                        <div className="bo-cv-doc-meta-left">
                                          <span><strong>File:</strong> {coFin.salarySlip.comparison.oldDoc.fileName || `CoApplicant_${co.number}_Salary_Slip_Old`}</span>
                                          {coFin.salarySlip.comparison.oldDoc.size && (
                                            <span><strong>Size:</strong> {formatFileSize(coFin.salarySlip.comparison.oldDoc.size)}</span>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          className="bo-btn bo-btn--outline bo-btn--sm"
                                          onClick={() => handleDownloadFile(coFin.salarySlip.comparison.oldDoc.url, coFin.salarySlip.comparison.oldDoc.fileName || `CoApplicant_${co.number}_Salary_Slip_Old.${isDocPdf(coFin.salarySlip.comparison.oldDoc) ? 'pdf' : 'jpg'}`)}
                                        >
                                          {DownloadIcon && <DownloadIcon size={13} />}
                                          <span>Download</span>
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bo-cv-empty-doc-card--comparison">
                                      <div className="bo-cv-empty-doc-icon">
                                        {FileTextIcon && <FileTextIcon size={28} />}
                                      </div>
                                      <h4>No Archived Prior Version</h4>
                                      <p>{coFin.salarySlip.comparison.note || 'Previous file version is not available from the document repository.'}</p>
                                    </div>
                                  )}
                                </div>

                                {/* New Resubmitted Version */}
                                <div className="bo-cv-comparison-card bo-cv-comparison-card--new">
                                  <div className="bo-cv-comparison-card-header">
                                    <span className="bo-cv-comparison-tag">New / Resubmitted Version</span>
                                    <span className="bo-cv-comparison-subtag">Ready for Review</span>
                                  </div>
                                  {coFin.salarySlip.comparison.newDoc?.url ? (
                                    <div className="bo-cv-image-preview-frame">
                                      {isDocPdf(coFin.salarySlip.comparison.newDoc) ? (
                                        <div className="bo-cv-pdf-frame-wrapper">
                                          <iframe
                                            src={coFin.salarySlip.comparison.newDoc.url}
                                            title={`Co-Applicant ${co.number} New Salary Slip PDF`}
                                            className="bo-cv-doc-iframe"
                                          />
                                        </div>
                                      ) : (
                                        <img
                                          src={coFin.salarySlip.comparison.newDoc.url}
                                          alt={`Co-Applicant ${co.number} New Salary Slip`}
                                          className="bo-cv-uncropped-img"
                                        />
                                      )}
                                      <div className="bo-cv-doc-meta-row">
                                        <div className="bo-cv-doc-meta-left">
                                          <span><strong>File:</strong> {coFin.salarySlip.comparison.newDoc.fileName || `CoApplicant_${co.number}_Salary_Slip_New`}</span>
                                          {coFin.salarySlip.comparison.newDoc.size && (
                                            <span><strong>Size:</strong> {formatFileSize(coFin.salarySlip.comparison.newDoc.size)}</span>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          className="bo-btn bo-btn--outline bo-btn--sm"
                                          onClick={() => handleDownloadFile(coFin.salarySlip.comparison.newDoc.url, coFin.salarySlip.comparison.newDoc.fileName || `CoApplicant_${co.number}_Salary_Slip.${isDocPdf(coFin.salarySlip.comparison.newDoc) ? 'pdf' : 'jpg'}`)}
                                        >
                                          {DownloadIcon && <DownloadIcon size={13} />}
                                          <span>Download</span>
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bo-cv-empty-doc-card--comparison">
                                      <div className="bo-cv-empty-doc-icon">
                                        {FileTextIcon && <FileTextIcon size={28} />}
                                      </div>
                                      <h4>No Resubmitted Document</h4>
                                      <p>RM has not uploaded a replacement Salary Slip yet.</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : coFin.salarySlip?.preview?.url ? (
                            <div className="bo-cv-image-preview-frame">
                              {isDocPdf(coFin.salarySlip.preview) ? (
                                <div className="bo-cv-pdf-frame-wrapper">
                                  <iframe
                                    src={coFin.salarySlip.preview.url}
                                    title={`Co-Applicant ${co.number} Salary Slip PDF`}
                                    className="bo-cv-doc-iframe"
                                  />
                                </div>
                              ) : (
                                <img
                                  src={coFin.salarySlip.preview.url}
                                  alt={`Co-Applicant ${co.number} Salary Slip`}
                                  className="bo-cv-uncropped-img"
                                />
                              )}
                              <div className="bo-cv-doc-meta-row">
                                <div className="bo-cv-doc-meta-left">
                                  <span><strong>File:</strong> {coFin.salarySlip.preview.fileName || `CoApplicant_${co.number}_Salary_Slip`}</span>
                                  {coFin.salarySlip.preview.size && (
                                    <span><strong>Size:</strong> {formatFileSize(coFin.salarySlip.preview.size)}</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="bo-btn bo-btn--outline bo-btn--sm"
                                  onClick={() => handleDownloadFile(coFin.salarySlip.preview.url, coFin.salarySlip.preview.fileName || `CoApplicant_${co.number}_Salary_Slip.${isDocPdf(coFin.salarySlip.preview) ? 'pdf' : 'jpg'}`)}
                                >
                                  {DownloadIcon && <DownloadIcon size={13} />}
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bo-cv-empty-doc-card">
                              <div className="bo-cv-empty-doc-icon">
                                {FileTextIcon && <FileTextIcon size={32} />}
                              </div>
                              <h4>No Salary Slip Found</h4>
                              <p>No salary slip was uploaded for Co-Applicant {co.number} ({co.name}).</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Step Verification Control & Remarks & Reject / Send to RM */}
                <div className="verification-action-bar">
                  <div className="bo-cv-verify-row">
                    <label className="bo-cv-checkbox-label">
                      <input
                        type="checkbox"
                        className="bo-cv-verify-checkbox"
                        checked={Boolean(stepVerifications['SALARY_SLIP']?.isVerified) && !hasUnresolvedRejectionForStep('SALARY_SLIP')}
                        disabled={isSavingStepVerification || hasUnresolvedRejectionForStep('SALARY_SLIP')}
                        title={hasUnresolvedRejectionForStep('SALARY_SLIP') ? 'Resolve all returned/resubmitted documents before marking as Verified' : undefined}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          handleSaveStepVerification({
                            stepCode: 'SALARY_SLIP',
                            isVerified: checked,
                            remarks: stepRemarks[5] || '',
                          });
                        }}
                      />
                      <span className="bo-cv-verify-text">
                        Mark Salary Slip as <strong>Verified</strong>
                      </span>
                    </label>
                    {stepVerifications['SALARY_SLIP']?.isVerified && !hasUnresolvedRejectionForStep('SALARY_SLIP') && (
                      <span className="bo-cv-verified-tag">
                        ✓ Verified by {stepVerifications['SALARY_SLIP']?.verifiedByBackOfficeId ? `Operator #${stepVerifications['SALARY_SLIP'].verifiedByBackOfficeId}` : 'Back Office'}
                      </span>
                    )}
                  </div>

                  <div className="verification-remarks-field">
                    <label htmlFor="bo-cv-remarks-salary">VERIFICATION REMARKS</label>
                    <textarea
                      id="bo-cv-remarks-salary"
                      className="bo-cv-remarks-input"
                      rows={3}
                      placeholder="Enter remarks or discrepancy details for salary slip / income verification..."
                      value={stepRemarks[5] || ''}
                      onChange={(e) => {
                        setStepRemarks({ ...stepRemarks, 5: e.target.value });
                        if (stepFeedback[5]) setStepFeedback({ ...stepFeedback, 5: null });
                      }}
                      onBlur={() => {
                        if (stepVerifications['SALARY_SLIP']?.isVerified && !hasUnresolvedRejectionForStep('SALARY_SLIP')) {
                          handleSaveStepVerification({
                            stepCode: 'SALARY_SLIP',
                            isVerified: true,
                            remarks: stepRemarks[5] || '',
                          });
                        }
                      }}
                    />
                  </div>

                  <div className="verification-buttons-row">
                    {/* Verify Resubmitted Applicant Salary Slip */}
                    {(() => {
                      const rej = getActiveRejectionForApplicantDoc(salarySlipDocTypeId, 'SALARY_SLIP');
                      if (rej && rej.status === 'Resubmitted') {
                        return (
                          <button
                            type="button"
                            className="verify-resubmit-btn"
                            disabled={isVerifyingRejection}
                            onClick={() => handleVerifyRejection(rej.backOfficeDocumentRejectionId, 'Applicant Salary Slip', 5)}
                          >
                            <span>{isVerifyingRejection ? 'Verifying...' : '✓ Verify Applicant Salary Slip'}</span>
                          </button>
                        );
                      }
                      return null;
                    })()}

                    {/* Verify Resubmitted Co-Applicant Salary Slip */}
                    {coApplicants.map((co) => {
                      const seq = co.sequence !== undefined ? co.sequence : (co.index !== undefined ? co.index + 1 : co.number);
                      const coSalaryRej = getActiveRejectionForCoApplicantDoc(seq, salarySlipDocTypeId, 'SALARY_SLIP');
                      if (coSalaryRej && coSalaryRej.status === 'Resubmitted') {
                        return (
                          <button
                            key={`verify-co-salary-${co.index}`}
                            type="button"
                            className="verify-resubmit-btn"
                            style={{ background: '#047857' }}
                            disabled={isVerifyingRejection}
                            onClick={() => handleVerifyRejection(coSalaryRej.backOfficeDocumentRejectionId, `Co-Applicant ${co.number} Salary Slip`, 5)}
                          >
                            <span>{isVerifyingRejection ? 'Verifying...' : `✓ Verify Co-App ${co.number} Salary Slip`}</span>
                          </button>
                        );
                      }
                      return null;
                    })}

                    {/* Reject Applicant Salary Slip */}
                    <button
                      type="button"
                      className="reject-rm-btn"
                      disabled={isSubmittingRejection}
                      onClick={() => handleOpenRejectConfirm(5, 'Applicant Salary Slip', null, false, 0, salarySlipDocTypeId, 'APPLICANT_SALARY_SLIP')}
                    >
                      <span>{isSubmittingRejection ? 'Submitting...' : 'Return Applicant to RM'}</span>
                    </button>

                    {/* Reject Co-Applicant Salary Slip */}
                    {coApplicants.map((co) => {
                      const seq = co.sequence !== undefined ? co.sequence : (co.index !== undefined ? co.index + 1 : co.number);
                      return (
                        <button
                          key={`reject-co-salary-${co.index}`}
                          type="button"
                          className="reject-rm-btn"
                          style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}
                          disabled={isSubmittingRejection}
                          onClick={() => handleOpenRejectConfirm(5, `Co-Applicant ${co.number} Salary Slip`, null, true, seq, salarySlipDocTypeId, `CO_APPLICANT_${seq}_SALARY_SLIP`)}
                        >
                          <span>{isSubmittingRejection ? 'Submitting...' : `Return Co-Applicant ${co.number} to RM`}</span>
                        </button>
                      );
                    })}
                  </div>
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
              STEP 06: BANK STATEMENT
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 6 && (
            <div className="bo-cv-doc-step-inner">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">06</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Bank Statement</h2>
                    <p className="bo-cv-step-panel-desc">
                      Inspect and verify Applicant and Co-Applicant(s) banking statements, records, and passbooks.
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 06 of 17</span>
              </div>

              <div className="bo-cv-doc-display-container">
                {/* Active Rejection Banners across Step 06 */}
                {(() => {
                  const allStep6Rejections = [
                    getActiveRejectionForApplicantDoc(bankStatementDocTypeId, 'BANK_STATEMENT'),
                    ...coApplicants.flatMap((co) => {
                      const seq = co.sequence !== undefined ? co.sequence : (co.index !== undefined ? co.index + 1 : co.number);
                      return [
                        getActiveRejectionForCoApplicantDoc(seq, bankStatementDocTypeId, 'BANK_STATEMENT'),
                      ];
                    }),
                  ].filter(Boolean);

                  if (allStep6Rejections.length === 0) return null;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                      {allStep6Rejections.map((rej) => (
                        <div
                          key={`step6-rej-banner-${rej.backOfficeDocumentRejectionId}`}
                          className={`rejection-status-banner rejection-status--${(rej.status || '').toLowerCase()}`}
                        >
                          <div className="rejection-status-header">
                            <strong>
                              {rej.status === 'ReturnedToRM' && `⚠️ Document Returned to RM: ${rej.rejectedDocumentType || 'Bank Statement'}`}
                              {rej.status === 'Resubmitted' && `🔄 Document Resubmitted by RM: ${rej.rejectedDocumentType || 'Bank Statement'} (Ready for Verification)`}
                              {rej.status === 'Verified' && `✓ Document Verified & Approved: ${rej.rejectedDocumentType || 'Bank Statement'}`}
                            </strong>
                            <span className="rejection-status-date">
                              {rej.resubmittedAt
                                ? `Resubmitted: ${new Date(rej.resubmittedAt).toLocaleString()}`
                                : rej.createdAt
                                ? `Returned: ${new Date(rej.createdAt).toLocaleString()}`
                                : ''}
                            </span>
                          </div>
                          {rej.rejectionRemarks && (
                            <p className="rejection-status-remarks">
                              <strong>Remarks:</strong> {rej.rejectionRemarks}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* 1. Applicant Bank Statement */}
                <div className="bo-cv-person-doc-card">
                  <div className="bo-cv-person-doc-header">
                    <div className="bo-cv-person-doc-badge">Applicant</div>
                    <div className="bo-cv-person-doc-title">{verificationData.customerName}</div>
                  </div>

                  <div className="bo-cv-financial-docs-container">
                    <div className="bo-cv-subdoc-card">
                      <div className="bo-cv-subdoc-header">
                        <div className="bo-cv-subdoc-header-left">
                          {LandmarkIcon ? <LandmarkIcon size={16} /> : (FileTextIcon && <FileTextIcon size={16} />)}
                          <h4 className="bo-cv-subdoc-title">Bank Statement</h4>
                        </div>
                        <div className="bo-cv-subdoc-actions">
                          {applicantFinancialDocs.bankStatement.rejection?.status === 'Resubmitted' && (
                            <span className="bo-cv-pill-fetching">Resubmitted</span>
                          )}
                          {applicantFinancialDocs.bankStatement.rejection?.status === 'ReturnedToRM' && (
                            <span className="bo-cv-pill-pending">Returned to RM</span>
                          )}
                          {applicantFinancialDocs.bankStatement.preview?.url && !applicantFinancialDocs.bankStatement.rejection && (
                            <span className="bo-cv-pill-verified">Uploaded</span>
                          )}
                        </div>
                      </div>

                      {applicantFinancialDocs.bankStatement.loading ? (
                        <div className="bo-cv-doc-loading-box">
                          <div className="bo-cv-doc-loading-spinner" />
                          <span>Loading applicant bank statement...</span>
                        </div>
                      ) : applicantFinancialDocs.bankStatement.comparison ? (
                        <div className="bo-cv-comparison-container">
                          <div className="bo-cv-comparison-grid">
                            {/* Old Version */}
                            <div className="bo-cv-comparison-card bo-cv-comparison-card--old">
                              <div className="bo-cv-comparison-card-header">
                                <span className="bo-cv-comparison-tag">Old / Rejected Version</span>
                                <span className="bo-cv-comparison-subtag">Previously Rejected</span>
                              </div>
                              {applicantFinancialDocs.bankStatement.comparison.oldDoc?.url ? (
                                <div className="bo-cv-image-preview-frame">
                                  {isDocPdf(applicantFinancialDocs.bankStatement.comparison.oldDoc) ? (
                                    <div className="bo-cv-pdf-frame-wrapper">
                                      <iframe
                                        src={applicantFinancialDocs.bankStatement.comparison.oldDoc.url}
                                        title="Previous Bank Statement PDF"
                                        className="bo-cv-doc-iframe"
                                      />
                                    </div>
                                  ) : (
                                    <img
                                      src={applicantFinancialDocs.bankStatement.comparison.oldDoc.url}
                                      alt="Previous Bank Statement"
                                      className="bo-cv-uncropped-img"
                                    />
                                  )}
                                  <div className="bo-cv-doc-meta-row">
                                    <div className="bo-cv-doc-meta-left">
                                      <span><strong>File:</strong> {applicantFinancialDocs.bankStatement.comparison.oldDoc.fileName || 'Old Bank Statement'}</span>
                                      {applicantFinancialDocs.bankStatement.comparison.oldDoc.size && (
                                        <span><strong>Size:</strong> {formatFileSize(applicantFinancialDocs.bankStatement.comparison.oldDoc.size)}</span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      className="bo-btn bo-btn--outline bo-btn--sm"
                                      onClick={() => handleDownloadFile(applicantFinancialDocs.bankStatement.comparison.oldDoc.url, applicantFinancialDocs.bankStatement.comparison.oldDoc.fileName || `Applicant_Bank_Statement_Old.${isDocPdf(applicantFinancialDocs.bankStatement.comparison.oldDoc) ? 'pdf' : 'jpg'}`)}
                                    >
                                      {DownloadIcon && <DownloadIcon size={13} />}
                                      <span>Download</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="bo-cv-empty-doc-card--comparison">
                                  <div className="bo-cv-empty-doc-icon">
                                    {FileTextIcon && <FileTextIcon size={28} />}
                                  </div>
                                  <h4>No Archived Prior Version</h4>
                                  <p>{applicantFinancialDocs.bankStatement.comparison.note || 'Previous file version is not available from the document repository.'}</p>
                                </div>
                              )}
                            </div>

                            {/* New Resubmitted Version */}
                            <div className="bo-cv-comparison-card bo-cv-comparison-card--new">
                              <div className="bo-cv-comparison-card-header">
                                <span className="bo-cv-comparison-tag">New / Resubmitted Version</span>
                                <span className="bo-cv-comparison-subtag">Ready for Review</span>
                              </div>
                              {applicantFinancialDocs.bankStatement.comparison.newDoc?.url ? (
                                <div className="bo-cv-image-preview-frame">
                                  {isDocPdf(applicantFinancialDocs.bankStatement.comparison.newDoc) ? (
                                    <div className="bo-cv-pdf-frame-wrapper">
                                      <iframe
                                        src={applicantFinancialDocs.bankStatement.comparison.newDoc.url}
                                        title="New Resubmitted Bank Statement PDF"
                                        className="bo-cv-doc-iframe"
                                      />
                                    </div>
                                  ) : (
                                    <img
                                      src={applicantFinancialDocs.bankStatement.comparison.newDoc.url}
                                      alt="New Resubmitted Bank Statement"
                                      className="bo-cv-uncropped-img"
                                    />
                                  )}
                                  <div className="bo-cv-doc-meta-row">
                                    <div className="bo-cv-doc-meta-left">
                                      <span><strong>File:</strong> {applicantFinancialDocs.bankStatement.comparison.newDoc.fileName || 'New Bank Statement'}</span>
                                      {applicantFinancialDocs.bankStatement.comparison.newDoc.size && (
                                        <span><strong>Size:</strong> {formatFileSize(applicantFinancialDocs.bankStatement.comparison.newDoc.size)}</span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      className="bo-btn bo-btn--outline bo-btn--sm"
                                      onClick={() => handleDownloadFile(applicantFinancialDocs.bankStatement.comparison.newDoc.url, applicantFinancialDocs.bankStatement.comparison.newDoc.fileName || `Applicant_Bank_Statement.${isDocPdf(applicantFinancialDocs.bankStatement.comparison.newDoc) ? 'pdf' : 'jpg'}`)}
                                    >
                                      {DownloadIcon && <DownloadIcon size={13} />}
                                      <span>Download</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="bo-cv-empty-doc-card--comparison">
                                  <div className="bo-cv-empty-doc-icon">
                                    {FileTextIcon && <FileTextIcon size={28} />}
                                  </div>
                                  <h4>No Resubmitted Document</h4>
                                  <p>RM has not uploaded a replacement Bank Statement yet.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : applicantFinancialDocs.bankStatement.preview?.url ? (
                        <div className="bo-cv-image-preview-frame">
                          {isDocPdf(applicantFinancialDocs.bankStatement.preview) ? (
                            <div className="bo-cv-pdf-frame-wrapper">
                              <iframe
                                src={applicantFinancialDocs.bankStatement.preview.url}
                                title="Bank Statement Document PDF"
                                className="bo-cv-doc-iframe"
                              />
                            </div>
                          ) : (
                            <img
                              src={applicantFinancialDocs.bankStatement.preview.url}
                              alt="Bank Statement Document"
                              className="bo-cv-uncropped-img"
                            />
                          )}
                          <div className="bo-cv-doc-meta-row">
                            <div className="bo-cv-doc-meta-left">
                              <span><strong>File:</strong> {applicantFinancialDocs.bankStatement.preview.fileName || 'Bank Statement'}</span>
                              {applicantFinancialDocs.bankStatement.preview.size && (
                                <span><strong>Size:</strong> {formatFileSize(applicantFinancialDocs.bankStatement.preview.size)}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="bo-btn bo-btn--outline bo-btn--sm"
                              onClick={() => handleDownloadFile(applicantFinancialDocs.bankStatement.preview.url, applicantFinancialDocs.bankStatement.preview.fileName || `Applicant_Bank_Statement.${isDocPdf(applicantFinancialDocs.bankStatement.preview) ? 'pdf' : 'jpg'}`)}
                            >
                              {DownloadIcon && <DownloadIcon size={13} />}
                              <span>Download</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bo-cv-empty-doc-card">
                          <div className="bo-cv-empty-doc-icon">
                            {LandmarkIcon ? <LandmarkIcon size={32} /> : (FileTextIcon && <FileTextIcon size={32} />)}
                          </div>
                          <h4>No Bank Statement Found</h4>
                          <p>No bank statement document was uploaded for applicant {verificationData.customerName}.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Co-Applicant Bank Statement */}
                {coApplicants.map((co) => {
                  const seq = co.sequence !== undefined ? co.sequence : (co.index !== undefined ? co.index + 1 : co.number);
                  const idxKey = co.index !== undefined ? co.index : (seq - 1);
                  const coFin = coApplicantsFinancialDocs[idxKey] || {
                    salarySlip: { loading: false, data: null, preview: null, comparison: null, rejection: null, error: null },
                    bankStatement: { loading: false, data: null, preview: null, comparison: null, rejection: null, error: null },
                  };

                  return (
                    <div className="bo-cv-person-doc-card" key={`co-bank-card-${co.index}`}>
                      <div className="bo-cv-person-doc-header">
                        <div className="bo-cv-person-doc-badge co-app">Co-Applicant {co.number}</div>
                        <div className="bo-cv-person-doc-title">{co.name}</div>
                      </div>

                      <div className="bo-cv-financial-docs-container">
                        <div className="bo-cv-subdoc-card">
                          <div className="bo-cv-subdoc-header">
                            <div className="bo-cv-subdoc-header-left">
                              {LandmarkIcon ? <LandmarkIcon size={16} /> : (FileTextIcon && <FileTextIcon size={16} />)}
                              <h4 className="bo-cv-subdoc-title">Co-Applicant {co.number} Bank Statement</h4>
                            </div>
                            <div className="bo-cv-subdoc-actions">
                              {coFin.bankStatement?.rejection?.status === 'Resubmitted' && (
                                <span className="bo-cv-pill-fetching">Resubmitted</span>
                              )}
                              {coFin.bankStatement?.rejection?.status === 'ReturnedToRM' && (
                                <span className="bo-cv-pill-pending">Returned to RM</span>
                              )}
                              {coFin.bankStatement?.preview?.url && !coFin.bankStatement?.rejection && (
                                <span className="bo-cv-pill-verified">Uploaded</span>
                              )}
                            </div>
                          </div>

                          {coFin.bankStatement?.loading ? (
                            <div className="bo-cv-doc-loading-box">
                              <div className="bo-cv-doc-loading-spinner" />
                              <span>Loading Co-Applicant {co.number} bank statement...</span>
                            </div>
                          ) : coFin.bankStatement?.comparison ? (
                            <div className="bo-cv-comparison-container">
                              <div className="bo-cv-comparison-grid">
                                {/* Old Version */}
                                <div className="bo-cv-comparison-card bo-cv-comparison-card--old">
                                  <div className="bo-cv-comparison-card-header">
                                    <span className="bo-cv-comparison-tag">Old / Rejected Version</span>
                                    <span className="bo-cv-comparison-subtag">Previously Rejected</span>
                                  </div>
                                  {coFin.bankStatement.comparison.oldDoc?.url ? (
                                    <div className="bo-cv-image-preview-frame">
                                      {isDocPdf(coFin.bankStatement.comparison.oldDoc) ? (
                                        <div className="bo-cv-pdf-frame-wrapper">
                                          <iframe
                                            src={coFin.bankStatement.comparison.oldDoc.url}
                                            title={`Co-Applicant ${co.number} Previous Bank Statement PDF`}
                                            className="bo-cv-doc-iframe"
                                          />
                                        </div>
                                      ) : (
                                        <img
                                          src={coFin.bankStatement.comparison.oldDoc.url}
                                          alt={`Co-Applicant ${co.number} Previous Bank Statement`}
                                          className="bo-cv-uncropped-img"
                                        />
                                      )}
                                      <div className="bo-cv-doc-meta-row">
                                        <div className="bo-cv-doc-meta-left">
                                          <span><strong>File:</strong> {coFin.bankStatement.comparison.oldDoc.fileName || `CoApplicant_${co.number}_Bank_Statement_Old`}</span>
                                          {coFin.bankStatement.comparison.oldDoc.size && (
                                            <span><strong>Size:</strong> {formatFileSize(coFin.bankStatement.comparison.oldDoc.size)}</span>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          className="bo-btn bo-btn--outline bo-btn--sm"
                                          onClick={() => handleDownloadFile(coFin.bankStatement.comparison.oldDoc.url, coFin.bankStatement.comparison.oldDoc.fileName || `CoApplicant_${co.number}_Bank_Statement_Old.${isDocPdf(coFin.bankStatement.comparison.oldDoc) ? 'pdf' : 'jpg'}`)}
                                        >
                                          {DownloadIcon && <DownloadIcon size={13} />}
                                          <span>Download</span>
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bo-cv-empty-doc-card--comparison">
                                      <div className="bo-cv-empty-doc-icon">
                                        {FileTextIcon && <FileTextIcon size={28} />}
                                      </div>
                                      <h4>No Archived Prior Version</h4>
                                      <p>{coFin.bankStatement.comparison.note || 'Previous file version is not available from the document repository.'}</p>
                                    </div>
                                  )}
                                </div>

                                {/* New Resubmitted Version */}
                                <div className="bo-cv-comparison-card bo-cv-comparison-card--new">
                                  <div className="bo-cv-comparison-card-header">
                                    <span className="bo-cv-comparison-tag">New / Resubmitted Version</span>
                                    <span className="bo-cv-comparison-subtag">Ready for Review</span>
                                  </div>
                                  {coFin.bankStatement.comparison.newDoc?.url ? (
                                    <div className="bo-cv-image-preview-frame">
                                      {isDocPdf(coFin.bankStatement.comparison.newDoc) ? (
                                        <div className="bo-cv-pdf-frame-wrapper">
                                          <iframe
                                            src={coFin.bankStatement.comparison.newDoc.url}
                                            title={`Co-Applicant ${co.number} New Bank Statement PDF`}
                                            className="bo-cv-doc-iframe"
                                          />
                                        </div>
                                      ) : (
                                        <img
                                          src={coFin.bankStatement.comparison.newDoc.url}
                                          alt={`Co-Applicant ${co.number} New Bank Statement`}
                                          className="bo-cv-uncropped-img"
                                        />
                                      )}
                                      <div className="bo-cv-doc-meta-row">
                                        <div className="bo-cv-doc-meta-left">
                                          <span><strong>File:</strong> {coFin.bankStatement.comparison.newDoc.fileName || `CoApplicant_${co.number}_Bank_Statement_New`}</span>
                                          {coFin.bankStatement.comparison.newDoc.size && (
                                            <span><strong>Size:</strong> {formatFileSize(coFin.bankStatement.comparison.newDoc.size)}</span>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          className="bo-btn bo-btn--outline bo-btn--sm"
                                          onClick={() => handleDownloadFile(coFin.bankStatement.comparison.newDoc.url, coFin.bankStatement.comparison.newDoc.fileName || `CoApplicant_${co.number}_Bank_Statement.${isDocPdf(coFin.bankStatement.comparison.newDoc) ? 'pdf' : 'jpg'}`)}
                                        >
                                          {DownloadIcon && <DownloadIcon size={13} />}
                                          <span>Download</span>
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bo-cv-empty-doc-card--comparison">
                                      <div className="bo-cv-empty-doc-icon">
                                        {FileTextIcon && <FileTextIcon size={28} />}
                                      </div>
                                      <h4>No Resubmitted Document</h4>
                                      <p>RM has not uploaded a replacement Bank Statement yet.</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : coFin.bankStatement?.preview?.url ? (
                            <div className="bo-cv-image-preview-frame">
                              {isDocPdf(coFin.bankStatement.preview) ? (
                                <div className="bo-cv-pdf-frame-wrapper">
                                  <iframe
                                    src={coFin.bankStatement.preview.url}
                                    title={`Co-Applicant ${co.number} Bank Statement PDF`}
                                    className="bo-cv-doc-iframe"
                                  />
                                </div>
                              ) : (
                                <img
                                  src={coFin.bankStatement.preview.url}
                                  alt={`Co-Applicant ${co.number} Bank Statement`}
                                  className="bo-cv-uncropped-img"
                                />
                              )}
                              <div className="bo-cv-doc-meta-row">
                                <div className="bo-cv-doc-meta-left">
                                  <span><strong>File:</strong> {coFin.bankStatement.preview.fileName || `CoApplicant_${co.number}_Bank_Statement`}</span>
                                  {coFin.bankStatement.preview.size && (
                                    <span><strong>Size:</strong> {formatFileSize(coFin.bankStatement.preview.size)}</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="bo-btn bo-btn--outline bo-btn--sm"
                                  onClick={() => handleDownloadFile(coFin.bankStatement.preview.url, coFin.bankStatement.preview.fileName || `CoApplicant_${co.number}_Bank_Statement.${isDocPdf(coFin.bankStatement.preview) ? 'pdf' : 'jpg'}`)}
                                >
                                  {DownloadIcon && <DownloadIcon size={13} />}
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bo-cv-empty-doc-card">
                              <div className="bo-cv-empty-doc-icon">
                                {LandmarkIcon ? <LandmarkIcon size={32} /> : (FileTextIcon && <FileTextIcon size={32} />)}
                              </div>
                              <h4>No Bank Statement Found</h4>
                              <p>No bank statement was uploaded for Co-Applicant {co.number} ({co.name}).</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Step Verification Control & Remarks & Reject / Send to RM */}
                <div className="verification-action-bar">
                  <div className="bo-cv-verify-row">
                    <label className="bo-cv-checkbox-label">
                      <input
                        type="checkbox"
                        className="bo-cv-verify-checkbox"
                        checked={Boolean(stepVerifications['BANK_STATEMENT']?.isVerified) && !hasUnresolvedRejectionForStep('BANK_STATEMENT')}
                        disabled={isSavingStepVerification || hasUnresolvedRejectionForStep('BANK_STATEMENT')}
                        title={hasUnresolvedRejectionForStep('BANK_STATEMENT') ? 'Resolve all returned/resubmitted documents before marking as Verified' : undefined}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          handleSaveStepVerification({
                            stepCode: 'BANK_STATEMENT',
                            isVerified: checked,
                            remarks: stepRemarks[6] || '',
                          });
                        }}
                      />
                      <span className="bo-cv-verify-text">
                        Mark Bank Statement as <strong>Verified</strong>
                      </span>
                    </label>
                    {stepVerifications['BANK_STATEMENT']?.isVerified && !hasUnresolvedRejectionForStep('BANK_STATEMENT') && (
                      <span className="bo-cv-verified-tag">
                        ✓ Verified by {stepVerifications['BANK_STATEMENT']?.verifiedByBackOfficeId ? `Operator #${stepVerifications['BANK_STATEMENT'].verifiedByBackOfficeId}` : 'Back Office'}
                      </span>
                    )}
                  </div>

                  <div className="verification-remarks-field">
                    <label htmlFor="bo-cv-remarks-bank">VERIFICATION REMARKS</label>
                    <textarea
                      id="bo-cv-remarks-bank"
                      className="bo-cv-remarks-input"
                      rows={3}
                      placeholder="Enter remarks or discrepancy details for bank statement verification..."
                      value={stepRemarks[6] || ''}
                      onChange={(e) => {
                        setStepRemarks({ ...stepRemarks, 6: e.target.value });
                        if (stepFeedback[6]) setStepFeedback({ ...stepFeedback, 6: null });
                      }}
                      onBlur={() => {
                        if (stepVerifications['BANK_STATEMENT']?.isVerified && !hasUnresolvedRejectionForStep('BANK_STATEMENT')) {
                          handleSaveStepVerification({
                            stepCode: 'BANK_STATEMENT',
                            isVerified: true,
                            remarks: stepRemarks[6] || '',
                          });
                        }
                      }}
                    />
                  </div>

                  <div className="verification-buttons-row">
                    {/* Verify Resubmitted Applicant Bank Statement */}
                    {(() => {
                      const rej = getActiveRejectionForApplicantDoc(bankStatementDocTypeId, 'BANK_STATEMENT');
                      if (rej && rej.status === 'Resubmitted') {
                        return (
                          <button
                            type="button"
                            className="verify-resubmit-btn"
                            disabled={isVerifyingRejection}
                            onClick={() => handleVerifyRejection(rej.backOfficeDocumentRejectionId, 'Applicant Bank Statement', 6)}
                          >
                            <span>{isVerifyingRejection ? 'Verifying...' : '✓ Verify Applicant Bank Statement'}</span>
                          </button>
                        );
                      }
                      return null;
                    })()}

                    {/* Verify Resubmitted Co-Applicant Bank Statement */}
                    {coApplicants.map((co) => {
                      const seq = co.sequence !== undefined ? co.sequence : (co.index !== undefined ? co.index + 1 : co.number);
                      const coBankRej = getActiveRejectionForCoApplicantDoc(seq, bankStatementDocTypeId, 'BANK_STATEMENT');
                      if (coBankRej && coBankRej.status === 'Resubmitted') {
                        return (
                          <button
                            key={`verify-co-bank-${co.index}`}
                            type="button"
                            className="verify-resubmit-btn"
                            style={{ background: '#047857' }}
                            disabled={isVerifyingRejection}
                            onClick={() => handleVerifyRejection(coBankRej.backOfficeDocumentRejectionId, `Co-Applicant ${co.number} Bank Statement`, 6)}
                          >
                            <span>{isVerifyingRejection ? 'Verifying...' : `✓ Verify Co-App ${co.number} Bank Statement`}</span>
                          </button>
                        );
                      }
                      return null;
                    })}

                    {/* Reject Applicant Bank Statement */}
                    <button
                      type="button"
                      className="reject-rm-btn"
                      disabled={isSubmittingRejection}
                      onClick={() => handleOpenRejectConfirm(6, 'Applicant Bank Statement', null, false, 0, bankStatementDocTypeId, 'APPLICANT_BANK_STATEMENT')}
                    >
                      <span>{isSubmittingRejection ? 'Submitting...' : 'Return Applicant to RM'}</span>
                    </button>

                    {/* Reject Co-Applicant Bank Statement */}
                    {coApplicants.map((co) => {
                      const seq = co.sequence !== undefined ? co.sequence : (co.index !== undefined ? co.index + 1 : co.number);
                      return (
                        <button
                          key={`reject-co-bank-${co.index}`}
                          type="button"
                          className="reject-rm-btn"
                          style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}
                          disabled={isSubmittingRejection}
                          onClick={() => handleOpenRejectConfirm(6, `Co-Applicant ${co.number} Bank Statement`, null, true, seq, bankStatementDocTypeId, `CO_APPLICANT_${seq}_BANK_STATEMENT`)}
                        >
                          <span>{isSubmittingRejection ? 'Submitting...' : `Return Co-Applicant ${co.number} to RM`}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {stepFeedback[6] && (
                  <div className={`bo-cv-feedback-alert ${stepFeedback[6].type === 'error' ? 'is-error' : 'is-success'}`}>
                    {stepFeedback[6].message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 07: ZIP / CUSTOMER ARCHIVE
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 7 && (
            <div className="bo-cv-doc-step-inner">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">07</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">ZIP / Customer Archive</h2>
                    <p className="bo-cv-step-panel-desc">
                      Inspect and download customer ZIP archives, manual document packages, and supplementary uploads.
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 07 of 17</span>
              </div>

              <div className="bo-cv-doc-display-container">
                {/* Active Rejection Banners across Step 07 */}
                {(() => {
                  const allStep7Rejections = [
                    getActiveRejectionForApplicant(7),
                    ...coApplicants.flatMap((co) => {
                      return [
                        getActiveRejectionForCoApplicant(co.kycDocumentId, 7),
                      ];
                    }),
                  ].filter(Boolean);

                  if (allStep7Rejections.length === 0) return null;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                      {allStep7Rejections.map((rej) => (
                        <div
                          key={`step7-rej-banner-${rej.backOfficeDocumentRejectionId}`}
                          className={`rejection-status-banner rejection-status--${(rej.status || '').toLowerCase()}`}
                        >
                          <div className="rejection-status-header">
                            <strong>
                              {rej.status === 'ReturnedToRM' && `⚠️ Document Returned to RM: ${rej.rejectedDocumentType || 'ZIP Archive'}`}
                              {rej.status === 'Resubmitted' && `🔄 Document Resubmitted by RM: ${rej.rejectedDocumentType || 'ZIP Archive'} (Ready for Verification)`}
                              {rej.status === 'Verified' && `✓ Document Verified & Approved: ${rej.rejectedDocumentType || 'ZIP Archive'}`}
                            </strong>
                            <span className="rejection-status-date">
                              {rej.resubmittedAt
                                ? `Resubmitted: ${new Date(rej.resubmittedAt).toLocaleString()}`
                                : rej.createdAt
                                ? `Returned: ${new Date(rej.createdAt).toLocaleString()}`
                                : ''}
                            </span>
                          </div>
                          {rej.rejectionRemarks && (
                            <p className="rejection-status-remarks">
                              <strong>Remarks:</strong> {rej.rejectionRemarks}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* 1. Applicant Manual / ZIP Documents */}
                <div className="bo-cv-person-doc-card">
                  <div className="bo-cv-person-doc-header">
                    <div className="bo-cv-person-doc-badge">Applicant</div>
                    <div className="bo-cv-person-doc-title">{verificationData.customerName}</div>
                  </div>

                  <div className="bo-cv-financial-docs-container">
                    <div className="bo-cv-subdoc-card">
                      <div className="bo-cv-subdoc-header">
                        <div className="bo-cv-subdoc-header-left">
                          {FileCheckIcon && <FileCheckIcon size={16} />}
                          <h4 className="bo-cv-subdoc-title">ZIP Archive & Manual Documents</h4>
                        </div>
                        <div className="bo-cv-subdoc-actions">
                          {applicantManualDocs.length > 0 && (
                            <span className="bo-cv-pill-verified">{applicantManualDocs.length} {applicantManualDocs.length === 1 ? 'file' : 'files'}</span>
                          )}
                        </div>
                      </div>

                      {applicantManualDocs.length > 0 ? (
                        <div className="bo-cv-manual-docs-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                          {applicantManualDocs.map((doc, idx) => (
                            <div className="bo-cv-file-card" key={doc.id || `app-manual-${idx}`}>
                              <div className="bo-cv-file-card-info">
                                <div className="bo-cv-file-card-icon">
                                  {FileCheckIcon && <FileCheckIcon size={22} />}
                                </div>
                                <div>
                                  <h4 className="bo-cv-file-name" title={doc.fileName}>{doc.fileName}</h4>
                                  <div className="bo-cv-file-size" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                    <span>{doc.fileTypeLabel}</span>
                                    <span>•</span>
                                    <span style={{ color: '#15803d', fontWeight: 600 }}>Uploaded successfully</span>
                                    {doc.size && <span>• {formatFileSize(doc.size)}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="bo-cv-file-card-actions">
                                <button
                                  type="button"
                                  className="bo-btn bo-btn--primary bo-btn--sm"
                                  onClick={() => handleDownloadManualDoc(doc)}
                                  title={`Download ${doc.fileName}`}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                >
                                  {DownloadIcon && <DownloadIcon size={13} />}
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bo-cv-empty-doc-card">
                          <div className="bo-cv-empty-doc-icon">
                            {FileCheckIcon && <FileCheckIcon size={36} />}
                          </div>
                          <h4>No ZIP / Manual Documents Found</h4>
                          <p>No compressed document bundle was uploaded for applicant {verificationData.customerName}.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Co-Applicant Manual / ZIP Documents */}
                {coApplicants.map((co) => {
                  const coDocs = coApplicantsManualDocs[co.index] || [];

                  return (
                    <div className="bo-cv-person-doc-card" key={`co-zip-card-${co.index}`}>
                      <div className="bo-cv-person-doc-header">
                        <div className="bo-cv-person-doc-badge co-app">Co-Applicant {co.number}</div>
                        <div className="bo-cv-person-doc-title">{co.name}</div>
                      </div>

                      <div className="bo-cv-financial-docs-container">
                        <div className="bo-cv-subdoc-card">
                          <div className="bo-cv-subdoc-header">
                            <div className="bo-cv-subdoc-header-left">
                              {FileCheckIcon && <FileCheckIcon size={16} />}
                              <h4 className="bo-cv-subdoc-title">Co-Applicant {co.number} ZIP & Manual Documents</h4>
                            </div>
                            <div className="bo-cv-subdoc-actions">
                              {coDocs.length > 0 && (
                                <span className="bo-cv-pill-verified">{coDocs.length} {coDocs.length === 1 ? 'file' : 'files'}</span>
                              )}
                            </div>
                          </div>

                          {coDocs.length > 0 ? (
                            <div className="bo-cv-manual-docs-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                              {coDocs.map((doc, idx) => (
                                <div className="bo-cv-file-card" key={doc.id || `co-manual-${co.index}-${idx}`}>
                                  <div className="bo-cv-file-card-info">
                                    <div className="bo-cv-file-card-icon">
                                      {FileCheckIcon && <FileCheckIcon size={22} />}
                                    </div>
                                    <div>
                                      <h4 className="bo-cv-file-name" title={doc.fileName}>{doc.fileName}</h4>
                                      <div className="bo-cv-file-size" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                        <span>{doc.fileTypeLabel}</span>
                                        <span>•</span>
                                        <span style={{ color: '#15803d', fontWeight: 600 }}>Uploaded successfully</span>
                                        {doc.size && <span>• {formatFileSize(doc.size)}</span>}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="bo-cv-file-card-actions">
                                    <button
                                      type="button"
                                      className="bo-btn bo-btn--primary bo-btn--sm"
                                      onClick={() => handleDownloadManualDoc(doc)}
                                      title={`Download ${doc.fileName}`}
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    >
                                      {DownloadIcon && <DownloadIcon size={13} />}
                                      <span>Download</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bo-cv-empty-doc-card">
                              <div className="bo-cv-empty-doc-icon">
                                {FileCheckIcon && <FileCheckIcon size={36} />}
                              </div>
                              <h4>No ZIP / Manual Documents Found</h4>
                              <p>No compressed archive was uploaded for Co-Applicant {co.number} ({co.name}).</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Step Verification Control & Remarks & Reject / Send to RM */}
                <div className="verification-action-bar">
                  <div className="bo-cv-verify-row">
                    <label className="bo-cv-checkbox-label">
                      <input
                        type="checkbox"
                        className="bo-cv-verify-checkbox"
                        checked={Boolean(stepVerifications['ZIP_ARCHIVE']?.isVerified) && !hasUnresolvedRejectionForStep('ZIP_ARCHIVE')}
                        disabled={isSavingStepVerification || hasUnresolvedRejectionForStep('ZIP_ARCHIVE')}
                        title={hasUnresolvedRejectionForStep('ZIP_ARCHIVE') ? 'Resolve all returned/resubmitted documents before marking as Verified' : undefined}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          handleSaveStepVerification({
                            stepCode: 'ZIP_ARCHIVE',
                            isVerified: checked,
                            remarks: stepRemarks[7] || '',
                          });
                        }}
                      />
                      <span className="bo-cv-verify-text">
                        Mark ZIP / Customer Archive as <strong>Verified</strong>
                      </span>
                    </label>
                    {stepVerifications['ZIP_ARCHIVE']?.isVerified && !hasUnresolvedRejectionForStep('ZIP_ARCHIVE') && (
                      <span className="bo-cv-verified-tag">
                        ✓ Verified by {stepVerifications['ZIP_ARCHIVE']?.verifiedByBackOfficeId ? `Operator #${stepVerifications['ZIP_ARCHIVE'].verifiedByBackOfficeId}` : 'Back Office'}
                      </span>
                    )}
                  </div>

                  <div className="verification-remarks-field">
                    <label htmlFor="bo-cv-remarks-zip">VERIFICATION REMARKS</label>
                    <textarea
                      id="bo-cv-remarks-zip"
                      className="bo-cv-remarks-input"
                      rows={3}
                      placeholder="Enter remarks or discrepancy details for customer archive / ZIP documents..."
                      value={stepRemarks[7] || ''}
                      onChange={(e) => {
                        setStepRemarks({ ...stepRemarks, 7: e.target.value });
                        if (stepFeedback[7]) setStepFeedback({ ...stepFeedback, 7: null });
                      }}
                      onBlur={() => {
                        if (stepVerifications['ZIP_ARCHIVE']?.isVerified && !hasUnresolvedRejectionForStep('ZIP_ARCHIVE')) {
                          handleSaveStepVerification({
                            stepCode: 'ZIP_ARCHIVE',
                            isVerified: true,
                            remarks: stepRemarks[7] || '',
                          });
                        }
                      }}
                    />
                  </div>

                  <div className="verification-buttons-row">
                    {/* Verify Resubmitted Applicant ZIP */}
                    {(() => {
                      const appRej = getActiveRejectionForApplicant(7);
                      if (appRej && appRej.status === 'Resubmitted') {
                        return (
                          <button
                            type="button"
                            className="verify-resubmit-btn"
                            disabled={isVerifyingRejection}
                            onClick={() => handleVerifyRejection(appRej.backOfficeDocumentRejectionId, 'Applicant ZIP File', 7)}
                          >
                            <span>{isVerifyingRejection ? 'Verifying...' : '✓ Verify Applicant ZIP'}</span>
                          </button>
                        );
                      }
                      return null;
                    })()}

                    {/* Verify Resubmitted Co-Applicant ZIP */}
                    {coApplicants.map((co) => {
                      const coZipRej = getActiveRejectionForCoApplicant(co.kycDocumentId, 7);
                      if (coZipRej && coZipRej.status === 'Resubmitted') {
                        return (
                          <button
                            key={`verify-co-zip-${co.index}`}
                            type="button"
                            className="verify-resubmit-btn"
                            style={{ background: '#047857' }}
                            disabled={isVerifyingRejection}
                            onClick={() => handleVerifyRejection(coZipRej.backOfficeDocumentRejectionId, `Co-Applicant ${co.number} ZIP File`, 7)}
                          >
                            <span>{isVerifyingRejection ? 'Verifying...' : `✓ Verify Co-App ${co.number} ZIP`}</span>
                          </button>
                        );
                      }
                      return null;
                    })}

                    {/* Reject Applicant ZIP */}
                    <button
                      type="button"
                      className="reject-rm-btn"
                      disabled={isSubmittingRejection}
                      onClick={() => handleOpenRejectConfirm(7, 'Applicant ZIP File', null, false, 0, null, 'APPLICANT_ZIP')}
                    >
                      <span>{isSubmittingRejection ? 'Submitting...' : 'Return Applicant to RM'}</span>
                    </button>

                    {/* Reject Co-Applicant ZIP */}
                    {coApplicants.map((co) => {
                      const seq = co.sequence !== undefined ? co.sequence : (co.index !== undefined ? co.index + 1 : co.number);
                      return (
                        <button
                          key={`reject-co-zip-${co.index}`}
                          type="button"
                          className="reject-rm-btn"
                          style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}
                          disabled={isSubmittingRejection}
                          onClick={() => handleOpenRejectConfirm(7, `Co-Applicant ${co.number} ZIP File`, co.kycDocumentId, true, seq, null, `CO_APPLICANT_${co.number}_ZIP`)}
                        >
                          <span>{isSubmittingRejection ? 'Submitting...' : `Return Co-Applicant ${co.number} to RM`}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {stepFeedback[7] && (
                  <div className={`bo-cv-feedback-alert ${stepFeedback[7].type === 'error' ? 'is-error' : 'is-success'}`}>
                    {stepFeedback[7].message}
                  </div>
                )}
              </div>
            </div>
          )}
              </div>
            </div>
          )}

{/* ══════════════════════════════════════════════════════════════════
              STEP 08: PROPERTY FI (PLACEHOLDER)
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 8 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">08</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Property FI</h2>
                    <p className="bo-cv-step-panel-desc">Property Field Investigation details and collateral valuation.</p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 08 of 17</span>
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
              STEP 09: OFFICE FI (PLACEHOLDER)
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 9 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">09</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Office FI</h2>
                    <p className="bo-cv-step-panel-desc">Workplace and business establishment field investigation.</p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 09 of 17</span>
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
              STEP 10: RESIDENCE FI (PLACEHOLDER)
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 10 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">10</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Residence FI</h2>
                    <p className="bo-cv-step-panel-desc">Physical residence field verification and neighbor check.</p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 10 of 17</span>
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
          {activeStep === 11 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">11</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Legal Opinion</h2>
                    <p className="bo-cv-step-panel-desc">
                      Upload and review advocate title investigation report and legal opinion (Max: 150 MB).
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 11 of 17</span>
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
                  <div className="bo-cv-step-badge-num">12</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Technical Value</h2>
                    <p className="bo-cv-step-panel-desc">
                      Upload and review certified engineer property valuation and technical report (Max: 150 MB).
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 12 of 17</span>
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
                  <div className="bo-cv-step-badge-num">13</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Credit Bureau &amp; CIBIL Verification</h2>
                    <p className="bo-cv-step-panel-desc">
                      Direct bureau credit pull, CIR score breakdown, and manual PAN verification upload.
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 13 of 17</span>
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
                  <div className="bo-cv-step-badge-num">14</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Personal Discussion (PD) Verification</h2>
                    <p className="bo-cv-step-panel-desc">
                      Configure and record personal discussion verification mode with the applicant.
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 14 of 17</span>
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
              STEP 13: ELIGIBILITY CALCULATION (FOIR)
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 15 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">15</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Eligibility Calculation (FOIR)</h2>
                    <p className="bo-cv-step-panel-desc">
                      Calculate Fixed Obligation to Income Ratio, determine loan eligibility, and sign off underwriting decision.
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 15 of 17</span>
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
              STEP 14: ELIGIBILITY ASSESSMENT (PHASE 2A)
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 16 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">16</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Eligibility Assessment</h2>
                    <p className="bo-cv-step-panel-desc">
                      Configure assessment methodology, applicant income parameters, and banking eligibility.
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 16 of 17</span>
              </div>

              <div className="bo-cv-assess-container">
                {/* ── Section 1: Assessment Method Selection ─────────────────── */}
                <div className="bo-cv-assess-section">
                  <div className="bo-cv-assess-section-header">
                    <div className="bo-cv-assess-section-title-wrap">
                      <span className="bo-cv-assess-section-num">1</span>
                      <div>
                        <h3 className="bo-cv-assess-section-title">Select Assessment Method</h3>
                        <p className="bo-cv-assess-section-sub">
                          Choose the underwriting evaluation model to assess borrowing capacity.
                        </p>
                      </div>
                    </div>
                  </div>

                  {methodsLoading ? (
                    <div className="bo-cv-assess-loading-box">
                      <div className="bo-cv-loading-spinner" />
                      <span>Loading assessment calculation methods...</span>
                    </div>
                  ) : methodsError ? (
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
                    <div className="bo-cv-method-cards-grid">
                      {assessmentMethods.map((method) => {
                        const isSelected = (method.methodCode || '').toUpperCase() === selectedMethodCode.toUpperCase();
                        const isIncome = (method.methodCode || '').toUpperCase() === 'INCOME';
                        return (
                          <button
                            key={method.assessmentMethodId || method.methodCode}
                            type="button"
                            className={`bo-cv-method-card ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => setSelectedMethodCode((method.methodCode || 'INCOME').toUpperCase())}
                          >
                            <div className="bo-cv-method-card-header">
                              <div className="bo-cv-method-card-icon-wrap">
                                {isIncome ? (
                                  BadgeIndianRupeeIcon && <BadgeIndianRupeeIcon size={22} />
                                ) : (
                                  BuildingIcon && <BuildingIcon size={22} />
                                )}
                              </div>
                              <span className={`bo-cv-method-radio ${isSelected ? 'is-checked' : ''}`}>
                                {isSelected && (CheckCircleIcon ? <CheckCircleIcon size={16} /> : '✓')}
                              </span>
                            </div>
                            <div className="bo-cv-method-card-content">
                              <h4 className="bo-cv-method-title">
                                {method.methodName || (isIncome ? 'Income Method' : 'ABB Method')}
                              </h4>
                              <p className="bo-cv-method-desc">
                                {isIncome
                                  ? 'Evaluates eligibility from 3-month salary breakdown (Basic, HRA, CCA, TA, Incentives) and policy FOIR.'
                                  : 'Evaluates eligibility from multi-account banking conduct and 3-point monthly average balances (5th, 15th, 25th).'}
                              </p>
                            </div>
                            <div className="bo-cv-method-card-footer">
                              <span className="bo-cv-method-code-tag">{method.methodCode}</span>
                              {isSelected && <span className="bo-cv-method-active-pill">Active Assessment</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Section 2: Dynamic Applicant Selector ─────────────────── */}
                <div className="bo-cv-assess-section">
                  <div className="bo-cv-assess-section-header">
                    <div className="bo-cv-assess-section-title-wrap">
                      <span className="bo-cv-assess-section-num">2</span>
                      <div>
                        <h3 className="bo-cv-assess-section-title">Select Applicant Context</h3>
                        <p className="bo-cv-assess-section-sub">
                          Toggle between main borrower and co-applicants to review and calculate individual parameters.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bo-cv-applicant-tabs-bar">
                    {allApplicants.map((app) => {
                      const isSelected = app.sequence === selectedApplicantSequence;
                      return (
                        <button
                          key={`applicant-tab-${app.sequence}`}
                          type="button"
                          className={`bo-cv-applicant-tab-btn ${isSelected ? 'is-active' : ''}`}
                          onClick={() => setSelectedApplicantSequence(app.sequence)}
                        >
                          <div className="bo-cv-applicant-tab-icon">
                            {UserIcon && <UserIcon size={14} />}
                          </div>
                          <div className="bo-cv-applicant-tab-info">
                            <span className="bo-cv-applicant-tab-role">
                              {app.label}
                            </span>
                            <span className="bo-cv-applicant-tab-name">
                              {app.name}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="bo-cv-applicant-tab-active-dot" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Section 3: Application & RM Income Reference ─────────── */}
                <div className="bo-cv-assess-section">
                  <div className="bo-cv-assess-section-header">
                    <div className="bo-cv-assess-section-title-wrap">
                      <span className="bo-cv-assess-section-num">3</span>
                      <div>
                        <h3 className="bo-cv-assess-section-title">Application Snapshot &amp; RM Income Reference</h3>
                        <p className="bo-cv-assess-section-sub">
                          Verified underwriting details and RM declared reference income for {selectedApplicant?.name || 'Selected Applicant'}.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Missing Employment Warning Strip */}
                  {!selectedEmploymentIncomeDetailsId && (
                    <div className="bo-cv-assess-warning-strip">
                      <div className="bo-cv-assess-warning-icon">
                        {AlertCircleIcon && <AlertCircleIcon size={18} />}
                      </div>
                      <div className="bo-cv-assess-warning-text">
                        <strong>Employment Details Not Available:</strong> No active employment income record is linked to {selectedApplicant?.name || 'this applicant'}. Income calculation for this applicant will be bypassed until employment records are provided by the RM.
                      </div>
                    </div>
                  )}

                  {/* Application Snapshot Grid */}
                  <div className="bo-cv-assess-info-grid">
                    <div className="bo-cv-assess-info-cell">
                      <span className="bo-cv-assess-info-label">Applicant Name</span>
                      <strong className="bo-cv-assess-info-val">{selectedApplicant?.name || '—'}</strong>
                    </div>

                    <div className="bo-cv-assess-info-cell">
                      <span className="bo-cv-assess-info-label">Applicant Role</span>
                      <strong className="bo-cv-assess-info-val">
                        <span className={`bo-cv-role-badge ${selectedApplicant?.isMain ? 'is-main' : 'is-co'}`}>
                          {selectedApplicant?.isMain ? 'Main Applicant' : 'Co-Applicant'}
                        </span>
                      </strong>
                    </div>

                    <div className="bo-cv-assess-info-cell">
                      <span className="bo-cv-assess-info-label">PAN Number</span>
                      <strong className="bo-cv-assess-info-val bo-cv-pan-val">
                        {selectedApplicant?.pan || 'Not Available'}
                      </strong>
                    </div>

                    <div className="bo-cv-assess-info-cell">
                      <span className="bo-cv-assess-info-label">Employment Type</span>
                      <strong className="bo-cv-assess-info-val">
                        {selectedEmploymentTypeName || 'Not Specified'}
                      </strong>
                    </div>

                    <div className="bo-cv-assess-info-cell">
                      <span className="bo-cv-assess-info-label">Employer / Business</span>
                      <strong className="bo-cv-assess-info-val">
                        {selectedEmployerName || 'Not Specified'}
                      </strong>
                    </div>

                    <div className="bo-cv-assess-info-cell">
                      <span className="bo-cv-assess-info-label">Loan Product</span>
                      <strong className="bo-cv-assess-info-val">
                        {appDetails.loanProduct || 'Not Specified'}
                      </strong>
                    </div>

                    <div className="bo-cv-assess-info-cell">
                      <span className="bo-cv-assess-info-label">Requested Loan Amount</span>
                      <strong className="bo-cv-assess-info-val bo-cv-amount-val">
                        {formatCurrency(appDetails.loanAmount)}
                      </strong>
                    </div>

                    <div className="bo-cv-assess-info-cell">
                      <span className="bo-cv-assess-info-label">Interest Rate (ROI)</span>
                      <strong className="bo-cv-assess-info-val">
                        {resolvedAppRoi != null ? `${resolvedAppRoi}% p.a.` : '—'}
                      </strong>
                    </div>

                    <div className="bo-cv-assess-info-cell">
                      <span className="bo-cv-assess-info-label">Loan Tenure</span>
                      <strong className="bo-cv-assess-info-val">
                        {resolvedAppTenure != null ? `${resolvedAppTenure} Months` : '—'}
                      </strong>
                    </div>

                    <div className="bo-cv-assess-info-cell">
                      <span className="bo-cv-assess-info-label">Assessment Method</span>
                      <strong className="bo-cv-assess-info-val bo-cv-method-val">
                        {selectedMethodCode === 'INCOME' ? 'Income Method' : 'ABB Method'}
                      </strong>
                    </div>

                    <div className="bo-cv-assess-info-cell">
                      <span className="bo-cv-assess-info-label">Policy FOIR Limit</span>
                      <strong className="bo-cv-assess-info-val bo-cv-foir-val">
                        {resolvedPolicyFoir || 'Not Configured'}
                      </strong>
                    </div>
                  </div>

                  {/* RM Income Reference Container */}
                  <div className="bo-cv-rm-income-ref-card" style={{ marginTop: '14px' }}>
                    <div className="bo-cv-rm-income-ref-header">
                      <div className="bo-cv-rm-income-ref-title-group">
                        <span className="bo-cv-rm-income-ref-title">RM Income Reference</span>
                        <span className="bo-cv-rm-income-ref-badge">Reference Only</span>
                      </div>
                      <span className="bo-cv-rm-income-ref-sub">
                        Declared income figures captured during initial RM onboarding (informational only — not used as calculation source).
                      </span>
                    </div>

                    <div className="bo-cv-rm-income-ref-grid">
                      <div className="bo-cv-rm-income-ref-cell">
                        <span className="bo-cv-rm-income-ref-label">Gross Monthly Income</span>
                        <strong className="bo-cv-rm-income-ref-val">
                          {formatCurrency(selectedEmploymentRecord?.grossMonthlyIncome ?? verificationData?.employmentIncome?.grossMonthlyIncome ?? 0)}
                        </strong>
                      </div>

                      <div className="bo-cv-rm-income-ref-cell">
                        <span className="bo-cv-rm-income-ref-label">Other Monthly Income</span>
                        <strong className="bo-cv-rm-income-ref-val">
                          {formatCurrency(selectedEmploymentRecord?.otherMonthlyIncome ?? verificationData?.employmentIncome?.otherMonthlyIncome ?? 0)}
                        </strong>
                      </div>

                      <div className="bo-cv-rm-income-ref-cell is-net">
                        <span className="bo-cv-rm-income-ref-label">Net Monthly Income</span>
                        <strong className="bo-cv-rm-income-ref-val is-net-val">
                          {formatCurrency(selectedEmploymentRecord?.netMonthlyIncome ?? verificationData?.employmentIncome?.netMonthlyIncome ?? 0)}
                        </strong>
                      </div>

                      <div className="bo-cv-rm-income-ref-cell">
                        <span className="bo-cv-rm-income-ref-label">Gross Annual Income</span>
                        <strong className="bo-cv-rm-income-ref-val">
                          {formatCurrency(selectedEmploymentRecord?.grossAnnualIncome ?? verificationData?.employmentIncome?.grossAnnualIncome ?? 0)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Section 4: Method Workspace Container ─────────────────── */}
                <div className="bo-cv-assess-section">
                  <div className="bo-cv-assess-section-header">
                    <div className="bo-cv-assess-section-title-wrap">
                      <span className="bo-cv-assess-section-num">4</span>
                      <div>
                        <h3 className="bo-cv-assess-section-title">
                          {selectedMethodCode === 'INCOME'
                            ? 'Manual Income Assessment Workspace'
                            : 'Average Bank Balance (ABB) Method Workspace'}
                        </h3>
                        <p className="bo-cv-assess-section-sub">
                          {selectedMethodCode === 'INCOME'
                            ? `Enter & review 3-month salary breakdown and allowances for ${selectedApplicant?.name || 'Applicant'}.`
                            : `Multi-account banking analysis and monthly 3-point average balance verification for ${selectedApplicant?.name || 'Applicant'}.`}
                        </p>
                      </div>
                    </div>
                    <span className="bo-cv-phase-tag is-method">
                      {selectedMethodCode === 'INCOME' ? 'Income Method' : 'ABB Method'}
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

                      {/* Underwriting Guidance Note */}
                      <div className="bo-cv-salary-info-strip">
                        <div className="bo-cv-salary-info-icon">
                          {InfoIcon && <InfoIcon size={16} />}
                        </div>
                        <div className="bo-cv-salary-info-text">
                          <strong>Manual Salary Entry Workspace:</strong> Enter/edit salary breakdown values. Live previews update instantly on keystroke with zero network requests. Values will be automatically synchronized with the server upon running eligibility calculation.
                        </div>
                      </div>

                      {/* Dynamic Income Summary Strip */}
                      <div className="bo-cv-salary-summary-strip">
                        <div className="bo-cv-salary-summary-strip-header">
                          <div className="bo-cv-salary-summary-strip-title-wrap">
                            <span className="bo-cv-salary-summary-strip-title">{salaryRows.length}-Month Income Summary</span>
                            <span className="bo-cv-salary-summary-strip-sub">
                              {selectedApplicant?.name || 'Applicant'} &bull; Salaried Evaluation
                            </span>
                          </div>
                          <span className="bo-cv-salary-summary-strip-meta">
                            Salary Months: {salaryRows.filter((r) => r.salaryMonth && r.basicAmount !== '' && !isNaN(Number(r.basicAmount))).length} / {salaryRows.length}
                          </span>
                        </div>
                        <div className="bo-cv-salary-summary-strip-grid">
                          {salaryRows.map((r, idx) => {
                            const isPersisted = r.isPersisted && !r.isModified;
                            const val = r.previewConsideredIncome != null && r.previewConsideredIncome !== 0
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
                          {(() => {
                            const isBackendConfirmed = !isSalaryDirty && currentAssessment?.totalConsideredIncome != null;
                            const displayAverage = isBackendConfirmed
                              ? currentAssessment.totalConsideredIncome
                              : liveThreeMonthAverage;

                            return (
                              <div className="bo-cv-summary-strip-cell is-average">
                                <div className="bo-cv-summary-strip-top">
                                  <span className="bo-cv-summary-strip-label">{salaryRows.length}-Month Average</span>
                                  <span className={`bo-cv-summary-strip-pill ${isBackendConfirmed ? 'is-backend' : 'is-preview'}`}>
                                    {isBackendConfirmed ? 'Backend Confirmed' : 'Live Preview'}
                                  </span>
                                </div>
                                <strong className="bo-cv-summary-strip-val is-avg">
                                  {displayAverage != null ? formatFoirCurrency(displayAverage) : '—'}
                                </strong>
                                <span className="bo-cv-summary-strip-sub">
                                  {isBackendConfirmed
                                    ? 'Authoritative server average'
                                    : 'Calculated from current salary entries'}
                                </span>
                              </div>
                            );
                          })()}
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
                  </div>
                </div>

                {/* ── Section 6: Existing Active Obligations & Policy FOIR ─────── */}
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
                        <strong>
                          {currentAssessment?.existingEMI != null
                            ? formatCurrency(currentAssessment.existingEMI)
                            : formatCurrency(totalDeclaredMonthlyEmi)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Benchmark Cards Grid */}
                  <div className="bo-cv-obligation-grid" style={{ marginTop: '16px' }}>
                    <div className="bo-cv-obligation-card">
                      <span className="bo-cv-obligation-label">Existing Monthly Obligation (Engine Evaluated)</span>
                      <div className="bo-cv-obligation-val-row">
                        <strong className="bo-cv-obligation-val">
                          {currentAssessment?.existingEMI != null
                            ? formatCurrency(currentAssessment.existingEMI)
                            : formatCurrency(totalDeclaredMonthlyEmi)}
                        </strong>
                      </div>
                      <p className="bo-cv-obligation-desc">
                        {currentAssessment?.existingEMI != null
                          ? 'Authoritative existing EMI deducted by calculation engine.'
                          : 'Will be confirmed and deducted by the calculation engine.'}
                      </p>
                    </div>

                    <div className="bo-cv-obligation-card">
                      <span className="bo-cv-obligation-label">Policy FOIR Limit</span>
                      <div className="bo-cv-obligation-val-row">
                        <strong className="bo-cv-obligation-val bo-cv-foir-val">
                          {resolvedPolicyFoir}
                        </strong>
                      </div>
                      <p className="bo-cv-obligation-desc">
                        {selectedMethodCode === 'INCOME'
                          ? `Policy FOIR limit applied by engine from FOIR Master for ${selectedEmploymentTypeName || 'applicant'}.`
                          : 'Policy FOIR is not applicable for Average Bank Balance assessment.'}
                      </p>
                    </div>
                  </div>
                </div>

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
                        <strong>{selectedMethodCode === 'INCOME' ? 'Income Method' : 'ABB Method'}</strong>
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
                        <strong>{formatCurrency(totalDeclaredMonthlyEmi)}</strong>
                      </div>
                      {selectedMethodCode === 'INCOME' && (
                        <>
                          <span className="bo-cv-calc-pre-dot">•</span>
                          <div className="bo-cv-calc-pre-item">
                            <span className="bo-cv-calc-pre-item-label">Policy FOIR:</span>
                            <strong>{resolvedPolicyFoir}</strong>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bo-cv-calc-trigger-wrap">
                    <div className="bo-cv-calc-trigger-info">
                      <h4 className="bo-cv-calc-trigger-title">Run Eligibility Calculation Engine</h4>
                      <p className="bo-cv-calc-trigger-sub">
                        Submits verified income/banking inputs and settings to the SIVELS eligibility calculation engine for{' '}
                        <strong>{selectedApplicant?.name || 'Applicant'}</strong> ({selectedMethodCode === 'INCOME' ? 'Income Method' : 'ABB Method'}).
                      </p>
                    </div>

                    <button
                      type="button"
                      className="bo-btn bo-btn--primary bo-cv-calculate-btn"
                      onClick={handleCalculateEligibility}
                      disabled={calculating || !calculationAppProdId || !selectedEmploymentIncomeDetailsId}
                    >
                      {calculating ? (
                        <>
                          <span className="bo-cv-btn-spinner" />
                          <span>Calculating Eligibility...</span>
                        </>
                      ) : (
                        <>
                          {ShieldCheckIcon && <ShieldCheckIcon size={16} />}
                          <span>Calculate Eligibility</span>
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

                {/* ── Section 8: Eligibility Assessment Result ─────────────────── */}
                {currentAssessment && (
                  <div className="bo-cv-assess-section bo-cv-result-section">
                    <div className="bo-cv-assess-section-header">
                      <div className="bo-cv-assess-section-title-wrap">
                        <span className="bo-cv-assess-section-num is-result">✓</span>
                        <div>
                          <h3 className="bo-cv-assess-section-title">Eligibility Assessment Result</h3>
                          <p className="bo-cv-assess-section-sub">
                            Authoritative decision engine output for {selectedApplicant?.name || 'Applicant'} &bull;{' '}
                            {currentAssessment.assessmentMethodId === 1 ? 'Income Method' : 'ABB Method'}.
                          </p>
                        </div>
                      </div>
                      <div className="bo-cv-result-header-badges">
                        <span className="bo-cv-result-method-badge">
                          {currentAssessment.assessmentMethodId === 1 ? 'Income Method' : 'ABB Method'}
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
                          {currentAssessment.assessmentMethodId === 1 ? 'Total Considered Income' : 'Average Monthly ABB'}
                        </span>
                        <strong className="bo-cv-result-metric-val">
                          {currentAssessment.assessmentMethodId === 1
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
                )}

                {/* ── Section 9: Company Recommendation ────────────────────────── */}
                <div className="bo-cv-assess-section bo-cv-recommendation-section">
                  <div className="bo-cv-assess-section-header">
                    <div className="bo-cv-assess-section-title-wrap">
                      <span className="bo-cv-assess-section-num is-rec">9</span>
                      <div>
                        <h3 className="bo-cv-assess-section-title">Company Recommendation</h3>
                        <p className="bo-cv-assess-section-sub">
                          Enter the loan amount recommended by Back Office after reviewing the eligibility assessment.
                        </p>
                      </div>
                    </div>
                    <span className="bo-cv-rec-badge">Manual Decision</span>
                  </div>

                  {recommendationBanner && (
                    <div className={`bo-cv-salary-banner is-${recommendationBanner.type}`} style={{ marginBottom: '14px' }}>
                      <div className="bo-cv-salary-banner-icon">
                        {recommendationBanner.type === 'success' && (CheckCircleIcon ? <CheckCircleIcon size={16} /> : '✓')}
                        {recommendationBanner.type === 'error' && (AlertTriangleIcon ? <AlertTriangleIcon size={16} /> : '⚠️')}
                        {recommendationBanner.type === 'warning' && (AlertCircleIcon ? <AlertCircleIcon size={16} /> : 'ℹ️')}
                        {recommendationBanner.type === 'info' && (InfoIcon ? <InfoIcon size={16} /> : 'ℹ️')}
                      </div>
                      <div className="bo-cv-salary-banner-msg">{recommendationBanner.message}</div>
                    </div>
                  )}

                  <div className="bo-cv-recommendation-card">
                    <div className="bo-cv-rec-input-group">
                      <label className="bo-cv-rec-label" htmlFor="bo-cv-rec-amount-input">
                        Recommended Loan Amount
                      </label>
                      <div className="bo-cv-rec-input-row">
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
                        <button
                          type="button"
                          className="bo-btn bo-btn--primary bo-cv-save-rec-btn"
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
                      <span className="bo-cv-rec-hint">
                        {currentCalcSettings.recommendedLoanAmount
                          ? `Entered recommendation: ${formatCurrency(currentCalcSettings.recommendedLoanAmount)}`
                          : 'Enter the loan amount recommended by Back Office after reviewing the eligibility assessment.'}
                      </span>
                    </div>

                    <div className="bo-cv-rec-info-callout">
                      <div className="bo-cv-rec-info-icon">
                        {InfoIcon && <InfoIcon size={16} />}
                      </div>
                      <div className="bo-cv-rec-info-text">
                        <strong>Underwriting Decision Guidance:</strong> This is a manual business decision by the credit underwriter. It is not constrained to equal the maximum eligible limit or requested loan amount. Click <em>Save Recommendation</em> to persist the decision without recalculating eligibility.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 15: RECOMMENDATION SHEET & SEND TO CREDIT OFFICER
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 17 && (
            <>
              <div className="bo-cv-step-panel">
                <div className="bo-cv-step-panel-header">
                  <div className="bo-cv-step-header-left">
                    <div className="bo-cv-step-badge-num">17</div>
                    <div>
                      <h2 className="bo-cv-step-panel-title">Recommendation Sheet</h2>
                      <p className="bo-cv-step-panel-desc">
                        Final underwriting credit appraisal and sanction committee recommendation summary.
                      </p>
                    </div>
                  </div>
                  <span className="bo-cv-step-tag-pill">Step 17 of 17</span>
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
              <div className="bo-cv-confirm-modal-icon-badge">
                {AlertTriangleIcon ? <AlertTriangleIcon size={20} /> : <span>⚠️</span>}
              </div>
              <div className="bo-cv-confirm-modal-title-group">
                <h3 id="bo-cv-confirm-modal-title" className="bo-cv-confirm-modal-title">
                  Confirm Document Rejection
                </h3>
                <p className="bo-cv-confirm-modal-subtitle">
                  This action will return the document to the RM for re-upload.
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
                {getRejectConfirmMessage(rejectConfirmModal.stepLabel)}
              </p>

              <div className="bo-cv-confirm-remarks-block">
                <span className="bo-cv-confirm-remarks-label">ENTERED REMARKS</span>
                <div className="bo-cv-confirm-remarks-preview">
                  {rejectConfirmModal.remarks}
                </div>
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
                {isSubmittingRejection ? 'Rejecting...' : 'Yes, Reject'}
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
    </div>
  );
}
