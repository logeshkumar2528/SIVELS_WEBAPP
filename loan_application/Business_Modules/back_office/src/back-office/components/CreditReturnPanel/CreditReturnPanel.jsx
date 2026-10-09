/**
 * CreditReturnPanel.jsx
 * --------------------
 * Section-level view of what the Credit Manager returned, shared by the Back Office and Credit
 * Manager workspaces.
 *
 *   - CreditReturnAttentionStrip: red markers for every section that needs the viewer's action.
 *     Clicking a marker opens that section.
 *   - CreditReturnSectionPanel: shown above the open section. Lists the Credit Manager remarks,
 *     the Back Office resolution, the Credit Manager review and the full event history.
 *     Back Office resolves Open items; Credit Manager accepts Resubmitted items. Remarks are
 *     always mandatory and previous remarks are read-only.
 */

import React, { useState } from 'react';
import iconMap from '../../config/iconMap';
import {
  RETURN_ITEM_STATUS,
  RETURN_ITEM_STATUS_META,
  RETURN_EVENT_LABEL,
  formatActor,
  itemNeedsAttention,
} from '../../mappers/creditReturnMapper';
import './CreditReturnPanel.css';

export const RETURN_REMARKS_MAX = 2000;

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getApiError(err, fallback) {
  const data = err?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  return data?.message || data?.title || err?.message || fallback;
}

const ACTION_COPY = {
  BackOffice: {
    label: 'Resolution remarks',
    placeholder: 'Describe what was corrected, e.g. Legal report re-uploaded with the correct owner name.',
    button: 'Resolve',
    saving: 'Resolving...',
    required: 'Resolution remarks are required.',
  },
  CreditManager: {
    label: 'Review remarks',
    placeholder: 'Confirm the correction you verified, e.g. Asset valuation now matches the report.',
    button: 'Accept Resolution',
    saving: 'Accepting...',
    required: 'Review remarks are required.',
  },
};

