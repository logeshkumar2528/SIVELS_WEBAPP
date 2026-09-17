/**
 * SubmitToCreditDetail.jsx
 * --------------------
 * Back Office detail page for preparing and reviewing both official application documents
 * (Submitted Loan Application Form & Back Office Verification Report) before Credit Manager submission.
 *
 * Route: /backoffice/submit-to-credit/:customerId
 *
 * Documents Presented:
 * 1. Loan Application Form (Step 01: Reuses ApplicationDraftProvider + PdfView.jsx)
 * 2. Back Office Verification Report (Steps 02–13: Dedicated VerificationReportPdf.jsx)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import { buildRoute, ROUTES } from '../../config/routeConfig';
import { useVerificationWorkspace } from '../../hooks/useVerificationWorkspace';
import PdfView from '../../../../../rm_modules/src/pages/PdfView/PdfView';
import { ApplicationDraftProvider } from '../../../../../rm_modules/src/state/ApplicationDraftContext';
import VerificationReportPdf from '../../components/VerificationReportPdf/VerificationReportPdf';
import './SubmitToCredit.css';

function formatCurrency(amount) {
  const num = Number(amount);
  if (!amount || isNaN(num) || num === 0) return '₹0';
  return `₹${num.toLocaleString('en-IN')}`;
}

export default function SubmitToCreditDetail() {
  const { customerId } = useParams();
  const navigate = useNavigate();

  // Load real application details from backend via hook
  const { verificationData, loading, error, refetch } = useVerificationWorkspace(customerId);

  // Modal view states for the two documents
  const [activeModalDoc, setActiveModalDoc] = useState(null); // 'APP_FORM' | 'VERIF_REPORT' | null

  // Icons
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const FileTextIcon = iconMap['FileText'];
  const ShieldCheckIcon = iconMap['ShieldCheck'];
  const EyeIcon = iconMap['Eye'];
  const DownloadIcon = iconMap['Download'];
  const SendIcon = iconMap['Send'];
  const AlertCircleIcon = iconMap['AlertCircle'];
  const XIcon = iconMap['X'];
  const RefreshCwIcon = iconMap['RefreshCw'];

  const appDetails = verificationData?.applicationDetails || {};
  const persInfo = verificationData?.personalInformation || {};

  return (
    <div className="stc-detail-container">
      {/* Back to Queue Navigation */}
      <button
        type="button"
        className="stc-back-btn"
        onClick={() => navigate(ROUTES.SUBMIT_TO_CREDIT)}
        aria-label="Back to Submit to Credit Manager Queue"
      >
        {ArrowLeftIcon && <ArrowLeftIcon size={16} />}
        <span>Back to Completed Applications Queue</span>
      </button>

      {/* Loading & Error States */}
      {loading && (
        <div className="stc-summary-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#64748b' }}>Loading customer application details...</p>
        </div>
      )}

      {error && !loading && (
        <div className="stc-summary-card" style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
          <h3>Unable to load customer details</h3>
          <p>{error}</p>
          <button
            type="button"
            className="stc-btn-review"
            onClick={refetch}
            style={{ display: 'inline-flex', marginTop: '0.75rem' }}
          >
            {RefreshCwIcon && <RefreshCwIcon size={14} />} Retry
          </button>
        </div>
      )}

      {!loading && !error && verificationData && (
        <>
          {/* ── 1. Customer & Loan Application Summary Card ── */}
          <div className="stc-summary-card">
            <div className="stc-summary-head">
              <div className="stc-summary-title-group">
                <h2>{verificationData.customerName || persInfo.fullName || 'Customer Application'}</h2>
                <p>Application Reference: <strong>{appDetails.applicationNo || `APP-${customerId}`}</strong></p>
              </div>
              <span className="stc-pill stc-pill--verified">
                ✓ Ready for Review
              </span>
            </div>

            <div className="stc-summary-grid">
              <div className="stc-summary-item">
                <span className="stc-summary-label">Application Number</span>
                <span className="stc-summary-value">{appDetails.applicationNo || `APP-${customerId}`}</span>
              </div>
              <div className="stc-summary-item">
                <span className="stc-summary-label">Customer Name</span>
                <span className="stc-summary-value">{verificationData.customerName || '—'}</span>
              </div>
              <div className="stc-summary-item">
                <span className="stc-summary-label">Contact Mobile</span>
                <span className="stc-summary-value">{verificationData.mobile || persInfo.mobile || '—'}</span>
              </div>
              <div className="stc-summary-item">
                <span className="stc-summary-label">Loan Product</span>
                <span className="stc-summary-value">{appDetails.loanProduct || 'Personal Loan'}</span>
              </div>
              <div className="stc-summary-item">
                <span className="stc-summary-label">Requested Loan Amount</span>
                <span className="stc-summary-value stc-summary-value--highlight">
                  {formatCurrency(appDetails.loanAmount)}
                </span>
              </div>
              <div className="stc-summary-item">
                <span className="stc-summary-label">Assigned RM</span>
                <span className="stc-summary-value">{verificationData.rmName || '—'}</span>
              </div>
              <div className="stc-summary-item">
                <span className="stc-summary-label">District</span>
                <span className="stc-summary-value">{verificationData.districtName || '—'}</span>
              </div>
              <div className="stc-summary-item">
                <span className="stc-summary-label">Applied Date</span>
                <span className="stc-summary-value">
                  {appDetails.appliedDate ? String(appDetails.appliedDate).slice(0, 10) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* ── 2. Exactly Two Main Document Cards ── */}
          <section>
            <h3 className="stc-docs-section-title">Required Documents for Credit Manager Submission</h3>
            <div className="stc-docs-grid">
              {/* Document Card 1: Loan Application Form (Step 01 - PdfView) */}
              <div className="stc-doc-card">
                <div className="stc-doc-header">
                  <div className="stc-doc-icon-wrap">
                    {FileTextIcon && <FileTextIcon size={22} />}
                  </div>
                  <div className="stc-doc-header-text">
                    <h3>Loan Application Form</h3>
                    <p>PDF 1: Original Submitted Loan Application</p>
                  </div>
                </div>

                <div className="stc-doc-body">
                  Complete read-only loan application form submitted by applicant and sourcing Relationship Manager. Includes demographics, property collateral, banking, income declarations, and signatures (Step 01).
                </div>

                <div className="stc-doc-actions">
                  <button
                    type="button"
                    className="stc-btn-doc stc-btn-doc--outline"
                    onClick={() => setActiveModalDoc('APP_FORM')}
                  >
                    {EyeIcon && <EyeIcon size={14} />}
                    <span>View Form</span>
                  </button>
                  <button
                    type="button"
                    className="stc-btn-doc stc-btn-doc--primary"
                    onClick={() => setActiveModalDoc('APP_FORM')}
                  >
                    {DownloadIcon && <DownloadIcon size={14} />}
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              {/* Document Card 2: Back Office Verification Report (Steps 02–13) */}
              <div className="stc-doc-card">
                <div className="stc-doc-header">
                  <div className="stc-doc-icon-wrap" style={{ background: '#ecfdf5', color: '#047857' }}>
                    {ShieldCheckIcon && <ShieldCheckIcon size={22} />}
                  </div>
                  <div className="stc-doc-header-text">
                    <h3>Back Office Verification Report</h3>
                    <p>PDF 2: Underwriting Verification Report (Steps 02–13)</p>
                  </div>
                </div>

                <div className="stc-doc-body">
                  Consolidated Back Office underwriting report covering 6/6 KYC document verifications, field investigation notes, advocate legal opinion metadata, engineer technical valuation report, credit bureau CIR check, and underwriting remarks.
                </div>

                <div className="stc-doc-actions">
                  <button
                    type="button"
                    className="stc-btn-doc stc-btn-doc--outline"
                    onClick={() => setActiveModalDoc('VERIF_REPORT')}
                  >
                    {EyeIcon && <EyeIcon size={14} />}
                    <span>View Report</span>
                  </button>
                  <button
                    type="button"
                    className="stc-btn-doc stc-btn-doc--primary"
                    onClick={() => setActiveModalDoc('VERIF_REPORT')}
                  >
                    {DownloadIcon && <DownloadIcon size={14} />}
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ── 3. Submission Action Card ── */}
          <div className="stc-submit-card">
            <div className="stc-submit-info-box">
              {AlertCircleIcon && <AlertCircleIcon size={18} style={{ flexShrink: 0 }} />}
              <div>
                <strong>Credit Manager Submission Notice:</strong> Credit Manager submission API integration is pending on the backend. Both application PDFs (Original Application Form and Back Office Verification Report) are compiled and ready for review.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="stc-btn-submit-main"
                disabled={true}
                title="Submission API integration pending"
              >
                {SendIcon && <SendIcon size={16} />}
                <span>Submit to Credit Manager</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Document View Modals ── */}
      {/* Modal 1: Loan Application Form (PdfView) */}
      {activeModalDoc === 'APP_FORM' && (
        <div className="stc-modal-overlay" role="dialog" aria-modal="true">
          <div className="stc-modal-window">
            <div className="stc-modal-header">
              <h3>Original Submitted Loan Application Form (PDF 1)</h3>
              <button
                type="button"
                className="stc-modal-close-btn"
                onClick={() => setActiveModalDoc(null)}
                aria-label="Close modal"
              >
                {XIcon && <XIcon size={20} />}
              </button>
            </div>
            <div className="stc-modal-body">
              <ApplicationDraftProvider key={customerId}>
                <PdfView />
              </ApplicationDraftProvider>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Back Office Verification Report */}
      {activeModalDoc === 'VERIF_REPORT' && (
        <div className="stc-modal-overlay" role="dialog" aria-modal="true">
          <div className="stc-modal-window">
            <div className="stc-modal-header">
              <h3>Back Office Verification &amp; Underwriting Report (PDF 2)</h3>
              <button
                type="button"
                className="stc-modal-close-btn"
                onClick={() => setActiveModalDoc(null)}
                aria-label="Close modal"
              >
                {XIcon && <XIcon size={20} />}
              </button>
            </div>
            <div className="stc-modal-body">
              <VerificationReportPdf
                customerId={customerId}
                showActions={true}
                onClose={() => setActiveModalDoc(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
