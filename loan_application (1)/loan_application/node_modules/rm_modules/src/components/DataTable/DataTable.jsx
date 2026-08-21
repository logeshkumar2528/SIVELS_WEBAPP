import { memo } from 'react';
import './DataTable.css';

const FALLBACK_EMPTY = '-';

const DataTable = memo(function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found.',
  rowKeyField = 'id',
}) {
  const isEmpty = !loading && data.length === 0;

  return (
    <div className="data-table-wrapper" role="region" aria-label="Data table">
      <div className="data-table-scroll">
        <table className="data-table">
          <thead className="data-table-head">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="data-table-th" scope="col">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="data-table-body">
            {!loading && !isEmpty && data.map((row, rowIndex) => (
              <tr key={row[rowKeyField] ?? rowIndex} className="data-table-row">
                {columns.map((col) => (
                  <td key={col.key} className="data-table-cell">
                    {col.render ? col.render(row) : (row[col.key] ?? FALLBACK_EMPTY)}
                  </td>
                ))}
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