export function CreditReturnAttentionStrip({ sections, viewerRole, activeStepId, onOpen }) {
  if (!sections || sections.length === 0) return null;
  const AlertTriangleIcon = iconMap['AlertTriangle'];
  const total = sections.reduce((sum, s) => sum + s.count, 0);
  const message =
    viewerRole === 'CreditManager'
      ? `${total} Back Office resolution${total === 1 ? '' : 's'} awaiting your review`
      : `${total} item${total === 1 ? '' : 's'} returned by the Credit Manager need${total === 1 ? 's' : ''} correction`;

  return (
    <div className="crp-strip" role="region" aria-label="Sections requiring action">
      <div className="crp-strip-head">
        {AlertTriangleIcon && <AlertTriangleIcon size={16} />}
        <strong>{message}</strong>
      </div>
      <div className="crp-strip-sections">
        {sections.map((section) => (
          <button
            key={section.stepId}
            type="button"
            className={`crp-strip-btn${section.stepId === activeStepId ? ' is-active' : ''}`}
            onClick={() => onOpen(section.stepId)}
            aria-label={`Open ${section.sectionName}: ${section.count} item${section.count === 1 ? '' : 's'} need action`}
          >
            <span className="crp-indicator" aria-hidden="true" />
            <span className="crp-strip-num">{section.visibleNum}</span>
            <span>{section.sectionName}</span>
            <span className="crp-strip-count">{section.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const meta = RETURN_ITEM_STATUS_META[status] || { label: status, className: 'crp-pill--resolved' };
  return <span className={`crp-pill ${meta.className}`}>{meta.label}</span>;
}

function EntryRow({ title, actor, at, children, tone }) {
  return (
    <div className={`crp-entry crp-entry--${tone}`}>
      <div className="crp-entry-head">
        <span className="crp-entry-title">{title}</span>
        <span className="crp-entry-meta">
          {actor} · {formatDateTime(at)}
        </span>
      </div>
      <p className="crp-entry-text">{children}</p>
    </div>
  );
}

function ItemHistory({ events }) {
  const [open, setOpen] = useState(false);
  if (!events || events.length === 0) return null;
  return (
    <div className="crp-history">
      <button type="button" className="crp-link-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? 'Hide history' : `Show history (${events.length})`}
      </button>
      {open && (
        <ol className="crp-timeline">
          {events.map((event, index) => (
            <li key={event.id ?? index}>
              <div className="crp-timeline-head">
                <strong>{RETURN_EVENT_LABEL[event.eventType] || event.eventType}</strong>
                <span>
                  {formatActor(event.performedByRole, event.performedByUserId)} · {formatDateTime(event.createdAt)}
                </span>
              </div>
              {event.remarks && <p>{event.remarks}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ItemActionForm({ item, viewerRole, onSubmit }) {
  const copy = ACTION_COPY[viewerRole] || ACTION_COPY.BackOffice;
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fieldId = `crp-remarks-${item.id}`;

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError(copy.required);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(item, trimmed);
      setText('');
    } catch (err) {
      setError(getApiError(err, 'Unable to save. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="crp-action">
      <label htmlFor={fieldId} className="crp-action-label">
        {copy.label} <span className="crp-required">*</span>
      </label>
      <textarea
        id={fieldId}
        rows={2}
        maxLength={RETURN_REMARKS_MAX}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError('');
        }}
        placeholder={copy.placeholder}
        disabled={saving}
        className={error ? 'is-invalid' : ''}
        aria-invalid={!!error}
      />
      <div className="crp-action-foot">
        {error ? <small className="crp-error" role="alert">{error}</small> : <span />}
        <button type="button" className="crp-btn" onClick={handleSubmit} disabled={saving}>
          {saving ? copy.saving : copy.button}
        </button>
      </div>
    </div>
  );
}

function ReturnItemCard({ item, viewerRole, canAct, onSubmit }) {
  const needsAction = itemNeedsAttention(item, viewerRole);

  return (
    <li className={`crp-item${needsAction ? ' needs-action' : ''}`}>
      <div className="crp-item-head">
        <div className="crp-item-title">
          {needsAction && <span className="crp-indicator" aria-label="Action required" />}
          <strong>{item.fieldLabel || item.sectionName}</strong>
        </div>
        <StatusPill status={item.itemStatus} />
      </div>

      <EntryRow
        tone="issue"
        title="Credit Manager remarks"
        actor={formatActor(item.raisedByRole, item.raisedByUserId)}
        at={item.raisedAt}
      >
        {item.issue}
      </EntryRow>

      {item.resolutionNote && (
        <EntryRow
          tone="resolution"
          title="Back Office resolution"
          actor={formatActor(item.resolvedByRole || 'BackOffice', item.resolvedByUserId)}
          at={item.resolvedAt}
        >
          {item.resolutionNote}
        </EntryRow>
      )}

      {item.resubmittedAt && (
        <p className="crp-note">Resubmitted to Credit Manager on {formatDateTime(item.resubmittedAt)}</p>
      )}

      {item.reviewRemarks && (
        <EntryRow
          tone="review"
          title="Credit Manager review"
          actor={formatActor(item.reviewedByRole || 'CreditManager', item.reviewedByUserId)}
          at={item.reviewedAt}
        >
          {item.reviewRemarks}
        </EntryRow>
      )}

      {needsAction && canAct && <ItemActionForm item={item} viewerRole={viewerRole} onSubmit={onSubmit} />}

      <ItemHistory events={item.events} />
    </li>
  );
}

const byNewest = (a, b) =>
  (new Date(b.raisedAt || 0).getTime() || 0) - (new Date(a.raisedAt || 0).getTime() || 0) ||
  Number(b.id || 0) - Number(a.id || 0);

export function CreditReturnSectionPanel({
  sectionTitle,
  items,
  viewerRole = 'BackOffice',
  canAct = false,
  lockedReason = '',
  onSubmit,
  panelRef,
}) {
  const [showPrevious, setShowPrevious] = useState(false);
  if (!items || items.length === 0) return null;

  const current = items.filter((item) => item.itemStatus !== RETURN_ITEM_STATUS.REOPENED).sort(byNewest);
  const previous = items.filter((item) => item.itemStatus === RETURN_ITEM_STATUS.REOPENED).sort(byNewest);
  const attentionCount = current.filter((item) => itemNeedsAttention(item, viewerRole)).length;
  const RotateCcwIcon = iconMap['RotateCcw'];

  return (
    <section
      ref={panelRef}
      className={`crp-panel${attentionCount ? ' needs-action' : ''}`}
      aria-label={`${sectionTitle} returned by Credit Manager`}
      data-cm-section-bar
    >
      <div className="crp-panel-head">
        <div className="crp-panel-title">
          {attentionCount > 0 && <span className="crp-indicator crp-indicator--lg" aria-hidden="true" />}
          {RotateCcwIcon && !attentionCount && <RotateCcwIcon size={16} />}
          <div>
            <h3>{sectionTitle} · Returned by Credit Manager</h3>
            <span>
              {attentionCount > 0
                ? viewerRole === 'CreditManager'
                  ? `${attentionCount} resolution${attentionCount === 1 ? '' : 's'} awaiting your review`
                  : `${attentionCount} item${attentionCount === 1 ? '' : 's'} to resolve`
                : 'No action required from you'}
            </span>
          </div>
        </div>
      </div>

      {attentionCount > 0 && !canAct && lockedReason && <p className="crp-locked">{lockedReason}</p>}

      <ul className="crp-items">
        {current.map((item) => (
          <ReturnItemCard key={item.id} item={item} viewerRole={viewerRole} canAct={canAct} onSubmit={onSubmit} />
        ))}
      </ul>

      {previous.length > 0 && (
        <div className="crp-previous">
          <button
            type="button"
            className="crp-link-btn"
            onClick={() => setShowPrevious((v) => !v)}
            aria-expanded={showPrevious}
          >
            {showPrevious ? 'Hide previous rejections' : `Previous rejections (${previous.length})`}
          </button>
          {showPrevious && (
            <ul className="crp-items crp-items--previous">
              {previous.map((item) => (
                <ReturnItemCard key={item.id} item={item} viewerRole={viewerRole} canAct={false} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export default CreditReturnSectionPanel;
