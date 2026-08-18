import { AlertTriangle, RotateCw } from 'lucide-react';
import './TableStates.css';

/* Reusable premium table states (skeleton / empty / error).
   Presentational only — they render <tr> rows so they drop straight into
   an existing <tbody> without changing any data logic. */

export const TableSkeleton = ({ rows = 5, cols = 6 }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={`sk-${r}`} className="ts-skeleton-row">
        {Array.from({ length: cols }).map((_, c) => (
          <td key={c}>
            <span
              className="ts-skeleton-line"
              style={{ width: `${55 + ((r + c) % 4) * 12}%` }}
            />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export const TableEmpty = ({ cols = 6, icon: Icon, title = 'No records found', message, action }) => (
  <tr className="ts-state-row">
    <td colSpan={cols}>
      <div className="ts-state">
        {Icon && (
          <div className="ts-state-icon">
            <Icon size={26} strokeWidth={1.75} />
          </div>
        )}
        <h3 className="ts-state-title">{title}</h3>
        {message && <p className="ts-state-msg">{message}</p>}
        {action && <div className="ts-state-action">{action}</div>}
      </div>
    </td>
  </tr>
);

export const TableError = ({ cols = 6, message = 'Please try again in a moment.', onRetry }) => (
  <tr className="ts-state-row">
    <td colSpan={cols}>
      <div className="ts-state">
        <div className="ts-state-icon ts-state-icon-error">
          <AlertTriangle size={26} strokeWidth={1.75} />
        </div>
        <h3 className="ts-state-title">Unable to load data</h3>
        <p className="ts-state-msg">{message}</p>
        {onRetry && (
          <button type="button" className="ts-retry" onClick={onRetry}>
            <RotateCw size={15} />
            Try again
          </button>
        )}
      </div>
    </td>
  </tr>
);
