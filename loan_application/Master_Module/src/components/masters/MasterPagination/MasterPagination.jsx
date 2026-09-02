import { ChevronLeft, ChevronRight } from 'lucide-react';
import './MasterPagination.css';

export function MasterPagination({ currentPage, totalPages, onPageChange, totalItems, pageSize, onPageSizeChange }) {
  if (totalPages <= 1 && !totalItems && !onPageSizeChange) return null;

  const startItem = pageSize ? (currentPage - 1) * pageSize + 1 : 1;
  const endItem = pageSize ? Math.min(currentPage * pageSize, totalItems) : totalItems;

  return (
    <div className="master-pagination">
      <div className="master-pagination-left">
        {onPageSizeChange && (
          <div className="master-page-size-selector">
            <span className="master-pagination-text">Show</span>
            <select 
              className="master-page-size-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="master-pagination-text">entries</span>
          </div>
        )}
        <div className="master-pagination-text">
          {totalItems > 0 
            ? (onPageSizeChange ? `(Showing ${startItem} to ${endItem} of ${totalItems})` : `Showing ${startItem} to ${endItem} of ${totalItems} entries`)
            : `Page ${currentPage} of ${totalPages}`}
        </div>
      </div>
      
      <div className="master-pagination-controls">
        <button
          type="button"
          className="master-pagination-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          type="button"
          className="master-pagination-btn active"
        >
          {currentPage}
        </button>

        <button
          type="button"
          className="master-pagination-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
