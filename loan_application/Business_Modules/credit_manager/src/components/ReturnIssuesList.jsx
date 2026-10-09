/**
 * ReturnIssuesList.jsx
 * --------------------
 * Read-only list of fields the Credit Manager flagged, with the Back Office correction status.
 */

import React from 'react';
import { formatDate } from '../utils/formatters';

export default function ReturnIssuesList({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <ul className="cm-issues-list cm-issues-list--readonly">
      {items.map((item, index) => (
        <li key={item.id ?? index} className={item.isResolved ? 'is-resolved' : 'is-open'}>
          <div>
            <div className="cm-issue-title">
              <strong>{item.sectionName} › {item.fieldLabel}</strong>
              <span className={`stc-pill ${item.isResolved ? 'stc-pill--verified' : 'stc-pill--pending'}`}>
                {item.isResolved ? 'Corrected' : 'Open'}
              </span>
            </div>
            <p><span className="cm-issue-label">Issue:</span> {item.issue}</p>
            {item.isResolved && (
              <p className="cm-issue-fix">
                <span className="cm-issue-label">Back Office fix{item.resolvedAt ? ` (${formatDate(item.resolvedAt)})` : ''}:</span>{' '}
                {item.resolutionNote || '—'}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
