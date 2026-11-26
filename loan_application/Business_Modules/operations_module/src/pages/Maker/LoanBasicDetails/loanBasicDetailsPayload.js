import { getStoredUser } from '../../../../../../Core/src/auth/session';

function readValue(record, ...keys) {
  if (!record || typeof record !== 'object') return null;
  for (const key of keys) {
    const value = record[key];
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    return value;
  }
  return null;
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toIdOrNull(value) {
  const number = toNumberOrNull(value);
  return number !== null && number > 0 ? number : null;
}

export function toApiDateTime(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T00:00:00`;
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? `${match[1]}T00:00:00` : text;
}

export function fromApiDate(value) {
  if (value === undefined || value === null || String(value).trim() === '') return '';
  const text = String(value).trim();
  const match = text.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return '';
  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0'),
  ].join('-');
}

export function getCreatedByUserId() {
  const user = getStoredUser(['MAKER', 'CHECKER']) || getStoredUser();
  const userId = Number(user?.userId ?? user?.staffId ?? user?.id);
  return Number.isFinite(userId) && userId > 0 ? userId : null;
}

export function getRecordId(record, ...keys) {
  return toIdOrNull(readValue(record, ...keys));
}

export function mapLoanBasicDetailsToForm(record) {
  if (!record) return {};
  return {
    division: String(readValue(record, 'divisionId', 'DivisionId') ?? ''),
    interestCapsBasis: String(readValue(record, 'dayBasisId', 'DayBasisId') ?? ''),
    repaymentMode: String(readValue(record, 'paymentMethodId', 'PaymentMethodId') ?? ''),
    currency: String(readValue(record, 'currencyId', 'CurrencyId') ?? ''),
    interestFrequency: String(readValue(record, 'interestFrequencyId', 'InterestFrequencyId') ?? ''),
    capitalizationFrequency: String(
      readValue(record, 'capitalizationFrequencyId', 'CapitalizationFrequencyId') ?? ''
    ),
    repaymentFrequency: String(readValue(record, 'paymentFrequencyId', 'PaymentFrequencyId') ?? ''),
    scheduleMethodId: String(readValue(record, 'scheduleMethodId', 'ScheduleMethodId') ?? ''),
    bpiTreatmentId: String(readValue(record, 'bpiTreatmentId', 'BPITreatmentId') ?? ''),
    loanBranchId: String(readValue(record, 'loanBranchId', 'LoanBranchId') ?? ''),
    loanFlagId: String(readValue(record, 'loanFlagId', 'LoanFlagId') ?? ''),
    interestRateType: String(readValue(record, 'interestTypeId', 'InterestTypeId') ?? ''),
    loanStartDate: fromApiDate(readValue(record, 'loanStartDate', 'LoanStartDate')),
    disbursementAmount:
      readValue(record, 'firstDisbursementAmount', 'FirstDisbursementAmount') != null
        ? String(readValue(record, 'firstDisbursementAmount', 'FirstDisbursementAmount'))
        : '',
    totalDisbursements:
      readValue(record, 'totalDisbursements', 'TotalDisbursements') != null
        ? String(readValue(record, 'totalDisbursements', 'TotalDisbursements'))
        : '',
    nextInterestFrequencyDate: fromApiDate(
      readValue(record, 'nextInterestFrequencyDate', 'NextInterestFrequencyDate')
    ),
    nextCapitalizationFrequencyDate: fromApiDate(
      readValue(record, 'nextCapitalizationFrequencyDate', 'NextCapitalizationFrequencyDate')
    ),
    nextPaymentFrequencyDate: fromApiDate(
      readValue(record, 'nextPaymentFrequencyDate', 'NextPaymentFrequencyDate')
    ),
    allowBpi: Boolean(readValue(record, 'allowBPI', 'AllowBPI', 'allowBpi')),
    baseRate:
      readValue(record, 'baseRate', 'BaseRate') != null
        ? String(readValue(record, 'baseRate', 'BaseRate'))
        : '',
    margin:
      readValue(record, 'margin', 'Margin') != null
        ? String(readValue(record, 'margin', 'Margin'))
        : '',
    maturityDate: fromApiDate(readValue(record, 'maturityDate', 'MaturityDate')),
    netLoanAmount:
      readValue(record, 'netLoanAmount', 'NetLoanAmount') != null
        ? String(readValue(record, 'netLoanAmount', 'NetLoanAmount'))
        : '',
  };
}

export function mapPenaltyToForm(record) {
  if (!record) return {};
  const apply = Boolean(readValue(record, 'applyOverduePenalty', 'ApplyOverduePenalty'));
  const chargeAmount = readValue(record, 'chargeAmount', 'ChargeAmount');
  const chargePercentage = readValue(record, 'chargePercentage', 'ChargePercentage');
  return {
    penaltyApplicable: apply,
    includeGraceDaysInPenaltyCalculation: Boolean(
      readValue(record, 'includeGraceDaysInPenaltyCalculation', 'IncludeGraceDaysInPenaltyCalculation')
    ),
    penaltyType: String(readValue(record, 'chargeTypeId', 'ChargeTypeId') ?? ''),
    gracePeriodDays:
      readValue(record, 'graceDays', 'GraceDays') != null
        ? String(readValue(record, 'graceDays', 'GraceDays'))
        : '',
    chargeCalculatedOn: String(readValue(record, 'chargeCalculatedOn', 'ChargeCalculatedOn') ?? ''),
    penaltyRate:
      chargeAmount != null
        ? String(chargeAmount)
        : chargePercentage != null
          ? String(chargePercentage)
          : '',
    allowWaivers: Boolean(readValue(record, 'allowWaivers', 'AllowWaivers')),
    maximumWaiverPercentage:
      readValue(record, 'maxWaiverPercentage', 'MaxWaiverPercentage') != null
        ? String(readValue(record, 'maxWaiverPercentage', 'MaxWaiverPercentage'))
        : '',
  };
}

export function buildLoanBasicDetailsPayload({
  form,
  agentCustomerId,
  applicationProductDetailsId,
  createdBy,
  existingId = null,
}) {
  const payload = {
    agentCustomerId: toIdOrNull(agentCustomerId),
    applicationProductDetailsId: toIdOrNull(applicationProductDetailsId),
    divisionId: toIdOrNull(form.division),
    dayBasisId: toIdOrNull(form.interestCapsBasis),
    paymentMethodId: toIdOrNull(form.repaymentMode),
    currencyId: toIdOrNull(form.currency),
    interestFrequencyId: toIdOrNull(form.interestFrequency),
    capitalizationFrequencyId: toIdOrNull(form.capitalizationFrequency),
    paymentFrequencyId: toIdOrNull(form.repaymentFrequency),
    scheduleMethodId: toIdOrNull(form.scheduleMethodId),
    bpiTreatmentId: toIdOrNull(form.bpiTreatmentId),
    loanBranchId: toIdOrNull(form.loanBranchId),
    loanFlagId: toIdOrNull(form.loanFlagId),
    interestTypeId: toIdOrNull(form.interestRateType),
    loanStartDate: toApiDateTime(form.loanStartDate),
    firstDisbursementAmount: toNumberOrNull(form.disbursementAmount),
    totalDisbursements: toNumberOrNull(form.totalDisbursements),
    nextInterestFrequencyDate: toApiDateTime(form.nextInterestFrequencyDate),
    nextCapitalizationFrequencyDate: toApiDateTime(form.nextCapitalizationFrequencyDate),
    nextPaymentFrequencyDate: toApiDateTime(form.nextPaymentFrequencyDate),
    allowBPI: Boolean(form.allowBpi),
    baseRate: toNumberOrNull(form.baseRate),
  };

  if (existingId) {
    payload.operationsLoanBasicDetailsId = existingId;
    payload.modifiedBy = createdBy;
  } else {
    payload.createdBy = createdBy;
  }

  return payload;
}

export function buildPenaltyPayload({
  form,
  agentCustomerId,
  applicationProductDetailsId,
  createdBy,
  existingId = null,
}) {
  const apply = Boolean(form.penaltyApplicable);
  const allowWaivers = Boolean(form.allowWaivers);
  const payload = {
    agentCustomerId: toIdOrNull(agentCustomerId),
    applicationProductDetailsId: toIdOrNull(applicationProductDetailsId),
    applyOverduePenalty: apply,
    includeGraceDaysInPenaltyCalculation: apply
      ? Boolean(form.includeGraceDaysInPenaltyCalculation)
      : false,
    chargeTypeId: null,
    graceDays: apply ? toNumberOrNull(form.gracePeriodDays) : null,
    chargeCalculatedOn: apply
      ? (String(form.chargeCalculatedOn || '').trim() || null)
      : null,
    chargeAmount: apply ? toNumberOrNull(form.penaltyRate) : null,
    chargePercentage: null,
    allowWaivers: apply ? allowWaivers : false,
    maxWaiverPercentage: apply && allowWaivers
      ? toNumberOrNull(form.maximumWaiverPercentage)
      : null,
  };

  if (existingId) {
    payload.operationsOverduePenaltyDetailsId = existingId;
    payload.modifiedBy = createdBy;
  } else {
    payload.createdBy = createdBy;
  }

  return payload;
}

export function buildDisbursementPayload({
  agentCustomerId,
  applicationProductDetailsId,
  amount,
  date,
  remarks,
  createdBy,
  existingId = null,
  isActive = true,
}) {
  const payload = {
    agentCustomerId: toIdOrNull(agentCustomerId),
    applicationProductDetailsId: toIdOrNull(applicationProductDetailsId),
    disbursementAmount: toNumberOrNull(amount),
    disbursementDate: toApiDateTime(date),
    remarks: String(remarks || '').trim() || null,
    isActive: Boolean(isActive),
  };

  if (existingId) {
    payload.operationsDisbursementDetailsId = existingId;
    payload.modifiedBy = createdBy;
  } else {
    payload.createdBy = createdBy;
  }

  return payload;
}

export function normalizeDisbursementRow(record) {
  if (!record) return null;
  const id = getRecordId(
    record,
    'operationsDisbursementDetailsId',
    'OperationsDisbursementDetailsId',
    'id'
  );
  return {
    id,
    amount: readValue(record, 'disbursementAmount', 'DisbursementAmount'),
    date: fromApiDate(readValue(record, 'disbursementDate', 'DisbursementDate')),
    remarks: readValue(record, 'remarks', 'Remarks') || '',
    isActive: record.isActive !== false && record.IsActive !== false,
    raw: record,
  };
}

export function validateLoanBasicDetailsForm(form) {
  const required = [
    ['division', 'Division'],
    ['interestCapsBasis', 'Interest Days Basis'],
    ['currency', 'Currency'],
    ['loanBranchId', 'Loan Branch'],
    ['loanStartDate', 'Loan Start Date'],
    ['disbursementAmount', 'First Disbursement Amount'],
    ['repaymentMode', 'Payment Method'],
    ['loanFlagId', 'Loan Flag'],
    ['interestRateType', 'Interest Rate Type'],
    ['bpiTreatmentId', 'BPI Treatment'],
    ['scheduleMethodId', 'Schedule Method'],
    ['interestFrequency', 'Interest Frequency'],
    ['capitalizationFrequency', 'Capitalization Frequency'],
    ['repaymentFrequency', 'Payment Frequency'],
  ];

  for (const [field, label] of required) {
    if (form[field] === undefined || form[field] === null || String(form[field]).trim() === '') {
      return `${label} is required.`;
    }
  }

  if (form.penaltyApplicable) {
    if (form.gracePeriodDays === '' || form.gracePeriodDays == null) {
      return 'Grace Days is required when overdue penalty is applied.';
    }
    if (!String(form.chargeCalculatedOn || '').trim()) {
      return 'Charge Calculated On is required when overdue penalty is applied.';
    }
    if (form.penaltyRate === '' || form.penaltyRate == null) {
      return 'Charge Amount / % is required when overdue penalty is applied.';
    }
  }

  return '';
}
