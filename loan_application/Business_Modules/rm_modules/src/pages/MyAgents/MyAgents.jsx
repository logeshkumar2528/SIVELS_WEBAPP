import { useEffect, useMemo, useState } from 'react';
import iconMap from '../../config/iconMap';
import DataTable from '../../components/DataTable/DataTable';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import Select from '../../components/Select/Select';
import './MyAgents.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

function getStoredUser() {
  try {
    const raw = localStorage.getItem('sivels_currentUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeText(value = '') {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value = '') {
  return String(value || '').replace(/\D/g, '');
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

function buildInitials(name = '') {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'A';
}

function buildAvatar(name = '') {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Agent')}&background=0f7a4b&color=fff&bold=true`;
}

function makeAgentId(agent = {}, index = 0) {
  return agent.agentCode || agent.agentId || `AGT-${String(index + 1).padStart(3, '0')}`;
}

function buildRow(agent, customerRows = []) {
  const agentId = Number(agent.agentId || agent.AgentId || 0);
  const rowsForAgent = customerRows.filter((row) => Number(row.agentId || row.AgentId || 0) === agentId);
  const activeCustomers = rowsForAgent.filter((row) => row.isActive === true || normalizeText(row.status) === 'approved').length;
  const pendingVerification = rowsForAgent.filter((row) => normalizeText(row.status) === 'draft' || normalizeText(row.status) === 'pending').length;
  const pendingCollections = rowsForAgent.filter((row) => normalizeText(row.status) === 'collection pending' || normalizeText(row.status) === 'overdue').length;

  return {
    id: makeAgentId(agent, agentId),
    agentId,
    name: agent.fullName || agent.agentName || agent.name || '-',
    phone: agent.mobileNumber || agent.phone || '-',
    email: agent.emailAddress || agent.email || '',
    assignedArea: agent.branch || agent.branchName || agent.area || '-',
    activeCustomers,
    pendingVerification,
    pendingCollections,
    customersAdded: rowsForAgent.length,
    totalLoanAmount: rowsForAgent.reduce((sum, row) => sum + Number(row.expectedLoanAmount || row.loanAmount || 0), 0),
    status: rowsForAgent.some((row) => row.isActive === true) ? 'Active' : (rowsForAgent.length ? 'New' : 'Inactive'),
    joinDate: formatDate(agent.createdAt || agent.dateJoined || agent.createdDate),
    avatarUrl: buildAvatar(agent.fullName || agent.agentName || agent.name || 'Agent'),
    raw: agent,
    records: rowsForAgent,
  };
}

export default function MyAgents() {
  const currentUser = useMemo(() => getStoredUser(), []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [agentRows, setAgentRows] = useState([]);

  const SearchIcon = iconMap['Search'];
  const UsersIcon = iconMap['Users'];
  const ClockIcon = iconMap['Clock'];
  const IndianRupeeIcon = iconMap['IndianRupee'];
  const DownloadIcon = iconMap['Download'];
  const EyeIcon = iconMap['Eye'];
  const ChevronLeftIcon = iconMap['ChevronLeft'];
  const ChevronRightIcon = iconMap['ChevronRight'];

  useEffect(() => {
    let active = true;

    async function loadAgents() {
      setIsLoading(true);
      setLoadError('');

      try {
        const [rmResponse, agentsResponse, customerResponse] = await Promise.all([
          fetch(`${API_BASE}/RMMaster`),
          fetch(`${API_BASE}/AgentMaster`),
          fetch(`${API_BASE}/AgentAddCustomer`),
        ]);

        if (!rmResponse.ok) throw new Error(`Failed to load RM data (${rmResponse.status})`);
        if (!agentsResponse.ok) throw new Error(`Failed to load agents (${agentsResponse.status})`);
        if (!customerResponse.ok) throw new Error(`Failed to load customers (${customerResponse.status})`);

        const rmData = await rmResponse.json();
        const agentsData = await agentsResponse.json();
        const customersData = await customerResponse.json();

        const rmRows = Array.isArray(rmData) ? rmData : (Array.isArray(rmData?.value) ? rmData.value : []);
        const agentRowsRaw = Array.isArray(agentsData) ? agentsData : (Array.isArray(agentsData?.value) ? agentsData.value : []);
        const customerRowsRaw = Array.isArray(customersData) ? customersData : (Array.isArray(customersData?.value) ? customersData.value : []);

        const currentMobile = normalizePhone(currentUser?.mobileNumber || currentUser?.phone);
        const currentRmId = Number(currentUser?.rmId || currentUser?.RMId || 0);
        const matchedRm =
          rmRows.find((row) => Number(row.rmId || row.RMId) === currentRmId) ||
          rmRows.find((row) => normalizePhone(row.mobileNumber) === currentMobile) ||
          rmRows[0] ||
          null;

        const matchedBranch = normalizeText(matchedRm?.branch || currentUser?.branch || '');
        const matchedName = normalizeText(matchedRm?.fullName || currentUser?.fullName || currentUser?.name || '');

        const filteredAgents = agentRowsRaw.filter((agent) => {
          const agentBranch = normalizeText(agent.branch || agent.branchName || '');
          const agentCreator = Number(agent.createdBy || agent.createdby || 0);
          const agentName = normalizeText(agent.fullName || agent.agentName || agent.name || '');
          const branchMatches = !matchedBranch || agentBranch === matchedBranch;
          const creatorMatches = currentRmId ? agentCreator === currentRmId : false;
          const nameMatches = matchedName ? agentName.includes(matchedName) : true;
          return branchMatches || creatorMatches || nameMatches;
        });

        const rows = filteredAgents.map((agent, index) => buildRow(agent, customerRowsRaw, index));

        if (active) {
          setAgentRows(rows);
        }
      } catch (error) {
        console.error('Failed to load RM agents:', error);
        if (active) {
          setLoadError('Unable to load live agents from the API.');
          setAgentRows([]);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadAgents();

    return () => {
      active = false;
    };
  }, [currentUser]);

  const filteredAgents = useMemo(() => {
    const term = normalizeText(searchTerm);
    return agentRows.filter((ag) => {
      const searchBlob = [
        ag.name,
        ag.id,
        ag.phone,
        ag.email,
        ag.assignedArea,
        ag.status,
      ].join(' ');
      return normalizeText(searchBlob).includes(term);
    });
  }, [agentRows, searchTerm]);

  useEffect(() => {
    if (currentPage > Math.max(1, Math.ceil(filteredAgents.length / rowsPerPage))) {
      setCurrentPage(1);
    }
  }, [currentPage, filteredAgents.length, rowsPerPage]);

  const totalRecords = filteredAgents.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRecords);
  const currentRecords = filteredAgents.slice(startIndex, endIndex);

  const totals = useMemo(() => {
    return agentRows.reduce(
      (acc, agent) => {
        acc.totalCustomers += agent.customersAdded;
        acc.activeCustomers += agent.activeCustomers;
        acc.pendingVerification += agent.pendingVerification;
        acc.pendingCollections += agent.pendingCollections;
        return acc;
      },
      { totalCustomers: 0, activeCustomers: 0, pendingVerification: 0, pendingCollections: 0 }
    );
  }, [agentRows]);

  const columns = [
    {
      key: 'name',
      label: 'Agent Name',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={row.avatarUrl} alt={row.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{row.name}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{buildInitials(row.name)} • {row.email || 'No email'}</span>
          </div>
        </div>
      ),
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
      ),
    },
  ];

  return (
    <div className="page-container--no-scroll" style={{ gap: '20px' }}>
      {loadError && (
        <div className="alert alert-warning" style={{ marginBottom: '0' }}>
          {loadError}
        </div>
      )}

      <div className="ag-kpi-row">
        <div className="ag-kpi-card">
          <div className="ag-kpi-icon-box" style={{ background: '#dcfce7', color: '#166534' }}>
            {UsersIcon && <UsersIcon size={24} />}
          </div>
          <div className="ag-kpi-info">
            <span className="ag-kpi-title">Total Agents</span>
            <span className="ag-kpi-value">{agentRows.length}</span>
            <span className="ag-kpi-trend text-muted">{currentUser?.branch || 'Live RM branch'}</span>
          </div>
        </div>

        <div className="ag-kpi-card">
          <div className="ag-kpi-icon-box" style={{ background: '#dbeafe', color: '#1e40af' }}>
            {UsersIcon && <UsersIcon size={24} />}
          </div>
          <div className="ag-kpi-info">
            <span className="ag-kpi-title">Total Customers</span>
            <span className="ag-kpi-value">{totals.totalCustomers}</span>
            <span className="ag-kpi-trend text-muted">Live application records</span>
          </div>
        </div>

        <div className="ag-kpi-card">
          <div className="ag-kpi-icon-box" style={{ background: '#ffedd5', color: '#c2410c' }}>
            {ClockIcon && <ClockIcon size={24} />}
          </div>
          <div className="ag-kpi-info">
            <span className="ag-kpi-title">Pending Verification</span>
            <span className="ag-kpi-value">{totals.pendingVerification}</span>
            <span className="ag-kpi-trend text-muted">From live customer status</span>
          </div>
        </div>

        <div className="ag-kpi-card">
          <div className="ag-kpi-icon-box" style={{ background: '#f3e8ff', color: '#6b21a8' }}>
            {UsersIcon && <UsersIcon size={24} />}
          </div>
          <div className="ag-kpi-info">
            <span className="ag-kpi-title">Active Customers</span>
            <span className="ag-kpi-value">{totals.activeCustomers}</span>
            <span className="ag-kpi-trend text-muted">Currently active files</span>
          </div>
        </div>

        <div className="ag-kpi-card">
          <div className="ag-kpi-icon-box" style={{ background: '#fee2e2', color: '#b91c1c' }}>
            {IndianRupeeIcon && <IndianRupeeIcon size={24} />}
          </div>
          <div className="ag-kpi-info">
            <span className="ag-kpi-title">Pending Collections</span>
            <span className="ag-kpi-value">{totals.pendingCollections}</span>
            <span className="ag-kpi-trend text-muted">Derived from live status</span>
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
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="ag-filter-dropdowns">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="ag-filter-label">Area</label>
              <Select
                placeholder="All Areas"
                options={[
                  { value: 'All Areas', label: 'All Areas' },
                  ...Array.from(new Set(agentRows.map((row) => row.assignedArea).filter(Boolean))).map((area) => ({
                    value: area,
                    label: area,
                  })),
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
                  { value: 'All Status', label: 'All Status' },
                  ...Array.from(new Set(agentRows.map((row) => row.status).filter(Boolean))).map((status) => ({
                    value: status,
                    label: status,
                  })),
                ]}
                className="ag-select"
                value="All Status"
                onChange={() => {}}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="ag-filter-label">Date Range</label>
              <input type="text" className="form-input ag-select" value="Live data" readOnly />
            </div>

            <Button variant="primary" style={{ background: '#0f5132', borderColor: '#0f5132', marginTop: 'auto', height: '38px' }} icon={DownloadIcon ? <DownloadIcon size={15} /> : null}>
              Export
            </Button>
          </div>
        </div>

        <div className="ag-table-container">
          <DataTable columns={columns} data={currentRecords} loading={isLoading} rowKeyField="agentId" />
        </div>

        <div className="ag-pagination-footer">
          <span className="ag-page-info">
            {totalRecords > 0 ? `Showing ${startIndex + 1} to ${endIndex} of ${totalRecords} agents` : 'No agents found'}
          </span>

          <div className="ag-page-controls">
            <button
              className={`ag-page-btn ${currentPage === 1 ? 'disabled' : ''}`}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              {ChevronLeftIcon ? <ChevronLeftIcon size={14} /> : '<'}
            </button>

            {Array.from({ length: totalPages }).map((_, i) => (
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
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                  { value: 20, label: '20' },
                ]}
                placeholder={null}
              />
            </div>
          </div>
        </div>
      </div>

      {selectedAgent && (
        <Modal title="Agent Details" onClose={() => setSelectedAgent(null)}>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={selectedAgent.avatarUrl} alt={selectedAgent.name} style={{ width: '54px', height: '54px', borderRadius: '50%' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '18px' }}>{selectedAgent.name}</div>
                <div style={{ color: '#64748b' }}>{selectedAgent.id} • {selectedAgent.assignedArea}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
              <div><strong>Mobile:</strong> {selectedAgent.phone}</div>
              <div><strong>Email:</strong> {selectedAgent.email || '-'}</div>
              <div><strong>Customers Added:</strong> {selectedAgent.customersAdded}</div>
              <div><strong>Active Customers:</strong> {selectedAgent.activeCustomers}</div>
              <div><strong>Pending Verification:</strong> {selectedAgent.pendingVerification}</div>
              <div><strong>Pending Collections:</strong> {selectedAgent.pendingCollections}</div>
              <div><strong>Status:</strong> {selectedAgent.status}</div>
              <div><strong>Joined:</strong> {selectedAgent.joinDate}</div>
              <div><strong>Total Loan Amount:</strong> {formatCurrency(selectedAgent.totalLoanAmount)}</div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
