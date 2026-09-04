import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import DataTable from '../../components/DataTable/DataTable';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import ErrorPopup from '../../components/ErrorPopup/ErrorPopup';
import SectionHeader from '../../components/SectionHeader/SectionHeader';
import Button from '../../components/Button/Button';
import Pagination from '../../components/Pagination/Pagination';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';
import Select from '../../components/Select/Select';
import { ROUTES } from '../../config/routeConfig';
import { allNewApplications } from './newApplicationsData';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import './NewApplications.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

const normalizeMobile = (value) => String(value || '').replace(/\D/g, '');

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  return `Rs. ${Number(value).toLocaleString('en-IN')}`;
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getCurrentAgentId = () => {
  try {
    const currentUser = JSON.parse(localStorage.getItem('sivels_currentUser') || 'null');
    const agentData = JSON.parse(localStorage.getItem('agentData') || 'null');
    return (
      currentUser?.agentId ||
      currentUser?.AgentId ||
      agentData?.agentId ||
      agentData?.AgentId ||
      Number(localStorage.getItem('agentId')) ||
      null
    );
  } catch {
    return Number(localStorage.getItem('agentId')) || null;
  }
};

const resolveApiArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.value)) return data.value;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const normalizeApplicationStatus = (status, statusName = '') => {
  const namedStatus = normalizeText(statusName);
  if (namedStatus.includes('approved')) return 'Approved';
  if (namedStatus.includes('pending')) return 'Pending';
  if (namedStatus.includes('returned')) return 'Returned';
  if (namedStatus.includes('review')) return 'Under Review';

  const numericStatus = Number(status);
  if (numericStatus === 2) return 'Approved';
  if (numericStatus === 1) return 'Pending';
  return 'New';
};

const getCurrentRMContext = () => {
  try {
    const currentUser = JSON.parse(localStorage.getItem('sivels_currentUser') || 'null');
    const rmData = JSON.parse(localStorage.getItem('rmData') || 'null');
    return {
      rmId:
        currentUser?.rmId ||
        currentUser?.RMId ||
        rmData?.rmId ||
        rmData?.RMId ||
        Number(localStorage.getItem('rmId')) ||
        null,
      branch:
        currentUser?.branch ||
        currentUser?.Branch ||
        rmData?.branch ||
        rmData?.Branch ||
        '',
      fullName:
        currentUser?.fullName ||
        currentUser?.FullName ||
        rmData?.fullName ||
        rmData?.FullName ||
        '',
    };
  } catch {
    return {
      rmId: Number(localStorage.getItem('rmId')) || null,
      branch: '',
      fullName: '',
    };
  }
};

const mapBackendApplication = (item, index) => {
  const applicationId = item.applicationId || item.applicationNumber || item.agentCustomerId || item.customerId || `${index + 1}`;
  const normalizedStatus = normalizeApplicationStatus(item.status, item.statusName || item.StatusName);
  return {
    id: String(applicationId),
    customerName: item.fullName || item.customerName || '',
    mobile: normalizeMobile(item.mobileNumber || item.mobile || ''),
    loanType: item.loanPurposeName || item.loanType || '',
    amount: formatCurrency(item.expectedLoanAmount ?? item.amount),
    agentName: item.agentName || '',
    createdDate: formatDate(item.createdAt || item.createdDate),
    status: normalizedStatus,
    rawStatus: normalizedStatus,
    agentCustomerId: item.agentCustomerId || item.customerId || null,
    agentId: item.agentId || item.AgentId || null,
  };
};

