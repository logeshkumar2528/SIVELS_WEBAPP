import { useState, useEffect } from 'react';
import iconMap from '../../config/iconMap';
import DataTable from '../../components/DataTable/DataTable';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import Select from '../../components/Select/Select';
import { agentApi } from '../../services/agentApi';
import './MyAgents.css';

export default function MyAgents() {
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const SearchIcon = iconMap['Search'];
  const UsersIcon = iconMap['Users'];
  const ClockIcon = iconMap['Clock'];
  const IndianRupeeIcon = iconMap['IndianRupee'];
  const DownloadIcon = iconMap['Download'];
  const EyeIcon = iconMap['Eye'];
  const ChevronLeftIcon = iconMap['ChevronLeft'];
  const ChevronRightIcon = iconMap['ChevronRight'];

  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      const data = await agentApi.getAgents();
      setAgents(data);
    } catch (err) {
      console.error(err);
      // fallback handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const filteredAgents = agents.filter(
    (ag) =>
      (ag.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ag.branch || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ag.mobileNumber || '').includes(searchTerm) ||
      (ag.agentCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const totalRecords = filteredAgents.length;
  const totalPages = Math.ceil(totalRecords / rowsPerPage);
  
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

  const handleViewDetails = async (agentId) => {
    try {
      const data = await agentApi.getAgentById(agentId);
      setSelectedAgent(data);
      setIsEditMode(false);
      setEditForm(data);
    } catch (err) {
      alert('Failed to fetch agent details');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this agent?')) return;
    setIsDeleting(true);
    try {
      await agentApi.deleteAgent(selectedAgent.agentId);
      alert('Agent deleted successfully');
      setSelectedAgent(null);
      fetchAgents();
    } catch (err) {
      let errorMsg = 'Failed to delete agent';
      if (err.message) errorMsg = err.message;
      alert(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      await agentApi.updateAgent(selectedAgent.agentId, editForm);
      alert('Agent updated successfully');
      setSelectedAgent(null);
      fetchAgents();
    } catch (err) {
      let errorMsg = "Failed to update agent.";
      if (err.errors) {
        const messages = [];
        Object.values(err.errors).forEach(val => {
          if (Array.isArray(val)) messages.push(...val);
          else messages.push(val);
        });
        errorMsg = messages.join('\\n');
      } else if (err.message) {
        errorMsg = err.message;
      }
      alert(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { 
      key: 'name', 
      label: 'Agent Name', 
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={row.profileImagePath ? `http://localhost:5118${row.profileImagePath}` : 'https://via.placeholder.com/32'} alt={row.fullName} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
          <span style={{ fontWeight: 600, color: '#0f172a' }}>{row.fullName}</span>
        </div>
      )
    },
    { key: 'id', label: 'Agent ID', render: (row) => <span style={{ color: '#475569' }}>{row.agentCode}</span> },
    { key: 'assignedArea', label: 'Area / Branch', render: (row) => <span style={{ color: '#475569' }}>{row.branch}</span> },
    { key: 'phone', label: 'Mobile Number', render: (row) => <span style={{ color: '#475569' }}>{row.mobileNumber}</span> },
    { key: 'customersAdded', label: 'Customers Added', render: (row) => <span style={{ color: '#475569', fontWeight: 500 }}>{row.customersAdded || 0}</span> },
    { key: 'activeCustomers', label: 'Active Customers', render: (row) => <span style={{ color: '#16a34a', fontWeight: 600 }}>{row.activeCustomers || 0}</span> },
    { key: 'pendingVerification', label: 'Pending Verification', render: (row) => <span style={{ color: '#ea580c', fontWeight: 600 }}>{row.pendingVerification || 0}</span> },
    { key: 'pendingCollections', label: 'Pending Collections', render: (row) => <span style={{ color: '#dc2626', fontWeight: 600 }}>{row.pendingCollections || 0}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.isActive ? 'Active' : 'Inactive'} /> },
    { 
      key: 'action', 
      label: 'Action', 
      render: (row) => (
        <Button variant="outline" size="sm" icon={EyeIcon ? <EyeIcon size={14} /> : null} onClick={() => handleViewDetails(row.agentId)}>
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
            <span className="ag-kpi-value">{agents.length}</span>
            <span className="ag-kpi-trend text-muted">All Areas</span>
          </div>
        </div>
        
        <div className="ag-kpi-card">
          <div className="ag-kpi-icon-box" style={{ background: '#dbeafe', color: '#1e40af' }}>
            {UsersIcon && <UsersIcon size={24} />}
          </div>
          <div className="ag-kpi-info">
            <span className="ag-kpi-title">Total Customers</span>
            <span className="ag-kpi-value">0</span>
            <span className="ag-kpi-trend"><span className="text-success">↑ 0%</span> vs last month</span>
          </div>
        </div>

        <div className="ag-kpi-card">
          <div className="ag-kpi-icon-box" style={{ background: '#ffedd5', color: '#c2410c' }}>
            {ClockIcon && <ClockIcon size={24} />}
          </div>
          <div className="ag-kpi-info">
            <span className="ag-kpi-title">Pending Verification</span>
            <span className="ag-kpi-value">0</span>
            <span className="ag-kpi-trend"><span className="text-danger">↑ 0%</span> vs last month</span>
          </div>
        </div>

        <div className="ag-kpi-card">
          <div className="ag-kpi-icon-box" style={{ background: '#f3e8ff', color: '#6b21a8' }}>
            {UsersIcon && <UsersIcon size={24} />}
          </div>
          <div className="ag-kpi-info">
            <span className="ag-kpi-title">Active Customers</span>
            <span className="ag-kpi-value">0</span>
            <span className="ag-kpi-trend"><span className="text-success">↑ 0%</span> vs last month</span>
          </div>
        </div>

        <div className="ag-kpi-card">
          <div className="ag-kpi-icon-box" style={{ background: '#fee2e2', color: '#b91c1c' }}>
            {IndianRupeeIcon && <IndianRupeeIcon size={24} />}
          </div>
          <div className="ag-kpi-info">
            <span className="ag-kpi-title">Pending Collections</span>
            <span className="ag-kpi-value">0</span>
            <span className="ag-kpi-trend"><span className="text-danger">↑ 0%</span> vs last month</span>
          </div>
        </div>
      </div>

      <div className="panel ag-main-panel">
        
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
              <Select 
                 placeholder="All Areas"
                 options={[
                   {value: "All Areas", label: "All Areas"}
                 ]}
                 className="ag-select"
                 value="All Areas"
                 onChange={() => {}}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="ag-filter-label">Status</label>
              <Select 
                 placeholder="All Status"
                 options={[
                   {value: "All Status", label: "All Status"},
                   {value: "Active", label: "Active"},
                   {value: "Inactive", label: "Inactive"}
                 ]}
                 className="ag-select"
                 value="All Status"
                 onChange={() => {}}
              />
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
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading agents...</div>
          ) : (
            <DataTable columns={columns} data={currentRecords} rowKeyField="agentId" />
          )}
        </div>

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
            <div style={{ width: '70px' }}>
              <Select 
                className="ag-select" 
                value={rowsPerPage}
                onChange={(val) => {
                  setRowsPerPage(Number(val));
                  setCurrentPage(1);
                }}
                options={[
                  {value: 5, label: '5'},
                  {value: 10, label: '10'},
                  {value: 20, label: '20'}
                ]}
                placeholder={null}
              />
            </div>
          </div>
        </div>
        
      </div>

      <Modal show={!!selectedAgent} onHide={() => setSelectedAgent(null)} title={isEditMode ? "Edit Agent" : "Agent Details"}>
        {selectedAgent && (
          <div className="agent-details-modal">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <img src={selectedAgent.profileImagePath ? `http://localhost:5118${selectedAgent.profileImagePath}` : 'https://via.placeholder.com/64'} alt={selectedAgent.fullName} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>{selectedAgent.fullName}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>ID: {selectedAgent.agentCode}</p>
                <div style={{ marginTop: '8px' }}>
                  <StatusBadge status={selectedAgent.isActive ? 'Active' : 'Inactive'} />
                </div>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Mobile Number</label>
                {isEditMode ? (
                  <input className="form-input" value={editForm.mobileNumber || ''} onChange={e => setEditForm({...editForm, mobileNumber: e.target.value})} />
                ) : (
                  <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{selectedAgent.mobileNumber}</div>
                )}
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Email Address</label>
                {isEditMode ? (
                  <input className="form-input" type="email" value={editForm.emailAddress || ''} onChange={e => setEditForm({...editForm, emailAddress: e.target.value})} />
                ) : (
                  <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{selectedAgent.emailAddress}</div>
                )}
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Assigned Territory (Branch)</label>
                {isEditMode ? (
                  <input className="form-input" value={editForm.branch || ''} onChange={e => setEditForm({...editForm, branch: e.target.value})} />
                ) : (
                  <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{selectedAgent.branch}</div>
                )}
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Join Date</label>
                {isEditMode ? (
                  <input className="form-input" type="date" value={editForm.dateJoined ? editForm.dateJoined.substring(0,10) : ''} onChange={e => setEditForm({...editForm, dateJoined: e.target.value})} />
                ) : (
                  <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{selectedAgent.dateJoined ? selectedAgent.dateJoined.substring(0,10) : ''}</div>
                )}
              </div>
              {!isEditMode && (
                <>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Customers Added</label>
                    <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{selectedAgent.customersAdded || 0}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Active Customers</label>
                    <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>{selectedAgent.activeCustomers || 0}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Pending Verification</label>
                    <div style={{ fontSize: '13px', color: '#ea580c', fontWeight: 600 }}>{selectedAgent.pendingVerification || 0}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Pending Collections</label>
                    <div style={{ fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>{selectedAgent.pendingCollections || 0}</div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total Loans Disbursed</label>
                    <div style={{ fontSize: '16px', color: '#0f172a', fontWeight: 700 }}>{selectedAgent.loansDisbursed || 0}</div>
                  </div>
                </>
              )}
            </div>
            
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {!isEditMode && (
                <>
                  <Button variant="outline" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={handleDelete} disabled={isDeleting}>Delete</Button>
                  <Button variant="primary" onClick={() => setIsEditMode(true)}>Edit</Button>
                  <Button variant="secondary" onClick={() => setSelectedAgent(null)}>Close</Button>
                </>
              )}
              {isEditMode && (
                <>
                  <Button variant="secondary" onClick={() => { setIsEditMode(false); setEditForm(selectedAgent); }}>Cancel</Button>
                  <Button variant="primary" onClick={handleSaveEdit} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
