/**
 * ApprovedDocumentsViewer.jsx
 * ----------------------------
 * Modal viewer for Credit Manager-approved documents (Sanction Letter and KFS).
 *
 * Architecture:
 *   - Lives under Core/src/features/approval-documents/components/
 *   - Decoupled from Business_Modules (zero imports of back_office or credit_manager)
 *   - Wraps shared SanctionLetter and KfsReport components
 *   - Strictly binds to Credit Manager-approved decision terms
 *   - Enforces approval gating: document generation is disabled if decision terms are incomplete
 *   - Supports on-demand viewing, switching between documents, and client-side PDF download
 *   - Full failure isolation: PDF failures are contained and do not affect application or approval state
 */

import React, { useState, useEffect, useRef } from 'react';
import { FileText, FileCheck, X, AlertTriangle } from 'lucide-react';
import SanctionLetter from './SanctionLetter/SanctionLetter';
import KfsReport from './KfsReport/KfsReport';

export const DOC_TYPES = {
  SANCTION_LETTER: 'SANCTION_LETTER',
  KFS: 'KFS',
};

export default function ApprovedDocumentsViewer({
  isOpen = false,
  onClose,
  initialDocument = DOC_TYPES.SANCTION_LETTER,
  autoDownload = false,
  customerId = null,
  verificationData = null,
  coApplicants = [],
  applicationProductDetailsId = null,
  creditDecision = null,
}) {
  const [activeDoc, setActiveDoc] = useState(initialDocument || DOC_TYPES.SANCTION_LETTER);
  const [autoDownloadTriggered, setAutoDownloadTriggered] = useState(false);
  const documentContainerRef = useRef(null);

  // Sync active document when initialDocument changes
  useEffect(() => {
    if (initialDocument) {
      setActiveDoc(initialDocument);
      setAutoDownloadTriggered(false);
    }
  }, [initialDocument, isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Authoritative decision validation
  const decisionStatus = String(creditDecision?.decision || '').trim();
  const isApproved = decisionStatus.toLowerCase() === 'approved';
  const sanctionedAmount = Number(creditDecision?.sanctionedLoanAmount);
  const sanctionedROI = creditDecision?.sanctionedROI;
  const sanctionedTenure = Number(creditDecision?.sanctionedTenureMonths);

  const isDecisionComplete = Boolean(
    isApproved &&
    Number.isFinite(sanctionedAmount) &&
    sanctionedAmount > 0 &&
    sanctionedROI !== null &&
    sanctionedROI !== undefined &&
    sanctionedROI !== '' &&
    Number.isFinite(Number(sanctionedROI)) &&
    Number.isFinite(sanctionedTenure) &&
    sanctionedTenure > 0
  );

  // Handle on-demand auto-download when requested by user action
  useEffect(() => {
    if (!isOpen || !autoDownload || autoDownloadTriggered || !isDecisionComplete) return;

    const timer = setTimeout(() => {
      if (!documentContainerRef.current) return;

      if (activeDoc === DOC_TYPES.SANCTION_LETTER) {
        const downloadBtn = documentContainerRef.current.querySelector('.sl-download-btn:not(.sl-print-btn)');
        if (downloadBtn && !downloadBtn.disabled) {
          downloadBtn.click();
          setAutoDownloadTriggered(true);
        }
      } else if (activeDoc === DOC_TYPES.KFS) {
        const downloadBtn = documentContainerRef.current.querySelector('.cam-btn-primary');
        if (downloadBtn && !downloadBtn.disabled) {
          downloadBtn.click();
          setAutoDownloadTriggered(true);
        }
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [isOpen, autoDownload, autoDownloadTriggered, activeDoc, isDecisionComplete]);

  if (!isOpen) return null;

  const appNo = verificationData?.appId || verificationData?.customerCode || (customerId ? `CUST-${customerId}` : '—');
  const customerName = verificationData?.customerName || 'Borrower';

  return (
    <div
      className="stc-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="approved-docs-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="stc-modal-window"
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1060px',
          height: '92vh',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          className="stc-modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    backgroundColor: '#ecfdf5',
                    color: '#0F7A4C',
                  }}
                >
                  {activeDoc === DOC_TYPES.SANCTION_LETTER ? <FileText size={16} /> : <FileCheck size={16} />}
                </span>
                <h3
                  id="approved-docs-modal-title"
                  style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}
                >
                  {activeDoc === DOC_TYPES.SANCTION_LETTER ? 'Sanction Letter' : 'Key Facts Statement (KFS)'}
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '34px' }}>
                {customerName} · Application #{appNo}
              </span>
            </div>

            {/* Document Switcher Tabs */}
            <div
              style={{
                display: 'inline-flex',
                background: '#e2e8f0',
                padding: '3px',
                borderRadius: '8px',
                marginLeft: '16px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveDoc(DOC_TYPES.SANCTION_LETTER);
                  setAutoDownloadTriggered(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeDoc === DOC_TYPES.SANCTION_LETTER ? '#ffffff' : 'transparent',
                  color: activeDoc === DOC_TYPES.SANCTION_LETTER ? '#0f172a' : '#64748b',
                  boxShadow: activeDoc === DOC_TYPES.SANCTION_LETTER ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <FileText size={13} />
                <span>Sanction Letter</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveDoc(DOC_TYPES.KFS);
                  setAutoDownloadTriggered(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeDoc === DOC_TYPES.KFS ? '#ffffff' : 'transparent',
                  color: activeDoc === DOC_TYPES.KFS ? '#0f172a' : '#64748b',
                  boxShadow: activeDoc === DOC_TYPES.KFS ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <FileCheck size={13} />
                <span>Key Facts Statement</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            className="stc-modal-close-btn"
            onClick={onClose}
            aria-label="Close document viewer"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Incomplete Decision Warning Banner */}
        {!isDecisionComplete && (
          <div
            style={{
              margin: '12px 20px 0',
              padding: '10px 14px',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, color: '#d97706' }} />
            <div>
              <strong>Incomplete Sanction Data:</strong> The Credit Manager approval decision does not contain complete financial terms (sanctioned amount, interest rate, or tenure). Document generation and PDF export are disabled.
            </div>
          </div>
        )}

        {/* Modal Body / Document Renderer */}
        <div
          ref={documentContainerRef}
          className="stc-modal-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            backgroundColor: '#f1f5f9',
          }}
        >
          {activeDoc === DOC_TYPES.SANCTION_LETTER ? (
            <SanctionLetter
              verificationData={verificationData}
              coApplicants={coApplicants}
              applicationProductDetailsId={applicationProductDetailsId}
              agentCustomerId={customerId}
              creditDecision={creditDecision}
            />
          ) : (
            <KfsReport
              verificationData={verificationData}
              applicationProductDetailsId={applicationProductDetailsId}
              agentCustomerId={customerId}
              creditDecision={creditDecision}
            />
          )}
        </div>
      </div>
    </div>
  );
}