export default function NewApplications({ initialFilter = 'All' }) {
  const navigate = useNavigate();
  const { createApplicationDraft } = useApplicationDraftStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);
  const [applications, setApplications] = useState(allNewApplications.map(mapBackendApplication));
  const [isLoading, setIsLoading] = useState(false);
  const [errorPopup, setErrorPopup] = useState('');
  const pageSizeOptions = [7, 10, 15, 20];

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const SearchIcon = iconMap['Search'];
  const FilterIcon = iconMap['Filter'];
  const PlusIcon = iconMap['FilePlus'];

  useEffect(() => {
    setStatusFilter(initialFilter);
    setCurrentPage(1);
    setSearchTerm('');
  }, [initialFilter]);

  useEffect(() => {
    let active = true;

    async function loadApplications() {
      const rmContext = getCurrentRMContext();

      if (!rmContext.rmId && !rmContext.branch) {
        setApplications(allNewApplications.map(mapBackendApplication));
        setErrorPopup('No RM context found in session. Please sign in again.');
        return;
      }

      setIsLoading(true);

      try {
        const [agentRes, customerRes] = await Promise.all([
          fetch(`${API_BASE}/AgentMaster`),
          fetch(`${API_BASE}/AgentAddCustomer`),
        ]);

        if (!agentRes.ok) {
          throw new Error(`Failed to load agents (${agentRes.status})`);
        }
        if (!customerRes.ok) {
          throw new Error(`Failed to load applications (${customerRes.status})`);
        }

        const [agentsData, customersData] = await Promise.all([
          agentRes.json(),
          customerRes.json(),
        ]);

        const agents = resolveApiArray(agentsData);
        const rows = resolveApiArray(customersData);

        const matchedAgents = agents.filter((agent) => {
          const agentRmId = Number(
            agent.rmId ||
            agent.RMId ||
            agent.managerId ||
            agent.ManagerId ||
            agent.reportingManagerId ||
            agent.reportToRmId ||
            agent.reportManagerId ||
            0
          );
          const agentCreatedBy = Number(agent.createdBy || agent.CreatedBy || 0);

          if (rmContext.rmId && (agentRmId || agentCreatedBy)) {
            if (agentRmId && Number(agentRmId) === Number(rmContext.rmId)) return true;
            if (agentCreatedBy && Number(agentCreatedBy) === Number(rmContext.rmId)) return true;
          }

          // Branch is not an ownership relation: multiple RMs may work in one branch.
          return false;
        });

        const agentIds = new Set(
          matchedAgents
            .map((agent) => Number(agent.agentId || agent.AgentId))
            .filter((value) => Number.isFinite(value) && value > 0)
        );

        let filtered = rows.filter((item) => {
          const rowAgentId = Number(item.agentId || item.AgentId);
          return agentIds.has(rowAgentId);
        });

        const mapped = filtered.map(mapBackendApplication);

        if (active) {
          setApplications(mapped);
        }
      } catch (error) {
        console.error('Failed to fetch AgentAddCustomer:', error);
        if (active) {
          setApplications([]);
          setErrorPopup('Unable to load live applications for this RM. Please try again.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadApplications();

    return () => {
      active = false;
    };
  }, []);

  const filteredData = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        app.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.mobile.includes(searchTerm);
      const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [applications, searchTerm, statusFilter]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize).map((row, index) => ({
      ...row,
      sno: start + index + 1
    }));
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

  const columns = [
    { key: 'sno', label: 'S.NO' },
    { key: 'id', label: 'APP ID' },
    { key: 'customerName', label: 'CUSTOMER NAME' },
    { key: 'mobile', label: 'MOBILE' },
    { key: 'loanType', label: 'LOAN PURPOSE' },
    { key: 'amount', label: 'AMOUNT' },
    { key: 'agentName', label: 'FIELD AGENT' },
    { key: 'createdDate', label: 'DATE' },
    {
      key: 'status',
      label: 'STATUS',
      render: (row) => (
        <div className="new-apps-status-cell">
          <StatusBadge
            status={row.status}
            label={row.status === 'Approved' ? 'Submitted to HO' : undefined}
          />
        </div>
      ),
    },
    {
      key: 'action',
      label: 'ACTIONS',
      render: (row) => {
        let btnText = 'Verify Now';
        if (row.status === 'Approved') btnText = 'View Details';
        if (row.status === 'Returned') btnText = 'Review Return';
        const applicationId = row.agentCustomerId || row.id;

        return (
          <div className="new-apps-actions-cell">
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate(ROUTES.APPLICATION_DETAILS.replace(':applicationId', applicationId))}
            >
              {btnText}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="listing-page-wrapper">
      <div className="panel listing-card-full">
        <ErrorPopup
          show={!!errorPopup}
          title="Application List Error"
          message={errorPopup}
          onClose={() => setErrorPopup('')}
        />
        {isLoading && (
          <div style={{ marginBottom: '12px', color: '#64748b', fontSize: '14px' }}>
            Loading applications...
          </div>
        )}
        <div className="filter-bar">
          <div className="search-box">
            {SearchIcon && <SearchIcon size={16} className="search-icon" />}
            <input
              type="text"
              className="form-input"
              placeholder="Search by ID, Customer or Mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-align-center gap-3">
            {FilterIcon && <FilterIcon size={16} className="text-muted" />}
            <div style={{ width: '180px' }}>
              <Select
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: 'All', label: 'All Statuses' },
                  { value: 'New', label: 'New' },
                  { value: 'Pending', label: 'Pending' },
                  { value: 'Under Review', label: 'Under Review' },
                  { value: 'Approved', label: 'Submitted to HO' },
                  { value: 'Returned', label: 'Returned' },
                ]}
                placeholder={null}
              />
            </div>
          </div>
        </div>

        <div className="listing-table-flex">
          <DataTable columns={columns} data={paginatedData} rowKeyField="id" className="rm-new-applications-table" />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={filteredData.length}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={handlePageSizeChange}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      </div>
    </div>
  );
}
