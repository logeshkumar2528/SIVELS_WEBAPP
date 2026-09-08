import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';
import iconMap from '../../config/iconMap';
import { ROUTES, buildRoute } from '../../config/routeConfig';
import { getDistrictById, getRMsByDistrict, formatCurrency } from '../../data/backOfficeDummyData';
import './DistrictDetail.css';

export default function DistrictDetail() {
  const { districtId } = useParams();
  const navigate = useNavigate();

  const district = getDistrictById(districtId);
  const rms = useMemo(() => (district ? getRMsByDistrict(district.id) : []), [district]);
  const [searchTerm, setSearchTerm] = useState('');

  const MapPinIcon = iconMap['MapPin'] || iconMap['Building2'];
  const UsersIcon = iconMap['Users'];
  const UserCheckIcon = iconMap['UserCheck'];
  const FileTextIcon = iconMap['FileText'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const SearchIcon = iconMap['Search'];
  const AlertCircleIcon = iconMap['AlertCircle'] || iconMap['AlertTriangle'];
  const WalletIcon = iconMap['Wallet'] || iconMap['BadgeIndianRupee'];

  // Handle Invalid District ID Gracefully
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
          <p>The requested district "{districtId}" could not be found in the operational system.</p>
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

  const filteredRMs = rms.filter(
    (rm) =>
      rm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rm.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rm.branch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const breadcrumbs = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD },
    { label: 'Districts', path: ROUTES.DISTRICTS },
    { label: district.name },
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
            <span className="bo-zone-pill">{district.zone}</span>
          </div>
          <h2 className="bo-detail-heading">{district.name} District Operations</h2>
          <p className="bo-detail-subtext">
            {MapPinIcon && <MapPinIcon size={14} className="bo-icon-inline" />}
            {district.headquarters} &bull; Code: <strong>{district.code}</strong>
          </p>
        </div>

        <div className="bo-detail-kpi-bar">
          <div className="bo-detail-kpi-cell">
            <small>Total RMs</small>
            <strong>{district.rmCount}</strong>
          </div>
          <div className="bo-detail-kpi-cell">
            <small>Total Agents</small>
            <strong>{district.agentCount}</strong>
          </div>
          <div className="bo-detail-kpi-cell">
            <small>Active Customers</small>
            <strong>{district.customerCount}</strong>
          </div>
          <div className="bo-detail-kpi-cell is-highlight">
            <small>Portfolio Volume</small>
            <strong>{formatCurrency(district.totalPortfolio)}</strong>
          </div>
          <div className="bo-detail-kpi-cell is-success">
            <small>Disbursed ({district.completionRate}%)</small>
            <strong>{formatCurrency(district.disbursedAmount)}</strong>
          </div>
        </div>
      </div>

      {/* Relationship Managers List */}
      <div className="bo-table-card">
        <div className="bo-table-header bo-table-header--split">
          <div className="bo-table-title-wrap">
            {UsersIcon && <UsersIcon size={18} className="bo-table-icon" />}
            <div>
              <h3>Relationship Managers in {district.name}</h3>
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
              {filteredRMs.map((rm) => (
                <tr key={rm.id}>
                  <td>
                    <div className="bo-user-cell">
                      <div className="bo-avatar-badge">
                        {rm.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="bo-user-text">
                        <strong>{rm.name}</strong>
                        <small>{rm.code}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="bo-location-cell">
                      <strong>{rm.branch}</strong>
                      <small>{district.name}</small>
                    </div>
                  </td>
                  <td>
                    <div className="bo-contact-cell">
                      <span>{rm.mobile}</span>
                      <small>{rm.email}</small>
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
                      <span className="bo-target-percent">{rm.targetAchievement || 85}%</span>
                      <div className="bo-mini-progress">
                        <div
                          className="bo-mini-progress-fill"
                          style={{ width: `${rm.targetAchievement || 85}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`bo-status-pill ${
                        rm.status === 'On track' ? 'is-success' : 'is-warning'
                      }`}
                    >
                      {rm.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="bo-drilldown-btn"
                      onClick={() => navigate(buildRoute.rmDetail(rm.id))}
                      aria-label={`View team for RM ${rm.name}`}
                    >
                      <span>View Team</span>
                      {ArrowRightIcon && <ArrowRightIcon size={14} />}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRMs.length === 0 && (
                <tr>
                  <td colSpan={9} className="bo-empty-table-cell">
                    {searchTerm
                      ? `No Relationship Managers found matching "${searchTerm}".`
                      : `No Relationship Managers are currently assigned to ${district.name} district.`}
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
