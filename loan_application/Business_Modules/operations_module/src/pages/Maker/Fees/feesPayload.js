export const GST_TREATMENTS = Object.freeze(['Exclusive', 'Inclusive', 'Not Applicable']);

export const DERIVED_FIELDS = Object.freeze([
  'netFee',
  'netGst',
  'totalNet',
  'totalPaid',
  'remainingFee',
  'remainingGst',
  'totalRemaining',
]);

const NUMERIC_FIELDS = Object.freeze([
  'gstPercent',
  'calculatedFee',
  'actualFee',
  'feeWaiver',
  'paidAmount',
  'paidGst',
]);

const ERROR_FIELDS = Object.freeze([
  ...NUMERIC_FIELDS,
]);

function readValue(record, ...keys) {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null) return record[key];
  }
  return null;
}

function asFiniteNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const number = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(number) ? number : null;
}

function asNonNegativeNumber(value) {
  const number = asFiniteNumber(value);
  return number === null ? 0 : number;
}

function asId(value) {
  const number = asFiniteNumber(value);
  return number !== null && number > 0 ? number : null;
}

export function normalizeFeeId(value) {
  const id = asId(value);
  return id === null ? '' : String(id);
}

function asDisplayValue(value) {
  return value === undefined || value === null ? '' : String(value);
}

function blankDerivedFields() {
  return DERIVED_FIELDS.reduce((values, field) => ({ ...values, [field]: '' }), {});
}

export function createRowKey(prefix = 'fee-row') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyFeeRow({ rowKey = createRowKey(), feeId = '', feeName = '' } = {}) {
  return {
    rowKey,
    feeId: feeId ?? '',
    feeName: feeName ?? '',
    gstTreatment: 'Exclusive',
    gstPercent: '',
    calculatedFee: '',
    actualFee: '',
    feeWaiver: '',
    paidAmount: '',
    paidGst: '',
    feeScheduleMethod: '',
    bpType: '',
    partnerCode: '',
    lineNo: null,
    ...blankDerivedFields(),
  };
}

export function createFeeRowFromMaster(record, rowKey = createRowKey('master')) {
  return createEmptyFeeRow({
    rowKey,
    feeId: record?.feeId ?? record?.FeeId ?? record?.stableId ?? '',
    feeName: record?.feeName ?? record?.FeeName ?? '',
  });
}

export function normalizeFeeMasterRecords(response) {
  const records = [response, response?.value, response?.data, response?.result]
    .find((candidate) => Array.isArray(candidate)) || [];

  return records
    .filter((record) => record?.isActive === true || record?.IsActive === true)
    .map((record) => ({
      feeId: record?.feeId ?? record?.FeeId ?? record?.id,
      feeName: String(record?.feeName ?? record?.FeeName ?? '').trim(),
      isActive: true,
    }))
    .filter((record) => asId(record.feeId) !== null && record.feeName);
}

export function mergeFeeMasterOptions(activeRecords, savedRows) {
  const options = new Map();

  (activeRecords || []).forEach((record) => {
    const feeId = asId(record?.feeId ?? record?.FeeId ?? record?.stableId);
    const feeName = String(record?.feeName ?? record?.FeeName ?? '').trim();
    if (feeId !== null && feeName) options.set(String(feeId), { feeId, feeName, isActive: true });
  });

  (savedRows || []).forEach((row) => {
    const feeId = asId(row?.feeId ?? row?.FeeId);
    const feeName = String(row?.feeName ?? row?.FeeName ?? '').trim();
    if (feeId !== null && feeName && !options.has(String(feeId))) {
      options.set(String(feeId), { feeId, feeName, isActive: false });
    }
  });

  return Array.from(options.values());
}

export function normalizeGstPercentForPayload(value) {
  const percent = asFiniteNumber(value);
  return percent === null ? 0 : percent / 100;
}

// The confirmed contract examples use fractional backend GST values, e.g. 0.18.
// Keep this representation explicit so a future contract change does not introduce
// an ambiguous 0.5-versus-50 interpretation.
export function normalizeGstPercentForDisplay(value) {
  const fraction = asFiniteNumber(value);
  return fraction === null ? '' : String(fraction * 100);
}

