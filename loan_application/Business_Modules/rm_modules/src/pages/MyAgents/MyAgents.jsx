import { useEffect, useMemo, useState } from 'react';
import iconMap from '../../config/iconMap';
import DataTable from '../../components/DataTable/DataTable';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import Select from '../../components/Select/Select';
import Pagination from '../../components/Pagination/Pagination';
import { formatDate } from '../../utils/dateHelper';
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

function formatCurrency(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

function buildAvatar(name = '') {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Agent')}&background=0f7a4b&color=fff&bold=true`;
}

function makeAgentId(agent = {}, index = 0) {
  return agent.agentCode || agent.agentId || `AGT-${String(index + 1).padStart(3, '0')}`;
}

function normalizeStatus(value, fallback = 'Inactive') {
  const text = normalizeText(value);
  if (!text) return fallback;
  if (['1', 'true', 'active', 'activated', 'approved', 'yes', 'y'].includes(text)) return 'Active';
  if (['0', 'false', 'inactive', 'disabled', 'deactive', 'deactivated', 'no', 'n'].includes(text)) return 'Inactive';
  return String(value).trim();
}

function buildRow(agent, customerRows = []) {
  const agentId = Number(agent.agentId || agent.AgentId || 0);
  const rowsForAgent = customerRows.filter((row) => Number(row.agentId || row.AgentId || 0) === agentId);
  const activeCustomers = rowsForAgent.filter((row) => row.isActive === true || normalizeText(row.status) === 'approved').length;
  const pendingVerification = rowsForAgent.filter((row) => normalizeText(row.status) === 'draft' || normalizeText(row.status) === 'pending').length;
  const pendingCollections = rowsForAgent.filter((row) => normalizeText(row.status) === 'collection pending' || normalizeText(row.status) === 'overdue').length;
  const recordStatus = normalizeStatus(agent.status ?? agent.isActive ?? agent.IsActive, agent.isActive === false ? 'Inactive' : 'Active');

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
    status: recordStatus,
    joinDate: formatDate(agent.createdAt || agent.dateJoined || agent.createdDate, '-'),
    avatarUrl: buildAvatar(agent.fullName || agent.agentName || agent.name || 'Agent'),
    raw: agent,
    records: rowsForAgent,
  };
}

