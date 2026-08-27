/**
 * DataTable
 * --------------------
 * Purpose:
 *   Generic, reusable data table for all listing pages in the module.
 *
 * Responsibilities:
 *   - Render a semantic HTML table from `columns` and `data` props.
 *   - Support custom cell renderers via column.render functions.
 *   - Render a skeleton loading state.
 *   - Render an empty state when data is an empty array.
 *   - Handle horizontal overflow gracefully on smaller screens.
 *
 * Props:
 *   columns      {Column[]}  — Column definitions (see typedef below)
 *   data         {Object[]}  — Array of row data objects
 *   loading      {boolean}   — Shows skeleton rows when true
 *   emptyMessage {string}    — Text shown when data is empty
 *   rowKeyField  {string}    — Field used as React key (default: 'id')
 *
 * Column shape:
 *   key    {string}            — Unique column identifier; also used as data key fallback
 *   label  {string}            — Column header text
 *   render {(row) => ReactNode} — Optional custom cell renderer
 */

import { memo } from 'react';
import './DataTable.css';

/* ==========================================
   CONSTANTS
========================================== */
const SKELETON_ROW_COUNT = 6;
const FALLBACK_EMPTY     = '—';

/* ==========================================
   SKELETON ROW
========================================== */
function SkeletonRow({ columnCount }) {
  return (
    <tr className="data-table-row data-table-row--skeleton" aria-hidden="true">
      {Array.from({ length: columnCount }, (_, i) => (
        <td key={i} className="data-table-cell">
          <div className="data-table-skeleton-cell" />
        </td>
      ))}
    </tr>
  );
}

/* ==========================================
   DATA TABLE
========================================== */
const DataTable = memo(function DataTable({
  columns      = [],
  data         = [],
  loading      = false,
  emptyMessage = 'No records found.',
  rowKeyField  = 'id',
}) {
  const isEmpty = !loading && data.length === 0;

  return (
    <div className="data-table-wrapper" role="region" aria-label="Data table" aria-live="polite">
      <div className="data-table-scroll">
        <table className="data-table" aria-busy={loading ? 'true' : 'false'}>

          {/* ---- Header ---- */}
          <thead className="data-table-head">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="data-table-th"
                  scope="col"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* ---- Body ---- */}
          <tbody className="data-table-body">

            {/* Loading skeleton */}
            {loading && Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
              <SkeletonRow key={`skeleton-${i}`} columnCount={columns.length} />
            ))}

            {/* Data rows */}
            {!loading && !isEmpty && data.map((row, rowIndex) => (
              <tr
                key={row[rowKeyField] ?? rowIndex}
                className="data-table-row"
              >
                {columns.map((col) => (
                  <td key={col.key} className="data-table-cell">
                    {col.render
                      ? col.render(row)
                      : (row[col.key] ?? FALLBACK_EMPTY)
                    }
                  </td>
                ))}
              </tr>
            ))}

            {/* Empty state */}
            {isEmpty && (
              <tr className="data-table-row">
                <td
                  className="data-table-cell data-table-cell--empty"
                  colSpan={columns.length}
                >
                  {emptyMessage}
                </td>
              </tr>
            )}

          </tbody>
        </table>
      </div>
    </div>
  );
});

export default DataTable;
