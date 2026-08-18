import { useState } from 'react';
import iconMap from '../../config/iconMap';
import DataTable from '../../components/DataTable/DataTable';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import { myAgentsList } from './myAgentsData';
import './MyAgents.css';

export default function MyAgents() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  
  const SearchIcon = iconMap['Search'];
  const UsersIcon = iconMap['Users'];
  const ClockIcon = iconMap['Clock'];
  const IndianRupeeIcon = iconMap['IndianRupee'];
  const UserCheckIcon = iconMap['UserCheck']; // or similar
  const DownloadIcon = iconMap['Download'];
  const EyeIcon = iconMap['Eye'];
  const ChevronLeftIcon = iconMap['ChevronLeft'];
  const ChevronRightIcon = iconMap['ChevronRight'];

  const filteredAgents = myAgentsList.filter(
    (ag) =>
      ag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ag.assignedArea.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ag.phone.includes(searchTerm)
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const totalRecords = filteredAgents.length;
  const totalPages = Math.ceil(totalRecords / rowsPerPage);
  
  // Reset to page 1 if search term changes and reduces pages
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRecords);
  const currentRecords = filteredAgents.slice(startIndex, endIndex);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const columns = [
    { 
      key: 'name', 
      label: 'Agent Name', 
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={row.avatarUrl} alt={row.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
          <span style={{ fontWeight: 600, color: '#0f172a' }}>{row.name}</span>
        </div>
      )
    },
    { key: 'id', label: 'Agent ID', render: (row) => <span style={{ color: '#475569' }}>{row.id}</span> },
    { key: 'assignedArea', label: 'Area / Branch', render: (row) => <span style={{ color: '#475569' }}>{row.assignedArea}</span> },
    { key: 'phone', label: 'Mobile Number', render: (row) => <span style={{ color: '#475569' }}>{row.phone}</span> },
    { key: 'customersAdded', label: 'Customers Added', render: (row) => <span style={{ color: '#475569', fontWeight: 500 }}>{row.customersAdded}</span> },
    { key: 'activeCustomers', label: 'Active Customers', render: (row) => <span style={{ color: '#16a34a', fontWeight: 600 }}>{row.activeCustomers}</span> },
    { key: 'pendingVerification', label: 'Pending Verification', render: (row) => <span style={{ color: '#ea580c', fontWeight: 600 }}>{row.pendingVerification}</span> },
    { key: 'pendingCollections', label: 'Pending Collections', render: (row) => <span style={{ color: '#dc2626', fontWeight: 600 }}>{row.pendingCollections}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { 
      key: 'action', 
      label: 'Action', 
      render: (row) => (
        <Button variant="outline" size="sm" icon={EyeIcon ? <EyeIcon size={14} /> : null} onClick={() => setSelectedAgent(row)}>
          View Details
        </Button>
      )
    },
  ];

  return (
    <div className="page-container--no-scroll" style={{ gap: '20px' }}>
      
      {/* KPI Cards Row */}
      <div className="ag-kpi-row">
        <div className="ag-kpi-card">
          <div className="ag-kpi-icon-box" style={{ background: '#dcfce7', color: '#166534' }}>
            {UsersIcon && <UsersIcon size={24} />}
          </div>
          <div className="ag-kpi-info">
            <span className="ag-kpi-title">Total Agents</span>
            <span className="ag-kpi-value">12</span>
            <span className="ag-kpi-trend text-muted">All Areas</span>
          </div>
        </div>
        
        <div className="ag-kpi-card">
          <div className="ag-kpi-icon-box" style={{ background: '#dbeafe', color: '#1e40af' }}>
            {UsersIcon && <UsersIcon size={24} />}
          </div>
          <div className="ag-kpi-info">
            <span className="ag-kpi-title">Total Customers</span>
            <span className="ag-kpi-value">256</span>
            <span className="ag-kpi-trend"><span className="text-success">↑ 14.6%</span> vs last month</span>
          </div>
        </div>

        <div className="ag-kpi-card">
          <div className="ag-kpi-icon-box" style={{ background: '#ffedd5', color: '#c2410c' }}>
            {ClockIcon && <ClockIcon size={24} />}
          </div>
          <div className="ag-kpi-info">
            <span className="ag-kpi-title">Pending Verification</span>
            <span className="ag-kpi-value">38</span>
            <span className="ag-kpi-trend"><span className="text-danger">↑ 8.2%</span> vs last month</span>
          </div>
        </div>

        <div className="ag-kpi-card">
          <div className="ag-kpi-icon-box" style={{ background: '#f3e8ff', color: '#6b21a8' }}>
            {UsersIcon && <UsersIcon size={24} />}
          </div>
          <div className="ag-kpi-info">
            <span className="ag-kpi-title">Active Customers</span>
            <span className="ag-kpi-value">198</span>
            <span className="ag-kpi-trend"><span className="text-success">↑ 12.4%</span> vs last month</span>
          </div>
        </div>

        <div className="ag-kpi-card">
          <div className="ag-kpi-icon-box" style={{ background: '#fee2e2', color: '#b91c1c' }}>
            {IndianRupeeIcon && <IndianRupeeIcon size={24} />}
          </div>
          <div className="ag-kpi-info">
            <span className="ag-kpi-title">Pending Collections</span>
            <span className="ag-kpi-value">26</span>
            <span className="ag-kpi-trend"><span className="text-danger">↑ 5.3%</span> vs last month</span>
          </div>
        </div>
      </div>

      <div className="panel ag-main-panel">
        
        {/* Advanced Filter Bar */}
        <div className="ag-filter-bar">
          <div className="search-box" style={{ width: '300px' }}>
            {SearchIcon && <SearchIcon size={16} className="search-icon" />}
            <input
              type="text"
              className="form-input"
              placeholder="Search by Agent Name / Agent ID / Mobile"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="ag-filter-dropdowns">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="ag-filter-label">Area</label>
              <select className="form-input ag-select">
                <option>All Areas</option>
                <option>KK Nagar</option>
                <option>Anna Nagar</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="ag-filter-label">Status</label>
              <select className="form-input ag-select">
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="ag-filter-label">Date Range</label>
              <input type="text" className="form-input ag-select" value="05 Jun 2025 - 05 Jun 2025" readOnly />
            </div>

            <Button variant="primary" style={{ background: '#0f5132', borderColor: '#0f5132', marginTop: 'auto', height: '38px' }} icon={DownloadIcon ? <DownloadIcon size={15} /> : null}>
              Export
            </Button>
          </div>
        </div>

        <div className="ag-table-container">
          <DataTable columns={columns} data={currentRecords} rowKeyField="id" />
        </div>

        {/* Pagination Footer */}
        <div className="ag-pagination-footer">
          <span className="ag-page-info">
            {totalRecords > 0 ? `Showing ${startIndex + 1} to ${endIndex} of ${totalRecords} agents` : 'No agents found'}
          </span>
          
          <div className="ag-page-controls">
            <button 
              className={`ag-page-btn ${currentPage === 1 ? 'disabled' : ''}`} 
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              {ChevronLeftIcon ? <ChevronLeftIcon size={14} /> : '<'}
            </button>
            
            {[...Array(totalPages)].map((_, i) => (
              <button 
                key={i + 1} 
                className={`ag-page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            
            <button 
              className={`ag-page-btn ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`} 
              onClick={handleNextPage}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              {ChevronRightIcon ? <ChevronRightIcon size={14} /> : '>'}
            </button>
          </div>
          
          <div className="ag-page-rows">
            <span style={{ fontSize: '12px', color: '#64748b' }}>Rows per page</span>
            <select 
              className="form-input" 
              style={{ width: '70px', height: '32px', padding: '0 8px', fontSize: '12px' }}
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
        
      </div>

      {/* Agent Details Modal */}
      <Modal show={!!selectedAgent} onHide={() => setSelectedAgent(null)} title="Agent Details">
        {selectedAgent && (
          <div className="agent-details-modal">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <img src={selectedAgent.avatarUrl} alt={selectedAgent.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>{selectedAgent.name}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>ID: {selectedAgent.id}</p>
                <div style={{ marginTop: '8px' }}>
                  <StatusBadge status={selectedAgent.status} />
                </div>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Contact Phone</label>
                <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{selectedAgent.phone}</div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Email Address</label>
                <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{selectedAgent.email}</div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Assigned Territory</label>
                <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{selectedAgent.assignedArea}</div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Join Date</label>
                <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{selectedAgent.joinDate}</div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Customers Added</label>
                <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{selectedAgent.customersAdded}</div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Active Customers</label>
                <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>{selectedAgent.activeCustomers}</div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Pending Verification</label>
                <div style={{ fontSize: '13px', color: '#ea580c', fontWeight: 600 }}>{selectedAgent.pendingVerification}</div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Pending Collections</label>
                <div style={{ fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>{selectedAgent.pendingCollections}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total Loans Disbursed</label>
                <div style={{ fontSize: '16px', color: '#0f172a', fontWeight: 700 }}>{selectedAgent.loansDisbursed}</div>
              </div>
            </div>
            
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setSelectedAgent(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
