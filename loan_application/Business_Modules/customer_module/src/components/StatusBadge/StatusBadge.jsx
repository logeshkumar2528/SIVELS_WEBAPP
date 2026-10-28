/**
 * StatusBadge
 * --------------------
 * Purpose:
 *   Renders a coloured pill badge for application status values.
 *
 * Responsibilities:
 *   - Map status key or numeric code → display label + CSS class via statusConfig.
 *   - Render a consistent, accessible pill across every table and page.
 *
 * Props:
 *   status  {string|number} — Status key or numeric code (0-6)
 *   label   {string}        — Optional override for the display label
 */

import { memo } from 'react';
import { resolveApplicationStatus } from '../../config/statusConfig';
import './StatusBadge.css';

const StatusBadge = memo(function StatusBadge({ status, label }) {
  const resolved = resolveApplicationStatus(status);
  const displayLabel = label ?? resolved.label;
  const badgeClass = resolved.badgeClass;

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
