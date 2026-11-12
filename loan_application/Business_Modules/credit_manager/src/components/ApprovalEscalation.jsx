/**
 * ApprovalEscalation.jsx
 * --------------------
 * Approval-limit and forwarding pieces of the Credit Manager decision panel.
 * The backend decides limits and who holds a forwarded application; these only display what it returns.
 */

import React from 'react';
import iconMap from '../../../back_office/src/back-office/config/iconMap';
import { APPROVAL_OUTCOME } from '../mappers/creditMapper';
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

/** "₹7,50,001 – ₹25,00,000", or "₹7,50,001 – no upper limit". */
export function formatApprovalRange(minimum, maximum) {
  const from = minimum == null ? formatRupees(0) : formatRupees(minimum);
  return `${from} – ${maximum == null ? 'no upper limit' : formatRupees(maximum)}`;
}

const FORWARD_HINT = 'Forward it to an approving authority.';

/** Why the current user can't approve this amount, or '' when it is within their range. */
export function limitExceededReason(check) {
  if (!check || check.loading) return '';
  if (check.outcome === APPROVAL_OUTCOME.ESCALATE) {
    return check.maximumApprovalAmount == null
      ? `This amount exceeds your approval limit. ${FORWARD_HINT}`
      : `${formatRupees(check.amount)} exceeds your approval limit of ${formatRupees(check.maximumApprovalAmount)}. ${FORWARD_HINT}`;
  }
  if (check.outcome === APPROVAL_OUTCOME.BLOCKED) {
    const reason = String(check.message || 'This amount is outside your approval range.').trim();
    return `${/[.!?]$/.test(reason) ? reason : `${reason}.`} ${FORWARD_HINT}`;
  }
  return '';
}

function amountVsLimit(loanAmount, approvalLimit, roleName) {
  if (loanAmount != null && approvalLimit != null && loanAmount > approvalLimit) {
    return `${formatRupees(loanAmount)} is above the ${roleName || 'sender'} limit of ${formatRupees(approvalLimit)}`;
  }
  return `Loan amount ${formatRupees(loanAmount)}`;
}

export function ApprovalRangeNote({ limit }) {
  if (!limit) return null;
  const above = limit.maximumApprovalAmount == null ? '' : '; above that, forward it to an approving authority';
  return (
    <p className="cm-approval-range" data-testid="approval-range">
      Your approval range{limit.roleName ? ` (${limit.roleName})` : ''}:{' '}
      <strong>{formatApprovalRange(limit.minimumApprovalAmount, limit.maximumApprovalAmount)}</strong>
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
  const toRole = escalation.toRoleName || 'another role';
  const from = escalation.fromRoleName ? ` by ${escalation.fromRoleName}` : '';

  return (
    <div className={`cm-escalation-banner${toYou ? ' cm-escalation-banner--to-you' : ''}`} role="status">
      {Icon && <Icon size={18} style={{ flexShrink: 0 }} />}
      <div>
        <strong>
          {toYou
            ? `Forwarded to you${from} on ${formatDateTime(escalation.escalatedAt)}`
            : `Forwarded to ${toRole} on ${formatDateTime(escalation.escalatedAt)}`}
        </strong>
        <p>
          {amountVsLimit(escalation.loanAmount, escalation.approvalLimit, escalation.fromRoleName)}.{' '}
          {toYou
            ? 'You can approve it if it is within your approval range, forward it to a higher authority, reject it or return it to the Back Office.'
            : `Waiting for ${toRole} to decide. This application is read-only for you.`}
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
        <h3 className="stc-docs-section-title" style={{ margin: 0 }}>Forward History</h3>
        <span className="stc-customer-sub">
          {escalations.length} forward{escalations.length === 1 ? '' : 's'}
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
              {formatDateTime(item.createdAt)} · {amountVsLimit(item.loanAmount, item.approvalLimit, item.fromRoleName)}
            </div>
            {item.remarks && <p className="cm-escalation-remarks">{item.remarks}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
