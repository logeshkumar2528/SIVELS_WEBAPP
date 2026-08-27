/**
 * statusConfig.js
 * --------------------
 * Purpose:
 *   Single source of truth for all application status display rules.
 *
 * Responsibilities:
 *   - Map every status key to its display label and CSS modifier class.
 *   - StatusBadge.jsx reads from here — never hardcodes status strings.
 *   - Adding a new status means editing only this file.
 */

/**
 * @typedef {Object} StatusEntry
 * @property {string} label      — Human-readable label rendered in the badge
 * @property {string} badgeClass — CSS modifier class applied to the badge element
 */

/** @type {Record<string, StatusEntry>} */
export const STATUS_CONFIG = {
  new: {
    label:      'New',
    badgeClass: 'status-badge--new',
  },
  inReview: {
    label:      'In Review',
    badgeClass: 'status-badge--review',
  },
  returned: {
    label:      'Returned',
    badgeClass: 'status-badge--returned',
  },
  approved: {
    label:      'Approved',
    badgeClass: 'status-badge--approved',
  },
  disbursed: {
    label:      'Disbursed',
    badgeClass: 'status-badge--disbursed',
  },
};
