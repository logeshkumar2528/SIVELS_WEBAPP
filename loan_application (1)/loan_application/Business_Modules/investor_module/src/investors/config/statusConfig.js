/**
 * statusConfig.js
 * Status badge configurations for the Investors module.
 */

export const STATUS_CONFIG = {
  Active: {
    label: 'Active',
    textVar: 'var(--color-status-approved-text)',
    bgVar: 'var(--color-status-approved-bg)',
  },
  'Up to Date': {
    label: 'Up to Date',
    textVar: 'var(--color-status-approved-text)',
    bgVar: 'var(--color-status-approved-bg)',
  },
  Completed: {
    label: 'Completed',
    textVar: 'var(--color-status-disbursed-text)',
    bgVar: 'var(--color-status-disbursed-bg)',
  },
  Pending: {
    label: 'Pending',
    textVar: 'var(--color-status-review-text)',
    bgVar: 'var(--color-status-review-bg)',
  },
  Closed: {
    label: 'Closed',
    textVar: 'var(--color-status-new-text)',
    bgVar: 'var(--color-status-new-bg)',
  },
};

export default STATUS_CONFIG;
