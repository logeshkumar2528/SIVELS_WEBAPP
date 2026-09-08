import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import { buildRoute } from '../../config/routeConfig';
import {
  getAllCustomers,
  getAllDistricts,
  getAllRMs,
  getAllAgents,
  formatCurrency,
} from '../../data/backOfficeDummyData';
import './CustomerMonitoring.css';

export default function CustomerMonitoring() {
  const navigate = useNavigate();
  const customers = getAllCustomers();
  const districts = getAllDistricts();
  const rms = getAllRMs();
  const agents = getAllAgents();

  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [rmFilter, setRmFilter] = useState('All');
  const [agentFilter, setAgentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const FileTextIcon = iconMap['FileText'];
  const SearchIcon = iconMap['Search'];
  const FilterIcon = iconMap['Filter'];
  const ArrowRightIcon = iconMap['ArrowRight'];

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchDistrict =
        districtFilter === 'All' ||
        c.districtId === districtFilter ||
        c.districtName.toLowerCase() === districtFilter.toLowerCase();
      const matchRM =
        rmFilter === 'All' ||
        c.rmId === rmFilter ||
        c.rmName.toLowerCase() === rmFilter.toLowerCase();
      const matchAgent =
        agentFilter === 'All' ||
        c.agentId === agentFilter ||
        c.agentName.toLowerCase() === agentFilter.toLowerCase();
      const matchStatus =
        statusFilter === 'All' ||
        c.status.toLowerCase() === statusFilter.toLowerCase();
      const matchSearch =
        c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.applicationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.loanType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.rmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.districtName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.mobile.includes(searchTerm);

      return matchDistrict && matchRM && matchAgent && matchStatus && matchSearch;
    });
  }, [customers, districtFilter, rmFilter, agentFilter, statusFilter, searchTerm]);

  const getStatusClass = (status) => {
    switch (String(status).toLowerCase()) {
      case 'approved':
        return 'is-approved';
      case 'pending':
        return 'is-pending';
      case 'under review':
        return 'is-review';
      case 'rejected':
        return 'is-rejected';
      default:
        return '';
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
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
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
              {rms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
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
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name}
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
              <option value="Pending">Pending</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <span className="bo-customer-count-badge">
            Showing <strong>{filteredCustomers.length}</strong> Applications
          </span>
        </div>
      </div>

      {/* Applications Table */}
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
              {filteredCustomers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="bo-app-no-cell">
                      <strong>{c.applicationNo}</strong>
                      <small>{c.appliedDate}</small>
                    </div>
                  </td>
                  <td>
                    <div className="bo-user-text">
                      <strong>{c.customerName}</strong>
                      <small>{c.mobile}</small>
                    </div>
                  </td>
                  <td>
                    <span className="bo-loan-type-tag">{c.loanType}</span>
                  </td>
                  <td>
                    <strong className="bo-amount-highlight">
                      {formatCurrency(c.amount)}
                    </strong>
                  </td>
                  <td>
                    <div className="bo-team-cell">
                      <span><strong>Agent:</strong> {c.agentName}</span>
                      <small><strong>RM:</strong> {c.rmName}</small>
                    </div>
                  </td>
                  <td>
                    <span className="bo-district-tag">{c.districtName}</span>
                  </td>
                  <td>
                    <span
                      className={`bo-kyc-pill ${
                        c.kycStatus === 'Verified' ? 'is-verified' : 'is-pending'
                      }`}
                    >
                      {c.kycStatus || 'Verified'}
                    </span>
                  </td>
                  <td>
                    <span className={`bo-cust-status-badge ${getStatusClass(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>
                    <div className="bo-actions-cell-wrap">
                      <button
                        type="button"
                        className="bo-verify-btn"
                        onClick={() => navigate(buildRoute.customerVerification(c.id))}
                        aria-label={`Verify application for ${c.customerName}`}
                      >
                        <span>Verify Now</span>
                        {ArrowRightIcon && <ArrowRightIcon size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
      </div>
    </div>
  );
}
