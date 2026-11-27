import { extractWorkflowStatus } from '../../../../Core/src/utils/applicationWorkflowStatus';

export const RM_WORKFLOW_CODES = Object.freeze({
  NEW: 'NEW_APPLICATION',
  RM_PENDING: 'RM_VERIFICATION_PENDING',
  RM_IN_PROGRESS: 'RM_VERIFICATION_IN_PROGRESS',
  RETURNED_TO_RM: 'RETURNED_TO_RM_CORRECTION_PENDING',
  BO_PENDING: 'BO_VERIFICATION_PENDING',
  BO_IN_PROGRESS: 'BO_VERIFICATION_IN_PROGRESS',
  CM_APPROVAL_PENDING: 'CM_APPROVAL_PENDING',
  CM_REVIEW_IN_PROGRESS: 'CM_REVIEW_IN_PROGRESS',
  CH_APPROVAL_PENDING: 'CH_APPROVAL_PENDING',
  CH_REVIEW_IN_PROGRESS: 'CH_REVIEW_IN_PROGRESS',
  CREDIT_APPROVED: 'CREDIT_APPROVED_MAKER_PENDING',
  MAKER_IN_PROGRESS: 'MAKER_VERIFICATION_IN_PROGRESS',
  APPLICATION_REJECTED: 'APPLICATION_REJECTED',
  RETURNED_TO_BO: 'RETURNED_TO_BO_CORRECTION_PENDING',
});

const DOWNSTREAM_CODES = new Set([
  RM_WORKFLOW_CODES.BO_PENDING,
  RM_WORKFLOW_CODES.BO_IN_PROGRESS,
  RM_WORKFLOW_CODES.CM_APPROVAL_PENDING,
  RM_WORKFLOW_CODES.CM_REVIEW_IN_PROGRESS,
  RM_WORKFLOW_CODES.CH_APPROVAL_PENDING,
  RM_WORKFLOW_CODES.CH_REVIEW_IN_PROGRESS,
  RM_WORKFLOW_CODES.CREDIT_APPROVED,
  RM_WORKFLOW_CODES.MAKER_IN_PROGRESS,
  RM_WORKFLOW_CODES.APPLICATION_REJECTED,
  RM_WORKFLOW_CODES.RETURNED_TO_BO,
]);

const STATUS_FILTER_CODES = {
  New: new Set([RM_WORKFLOW_CODES.NEW]),
  Pending: new Set([RM_WORKFLOW_CODES.RM_PENDING, RM_WORKFLOW_CODES.RM_IN_PROGRESS]),
  'Logged to HO': DOWNSTREAM_CODES,
  'Under Review': new Set([
    RM_WORKFLOW_CODES.CM_APPROVAL_PENDING,
    RM_WORKFLOW_CODES.CM_REVIEW_IN_PROGRESS,
    RM_WORKFLOW_CODES.CH_APPROVAL_PENDING,
    RM_WORKFLOW_CODES.CH_REVIEW_IN_PROGRESS,
    RM_WORKFLOW_CODES.MAKER_IN_PROGRESS,
  ]),
  Approved: new Set([RM_WORKFLOW_CODES.CREDIT_APPROVED]),
  Rejected: new Set([RM_WORKFLOW_CODES.APPLICATION_REJECTED]),
  Returned: new Set([RM_WORKFLOW_CODES.RETURNED_TO_RM, RM_WORKFLOW_CODES.RETURNED_TO_BO]),
};

export function getRmWorkflowStatus(record) {
  return extractWorkflowStatus(record);
}

export function getRmWorkflowStatusLabel(workflowStatus) {
  return workflowStatus?.workflowStatusName || 'Status unavailable';
}

export function isRmDownstreamStatus(workflowStatus) {
  return DOWNSTREAM_CODES.has(workflowStatus?.workflowStatusCode);
}

export function matchesRmStatusFilter(workflowStatus, filterValue) {
  if (filterValue === 'All' || filterValue === 'All Status') return true;
  return STATUS_FILTER_CODES[filterValue]?.has(workflowStatus?.workflowStatusCode) || false;
}

export function getRmStatusVariant(workflowStatus) {
  const code = workflowStatus?.workflowStatusCode;
  if (code === RM_WORKFLOW_CODES.NEW) return 'new';
  if (code === RM_WORKFLOW_CODES.RETURNED_TO_RM || code === RM_WORKFLOW_CODES.RETURNED_TO_BO || code === RM_WORKFLOW_CODES.APPLICATION_REJECTED) return 'returned';
  if (code === RM_WORKFLOW_CODES.CREDIT_APPROVED) return 'approved';
  if (code && DOWNSTREAM_CODES.has(code)) return 'review';
  if (code === RM_WORKFLOW_CODES.RM_PENDING || code === RM_WORKFLOW_CODES.RM_IN_PROGRESS) return 'review';
  return 'inactive';
}
