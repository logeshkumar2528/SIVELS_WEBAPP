/**
 * statusConfig.js
 * --------------------
 * Purpose:
 *   Single source of truth for all application status display rules in the Customer Module.
 *
 * Responsibilities:
 *   - Map verified status strings to customer-facing display labels and CSS modifier classes.
 *   - Safely resolve raw status values without conflating conflicting module enums.
 *   - For ambiguous numeric status codes (1-6) where backend mapping remains unconfirmed,
 *     render a neutral "Status unavailable" badge rather than falsely asserting approval or disbursement.
 */

/**
 * @typedef {Object} StatusEntry
 * @property {string} label      — Human-readable label rendered in the badge
 * @property {string} badgeClass — CSS modifier class applied to the badge element
 */

/** @type {Record<string, StatusEntry>} */
export const STATUS_CONFIG = {
  new: {
    label:      'Draft',
    badgeClass: 'status-badge--new',
  },
  draft: {
    label:      'Draft',
    badgeClass: 'status-badge--new',
  },
  inReview: {
    label:      'In Review',
    badgeClass: 'status-badge--review',
  },
  submittedToCredit: {
    label:      'Submitted to Credit',
    badgeClass: 'status-badge--review',
  },
  approved: {
    label:      'Application Approved',
    badgeClass: 'status-badge--approved',
  },
  disbursed: {
    label:      'Loan Disbursed',
    badgeClass: 'status-badge--disbursed',
  },
  rejected: {
    label:      'Application Rejected',
    badgeClass: 'status-badge--returned',
  },
  returned: {
    label:      'Application Returned',
    badgeClass: 'status-badge--returned',
  },
  unavailable: {
    label:      'Status unavailable',
    badgeClass: 'status-badge--default',
  },
};

/**
 * Neutral fallback for missing, unknown, or ambiguous status values.
 */
export const STATUS_UNAVAILABLE = {
  key: 'unavailable',
  label: 'Status unavailable',
  badgeClass: 'status-badge--default',
};

/**
 * Safely resolves an application status value into a customer-safe display structure.
 *
 * - String statuses with confirmed semantics (e.g. 'Approved', 'Disbursed', 'In Review')
 *   are mapped to authoritative display labels and styles.
 * - Numeric 0 is confirmed as 'Draft' (initial creation in AddCustomer).
 * - Ambiguous numeric status codes (1-6) with conflicting cross-module meanings
 *   resolve to a neutral "Status unavailable" badge to prevent false claims.
 *
 * @param {string|number|null|undefined} status
 * @returns {{ key: string, label: string, badgeClass: string }}
 */
export function resolveApplicationStatus(status) {
  if (status === null || status === undefined || status === '') {
    return STATUS_UNAVAILABLE;
  }

  // Check confirmed numeric creation code 0
  if (status === 0 || status === '0') {
    return STATUS_CONFIG.draft;
  }

  // If status is a numeric code other than 0 (e.g. 1, 2, 3, 4, 5, 6),
  // backend enum mapping is conflicting between creditManagerService (3=Pending, 4=Approved, 5=Rejected)
  // and other modules. Do not make false assertions:
  const numericVal = Number(status);
  if (Number.isInteger(numericVal) && String(status).trim() === String(numericVal)) {
    return STATUS_UNAVAILABLE;
  }

  // String status normalization
  const normalized = String(status).trim().toLowerCase();

  switch (normalized) {
    case 'approved':
    case 'application approved':
      return STATUS_CONFIG.approved;

    case 'disbursed':
    case 'loan disbursed':
      return STATUS_CONFIG.disbursed;

    case 'in review':
    case 'inreview':
    case 'under review':
    case 'under process':
    case 'pending':
      return STATUS_CONFIG.inReview;

    case 'submitted to credit':
    case 'submittedtocredit':
    case 'logged to ho':
      return STATUS_CONFIG.submittedToCredit;

    case 'new':
    case 'draft':
      return STATUS_CONFIG.draft;

    case 'rejected':
    case 'application rejected':
      return STATUS_CONFIG.rejected;

    case 'returned':
    case 'application returned':
    case 'returned to rm':
    case 'returnedtorm':
      return STATUS_CONFIG.returned;

    default:
      return STATUS_UNAVAILABLE;
  }
}
