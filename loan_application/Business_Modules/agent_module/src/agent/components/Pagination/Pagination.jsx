import { memo, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './Pagination.css'

function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages = [1]

  if (currentPage > 3) pages.push('...')

  const rangeStart = Math.max(2, currentPage - 1)
  const rangeEnd = Math.min(totalPages - 1, currentPage + 1)

  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i)

  if (currentPage < totalPages - 2) pages.push('...')

  pages.push(totalPages)

  return pages
}

const Pagination = memo(function Pagination({
  currentPage = 1,
  totalItems = 30,
  pageSize = 5,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  )

  return (
    <div className="pagination" role="navigation" aria-label="Table pagination">
      {/* Entry summary */}
      <p className="pagination-summary">
        Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of{' '}
        <strong>{totalItems}</strong> entries
      </p>

      {/* Page controls */}
      <div className="pagination-controls">
        {/* Previous */}
        <button
          type="button"
          className="pagination-btn pagination-btn--nav"
          onClick={() => onPageChange && onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} strokeWidth={2} />
        </button>

        {/* Page numbers */}
        {pageNumbers.map((page, index) =>
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="pagination-ellipsis" aria-hidden="true">
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              className={[
                'pagination-btn',
                'pagination-btn--page',
                page === currentPage ? 'pagination-btn--active' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onPageChange && onPageChange(page)}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          ),
        )}

        {/* Next */}
        <button
          type="button"
          className="pagination-btn pagination-btn--nav"
          onClick={() => onPageChange && onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <ChevronRight size={15} strokeWidth={2} />
        </button>
      </div>

      {/* Rows per page dropdown */}
      {onPageSizeChange && (
        <div className="pagination-page-size">
          <label className="pagination-page-size-label" htmlFor="pagination-page-size-select">
            Rows per page
          </label>
          <select
            id="pagination-page-size-select"
            className="pagination-select"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Select rows per page"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
})

export default Pagination
