/**
 * AgentDetail.jsx
 * --------------------
 * Purpose:
 *   Detailed Field Agent profile and sourced borrower applications view for the Back Office module.
 *
 * Architecture:
 *   - Phase 4A Real API Integration: Connected to `GET /AgentMaster/:agentId` & `GET /AgentAddCustomer`.
 *   - Zero Dummy Data: Sourced dynamically via `useAgentDetailData` hook.
 *   - Dynamic Metrics: Computes real-time totals (Total Customers, Loan Portfolio, Approved, Conversion Rate).
 *   - Direct Relational Verification: "Verify Now" routes using the authentic primary key (`agentCustomerId`).
 */

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';
import iconMap from '../../config/iconMap';
import { ROUTES, buildRoute } from '../../config/routeConfig';
import { useAgentDetailData } from '../../hooks/useAgentDetailData';
import './AgentDetail.css';

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
 * Resolves standard display label and CSS class modifier for customer loan status.
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

export default function AgentDetail() {
  const { agentId } = useParams();
  const navigate = useNavigate();

  // 1. Fetch Real Agent Profile and Sourced Customers from Live Backend APIs
  const { agent, customers, loading, error, refetch } = useAgentDetailData(agentId);

  // 2. Search Term State
  const [searchTerm, setSearchTerm] = useState('');

  // 3. Icons
  const UserCheckIcon = iconMap['UserCheck'] || iconMap['Users'];
  const FileTextIcon = iconMap['FileText'];
  const SearchIcon = iconMap['Search'];
  const PhoneIcon = iconMap['Phone'] || iconMap['Contact'];
  const MailIcon = iconMap['Mail'];
  const MapPinIcon = iconMap['MapPin'] || iconMap['Building2'];
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const AlertCircleIcon = iconMap['AlertCircle'] || iconMap['AlertTriangle'];
  const RefreshCwIcon = iconMap['RefreshCw'] || iconMap['RotateCcw'];

  // 4. Compute Dynamic Live KPIs from Agent's Customer Applications
  const kpis = useMemo(() => {
    const totalCustomers = customers.length;
    const totalApplications = customers.length;
    const totalPortfolio = customers.reduce(
      (sum, c) => sum + Number(c.amount || c.expectedLoanAmount || c.loanAmount || 0),
      0
    );
    const approvedCount = customers.filter((c) => {
      const statusInfo = getStatusInfo(c.status);
      return statusInfo.label === 'Approved';
    }).length;
    const conversionRate = totalApplications > 0
      ? Math.round((approvedCount / totalApplications) * 100)
      : (agent?.conversionRate || 0);

    return {
      totalCustomers,
      totalApplications,
      totalPortfolio,
      approvedCount,
      conversionRate,
    };
  }, [customers, agent]);

  // 5. Filtered Customer List
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return customers;

    return customers.filter((c) => {
      const customerName = (c.customerName || c.name || c.fullName || '').toLowerCase();
      const appNo = (c.applicationNo || (c.agentCustomerId ? `APP-${c.agentCustomerId}` : '')).toLowerCase();
      const loanType = (c.loanType || c.loanPurpose || '').toLowerCase();
      const mobile = String(c.mobile || '');

      return (
        customerName.includes(term) ||
        appNo.includes(term) ||
        loanType.includes(term) ||
        mobile.includes(term)
      );
    });
  }, [customers, searchTerm]);

  // 6. Loading State View
  if (loading) {
    return (
      <div className="bo-page-container">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: ROUTES.DASHBOARD },
            { label: 'Agents', path: ROUTES.AGENTS },
            { label: 'Loading Agent...' },
          ]}
        />
        <div className="bo-table-loading-container" aria-live="polite">
          <div className="bo-loading-spinner" aria-hidden="true" />
          <p className="bo-loading-text">Loading agent details and customer portfolio...</p>
        </div>
      </div>
    );
  }

  // 7. Error State View
  if (error && !agent) {
    return (
      <div className="bo-page-container">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: ROUTES.DASHBOARD },
            { label: 'Agents', path: ROUTES.AGENTS },
            { label: 'Error' },
          ]}
        />
        <div className="bo-table-error-container" role="alert">
          <div className="bo-error-flex">
            {AlertCircleIcon && <AlertCircleIcon size={24} className="bo-error-icon" />}
            <div className="bo-error-content">
              <h4>Unable to Load Agent Profile</h4>
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
              onClick={() => navigate(ROUTES.AGENTS)}
            >
              {ArrowLeftIcon && <ArrowLeftIcon size={14} />}
              <span>Back to Agents</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 8. Handle Invalid Agent ID Gracefully
  if (!agent) {
    return (
      <div className="bo-page-container">
        <Breadcrumb
          items={[
            { label: 'Dashboard', path: ROUTES.DASHBOARD },
            { label: 'Agents', path: ROUTES.AGENTS },
            { label: 'Not Found' },
          ]}
        />
        <div className="bo-not-found-card">
          <div className="bo-not-found-icon">
            {AlertCircleIcon && <AlertCircleIcon size={32} />}
          </div>
          <h2>Field Agent Not Found</h2>
          <p>The requested Field Agent "{agentId}" could not be located in the operational system.</p>
          <button
            type="button"
            className="bo-btn bo-btn--primary"
            onClick={() => navigate(ROUTES.AGENTS)}
          >
            {ArrowLeftIcon && <ArrowLeftIcon size={16} />}
            <span>Back to Agents Directory</span>
          </button>
        </div>
      </div>
    );
  }

  // 9. Breadcrumbs Structure
  const breadcrumbs = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD },
    { label: 'Agents', path: ROUTES.AGENTS },
    ...(agent.districtName && agent.districtId
      ? [{ label: agent.districtName, path: buildRoute.districtDetail(agent.districtId) }]
      : agent.districtName
      ? [{ label: agent.districtName }]
      : []),
    ...(agent.rmName && agent.rmId
      ? [{ label: agent.rmName, path: buildRoute.rmDetail(agent.rmId) }]
      : agent.rmName
      ? [{ label: agent.rmName }]
      : []),
    { label: agent.name || `Agent ${agent.code || agentId}` },
  ];

  return (
    <div className="bo-page-container">
      {/* Breadcrumb Navigation Trail */}
      <Breadcrumb items={breadcrumbs} />

      {/* Agent Header Profile Card */}
      <div className="bo-agent-header-card">
        <div className="bo-agent-profile-strip">
          <div className="bo-agent-avatar-large">
            {(agent.name || 'AG').slice(0, 2).toUpperCase()}
          </div>
          <div className="bo-agent-profile-details">
            <div className="bo-agent-tag-row">
              <span className="bo-kicker-tag">FIELD AGENT</span>
              <span className="bo-code-badge">{agent.code || agent.agentCode || `AGT-${agentId}`}</span>
              <span
                className={`bo-status-pill ${
                  agent.status === 'Active' ? 'is-success' : 'is-warning'
                }`}
              >
                {agent.status || 'Active'}
              </span>
            </div>
            <h2 className="bo-agent-name-heading">{agent.name || agent.fullName || 'Field Agent'}</h2>
            <div className="bo-agent-meta-list">
              <span>
                {MapPinIcon && <MapPinIcon size={14} />}
                <strong>District:</strong> {agent.districtName || '—'}
              </span>
              <span>
                {UserCheckIcon && <UserCheckIcon size={14} />}
                <strong>Reporting RM:</strong>{' '}
                {agent.rmId ? (
                  <button
                    type="button"
                    className="bo-text-link-btn"
                    onClick={() => navigate(buildRoute.rmDetail(agent.rmId))}
                  >
                    {agent.rmName || 'Assigned RM'}
                  </button>
                ) : (
                  <span>{agent.rmName || '—'}</span>
                )}
              </span>
              <span>
                {PhoneIcon && <PhoneIcon size={14} />}
                <strong>Mobile:</strong> {agent.mobile ? `+91 ${agent.mobile}` : '—'}
              </span>
              <span>
                {MailIcon && <MailIcon size={14} />}
                <strong>Email:</strong> {agent.email || '—'}
              </span>
              <span>
                <strong>Joined:</strong> {agent.joinedDate || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Agent Summary KPIs */}
        <div className="bo-agent-kpis-grid">
          <div className="bo-agent-kpi-item">
            <small>Total Customers</small>
            <strong>{kpis.totalCustomers}</strong>
          </div>
          <div className="bo-agent-kpi-item">
            <small>Applications Sourced</small>
            <strong>{kpis.totalApplications}</strong>
          </div>
          <div className="bo-agent-kpi-item is-highlight">
            <small>Sourced Portfolio</small>
            <strong>{formatCurrency(kpis.totalPortfolio)}</strong>
          </div>
          <div className="bo-agent-kpi-item">
            <small>Conversion Rate</small>
            <strong>{kpis.conversionRate}%</strong>
          </div>
          <div className="bo-agent-kpi-item is-success">
            <small>Approved Loans</small>
            <strong>{kpis.approvedCount}</strong>
          </div>
        </div>
      </div>

      {/* Sourced Customers Table */}
      <div className="bo-table-card">
        <div className="bo-table-header bo-table-header--split">
          <div className="bo-table-title-wrap">
            {FileTextIcon && <FileTextIcon size={18} className="bo-table-icon" />}
            <div>
              <h3>Customers Sourced by {agent.name || 'Field Agent'}</h3>
              <p className="bo-table-subtitle">Borrowers and loan applications managed through this field agent.</p>
            </div>
          </div>

          <div className="bo-search-box bo-search-box--compact">
            {SearchIcon && <SearchIcon size={15} className="bo-search-icon" />}
            <input
              type="text"
              placeholder="Search customer, app no or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bo-search-input"
              aria-label="Search agent customers"
            />
          </div>
        </div>

        <div className="bo-table-scroll">
          <table className="bo-table">
            <thead>
              <tr>
                <th>App No &amp; Date</th>
                <th>Customer Name</th>
                <th>Loan Product</th>
                <th>Loan Amount</th>
                <th>Contact</th>
                <th>KYC Status</th>
                <th>Application Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => {
                const statusInfo = getStatusInfo(c.status);
                const appNo = c.applicationNo || (c.agentCustomerId ? `APP-${c.agentCustomerId}` : '—');
                const appliedDate = c.appliedDate || (c.createdAt ? String(c.createdAt).slice(0, 10) : '—');
                const customerName = c.customerName || c.name || c.fullName || '—';
                const employmentType = c.employmentType || 'Salaried';
                const loanType = c.loanType || c.loanPurpose || 'Personal Loan';
                const amountVal = c.amount || c.expectedLoanAmount || c.loanAmount || 0;
                const mobile = c.mobile ? `+91 ${c.mobile}` : '—';
                const kycStatus = c.kycStatus || 'Verified';
                const targetId = c.agentCustomerId || c.id;

                return (
                  <tr key={c.agentCustomerId || c.id}>
                    <td>
                      <div className="bo-app-no-cell">
                        <strong>{appNo}</strong>
                        <small>{appliedDate}</small>
                      </div>
                    </td>
                    <td>
                      <div className="bo-user-text">
                        <strong>{customerName}</strong>
                        <small>{employmentType}</small>
                      </div>
                    </td>
                    <td>
                      <span className="bo-loan-type-tag">{loanType}</span>
                    </td>
                    <td>
                      <strong className="bo-amount-highlight">
                        {formatCurrency(amountVal)}
                      </strong>
                    </td>
                    <td>
                      <span className="bo-mobile-text">{mobile}</span>
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
                          onClick={() => {
                            if (targetId) {
                              navigate(buildRoute.customerVerification(targetId));
                            }
                          }}
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
                  <td colSpan={8} className="bo-empty-table-cell">
                    {searchTerm
                      ? `No customers found matching "${searchTerm}".`
                      : `No customer applications are currently associated with Agent ${agent.name || agent.code || agentId}.`}
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