export function buildFeesPayload({
  agentCustomerId,
  applicationProductDetailsId,
  createdBy,
  notes,
  rows,
}) {
  return {
    agentCustomerId: asId(agentCustomerId),
    applicationProductDetailsId: asId(applicationProductDetailsId),
    notes: String(notes || '').trim() || null,
    createdBy: asId(createdBy),
    lines: (rows || []).map((row, index) => ({
      feeId: asId(row?.feeId),
      feeName: String(row?.feeName || '').trim() || null,
      gstTreatment: GST_TREATMENTS.includes(row?.gstTreatment) ? row.gstTreatment : 'Exclusive',
      gstPercent: normalizeGstPercentForPayload(row?.gstPercent),
      calculatedFee: asNonNegativeNumber(row?.calculatedFee),
      actualFee: asNonNegativeNumber(row?.actualFee),
      feeWaiver: asNonNegativeNumber(row?.feeWaiver),
      paidAmount: asNonNegativeNumber(row?.paidAmount),
      paidGst: asNonNegativeNumber(row?.paidGst),
      feeScheduleMethod: String(row?.feeScheduleMethod || '').trim() || null,
      bpType: String(row?.bpType || '').trim() || null,
      partnerCode: String(row?.partnerCode || '').trim() || null,
      lineNo: index + 1,
    })),
  };
}

export function getManualRowsSignature(rows) {
  return JSON.stringify((rows || []).map((row) => ({
    feeId: row?.feeId ?? '',
    feeName: row?.feeName ?? '',
    gstTreatment: row?.gstTreatment ?? '',
    gstPercent: row?.gstPercent ?? '',
    calculatedFee: row?.calculatedFee ?? '',
    actualFee: row?.actualFee ?? '',
    feeWaiver: row?.feeWaiver ?? '',
    paidAmount: row?.paidAmount ?? '',
    paidGst: row?.paidGst ?? '',
    feeScheduleMethod: row?.feeScheduleMethod ?? '',
    bpType: row?.bpType ?? '',
    partnerCode: row?.partnerCode ?? '',
  })));
}

export function mapFeeLineFromApi(record, index = 0) {
  return {
    rowKey: createRowKey('saved'),
    feeId: readValue(record, 'feeId', 'FeeId') ?? '',
    feeName: asDisplayValue(readValue(record, 'feeName', 'FeeName')),
    gstTreatment: readValue(record, 'gstTreatment', 'GSTTreatment') || 'Exclusive',
    gstPercent: normalizeGstPercentForDisplay(readValue(record, 'gstPercent', 'GSTPercent')),
    calculatedFee: asDisplayValue(readValue(record, 'calculatedFee', 'CalculatedFee')),
    actualFee: asDisplayValue(readValue(record, 'actualFee', 'ActualFee')),
    feeWaiver: asDisplayValue(readValue(record, 'feeWaiver', 'FeeWaiver')),
    paidAmount: asDisplayValue(readValue(record, 'paidAmount', 'PaidAmount')),
    paidGst: asDisplayValue(readValue(record, 'paidGst', 'PaidGst')),
    feeScheduleMethod: asDisplayValue(readValue(record, 'feeScheduleMethod', 'FeeScheduleMethod')),
    bpType: asDisplayValue(readValue(record, 'bpType', 'BPType')),
    partnerCode: asDisplayValue(readValue(record, 'partnerCode', 'PartnerCode')),
    lineNo: readValue(record, 'lineNo', 'LineNo') ?? index + 1,
    netFee: asDisplayValue(readValue(record, 'netFee', 'NetFee')),
    netGst: asDisplayValue(readValue(record, 'netGst', 'NetGst')),
    totalNet: asDisplayValue(readValue(record, 'totNet', 'TotNet', 'totalNet', 'TotalNet')),
    totalPaid: asDisplayValue(readValue(record, 'totPaid', 'TotPaid', 'totalPaid', 'TotalPaid')),
    remainingFee: asDisplayValue(readValue(record, 'remainingFee', 'RemainingFee')),
    remainingGst: asDisplayValue(readValue(record, 'remainingGst', 'RemainingGst')),
    totalRemaining: asDisplayValue(readValue(record, 'totRemaining', 'TotRemaining', 'totalRemaining', 'TotalRemaining')),
  };
}

