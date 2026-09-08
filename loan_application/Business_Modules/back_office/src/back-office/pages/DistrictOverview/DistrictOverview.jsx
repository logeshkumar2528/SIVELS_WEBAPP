import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import { buildRoute } from '../../config/routeConfig';
import { getAllDistricts, formatCurrency } from '../../data/backOfficeDummyData';
import './DistrictOverview.css';

export default function DistrictOverview() {
  const navigate = useNavigate();
  const districts = getAllDistricts();
  const [searchTerm, setSearchTerm] = useState('');

  const MapPinIcon = iconMap['MapPin'] || iconMap['Building2'];
  const SearchIcon = iconMap['Search'];
  const ArrowRightIcon = iconMap['ArrowRight'];

  const filteredDistricts = districts.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.zone.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          />
        </div>
        <div className="bo-filter-summary">
          <span>Showing <strong>{filteredDistricts.length}</strong> of {districts.length} Districts</span>
        </div>
      </div>

      {/* District Cards Grid */}
      <div className="bo-district-cards-grid">
        {filteredDistricts.map((district) => (
          <div
            key={district.id}
            className="bo-district-card bo-district-card--interactive"
            role="button"
            tabIndex={0}
            onClick={() => navigate(buildRoute.districtDetail(district.id))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(buildRoute.districtDetail(district.id));
              }
            }}
            aria-label={`View operations for ${district.name} district`}
          >
            <div className="bo-district-card-header">
              <div className="bo-district-badge">
                {MapPinIcon && <MapPinIcon size={14} />}
                <span>{district.code}</span>
              </div>
              <span className="bo-district-zone">{district.zone}</span>
            </div>

            <h3 className="bo-district-name">{district.name}</h3>
            <p className="bo-district-hq">{district.headquarters}</p>

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
                  style={{ width: `${district.completionRate}%` }}
                />
              </div>
              <div className="bo-portfolio-footer">
                <span>{district.completionRate}% Disbursed</span>
                <span>{district.pendingCount} Pending</span>
              </div>
            </div>

            <div className="bo-district-card-footer">
              <button
                type="button"
                className="bo-district-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(buildRoute.districtDetail(district.id));
                }}
              >
                <span>View District Details</span>
                {ArrowRightIcon && <ArrowRightIcon size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredDistricts.length === 0 && (
        <div className="bo-empty-state">
          <p>No districts found matching "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}
