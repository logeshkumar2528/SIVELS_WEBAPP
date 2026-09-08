/**
 * CustomerMonitoring.jsx
 * --------------------
 * Purpose:
 *   Real-time customer loan applications queue for the Back Office module.
 *
 * Architecture:
 *   - Phase 2 Real API Integration: Connected to `GET /AgentAddCustomer` via `useCustomerQueue`.
 *   - Zero Dummy Data Dependencies: Customer records are sourced directly from backend.
 *   - Dynamic Filters: District, RM, Agent, and Status filter options are derived dynamically from live records.
 *   - Real Identifier Routing: "Verify Now" navigates using the authentic primary key (`agentCustomerId`).
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import { buildRoute } from '../../config/routeConfig';
import { useCustomerQueue } from '../../hooks/useCustomerQueue';
import Pagination from '../../components/Pagination/Pagination';
import './CustomerMonitoring.css';

/**
 * Currency formatter for loan amounts.
 */
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

/**
 * Resolves standard display label and CSS class modifier for backend status.
 * Handles numeric enums (0-6), string labels, or null/undefined.
 */
function getStatusInfo(status) {
  if (status === null || status === undefined) {
    return { label: 'Pending', className: 'is-pending' };
  }

  // Handle Numeric Status Codes
  if (typeof status === 'number') {
    switch (status) {
      case 4:
        return { label: 'Approved', className: 'is-approved' };
      case 2:
      case 3:
        return { label: 'Under Review', className: 'is-review' };
      case 5:
        return { label: 'Rejected', className: 'is-rejected' };
      case 6:
        return { label: 'Returned', className: 'is-rejected' };
      case 1:
      case 0:
      default:
        return { label: 'Pending', className: 'is-pending' };
    }
  }

  // Handle String Status Values
  const s = String(status).toLowerCase().trim();
  if (s.includes('approved')) {
    return { label: 'Approved', className: 'is-approved' };
  }
  if (s.includes('reject')) {
    return { label: 'Rejected', className: 'is-rejected' };
  }
  if (s.includes('return')) {
    return { label: 'Returned', className: 'is-rejected' };
  }
  if (s.includes('review') || s.includes('verification') || s.includes('logged to ho') || s.includes('submitted to ho')) {
    return { label: 'Under Review', className: 'is-review' };
  }
  if (s.includes('pending') || s.includes('draft') || s.includes('new') || s.includes('sourced')) {
    return { label: 'Pending', className: 'is-pending' };
  }

  return { label: String(status), className: 'is-pending' };
}

