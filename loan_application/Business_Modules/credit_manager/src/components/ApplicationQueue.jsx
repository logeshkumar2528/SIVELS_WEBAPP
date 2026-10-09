/**
 * ApplicationQueue.jsx
 * --------------------
 * Credit Manager application queue in the Back Office queue design
 * (same layout and styles as Back Office "Submit to Credit Manager").
 */

import React, { useEffect, useMemo, useState } from 'react';
import iconMap from '../../../back_office/src/back-office/config/iconMap';
import Pagination from '../../../back_office/src/back-office/components/Pagination/Pagination';
import '../../../back_office/src/back-office/pages/SubmitToCredit/SubmitToCredit.css';
import '../styles/creditManager.css';
import { CM_STATUS_META } from '../mappers/creditMapper';
import { getApplicationNo, parseDate } from '../utils/formatters';

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function isWithinRange(value, fromDate, toDate) {
  if (!fromDate && !toDate) return true;
  const date = parseDate(value);
  if (!date) return false;
  if (fromDate && date < new Date(`${fromDate}T00:00:00`)) return false;
  if (toDate && date > new Date(`${toDate}T23:59:59.999`)) return false;
  return true;
}

export function StatusPill({ status }) {
  const meta = CM_STATUS_META[status];
  if (!meta) return <span className="stc-pill stc-pill--pending">—</span>;
  return <span className={`stc-pill ${meta.className}`}>{meta.label}</span>;
}

/**
 * Props:
 *   applications  {object[]}  — Mapped credit applications
 *   columns       {object[]}  — [{ key, header, render(app) }]
 *   title         {string}    — Table card heading
 *   dateField     {string}    — Field used by the From/To date filter
 *   showStatusFilter {boolean}
 *   loading, error, onRetry, emptyMessage
 */
export default function ApplicationQueue({
  applications,
  columns,
  title,
  dateField = 'createdAt',
  showStatusFilter = false,
  loading,
  error,
  onRetry,
  emptyMessage = 'No applications found.',
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [rmFilter, setRmFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const SearchIcon = iconMap['Search'];
  const CalendarIcon = iconMap['Calendar'];
  const FileTextIcon = iconMap['FileText'];
  const RefreshCwIcon = iconMap['RefreshCw'];

  const districtOptions = useMemo(() => uniqueSorted(applications.map((a) => a.districtName)), [applications]);
  const rmOptions = useMemo(() => uniqueSorted(applications.map((a) => a.rmName)), [applications]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, districtFilter, rmFilter, statusFilter, fromDate, toDate, pageSize]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return applications.filter((app) => {
      if (!isWithinRange(app[dateField], fromDate, toDate)) return false;
      if (districtFilter !== 'All' && app.districtName !== districtFilter) return false;
      if (rmFilter !== 'All' && app.rmName !== rmFilter) return false;
      if (statusFilter !== 'All' && String(app.status) !== statusFilter) return false;
      if (!term) return true;
      return (
        String(app.customerName || '').toLowerCase().includes(term) ||
        String(app.mobile || '').includes(term) ||
        getApplicationNo(app).toLowerCase().includes(term)
      );
    });
  }, [applications, searchTerm, districtFilter, rmFilter, statusFilter, fromDate, toDate, dateField]);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const hasActiveFilters =
    searchTerm || fromDate || toDate || districtFilter !== 'All' || rmFilter !== 'All' || statusFilter !== 'All';

  const resetFilters = () => {
    setSearchTerm('');
    setFromDate('');
    setToDate('');
    setDistrictFilter('All');
    setRmFilter('All');
    setStatusFilter('All');
  };

  return (
    <div className="stc-page-container">
      <div className="stc-controls-card">
        <div className="stc-filter-row-top">
          <div className="stc-search-bar">
            {SearchIcon && <SearchIcon size={16} className="stc-search-icon" />}
            <input
              type="text"
              placeholder="Search by customer name, mobile, application ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="stc-search-input"
              aria-label="Search applications"
            />
          </div>

          <div className="stc-count-badge">
            Showing <strong>{filtered.length}</strong> of {applications.length} Applications
          </div>
        </div>

        <div className="stc-filter-row-bottom">
          <div className="stc-select-wrap">
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="stc-filter-select"
              aria-label="Filter by District"
            >
              <option value="All">All Districts</option>
              {districtOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="stc-select-wrap">
            <select
              value={rmFilter}
              onChange={(e) => setRmFilter(e.target.value)}
              className="stc-filter-select"
              aria-label="Filter by Relationship Manager"
            >
              <option value="All">All RMs</option>
              {rmOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {showStatusFilter && (
            <div className="stc-select-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="stc-filter-select"
                aria-label="Filter by Status"
              >
                <option value="All">All Statuses</option>
                {Object.entries(CM_STATUS_META).map(([status, meta]) => (
                  <option key={status} value={status}>{meta.label}</option>
                ))}
              </select>
            </div>
          )}

          <label className="stc-unified-date-box">
            {CalendarIcon && <CalendarIcon size={14} className="stc-date-icon" />}
            <span className="stc-date-prefix">From Date:</span>
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              className="stc-date-input"
              aria-label="From Date"
            />
          </label>

          <label className="stc-unified-date-box">
            {CalendarIcon && <CalendarIcon size={14} className="stc-date-icon" />}
            <span className="stc-date-prefix">To Date:</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="stc-date-input"
              aria-label="To Date"
            />
          </label>

          {hasActiveFilters && (
            <button type="button" className="stc-btn-reset-filter" onClick={resetFilters} title="Reset all filters">
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="stc-table-card">
        <div className="stc-table-header">
          <h2 className="stc-table-title">
            {FileTextIcon && <FileTextIcon size={18} style={{ color: '#00593b' }} />}
            <span>{title}</span>
          </h2>
          <button type="button" className="stc-btn-reset-filter" onClick={onRetry} disabled={loading}>
            {RefreshCwIcon && <RefreshCwIcon size={14} style={{ marginRight: 6 }} />}
            Refresh
          </button>
        </div>

        {error && (
          <div className="cm-state cm-state--error">
            <p>Unable to load applications: {error}</p>
            <button type="button" className="stc-btn-review" onClick={onRetry}>
              {RefreshCwIcon && <RefreshCwIcon size={14} />} Retry
            </button>
          </div>
        )}

        {loading && !error && (
          <div className="cm-state">
            <p>Loading applications from backend...</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="stc-table-scroll">
              <table className="stc-table">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key}>{col.header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((app) => (
                    <tr key={app.agentCustomerId ?? app.id}>
                      {columns.map((col) => (
                        <td key={col.key}>{col.render(app)}</td>
                      ))}
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="cm-empty-cell">
                        {hasActiveFilters ? 'No applications found matching your criteria.' : emptyMessage}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filtered.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
