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
 *     Flags and section approvals are kept per application in sessionStorage; flags are sent with
 *     "Return to Back Office", and the application can only be approved once every section is approved.
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
import { setActingIdentity } from '../../../back_office/src/back-office/auth/authStorage';
import { mapCreditReturnItem } from '../../../back_office/src/back-office/mappers/creditReturnMapper';
import { buildCreditReturnItemFromStep } from '../../../back_office/src/back-office/config/creditReturnFields';
import '../../../back_office/src/back-office/pages/SubmitToCredit/SubmitToCredit.css';
import '../styles/creditManager.css';
import creditManagerService from '../api/creditManagerService';
import { getCreditManagerAuth } from '../auth/authStorage';
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
import { getApplicationNo, parseDate } from '../utils/formatters';

const FINAL_ACTION_STEP = '16';

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

function readSessionList(key) {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Array state mirrored to sessionStorage so it survives reloads while the review is in progress. */
function useSessionList(key) {
  const [list, setList] = useState(() => readSessionList(key));

  useEffect(() => {
    setList(readSessionList(key));
  }, [key]);

  const update = useCallback(
    (next) => {
      setList((prev) => {
        const value = typeof next === 'function' ? next(prev) : next;
        if (value.length) sessionStorage.setItem(key, JSON.stringify(value));
        else sessionStorage.removeItem(key);
        return value;
      });
    },
    [key]
  );

  return [list, update];
}

const isSameFlag = (a, b) =>
  a.sectionCode === b.sectionCode &&
  a.fieldKey === b.fieldKey &&
  a.fieldLabel.toLowerCase() === b.fieldLabel.toLowerCase();

/**
 * Per-section review state: approved section ids, plus flags (step-level rejects) that are sent
 * together with "Return to Back Office". A section with a flag counts as rejected.
 */
function useSectionReview(customerId) {
  const [flags, setFlags] = useSessionList(`cm-pending-flags:${customerId}`);
  const [approvedIds, setApprovedIds] = useSessionList(`cm-approved-sections:${customerId}`);

  const addFlag = useCallback(
    (step) => {
      const sectionId = resolveReviewSectionId(step.stepNum);
      const item = { ...buildCreditReturnItemFromStep(step), stepId: sectionId };
      if (!item.issue) return;
      setFlags((prev) => [...prev.filter((flag) => !isSameFlag(flag, item)), item]);
      setApprovedIds((prev) => prev.filter((id) => id !== sectionId));
    },
    [setFlags, setApprovedIds]
  );

  const getStatus = useCallback(
    (sectionId) => {
      if (flags.some((flag) => flag.stepId === sectionId)) return 'FLAGGED';
      if (approvedIds.includes(sectionId)) return 'APPROVED';
      return null;
    },
    [flags, approvedIds]
  );

  const approve = useCallback(
    (sectionId) => setApprovedIds((prev) => (prev.includes(sectionId) ? prev : [...prev, sectionId])),
    [setApprovedIds]
  );
  const unapprove = useCallback(
    (sectionId) => setApprovedIds((prev) => prev.filter((id) => id !== sectionId)),
    [setApprovedIds]
  );
  const clearSectionFlags = useCallback(
    (sectionId) => setFlags((prev) => prev.filter((flag) => flag.stepId !== sectionId)),
    [setFlags]
  );
  const reset = useCallback(() => {
    setFlags([]);
    setApprovedIds([]);
  }, [setFlags, setApprovedIds]);

  const approvedCount = CREDIT_REVIEW_SECTIONS.filter((s) => getStatus(s.id) === 'APPROVED').length;

  return {
    flags,
    setFlags,
    addFlag,
    getStatus,
    approve,
    unapprove,
    clearSectionFlags,
    reset,
    approvedCount,
    totalSections: CREDIT_REVIEW_SECTIONS.length,
  };
}

function SectionReviewBar({ section, status, flagCount, isEditing, canEdit, onToggleEdit, onApprove, onUnapprove, onReject, onClearFlags }) {
  const EditIcon = iconMap['Edit3'];
  const CheckCircleIcon = iconMap['CheckCircle'];
  const XCircleIcon = iconMap['XCircle'];
  const isApproved = status === 'APPROVED';
  const isFlagged = status === 'FLAGGED';

  return (
    <div className={`cm-section-bar${isEditing ? ' is-editing' : ''}`}>
      <div className="cm-section-bar-info">
        <span className="cm-section-bar-num">{section.visibleNum}</span>
        <div>
          <strong>{section.title}</strong>
          <span>
            {isEditing
              ? 'Editing — your changes are saved with the section’s own Save buttons.'
              : isFlagged
                ? `${flagCount} flag${flagCount === 1 ? '' : 's'} for the Back Office`
                : isApproved
                  ? 'Approved by you'
                  : 'Review this section, then approve or reject it.'}
          </span>
        </div>
        {status && (
          <span className={`cm-step-status cm-step-status--${status.toLowerCase()}`}>
            {isApproved ? '✓ Approved' : '⚑ Rejected'}
          </span>
        )}
      </div>

      {canEdit && (
        <div className="cm-section-bar-actions">
          <button
            type="button"
            className={`stc-btn-doc ${isEditing ? 'stc-btn-doc--primary' : 'stc-btn-doc--outline'}`}
            onClick={onToggleEdit}
          >
            {EditIcon && <EditIcon size={14} />}
            <span>{isEditing ? 'Done Editing' : 'Edit'}</span>
          </button>
          {isApproved ? (
            <button type="button" className="stc-btn-doc stc-btn-doc--outline" onClick={onUnapprove}>
              <span>Undo Approval</span>
            </button>
          ) : (
            <button
              type="button"
              className="stc-btn-doc cm-btn-approve"
              onClick={onApprove}
              disabled={isFlagged}
              title={isFlagged ? 'Clear this section’s flags before approving it.' : undefined}
            >
              {CheckCircleIcon && <CheckCircleIcon size={14} />}
              <span>Approve</span>
            </button>
          )}
          <button type="button" className="stc-btn-doc cm-btn-reject" onClick={onReject}>
            {XCircleIcon && <XCircleIcon size={14} />}
            <span>{isFlagged ? 'Add Flag' : 'Reject'}</span>
          </button>
          {isFlagged && (
            <button type="button" className="stc-btn-doc stc-btn-doc--outline" onClick={onClearFlags}>
              <span>Clear Flags</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
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
  return (
    <div className="stc-submit-card">
      <div className="cm-issues-card-head">
        <h3 className="stc-docs-section-title" style={{ margin: 0 }}>Section Review</h3>
        <span className="stc-customer-sub">
          {review.approvedCount} of {review.totalSections} sections approved
        </span>
      </div>
      <ul className="cm-section-checklist">
        {CREDIT_REVIEW_SECTIONS.map((section) => {
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
  loading,
  error,
  successMessage,
  onDismissSuccess,
  onAction,
}) {
  const CheckCircleIcon = iconMap['CheckCircle'];
  const XCircleIcon = iconMap['XCircle'];
  const RotateCcwIcon = iconMap['RotateCcw'];
  const AlertCircleIcon = iconMap['AlertCircle'];
  const XIcon = iconMap['X'];
  const openCount = latestReturnItems.filter((item) => !item.isResolved).length;
  const allSectionsApproved = review.approvedCount === review.totalSections;
  const approveBlockedReason = pendingFlags.length
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

      {isPending && <SectionChecklistCard review={review} onOpenSection={onOpenSection} />}

      {pendingFlags.length > 0 && (
        <PendingFlagsCard
          flags={pendingFlags}
          onRemove={onRemoveFlag}
          canReturn={isPending}
          onReturn={() => onAction(DECISION_ACTIONS.RETURN)}
        />
      )}

      {latestReturnItems.length > 0 && (
        <div className="stc-submit-card">
          <div className="cm-issues-card-head">
            <h3 className="stc-docs-section-title" style={{ margin: 0 }}>Fields Flagged in Last Return</h3>
            <span className="stc-customer-sub">
              Returned on {formatDateTime(latestReturn?.decidedAt)} ·{' '}
              {latestReturnItems.length - openCount} of {latestReturnItems.length} corrected
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
              <button type="button" className="stc-btn-doc cm-btn-return" onClick={() => onAction(DECISION_ACTIONS.RETURN)}>
                {RotateCcwIcon && <RotateCcwIcon size={15} />}
                <span>Return to Back Office</span>
              </button>
              <button type="button" className="stc-btn-doc cm-btn-reject" onClick={() => onAction(DECISION_ACTIONS.REJECT)}>
                {XCircleIcon && <XCircleIcon size={15} />}
                <span>Reject</span>
              </button>
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
  const review = useSectionReview(customerId);
  const { flags: pendingFlags, setFlags: setPendingFlags, addFlag } = review;

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
  const openReturnItemCount = latestReturnItems.filter((item) => !item.isResolved).length;

  const handleBack = useCallback(() => {
    if (location.key !== 'default') navigate(-1);
    else navigate(isPending ? ROUTES.PENDING : ROUTES.RECEIVED);
  }, [location.key, navigate, isPending]);

  const goToStep = (visibleStep) => {
    const next = new URLSearchParams(searchParams);
    next.set('step', String(Number(visibleStep)));
    setSearchParams(next);
  };
  const goToFinalAction = () => goToStep(FINAL_ACTION_STEP);

  const sectionReview = {
    canEdit: isPending,
    getStatus: review.getStatus,
    renderBar: ({ section, isEditing, onToggleEdit, onReject }) => (
      <SectionReviewBar
        section={section}
        status={review.getStatus(section.id)}
        flagCount={pendingFlags.filter((flag) => flag.stepId === section.id).length}
        isEditing={isEditing}
        canEdit={isPending}
        onToggleEdit={onToggleEdit}
        onApprove={() => review.approve(section.id)}
        onUnapprove={() => review.unapprove(section.id)}
        onReject={onReject}
        onClearFlags={() => review.clearSectionFlags(section.id)}
      />
    ),
  };

  const handleDecisionSubmit = async (action, payload) => {
    await action.call(customerId, payload);
    setActiveAction(null);
    review.reset();
    setSuccessMessage(action.successMessage);
    refetchQueue();
    loadDecisions();
  };

  return (
    <div className="cm-workspace">
      <div className="cm-review-bar">
        <div className="cm-review-bar-info">
          <strong>{queueApp ? getApplicationNo(queueApp) : `#${customerId}`}</strong>
          <span>{queueApp?.customerName || ''}</span>
          {statusMeta ? (
            <span className={`stc-pill ${statusMeta.className}`}>{statusMeta.label}</span>
          ) : (
            <span className="stc-pill stc-pill--progress">Not with Credit Manager</span>
          )}
          {openReturnItemCount > 0 && (
            <span className="cm-review-bar-warning">
              {AlertTriangleIcon && <AlertTriangleIcon size={14} />}
              {openReturnItemCount} flagged field{openReturnItemCount === 1 ? '' : 's'} still open
            </span>
          )}
          {pendingFlags.length > 0 && (
            <button type="button" className="cm-review-bar-warning cm-review-bar-flags" onClick={goToFinalAction}>
              {AlertTriangleIcon && <AlertTriangleIcon size={14} />}
              {pendingFlags.length} flag{pendingFlags.length === 1 ? '' : 's'} for Back Office (not sent)
            </button>
          )}
        </div>
        <div className="cm-review-bar-actions">
          <button type="button" className="stc-btn-doc stc-btn-doc--outline" onClick={() => setShowReport(true)}>
            {ShieldCheckIcon && <ShieldCheckIcon size={14} />}
            <span>Verification Report</span>
          </button>
          <button type="button" className="stc-btn-doc stc-btn-doc--primary" onClick={goToFinalAction}>
            {FileCheckIcon && <FileCheckIcon size={14} />}
            <span>{isPending ? 'Make Decision' : 'View Decision'}</span>
          </button>
        </div>
      </div>

      <CustomerVerification
        viewerRole="CreditManager"
        onBack={handleBack}
        backLabel="Back to Applications"
        onCreditManagerFlag={addFlag}
        sectionReview={sectionReview}
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
            loading={decisionLoading}
            error={decisionError}
            successMessage={successMessage}
            onDismissSuccess={() => setSuccessMessage('')}
            onAction={setActiveAction}
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
