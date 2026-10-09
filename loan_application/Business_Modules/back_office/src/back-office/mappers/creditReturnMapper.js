/**
 * creditReturnMapper.js
 * --------------------
 * Normalizes ApplicationCreditReturnItem records (fields the Credit Manager flagged when
 * returning an application). Shared by the Credit Manager and Back Office modules.
 */

import { getValue } from './hierarchyMapper';

export function mapCreditReturnItem(raw) {
  if (!raw) return null;
  const isResolved = getValue(raw, 'isResolved', 'IsResolved');
  return {
    id: getValue(raw, 'applicationCreditReturnItemId', 'ApplicationCreditReturnItemId', 'id', 'Id'),
    decisionId: getValue(raw, 'applicationCreditDecisionId', 'ApplicationCreditDecisionId'),
    agentCustomerId: getValue(raw, 'agentCustomerId', 'AgentCustomerId'),
    sectionCode: getValue(raw, 'sectionCode', 'SectionCode') || '',
    sectionName: getValue(raw, 'sectionName', 'SectionName') || '',
    fieldKey: getValue(raw, 'fieldKey', 'FieldKey') || '',
    fieldLabel: getValue(raw, 'fieldLabel', 'FieldLabel') || '',
    issue: getValue(raw, 'issue', 'Issue') || '',
    isResolved: isResolved === true || isResolved === 1 || String(isResolved).toLowerCase() === 'true',
    resolutionNote: getValue(raw, 'resolutionNote', 'ResolutionNote') || '',
    resolvedAt: getValue(raw, 'resolvedAt', 'ResolvedAt'),
    createdAt: getValue(raw, 'createdAt', 'CreatedAt'),
  };
}

/** Keeps only the items raised by the given decision (the latest return). */
export function itemsForDecision(items, decisionId) {
  if (decisionId == null) return items;
  return items.filter((item) => String(item.decisionId) === String(decisionId));
}
