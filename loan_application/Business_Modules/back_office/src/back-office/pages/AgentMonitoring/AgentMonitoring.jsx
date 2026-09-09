/**
 * AgentMonitoring.jsx
 * --------------------
 * Purpose:
 *   Global Field Agents directory and performance monitoring for the Back Office module.
 *
 * Architecture:
 *   - Phase 5A Real API Integration: Connected to `GET /AgentMaster`, `GET /RMMaster`, `GET /District`, and `GET /AgentAddCustomer`.
 *   - Zero Dummy Data: Sourced dynamically via `useAgentMonitoringData` hook.
 *   - In-Memory Customer Aggregations: Dynamic customer count, portfolio volume, application volume, and conversion rates.
 *   - Dynamic Filters: District, RM, and Status filter options are derived dynamically from live API records.
 *   - Authentic Navigation: "View Customers" routes using authentic `agentId`.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import { buildRoute } from '../../config/routeConfig';
import { useAgentMonitoringData } from '../../hooks/useAgentMonitoringData';
import { getProfileImageUrl, getInitials } from '../../utils/profileImageHelper';
import './AgentMonitoring.css';

function BoAvatar({ role, id, name, fallbackInitials, className }) {
  const [error, setError] = useState(false);
  const imageUrl = getProfileImageUrl(role, id);

  useEffect(() => {
    setError(false);
  }, [imageUrl]);

  const initials = fallbackInitials || getInitials(name, role === 'RM' ? 'RM' : role === 'Agent' ? 'AG' : 'BO');

  if (imageUrl && !error) {
    return (
      <div className={className} style={{ overflow: 'hidden', padding: 0 }}>
        <img
          src={imageUrl}
          alt={`${name || role} avatar`}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {initials}
    </div>
  );
}

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

export default function AgentMonitoring() {
  const navigate = useNavigate();

  // 1. Fetch Real Agents, RMs, Districts, and Customers from Live Backend APIs
  const { agents, rms, districts, loading, error, refetch } = useAgentMonitoringData();

  // 2. Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [rmFilter, setRmFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // 3. Icons
  const UserCheckIcon = iconMap['UserCheck'] || iconMap['Users'];
  const SearchIcon = iconMap['Search'];
  const FilterIcon = iconMap['Filter'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const AlertCircleIcon = iconMap['AlertCircle'] || iconMap['AlertTriangle'];
  const RefreshCwIcon = iconMap['RefreshCw'] || iconMap['RotateCcw'];

  // 4. Dynamic Options for Dropdowns
  const districtOptions = useMemo(() => {
    const list = [...new Set(districts.map((d) => d.name).concat(agents.map((a) => a.districtName)).filter(Boolean))].sort();
    return list;
  }, [districts, agents]);

  const rmOptions = useMemo(() => {
    const list = [...new Set(rms.map((r) => r.name).concat(agents.map((a) => a.rmName)).filter(Boolean))].sort();
    return list;
  }, [rms, agents]);

  const statusOptions = useMemo(() => {
    const list = [...new Set(agents.map((a) => a.status).filter(Boolean))].sort();
    return list.length > 0 ? list : ['Active', 'Inactive'];
  }, [agents]);

  // 5. Multi-Dimensional Search & Filtering Logic
  const filteredAgents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return agents.filter((ag) => {
      // District Filter
      const matchDistrict =
        districtFilter === 'All' ||
        (ag.districtName && ag.districtName.toLowerCase() === districtFilter.toLowerCase()) ||
        String(ag.districtId) === districtFilter;

      // RM Filter
      const matchRM =
        rmFilter === 'All' ||
        (ag.rmName && ag.rmName.toLowerCase() === rmFilter.toLowerCase()) ||
        String(ag.rmId) === rmFilter;

      // Status Filter
      const matchStatus =
        statusFilter === 'All' ||
        (ag.status && ag.status.toLowerCase() === statusFilter.toLowerCase());

      // Search Query
      if (!term) return matchDistrict && matchRM && matchStatus;

      const name = (ag.name || ag.fullName || '').toLowerCase();
      const code = (ag.code || ag.agentCode || '').toLowerCase();
      const mobile = String(ag.mobile || '');
      const email = (ag.email || '').toLowerCase();
      const rmName = (ag.rmName || '').toLowerCase();
      const districtName = (ag.districtName || '').toLowerCase();
      const branch = (ag.branch || '').toLowerCase();

      const matchSearch =
        name.includes(term) ||
        code.includes(term) ||
        mobile.includes(term) ||
        email.includes(term) ||
        rmName.includes(term) ||
        districtName.includes(term) ||
        branch.includes(term);

      return matchDistrict && matchRM && matchStatus && matchSearch;
    });
  }, [agents, districtFilter, rmFilter, statusFilter, searchTerm]);

  return (
    <div className="bo-page-container">
      {/* Filter and Search Controls */}
      <div className="bo-agent-filter-panel">
        <div className="bo-search-box">
          {SearchIcon && <SearchIcon size={16} className="bo-search-icon" />}
          <input
            type="text"
            placeholder="Search by agent name, code, RM or district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bo-search-input"
            aria-label="Search agents"
          />
        </div>

        <div className="bo-filter-group">
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
              {rmOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="bo-select-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bo-filter-select"
              aria-label="Filter by status"
            >
              <option value="All">All Statuses</option>
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <span className="bo-agent-count-badge">
            <strong>{filteredAgents.length}</strong> Agents Listed
          </span>
        </div>
      </div>

      {/* Agents Table Card */}
      <div className="bo-table-card">
        <div className="bo-table-header">
          <div className="bo-table-title-wrap">
            {UserCheckIcon && <UserCheckIcon size={18} className="bo-table-icon" />}
            <h3>Field Agents Network</h3>
          </div>
          <span className="bo-table-count">
            Showing <strong>{filteredAgents.length}</strong> of {agents.length} Agents
          </span>
        </div>

        {/* Error State Banner */}
        {error && (
          <div className="bo-table-error-container" role="alert">
            <div className="bo-error-flex">
              {AlertCircleIcon && <AlertCircleIcon size={24} className="bo-error-icon" />}
              <div className="bo-error-content">
                <h4>Unable to Load Field Agents</h4>
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
            <p className="bo-loading-text">Loading field agents network from backend...</p>
          </div>
        )}

        {/* Table Content */}
        {!loading && !error && (
          <div className="bo-table-scroll">
            <table className="bo-table">
              <thead>
                <tr>
                  <th>Agent Info</th>
                  <th>Assigned RM</th>
                  <th>District</th>
                  <th>Mobile</th>
                  <th>Customers</th>
                  <th>Portfolio Volume</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((ag) => {
                  const targetAgentId = ag.agentId || ag.id;
                  const agentName = ag.name || ag.fullName || '—';
                  const agentCode = ag.code || ag.agentCode || (ag.id ? `AGT-${ag.id}` : '—');
                  const mobile = ag.mobile ? `+91 ${ag.mobile}` : '—';
                  const rmName = ag.rmName || 'Assigned RM';
                  const districtName = ag.districtName || '—';

                  return (
                    <tr key={ag.agentId || ag.id}>
                      <td>
                        <div className="bo-user-cell">
                          <BoAvatar
                            role="Agent"
                            id={targetAgentId}
                            name={agentName}
                            fallbackInitials={agentName.slice(0, 2).toUpperCase()}
                            className="bo-agent-avatar"
                          />
                          <div className="bo-user-text">
                            <strong>{agentName}</strong>
                            <small>{agentCode}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="bo-rm-assigned-cell">
                          <strong>{rmName}</strong>
                          <small>Reporting RM</small>
                        </div>
                      </td>
                      <td>
                        <span className="bo-district-tag">{districtName}</span>
                      </td>
                      <td>
                        <span className="bo-mobile-text">{mobile}</span>
                      </td>
                      <td>
                        <span className="bo-badge-count">{ag.customerCount} Active</span>
                      </td>
                      <td>
                        <strong className="bo-portfolio-text">
                          {formatCurrency(ag.portfolioAmount)}
                        </strong>
                      </td>
                      <td>
                        <span
                          className={`bo-status-pill ${
                            ag.status === 'Active' ? 'is-success' : 'is-warning'
                          }`}
                        >
                          {ag.status || 'Active'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="bo-drilldown-btn"
                          onClick={() => {
                            if (targetAgentId) {
                              navigate(buildRoute.agentDetail(targetAgentId));
                            }
                          }}
                          aria-label={`View customer portfolio for Agent ${agentName}`}
                        >
                          <span>View Customers</span>
                          {ArrowRightIcon && <ArrowRightIcon size={14} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredAgents.length === 0 && (
                  <tr>
                    <td colSpan={8} className="bo-empty-table-cell">
                      No field agents found matching your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
