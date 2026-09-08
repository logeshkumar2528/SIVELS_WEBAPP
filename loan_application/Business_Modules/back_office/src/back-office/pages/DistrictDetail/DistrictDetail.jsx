/**
 * DistrictDetail.jsx
 * --------------------
 * Purpose:
 *   Operational territory overview and Relationship Managers management view for the Back Office module.
 *
 * Architecture:
 *   - Phase 4C Real API Integration: Connected to `GET /District/:districtId`, `GET /RMMaster`, `GET /AgentMaster`, `GET /AgentAddCustomer`.
 *   - Zero Dummy Data: Sourced dynamically via `useDistrictDetailData` hook.
 *   - Hierarchical RM-level Aggregation: Dynamically derives agent counts, customer counts, and loan volumes for each RM.
 *   - Authentic Navigation: "View Team" routes using authentic `rmId`.
 */

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';
import iconMap from '../../config/iconMap';
import { ROUTES, buildRoute } from '../../config/routeConfig';
import { useDistrictDetailData } from '../../hooks/useDistrictDetailData';
import './DistrictDetail.css';

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

export default function DistrictDetail() {
  const { districtId } = useParams();
  const navigate = useNavigate();

  // 1. Fetch Real District, RMs, Agents, and Customers
  const { district, rms, agents, customers, metrics, loading, error, refetch } =
    useDistrictDetailData(districtId);

  // 2. Search State
  const [searchTerm, setSearchTerm] = useState('');

  // 3. Icons
  const MapPinIcon = iconMap['MapPin'] || iconMap['Building2'];
  const UsersIcon = iconMap['Users'];
  const UserCheckIcon = iconMap['UserCheck'];
  const FileTextIcon = iconMap['FileText'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const SearchIcon = iconMap['Search'];
  const AlertCircleIcon = iconMap['AlertCircle'] || iconMap['AlertTriangle'];
  const RefreshCwIcon = iconMap['RefreshCw'] || iconMap['RotateCcw'];

  // 4. In-Memory Filtered RMs
  const filteredRMs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rms;

    return rms.filter((rm) => {
      const name = (rm.name || rm.fullName || '').toLowerCase();
      const code = (rm.code || rm.employeeCode || '').toLowerCase();
      const branch = (rm.branch || '').toLowerCase();
      const districtName = (rm.districtName || '').toLowerCase();

      return (
        name.includes(term) ||
        code.includes(term) ||
        branch.includes(term) ||
        districtName.includes(term)
      );
    });
  }, [rms, searchTerm]);

  // 5. Loading State View
  if (loading) {
    return (
      <div className="bo-page-container">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: ROUTES.DASHBOARD },
            { label: 'Districts', path: ROUTES.DISTRICTS },
            { label: 'Loading District...' },
          ]}
        />
        <div className="bo-table-loading-container" aria-live="polite">
          <div className="bo-loading-spinner" aria-hidden="true" />
          <p className="bo-loading-text">Loading district information and operational network...</p>
        </div>
      </div>
    );
  }

  // 6. Error State View
  if (error && !district) {
    return (
      <div className="bo-page-container">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: ROUTES.DASHBOARD },
            { label: 'Districts', path: ROUTES.DISTRICTS },
            { label: 'Error' },
          ]}
        />
        <div className="bo-table-error-container" role="alert">
          <div className="bo-error-flex">
            {AlertCircleIcon && <AlertCircleIcon size={24} className="bo-error-icon" />}
            <div className="bo-error-content">
              <h4>Unable to Load District Information</h4>
              <p>{error}</p>
            </div>
          </div>
          <div className="bo-actions-cell-wrap">
            <button type="button" className="bo-btn-retry" onClick={refetch}>
              {RefreshCwIcon && <RefreshCwIcon size={13} />}
              <span>Retry</span>
            </button>
            <button
              type="button"
              className="bo-btn bo-btn--primary"
              onClick={() => navigate(ROUTES.DISTRICTS)}
            >
              {ArrowLeftIcon && <ArrowLeftIcon size={14} />}
              <span>Back to Districts</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 7. Handle Invalid / Not Found District Gracefully
  if (!district) {
    return (
      <div className="bo-page-container">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: ROUTES.DASHBOARD },
            { label: 'Districts', path: ROUTES.DISTRICTS },
            { label: 'Not Found' },
          ]}
        />
        <div className="bo-not-found-card">
          <div className="bo-not-found-icon">
            {AlertCircleIcon && <AlertCircleIcon size={32} />}
          </div>
          <h2>District Not Found</h2>
          <p>The requested district "{districtId}" could not be located in the operational system.</p>
          <button
            type="button"
            className="bo-btn bo-btn--primary"
            onClick={() => navigate(ROUTES.DISTRICTS)}
          >
            {ArrowLeftIcon && <ArrowLeftIcon size={16} />}
            <span>Back to Districts</span>
          </button>
        </div>
      </div>
    );
  }

  // 8. Dynamic Breadcrumbs
  const breadcrumbs = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD },
    { label: 'Districts', path: ROUTES.DISTRICTS },
    { label: district.name || `District ${district.code || districtId}` },
  ];

  return (
    <div className="bo-page-container">
      {/* Breadcrumb Navigation */}
      <Breadcrumb items={breadcrumbs} />

      {/* District Header Overview Banner */}
      <div className="bo-detail-header-card">
        <div className="bo-detail-header-main">
          <div className="bo-detail-tag-row">
            <span className="bo-kicker-tag">OPERATIONAL TERRITORY</span>
            <span className="bo-zone-pill">{district.zone || 'Tamil Nadu Zone'}</span>
          </div>
          <h2 className="bo-detail-heading">{district.name || 'District'} District Operations</h2>
          <p className="bo-detail-subtext">
            {MapPinIcon && <MapPinIcon size={14} className="bo-icon-inline" />}
            {district.headquarters || `${district.name} HQ`} &bull; Code:{' '}
            <strong>{district.code || district.districtCode || `DIS-${districtId}`}</strong>
          </p>
        </div>

        <div className="bo-detail-kpi-bar">
          <div className="bo-detail-kpi-cell">
            <small>Total RMs</small>
            <strong>{metrics.totalRMs}</strong>
          </div>
          <div className="bo-detail-kpi-cell">
            <small>Total Agents</small>
            <strong>{metrics.totalAgents}</strong>
          </div>
          <div className="bo-detail-kpi-cell">
            <small>Active Customers</small>
            <strong>{metrics.totalCustomers}</strong>
          </div>
          <div className="bo-detail-kpi-cell is-highlight">
            <small>Portfolio Volume</small>
            <strong>{formatCurrency(metrics.totalPortfolio)}</strong>
          </div>
          <div className="bo-detail-kpi-cell is-success">
            <small>Disbursed ({metrics.completionRate}%)</small>
            <strong>{formatCurrency(metrics.disbursedAmount)}</strong>
          </div>
        </div>
      </div>

      {/* Relationship Managers List */}
      <div className="bo-table-card">
        <div className="bo-table-header bo-table-header--split">
          <div className="bo-table-title-wrap">
            {UsersIcon && <UsersIcon size={18} className="bo-table-icon" />}
            <div>
              <h3>Relationship Managers in {district.name || 'District'}</h3>
              <p className="bo-table-subtitle">Select an RM to inspect their assigned field agents and portfolio.</p>
            </div>
          </div>

          <div className="bo-search-box bo-search-box--compact">
            {SearchIcon && <SearchIcon size={15} className="bo-search-icon" />}
            <input
              type="text"
              placeholder="Search RM by name, code or branch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bo-search-input"
              aria-label="Search district relationship managers"
            />
          </div>
        </div>

        <div className="bo-table-scroll">
          <table className="bo-table">
            <thead>
              <tr>
                <th>RM Profile</th>
                <th>Branch</th>
                <th>Contact Details</th>
                <th>Assigned Agents</th>
                <th>Customers</th>
                <th>Portfolio Volume</th>
                <th>Target Achievement</th>
                <th>Status</th>
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

                return (
                  <tr key={rm.rmId || rm.id}>
                    <td>
                      <div className="bo-user-cell">
                        <div className="bo-avatar-badge">
                          {rmName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="bo-user-text">
                          <strong>{rmName}</strong>
                          <small>{rmCode}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="bo-location-cell">
                        <strong>{branch}</strong>
                        <small>{district.name || '—'}</small>
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
                      <div className="bo-target-cell">
                        <span className="bo-target-percent">
                          {rm.targetAchievement || rm.conversionRate || 0}%
                        </span>
                        <div className="bo-mini-progress">
                          <div
                            className="bo-mini-progress-fill"
                            style={{
                              width: `${Math.min(rm.targetAchievement || rm.conversionRate || 0, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`bo-status-pill ${
                          rm.status === 'Active' || rm.status === 'On track' ? 'is-success' : 'is-warning'
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
                        aria-label={`View team for RM ${rmName}`}
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
                  <td colSpan={9} className="bo-empty-table-cell">
                    {searchTerm
                      ? `No Relationship Managers found matching "${searchTerm}".`
                      : `No Relationship Managers are currently assigned to ${district.name || 'this'} district.`}
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
