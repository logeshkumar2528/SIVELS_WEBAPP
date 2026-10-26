/**
 * ApplicationReview.jsx
 * --------------------
 * Credit Manager application workspace.
 *
 * Renders the exact Back Office Customer Verification workspace (all 16 steps) so the Credit
 * Manager sees and can correct everything the Back Office entered. Differences from the Back
 * Office view:
 *   - Saves are attributed to the logged-in Credit Manager (acting identity).
 *   - Back Office-only workflow actions (Return to RM, Send to Credit Manager) are hidden; Step 16
 *     "Final Action" shows the Credit Manager decision panel instead.
 *   - Every section has an Edit / Approve / Reject bar. Sections are read-only until "Edit" is clicked.
 *   - Reject (section or document) flags the item for the Back Office instead of sending it to the RM.
 *     Flags and section approvals are saved on the server per application (useReviewSections); flags
 *     are sent with "Return to Back Office", and the application can only be approved once every
 *     section is approved.
 *
 * Route: /credit/applications/:customerId
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import iconMap from '../../../back_office/src/back-office/config/iconMap';
import CustomerVerification, {
  CREDIT_REVIEW_SECTIONS,
  resolveReviewSectionId,
} from '../../../back_office/src/back-office/pages/CustomerVerification/CustomerVerification';
import VerificationReportPdf from '../../../back_office/src/back-office/components/VerificationReportPdf/VerificationReportPdf';
import { useVerificationWorkspace } from '../../../back_office/src/back-office/hooks/useVerificationWorkspace';
import ApprovedDocumentsViewer, {
  DOC_TYPES,
} from '../../../../Core/src/features/approval-documents/components/ApprovedDocumentsViewer';
import approvalDocumentService from '../../../../Core/src/features/approval-documents/services/approvalDocumentService';
import { setActingIdentity } from '../../../back_office/src/back-office/auth/authStorage';
import {
  RETURN_ITEM_STATUS,
  getAttentionSections,
  mapCreditReturnItem,
} from '../../../back_office/src/back-office/mappers/creditReturnMapper';
import { getReturnItemStep } from '../../../back_office/src/back-office/config/creditReturnFields';
import '../../../back_office/src/back-office/pages/SubmitToCredit/SubmitToCredit.css';
import '../styles/creditManager.css';
import creditManagerService from '../api/creditManagerService';
import { getCreditManagerAuth, getCreditManagerId } from '../auth/authStorage';
import { usePermissions } from '../../../../Core/src/auth/permissions';
import { ROUTES } from '../config/routeConfig';
import { useCreditApplications } from '../context/CreditApplicationsContext';
import {
  CM_STATUS,
  CM_STATUS_META,
  CREDIT_DECISION,
  CREDIT_DECISION_META,
  mapCreditDecision,
} from '../mappers/creditMapper';
import CreditDecisionModal, { DECISION_ACTIONS, getErrorMessage } from '../components/CreditDecisionModal';
import ReturnIssuesList from '../components/ReturnIssuesList';
import SectionReviewBar from '../components/SectionReviewBar';
import { useReviewSections } from '../hooks/useReviewSections';
import { getApplicationNo, parseDate } from '../utils/formatters';

const FINAL_ACTION_STEP = '13';

function formatRupees(amount) {
  const num = Number(amount);
  if (amount === null || amount === undefined || amount === '' || isNaN(num)) return '—';
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatDateTime(value) {
  const date = parseDate(value);
  if (!date) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function useCreditManagerActingIdentity() {
  const identity = useMemo(() => {
    const auth = getCreditManagerAuth();
    const id = Number(auth?.creditManagerId);
    return id > 0 ? { id, name: auth?.name || '', role: 'CreditManager' } : null;
  }, []);

  // Set synchronously so the workspace's first render already resolves the Credit Manager.
  useState(() => setActingIdentity(identity));

  useEffect(() => {
    setActingIdentity(identity);
    return () => setActingIdentity(null);
  }, [identity]);
}

function PendingFlagsCard({ flags, onRemove, onReturn, canReturn }) {
  const TrashIcon = iconMap['Trash2'];
  const RotateCcwIcon = iconMap['RotateCcw'];

  return (
    <div className="stc-submit-card">
      <div className="cm-issues-card-head">
        <h3 className="stc-docs-section-title" style={{ margin: 0 }}>Flagged for Back Office (not sent yet)</h3>
        <span className="stc-customer-sub">
          {flags.length} item{flags.length === 1 ? '' : 's'} · sent when you click Return to Back Office
        </span>
      </div>
      <ul className="cm-issues-list">
        {flags.map((item, index) => (
          <li key={`${item.sectionCode}-${item.fieldKey}-${item.fieldLabel}`}>
            <div>
              <strong>{item.sectionName} › {item.fieldLabel}</strong>
              <p>{item.issue}</p>
            </div>
            <button type="button" onClick={() => onRemove(index)} aria-label={`Remove ${item.fieldLabel}`}>
              {TrashIcon && <TrashIcon size={15} />}
            </button>
          </li>
        ))}
      </ul>
      {canReturn && (
        <div className="cm-decision-actions">
          <button type="button" className="stc-btn-doc cm-btn-return" onClick={onReturn}>
            {RotateCcwIcon && <RotateCcwIcon size={15} />}
            <span>Return to Back Office with {flags.length} flag{flags.length === 1 ? '' : 's'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function SectionChecklistCard({ review, onOpenSection }) {
  const sections = review.applicableSections || CREDIT_REVIEW_SECTIONS;
  return (
    <div className="stc-submit-card">
      <div className="cm-issues-card-head">
        <h3 className="stc-docs-section-title" style={{ margin: 0 }}>Section Review</h3>
        <span className="stc-customer-sub">
          {review.approvedCount} of {review.totalSections} sections approved
        </span>
      </div>
      <ul className="cm-section-checklist">
        {sections.map((section) => {
          const status = review.getStatus(section.id);
          return (
            <li key={section.id}>
              <button type="button" onClick={() => onOpenSection(section.visibleNum)}>
                <span className="cm-section-bar-num">{section.visibleNum}</span>
                <span className="cm-section-checklist-title">{section.title}</span>
                <span className={`cm-step-status cm-step-status--${(status || 'pending').toLowerCase()}`}>
                  {status === 'APPROVED' ? '✓ Approved' : status === 'FLAGGED' ? '⚑ Rejected' : 'Pending'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CreditDecisionPanel({
  isPending,
  review,
  onOpenSection,
  pendingFlags,
  onRemoveFlag,
  latestDecision,
  latestReturn,
  latestReturnItems,
  awaitingReviewSections,
  loading,
  error,
  successMessage,
  onDismissSuccess,
  onAction,
  onViewDocument,
  onDownloadDocument,
  identifierWarning,
  onDismissIdentifierWarning,
}) {
  const { can } = usePermissions();
  const canDecide = can('CREDIT.APPROVE');
  const CheckCircleIcon = iconMap['CheckCircle'];
  const XCircleIcon = iconMap['XCircle'];
  const RotateCcwIcon = iconMap['RotateCcw'];
  const AlertCircleIcon = iconMap['AlertCircle'];
  const EyeIcon = iconMap['Eye'];
  const DownloadIcon = iconMap['Download'];
  const FileTextIcon = iconMap['FileText'];
  const FileCheckIcon = iconMap['FileCheck'];
  const ArrowRightIcon = iconMap['ArrowRight'];

  const isDecisionComplete = useMemo(() => {
    if (!latestDecision || latestDecision.decision !== CREDIT_DECISION.APPROVED) return false;
    const amount = Number(latestDecision.sanctionedLoanAmount);
    const roi = latestDecision.sanctionedROI;
    const tenure = Number(latestDecision.sanctionedTenureMonths);
    return (
      Number.isFinite(amount) &&
      amount > 0 &&
      roi !== null &&
      roi !== undefined &&
      roi !== '' &&
      Number.isFinite(Number(roi)) &&
      Number.isFinite(tenure) &&
      tenure > 0
    );
  }, [latestDecision]);
  const XIcon = iconMap['X'];
  const acceptedCount = latestReturnItems.filter((item) => item.itemStatus === RETURN_ITEM_STATUS.ACCEPTED).length;
  const awaitingReviewCount = awaitingReviewSections.reduce((sum, s) => sum + s.count, 0);
  const allSectionsApproved = review.approvedCount === review.totalSections;
  const approveBlockedReason = awaitingReviewCount
    ? `Review and accept ${awaitingReviewCount} Back Office resolution${awaitingReviewCount === 1 ? '' : 's'} first.`
    : pendingFlags.length
      ? 'Some sections are rejected. Return the application to the Back Office, or clear the flags first.'
      : !allSectionsApproved
        ? `Approve every section first (${review.approvedCount} of ${review.totalSections} approved).`
        : '';

  return (
    <div className="cm-decision-panel">
      {successMessage && (
        <div className="cm-success-banner" role="status">
          {CheckCircleIcon && <CheckCircleIcon size={18} />}
          <span>{successMessage}</span>
          <button type="button" onClick={onDismissSuccess} aria-label="Dismiss">
            {XIcon && <XIcon size={16} />}
          </button>
        </div>
      )}

      {error && <div className="cm-form-alert" role="alert">{error}</div>}

      {identifierWarning && (
        <div className="cm-form-alert" role="alert" style={{ marginBottom: 12 }}>
          {AlertCircleIcon && <AlertCircleIcon size={16} />}
          <span>{identifierWarning}</span>
          {onDismissIdentifierWarning && (
            <button
              type="button"
              onClick={onDismissIdentifierWarning}
              aria-label="Dismiss warning"
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              {XIcon && <XIcon size={14} />}
            </button>
          )}
        </div>
      )}

      {awaitingReviewSections.length > 0 && (
        <div className="crp-strip" role="region" aria-label="Back Office resolutions awaiting review">
          <div className="crp-strip-head">
            <span className="crp-indicator" aria-hidden="true" />
            <strong>
              Resubmitted to Credit Manager · {awaitingReviewCount} Back Office resolution
              {awaitingReviewCount === 1 ? '' : 's'} awaiting your review
            </strong>
          </div>
          <div className="crp-strip-sections">
            {awaitingReviewSections.map((section) => (
              <button
                key={section.stepId}
                type="button"
                className="crp-strip-btn"
                onClick={() => onOpenSection(section.visibleNum)}
              >
                <span className="crp-indicator" aria-hidden="true" />
                <span className="crp-strip-num">{section.visibleNum}</span>
                <span>{section.sectionName}</span>
                <span className="crp-strip-count">{section.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isPending && <SectionChecklistCard review={review} onOpenSection={onOpenSection} />}

      {pendingFlags.length > 0 && (
        <PendingFlagsCard
          flags={pendingFlags}
          onRemove={onRemoveFlag}
          canReturn={isPending && canDecide}
          onReturn={() => onAction(DECISION_ACTIONS.RETURN)}
        />
      )}

      {latestReturnItems.length > 0 && (
        <div className="stc-submit-card">
          <div className="cm-issues-card-head">
            <h3 className="stc-docs-section-title" style={{ margin: 0 }}>Sections Rejected in Last Return</h3>
            <span className="stc-customer-sub">
              Returned on {formatDateTime(latestReturn?.decidedAt)} ·{' '}
              {acceptedCount} of {latestReturnItems.length} accepted
            </span>
          </div>
          <ReturnIssuesList items={latestReturnItems} />
        </div>
      )}

      <div className="stc-submit-card">
        <h3 className="stc-docs-section-title" style={{ margin: 0 }}>Credit Manager Decision</h3>

        {isPending ? (
          <>
            <div className="stc-submit-info-box">
              {AlertCircleIcon && <AlertCircleIcon size={18} style={{ flexShrink: 0 }} />}
              <div>
                Open each section and use <strong>Edit</strong>, <strong>Approve</strong> or{' '}
                <strong>Reject</strong> at the top. Rejected sections are sent together with{' '}
                <strong>Return to Back Office</strong>. The application can be approved once every section is approved.
              </div>
            </div>
            {approveBlockedReason && <p className="cm-approve-blocked">{approveBlockedReason}</p>}
            <div className="cm-decision-actions">
              <button
                type="button"
                className="stc-btn-doc cm-btn-approve"
                onClick={() => onAction(DECISION_ACTIONS.APPROVE)}
                disabled={!!approveBlockedReason}
                title={approveBlockedReason || undefined}
              >
                {CheckCircleIcon && <CheckCircleIcon size={15} />}
                <span>Approve</span>
              </button>
              <button type="button" className="stc-btn-doc cm-btn-reject" onClick={() => onAction(DECISION_ACTIONS.REJECT)}>
                {XCircleIcon && <XCircleIcon size={15} />}
                <span>Reject</span>
              </button>
              <button type="button" className="stc-btn-doc cm-btn-return" onClick={() => onAction(DECISION_ACTIONS.RETURN)}>
                {RotateCcwIcon && <RotateCcwIcon size={15} />}
                <span>Return to Back Office</span>
              </button>
              <button
                type="button"
                className="stc-btn-doc cm-btn-forward"
                disabled
                title="Forward workflow will be available in a future release"
              >
                {ArrowRightIcon && <ArrowRightIcon size={15} />}
                <span>Forward</span>
              </button>
            </div>
          </>
        ) : latestDecision ? (
          <div className="cm-decision-summary">
            <div className="cm-decision-summary-head">
              <span className={`stc-pill ${CREDIT_DECISION_META[latestDecision.decision]?.className || 'stc-pill--progress'}`}>
                {CREDIT_DECISION_META[latestDecision.decision]?.label || latestDecision.decision || 'Decision'}
              </span>
              <span className="stc-customer-sub">Decided on {formatDateTime(latestDecision.decidedAt)}</span>
            </div>
            {latestDecision.decision === CREDIT_DECISION.APPROVED && (
              <div className="stc-summary-grid">
                <div className="stc-summary-item">
                  <span className="stc-summary-label">Sanctioned Amount</span>
                  <span className="stc-summary-value stc-summary-value--highlight">
                    {formatRupees(latestDecision.sanctionedLoanAmount)}
                  </span>
                </div>
                <div className="stc-summary-item">
                  <span className="stc-summary-label">Sanctioned ROI</span>
                  <span className="stc-summary-value">
                    {latestDecision.sanctionedROI != null ? `${latestDecision.sanctionedROI}% p.a.` : '—'}
                  </span>
                </div>
                <div className="stc-summary-item">
                  <span className="stc-summary-label">Sanctioned Tenure</span>
                  <span className="stc-summary-value">
                    {latestDecision.sanctionedTenureMonths != null ? `${latestDecision.sanctionedTenureMonths} Months` : '—'}
                  </span>
                </div>
              </div>
            )}
            {latestDecision.conditions && (
              <p className="cm-decision-text"><strong>Conditions:</strong> {latestDecision.conditions}</p>
            )}
            {latestDecision.remarks && (
              <p className="cm-decision-text"><strong>Remarks:</strong> {latestDecision.remarks}</p>
            )}
          </div>
        ) : (
          <p className="stc-customer-sub" style={{ margin: 0 }}>
            {loading ? 'Loading decision...' : 'This application is not awaiting a Credit Manager decision.'}
          </p>
        )}
      </div>

      {latestDecision?.decision === CREDIT_DECISION.APPROVED && (
        <div className="stc-submit-card cm-approved-docs-card">
          <div className="cm-issues-card-head" style={{ marginBottom: 16 }}>
            <div>
              <h3 className="stc-docs-section-title" style={{ margin: 0 }}>Approved Documents</h3>
            </div>
          </div>

          {!isDecisionComplete && (
            <div className="cm-form-alert" role="alert" style={{ marginBottom: 16 }}>
              The approved decision is missing required financial terms (sanctioned loan amount, interest rate, or tenure). Document viewing and generation are disabled.
            </div>
          )}

          <div
            className="cm-approved-docs-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {/* 1. Sanction Letter Card */}
            <div
              className="cm-approved-doc-card"
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  {FileTextIcon && <FileTextIcon size={18} color="#0F7A4C" />}
                  <strong style={{ fontSize: '15px', color: '#0f172a' }}>Sanction Letter</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="stc-btn-doc"
                  onClick={() => onViewDocument && onViewDocument(DOC_TYPES.SANCTION_LETTER)}
                  disabled={!isDecisionComplete}
                  title={!isDecisionComplete ? 'Decision terms incomplete' : 'View Sanction Letter'}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {EyeIcon && <EyeIcon size={14} />}
                  <span>View</span>
                </button>
                <button
                  type="button"
                  className="stc-btn-doc cm-btn-approve"
                  onClick={() => onDownloadDocument && onDownloadDocument(DOC_TYPES.SANCTION_LETTER)}
                  disabled={!isDecisionComplete}
                  title={!isDecisionComplete ? 'Decision terms incomplete' : 'Download Sanction Letter PDF'}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {DownloadIcon && <DownloadIcon size={14} />}
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* 2. Key Facts Statement (KFS) Card */}
            <div
              className="cm-approved-doc-card"
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  {FileCheckIcon && <FileCheckIcon size={18} color="#0F7A4C" />}
                  <strong style={{ fontSize: '15px', color: '#0f172a' }}>Key Facts Statement (KFS)</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="stc-btn-doc"
                  onClick={() => onViewDocument && onViewDocument(DOC_TYPES.KFS)}
                  disabled={!isDecisionComplete}
                  title={!isDecisionComplete ? 'Decision terms incomplete' : 'View Key Facts Statement'}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {EyeIcon && <EyeIcon size={14} />}
                  <span>View</span>
                </button>
                <button
                  type="button"
                  className="stc-btn-doc cm-btn-approve"
                  onClick={() => onDownloadDocument && onDownloadDocument(DOC_TYPES.KFS)}
                  disabled={!isDecisionComplete}
                  title={!isDecisionComplete ? 'Decision terms incomplete' : 'Download Key Facts Statement PDF'}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {DownloadIcon && <DownloadIcon size={14} />}
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApplicationReview() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { applications, refetch: refetchQueue } = useCreditApplications();
  useCreditManagerActingIdentity();

  const [showReport, setShowReport] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [decisions, setDecisions] = useState([]);
  const [returnItems, setReturnItems] = useState([]);
  const [decisionLoading, setDecisionLoading] = useState(true);
  const [decisionError, setDecisionError] = useState('');
  const [identifierWarning, setIdentifierWarning] = useState('');
  const [loanClassification, setLoanClassification] = useState(null);
  const isUnsecured =
    loanClassification?.status === 'RESOLVED' && loanClassification?.typeCode === 'UNSEC';

  const handleClassificationChange = useCallback((classification) => {
    setLoanClassification(classification);
  }, []);

  useEffect(() => {
    setLoanClassification(null);
  }, [customerId]);

  const review = useReviewSections(customerId, isUnsecured);
  const { flags: pendingFlags, setFlags: setPendingFlags, addFlag } = review;

  const { verificationData } = useVerificationWorkspace(customerId);
  const coApplicants = useMemo(() => {
    const rawPersonal =
      verificationData?.raw?.personalInformation ||
      verificationData?.raw?.PersonalInformation ||
      [];
    const personalList = Array.isArray(rawPersonal) ? rawPersonal : (rawPersonal ? [rawPersonal] : []);
    return personalList.slice(1);
  }, [verificationData]);

  const [docViewerState, setDocViewerState] = useState({
    isOpen: false,
    docType: DOC_TYPES.SANCTION_LETTER,
    autoDownload: false,
  });

  const handleViewDocument = useCallback((docType) => {
    setDocViewerState({
      isOpen: true,
      docType: docType || DOC_TYPES.SANCTION_LETTER,
      autoDownload: false,
    });
  }, []);

  const handleDownloadDocument = useCallback((docType) => {
    setDocViewerState({
      isOpen: true,
      docType: docType || DOC_TYPES.SANCTION_LETTER,
      autoDownload: true,
    });
  }, []);

  const handleCloseDocViewer = useCallback(() => {
    setDocViewerState((prev) => ({ ...prev, isOpen: false, autoDownload: false }));
  }, []);

  const ShieldCheckIcon = iconMap['ShieldCheck'];
  const FileCheckIcon = iconMap['FileCheck'];
  const AlertTriangleIcon = iconMap['AlertTriangle'];
  const XIcon = iconMap['X'];

  const loadDecisions = useCallback(async () => {
    if (!customerId) return;
    setDecisionLoading(true);
    setDecisionError('');
    const [decisionRes, itemsRes] = await Promise.allSettled([
      creditManagerService.getCreditDecisions(customerId),
      creditManagerService.getCreditReturnItems(customerId),
    ]);
    if (decisionRes.status === 'fulfilled') {
      setDecisions(decisionRes.value.map(mapCreditDecision).filter(Boolean));
    } else if (decisionRes.reason?.response?.status === 404) {
      setDecisions([]);
    } else {
      setDecisionError(getErrorMessage(decisionRes.reason, 'Unable to load credit decisions.'));
    }
    setReturnItems(
      itemsRes.status === 'fulfilled' ? itemsRes.value.map(mapCreditReturnItem).filter(Boolean) : []
    );
    setDecisionLoading(false);
  }, [customerId]);

  useEffect(() => {
    loadDecisions();
  }, [loadDecisions]);

  const queueApp = useMemo(
    () => applications.find((app) => String(app.agentCustomerId) === String(customerId)),
    [applications, customerId]
  );

  const applicationProductDetailsId =
    verificationData?.applicationProductDetailsId ||
    queueApp?.applicationProductDetailsId ||
    null;

  const status = Number(queueApp?.status);
  const isPending = status === CM_STATUS.PENDING;
  const statusMeta = CM_STATUS_META[status];
  const latestDecision = decisions[0] || null;
  const latestReturn = decisions.find((d) => d.decision === CREDIT_DECISION.RETURNED) || null;
  const latestReturnItems = useMemo(() => {
    if (!latestReturn) return [];
    if (latestReturn.id == null) return returnItems;
    return returnItems.filter((item) => String(item.decisionId) === String(latestReturn.id));
  }, [latestReturn, returnItems]);
  const openReturnItemCount = latestReturnItems.filter((item) => item.itemStatus === RETURN_ITEM_STATUS.OPEN).length;
  const awaitingReviewSections = useMemo(
    () => getAttentionSections(returnItems, 'CreditManager'),
    [returnItems]
  );
  const awaitingReviewBySection = useMemo(() => {
    const counts = {};
    returnItems.forEach((item) => {
      if (item.itemStatus !== RETURN_ITEM_STATUS.RESUBMITTED) return;
      const sectionId = resolveReviewSectionId(getReturnItemStep(item).stepId);
      counts[sectionId] = (counts[sectionId] || 0) + 1;
    });
    return counts;
  }, [returnItems]);
  const isResubmitted = isPending && latestDecision?.decision === CREDIT_DECISION.RETURNED;

  const handleBack = useCallback(() => {
    // 1. Priority: Validated originating queue route from navigation state
    const origin = location.state?.from;
    const validQueues = [
      ROUTES.RECEIVED,
      ROUTES.PENDING,
      ROUTES.APPROVED,
      ROUTES.REJECTED,
      `/credit${ROUTES.RECEIVED}`,
      `/credit${ROUTES.PENDING}`,
      `/credit${ROUTES.APPROVED}`,
      `/credit${ROUTES.REJECTED}`,
    ];

    if (typeof origin === 'string' && validQueues.includes(origin)) {
      navigate(origin);
      return;
    }

    // 2. Fallback: Resolve destination from application's existing status
    if (status === CM_STATUS.APPROVED) {
      navigate(ROUTES.APPROVED);
      return;
    }
    if (status === CM_STATUS.REJECTED) {
      navigate(ROUTES.REJECTED);
      return;
    }
    if (status === CM_STATUS.PENDING) {
      navigate(ROUTES.PENDING);
      return;
    }

    // 3. Final fallback: Received Applications route
    navigate(ROUTES.RECEIVED);
  }, [location.state, navigate, status]);

  const goToStep = (visibleStep) => {
    const next = new URLSearchParams(searchParams);
    next.set('step', String(Number(visibleStep)));
    setSearchParams(next);
  };
  const goToFinalAction = () => goToStep(FINAL_ACTION_STEP);

  const sectionReview = {
    canEdit: isPending,
    getStatus: review.getStatus,
    renderBar: ({ section, isEditing, onToggleEdit, onReject, compact = false }) => (
      <SectionReviewBar
        section={section}
        status={review.getStatus(section.id)}
        flagCount={pendingFlags.filter((flag) => flag.stepId === section.id).length}
        awaitingReviewCount={awaitingReviewBySection[section.id] || 0}
        isEditing={isEditing}
        canEdit={isPending}
        compact={compact}
        onToggleEdit={onToggleEdit}
        onApprove={() => review.approve(section.id)}
        onUnapprove={() => review.unapprove(section.id)}
        onReject={onReject}
        onClearFlags={() => review.clearSectionFlags(section.id)}
      />
    ),
  };

  const handleSectionFlag = (step, { returnNow = false } = {}) => {
    addFlag(step);
    if (returnNow && isPending) setActiveAction(DECISION_ACTIONS.RETURN);
  };

  const handleAcceptReturnItem = async (item, reviewRemarks) => {
    const creditManagerId = getCreditManagerId();
    if (!creditManagerId) throw new Error('Your Credit Manager session has expired. Please log in again.');
    await creditManagerService.acceptCreditReturnItem(item.id, {
      reviewedByUserId: Number(creditManagerId),
      reviewedByRole: 'CreditManager',
      reviewRemarks,
    });
    setSuccessMessage(`${item.sectionName} › ${item.fieldLabel}: resolution accepted.`);
    await loadDecisions();
  };

  const creditReturn = {
    items: returnItems,
    reload: loadDecisions,
    canAct: isPending,
    onAccept: handleAcceptReturnItem,
  };

  const handleDecisionSubmit = async (action, payload) => {
    await action.call(customerId, payload);
    setActiveAction(null);
    review.reload();
    setSuccessMessage(action.successMessage);
    refetchQueue();
    loadDecisions();

    if (action?.key === 'APPROVE') {
      try {
        await approvalDocumentService.generateLoanIdentifier(customerId);
        setIdentifierWarning('');
      } catch (idErr) {
        console.warn('[ApplicationReview] Loan identifier generation failed after approval:', idErr);
        setIdentifierWarning(
          'Application approved successfully, but official Loan Identifier generation encountered a network issue. You can retry generating identifiers from the Approved Documents section.'
        );
      }
    }
  };

  return (
    <div className="cm-workspace">
      {review.error && (
        <div className="cm-form-alert" role="alert">
          <span>{review.error}</span>
        </div>
      )}

      <CustomerVerification
        viewerRole="CreditManager"
        onBack={handleBack}
        backLabel="Back to Applications"
        onCreditManagerFlag={handleSectionFlag}
        sectionReview={sectionReview}
        creditReturn={creditReturn}
        onClassificationChange={handleClassificationChange}
        finalActionsSlot={
          <CreditDecisionPanel
            isPending={isPending}
            review={review}
            onOpenSection={goToStep}
            pendingFlags={pendingFlags}
            onRemoveFlag={(index) => setPendingFlags((prev) => prev.filter((_, i) => i !== index))}
            latestDecision={latestDecision}
            latestReturn={latestReturn}
            latestReturnItems={latestReturnItems}
            awaitingReviewSections={awaitingReviewSections}
            loading={decisionLoading}
            error={decisionError}
            successMessage={successMessage}
            onDismissSuccess={() => setSuccessMessage('')}
            onAction={setActiveAction}
            onViewDocument={handleViewDocument}
            onDownloadDocument={handleDownloadDocument}
            identifierWarning={identifierWarning}
            onDismissIdentifierWarning={() => setIdentifierWarning('')}
          />
        }
      />

      {showReport && (
        <div className="stc-modal-overlay" role="dialog" aria-modal="true">
          <div className="stc-modal-window">
            <div className="stc-modal-header">
              <h3>Back Office Verification &amp; Underwriting Report</h3>
              <button
                type="button"
                className="stc-modal-close-btn"
                onClick={() => setShowReport(false)}
                aria-label="Close modal"
              >
                {XIcon && <XIcon size={20} />}
              </button>
            </div>
            <div className="stc-modal-body">
              <VerificationReportPdf customerId={customerId} showActions={true} onClose={() => setShowReport(false)} />
            </div>
          </div>
        </div>
      )}

      {docViewerState.isOpen && (
        <ApprovedDocumentsViewer
          isOpen={docViewerState.isOpen}
          onClose={handleCloseDocViewer}
          initialDocument={docViewerState.docType}
          autoDownload={docViewerState.autoDownload}
          customerId={customerId}
          verificationData={verificationData}
          coApplicants={coApplicants}
          applicationProductDetailsId={applicationProductDetailsId}
          creditDecision={latestDecision}
        />
      )}

      {activeAction && (
        <CreditDecisionModal
          action={activeAction}
          requestedAmount={queueApp?.expectedLoanAmount}
          initialIssues={activeAction.key === 'RETURN' ? pendingFlags : []}
          onIssuesChange={setPendingFlags}
          onClose={() => setActiveAction(null)}
          onSubmitted={handleDecisionSubmit}
        />
      )}
    </div>
  );
}
