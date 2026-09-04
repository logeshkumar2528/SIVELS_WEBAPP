import { memo } from 'react';
import iconMap from '../../config/iconMap';
import './Pagination.css';

const Pagination = memo(function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  pageSize = 7,
  pageSizeOptions = [],
  onPageSizeChange,
  onPageChange,
}) {
  const LeftIcon = iconMap['ChevronLeft'];
  const RightIcon = iconMap['ChevronRight'];

  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="pagination-container">
      <div className="pagination-left">
        <span className="pagination-info">
          Showing <strong>{startRecord}</strong> to <strong>{endRecord}</strong> of <strong>{totalRecords}</strong> records
        </span>

        {pageSizeOptions && pageSizeOptions.length > 0 && (
          <div className="pagination-pagesize-group">
            <label htmlFor="pagination-rows-select" className="pagination-pagesize-label">
              Rows per page:
            </label>
            <select
              id="pagination-rows-select"
              className="pagination-pagesize-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange && onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          {LeftIcon && <LeftIcon size={14} />}
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            className={`pagination-num ${currentPage === p ? 'pagination-num--active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          className="pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          {RightIcon && <RightIcon size={14} />}
        </button>
      </div>
    </div>
  );
});

export default Pagination;
