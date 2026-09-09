/**
 * RMMonitoring.jsx
 * --------------------
 * Purpose:
 *   Global Relationship Managers directory and operational monitoring for the Back Office module.
 *
 * Architecture:
 *   - Phase 5B Real API Integration: Connected to `GET /RMMaster`, `GET /District`, `GET /AgentMaster`, and `GET /AgentAddCustomer`.
 *   - Zero Dummy Data: Sourced dynamically via `useRMMonitoringData` hook.
 *   - Dynamic District Chips: Generated dynamically with live RM counts per district.
 *   - In-Memory Team & Portfolio Aggregation: Derives real agent counts, active customer counts, and loan portfolio amounts.
 *   - Authentic Navigation: "View Team" routes using authentic `rmId`.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import { buildRoute } from '../../config/routeConfig';
import { useRMMonitoringData } from '../../hooks/useRMMonitoringData';
import { getProfileImageUrl, getInitials } from '../../utils/profileImageHelper';
import './RMMonitoring.css';

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

export default function RMMonitoring() {
  const navigate = useNavigate();

  // 1. Fetch Real RMs, Districts, Agents, and Customers
  const { rms, districts, loading, error, refetch } = useRMMonitoringData();

  // 2. Filter & Search State
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // 3. Icons
  const UsersIcon = iconMap['Users'];
  const SearchIcon = iconMap['Search'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const AlertCircleIcon = iconMap['AlertCircle'] || iconMap['AlertTriangle'];
  const RefreshCwIcon = iconMap['RefreshCw'] || iconMap['RotateCcw'];

  // 4. Filtering Logic
  const filteredRMs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return rms.filter((rm) => {
      const matchDistrict =
        selectedDistrict === 'All' ||
        (rm.districtName && rm.districtName.toLowerCase() === selectedDistrict.toLowerCase()) ||
        String(rm.districtId) === selectedDistrict;

      if (!term) return matchDistrict;

      const name = (rm.name || rm.fullName || '').toLowerCase();
      const code = (rm.code || rm.employeeCode || '').toLowerCase();
      const mobile = String(rm.mobile || '');
      const email = (rm.email || '').toLowerCase();
      const branch = (rm.branch || '').toLowerCase();
      const districtName = (rm.districtName || '').toLowerCase();

      const matchSearch =
        name.includes(term) ||
        code.includes(term) ||
        mobile.includes(term) ||
        email.includes(term) ||
        branch.includes(term) ||
        districtName.includes(term);

      return matchDistrict && matchSearch;
    });
  }, [rms, selectedDistrict, searchTerm]);

  return (
    <div className="bo-page-container">
      {/* District Filter Chips & Search Bar */}
      <div className="bo-filter-section">
        <div className="bo-district-chips">
          <button
            type="button"
            className={`bo-chip ${selectedDistrict === 'All' ? 'is-active' : ''}`}
            onClick={() => setSelectedDistrict('All')}
          >
            All Districts ({rms.length})
          </button>
          {districts.map((d) => (
            <button
              key={d.districtId || d.id || d.name}
              type="button"
              className={`bo-chip ${
                selectedDistrict === d.name || selectedDistrict === String(d.districtId || d.id)
                  ? 'is-active'
                  : ''
              }`}
              onClick={() => setSelectedDistrict(d.name)}
            >
              {d.name} ({d.rmCount || 0})
            </button>
          ))}
        </div>

        <div className="bo-search-box">
          {SearchIcon && <SearchIcon size={16} className="bo-search-icon" />}
          <input
            type="text"
            placeholder="Search RM by name, code, mobile or branch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bo-search-input"
            aria-label="Search relationship managers"
          />
        </div>
      </div>

      {/* RMs Table Card */}
      <div className="bo-table-card">
        <div className="bo-table-header">
          <div className="bo-table-title-wrap">
            {UsersIcon && <UsersIcon size={18} className="bo-table-icon" />}
            <h3>Relationship Managers Directory</h3>
          </div>
          <span className="bo-table-count">
            Showing <strong>{filteredRMs.length}</strong> of {rms.length} RMs
          </span>
        </div>

        {/* Error State Banner */}
        {error && (
          <div className="bo-table-error-container" role="alert">
            <div className="bo-error-flex">
              {AlertCircleIcon && <AlertCircleIcon size={24} className="bo-error-icon" />}
              <div className="bo-error-content">
                <h4>Unable to Load Relationship Managers</h4>
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
            <p className="bo-loading-text">Loading Relationship Managers directory from backend...</p>
          </div>
        )}

        {/* Table Content */}
        {!loading && !error && (
          <div className="bo-table-scroll">
            <table className="bo-table">
              <thead>
                <tr>
                  <th>RM Info</th>
                  <th>District &amp; Branch</th>
                  <th>Contact</th>
                  <th>Assigned Agents</th>
                  <th>Active Customers</th>
                  <th>Portfolio Volume</th>
                  <th>Performance Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRMs.map((rm) => {
                  const targetRmId = rm.rmId || rm.id;
                  const rmName = rm.name || rm.fullName || '—';
                  const rmCode = rm.code || rm.employeeCode || (rm.id ? `RM-${rm.id}` : '—');
                  const mobile = rm.mobile ? `+91 ${rm.mobile}` : '—';
                  const email = rm.email || '—';
                  const branch = rm.branch || '—';
                  const districtName = rm.districtName || '—';

                  return (
                    <tr key={rm.rmId || rm.id}>
                      <td>
                        <div className="bo-user-cell">
                          <BoAvatar
                            role="RM"
                            id={targetRmId}
                            name={rmName}
                            fallbackInitials={rmName.slice(0, 2).toUpperCase()}
                            className="bo-avatar-badge"
                          />
                          <div className="bo-user-text">
                            <strong>{rmName}</strong>
                            <small>{rmCode}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="bo-location-cell">
                          <strong>{districtName}</strong>
                          <small>{branch}</small>
                        </div>
                      </td>
                      <td>
                        <div className="bo-contact-cell">
                          <span>{mobile}</span>
                          <small>{email}</small>
                        </div>
                      </td>
                      <td>
                        <span className="bo-badge-count">{rm.agentCount} Agents</span>
                      </td>
                      <td>
                        <span className="bo-badge-count">{rm.customerCount} Customers</span>
                      </td>
                      <td>
                        <strong className="bo-portfolio-text">
                          {formatCurrency(rm.portfolioAmount)}
                        </strong>
                      </td>
                      <td>
                        <span
                          className={`bo-status-pill ${
                            rm.status === 'Active' || rm.status === 'On track'
                              ? 'is-success'
                              : 'is-warning'
                          }`}
                        >
                          {rm.status || 'Active'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="bo-drilldown-btn"
                          onClick={() => {
                            if (targetRmId) {
                              navigate(buildRoute.rmDetail(targetRmId));
                            }
                          }}
                          aria-label={`View team and agents for RM ${rmName}`}
                        >
                          <span>View Team</span>
                          {ArrowRightIcon && <ArrowRightIcon size={14} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredRMs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="bo-empty-table-cell">
                      No Relationship Managers found matching your filters.
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
