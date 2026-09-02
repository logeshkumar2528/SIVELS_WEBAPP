import { Edit, Trash2, ChevronsUpDown } from 'lucide-react';
import './MasterTable.css';

export function MasterTable({ 
  columns, 
  data, 
  isLoading, 
  isError, 
  onEdit, 
  onDelete 
}) {
  if (isError) {
    return (
      <div className="master-table-state">
        <p className="master-table-error">Unable to load records</p>
        <p className="master-table-error-sub">Please try again.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="master-table-state">
        <div className="master-table-spinner" aria-label="Loading records..." />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="master-table-state">
        <p className="master-table-empty">No records found</p>
        <p className="master-table-empty-sub">There are currently no records to display.</p>
      </div>
    );
  }

  return (
    <div className="master-table-container">
      <table className="master-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`master-table-th ${col.className || ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {col.label}
                  <ChevronsUpDown size={12} color="#94a3b8" />
                </div>
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="master-table-th master-table-actions-th">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={row.id || index} className="master-table-row">
              {columns.map((col) => (
                <td key={col.key} className={`master-table-td ${col.className || ''}`}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="master-table-td master-table-actions-td">
                  <div className="master-table-actions">
                    {onEdit && (
                      <button
                        type="button"
                        className="master-action-btn edit-btn"
                        onClick={() => onEdit(row)}
                        aria-label="Edit record"
                      >
                        <Edit size={16} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        className="master-action-btn delete-btn"
                        onClick={() => onDelete(row)}
                        aria-label="Delete record"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