export function mapFeesResponse(response) {
  const payload = response?.value ?? response?.data ?? response?.result ?? response ?? {};
  const header = payload?.header ?? payload?.Header ?? {};
  const lines = Array.isArray(payload?.lines) ? payload.lines : Array.isArray(payload?.Lines) ? payload.Lines : [];

  return {
    header,
    lines: lines.map(mapFeeLineFromApi),
    grossDisbursementAmount: payload?.grossDisbursementAmount ?? payload?.GrossDisbursementAmount ?? null,
    totalApplicableFeeDeduction: payload?.totalApplicableFeeDeduction ?? payload?.TotalApplicableFeeDeduction ?? null,
    finalNetDisbursementAmount: payload?.finalNetDisbursementAmount ?? payload?.FinalNetDisbursementAmount ?? null,
  };
}

export function mergePreviewDerivedValues(currentRows, responseRows) {
  return (currentRows || []).map((row, index) => {
    const calculated = responseRows?.[index];
    if (!calculated) return { ...row, ...blankDerivedFields() };
    return {
      ...row,
      netFee: calculated.netFee,
      netGst: calculated.netGst,
      totalNet: calculated.totalNet,
      totalPaid: calculated.totalPaid,
      remainingFee: calculated.remainingFee,
      remainingGst: calculated.remainingGst,
      totalRemaining: calculated.totalRemaining,
    };
  });
}

export function validateFeeRows(rows, { validateAgainstPreview = false } = {}) {
  const errors = {};

  if (!(rows || []).length) {
    return { _form: { general: 'Add at least one fee line before saving.' } };
  }

  const seenFeeIds = new Map();
  const duplicateFeeIds = new Set();
  (rows || []).forEach((row, index) => {
    const feeId = normalizeFeeId(row?.feeId);
    if (feeId && seenFeeIds.has(feeId)) duplicateFeeIds.add(feeId);
    if (feeId && !seenFeeIds.has(feeId)) seenFeeIds.set(feeId, index);
  });

  (rows || []).forEach((row, index) => {
    const rowErrors = {};
    const feeId = normalizeFeeId(row?.feeId);
    if (!feeId || !String(row?.feeName || '').trim()) {
      rowErrors.feeId = 'Select a Fee Master entry.';
    } else if (duplicateFeeIds.has(feeId)) {
      rowErrors.feeId = 'Duplicate fee types are not allowed. Please remove or change the duplicate fee.';
    }
    ERROR_FIELDS.forEach((field) => {
      const value = row?.[field];
      if (String(value ?? '').trim() !== '' && asFiniteNumber(value) === null) {
        rowErrors[field] = 'Enter a valid number.';
      } else if (asFiniteNumber(value) !== null && asFiniteNumber(value) < 0) {
        rowErrors[field] = 'Value cannot be negative.';
      }
    });

    const actualFee = asFiniteNumber(row?.actualFee);
    const feeWaiver = asFiniteNumber(row?.feeWaiver);
    if (actualFee !== null && feeWaiver !== null && feeWaiver > actualFee) {
      rowErrors.feeWaiver = 'Fee Waiver cannot exceed Actual Fee.';
    }

    if (validateAgainstPreview) {
      const netFee = asFiniteNumber(row?.netFee);
      const netGst = asFiniteNumber(row?.netGst);
      const paidAmount = asFiniteNumber(row?.paidAmount);
      const paidGst = asFiniteNumber(row?.paidGst);
      if (netFee !== null && paidAmount !== null && paidAmount > netFee) {
        rowErrors.paidAmount = 'Paid Amount cannot exceed Net Fee.';
      }
      if (netGst !== null && paidGst !== null && paidGst > netGst) {
        rowErrors.paidGst = 'Paid GST cannot exceed Net GST.';
      }
    }

    if (Object.keys(rowErrors).length) errors[index] = rowErrors;
  });

  return errors;
}

export function hasValidationErrors(errors) {
  return Object.keys(errors || {}).length > 0;
}
