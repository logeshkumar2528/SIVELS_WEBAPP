import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import { buildRoute } from '../../config/routeConfig';
import { getAllAgents, getAllDistricts, getAllRMs, formatCurrency } from '../../data/backOfficeDummyData';
import './AgentMonitoring.css';

export default function AgentMonitoring() {
  const navigate = useNavigate();
  const agents = getAllAgents();
  const districts = getAllDistricts();
  const rms = getAllRMs();

  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [rmFilter, setRmFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const UserCheckIcon = iconMap['UserCheck'] || iconMap['Users'];
  const SearchIcon = iconMap['Search'];
  const FilterIcon = iconMap['Filter'];
  const ArrowRightIcon = iconMap['ArrowRight'];

  const filteredAgents = useMemo(() => {
    return agents.filter((ag) => {
      const matchDistrict =
        districtFilter === 'All' ||
        ag.districtId === districtFilter ||
        ag.districtName.toLowerCase() === districtFilter.toLowerCase();
      const matchRM =
        rmFilter === 'All' ||
        ag.rmId === rmFilter ||
        ag.rmName.toLowerCase() === rmFilter.toLowerCase();
      const matchStatus =
        statusFilter === 'All' ||
        ag.status.toLowerCase() === statusFilter.toLowerCase();
      const matchSearch =
        ag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ag.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ag.rmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ag.districtName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ag.mobile.includes(searchTerm);

      return matchDistrict && matchRM && matchStatus && matchSearch;
    });
  }, [agents, districtFilter, rmFilter, statusFilter, searchTerm]);

  return (
    <div className="bo-page-container">
      {/* Filter and Search Controls */}
      <div className="bo-agent-filter-panel">
        <div className="bo-search-box">
          {SearchIcon && <SearchIcon size={16} className="bo-search-icon" />}
          <input
            type="text"
            placeholder="Search by agent name, code, RM or district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bo-search-input"
          />
        </div>

        <div className="bo-filter-group">
          {/* District Dropdown */}
          <div className="bo-select-wrap">
            {FilterIcon && <FilterIcon size={13} className="bo-filter-icon" />}
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="bo-filter-select"
              aria-label="Filter by district"
            >
              <option value="All">All Districts</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* RM Dropdown */}
          <div className="bo-select-wrap">
            <select
              value={rmFilter}
              onChange={(e) => setRmFilter(e.target.value)}
              className="bo-filter-select"
              aria-label="Filter by RM"
            >
              <option value="All">All RMs</option>
              {rms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.districtName})
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="bo-select-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bo-filter-select"
              aria-label="Filter by status"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <span className="bo-agent-count-badge">
            <strong>{filteredAgents.length}</strong> Agents Listed
          </span>
        </div>
      </div>

      {/* Agents Table */}
      <div className="bo-table-card">
        <div className="bo-table-header">
          <div className="bo-table-title-wrap">
            {UserCheckIcon && <UserCheckIcon size={18} className="bo-table-icon" />}
            <h3>Field Agents Network</h3>
          </div>
          <span className="bo-table-count">
            Showing <strong>{filteredAgents.length}</strong> of {agents.length} Agents
          </span>
        </div>

        <div className="bo-table-scroll">
          <table className="bo-table">
            <thead>
              <tr>
                <th>Agent Info</th>
                <th>Assigned RM</th>
                <th>District</th>
                <th>Mobile</th>
                <th>Customers</th>
                <th>Portfolio Volume</th>
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
                    <div className="bo-rm-assigned-cell">
                      <strong>{ag.rmName}</strong>
                      <small>Reporting RM</small>
                    </div>
                  </td>
                  <td>
                    <span className="bo-district-tag">{ag.districtName}</span>
                  </td>
                  <td>
                    <span className="bo-mobile-text">{ag.mobile}</span>
                  </td>
                  <td>
                    <span className="bo-badge-count">{ag.customerCount} Active</span>
                  </td>
                  <td>
                    <strong className="bo-portfolio-text">
                      {formatCurrency(ag.portfolioAmount)}
                    </strong>
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
                      aria-label={`View customer portfolio for Agent ${ag.name}`}
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
                    No field agents found matching your filter criteria.
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
