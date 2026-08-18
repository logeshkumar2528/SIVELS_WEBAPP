import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import {
  Users,
  UserCheck,
  Clock,
  Briefcase,
  IndianRupee,
  Search,
  Calendar,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import "./MyAgents.css";

export default function MyAgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '2025-06-05', end: '2025-06-05' });

  const formatDate = (dateStr) => {
    if(!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const agentsData = [
    { name: "Thiru", id: "AGT0001", branch: "KK Nagar", mobile: "98765 43210", customers: 18, active: 12, pendingVerif: 4, pendingColl: 2, status: "Active" },
    { name: "Arun", id: "AGT0002", branch: "Vadapalani", mobile: "98765 43211", customers: 15, active: 10, pendingVerif: 3, pendingColl: 2, status: "Active" },
    { name: "Priya Sharma", id: "AGT0003", branch: "Ashok Nagar", mobile: "98765 43212", customers: 22, active: 18, pendingVerif: 2, pendingColl: 1, status: "Active" },
    { name: "Karthik", id: "AGT0004", branch: "Anna Nagar", mobile: "98765 43213", customers: 20, active: 14, pendingVerif: 3, pendingColl: 3, status: "Active" },
    { name: "Meena Devi", id: "AGT0005", branch: "KK Nagar", mobile: "98765 43214", customers: 17, active: 13, pendingVerif: 1, pendingColl: 1, status: "Active" },
    { name: "Vignesh Raj", id: "AGT0006", branch: "Vadapalani", mobile: "98765 43215", customers: 16, active: 12, pendingVerif: 2, pendingColl: 2, status: "Inactive" },
    { name: "Lakshmi Priya", id: "AGT0007", branch: "Ashok Nagar", mobile: "98765 43216", customers: 19, active: 15, pendingVerif: 2, pendingColl: 1, status: "Active" },
  ];

  // Duplicate data to simulate multiple pages
  const allAgentsData = [...agentsData, ...agentsData.map(a => ({...a, id: a.id+"-2", name: a.name+" 2"}))];
  
  const totalPages = Math.ceil(allAgentsData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, allAgentsData.length);
  const currentData = allAgentsData.slice(startIndex, endIndex);

  return (
    <main className="content agents-content">
      {/* Stats Cards */}
      <div className="agents-stats-grid mb-4">
        <div className="agent-stat-card border-green">
          <div className="agent-stat-icon bg-light-green text-green"><Users size={20} /></div>
          <div className="agent-stat-info">
            <div className="agent-stat-title">Total Agents</div>
            <div className="agent-stat-val">12</div>
            <div className="agent-stat-sub text-muted">All Areas</div>
          </div>
        </div>
        
        <div className="agent-stat-card border-blue">
          <div className="agent-stat-icon bg-light-blue text-blue"><UserCheck size={20} /></div>
          <div className="agent-stat-info">
            <div className="agent-stat-title">Total Customers</div>
            <div className="agent-stat-val">256</div>
            <div className="agent-stat-sub text-green flex-align-center gap-1">
              <TrendingUp size={12} /> 14.6% <span className="text-muted font-normal text-xs">vs last month</span>
            </div>
          </div>
        </div>

        <div className="agent-stat-card border-orange">
          <div className="agent-stat-icon bg-light-orange text-orange"><Clock size={20} /></div>
          <div className="agent-stat-info">
            <div className="agent-stat-title">Pending Verification</div>
            <div className="agent-stat-val">38</div>
            <div className="agent-stat-sub text-red flex-align-center gap-1">
              <TrendingUp size={12} /> 8.2% <span className="text-muted font-normal text-xs">vs last month</span>
            </div>
          </div>
        </div>

        <div className="agent-stat-card border-purple">
          <div className="agent-stat-icon bg-light-purple text-purple"><Briefcase size={20} /></div>
          <div className="agent-stat-info">
            <div className="agent-stat-title">Active Customers</div>
            <div className="agent-stat-val">198</div>
            <div className="agent-stat-sub text-green flex-align-center gap-1">
              <TrendingUp size={12} /> 12.4% <span className="text-muted font-normal text-xs">vs last month</span>
            </div>
          </div>
        </div>

        <div className="agent-stat-card border-red">
          <div className="agent-stat-icon bg-light-red text-red"><IndianRupee size={20} /></div>
          <div className="agent-stat-info">
            <div className="agent-stat-title">Pending Collections</div>
            <div className="agent-stat-val">26</div>
            <div className="agent-stat-sub text-red flex-align-center gap-1">
              <TrendingUp size={12} /> 5.3% <span className="text-muted font-normal text-xs">vs last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="agents-filters-row mb-4">
        <div className="search-box">
          <input type="text" placeholder="Search by Agent Name / Agent ID / Mobile" className="search-input" />
          <Search className="search-icon" size={16} />
        </div>
        
        <div className="filter-group">
          <div className="filter-label">Area</div>
          <div className="filter-select-wrapper">
            <select className="filter-select">
              <option>All Areas</option>
            </select>
            <ChevronDown className="select-icon" size={14} />
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-label">Status</div>
          <div className="filter-select-wrapper">
            <select className="filter-select">
              <option>All Status</option>
            </select>
            <ChevronDown className="select-icon" size={14} />
          </div>
        </div>

        <div className="filter-group" style={{ position: "relative" }}>
          <div className="filter-label">Date Range</div>
          <div 
            className="filter-input-wrapper" 
            onClick={() => setShowDatePicker(!showDatePicker)}
            style={{ cursor: "pointer" }}
          >
            <input 
              type="text" 
              className="filter-input date-input" 
              value={`${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`} 
              readOnly 
              style={{ cursor: "pointer" }}
            />
            <Calendar className="input-icon-right" size={14} />
          </div>

          {showDatePicker && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '8px',
              background: '#fff', border: '1px solid #edf0f2', borderRadius: '8px',
              padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10
            }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#5b6472' }}>From Date</div>
                  <input type="date" className="filter-input" style={{ minWidth: '130px', padding: '6px 10px' }} value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#5b6472' }}>To Date</div>
                  <input type="date" className="filter-input" style={{ minWidth: '130px', padding: '6px 10px' }} value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
                </div>
              </div>
              <button 
                className="btn-primary w-100" 
                style={{ marginTop: '16px', padding: '8px', display: 'flex', justifyContent: 'center' }} 
                onClick={() => setShowDatePicker(false)}
              >
                Apply Range
              </button>
            </div>
          )}
        </div>

        <button className="btn-export">
          <Download size={14} /> Export
        </button>
      </div>

      {/* Table */}
      <div className="panel agents-table-panel">
        <div className="table-responsive">
          <table className="agents-table">
            <thead>
              <tr>
                <th>Agent Name</th>
                <th>Agent ID</th>
                <th>Area / Branch</th>
                <th>Mobile Number</th>
                <th>Customers Added</th>
                <th>Active Customers</th>
                <th>Pending Verification</th>
                <th>Pending Collections</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((agent, i) => (
                <tr key={i}>
                  <td>
                    <div className="agent-name-cell">
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(agent.name)}`} 
                        alt={agent.name} 
                        className="agent-avatar-sm" 
                        style={{ background: "#e2e8f0", objectFit: "cover", overflow: "hidden" }}
                      />
                      <span className="font-semibold text-dark">{agent.name}</span>
                    </div>
                  </td>
                  <td className="text-dark font-medium">{agent.id}</td>
                  <td className="text-dark">{agent.branch}</td>
                  <td className="text-dark">{agent.mobile}</td>
                  <td className="text-dark font-semibold text-center">{agent.customers}</td>
                  <td className="text-green font-bold text-center">{agent.active}</td>
                  <td className="text-orange font-bold text-center">{agent.pendingVerif}</td>
                  <td className="text-red font-bold text-center">{agent.pendingColl}</td>
                  <td>
                    <span className={`status-badge ${agent.status === "Active" ? "available" : "inactive"}`}>
                      {agent.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn-outline-sm btn-view" onClick={() => setSelectedAgent(agent)}>
                      <Eye size={12} /> View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-pagination">
          <div className="pagination-info text-muted text-xs">
            Showing {allAgentsData.length > 0 ? startIndex + 1 : 0} to {endIndex} of {allAgentsData.length} agents
          </div>
          
          <div className="pagination-controls">
            <button className="page-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button 
                key={page} 
                className={`page-btn ${currentPage === page ? 'active' : ''}`} 
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button className="page-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="pagination-rows flex-align-center gap-2">
            <span className="text-xs text-muted">Rows per page</span>
            <div className="filter-select-wrapper" style={{ width: "60px" }}>
              <select 
                className="filter-select" 
                style={{ padding: "4px 8px", fontSize: "12px" }}
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
              </select>
              <ChevronDown className="select-icon" size={12} />
            </div>
          </div>
        </div>
      </div>

      {/* View Details Modal */}
      <Modal show={!!selectedAgent} onHide={() => setSelectedAgent(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: "16px", fontWeight: 800 }}>Agent Details</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: "24px" }}>
          {selectedAgent && (
            <>
              <div className="flex-align-center gap-3" style={{ marginBottom: "24px", paddingBottom: "24px", borderBottom: "1px solid #edf0f2" }}>
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selectedAgent.name)}`} 
                  alt={selectedAgent.name} 
                  style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#e2e8f0", objectFit: "cover" }}
                />
                <div>
                  <h3 className="font-bold text-dark" style={{ fontSize: "18px", margin: "0 0 4px 0" }}>{selectedAgent.name}</h3>
                  <div className="text-muted flex-align-center gap-2" style={{ fontSize: "13px" }}>
                    <span>{selectedAgent.id}</span>
                    &bull;
                    <span>{selectedAgent.branch}</span>
                  </div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <span className={`status-badge ${selectedAgent.status === "Active" ? "available" : "inactive"}`}>
                    {selectedAgent.status}
                  </span>
                </div>
              </div>

              <h4 className="font-bold text-dark" style={{ fontSize: "14px", marginBottom: "16px", color: "#0f7a4c" }}>Performance Overview</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #edf0f2" }}>
                <div><span className="text-muted" style={{fontSize: "12px", display: "block"}}>Mobile Number</span><span className="font-bold text-dark" style={{fontSize: "13.5px"}}>{selectedAgent.mobile}</span></div>
                <div><span className="text-muted" style={{fontSize: "12px", display: "block"}}>Customers Added</span><span className="font-bold text-dark" style={{fontSize: "13.5px"}}>{selectedAgent.customers}</span></div>
                <div><span className="text-muted" style={{fontSize: "12px", display: "block"}}>Active Customers</span><span className="font-bold text-green" style={{fontSize: "13.5px"}}>{selectedAgent.active}</span></div>
                <div><span className="text-muted" style={{fontSize: "12px", display: "block"}}>Pending Verification</span><span className="font-bold text-orange" style={{fontSize: "13.5px"}}>{selectedAgent.pendingVerif}</span></div>
                <div><span className="text-muted" style={{fontSize: "12px", display: "block"}}>Pending Collections</span><span className="font-bold text-red" style={{fontSize: "13.5px"}}>{selectedAgent.pendingColl}</span></div>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>

    </main>
  );
}
