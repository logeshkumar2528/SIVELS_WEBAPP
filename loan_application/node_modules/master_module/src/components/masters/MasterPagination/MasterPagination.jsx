import { ChevronLeft, ChevronRight } from 'lucide-react';
import './MasterPagination.css';

export function MasterPagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="master-pagination">
      <button
        type="button"
        className="master-pagination-btn"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>

      <span className="master-pagination-info">
        Page {currentPage} of {totalPages}
      </span>

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
  );
}
