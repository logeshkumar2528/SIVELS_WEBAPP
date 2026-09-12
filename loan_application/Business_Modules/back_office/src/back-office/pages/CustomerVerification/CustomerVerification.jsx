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
  const [docTypeMasterMap, setDocTypeMasterMap] = useState({});
  const [allCustomerDocs, setAllCustomerDocs] = useState([]);

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
  }, [customerId, verificationData]);

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
  }, [customerId, verificationData]);

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

  // Dynamic Co-Applicants extraction (supports 0, 1, 2, 3+ co-applicants)
  const coApplicants = useMemo(() => {
    const coPersonalList = resolvedPersonalList.slice(1);
    const coKycList = resolvedKycList.slice(1);

    const count = Math.max(
      Number(verificationData?.applicationDetails?.coApplicantCount) || 0,
      Number(verificationData?.application?.noOfCoApplicants) || 0,
      coPersonalList.length,
      coKycList.length
    );

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

  // Helper to fetch any document blob by server path (used for Co-Applicant Old vs New comparison)
  const fetchKycDocByPath = useCallback(async (rawPath, defaultName) => {
    if (!rawPath || typeof rawPath !== 'string' || !rawPath.trim()) {
      return { loading: false, url: null, error: null, fileName: defaultName || '' };
    }
    try {
      let cleanPath = rawPath.trim().replace(/\\/g, '/').replace(/^\/+/, '');
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
  }, []);

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

  // 5b. Document Rejection & Returned Application Workflow States
  const [applicationRejections, setApplicationRejections] = useState([]);
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);
  const [isVerifyingRejection, setIsVerifyingRejection] = useState(false);

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
  const ExternalLinkIcon = iconMap['ExternalLink'];

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

    if (stepNum === 5) {
      // Step 05: ZIP Archive / Manual Documents
      if (/\.(zip|rar|7z|tar|gz)$/i.test(fileName)) return true;
      if (typeName.includes('zip') || typeName.includes('archive') || typeName.includes('manual')) return true;
      return false;
    }

    return false;
  }, []);

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
    5: 'ZIP',
    6: 'PROPERTY_FI',
    7: 'OFFICE_FI',
    8: 'RESIDENCE_FI',
    9: 'LEGAL_OPINION',
    10: 'TECHNICAL_VALUE',
    11: 'CIBIL',
    12: 'PD_VERIFICATION',
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
    }
  }, []);

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

    // ── STEP 5: ZIP ARCHIVE ────────────────────────────────────────
    if (activeStep === 5 && !docPreviews.zip) {
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

  // Reject / Send to RM Handler for Steps 2, 3, 4, 5
  const handleRejectOrSendToRm = async (stepNum, stepLabel, customKycId = null, isCoApplicant = false) => {
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
    const kycId = isCoApplicant ? (customKycId || null) : (applicantKycId || customKycId || null);
    const baseType = STEP_DOC_TYPE_MAP[stepNum] || stepLabel.toUpperCase().replace(/\s+/g, '_');
    const docType = isCoApplicant ? `CO_APPLICANT_${baseType}` : `APPLICANT_${baseType}`;

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
        kycDocumentId: kycId ? Number(kycId) : null,
        fieldVerificationId: null,
        rejectedDocumentType: docType,
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
      await fetchApplicationRejections();
      await fetchAllCustomerDocs();
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
  const handleOpenRejectConfirm = (stepNum, stepLabel, customKycId = null, isCoApplicant = false) => {
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
      remarks: '',
    });
  };

  // Confirm and Execute Document Rejection
  const handleConfirmReject = async () => {
    const { stepNum, stepLabel, customKycId, isCoApplicant } = rejectConfirmModal;
    setRejectConfirmModal({
      open: false,
      stepNum: null,
      stepLabel: '',
      customKycId: null,
      isCoApplicant: false,
      remarks: '',
    });
    await handleRejectOrSendToRm(stepNum, stepLabel, customKycId, isCoApplicant);
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

      // 3. Reset document previews for this step so fresh verified document loads
      handleRefreshDocumentPreview(stepNum);

      // 4. Force refresh Step 01 View Form
      setViewFormRefreshKey((prev) => prev + 1);

      // 5. Force refresh workspace data
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
                <ApplicationDraftProvider key={`app-draft-provider-${viewFormRefreshKey}`}>
                  <PdfView key={`pdf-view-${viewFormRefreshKey}`} />
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
                    <h2 className="bo-cv-step-panel-title">Customer Profile Images</h2>
                    <p className="bo-cv-step-panel-desc">
                      Inspect authentic photographs uploaded during customer onboarding for Applicant and Co-Applicant(s).
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 02 of 15</span>
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

                {/* Remarks & Reject / Send to RM */}
                <div className="verification-action-bar">
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
                      <span>{isSubmittingRejection ? 'Submitting...' : (coApplicants.length > 0 ? 'Reject Applicant Profile' : 'Reject / Send to RM')}</span>
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
                        <span>{isSubmittingRejection ? 'Submitting...' : `Reject Co-App ${co.number} Profile`}</span>
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
            <div className="bo-cv-step-panel">
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
                <span className="bo-cv-step-tag-pill">Step 03 of 15</span>
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
                      <span>{isSubmittingRejection ? 'Submitting...' : (coApplicants.length > 0 ? 'Reject Applicant Aadhaar' : 'Reject / Send to RM')}</span>
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
                        <span>{isSubmittingRejection ? 'Submitting...' : `Reject Co-App ${co.number} Aadhaar`}</span>
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
            <div className="bo-cv-step-panel">
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
                <span className="bo-cv-step-tag-pill">Step 04 of 15</span>
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
                      <span>{isSubmittingRejection ? 'Submitting...' : (coApplicants.length > 0 ? 'Reject Applicant PAN' : 'Reject / Send to RM')}</span>
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
                        <span>{isSubmittingRejection ? 'Submitting...' : `Reject Co-App ${co.number} PAN`}</span>
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
              STEP 05: ZIP FILE / MANUAL DOCUMENTS
          ══════════════════════════════════════════════════════════════════ */}
          {activeStep === 5 && (
            <div className="bo-cv-step-panel">
              <div className="bo-cv-step-panel-header">
                <div className="bo-cv-step-header-left">
                  <div className="bo-cv-step-badge-num">05</div>
                  <div>
                    <h2 className="bo-cv-step-panel-title">Customer ZIP & Manual Documents</h2>
                    <p className="bo-cv-step-panel-desc">
                      Download or inspect bundled documentation archives and manual files for Applicant and Co-Applicant(s).
                    </p>
                  </div>
                </div>
                <span className="bo-cv-step-tag-pill">Step 05 of 15</span>
              </div>

              <div className="bo-cv-doc-display-container">
                {/* Active Rejection Banner if any */}
                {(() => {
                  const rej = getActiveRejectionForStep(5);
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

                {/* 1. Applicant Manual / ZIP Documents */}
                <div className="bo-cv-person-doc-card">
                  <div className="bo-cv-person-doc-header">
                    <div className="bo-cv-person-doc-badge">Applicant</div>
                    <div className="bo-cv-person-doc-title">{verificationData.customerName}</div>
                  </div>

                  {applicantManualDocs.length > 0 ? (
                    <div className="bo-cv-manual-docs-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
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

                {/* 2. Co-Applicant Manual / ZIP Documents (Dynamic) */}
                {coApplicants.map((co) => {
                  const coDocs = coApplicantsManualDocs[co.index] || [];
                  return (
                    <div className="bo-cv-person-doc-card" key={`co-manual-card-${co.index}`}>
                      <div className="bo-cv-person-doc-header">
                        <div className="bo-cv-person-doc-badge co-app">Co-Applicant {co.number}</div>
                        <div className="bo-cv-person-doc-title">{co.name}</div>
                      </div>

                      {coDocs.length > 0 ? (
                        <div className="bo-cv-manual-docs-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
                          {coDocs.map((doc, idx) => (
                            <div className="bo-cv-file-card" key={doc.id || `co-${co.number}-doc-${idx}`}>
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
                          <p>No compressed document bundle was uploaded for Co-Applicant {co.number} ({co.name}).</p>
                        </div>
                      )}
                    </div>
                  );
                })}

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

                  <div className="verification-buttons-row">
                    {/* Verify Resubmitted Applicant ZIP */}
                    {(() => {
                      const appRej = getActiveRejectionForApplicant(5);
                      if (appRej && appRej.status === 'Resubmitted') {
                        return (
                          <button
                            type="button"
                            className="verify-resubmit-btn"
                            disabled={isVerifyingRejection}
                            onClick={() => handleVerifyRejection(appRej.backOfficeDocumentRejectionId, 'Applicant ZIP File', 5)}
                          >
                            <span>{isVerifyingRejection ? 'Verifying...' : '✓ Verify Applicant ZIP'}</span>
                          </button>
                        );
                      }
                      return null;
                    })()}

                    {/* Verify Resubmitted Co-Applicant ZIP */}
                    {coApplicants.map((co) => {
                      const coRej = getActiveRejectionForCoApplicant(co.kycDocumentId, 5);
                      if (coRej && coRej.status === 'Resubmitted') {
                        return (
                          <button
                            key={`verify-co-zip-${co.index}`}
                            type="button"
                            className="verify-resubmit-btn"
                            style={{ background: '#047857' }}
                            disabled={isVerifyingRejection}
                            onClick={() => handleVerifyRejection(coRej.backOfficeDocumentRejectionId, `Co-Applicant ${co.number} ZIP File`, 5)}
                          >
                            <span>{isVerifyingRejection ? 'Verifying...' : `✓ Verify Co-App ${co.number} ZIP`}</span>
                          </button>
                        );
                      }
                      return null;
                    })}

                    <button
                      type="button"
                      className="reject-rm-btn"
                      disabled={isSubmittingRejection}
                      onClick={() => handleOpenRejectConfirm(5, 'Applicant ZIP File', null, false)}
                    >
                      <span>{isSubmittingRejection ? 'Submitting...' : (coApplicants.length > 0 ? 'Reject Applicant ZIP' : 'Reject / Send to RM')}</span>
                    </button>

                    {coApplicants.map((co) => (
                      <button
                        key={`reject-co-zip-${co.index}`}
                        type="button"
                        className="reject-rm-btn"
                        style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}
                        disabled={isSubmittingRejection}
                        onClick={() => handleOpenRejectConfirm(5, `Co-Applicant ${co.number} ZIP File`, co.kycDocumentId, true)}
                      >
                        <span>{isSubmittingRejection ? 'Submitting...' : `Reject Co-App ${co.number} ZIP`}</span>
                      </button>
                    ))}
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

          {/* ══════════════════════════════════════════════════════════════════
              FINAL REMARKS & SEND TO CREDIT OFFICER
          ══════════════════════════════════════════════════════════════════ */}
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
    </div>
  );
}
