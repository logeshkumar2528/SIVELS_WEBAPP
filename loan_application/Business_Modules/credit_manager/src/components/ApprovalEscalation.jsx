/**
 * ApprovalEscalation.jsx
 * --------------------
 * Approval-limit and escalation pieces of the Credit Manager decision panel.
 * The backend decides limits and escalations; these only display what it returns.
 */

import React from 'react';
import iconMap from '../../../back_office/src/back-office/config/iconMap';
import { parseDate } from '../utils/formatters';

export function formatRupees(amount) {
  const num = Number(amount);
  if (amount === null || amount === undefined || amount === '' || Number.isNaN(num)) return '—';
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

/** Why Approve is unavailable while an escalation waits for another role, or '' when it isn't. */
export function escalationBlockReason(pendingEscalation) {
  if (!pendingEscalation?.isWaitingForAnotherRole) return '';
  return `This approval has been escalated and is waiting for ${pendingEscalation.toRoleName || 'another role'}.`;
}

export function ApprovalRangeNote({ limit }) {
  if (!limit) return null;
  const range = `${formatRupees(limit.minimumApprovalAmount)} – ${
    limit.maximumApprovalAmount == null ? 'no upper limit' : formatRupees(limit.maximumApprovalAmount)
  }`;
  const above = limit.maximumApprovalAmount == null
    ? ''
    : limit.escalationRoleName
      ? `; above that escalates to ${limit.escalationRoleName}`
      : '; amounts above that cannot be approved';
  return (
    <p className="cm-approval-range" data-testid="approval-range">
      Your approval range{limit.roleName ? ` (${limit.roleName})` : ''}: <strong>{range}</strong>
      {above}.
    </p>
  );
}

export function EscalationBanner({ escalation, remarks }) {
  if (!escalation) return null;
  const AlertTriangleIcon = iconMap['AlertTriangle'];
  const ArrowUpRightIcon = iconMap['ArrowUpRight'];
  const toYou = escalation.canCurrentUserApprove;
  const Icon = toYou ? ArrowUpRightIcon : AlertTriangleIcon;
  const amountText = `${formatRupees(escalation.loanAmount)} is above the ${
    escalation.fromRoleName || 'approver'
  } limit of ${formatRupees(escalation.approvalLimit)}`;

  return (
    <div className={`cm-escalation-banner${toYou ? ' cm-escalation-banner--to-you' : ''}`} role="status">
      {Icon && <Icon size={18} style={{ flexShrink: 0 }} />}
      <div>
        <strong>
          {toYou
            ? `Escalated to you on ${formatDateTime(escalation.escalatedAt)}`
            : `Escalated to ${escalation.toRoleName || 'another role'} on ${formatDateTime(escalation.escalatedAt)}`}
        </strong>
        <p>
          {amountText}.{' '}
          {toYou
            ? 'You can approve it, reject it or return it to the Back Office.'
            : `Waiting for ${escalation.toRoleName || 'the escalation role'} to decide. You can still reject it or return it to the Back Office.`}
        </p>
        {remarks && <p className="cm-escalation-remarks">“{remarks}”</p>}
      </div>
    </div>
  );
}

export function EscalationHistoryCard({ escalations }) {
  if (!escalations?.length) return null;
  return (
    <div className="stc-submit-card">
      <div className="cm-issues-card-head">
        <h3 className="stc-docs-section-title" style={{ margin: 0 }}>Escalation History</h3>
        <span className="stc-customer-sub">
          {escalations.length} escalation{escalations.length === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="cm-escalation-history">
        {escalations.map((item) => (
          <li key={item.id}>
            <div className="cm-escalation-history-head">
              <strong>
                {item.fromRoleName}
                {item.fromStaffName ? ` (${item.fromStaffName})` : ''} → {item.toRoleName}
                {item.toStaffName ? ` (${item.toStaffName})` : ''}
              </strong>
              {item.isPending && <span className="stc-pill stc-pill--progress">Pending</span>}
            </div>
            <div className="stc-customer-sub">
              {formatDateTime(item.createdAt)} · {formatRupees(item.loanAmount)} above the limit of{' '}
              {formatRupees(item.approvalLimit)}
            </div>
            {item.remarks && <p className="cm-escalation-remarks">{item.remarks}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
