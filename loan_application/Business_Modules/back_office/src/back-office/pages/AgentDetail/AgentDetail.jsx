import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';
import iconMap from '../../config/iconMap';
import { ROUTES, buildRoute } from '../../config/routeConfig';
import { getAgentById, getCustomersByAgent, formatCurrency } from '../../data/backOfficeDummyData';
import './AgentDetail.css';

export default function AgentDetail() {
  const { agentId } = useParams();
  const navigate = useNavigate();

  const agent = getAgentById(agentId);
  const customers = useMemo(() => (agent ? getCustomersByAgent(agent.id) : []), [agent]);

  const [searchTerm, setSearchTerm] = useState('');

  const UserCheckIcon = iconMap['UserCheck'] || iconMap['Users'];
  const FileTextIcon = iconMap['FileText'];
  const SearchIcon = iconMap['Search'];
  const PhoneIcon = iconMap['Phone'] || iconMap['Contact'];
  const MailIcon = iconMap['Mail'];
  const MapPinIcon = iconMap['MapPin'] || iconMap['Building2'];
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const AlertCircleIcon = iconMap['AlertCircle'] || iconMap['AlertTriangle'];

  // Handle Invalid Agent ID Gracefully
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

  const filteredCustomers = customers.filter(
    (c) =>
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.applicationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.loanType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.includes(searchTerm)
  );

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

  const breadcrumbs = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD },
    { label: 'Districts', path: ROUTES.DISTRICTS },
    { label: agent.districtName, path: buildRoute.districtDetail(agent.districtId) },
    { label: agent.rmName, path: buildRoute.rmDetail(agent.rmId) },
    { label: agent.name },
  ];

  return (
    <div className="bo-page-container">
      {/* Breadcrumb Navigation Trail */}
      <Breadcrumb items={breadcrumbs} />

      {/* Agent Header Profile Card */}
      <div className="bo-agent-header-card">
        <div className="bo-agent-profile-strip">
          <div className="bo-agent-avatar-large">
            {agent.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="bo-agent-profile-details">
            <div className="bo-agent-tag-row">
              <span className="bo-kicker-tag">FIELD AGENT</span>
              <span className="bo-code-badge">{agent.code}</span>
              <span
                className={`bo-status-pill ${
                  agent.status === 'Active' ? 'is-success' : 'is-warning'
                }`}
              >
                {agent.status}
              </span>
            </div>
            <h2 className="bo-agent-name-heading">{agent.name}</h2>
            <div className="bo-agent-meta-list">
              <span>
                {MapPinIcon && <MapPinIcon size={14} />}
                <strong>District:</strong> {agent.districtName}
              </span>
              <span>
                {UserCheckIcon && <UserCheckIcon size={14} />}
                <strong>Reporting RM:</strong>{' '}
                <button
                  type="button"
                  className="bo-text-link-btn"
                  onClick={() => navigate(buildRoute.rmDetail(agent.rmId))}
                >
                  {agent.rmName}
                </button>
              </span>
              <span>
                {PhoneIcon && <PhoneIcon size={14} />}
                <strong>Mobile:</strong> {agent.mobile}
              </span>
              <span>
                {MailIcon && <MailIcon size={14} />}
                <strong>Email:</strong> {agent.email}
              </span>
              <span>
                <strong>Joined:</strong> {agent.joinedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Agent Summary KPIs */}
        <div className="bo-agent-kpis-grid">
          <div className="bo-agent-kpi-item">
            <small>Total Customers</small>
            <strong>{agent.customerCount}</strong>
          </div>
          <div className="bo-agent-kpi-item">
            <small>Applications Sourced</small>
            <strong>{agent.applicationCount || agent.customerCount}</strong>
          </div>
          <div className="bo-agent-kpi-item is-highlight">
            <small>Sourced Portfolio</small>
            <strong>{formatCurrency(agent.portfolioAmount)}</strong>
          </div>
          <div className="bo-agent-kpi-item">
            <small>Conversion Rate</small>
            <strong>{agent.conversionRate || 80}%</strong>
          </div>
          <div className="bo-agent-kpi-item is-success">
            <small>Approved Loans</small>
            <strong>{agent.approvedCount}</strong>
          </div>
        </div>
      </div>

      {/* Sourced Customers Table */}
      <div className="bo-table-card">
        <div className="bo-table-header bo-table-header--split">
          <div className="bo-table-title-wrap">
            {FileTextIcon && <FileTextIcon size={18} className="bo-table-icon" />}
            <div>
              <h3>Customers Sourced by {agent.name}</h3>
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
                      <small>{c.employmentType}</small>
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
                    <span className="bo-mobile-text">{c.mobile}</span>
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
                  <td colSpan={8} className="bo-empty-table-cell">
                    {searchTerm
                      ? `No customers found matching "${searchTerm}".`
                      : `No customer applications are currently associated with Agent ${agent.name}.`}
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
