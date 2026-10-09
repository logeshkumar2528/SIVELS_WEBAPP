/**
 * creditReturnMapper.js
 * --------------------
 * Normalizes ApplicationCreditReturnItem records (fields the Credit Manager flagged when
 * returning an application). Shared by the Credit Manager and Back Office modules.
 *
 * Item lifecycle (ItemStatus):
 *   Open        -> returned to the Back Office, awaiting a fix
 *   Resolved    -> Back Office fixed it, application not yet resubmitted
 *   Resubmitted -> application resubmitted, awaiting Credit Manager review of the fix
 *   Accepted    -> Credit Manager accepted the fix
 *   Reopened    -> Credit Manager rejected the section again (superseded by a newer item)
 */

import { getValue } from './hierarchyMapper';
import { getReturnItemStep } from '../config/creditReturnFields';

export const RETURN_ITEM_STATUS = {
  OPEN: 'Open',
  RESOLVED: 'Resolved',
  RESUBMITTED: 'Resubmitted',
  ACCEPTED: 'Accepted',
  REOPENED: 'Reopened',
};

export const RETURN_ITEM_STATUS_META = {
  [RETURN_ITEM_STATUS.OPEN]: { label: 'Returned to Back Office', className: 'crp-pill--open' },
  [RETURN_ITEM_STATUS.RESOLVED]: { label: 'Resolved · Not Resubmitted', className: 'crp-pill--resolved' },
  [RETURN_ITEM_STATUS.RESUBMITTED]: { label: 'Resubmitted to Credit Manager', className: 'crp-pill--resubmitted' },
  [RETURN_ITEM_STATUS.ACCEPTED]: { label: 'Accepted', className: 'crp-pill--accepted' },
  [RETURN_ITEM_STATUS.REOPENED]: { label: 'Rejected Again', className: 'crp-pill--reopened' },
};

export const RETURN_EVENT_LABEL = {
  Returned: 'Returned by Credit Manager',
  Resolved: 'Resolved by Back Office',
  Resubmitted: 'Resubmitted to Credit Manager',
  Accepted: 'Accepted by Credit Manager',
  Reopened: 'Rejected again by Credit Manager',
};

const ROLE_LABEL = { BackOffice: 'Back Office', CreditManager: 'Credit Manager' };

export function formatActor(role, userId) {
  const label = ROLE_LABEL[role] || role || 'User';
  return userId != null && userId !== '' ? `${label} #${userId}` : label;
}

function mapEvent(raw) {
  if (!raw) return null;
  return {
    id: getValue(raw, 'applicationCreditReturnItemEventId', 'ApplicationCreditReturnItemEventId', 'id', 'Id'),
    eventType: getValue(raw, 'eventType', 'EventType') || '',
    fromStatus: getValue(raw, 'fromItemStatus', 'FromItemStatus') || null,
    toStatus: getValue(raw, 'toItemStatus', 'ToItemStatus') || '',
    remarks: getValue(raw, 'remarks', 'Remarks') || '',
    performedByUserId: getValue(raw, 'performedByUserId', 'PerformedByUserId'),
    performedByRole: getValue(raw, 'performedByRole', 'PerformedByRole') || '',
    createdAt: getValue(raw, 'createdAt', 'CreatedAt'),
  };
}

