import { memo } from 'react';
import './DataTable.css';

const FALLBACK_EMPTY = '-';

const DataTable = memo(function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found.',
  rowKeyField = 'id',
  className = '',
}) {
  const isEmpty = !loading && data.length === 0;

  return (
    <div className={`data-table-wrapper ${className}`.trim()} role="region" aria-label="Data table">
      <div className="data-table-scroll">
        <table className="data-table">
          <thead className="data-table-head">
            <tr>
              {columns.map((col) => {
                const isSno = col.key === 'sno' || col.key === 'sNo' || col.label?.toUpperCase() === 'S.NO';
                return (
                  <th
                    key={col.key}
                    className={`data-table-th ${isSno ? 'data-table-th--sno' : ''} ${col.className || ''}`.trim()}
                    scope="col"
                    style={col.headerStyle || col.style}
                  >
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="data-table-body">
            {!loading && !isEmpty && data.map((row, rowIndex) => (
              <tr key={row[rowKeyField] ?? rowIndex} className="data-table-row">
                {columns.map((col) => {
                  const isSno = col.key === 'sno' || col.key === 'sNo' || col.label?.toUpperCase() === 'S.NO';
                  return (
                    <td
                      key={col.key}
                      className={`data-table-cell ${isSno ? 'data-table-cell--sno' : ''} ${col.className || ''}`.trim()}
                      style={col.cellStyle || col.style}
                    >
                      {col.render ? col.render(row) : (row[col.key] ?? FALLBACK_EMPTY)}
                    </td>
                  );
                })}
              </tr>
            ))}

            {isEmpty && (
              <tr className="data-table-row">
                <td className="data-table-cell data-table-cell--empty" colSpan={columns.length}>
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
