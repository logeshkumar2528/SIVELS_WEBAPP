/**
 * creditMapper.js
 * --------------------
 * Normalizes raw backend records into Credit Manager UI structures.
 */

import { getValue, mapCustomer } from '../../../back_office/src/back-office/mappers/hierarchyMapper';

/**
 * Application workflow status codes (AgentAddCustomer.status).
 * Back Office moves an application to PENDING via send-to-credit-manager.
 * Return-to-back-office moves it back to LOGGED_TO_HO, which leaves this queue.
 * Status 6 means "Returned to RM" and is owned by the Back Office.
 */
export const CM_STATUS = {
  LOGGED_TO_HO: 2,
  PENDING: 3,
  APPROVED: 4,
  REJECTED: 5,
};

export const CM_STATUS_META = {
  [CM_STATUS.PENDING]: { label: 'Pending Review', className: 'stc-pill--pending', color: '#f59e0b' },
  [CM_STATUS.APPROVED]: { label: 'Approved', className: 'stc-pill--verified', color: '#0F7A4C' },
  [CM_STATUS.REJECTED]: { label: 'Rejected', className: 'cm-pill--rejected', color: '#dc2626' },
};

export const CREDIT_DECISION = {
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  RETURNED: 'ReturnedToBackOffice',
};

export const CREDIT_DECISION_META = {
  [CREDIT_DECISION.APPROVED]: { label: 'Approved', className: 'stc-pill--verified' },
  [CREDIT_DECISION.REJECTED]: { label: 'Rejected', className: 'cm-pill--rejected' },
  [CREDIT_DECISION.RETURNED]: { label: 'Returned to Back Office', className: 'stc-pill--progress' },
};

export function isCreditManagerStatus(status) {
  return Object.prototype.hasOwnProperty.call(CM_STATUS_META, Number(status));
}

export function mapCreditApplication(raw) {
  const customer = mapCustomer(raw);
  if (!customer) return null;

  const status = Number(customer.status);
  const statusUpdatedAt = getValue(
    raw,
    'statusChangedAt',
    'StatusChangedAt',
    'statusUpdatedAt',
    'StatusUpdatedAt',
    'modifiedAt',
    'ModifiedAt',
    'modifiedDate',
    'ModifiedDate',
    'updatedAt',
    'UpdatedAt'
  ) || customer.createdAt;
  const remarks = getValue(
    raw,
    'rejectionReason',
    'RejectionReason',
    'statusRemarks',
    'StatusRemarks',
    'remarks',
    'Remarks'
  ) || '';

  const loanProductName = getValue(raw, 'loanProductName', 'LoanProductName');

  return {
    ...customer,
    loanType: loanProductName || customer.loanType,
    status,
    statusUpdatedAt,
    remarks,
  };
}

export function mapCreditDecision(raw) {
  if (!raw) return null;
  const toNumber = (value) => (value === null || value === undefined || value === '' ? null : Number(value));

  return {
    id: getValue(raw, 'applicationCreditDecisionId', 'ApplicationCreditDecisionId', 'id', 'Id'),
    agentCustomerId: getValue(raw, 'agentCustomerId', 'AgentCustomerId'),
    creditManagerId: getValue(raw, 'creditManagerId', 'CreditManagerId'),
    decision: getValue(raw, 'decision', 'Decision') || '',
    sanctionedLoanAmount: toNumber(getValue(raw, 'sanctionedLoanAmount', 'SanctionedLoanAmount')),
    sanctionedROI: toNumber(getValue(raw, 'sanctionedROI', 'SanctionedROI', 'sanctionedRoi')),
    sanctionedTenureMonths: toNumber(getValue(raw, 'sanctionedTenureMonths', 'SanctionedTenureMonths')),
    conditions: getValue(raw, 'conditions', 'Conditions') || '',
    remarks: getValue(raw, 'remarks', 'Remarks') || '',
    decidedAt: getValue(raw, 'decidedAt', 'DecidedAt', 'createdAt', 'CreatedAt'),
  };
}

export function mapWorkflowHistoryEntry(raw) {
  if (!raw) return null;
  return {
    id: getValue(raw, 'applicationWorkflowHistoryId', 'ApplicationWorkflowHistoryId', 'id', 'Id'),
    action: getValue(raw, 'action', 'Action', 'actionName', 'ActionName') || '',
    fromStatus: getValue(raw, 'fromStatus', 'FromStatus'),
    toStatus: getValue(raw, 'toStatus', 'ToStatus'),
    performedByRole: getValue(raw, 'performedByRole', 'PerformedByRole') || '',
    performedByName: getValue(raw, 'performedByName', 'PerformedByName', 'performedByUserName', 'PerformedByUserName') || '',
    remarks: getValue(raw, 'remarks', 'Remarks') || '',
    performedAt: getValue(raw, 'performedAt', 'PerformedAt', 'createdAt', 'CreatedAt', 'actionDate', 'ActionDate'),
  };
}

export function mapCreditManagerProfile(raw) {
  if (!raw) return null;
  const source = raw.creditManager || raw.data || raw;

  const creditManagerId = getValue(source, 'creditManagerId', 'CreditManagerId', 'id', 'Id');
  const creditManagerCode = getValue(
    source,
    'creditManagerCode',
    'CreditManagerCode',
    'employeeCode',
    'EmployeeCode',
    'code',
    'Code'
  ) || 'Not Available';
  const fullName = getValue(source, 'fullName', 'FullName', 'name', 'Name', 'userName', 'UserName') || 'Not Available';
  const mobileNumber = getValue(source, 'mobileNumber', 'MobileNumber', 'mobile', 'Mobile', 'phoneNumber', 'PhoneNumber') || '';
  const emailAddress = getValue(source, 'emailAddress', 'EmailAddress', 'email', 'Email') || 'Not Available';
  const branch = getValue(source, 'branch', 'Branch', 'branchName', 'BranchName') || 'Not Available';
  const isActive = getValue(source, 'isActive', 'IsActive', 'status', 'Status') ?? true;

  return {
    id: creditManagerId != null ? String(creditManagerId) : '',
    creditManagerId,
    creditManagerCode,
    fullName,
    mobileNumber: mobileNumber ? String(mobileNumber).replace(/\D/g, '').slice(-10) : 'Not Available',
    emailAddress,
    branch,
    role: 'Credit Manager',
    status: isActive ? 'Active' : 'Inactive',
    isActive: Boolean(isActive),
    raw: source,
  };
}
