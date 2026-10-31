/**
 * creditMapper.js
 * --------------------
 * Normalizes raw backend records into Credit Manager UI structures.
 */

import { getValue, mapCustomer } from '../../../back_office/src/back-office/mappers/hierarchyMapper';
import { resolveApplicationOwnership } from '../../../../Core/src/utils/ownershipHelper';

function isPresent(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function isDisplayName(value) {
  const text = String(value ?? '').trim();
  return Boolean(text) && text !== '—' && text !== '0' && !/^\d+$/.test(text) && !/\bid\b/i.test(text);
}

function isNumericId(value) {
  return isPresent(value) && /^\d+$/.test(String(value).trim()) && String(value).trim() !== '0';
}

function resolveLocation(source, config, lookupData) {
  const rawId = config.idKeys.map((key) => source?.[key]).find(isNumericId);
  const name = config.nameKeys.map((key) => source?.[key]).find(isDisplayName);
  if (name !== undefined) return { id: rawId ?? null, name: String(name).trim() };

  const match = rawId == null
    ? null
    : (lookupData?.[config.collection] || []).find((item) => {
      const itemId = config.itemIdKeys.map((key) => item?.[key]).find(isPresent);
      return itemId !== undefined && String(itemId).trim() === String(rawId).trim();
    });
  const resolvedName = match && config.itemNameKeys.map((key) => match?.[key]).find(isDisplayName);
  return { id: rawId ?? null, name: resolvedName ? String(resolvedName).trim() : '' };
}

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

export function mapCreditApplication(raw, agentsById = {}, rmsById = {}) {
  const customer = mapCustomer(raw);
  if (!customer) return null;

  const ownership = resolveApplicationOwnership(customer, agentsById, rmsById);

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
    agentId: ownership.agentId ?? customer.agentId,
    agentName: ownership.agentName && ownership.agentName !== '—' ? ownership.agentName : (customer.agentName || '—'),
    rmId: ownership.rmId ?? customer.rmId,
    rmName: ownership.rmName && ownership.rmName !== '—' ? ownership.rmName : (customer.rmName || '—'),
    sourceType: ownership.sourceType,
    isDirectRm: ownership.isDirectRm,
    isAgentCreated: ownership.isAgentCreated,
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

export function mapCreditManagerProfile(raw, lookupData = {}) {
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
  const department = getValue(source, 'department', 'Department') || 'Credit & Risk';
  const dateOfBirth = getValue(source, 'dateOfBirth', 'DateOfBirth', 'dob', 'DOB') || null;
  const dateJoined = getValue(source, 'dateJoined', 'DateJoined', 'createdAt', 'CreatedAt', 'joiningDate', 'JoiningDate') || null;
  const genderId = getValue(source, 'genderId', 'GenderId');
  const rawGenderName = getValue(source, 'genderName', 'GenderName', 'gender', 'Gender');
  const gender = rawGenderName || (genderId === 1 || genderId === 6 ? 'Male' : genderId === 2 || genderId === 7 ? 'Female' : genderId === 3 ? 'Other' : '');
  const address = getValue(source, 'address', 'Address') || '';
  const country = resolveLocation(source, {
    nameKeys: ['countryName', 'CountryName', 'country', 'Country'],
    idKeys: ['countryId', 'CountryId', 'country', 'Country'],
    collection: 'countries',
    itemIdKeys: ['countryId', 'CountryId', 'id', 'Id'],
    itemNameKeys: ['countryName', 'CountryName', 'name', 'Name'],
  }, lookupData);
  const state = resolveLocation(source, {
    nameKeys: ['stateName', 'StateName', 'state', 'State'],
    idKeys: ['stateId', 'StateId', 'state', 'State'],
    collection: 'states',
    itemIdKeys: ['stateId', 'StateId', 'id', 'Id'],
    itemNameKeys: ['stateName', 'StateName', 'name', 'Name'],
  }, lookupData);
  const district = resolveLocation(source, {
    nameKeys: ['districtName', 'DistrictName', 'district', 'District'],
    idKeys: ['districtId', 'DistrictId', 'district', 'District'],
    collection: 'districts',
    itemIdKeys: ['districtId', 'DistrictId', 'id', 'Id'],
    itemNameKeys: ['districtName', 'DistrictName', 'name', 'Name'],
  }, lookupData);
  const city = resolveLocation(source, {
    nameKeys: ['cityName', 'CityName', 'city', 'City'],
    idKeys: ['cityId', 'CityId', 'city', 'City'],
    collection: 'cities',
    itemIdKeys: ['cityId', 'CityId', 'id', 'Id'],
    itemNameKeys: ['cityName', 'CityName', 'name', 'Name'],
  }, lookupData);
  const rawPincode = getValue(source, 'pincode', 'Pincode', 'pinCode', 'PinCode', 'postalCode', 'PostalCode');
  const pincode = isPresent(rawPincode) && String(rawPincode).trim() !== '0' ? String(rawPincode).trim() : '';

  return {
    id: creditManagerId != null ? String(creditManagerId) : '',
    creditManagerId,
    creditManagerCode,
    fullName,
    mobileNumber: mobileNumber ? String(mobileNumber).replace(/\D/g, '').slice(-10) : 'Not Available',
    emailAddress,
    branch,
    department,
    role: 'Credit Manager',
    status: isActive ? 'Active' : 'Inactive',
    isActive: Boolean(isActive),
    dateOfBirth,
    dateJoined,
    gender,
    genderName: gender,
    address,
    countryId: country.id,
    countryName: country.name,
    stateId: state.id,
    stateName: state.name,
    districtId: district.id,
    districtName: district.name,
    cityId: city.id,
    cityName: city.name,
    pincode,
    raw: source,
  };
}
