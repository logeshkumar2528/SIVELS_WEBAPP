import { memo } from 'react';
import './DataTable.css';

const SKELETON_ROW_COUNT = 5;
const FALLBACK_EMPTY = '—';

function SkeletonRow({ columnCount }) {
  return (
    <tr className="data-table-row data-table-row--skeleton">
      {Array.from({ length: columnCount }, (_, i) => (
        <td key={i} className="data-table-cell">
          <div className="data-table-skeleton-cell" />
        </td>
      ))}
    </tr>
  );
}

const DataTable = memo(function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found.',
  rowKeyField = 'id',
  onRowClick,
  variant,
  className = '',
}) {
  const isEmpty = !loading && data.length === 0;
  const variantClass = variant ? `data-table-wrapper--${variant}` : '';

  return (
    <div
      className={`data-table-wrapper ${variantClass} ${className}`.trim()}
      role="region"
      aria-label="Data table"
    >
      <div className="data-table-scroll">
        <table className="data-table" aria-busy={loading ? 'true' : 'false'}>
          <thead className="data-table-head">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`data-table-th ${col.headerClass || ''}`}
                  style={{ textAlign: col.align || 'left' }}
                  scope="col"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="data-table-body">
            {loading &&
              Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
                <SkeletonRow key={`skeleton-${i}`} columnCount={columns.length} />
              ))}

            {!loading &&
              !isEmpty &&
              data.map((row, rowIndex) => (
                <tr
                  key={row[rowKeyField] ?? rowIndex}
                  className={`data-table-row ${onRowClick ? 'data-table-row--clickable' : ''}`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`data-table-cell ${col.cellClass || ''}`}
                      style={{ textAlign: col.align || 'left' }}
                    >
                      {col.render
                        ? col.render(row, rowIndex)
                        : (row[col.key] ?? FALLBACK_EMPTY)}
                    </td>
                  ))}
                </tr>
              ))}

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
