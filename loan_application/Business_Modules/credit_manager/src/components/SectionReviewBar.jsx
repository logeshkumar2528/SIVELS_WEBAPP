/**
 * SectionReviewBar.jsx
 * --------------------
 * Edit / Approve / Reject bar shown at the top of every section in the Credit Manager workspace.
 * Approve is blocked while the section is flagged or a Back Office resolution awaits review.
 */

import React from 'react';
import iconMap from '../../../back_office/src/back-office/config/iconMap';

export default function SectionReviewBar({
  section,
  status,
  flagCount,
  awaitingReviewCount = 0,
  isEditing,
  canEdit,
  onToggleEdit,
  onApprove,
  onUnapprove,
  onReject,
  onClearFlags,
}) {
  const EditIcon = iconMap['Edit3'];
  const CheckCircleIcon = iconMap['CheckCircle'];
  const XCircleIcon = iconMap['XCircle'];
  const isApproved = status === 'APPROVED';
  const isFlagged = status === 'FLAGGED';
  const approveBlockedTitle = isFlagged
    ? 'Clear this section’s flags before approving it.'
    : awaitingReviewCount > 0
      ? 'Accept or reject the Back Office resolution for this section first.'
      : undefined;

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
                : awaitingReviewCount > 0
                  ? `${awaitingReviewCount} Back Office resolution${awaitingReviewCount === 1 ? '' : 's'} to review below`
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
              disabled={!!approveBlockedTitle}
              title={approveBlockedTitle}
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
