import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import { buildRoute } from '../../config/routeConfig';
import { getAllRMs, getAllDistricts, formatCurrency } from '../../data/backOfficeDummyData';
import './RMMonitoring.css';

export default function RMMonitoring() {
  const navigate = useNavigate();
  const rms = getAllRMs();
  const districts = getAllDistricts();

  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const UsersIcon = iconMap['Users'];
  const SearchIcon = iconMap['Search'];
  const ArrowRightIcon = iconMap['ArrowRight'];

  const filteredRMs = useMemo(() => {
    return rms.filter((rm) => {
      const matchDistrict =
        selectedDistrict === 'All' ||
        rm.districtName.toLowerCase() === selectedDistrict.toLowerCase() ||
        rm.districtId === selectedDistrict;
      const matchSearch =
        rm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rm.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rm.branch.toLowerCase().includes(searchTerm.toLowerCase());
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
              key={d.id}
              type="button"
              className={`bo-chip ${selectedDistrict === d.name ? 'is-active' : ''}`}
              onClick={() => setSelectedDistrict(d.name)}
            >
              {d.name} ({d.rmCount})
            </button>
          ))}
        </div>

        <div className="bo-search-box">
          {SearchIcon && <SearchIcon size={16} className="bo-search-icon" />}
          <input
            type="text"
            placeholder="Search RM by name, code or branch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bo-search-input"
          />
        </div>
      </div>

      {/* RMs Table */}
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
                      <strong>{rm.districtName}</strong>
                      <small>{rm.branch}</small>
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
                      aria-label={`View team and agents for RM ${rm.name}`}
                    >
                      <span>View Team</span>
                      {ArrowRightIcon && <ArrowRightIcon size={14} />}
                    </button>
                  </td>
                </tr>
              ))}
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
      </div>
    </div>
  );
}