export default function MyAgents() {
  const currentUser = useMemo(() => getStoredUser(), []);
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState('All Areas');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedAgentDetails, setSelectedAgentDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [agentRows, setAgentRows] = useState([]);

  const pageSizeOptions = [7, 10, 15, 20];

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const SearchIcon = iconMap['Search'];
  const UsersIcon = iconMap['Users'];
  const ClockIcon = iconMap['Clock'];
  const IndianRupeeIcon = iconMap['IndianRupee'];
  const DownloadIcon = iconMap['Download'];
  const EyeIcon = iconMap['Eye'];

  const getAuthHeaders = () => {
    const headers = {};
    const token = localStorage.getItem('authToken');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  const openAgentDetails = async (row) => {
    setSelectedAgent(row);
    setSelectedAgentDetails(row?.raw || row || null);
    setDetailsError('');
    setDetailsLoading(true);

    try {
      const agentId = row?.raw?.agentId || row?.raw?.AgentId || row?.agentId || row?.raw?.agentCode || row?.id;
      if (!agentId) return;

      const response = await fetch(`${API_BASE}/AgentMaster/${agentId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to load agent details (${response.status})`);
      }

      const details = await response.json();
      const detailRecord = Array.isArray(details)
        ? details[0]
        : (details?.value?.[0] || details?.data || details);

      setSelectedAgentDetails(detailRecord || row?.raw || null);
    } catch (error) {
      console.error('Failed to load agent details:', error);
      setDetailsError(error.message || 'Failed to load agent details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeAgentDetails = () => {
    setSelectedAgent(null);
    setSelectedAgentDetails(null);
    setDetailsError('');
    setDetailsLoading(false);
  };

  const safeSelectedAgent = selectedAgent || {};
  const safeAgentDetails = selectedAgentDetails || selectedAgent?.raw || {};

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

        const currentMobile = normalizePhone(currentUser?.mobileNumber || currentUser?.phone).slice(-10);
        const currentRmId = Number(currentUser?.rmId || currentUser?.RMId || currentUser?.rmid || 0);
        const matchedRm =
          rmRows.find((row) => currentRmId && Number(row.rmId || row.RMId || row.id) === currentRmId) ||
          rmRows.find((row) => currentMobile && normalizePhone(row.mobileNumber || row.MobileNumber || row.phone).slice(-10) === currentMobile) ||
          null;

        const resolvedRmId = currentRmId || Number(matchedRm?.rmId || matchedRm?.RMId || matchedRm?.id || 0);
        const matchedRmName = normalizeText(matchedRm?.fullName || currentUser?.fullName || currentUser?.name || '');
        const matchedRmNameFromApi = normalizeText(matchedRm?.fullName || '');

        const filteredAgentsList = agentRowsRaw.filter((agent) => {
          const agentRmId = Number(
            agent.rmId ||
            agent.RMId ||
            agent.relationshipManagerId ||
            agent.RelationshipManagerId ||
            0
          );
          const agentCreator = Number(agent.createdBy || agent.createdby || 0);
          const assignedRmName = normalizeText(
            agent.rmName ||
            agent.RMName ||
            agent.relationshipManager ||
            agent.relationshipManagerName ||
            ''
          );

          if (resolvedRmId && agentRmId === resolvedRmId) return true;
          if (resolvedRmId && agentCreator === resolvedRmId) return true;
          if (!agentRmId && matchedRmName && (assignedRmName === matchedRmName || assignedRmName === matchedRmNameFromApi)) {
            return true;
          }
          return false;
        });

        const rows = filteredAgentsList.map((agent) => buildRow(agent, customerRowsRaw));

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
      const matchesSearch = normalizeText(searchBlob).includes(term);
      const matchesArea = areaFilter === 'All Areas' || ag.assignedArea === areaFilter;
      const matchesStatus = statusFilter === 'All Status' || ag.status === statusFilter;
      return matchesSearch && matchesArea && matchesStatus;
    });
  }, [agentRows, searchTerm, areaFilter, statusFilter]);

  const totalRecords = filteredAgents.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAgents.slice(start, start + pageSize);
  }, [filteredAgents, currentPage, pageSize]);

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
      label: 'AGENT',
      render: (row) => (
        <div className="ag-cell-name">
          <img
            src={row.avatarUrl}
            alt={row.name}
            className="ag-cell-avatar"
          />
          <div className="ag-cell-name-info">
            <span className="ag-cell-name-title">{row.name}</span>
            <span className="ag-cell-name-sub">{row.phone}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'id',
      label: 'AGENT ID',
      render: (row) => <span className="ag-cell-muted">{row.id}</span>,
    },
    {
      key: 'assignedArea',
      label: 'AREA / BRANCH',
      render: (row) => <span className="ag-cell-muted">{row.assignedArea}</span>,
    },
    {
      key: 'customersAdded',
      label: 'CUSTOMERS',
      render: (row) => (
        <span className="ag-cell-metric">{row.customersAdded}</span>
      ),
    },
    {
      key: 'activeCustomers',
      label: 'ACTIVE',
      render: (row) => (
        <span className="ag-cell-metric ag-cell-metric--success">{row.activeCustomers}</span>
      ),
    },
    {
      key: 'pendingVerification',
      label: 'PENDING',
      render: (row) => (
        <span className="ag-cell-metric ag-cell-metric--warning">{row.pendingVerification}</span>
      ),
    },
    {
      key: 'pendingCollections',
      label: 'COLLECTIONS',
      render: (row) => (
        <span className="ag-cell-metric ag-cell-metric--danger">{row.pendingCollections}</span>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'action',
      label: 'ACTIONS',
      render: (row) => (
        <div className="ag-row-actions">
          <button
            type="button"
            className="sub-hist-btn sub-hist-btn--view"
            onClick={() => openAgentDetails(row)}
            aria-label={`View details for ${row.name}`}
            title="View Details"
          >
            {EyeIcon ? <EyeIcon size={14} /> : null}
            <span>View</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="listing-page-wrapper ag-page" style={{ gap: '16px' }}>
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

      <div className="panel listing-card-full ag-main-panel">
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
                value={areaFilter}
                onChange={(val) => {
                  setAreaFilter(val);
                  setCurrentPage(1);
                }}
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
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}
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

        <div className="listing-table-flex">
          <DataTable
            columns={columns}
            data={currentRecords}
            loading={isLoading}
            rowKeyField="id"
            className="rm-my-agents-table"
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={totalRecords}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={handlePageSizeChange}
            onPageChange={(newPage) => setCurrentPage(newPage)}
          />
        </div>
      </div>

      <Modal show={!!selectedAgent} title="Agent Details" onHide={closeAgentDetails}>
          <div className="agent-detail-modal">
            <div className="agent-detail-hero">
              <div className="agent-detail-avatar-wrap">
                <img
                  src={safeSelectedAgent.avatarUrl || buildAvatar(safeAgentDetails.fullName || safeAgentDetails.name || 'Agent')}
                  alt={safeSelectedAgent.name || safeAgentDetails.fullName || 'Agent'}
                  className="agent-detail-avatar"
                />
              </div>
              <div className="agent-detail-hero-copy">
                <div className="agent-detail-name">{safeSelectedAgent.name || safeAgentDetails.fullName || 'Agent'}</div>
                <div className="agent-detail-meta">
                  {safeSelectedAgent.id || safeAgentDetails.agentCode || '-'} <span>•</span> {safeSelectedAgent.assignedArea || safeAgentDetails.branch || '-'}
                </div>
                <div className="agent-detail-badges">
                  <span className={`agent-detail-pill ${String(safeAgentDetails.isActive ?? safeSelectedAgent.raw?.isActive ?? true).toLowerCase() === 'true' || safeSelectedAgent.status === 'Active' ? 'is-active' : 'is-inactive'}`}>
                    {safeSelectedAgent.status || ((safeAgentDetails.isActive ?? safeSelectedAgent.raw?.isActive ?? true) ? 'Active' : 'Inactive')}
                  </span>
                  <span className="agent-detail-pill agent-detail-pill--outline">
                    {safeAgentDetails.role || 'Agent'}
                  </span>
                </div>
              </div>
            </div>

            {detailsLoading && (
              <div className="agent-detail-alert agent-detail-alert--info">
                Loading latest agent details...
              </div>
            )}

            {detailsError && (
              <div className="agent-detail-alert agent-detail-alert--error">
                {detailsError}
              </div>
            )}

            <div className="agent-detail-section">
              <div className="agent-detail-section-title">Contact Details</div>
              <div className="agent-detail-stats">
              <div className="agent-detail-stat">
                <span className="agent-detail-stat-label">Mobile</span>
                <span className="agent-detail-stat-value">{safeAgentDetails.mobileNumber || safeSelectedAgent.phone || '-'}</span>
              </div>
              <div className="agent-detail-stat">
                <span className="agent-detail-stat-label">Email</span>
                <span className="agent-detail-stat-value">{safeAgentDetails.emailAddress || safeAgentDetails.email || safeSelectedAgent.email || '-'}</span>
              </div>
              <div className="agent-detail-stat">
                <span className="agent-detail-stat-label">Branch</span>
                <span className="agent-detail-stat-value">{safeAgentDetails.branch || safeSelectedAgent.assignedArea || '-'}</span>
              </div>
              <div className="agent-detail-stat">
                <span className="agent-detail-stat-label">Role</span>
                <span className="agent-detail-stat-value">{safeAgentDetails.role || '-'}</span>
              </div>
              <div className="agent-detail-stat">
                <span className="agent-detail-stat-label">RM ID</span>
                <span className="agent-detail-stat-value">{safeAgentDetails.rmId ?? safeAgentDetails.RMId ?? '-'}</span>
              </div>
              <div className="agent-detail-stat">
                <span className="agent-detail-stat-label">Created By</span>
                <span className="agent-detail-stat-value">{safeAgentDetails.createdBy ?? safeAgentDetails.createdby ?? '-'}</span>
              </div>
              <div className="agent-detail-stat">
                <span className="agent-detail-stat-label">Joined</span>
                <span className="agent-detail-stat-value">{formatDate(safeAgentDetails.dateJoined || safeAgentDetails.createdAt || safeSelectedAgent.joinDate, '-')}</span>
              </div>
              <div className="agent-detail-stat">
                <span className="agent-detail-stat-label">Status</span>
                <span className="agent-detail-stat-value">{safeSelectedAgent.status || 'Active'}</span>
              </div>
              <div className="agent-detail-stat">
                <span className="agent-detail-stat-label">Customers Added</span>
                <span className="agent-detail-stat-value">{safeSelectedAgent.customersAdded ?? 0}</span>
              </div>
              <div className="agent-detail-stat">
                <span className="agent-detail-stat-label">Active Customers</span>
                <span className="agent-detail-stat-value">{safeSelectedAgent.activeCustomers ?? 0}</span>
              </div>
              <div className="agent-detail-stat">
                <span className="agent-detail-stat-label">Pending Verification</span>
                <span className="agent-detail-stat-value">{safeSelectedAgent.pendingVerification ?? 0}</span>
              </div>
              <div className="agent-detail-stat">
                <span className="agent-detail-stat-label">Pending Collections</span>
                <span className="agent-detail-stat-value">{safeSelectedAgent.pendingCollections ?? 0}</span>
              </div>
              <div className="agent-detail-stat agent-detail-stat--highlight">
                <span className="agent-detail-stat-label">Total Loan Amount</span>
                <span className="agent-detail-stat-value">{formatCurrency(safeSelectedAgent.totalLoanAmount ?? 0)}</span>
              </div>
              </div>
            </div>

            <div className="agent-detail-section">
              <div className="agent-detail-section-title">Identity & Work Info</div>
              <div className="agent-detail-surface">
              <div className="agent-detail-surface-title">Live Agent Record</div>
              <div className="agent-detail-surface-grid">
                <div className="agent-detail-surface-item">
                  <span className="agent-detail-surface-label">Name</span>
                  <span className="agent-detail-surface-value">{safeAgentDetails.fullName || safeAgentDetails.name || safeSelectedAgent.name || '-'}</span>
                </div>
                <div className="agent-detail-surface-item">
                  <span className="agent-detail-surface-label">Agent Code</span>
                  <span className="agent-detail-surface-value">{safeAgentDetails.agentCode || safeSelectedAgent.id || '-'}</span>
                </div>
                <div className="agent-detail-surface-item">
                  <span className="agent-detail-surface-label">Address</span>
                  <span className="agent-detail-surface-value">{safeAgentDetails.address || '-'}</span>
                </div>
                <div className="agent-detail-surface-item">
                  <span className="agent-detail-surface-label">Pincode</span>
                  <span className="agent-detail-surface-value">{safeAgentDetails.pincode || '-'}</span>
                </div>
                <div className="agent-detail-surface-item">
                  <span className="agent-detail-surface-label">IFSC</span>
                  <span className="agent-detail-surface-value">{safeAgentDetails.ifscCode || '-'}</span>
                </div>
              </div>
              </div>
            </div>
          </div>
      </Modal>
    </div>
  );
}
