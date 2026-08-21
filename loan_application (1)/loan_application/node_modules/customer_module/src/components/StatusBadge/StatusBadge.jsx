/**
 * StatusBadge
 * --------------------
 * Purpose:
 *   Renders a coloured pill badge for application status values.
 *
 * Responsibilities:
 *   - Map status key → display label + CSS class via statusConfig.
 *   - Render a consistent, accessible pill across every table and page.
 *
 * Props:
 *   status  {string} — Status key matching a key in STATUS_CONFIG
 *                      (e.g. 'new', 'inReview', 'approved')
 *   label   {string} — Optional override for the display label
 */

import { memo } from 'react';
import { STATUS_CONFIG } from '../../config/statusConfig';
import './StatusBadge.css';

const StatusBadge = memo(function StatusBadge({ status, label }) {
  const config      = STATUS_CONFIG[status];
  const displayLabel = label ?? config?.label ?? status;
  const badgeClass   = config?.badgeClass ?? 'status-badge--default';

  return (
    <span
      className={`status-badge ${badgeClass}`}
      role="status"
      aria-label={`Status: ${displayLabel}`}
    >
      {displayLabel}
    </span>
  );
});

export default StatusBadge;
