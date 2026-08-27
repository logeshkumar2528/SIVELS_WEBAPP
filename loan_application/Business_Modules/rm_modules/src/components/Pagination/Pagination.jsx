import { memo } from 'react';
import iconMap from '../../config/iconMap';
import './Pagination.css';

const Pagination = memo(function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  pageSize = 5,
  onPageChange,
}) {
  const LeftIcon = iconMap['ChevronLeft'];
  const RightIcon = iconMap['ChevronRight'];

  const startRecord = Math.min((currentPage - 1) * pageSize + 1, totalRecords);
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="pagination-container">
      <span className="pagination-info">
        Showing <strong>{startRecord}</strong> to <strong>{endRecord}</strong> of <strong>{totalRecords}</strong> records
      </span>

      <div className="pagination-controls">
        <button
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
            className={`pagination-num ${currentPage === p ? 'pagination-num--active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}

        <button
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
