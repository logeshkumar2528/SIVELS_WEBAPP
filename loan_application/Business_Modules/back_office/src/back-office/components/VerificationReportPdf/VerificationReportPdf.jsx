/**
 * VerificationReportPdf.jsx
 * --------------------
 * Dedicated Back Office Verification & Underwriting Report PDF generator & viewer.
 *
 * Covers:
 * - Application & Applicant Metadata
 * - Steps 02–07: Document Verification Matrix (Profile, Aadhaar, PAN, Salary Slip, Bank Statement, ZIP)
 * - Steps 08–10: Field Investigation (Property FI, Office FI, Residence FI)
 * - Step 11: Legal Opinion (BackOfficeApplicationDocuments: LEGAL_OPINION)
 * - Step 12: Technical Valuation (BackOfficeApplicationDocuments: TECHNICAL_VALUATION)
 * - Step 13: Credit Bureau & CIBIL Assessment (PAN verification, CIR score, active debt obligations, remarks)
 * - Back Office Underwriting Sign-Off Block
 *
 * PDF Engine: html2canvas + jsPDF (Continuous A4-width canvas layout)
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import backOfficeService from '../../api/backOfficeService';
import { mapApplicationFullDetails } from '../../mappers/verificationMapper';
import iconMap from '../../config/iconMap';
import './VerificationReportPdf.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount) || amount === 0) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(dateStr).slice(0, 10);
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateStr);
  }
}

export default function VerificationReportPdf({
  customerId: propCustomerId,
  showActions = true,
  onClose = null,
}) {
  const params = useParams();
  const targetCustomerId = propCustomerId || params.customerId;
  const reportRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Core Data States
  const [verificationData, setVerificationData] = useState(null);
  const [stepVerifications, setStepVerifications] = useState({});
  const [applicationDocuments, setApplicationDocuments] = useState([]);
  const [kycRecords, setKycRecords] = useState([]);
  const [personalRecords, setPersonalRecords] = useState([]);
  const [rejectionsList, setRejectionsList] = useState([]);
  const [assessmentRecords, setAssessmentRecords] = useState([]);
  const [pdfError, setPdfError] = useState('');

  const DownloadIcon = iconMap['Download'];
  const RefreshCwIcon = iconMap['RefreshCw'];
  const FileTextIcon = iconMap['FileText'];
  const XIcon = iconMap['X'];

  // 1. Fetch live application data and verification records
  const loadReportData = useCallback(async () => {
    if (!targetCustomerId) return;
    setLoading(true);
    setError(null);

    try {
      let fullPayload = null;
      let extraDocs = [];

      try {
        fullPayload = await backOfficeService.getApplicationFullDetails(targetCustomerId);
      } catch (e) {
        console.warn('FullDetails fallback in VerificationReportPdf:', e?.message);
      }

      try {
        const docRes = await backOfficeService.getCustomerDocuments(targetCustomerId);
        if (docRes) {
          extraDocs = Array.isArray(docRes) ? docRes : (docRes?.data || docRes?.value || [docRes]);
        }
      } catch {}

      if (!fullPayload) {
        const custRecord = await backOfficeService.getCustomerById(targetCustomerId);
        if (custRecord) {
          const cust = Array.isArray(custRecord) ? custRecord[0] : custRecord;
          fullPayload = { customer: cust };
        }
      }

      if (!fullPayload) {
        throw new Error(`No application record found for Customer ID: ${targetCustomerId}`);
      }

      const mapped = mapApplicationFullDetails(fullPayload, extraDocs);
      setVerificationData(mapped);

      const appProdId = Number(
        mapped?.applicationProductDetailsId ||
        mapped?.application?.applicationProductDetailsId ||
        mapped?.application?.ApplicationProductDetailsId ||
        mapped?.raw?.productDetails?.[0]?.applicationProductDetailsId ||
        mapped?.raw?.productDetails?.applicationProductDetailsId ||
        mapped?.raw?.productDetailsList?.[0]?.applicationProductDetailsId ||
        mapped?.raw?.applicationProductDetails?.applicationProductDetailsId ||
        0
      );

      // Supplementary parallel fetches
      const token = localStorage.getItem('authToken');
      const authHeaders = {};
      if (token) authHeaders['Authorization'] = `Bearer ${token}`;

      const [stepVerifRes, appDocsRes, rejectionsRes, assessmentsRes, kycListRes, persListRes] = await Promise.allSettled([
        appProdId > 0 ? backOfficeService.getStepVerificationsByApplication(appProdId) : Promise.resolve([]),
        appProdId > 0 ? backOfficeService.getApplicationDocuments(appProdId) : Promise.resolve([]),
        appProdId > 0 ? backOfficeService.getDocumentRejectionsByApplication(appProdId) : Promise.resolve([]),
        appProdId > 0 ? backOfficeService.getAssessmentsByApplication(appProdId) : Promise.resolve([]),
        fetch(`${API_BASE}/ApplicationKYCDocuments`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_BASE}/ApplicationPersonalInformation`, { headers: authHeaders }).then((r) => (r.ok ? r.json() : [])),
      ]);

      // Map step verifications (Primary Applicant: applicantSequence === 0)
      if (stepVerifRes.status === 'fulfilled' && stepVerifRes.value) {
        const list = Array.isArray(stepVerifRes.value) ? stepVerifRes.value : (stepVerifRes.value?.value || stepVerifRes.value?.data || []);
        const map = {};
        list.forEach((item) => {
          if (item && item.stepCode && item.isActive !== false) {
            const seq = item.applicantSequence !== undefined && item.applicantSequence !== null ? Number(item.applicantSequence) : 0;
            if (seq === 0) {
              map[item.stepCode] = item;
            }
          }
        });
        setStepVerifications(map);
      }

      // Map application documents (Legal Opinion, Technical Valuation, Manual CIBIL PAN)
      if (appDocsRes.status === 'fulfilled' && appDocsRes.value) {
        const list = Array.isArray(appDocsRes.value) ? appDocsRes.value : (appDocsRes.value?.value || appDocsRes.value?.data || []);
        setApplicationDocuments(list.filter((d) => d && d.isActive !== false));
      }

      // Map rejections
      if (rejectionsRes.status === 'fulfilled' && rejectionsRes.value) {
        const list = Array.isArray(rejectionsRes.value) ? rejectionsRes.value : (rejectionsRes.value?.value || rejectionsRes.value?.data || []);
        setRejectionsList(list.filter((r) => r && r.isActive !== false));
      }

      // Map assessments
      if (assessmentsRes.status === 'fulfilled' && assessmentsRes.value) {
        const list = Array.isArray(assessmentsRes.value) ? assessmentsRes.value : (assessmentsRes.value?.value || assessmentsRes.value?.data || []);
        setAssessmentRecords(list.filter((a) => a && a.isActive !== false));
      }

      // KYC list filtered
      if (kycListRes.status === 'fulfilled' && kycListRes.value) {
        const raw = kycListRes.value;
        const list = Array.isArray(raw) ? raw : (raw?.value || raw?.data || []);
        const filtered = list.filter((k) => String(k.agentCustomerId ?? k.AgentCustomerId) === String(targetCustomerId));
        setKycRecords(filtered);
      }

      // Personal list filtered
      if (persListRes.status === 'fulfilled' && persListRes.value) {
        const raw = persListRes.value;
        const list = Array.isArray(raw) ? raw : (raw?.value || raw?.data || []);
        const filtered = list.filter((p) => String(p.agentCustomerId ?? p.AgentCustomerId) === String(targetCustomerId));
        setPersonalRecords(filtered);
      }
    } catch (err) {
      console.error('Failed to load Back Office verification report data:', err);
      setError(err?.message || 'Failed to load verification report data.');
    } finally {
      setLoading(false);
    }
  }, [targetCustomerId]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Derived Underwriting Entities
  const legalOpinionDoc = useMemo(() => {
    return applicationDocuments.find((d) => d.documentType === 'LEGAL_OPINION') || null;
  }, [applicationDocuments]);

  const technicalValuationDoc = useMemo(() => {
    return applicationDocuments.find((d) => d.documentType === 'TECHNICAL_VALUATION') || null;
  }, [applicationDocuments]);

  const manualCibilPanDoc = useMemo(() => {
    return applicationDocuments.find((d) => d.documentType === 'MANUAL_CIBIL_PAN' || d.documentType === 'CIBIL_REPORT') || null;
  }, [applicationDocuments]);

  // Co-Applicants Resolver
  const coApplicantsList = useMemo(() => {
    const count = parseInt(verificationData?.applicationDetails?.coApplicantCount || 0, 10);
    if (!count || count <= 0) return [];

    const coPers = personalRecords.slice(1);
    const coKyc = kycRecords.slice(1);

    const result = [];
    for (let i = 0; i < count; i++) {
      const p = coPers[i] || {};
      const k = coKyc[i] || {};
      const name = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') || p.fullName || `Co-Applicant ${i + 1}`;
      result.push({
        index: i + 1,
        name,
        pan: k.panCardNo || p.panCardNo || '—',
        aadhaarDisplay: k.aadhaarLastFourDigits ? `XXXX-XXXX-${k.aadhaarLastFourDigits}` : (p.aadhaarNumber || '—'),
      });
    }
    return result;
  }, [verificationData, personalRecords, kycRecords]);

  // Document Verification 6/6 Counter
  const verifiedDocCodes = ['PROFILE_IMAGE', 'AADHAAR', 'PAN', 'SALARY_SLIP', 'BANK_STATEMENT', 'ZIP_ARCHIVE'];
  const verifiedCount = useMemo(() => {
    return verifiedDocCodes.filter((code) => stepVerifications[code]?.isVerified === true).length;
  }, [stepVerifications]);

  // Continuous Single-Page High-Quality PDF Download Handler
  const handleDownloadPdf = async () => {
    if (!reportRef.current || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setPdfError('');

    try {
      const element = reportRef.current;

      // Ensure images are fully loaded
      const imgElements = element.querySelectorAll('img');
      await Promise.all(
        Array.from(imgElements).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      const fullHeight = element.scrollHeight || element.offsetHeight || 2800;
      const fullWidth = element.scrollWidth || element.offsetWidth || 860;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: fullWidth,
        height: fullHeight,
        windowWidth: fullWidth,
        windowHeight: fullHeight,
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdfWidth = 210; // A4 mm
      const pdfHeight = (fullHeight * pdfWidth) / fullWidth;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
        compress: true,
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      const appRef = verificationData?.applicationDetails?.applicationNo || `APP-${targetCustomerId}`;
      pdf.save(`BackOffice_Verification_Report_${appRef}.pdf`);
    } catch (err) {
      console.error('Error generating Verification Report PDF:', err);
      setPdfError('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="bo-report-container">
        <div className="bo-report-loading">
          <div className="bo-report-spinner" />
          <p>Compiling Back Office Verification & Underwriting Report...</p>
        </div>
      </div>
    );
  }

  if (error || !verificationData) {
    return (
      <div className="bo-report-container">
        <div className="bo-report-action-bar">
          <div className="bo-report-action-title">
            <span style={{ color: '#dc2626' }}>Error Loading Report</span>
          </div>
          {onClose && (
            <button type="button" className="bo-report-btn bo-report-btn--outline" onClick={onClose}>
              {XIcon && <XIcon size={14} />} Close
            </button>
          )}
        </div>
        <div className="bo-report-document" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <h3 style={{ color: '#dc2626', marginBottom: '8px' }}>Unable to Generate Report</h3>
          <p style={{ color: '#64748b' }}>{error || 'Application verification records could not be retrieved.'}</p>
          <button
            type="button"
            className="bo-report-btn bo-report-btn--primary"
            onClick={loadReportData}
            style={{ marginTop: '1.25rem' }}
          >
            {RefreshCwIcon && <RefreshCwIcon size={14} />} Retry
          </button>
        </div>
      </div>
    );
  }

  const appDetails = verificationData.applicationDetails || {};
  const persInfo = verificationData.personalInformation || {};
  const addrInfo = verificationData.addressDetails || {};
  const empInfo = verificationData.employmentIncome || {};

  return (
    <div className="bo-report-container">
      {/* ── Top Action Bar (View / Download Controls) ── */}
      {showActions && (
        <div className="bo-report-action-bar">
          <div className="bo-report-action-title">
            {FileTextIcon && <FileTextIcon size={18} style={{ color: '#00593b' }} />}
            <span>Back Office Verification Report — {appDetails.applicationNo || `APP-${targetCustomerId}`}</span>
          </div>
          <div className="bo-report-action-buttons">
            <button
              type="button"
              className="bo-report-btn bo-report-btn--primary"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
            >
              {DownloadIcon && <DownloadIcon size={14} />}
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>
            {onClose && (
              <button type="button" className="bo-report-btn bo-report-btn--outline" onClick={onClose}>
                {XIcon && <XIcon size={14} />}
                <span>Close</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── PDF Generation Error Banner ── */}
      {pdfError && (
        <div
          style={{
            width: '100%',
            maxWidth: '860px',
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#b91c1c',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{pdfError}</span>
          <button
            type="button"
            onClick={() => setPdfError('')}
            style={{
              background: 'none',
              border: 'none',
              color: '#b91c1c',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Printable Continuous Document Canvas ── */}
      <div className="bo-report-document" ref={reportRef}>
        {/* Header */}
        <header className="bo-report-header">
          <div className="bo-report-brand">
            <h1 className="bo-report-brand-title">SIVELS FINANCE</h1>
            <span className="bo-report-brand-sub">BACK OFFICE VERIFICATION & UNDERWRITING REPORT</span>
          </div>
          <div className="bo-report-header-meta">
            <div className="bo-report-meta-ref">{appDetails.applicationNo || `APP-${targetCustomerId}`}</div>
            <div>Generated: {formatDateTime(new Date())}</div>
            <div className="bo-report-meta-badge">
              {verifiedCount === 6 ? '✓ 6/6 DOCUMENTS VERIFIED' : `${verifiedCount}/6 DOCUMENTS VERIFIED`}
            </div>
          </div>
        </header>

        {/* Section 1: Application & Applicant Summary */}
        <section className="bo-report-section">
          <h2 className="bo-report-section-title">
            <span className="bo-report-section-num">01</span>
            <span>Application & Borrower Snapshot</span>
          </h2>
          <div className="bo-report-grid-3">
            <div className="bo-report-cell">
              <span className="bo-report-cell-label">Applicant Name</span>
              <span className="bo-report-cell-value bo-report-cell-value--highlight">
                {verificationData.customerName || persInfo.fullName || '—'}
              </span>
            </div>
            <div className="bo-report-cell">
              <span className="bo-report-cell-label">Contact Mobile</span>
              <span className="bo-report-cell-value">{verificationData.mobile || persInfo.mobile || '—'}</span>
            </div>
            <div className="bo-report-cell">
              <span className="bo-report-cell-label">Email Address</span>
              <span className="bo-report-cell-value">{verificationData.email || persInfo.email || '—'}</span>
            </div>
            <div className="bo-report-cell">
              <span className="bo-report-cell-label">Permanent Account Number (PAN)</span>
              <span className="bo-report-cell-value">{persInfo.panNumber || verificationData.panCardNo || '—'}</span>
            </div>
            <div className="bo-report-cell">
              <span className="bo-report-cell-label">Aadhaar (Masked)</span>
              <span className="bo-report-cell-value">{persInfo.aadhaarDisplay || '—'}</span>
            </div>
            <div className="bo-report-cell">
              <span className="bo-report-cell-label">Residential District</span>
              <span className="bo-report-cell-value">{verificationData.districtName || addrInfo.district || '—'}</span>
            </div>
            <div className="bo-report-cell">
              <span className="bo-report-cell-label">Loan Product</span>
              <span className="bo-report-cell-value">{appDetails.loanProduct || 'Personal Loan'}</span>
            </div>
            <div className="bo-report-cell">
              <span className="bo-report-cell-label">Requested Loan Amount</span>
              <span className="bo-report-cell-value bo-report-cell-value--highlight">
                {formatCurrency(appDetails.loanAmount)}
              </span>
            </div>
            <div className="bo-report-cell">
              <span className="bo-report-cell-label">Tenure & ROI</span>
              <span className="bo-report-cell-value">{appDetails.loanTenure || '24 Months'} @ {appDetails.roi || '12%'}</span>
            </div>
            <div className="bo-report-cell">
              <span className="bo-report-cell-label">Sourcing Relationship Manager</span>
              <span className="bo-report-cell-value">{verificationData.rmName || '—'}</span>
            </div>
            <div className="bo-report-cell">
              <span className="bo-report-cell-label">Sourcing Field Agent</span>
              <span className="bo-report-cell-value">{verificationData.agentName || '—'}</span>
            </div>
            <div className="bo-report-cell">
              <span className="bo-report-cell-label">Applied Date</span>
              <span className="bo-report-cell-value">{formatDate(appDetails.appliedDate || verificationData.appliedDate)}</span>
            </div>
          </div>
        </section>

        {/* Section 2: Steps 02–07 Document Verification */}
        <section className="bo-report-section">
          <h2 className="bo-report-section-title">
            <span className="bo-report-section-num">02–07</span>
            <span>Document Verification Underwriting Matrix</span>
          </h2>
          <table className="bo-report-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Step / Document</th>
                <th style={{ width: '18%' }}>Applicant Type</th>
                <th style={{ width: '18%' }}>Verification Status</th>
                <th style={{ width: '20%' }}>Verified By / Date</th>
                <th style={{ width: '22%' }}>Operator Remarks</th>
              </tr>
            </thead>
            <tbody>
              {/* Step 02: Profile Image */}
              <tr>
                <td>
                  <strong>02. Profile Image</strong>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Applicant Photo</div>
                </td>
                <td>Primary Applicant</td>
                <td>
                  <span className={`bo-report-pill ${stepVerifications['PROFILE_IMAGE']?.isVerified ? 'bo-report-pill--verified' : 'bo-report-pill--pending'}`}>
                    {stepVerifications['PROFILE_IMAGE']?.isVerified ? '✓ Verified' : 'Pending Verification'}
                  </span>
                </td>
                <td>
                  {stepVerifications['PROFILE_IMAGE']?.verifiedByBackOfficeId ? `Operator #${stepVerifications['PROFILE_IMAGE'].verifiedByBackOfficeId}` : 'Back Office'}
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{formatDateTime(stepVerifications['PROFILE_IMAGE']?.verifiedAt)}</div>
                </td>
                <td>{stepVerifications['PROFILE_IMAGE']?.remarks || 'Photographic identity confirmed.'}</td>
              </tr>

              {/* Step 03: Aadhaar Card */}
              <tr>
                <td>
                  <strong>03. Aadhaar Card</strong>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Identity & Address</div>
                </td>
                <td>Primary Applicant</td>
                <td>
                  <span className={`bo-report-pill ${stepVerifications['AADHAAR']?.isVerified ? 'bo-report-pill--verified' : 'bo-report-pill--pending'}`}>
                    {stepVerifications['AADHAAR']?.isVerified ? '✓ Verified' : 'Pending Verification'}
                  </span>
                </td>
                <td>
                  {stepVerifications['AADHAAR']?.verifiedByBackOfficeId ? `Operator #${stepVerifications['AADHAAR'].verifiedByBackOfficeId}` : 'Back Office'}
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{formatDateTime(stepVerifications['AADHAAR']?.verifiedAt)}</div>
                </td>
                <td>{stepVerifications['AADHAAR']?.remarks || 'Aadhaar identity and residential vintage verified.'}</td>
              </tr>

              {/* Step 04: PAN Card */}
              <tr>
                <td>
                  <strong>04. PAN Card</strong>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Tax Identification</div>
                </td>
                <td>Primary Applicant</td>
                <td>
                  <span className={`bo-report-pill ${stepVerifications['PAN']?.isVerified ? 'bo-report-pill--verified' : 'bo-report-pill--pending'}`}>
                    {stepVerifications['PAN']?.isVerified ? '✓ Verified' : 'Pending Verification'}
                  </span>
                </td>
                <td>
                  {stepVerifications['PAN']?.verifiedByBackOfficeId ? `Operator #${stepVerifications['PAN'].verifiedByBackOfficeId}` : 'Back Office'}
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{formatDateTime(stepVerifications['PAN']?.verifiedAt)}</div>
                </td>
                <td>{stepVerifications['PAN']?.remarks || 'PAN card authenticated against applicant identity.'}</td>
              </tr>

              {/* Step 05: Salary Slip */}
              <tr>
                <td>
                  <strong>05. Salary Slip</strong>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Income & Payslips</div>
                </td>
                <td>Primary Applicant</td>
                <td>
                  <span className={`bo-report-pill ${stepVerifications['SALARY_SLIP']?.isVerified ? 'bo-report-pill--verified' : 'bo-report-pill--pending'}`}>
                    {stepVerifications['SALARY_SLIP']?.isVerified ? '✓ Verified' : 'Pending Verification'}
                  </span>
                </td>
                <td>
                  {stepVerifications['SALARY_SLIP']?.verifiedByBackOfficeId ? `Operator #${stepVerifications['SALARY_SLIP'].verifiedByBackOfficeId}` : 'Back Office'}
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{formatDateTime(stepVerifications['SALARY_SLIP']?.verifiedAt)}</div>
                </td>
                <td>{stepVerifications['SALARY_SLIP']?.remarks || 'Monthly income breakdown verified.'}</td>
              </tr>

              {/* Step 06: Bank Statement */}
              <tr>
                <td>
                  <strong>06. Bank Statement</strong>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Banking Records</div>
                </td>
                <td>Primary Applicant</td>
                <td>
                  <span className={`bo-report-pill ${stepVerifications['BANK_STATEMENT']?.isVerified ? 'bo-report-pill--verified' : 'bo-report-pill--pending'}`}>
                    {stepVerifications['BANK_STATEMENT']?.isVerified ? '✓ Verified' : 'Pending Verification'}
                  </span>
                </td>
                <td>
                  {stepVerifications['BANK_STATEMENT']?.verifiedByBackOfficeId ? `Operator #${stepVerifications['BANK_STATEMENT'].verifiedByBackOfficeId}` : 'Back Office'}
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{formatDateTime(stepVerifications['BANK_STATEMENT']?.verifiedAt)}</div>
                </td>
                <td>{stepVerifications['BANK_STATEMENT']?.remarks || 'Bank account statement conduct verified.'}</td>
              </tr>

              {/* Step 07: ZIP / Archive */}
              <tr>
                <td>
                  <strong>07. ZIP / Archive</strong>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Document Package</div>
                </td>
                <td>Primary Applicant</td>
                <td>
                  <span className={`bo-report-pill ${stepVerifications['ZIP_ARCHIVE']?.isVerified ? 'bo-report-pill--verified' : 'bo-report-pill--pending'}`}>
                    {stepVerifications['ZIP_ARCHIVE']?.isVerified ? '✓ Verified' : 'Pending Verification'}
                  </span>
                </td>
                <td>
                  {stepVerifications['ZIP_ARCHIVE']?.verifiedByBackOfficeId ? `Operator #${stepVerifications['ZIP_ARCHIVE'].verifiedByBackOfficeId}` : 'Back Office'}
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{formatDateTime(stepVerifications['ZIP_ARCHIVE']?.verifiedAt)}</div>
                </td>
                <td>{stepVerifications['ZIP_ARCHIVE']?.remarks || 'Customer document archive reviewed.'}</td>
              </tr>
            </tbody>
          </table>

          {/* Co-Applicants Summary if configured */}
          {coApplicantsList.length > 0 && (
            <div style={{ marginTop: '0.85rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                CO-APPLICANTS REGISTERED ({coApplicantsList.length}):
              </div>
              <div className="bo-report-grid-2">
                {coApplicantsList.map((co) => (
                  <div key={co.index} className="bo-report-card-box">
                    <div className="bo-report-card-head">
                      <span>Co-Applicant {co.index}: {co.name}</span>
                      <span className="bo-report-pill bo-report-pill--verified">KYC Registered</span>
                    </div>
                    <div className="bo-report-grid-2" style={{ fontSize: '0.75rem' }}>
                      <div><span style={{ color: '#64748b' }}>PAN:</span> <strong>{co.pan}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Aadhaar:</span> <strong>{co.aadhaarDisplay}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Section 3: Steps 08–10 Field Investigation (Neutral representation) */}
        <section className="bo-report-section">
          <h2 className="bo-report-section-title">
            <span className="bo-report-section-num">08–10</span>
            <span>Field Investigation (FI) Status</span>
          </h2>
          <div className="bo-report-grid-3">
            <div className="bo-report-card-box">
              <div className="bo-report-card-head">
                <span>08. Property FI</span>
                <span className="bo-report-pill bo-report-pill--neutral">Pending / No result</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                Property field inspection integration pending release.
              </p>
            </div>
            <div className="bo-report-card-box">
              <div className="bo-report-card-head">
                <span>09. Office FI</span>
                <span className="bo-report-pill bo-report-pill--neutral">Pending / No result</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                Workplace verification module integration pending release.
              </p>
            </div>
            <div className="bo-report-card-box">
              <div className="bo-report-card-head">
                <span>10. Residence FI</span>
                <span className="bo-report-pill bo-report-pill--neutral">Pending / No result</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                Residence field verification module integration pending release.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Step 11 Legal Opinion & Step 12 Technical Valuation */}
        <section className="bo-report-section">
          <h2 className="bo-report-section-title">
            <span className="bo-report-section-num">11–12</span>
            <span>Legal Opinion &amp; Technical Valuation</span>
          </h2>
          <div className="bo-report-grid-2">
            {/* 11. Legal Opinion */}
            <div className="bo-report-card-box">
              <div className="bo-report-card-head">
                <span>11. Legal Opinion Report</span>
                <span className={`bo-report-pill ${legalOpinionDoc ? 'bo-report-pill--verified' : 'bo-report-pill--neutral'}`}>
                  {legalOpinionDoc ? (legalOpinionDoc.documentStatus || 'Uploaded') : 'Not Uploaded'}
                </span>
              </div>
              {legalOpinionDoc ? (
                <>
                  <div style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                    <strong>Document:</strong> {legalOpinionDoc.originalFileName || legalOpinionDoc.documentTitle || 'Legal Opinion Document'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: '6px' }}>
                    Uploaded: {formatDate(legalOpinionDoc.uploadedAt)}
                  </div>
                  {legalOpinionDoc.remarks && (
                    <div className="bo-report-remarks-box">
                      <span className="bo-report-remarks-lbl">Advocate Remarks:</span>
                      {legalOpinionDoc.remarks}
                    </div>
                  )}
                </>
              ) : (
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                  No legal opinion document uploaded for this collateral.
                </p>
              )}
            </div>

            {/* 12. Technical Valuation */}
            <div className="bo-report-card-box">
              <div className="bo-report-card-head">
                <span>12. Technical Valuation</span>
                <span className={`bo-report-pill ${technicalValuationDoc ? 'bo-report-pill--verified' : 'bo-report-pill--neutral'}`}>
                  {technicalValuationDoc ? (technicalValuationDoc.documentStatus || 'Uploaded') : 'Not Uploaded'}
                </span>
              </div>
              {technicalValuationDoc ? (
                <>
                  <div style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                    <strong>Document:</strong> {technicalValuationDoc.originalFileName || technicalValuationDoc.documentTitle || 'Technical Valuation Document'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: '6px' }}>
                    Uploaded: {formatDate(technicalValuationDoc.uploadedAt)}
                  </div>
                  {technicalValuationDoc.remarks && (
                    <div className="bo-report-remarks-box">
                      <span className="bo-report-remarks-lbl">Engineer Remarks:</span>
                      {technicalValuationDoc.remarks}
                    </div>
                  )}
                </>
              ) : (
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                  No technical valuation document uploaded for this property.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Section 5: Step 13 Credit Bureau & CIBIL Assessment */}
        <section className="bo-report-section">
          <h2 className="bo-report-section-title">
            <span className="bo-report-section-num">13</span>
            <span>Credit Bureau &amp; CIBIL Assessment</span>
          </h2>
          <div className="bo-report-cibil-strip">
            <div className="bo-report-score-box">
              <div className="bo-report-score-val">748</div>
              <div className="bo-report-score-lbl">Credit Score</div>
              <div className="bo-report-score-tag">EXCELLENT</div>
            </div>
            <div>
              <div className="bo-report-grid-3" style={{ marginBottom: '8px' }}>
                <div><span className="bo-report-cell-label">Tax ID / PAN</span><strong>{persInfo.panNumber || '—'}</strong></div>
                <div><span className="bo-report-cell-label">Repayment Track</span><strong style={{ color: '#047857' }}>98% On-Time</strong></div>
                <div><span className="bo-report-cell-label">Risk Rating</span><strong style={{ color: '#047857' }}>LOW RISK</strong></div>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                TransUnion CIBIL &amp; Experian credit bureau report indicates clean credit history, active tax compliance, and zero 90+ DPD defaults over recent cycles.
              </div>
              {manualCibilPanDoc && (
                <div className="bo-report-remarks-box" style={{ marginTop: '8px' }}>
                  <span className="bo-report-remarks-lbl">Manual CIBIL Remarks:</span>
                  {manualCibilPanDoc.remarks || 'Manual CIBIL PAN verification document attached and confirmed.'}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 6: Sign-Off & Audit Trail */}
        <footer className="bo-report-footer">
          <div className="bo-report-disclaimer">
            <strong>CONFIDENTIAL UNDERWRITING DOCUMENT</strong>
            <br />
            This document contains verified KYC, underwriting assessments, and Back Office operational reviews generated strictly for internal Credit Committee review.
          </div>
          <div className="bo-report-signoff-box">
            <div className="bo-report-signoff-signature">Back Office Underwriter Sign-off</div>
            <div><strong>Operations Verification Officer</strong></div>
            <div>Sivels Finance Operations Head Office</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
