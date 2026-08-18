/**
 * SectionHeader
 * --------------------
 * Purpose:
 *   Consistent heading row used above every content section and card.
 *
 * Responsibilities:
 *   - Render a left-aligned section title.
 *   - Render an optional right-aligned action label (e.g. "View All").
 *   - Never contain business logic — purely presentational.
 *
 * Props:
 *   title         {string}   — Section heading text
 *   actionLabel   {string}   — Optional right-side action text (e.g. "View All")
 *   onActionClick {Function} — Click handler for the action; omit to hide action
 */

import { memo } from 'react';
import './SectionHeader.css';

const SectionHeader = memo(function SectionHeader({ title, actionLabel, onActionClick }) {
  const showAction = actionLabel && typeof onActionClick === 'function';

  return (
    <div className="section-header">
      <h2 className="section-header-title">{title}</h2>

      {showAction && (
        <button
          type="button"
          className="section-header-action"
          onClick={onActionClick}
          aria-label={`${actionLabel} — ${title}`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
});

export default SectionHeader;
