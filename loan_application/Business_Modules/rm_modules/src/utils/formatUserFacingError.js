/**
 * Turns API / validation payloads into user-friendly messages.
 * Never returns raw JSON for display.
 */

const FIELD_LABELS = {
  sourcingChannel: 'Sourcing Channel',
  loanProduct: 'Loan Product',
  loanVariation: 'Loan Variation',
  loanTransactionType: 'Loan Transaction Type',
  purposeOfLoan: 'Purpose of Loan',
  loanAmount: 'Loan Amount',
  loanTenureMonths: 'Loan Tenure',
  interestType: 'Interest Type',
  roi: 'ROI',
  coApplicantsCount: 'No. of Co-Applicants',
  distanceFromBranchKm: 'Distance from Branch',
  aadhaarLast4: 'Aadhaar (Last 4 Digits)',
  panCardNo: 'PAN Card Number',
  identityDocumentNo: 'Identity Document Number',
  identityDocumentType: 'Identity Document Type',
  fullName: 'Full Name',
  mobileNumber: 'Mobile Number',
  emailAddress: 'Email Address',
  dateOfBirth: 'Date of Birth',
  address: 'Address',
  pincode: 'Pincode',
  ifscCode: 'IFSC Code',
  bankAccountNumber: 'Bank Account Number',
  firstName: 'First Name',
  lastName: 'Last Name',
  emailId: 'Email ID',
  mobileNo: 'Mobile Number',
};

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function humanizeFieldKey(key = '') {
  const raw = String(key || '')
    .replace(/^\$\./, '')
    .replace(/\[\d+\]/g, '')
    .split('.')
    .filter(Boolean)
    .pop() || String(key || '');

  if (FIELD_LABELS[raw]) return FIELD_LABELS[raw];
  if (FIELD_LABELS[raw.charAt(0).toLowerCase() + raw.slice(1)]) {
    return FIELD_LABELS[raw.charAt(0).toLowerCase() + raw.slice(1)];
  }

  return raw
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase()) || 'Field';
}

function firstMessage(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const msg = firstMessage(item);
      if (msg) return msg;
    }
    return '';
  }
  if (isPlainObject(value)) {
    return firstMessage(value.message || value.Message || value.title || Object.values(value)[0]);
  }
  return String(value).trim();
}

/**
 * Flatten validation / ASP.NET ProblemDetails into a list of { label, message }.
 */
export function extractErrorItems(details) {
  if (!details) return [];

  if (typeof details === 'string') {
    const text = details.trim();
    if (!text || text.startsWith('{') || text.startsWith('[')) return [];
    if (text.includes(' at ') && text.includes('Error:')) return [];
    return [{ label: '', message: text }];
  }

  if (Array.isArray(details)) {
    return details
      .map((item) => {
        if (typeof item === 'string') return { label: '', message: item.trim() };
        if (isPlainObject(item)) {
          return {
            label: humanizeFieldKey(item.field || item.key || item.name || ''),
            message: firstMessage(item.message || item.Message || item),
          };
        }
        return { label: '', message: String(item) };
      })
      .filter((item) => item.message);
  }

  if (!isPlainObject(details)) {
    return [{ label: '', message: String(details) }];
  }

  // ASP.NET ProblemDetails: { errors: { Field: ["msg"] }, title, detail }
  const source = isPlainObject(details.errors) ? details.errors : details;
  const skipKeys = new Set([
    'title', 'Title', 'status', 'Status', 'traceId', 'TraceId', 'type', 'Type',
    'instance', 'Instance', 'extensions', 'Extensions', 'message', 'Message',
    'detail', 'Detail', 'stack', 'Stack', 'stackTrace', 'StackTrace',
  ]);

  const items = [];
  for (const [key, value] of Object.entries(source)) {
    if (skipKeys.has(key)) continue;
    if (key === 'errors' && isPlainObject(value)) continue;

    const message = firstMessage(value);
    if (!message) continue;

    // Avoid dumping nested objects that couldn't be flattened
    if (message.startsWith('{') || message.startsWith('[')) continue;

    items.push({
      label: humanizeFieldKey(key),
      message,
    });
  }

  return items;
}

/**
 * Parse a failed fetch/API body into a friendly popup payload.
 */
export function parseApiErrorBody(errorData, fallbackMessage = 'Something went wrong. Please try again.') {
  const items = extractErrorItems(errorData);
  const message =
    firstMessage(errorData?.message) ||
    firstMessage(errorData?.Message) ||
    firstMessage(errorData?.detail) ||
    firstMessage(errorData?.title) ||
    (items.length > 0
      ? 'Please correct the highlighted issues and try again.'
      : fallbackMessage);

  return {
    message,
    items,
    variant: items.length > 0 ? 'validation' : 'error',
  };
}

export function buildValidationPopup(fieldErrors, summary = 'Please complete the required fields.') {
  const items = extractErrorItems(fieldErrors);
  return {
    title: 'Please check the form',
    message: summary,
    details: items,
    variant: 'validation',
  };
}