export function mapCreditReturnItem(raw) {
  if (!raw) return null;
  const rawResolved = getValue(raw, 'isResolved', 'IsResolved');
  const legacyResolved =
    rawResolved === true || rawResolved === 1 || String(rawResolved).toLowerCase() === 'true';
  const itemStatus =
    getValue(raw, 'itemStatus', 'ItemStatus') ||
    (legacyResolved ? RETURN_ITEM_STATUS.RESOLVED : RETURN_ITEM_STATUS.OPEN);
  const events = getValue(raw, 'events', 'Events');

  return {
    id: getValue(raw, 'applicationCreditReturnItemId', 'ApplicationCreditReturnItemId', 'id', 'Id'),
    decisionId: getValue(raw, 'applicationCreditDecisionId', 'ApplicationCreditDecisionId'),
    previousItemId: getValue(raw, 'previousReturnItemId', 'PreviousReturnItemId'),
    agentCustomerId: getValue(raw, 'agentCustomerId', 'AgentCustomerId'),
    sectionCode: getValue(raw, 'sectionCode', 'SectionCode') || '',
    sectionName: getValue(raw, 'sectionName', 'SectionName') || '',
    fieldKey: getValue(raw, 'fieldKey', 'FieldKey') || '',
    fieldLabel: getValue(raw, 'fieldLabel', 'FieldLabel') || '',
    issue: getValue(raw, 'issue', 'Issue') || '',
    itemStatus,
    isResolved: itemStatus !== RETURN_ITEM_STATUS.OPEN,
    raisedByUserId: getValue(raw, 'raisedByUserId', 'RaisedByUserId'),
    raisedByRole: getValue(raw, 'raisedByRole', 'RaisedByRole') || 'CreditManager',
    raisedAt: getValue(raw, 'raisedAt', 'RaisedAt', 'createdAt', 'CreatedAt'),
    resolutionNote: getValue(raw, 'resolutionNote', 'ResolutionNote') || '',
    resolvedByUserId: getValue(raw, 'resolvedByUserId', 'ResolvedByUserId'),
    resolvedByRole: getValue(raw, 'resolvedByRole', 'ResolvedByRole') || '',
    resolvedAt: getValue(raw, 'resolvedAt', 'ResolvedAt'),
    resubmittedAt: getValue(raw, 'resubmittedAt', 'ResubmittedAt'),
    reviewRemarks: getValue(raw, 'reviewRemarks', 'ReviewRemarks') || '',
    reviewedByUserId: getValue(raw, 'reviewedByUserId', 'ReviewedByUserId'),
    reviewedByRole: getValue(raw, 'reviewedByRole', 'ReviewedByRole') || '',
    reviewedAt: getValue(raw, 'reviewedAt', 'ReviewedAt'),
    createdAt: getValue(raw, 'createdAt', 'CreatedAt', 'raisedAt', 'RaisedAt'),
    events: Array.isArray(events) ? events.map(mapEvent).filter(Boolean) : [],
  };
}

/** Keeps only the items raised by the given decision (the latest return). */
export function itemsForDecision(items, decisionId) {
  if (decisionId == null) return items;
  return items.filter((item) => String(item.decisionId) === String(decisionId));
}

/** Status that requires action from the given viewer role. */
export function getAttentionStatus(viewerRole) {
  return viewerRole === 'CreditManager' ? RETURN_ITEM_STATUS.RESUBMITTED : RETURN_ITEM_STATUS.OPEN;
}

export function itemNeedsAttention(item, viewerRole) {
  return !!item && item.itemStatus === getAttentionStatus(viewerRole);
}

/** Items grouped by the workspace step (internal step id) that shows them. */
export function groupReturnItemsByStep(items = []) {
  return items.reduce((acc, item) => {
    const { stepId } = getReturnItemStep(item);
    (acc[stepId] ||= []).push(item);
    return acc;
  }, {});
}

/**
 * Sections that need the viewer's attention, in workspace order:
 * [{ stepId, visibleNum, sectionName, count }]
 */
export function getAttentionSections(items = [], viewerRole) {
  const byStep = new Map();
  items.forEach((item) => {
    if (!itemNeedsAttention(item, viewerRole)) return;
    const { stepId, visibleNum } = getReturnItemStep(item);
    const entry = byStep.get(stepId) || { stepId, visibleNum, sectionName: item.sectionName, count: 0 };
    entry.count += 1;
    byStep.set(stepId, entry);
  });
  return [...byStep.values()].sort((a, b) => Number(a.visibleNum) - Number(b.visibleNum));
}