export default function CustomerMonitoring() {
  const navigate = useNavigate();

  // 1. Fetch Real Live Customers from Backend via Hook
  const { customers, loading, error, refetch } = useCustomerQueue();

  // 2. Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [rmFilter, setRmFilter] = useState('All');
  const [agentFilter, setAgentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // 3. Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 4. Icons
  const FileTextIcon = iconMap['FileText'];
  const SearchIcon = iconMap['Search'];
  const FilterIcon = iconMap['Filter'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const AlertTriangleIcon = iconMap['AlertTriangle'] || iconMap['AlertCircle'];
  const RefreshCwIcon = iconMap['RefreshCw'] || iconMap['RotateCcw'];

  // 5. Dynamic Dropdown Options Derived from Real Customers List
  const districtOptions = useMemo(() => {
    const list = [...new Set(customers.map((c) => c.districtName).filter(Boolean))].sort();
    return list;
  }, [customers]);

  const rmOptions = useMemo(() => {
    const list = [...new Set(customers.map((c) => c.rmName).filter(Boolean))].sort();
    return list;
  }, [customers]);

  const agentOptions = useMemo(() => {
    const list = [...new Set(customers.map((c) => c.agentName).filter(Boolean))].sort();
    return list;
  }, [customers]);

  const statusOptions = useMemo(() => {
    const list = [...new Set(customers.map((c) => getStatusInfo(c.status).label).filter(Boolean))].sort();
    return list;
  }, [customers]);

  // 6. Reset Page to 1 When Search or Filters Change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, districtFilter, rmFilter, agentFilter, statusFilter]);

  // 7. Multi-Dimensional Search & Filtering Logic
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return customers.filter((c) => {
      // District Filter
      const matchDistrict =
        districtFilter === 'All' ||
        (c.districtName && c.districtName.toLowerCase() === districtFilter.toLowerCase()) ||
        String(c.districtId) === districtFilter;

      // RM Filter
      const matchRM =
        rmFilter === 'All' ||
        (c.rmName && c.rmName.toLowerCase() === rmFilter.toLowerCase()) ||
        String(c.rmId) === rmFilter;

      // Agent Filter
      const matchAgent =
        agentFilter === 'All' ||
        (c.agentName && c.agentName.toLowerCase() === agentFilter.toLowerCase()) ||
        String(c.agentId) === agentFilter;

      // Status Filter
      const statusLabel = getStatusInfo(c.status).label;
      const matchStatus =
        statusFilter === 'All' ||
        statusLabel.toLowerCase() === statusFilter.toLowerCase();

      // Search Query
      if (!term) return matchDistrict && matchRM && matchAgent && matchStatus;

      const customerName = (c.customerName || c.name || '').toLowerCase();
      const mobile = String(c.mobile || '');
      const appNo = (c.applicationNo || `APP-${c.agentCustomerId || c.id || ''}`).toLowerCase();
      const agentName = (c.agentName || '').toLowerCase();
      const rmName = (c.rmName || '').toLowerCase();
      const district = (c.districtName || '').toLowerCase();
      const loanType = (c.loanType || c.loanPurpose || '').toLowerCase();

      const matchSearch =
        customerName.includes(term) ||
        mobile.includes(term) ||
        appNo.includes(term) ||
        agentName.includes(term) ||
        rmName.includes(term) ||
        district.includes(term) ||
        loanType.includes(term);

      return matchDistrict && matchRM && matchAgent && matchStatus && matchSearch;
    });
  }, [customers, districtFilter, rmFilter, agentFilter, statusFilter, searchTerm]);

  // 8. Sliced Paginated Slice
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  // 9. Navigate to Verification Workspace Using Real agentCustomerId
  const handleVerifyNow = (customer) => {
    const targetId = customer.agentCustomerId || customer.id;
    if (targetId) {
      navigate(buildRoute.customerVerification(targetId));
    }
  };

  return (
    <div className="bo-page-container">
      {/* Multi-Dimensional Filter Control Bar */}
      <div className="bo-customer-filter-panel">
        <div className="bo-search-box">
          {SearchIcon && <SearchIcon size={16} className="bo-search-icon" />}
          <input
            type="text"
            placeholder="Search customer, app no, agent, RM or district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bo-search-input"
            aria-label="Search applications"
          />
        </div>

        <div className="bo-customer-filter-group">
          {/* District Dropdown */}
          <div className="bo-select-wrap">
            {FilterIcon && <FilterIcon size={13} className="bo-filter-icon" />}
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="bo-filter-select"
              aria-label="Filter by district"
            >
              <option value="All">All Districts</option>
              {districtOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* RM Dropdown */}
          <div className="bo-select-wrap">
            <select
              value={rmFilter}
              onChange={(e) => setRmFilter(e.target.value)}
              className="bo-filter-select"
              aria-label="Filter by RM"
            >
              <option value="All">All RMs</option>
              {rmOptions.map((rm) => (
                <option key={rm} value={rm}>
                  {rm}
                </option>
              ))}
            </select>
          </div>

          {/* Agent Dropdown */}
          <div className="bo-select-wrap">
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="bo-filter-select"
              aria-label="Filter by Agent"
            >
              <option value="All">All Agents</option>
              {agentOptions.map((ag) => (
                <option key={ag} value={ag}>
                  {ag}
                </option>
              ))}
            </select>
          </div>

          {/* Loan Status Dropdown */}
          <div className="bo-select-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bo-filter-select"
              aria-label="Filter by Loan Status"
            >
              <option value="All">All Statuses</option>
              {statusOptions.length > 0 ? (
                statusOptions.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))
              ) : (
                <>
                  <option value="Pending">Pending</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </>
              )}
            </select>
          </div>

          <span className="bo-customer-count-badge">
            Showing <strong>{filteredCustomers.length}</strong> Applications
          </span>
        </div>
      </div>

      {/* Applications Table Card */}
      <div className="bo-table-card">
        <div className="bo-table-header">
          <div className="bo-table-title-wrap">
            {FileTextIcon && <FileTextIcon size={18} className="bo-table-icon" />}
            <h3>Customer Loan Applications Queue</h3>
          </div>
          <span className="bo-table-count">
            Total <strong>{filteredCustomers.length}</strong> of {customers.length} Applications
          </span>
        </div>

        {/* Error State Banner */}
        {error && (
          <div className="bo-table-error-container" role="alert">
            <div className="bo-error-flex">
              {AlertTriangleIcon && <AlertTriangleIcon size={24} className="bo-error-icon" />}
              <div className="bo-error-content">
                <h4>Unable to Load Customer Applications</h4>
                <p>{error}</p>
              </div>
            </div>
            <button type="button" className="bo-btn-retry" onClick={refetch}>
              {RefreshCwIcon && <RefreshCwIcon size={13} />}
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bo-table-loading-container" aria-live="polite">
            <div className="bo-loading-spinner" aria-hidden="true" />
            <p className="bo-loading-text">Loading customer applications from backend...</p>
          </div>
        )}

        {/* Live Applications Table */}
        {!loading && !error && (
          <>
            <div className="bo-table-scroll">
              <table className="bo-table">
                <thead>
                  <tr>
                    <th>App No &amp; Date</th>
                    <th>Customer Name</th>
                    <th>Loan Product</th>
                    <th>Amount</th>
                    <th>Assigned Agent &amp; RM</th>
                    <th>District</th>
                    <th>KYC Status</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.map((c) => {
                    const statusInfo = getStatusInfo(c.status);
                    const appNo = c.applicationNo || (c.agentCustomerId ? `APP-${c.agentCustomerId}` : '—');
                    const appliedDate = c.appliedDate || (c.createdAt ? String(c.createdAt).slice(0, 10) : '—');
                    const customerName = c.name || c.customerName || c.fullName || '—';
                    const mobile = c.mobile ? `+91 ${c.mobile}` : '—';
                    const loanType = c.loanType || c.loanPurpose || 'Personal Loan';
                    const amountVal = c.amount || c.expectedLoanAmount || c.loanAmount;
                    const agentName = c.agentName || '—';
                    const rmName = c.rmName || '—';
                    const districtName = c.districtName || '—';
                    const kycStatus = c.kycStatus || 'Verified';

                    return (
                      <tr key={c.id || c.agentCustomerId}>
                        <td>
                          <div className="bo-app-no-cell">
                            <strong>{appNo}</strong>
                            <small>{appliedDate}</small>
                          </div>
                        </td>
                        <td>
                          <div className="bo-user-text">
                            <strong>{customerName}</strong>
                            <small>{mobile}</small>
                          </div>
                        </td>
                        <td>
                          <span className="bo-loan-type-tag">{loanType}</span>
                        </td>
                        <td>
                          <strong className="bo-amount-highlight">
                            {amountVal ? formatCurrency(amountVal) : '₹0'}
                          </strong>
                        </td>
                        <td>
                          <div className="bo-team-cell">
                            <span><strong>Agent:</strong> {agentName}</span>
                            <small><strong>RM:</strong> {rmName}</small>
                          </div>
                        </td>
                        <td>
                          <span className="bo-district-tag">{districtName}</span>
                        </td>
                        <td>
                          <span
                            className={`bo-kyc-pill ${
                              kycStatus === 'Verified' ? 'is-verified' : 'is-pending'
                            }`}
                          >
                            {kycStatus}
                          </span>
                        </td>
                        <td>
                          <span className={`bo-cust-status-badge ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td>
                          <div className="bo-actions-cell-wrap">
                            <button
                              type="button"
                              className="bo-verify-btn"
                              onClick={() => handleVerifyNow(c)}
                              aria-label={`Verify application for ${customerName}`}
                            >
                              <span>Verify Now</span>
                              {ArrowRightIcon && <ArrowRightIcon size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={9} className="bo-empty-table-cell">
                        No customer applications found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
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
