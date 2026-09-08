/**
 * DistrictOverview.jsx
 * --------------------
 * Purpose:
 *   Territory operations overview cards for all districts across Sivels Finance Back Office.
 *
 * Architecture:
 *   - Phase 5C Real API Integration: Connected to `GET /District`, `GET /RMMaster`, `GET /AgentMaster`, and `GET /AgentAddCustomer`.
 *   - Zero Dummy Data: Sourced dynamically via `useDistrictOverviewData` hook.
 *   - In-Memory Territory Aggregations: Derives dynamic RM count, Agent count, Customer count, Portfolio volume, and Completion rate.
 *   - Authentic Navigation: Navigates using authentic `districtId`.
 *   - Visual Consistency: Strictly preserves the 3-cards-per-row compact Sivels green layout.
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import { buildRoute } from '../../config/routeConfig';
import { useDistrictOverviewData } from '../../hooks/useDistrictOverviewData';
import './DistrictOverview.css';

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

export default function DistrictOverview() {
  const navigate = useNavigate();

  // 1. Fetch Real Districts, RMs, Agents, and Customers
  const { districts, loading, error, refetch } = useDistrictOverviewData();

  // 2. Search State
  const [searchTerm, setSearchTerm] = useState('');

  // 3. Icons
  const MapPinIcon = iconMap['MapPin'] || iconMap['Building2'];
  const SearchIcon = iconMap['Search'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const AlertCircleIcon = iconMap['AlertCircle'] || iconMap['AlertTriangle'];
  const RefreshCwIcon = iconMap['RefreshCw'] || iconMap['RotateCcw'];

  // 4. Live Search Filter
  const filteredDistricts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return districts;

    return districts.filter((d) => {
      const name = (d.name || '').toLowerCase();
      const code = (d.code || d.districtCode || '').toLowerCase();
      const zone = (d.zone || '').toLowerCase();
      const hq = (d.headquarters || '').toLowerCase();

      return (
        name.includes(term) ||
        code.includes(term) ||
        zone.includes(term) ||
        hq.includes(term)
      );
    });
  }, [districts, searchTerm]);

  return (
    <div className="bo-page-container">
      {/* Search & Filter Header Bar */}
      <div className="bo-filter-bar">
        <div className="bo-search-box">
          {SearchIcon && <SearchIcon size={16} className="bo-search-icon" />}
          <input
            type="text"
            placeholder="Search by district name, code or zone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bo-search-input"
            aria-label="Search districts"
          />
        </div>
        <div className="bo-filter-summary">
          <span>
            Showing <strong>{filteredDistricts.length}</strong> of {districts.length} Districts
          </span>
        </div>
      </div>

      {/* Error State Banner */}
      {error && (
        <div className="bo-table-error-container" role="alert">
          <div className="bo-error-flex">
            {AlertCircleIcon && <AlertCircleIcon size={24} className="bo-error-icon" />}
            <div className="bo-error-content">
              <h4>Unable to Load Districts Overview</h4>
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
          <p className="bo-loading-text">Loading district operations overview from backend...</p>
        </div>
      )}

      {/* District Cards Grid */}
      {!loading && !error && (
        <div className="bo-district-cards-grid">
          {filteredDistricts.map((district) => {
            const targetId = district.districtId || district.id;
            const districtName = district.name || 'District';
            const districtCode = district.code || district.districtCode || (targetId ? `DIS-${targetId}` : 'DIS');
            const zone = district.zone || 'Tamil Nadu Zone';
            const hq = district.headquarters || `${districtName} HQ`;
            const completionRate = district.completionRate || 0;
            const pendingCount = district.pendingCount || 0;

            return (
              <div
                key={targetId}
                className="bo-district-card bo-district-card--interactive"
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (targetId) {
                    navigate(buildRoute.districtDetail(targetId));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (targetId) {
                      navigate(buildRoute.districtDetail(targetId));
                    }
                  }
                }}
                aria-label={`View operations for ${districtName} district`}
              >
                <div className="bo-district-card-header">
                  <div className="bo-district-badge">
                    {MapPinIcon && <MapPinIcon size={14} />}
                    <span>{districtCode}</span>
                  </div>
                  <span className="bo-district-zone">{zone}</span>
                </div>

                <h3 className="bo-district-name">{districtName}</h3>
                <p className="bo-district-hq">{hq}</p>

                <div className="bo-district-stats-grid">
                  <div className="bo-stat-box">
                    <span className="bo-stat-box-label">RMs</span>
                    <strong className="bo-stat-box-value">{district.rmCount}</strong>
                  </div>
                  <div className="bo-stat-box">
                    <span className="bo-stat-box-label">Agents</span>
                    <strong className="bo-stat-box-value">{district.agentCount}</strong>
                  </div>
                  <div className="bo-stat-box">
                    <span className="bo-stat-box-label">Customers</span>
                    <strong className="bo-stat-box-value">{district.customerCount}</strong>
                  </div>
                </div>

                <div className="bo-district-portfolio">
                  <div className="bo-portfolio-row">
                    <span>Portfolio Volume</span>
                    <strong>{formatCurrency(district.totalPortfolio)}</strong>
                  </div>
                  <div className="bo-progress-track">
                    <div
                      className="bo-progress-fill"
                      style={{ width: `${Math.min(completionRate, 100)}%` }}
                    />
                  </div>
                  <div className="bo-portfolio-footer">
                    <span>{completionRate}% Disbursed</span>
                    <span>{pendingCount} Pending</span>
                  </div>
                </div>

                <div className="bo-district-card-footer">
                  <button
                    type="button"
                    className="bo-district-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (targetId) {
                        navigate(buildRoute.districtDetail(targetId));
                      }
                    }}
                  >
                    <span>View District Details</span>
                    {ArrowRightIcon && <ArrowRightIcon size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && filteredDistricts.length === 0 && (
        <div className="bo-empty-state">
          <p>No districts found matching "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}
