/**
 * SubmitToCredit.jsx
 * --------------------
 * Back Office queue for applications ready for review and submission to the Credit Manager.
 *
 * Route: /backoffice/submit-to-credit
 *
 * Responsibilities:
 * - Displays customer applications sourced directly from live backend API (`useCustomerQueue`).
 * - Provides search and dynamic filters (District, RM, Agent, Status).
 * - Clicking "Review & Submit" routes to `/backoffice/submit-to-credit/:customerId`.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import { buildRoute } from '../../config/routeConfig';
import { useCustomerQueue } from '../../hooks/useCustomerQueue';
import Pagination from '../../components/Pagination/Pagination';
import './SubmitToCredit.css';

function formatCurrency(amount) {
  const num = Number(amount);
  if (!amount || isNaN(num) || num === 0) return '₹0';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

function getStatusInfo(status) {
  if (status === null || status === undefined) {
    return { label: 'Pending', className: 'stc-pill--pending' };
  }
  if (typeof status === 'number') {
    switch (status) {
      case 2:
        return { label: 'Logged to HO', className: 'stc-pill--progress' };
      case 3:
        return { label: 'Under Review', className: 'stc-pill--progress' };
      case 4:
        return { label: 'Approved', className: 'stc-pill--verified' };
      case 5:
      case 6:
        return { label: 'Returned', className: 'stc-pill--pending' };
      case 1:
      case 0:
      default:
        return { label: 'Pending', className: 'stc-pill--pending' };
    }
  }
  const s = String(status).toLowerCase().trim();
  if (s === '2' || s.includes('logged to ho') || s.includes('received')) return { label: 'Logged to HO', className: 'stc-pill--progress' };
  if (s === '3' || s.includes('review') || s.includes('verification')) return { label: 'Under Review', className: 'stc-pill--progress' };
  if (s === '4' || s.includes('approved')) return { label: 'Approved', className: 'stc-pill--verified' };
  return { label: String(status), className: 'stc-pill--pending' };
}

export default function SubmitToCredit() {
  const navigate = useNavigate();
  const { customers, loading, error, refetch } = useCustomerQueue();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [rmFilter, setRmFilter] = useState('All');
  const [agentFilter, setAgentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Icons
  const SearchIcon = iconMap['Search'];
  const FileTextIcon = iconMap['FileText'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const RefreshCwIcon = iconMap['RefreshCw'];
  const AlertTriangleIcon = iconMap['AlertTriangle'];

  // Gated Queue: Show ONLY applications that have completed the required Back Office verification workflow
  const readyCustomers = useMemo(() => {
    return customers.filter((c) => Boolean(c.isCreditReady || c.isUnderwritingReady));
  }, [customers]);

  // Dynamic filter options derived from live verified applications
  const districtOptions = useMemo(() => {
    return [...new Set(readyCustomers.map((c) => c.districtName).filter(Boolean))].sort();
  }, [readyCustomers]);

  const rmOptions = useMemo(() => {
    return [...new Set(readyCustomers.map((c) => c.rmName).filter(Boolean))].sort();
  }, [readyCustomers]);

  const agentOptions = useMemo(() => {
    return [...new Set(readyCustomers.map((c) => c.agentName).filter(Boolean))].sort();
  }, [readyCustomers]);

  const statusOptions = useMemo(() => {
    return [...new Set(readyCustomers.map((c) => getStatusInfo(c.status).label).filter(Boolean))].sort();
  }, [readyCustomers]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, districtFilter, rmFilter, agentFilter, statusFilter]);

  // Filtering on verified applications queue (Sorted Newest-First)
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return readyCustomers
      .filter((c) => {
        const matchDistrict = districtFilter === 'All' || (c.districtName && c.districtName.toLowerCase() === districtFilter.toLowerCase());
        const matchRM = rmFilter === 'All' || (c.rmName && c.rmName.toLowerCase() === rmFilter.toLowerCase());
        const matchAgent = agentFilter === 'All' || (c.agentName && c.agentName.toLowerCase() === agentFilter.toLowerCase());
        const matchStatus = statusFilter === 'All' || getStatusInfo(c.status).label.toLowerCase() === statusFilter.toLowerCase();

        const custName = String(c.customerName || c.fullName || '').toLowerCase();
        const mobile = String(c.mobile || c.mobileNumber || '');
        const appNo = String(c.appId || (c.applicationNo && !c.applicationNo.startsWith('APP-') ? c.applicationNo : '')).toLowerCase();

        const matchSearch =
          custName.includes(term) ||
          mobile.includes(term) ||
          appNo.includes(term);

        return matchDistrict && matchRM && matchAgent && matchStatus && matchSearch;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.appliedDate || 0).getTime() || 0;
        const timeB = new Date(b.createdAt || b.appliedDate || 0).getTime() || 0;
        if (timeA !== timeB) return timeB - timeA;
        const idA = Number(a.agentCustomerId ?? a.id ?? 0) || 0;
        const idB = Number(b.agentCustomerId ?? b.id ?? 0) || 0;
        return idB - idA;
      });
  }, [readyCustomers, districtFilter, rmFilter, agentFilter, statusFilter, searchTerm]);

  // Pagination Slice
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  const handleReviewClick = (customer) => {
    const targetId = customer.agentCustomerId || customer.id;
    if (targetId) {
      navigate(buildRoute.submitToCreditDetail(targetId));
    }
  };

  return (
    <div className="stc-page-container">
      {/* Search & Dynamic Filter Controls */}
      <div className="stc-controls-card">
        <div className="stc-filters-row">
          <div className="stc-search-bar">
            {SearchIcon && <SearchIcon size={16} style={{ color: '#94a3b8' }} />}
            <input
              type="text"
              placeholder="Search by customer name, mobile, application ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="stc-search-input"
            />
          </div>

          <div className="stc-select-wrap">
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
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
              aria-label="Filter by Relationship Manager"
            >
              <option value="All">All RMs</option>
              {rmOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="stc-select-wrap">
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              aria-label="Filter by Agent"
            >
              <option value="All">All Agents</option>
              {agentOptions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="stc-select-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by Status"
            >
              <option value="All">All Statuses</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="stc-count-badge">
            Showing <strong>{filteredCustomers.length}</strong> of {readyCustomers.length} Verified Applications
          </div>
        </div>
      </div>

      {/* Applications Table Card */}
      <div className="stc-table-card">
        <div className="stc-table-header">
          <h2 className="stc-table-title">
            {FileTextIcon && <FileTextIcon size={18} style={{ color: '#00593b' }} />}
            <span>Underwriting Review Queue for Credit Manager Submission</span>
          </h2>
          <span style={{ fontSize: '0.825rem', color: '#64748b' }}>
            Live Applications
          </span>
        </div>

        {error && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
            <p>Unable to load customer applications: {error}</p>
            <button
              type="button"
              className="stc-btn-review"
              onClick={refetch}
              style={{ marginTop: '0.5rem', display: 'inline-flex' }}
            >
              {RefreshCwIcon && <RefreshCwIcon size={14} />} Retry
            </button>
          </div>
        )}

        {loading && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <p>Loading real-time customer queue from backend...</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="stc-table-scroll">
              <table className="stc-table">
                <thead>
                  <tr>
                    <th>Application No &amp; Date</th>
                    <th>Customer Name</th>
                    <th>Loan Product</th>
                    <th>Amount</th>
                    <th>Assigned RM &amp; Agent</th>
                    <th>Verification Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.map((c) => {
                    const custId = c.agentCustomerId || c.id;
                    const custName = c.customerName || c.fullName || 'Customer';
                    const appNo = c.appId || (c.applicationNo && c.applicationNo !== 'N/A' && !c.applicationNo.startsWith('APP-') ? c.applicationNo : 'N/A');
                    const appliedDate = c.createdAt || c.appliedDate;
                    const statusInfo = getStatusInfo(c.status);

                    return (
                      <tr key={custId}>
                        <td>
                          <strong>{appNo}</strong>
                          <div className="stc-customer-sub">
                            {appliedDate ? String(appliedDate).slice(0, 10) : '—'}
                          </div>
                        </td>
                        <td>
                          <div className="stc-customer-cell">
                            <span className="stc-customer-name">{custName}</span>
                            <span className="stc-customer-sub">{c.mobile || c.mobileNumber || ''}</span>
                          </div>
                        </td>
                        <td>{c.loanType || c.loanProduct || 'Personal Loan'}</td>
                        <td>
                          <span className="stc-amount-cell">
                            {formatCurrency(c.expectedLoanAmount || c.loanAmount || c.amount)}
                          </span>
                        </td>
                        <td>
                          <div><strong>RM:</strong> {c.rmName || '—'}</div>
                          <div className="stc-customer-sub"><strong>Agent:</strong> {c.agentName || '—'}</div>
                        </td>
                        <td>
                          <span className={`stc-pill ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="stc-btn-review"
                            onClick={() => handleReviewClick(c)}
                            aria-label={`Review and submit application ${appNo}`}
                          >
                            <span>Review &amp; Submit</span>
                            {ArrowRightIcon && <ArrowRightIcon size={14} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                        No customer applications found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredCustomers.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredCustomers.length}
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
