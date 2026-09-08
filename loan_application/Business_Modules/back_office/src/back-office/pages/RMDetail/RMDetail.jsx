/**
 * RMDetail.jsx
 * --------------------
 * Purpose:
 *   Detailed Relationship Manager profile and assigned Field Agents team view for the Back Office module.
 *
 * Architecture:
 *   - Phase 4B Real API Integration: Connected to `GET /RMMaster/:rmId`, `GET /AgentMaster`, and `GET /AgentAddCustomer`.
 *   - Zero Dummy Data: Sourced dynamically via `useRMDetailData` hook.
 *   - In-Memory Performance Aggregation: Calculates live agent KPIs (customers, applications, portfolio, conversion).
 *   - Authentic Navigation: "View Customers" routes using real `agentId`.
 */

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';
import iconMap from '../../config/iconMap';
import { ROUTES, buildRoute } from '../../config/routeConfig';
import { useRMDetailData } from '../../hooks/useRMDetailData';
import './RMDetail.css';

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

export default function RMDetail() {
  const { rmId } = useParams();
  const navigate = useNavigate();

  // 1. Fetch Real RM Profile, Assigned Agents, and Sourced Customers
  const { rm, agents, customers, metrics, loading, error, refetch } = useRMDetailData(rmId);

  // 2. Search State
  const [searchTerm, setSearchTerm] = useState('');

  // 3. Icons
  const UsersIcon = iconMap['Users'];
  const UserCheckIcon = iconMap['UserCheck'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const SearchIcon = iconMap['Search'];
  const PhoneIcon = iconMap['Phone'] || iconMap['Contact'];
  const MailIcon = iconMap['Mail'];
  const MapPinIcon = iconMap['MapPin'] || iconMap['Building2'];
  const AlertCircleIcon = iconMap['AlertCircle'] || iconMap['AlertTriangle'];
  const RefreshCwIcon = iconMap['RefreshCw'] || iconMap['RotateCcw'];

  // 4. In-Memory Filtered Agents List
  const filteredAgents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return agents;

    return agents.filter((ag) => {
      const name = (ag.name || ag.fullName || '').toLowerCase();
      const code = (ag.code || ag.agentCode || '').toLowerCase();
      const mobile = String(ag.mobile || '');
      const email = (ag.email || '').toLowerCase();
      const branch = (ag.branch || '').toLowerCase();
      const district = (ag.districtName || '').toLowerCase();

      return (
        name.includes(term) ||
        code.includes(term) ||
        mobile.includes(term) ||
        email.includes(term) ||
        branch.includes(term) ||
        district.includes(term)
      );
    });
  }, [agents, searchTerm]);

  // 5. Loading State View
  if (loading) {
    return (
      <div className="bo-page-container">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: ROUTES.DASHBOARD },
            { label: 'RMs', path: ROUTES.RMS },
            { label: 'Loading RM...' },
          ]}
        />
        <div className="bo-table-loading-container" aria-live="polite">
          <div className="bo-loading-spinner" aria-hidden="true" />
          <p className="bo-loading-text">Loading Relationship Manager details and assigned agents...</p>
        </div>
      </div>
    );
  }

  // 6. Error State View
  if (error && !rm) {
    return (
      <div className="bo-page-container">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: ROUTES.DASHBOARD },
            { label: 'RMs', path: ROUTES.RMS },
            { label: 'Error' },
          ]}
        />
        <div className="bo-table-error-container" role="alert">
          <div className="bo-error-flex">
            {AlertCircleIcon && <AlertCircleIcon size={24} className="bo-error-icon" />}
            <div className="bo-error-content">
              <h4>Unable to Load RM Profile</h4>
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
              onClick={() => navigate(ROUTES.RMS)}
            >
              {ArrowLeftIcon && <ArrowLeftIcon size={14} />}
              <span>Back to RMs</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 7. Handle Invalid / Not Found RM Gracefully
  if (!rm) {
    return (
      <div className="bo-page-container">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: ROUTES.DASHBOARD },
            { label: 'RMs', path: ROUTES.RMS },
            { label: 'Not Found' },
          ]}
        />
        <div className="bo-not-found-card">
          <div className="bo-not-found-icon">
            {AlertCircleIcon && <AlertCircleIcon size={32} />}
          </div>
          <h2>Relationship Manager Not Found</h2>
          <p>The requested RM "{rmId}" could not be located in the operational system.</p>
          <button
            type="button"
            className="bo-btn bo-btn--primary"
            onClick={() => navigate(ROUTES.RMS)}
          >
            {ArrowLeftIcon && <ArrowLeftIcon size={16} />}
            <span>Back to RMs Directory</span>
          </button>
        </div>
      </div>
    );
  }

  // 8. Dynamic Breadcrumb Trail
  const breadcrumbs = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD },
    { label: 'RMs', path: ROUTES.RMS },
    ...(rm.districtName && rm.districtId
      ? [{ label: rm.districtName, path: buildRoute.districtDetail(rm.districtId) }]
      : rm.districtName
      ? [{ label: rm.districtName }]
      : []),
    { label: rm.name || `RM ${rm.code || rmId}` },
  ];

  return (
    <div className="bo-page-container">
      {/* Breadcrumb Trail */}
      <Breadcrumb items={breadcrumbs} />

      {/* RM Header Overview Card */}
      <div className="bo-rm-header-card">
        <div className="bo-rm-profile-strip">
          <div className="bo-rm-avatar-large">
            {(rm.name || 'RM').slice(0, 2).toUpperCase()}
          </div>
          <div className="bo-rm-profile-details">
            <div className="bo-rm-tag-row">
              <span className="bo-kicker-tag">RELATIONSHIP MANAGER</span>
              <span className="bo-code-badge">{rm.code || rm.employeeCode || `RM-${rmId}`}</span>
              <span
                className={`bo-status-pill ${
                  rm.status === 'Active' || rm.status === 'On track' ? 'is-success' : 'is-warning'
                }`}
              >
                {rm.status || 'Active'}
              </span>
            </div>
            <h2 className="bo-rm-name-heading">{rm.name || rm.fullName || 'Relationship Manager'}</h2>
            <div className="bo-rm-meta-list">
              <span>
                {MapPinIcon && <MapPinIcon size={14} />}
                <strong>Branch:</strong> {rm.branch || '—'}
                {rm.districtName ? `, ${rm.districtName}` : ''}
              </span>
              <span>
                {PhoneIcon && <PhoneIcon size={14} />}
                <strong>Mobile:</strong> {rm.mobile ? `+91 ${rm.mobile}` : '—'}
              </span>
              <span>
                {MailIcon && <MailIcon size={14} />}
                <strong>Email:</strong> {rm.email || '—'}
              </span>
              <span>
                <strong>Active Since:</strong> {rm.activeSince || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* RM Summary KPIs */}
        <div className="bo-rm-kpis-grid">
          <div className="bo-rm-kpi-item">
            <small>Assigned Agents</small>
            <strong>{metrics.totalAgents}</strong>
          </div>
          <div className="bo-rm-kpi-item">
            <small>Active Customers</small>
            <strong>{metrics.totalCustomers}</strong>
          </div>
          <div className="bo-rm-kpi-item is-highlight">
            <small>Managed Portfolio</small>
            <strong>{formatCurrency(metrics.totalPortfolio)}</strong>
          </div>
          <div className="bo-rm-kpi-item">
            <small>Target Achievement</small>
            <strong>{metrics.targetAchievement}%</strong>
          </div>
          <div className="bo-rm-kpi-item is-success">
            <small>Approved Loans</small>
            <strong>{metrics.approvedCount}</strong>
          </div>
        </div>
      </div>

      {/* Field Agents Section */}
      <div className="bo-table-card">
        <div className="bo-table-header bo-table-header--split">
          <div className="bo-table-title-wrap">
            {UserCheckIcon && <UserCheckIcon size={18} className="bo-table-icon" />}
            <div>
              <h3>Field Agents Assigned to {rm.name || 'Relationship Manager'}</h3>
              <p className="bo-table-subtitle">
                Ground-level agents reporting to this RM{rm.districtName ? ` across ${rm.districtName}` : ''}.
              </p>
            </div>
          </div>

          <div className="bo-search-box bo-search-box--compact">
            {SearchIcon && <SearchIcon size={15} className="bo-search-icon" />}
            <input
              type="text"
              placeholder="Search agent by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bo-search-input"
              aria-label="Search assigned agents"
            />
          </div>
        </div>

        <div className="bo-table-scroll">
          <table className="bo-table">
            <thead>
              <tr>
                <th>Agent Info</th>
                <th>Contact</th>
                <th>Active Customers</th>
                <th>Sourced Applications</th>
                <th>Disbursed Volume</th>
                <th>Conversion Rate</th>
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
                const email = ag.email || '—';

                return (
                  <tr key={ag.agentId || ag.id}>
                    <td>
                      <div className="bo-user-cell">
                        <div className="bo-agent-avatar">
                          {agentName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="bo-user-text">
                          <strong>{agentName}</strong>
                          <small>{agentCode}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="bo-contact-cell">
                        <span>{mobile}</span>
                        <small>{email}</small>
                      </div>
                    </td>
                    <td>
                      <span className="bo-badge-count">{ag.customerCount} Customers</span>
                    </td>
                    <td>
                      <span className="bo-badge-count">
                        {ag.applicationCount || ag.customerCount} Apps
                      </span>
                    </td>
                    <td>
                      <strong className="bo-portfolio-text">
                        {formatCurrency(ag.portfolioAmount)}
                      </strong>
                    </td>
                    <td>
                      <div className="bo-target-cell">
                        <span className="bo-target-percent">{ag.conversionRate}%</span>
                        <div className="bo-mini-progress">
                          <div
                            className="bo-mini-progress-fill"
                            style={{ width: `${Math.min(ag.conversionRate, 100)}%` }}
                          />
                        </div>
                      </div>
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
                        aria-label={`View customers for Agent ${agentName}`}
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
                    {searchTerm
                      ? `No field agents found matching "${searchTerm}".`
                      : `No field agents are currently assigned to RM ${rm.name || rm.code || rmId}.`}
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
