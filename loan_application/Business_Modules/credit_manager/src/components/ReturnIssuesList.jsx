/**
 * ReturnIssuesList.jsx
 * --------------------
 * Read-only list of sections / fields the Credit Manager flagged, with the Back Office
 * resolution and the Credit Manager review.
 */

import React from 'react';
import {
  RETURN_ITEM_STATUS,
  RETURN_ITEM_STATUS_META,
  formatActor,
} from '../../../back_office/src/back-office/mappers/creditReturnMapper';
import { formatDate } from '../utils/formatters';

export default function ReturnIssuesList({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <ul className="cm-issues-list cm-issues-list--readonly">
      {items.map((item, index) => {
        const meta = RETURN_ITEM_STATUS_META[item.itemStatus];
        return (
          <li key={item.id ?? index} className={item.itemStatus === RETURN_ITEM_STATUS.OPEN ? 'is-open' : 'is-resolved'}>
            <div>
              <div className="cm-issue-title">
                <strong>{item.sectionName} › {item.fieldLabel}</strong>
                <span className={`crp-pill ${meta?.className || 'crp-pill--resolved'}`}>
                  {meta?.label || item.itemStatus}
                </span>
              </div>
              <p><span className="cm-issue-label">Issue:</span> {item.issue}</p>
              {item.resolutionNote && (
                <p className="cm-issue-fix">
                  <span className="cm-issue-label">
                    Back Office fix ({formatActor(item.resolvedByRole || 'BackOffice', item.resolvedByUserId)}
                    {item.resolvedAt ? `, ${formatDate(item.resolvedAt)}` : ''}):
                  </span>{' '}
                  {item.resolutionNote}
                </p>
              )}
              {item.reviewRemarks && (
                <p className="cm-issue-fix">
                  <span className="cm-issue-label">
                    Your review{item.reviewedAt ? ` (${formatDate(item.reviewedAt)})` : ''}:
                  </span>{' '}
                  {item.reviewRemarks}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
