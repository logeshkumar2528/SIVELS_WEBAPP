import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';
import iconMap from '../../config/iconMap';
import { ROUTES, buildRoute } from '../../config/routeConfig';
import { getRMById, getAgentsByRM, formatCurrency } from '../../data/backOfficeDummyData';
import './RMDetail.css';

export default function RMDetail() {
  const { rmId } = useParams();
  const navigate = useNavigate();

  const rm = getRMById(rmId);
  const agents = useMemo(() => (rm ? getAgentsByRM(rm.id) : []), [rm]);
  const [searchTerm, setSearchTerm] = useState('');

  const UsersIcon = iconMap['Users'];
  const UserCheckIcon = iconMap['UserCheck'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const SearchIcon = iconMap['Search'];
  const PhoneIcon = iconMap['Phone'] || iconMap['Contact'];
  const MailIcon = iconMap['Mail'];
  const MapPinIcon = iconMap['MapPin'] || iconMap['Building2'];
  const AlertCircleIcon = iconMap['AlertCircle'] || iconMap['AlertTriangle'];

  // Handle Invalid RM ID Gracefully
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

  const filteredAgents = agents.filter(
    (ag) =>
      ag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ag.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ag.mobile.includes(searchTerm)
  );

  const breadcrumbs = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD },
    { label: 'Districts', path: ROUTES.DISTRICTS },
    { label: rm.districtName, path: buildRoute.districtDetail(rm.districtId) },
    { label: rm.name },
  ];

  return (
    <div className="bo-page-container">
      {/* Breadcrumb Trail */}
      <Breadcrumb items={breadcrumbs} />

      {/* RM Header Overview Card */}
      <div className="bo-rm-header-card">
        <div className="bo-rm-profile-strip">
          <div className="bo-rm-avatar-large">
            {rm.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="bo-rm-profile-details">
            <div className="bo-rm-tag-row">
              <span className="bo-kicker-tag">RELATIONSHIP MANAGER</span>
              <span className="bo-code-badge">{rm.code}</span>
              <span
                className={`bo-status-pill ${
                  rm.status === 'On track' ? 'is-success' : 'is-warning'
                }`}
              >
                {rm.status}
              </span>
            </div>
            <h2 className="bo-rm-name-heading">{rm.name}</h2>
            <div className="bo-rm-meta-list">
              <span>
                {MapPinIcon && <MapPinIcon size={14} />}
                <strong>Branch:</strong> {rm.branch}, {rm.districtName}
              </span>
              <span>
                {PhoneIcon && <PhoneIcon size={14} />}
                <strong>Mobile:</strong> {rm.mobile}
              </span>
              <span>
                {MailIcon && <MailIcon size={14} />}
                <strong>Email:</strong> {rm.email}
              </span>
              <span>
                <strong>Active Since:</strong> {rm.activeSince}
              </span>
            </div>
          </div>
        </div>

        {/* RM Summary KPIs */}
        <div className="bo-rm-kpis-grid">
          <div className="bo-rm-kpi-item">
            <small>Assigned Agents</small>
            <strong>{rm.agentCount}</strong>
          </div>
          <div className="bo-rm-kpi-item">
            <small>Active Customers</small>
            <strong>{rm.customerCount}</strong>
          </div>
          <div className="bo-rm-kpi-item is-highlight">
            <small>Managed Portfolio</small>
            <strong>{formatCurrency(rm.portfolioAmount)}</strong>
          </div>
          <div className="bo-rm-kpi-item">
            <small>Target Achievement</small>
            <strong>{rm.targetAchievement || 89}%</strong>
          </div>
          <div className="bo-rm-kpi-item is-success">
            <small>Approved Loans</small>
            <strong>{rm.approvedCount}</strong>
          </div>
        </div>
      </div>

      {/* Field Agents Section */}
      <div className="bo-table-card">
        <div className="bo-table-header bo-table-header--split">
          <div className="bo-table-title-wrap">
            {UserCheckIcon && <UserCheckIcon size={18} className="bo-table-icon" />}
            <div>
              <h3>Field Agents Assigned to {rm.name}</h3>
              <p className="bo-table-subtitle">Ground-level agents reporting to this RM across {rm.districtName}.</p>
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
              {filteredAgents.map((ag) => (
                <tr key={ag.id}>
                  <td>
                    <div className="bo-user-cell">
                      <div className="bo-agent-avatar">
                        {ag.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="bo-user-text">
                        <strong>{ag.name}</strong>
                        <small>{ag.code}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="bo-contact-cell">
                      <span>{ag.mobile}</span>
                      <small>{ag.email}</small>
                    </div>
                  </td>
                  <td>
                    <span className="bo-badge-count">{ag.customerCount} Customers</span>
                  </td>
                  <td>
                    <span className="bo-badge-count">{ag.applicationCount || ag.customerCount} Apps</span>
                  </td>
                  <td>
                    <strong className="bo-portfolio-text">
                      {formatCurrency(ag.portfolioAmount)}
                    </strong>
                  </td>
                  <td>
                    <div className="bo-target-cell">
                      <span className="bo-target-percent">{ag.conversionRate || 80}%</span>
                      <div className="bo-mini-progress">
                        <div
                          className="bo-mini-progress-fill"
                          style={{ width: `${ag.conversionRate || 80}%` }}
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
                      {ag.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="bo-drilldown-btn"
                      onClick={() => navigate(buildRoute.agentDetail(ag.id))}
                      aria-label={`View customers for Agent ${ag.name}`}
                    >
                      <span>View Customers</span>
                      {ArrowRightIcon && <ArrowRightIcon size={14} />}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAgents.length === 0 && (
                <tr>
                  <td colSpan={8} className="bo-empty-table-cell">
                    {searchTerm
                      ? `No field agents found matching "${searchTerm}".`
                      : `No field agents are currently assigned to RM ${rm.name}.`}
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
