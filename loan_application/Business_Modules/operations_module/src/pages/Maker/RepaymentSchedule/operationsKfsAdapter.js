import { mapFeesResponse } from '../Fees/feesPayload';

function readValue(record, ...keys) {
  if (!record || typeof record !== 'object') return null;
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return null;
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parseRepaymentAmount(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const text = String(value).trim().replace(/,/g, '');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

const REPAYMENT_AMOUNT_FIELDS = [
  ['rawInterestAmount', 'interestAmount', 'InterestAmount', 'Interest Amount'],
  ['rawPrincipalAmount', 'principalAmount', 'PrincipalAmount', 'Principal Amount'],
  ['rawEmiAmount', 'emiAmount', 'EmiAmount', 'EMI Amount'],
  ['rawClosingBalance', 'closingBalance', 'ClosingBalance', 'Closing Balance'],
];

export function normalizeOperationsKfsRepaymentRows(details) {
  if (!Array.isArray(details)) return [];
  return details.map((row, index) => {
    const normalized = {
      installment: readValue(row, 'emiNo', 'EmiNo') ?? index + 1,
      date: readValue(row, 'emiDate', 'EmiDate'),
    };
    REPAYMENT_AMOUNT_FIELDS.forEach(([normalizedKey, key, alternateKey]) => {
      normalized[normalizedKey] = parseRepaymentAmount(readValue(row, key, alternateKey));
    });
    return normalized;
  });
}

export function validateOperationsKfsRepaymentRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { valid: false, error: 'No persisted repayment installment rows are available.' };
  }

  for (const [index, row] of rows.entries()) {
    const installment = row?.installment ?? index + 1;
    for (const [normalizedKey, , , label] of REPAYMENT_AMOUNT_FIELDS) {
      if (row?.[normalizedKey] === null || !Number.isFinite(row?.[normalizedKey])) {
        return {
          valid: false,
          error: `Repayment installment ${installment} has an invalid ${label}.`,
        };
      }
    }
  }

  return { valid: true, error: '' };
}

export function sumOperationsKfsRepaymentRows(rows) {
  const validation = validateOperationsKfsRepaymentRows(rows);
  if (!validation.valid) return null;

  return {
    interest: Number(rows.reduce((sum, row) => sum + row.rawInterestAmount, 0).toFixed(12)),
    principal: Number(rows.reduce((sum, row) => sum + row.rawPrincipalAmount, 0).toFixed(12)),
    emi: Number(rows.reduce((sum, row) => sum + row.rawEmiAmount, 0).toFixed(12)),
  };
}

function sameIdentifier(left, right) {
  if (left === undefined || left === null || right === undefined || right === null) return false;
  return String(left).trim() === String(right).trim();
}

function isApprovedDecision(decision) {
  return String(readValue(decision, 'decision', 'Decision') || '').trim().toLowerCase() === 'approved';
}

function hasCompleteApprovedTerms(decision) {
  return isApprovedDecision(decision)
    && positiveNumber(readValue(decision, 'sanctionedLoanAmount', 'SanctionedLoanAmount')) !== null
    && Number.isFinite(Number(readValue(decision, 'sanctionedROI', 'SanctionedROI', 'sanctionedRoi')))
    && positiveNumber(readValue(decision, 'sanctionedTenureMonths', 'SanctionedTenureMonths')) !== null;
}

function hasPersistedSchedule(schedule, details, agentCustomerId, applicationProductDetailsId) {
  const repaymentRows = normalizeOperationsKfsRepaymentRows(details);
  return Boolean(
    schedule
      && Array.isArray(details)
      && details.length > 0
      && sameIdentifier(readValue(schedule, 'agentCustomerId', 'AgentCustomerId'), agentCustomerId)
      && sameIdentifier(
        readValue(schedule, 'applicationProductDetailsId', 'ApplicationProductDetailsId'),
        applicationProductDetailsId
      )
      && positiveNumber(readValue(schedule, 'loanAmount', 'LoanAmount')) !== null
      && Number.isFinite(Number(readValue(schedule, 'interestRatePa', 'InterestRatePa')))
      && positiveNumber(readValue(schedule, 'tenureMonths', 'TenureMonths')) !== null
      && validateOperationsKfsRepaymentRows(repaymentRows).valid
  );
}

export function resolveMakerStaffId(profile, storedUser) {
  const value =
    profile?.staffId
    ?? profile?.StaffId
    ?? storedUser?.staffId
    ?? storedUser?.StaffId;
  return positiveNumber(value);
}

export function isOperationsKfsEligible({
  application,
  decision,
  schedule,
  details,
  fees,
  agentCustomerId,
  applicationProductDetailsId,
  makerStaffId,
  invalidated = false,
}) {
  const operationsStatus = String(
    readValue(application, 'operationsStatus', 'OperationsStatus') || ''
  ).trim().toUpperCase();
  const assignedMakerStaffId = readValue(application, 'assignedMakerStaffId', 'AssignedMakerStaffId');
  const customerCode = String(readValue(application, 'customerCode', 'CustomerCode') || '').trim();

  return Boolean(
    !invalidated
      && positiveNumber(agentCustomerId)
      && positiveNumber(applicationProductDetailsId)
      && operationsStatus === 'PENDING'
      && positiveNumber(makerStaffId)
      && positiveNumber(assignedMakerStaffId)
      && sameIdentifier(assignedMakerStaffId, makerStaffId)
      && customerCode
      && hasCompleteApprovedTerms(decision)
      && hasPersistedSchedule(schedule, details, agentCustomerId, applicationProductDetailsId)
      && fees
  );
}

export function buildOperationsKfsData({
  application,
  decision,
  schedule,
  details,
  fees,
  agentCustomerId,
  applicationProductDetailsId,
  makerStaffId,
  invalidated = false,
}) {
  const normalizedFees = fees && fees.header !== undefined && fees.lines !== undefined
    ? fees
    : fees
      ? mapFeesResponse(fees)
      : null;
  const repaymentRows = normalizeOperationsKfsRepaymentRows(details);
  const repaymentValidation = validateOperationsKfsRepaymentRows(repaymentRows);

  return {
    application,
    decision,
    schedule,
    details: Array.isArray(details) ? details : [],
    repaymentRows,
    repaymentTotals: repaymentValidation.valid ? sumOperationsKfsRepaymentRows(repaymentRows) : null,
    repaymentValidation,
    validationError: repaymentValidation.valid ? '' : repaymentValidation.error,
    fees: normalizedFees,
    agentCustomerId,
    applicationProductDetailsId,
    customerCode: readValue(application, 'customerCode', 'CustomerCode'),
    loanProductId: readValue(application, 'loanProductId', 'LoanProductId'),
    loanProductName: readValue(application, 'loanProductName', 'LoanProductName'),
    uploadedBy: makerStaffId,
    isEligible: isOperationsKfsEligible({
      application,
      decision,
      schedule,
      details,
      fees: normalizedFees,
      agentCustomerId,
      applicationProductDetailsId,
      makerStaffId,
      invalidated,
    }),
  };
}

export function readOperationsKfsValue(record, ...keys) {
  return readValue(record, ...keys);
}
