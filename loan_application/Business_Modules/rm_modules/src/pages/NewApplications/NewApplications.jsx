import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import DataTable from '../../components/DataTable/DataTable';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import ErrorPopup from '../../components/ErrorPopup/ErrorPopup';
import Button from '../../components/Button/Button';
import Pagination from '../../components/Pagination/Pagination';
import Select from '../../components/Select/Select';
import { ROUTES } from '../../config/routeConfig';
import { formatDate } from '../../utils/dateHelper';
import {
  buildAllowedAgentIdSet,
  filterAgentsForRm,
  getCurrentRMContext,
  normalizeApplicationStatus,
  resolveApiArray,
} from '../../utils/rmContext';
import './NewApplications.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

const normalizeMobile = (value) => String(value || '').replace(/\D/g, '');

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  return `Rs. ${Number(value).toLocaleString('en-IN')}`;
};

const mapBackendApplication = (item, index, agentsById = {}) => {
  const applicationId = item.applicationId || item.applicationNumber || item.agentCustomerId || item.customerId || `${index + 1}`;
  const agentId = item.agentId || item.AgentId || null;
  const agent = agentsById[String(agentId)] || {};
  const normalizedStatus = normalizeApplicationStatus(item.status, item.statusName || item.StatusName);
  return {
    id: String(applicationId),
    customerName: item.fullName || item.customerName || '',
    mobile: normalizeMobile(item.mobileNumber || item.mobile || ''),
    loanType: item.loanPurposeName || item.loanType || '',
    amount: formatCurrency(item.expectedLoanAmount ?? item.amount),
    agentName: item.agentName || agent.fullName || agent.FullName || '',
    createdDate: formatDate(item.createdAt || item.createdDate),
    status: normalizedStatus,
    rawStatus: normalizedStatus,
    agentCustomerId: item.agentCustomerId || item.customerId || null,
    agentId,
  };
};

export default function NewApplications({ initialFilter = 'All' }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorPopup, setErrorPopup] = useState('');
  const pageSize = 10;

  const SearchIcon = iconMap['Search'];
  const FilterIcon = iconMap['Filter'];

  useEffect(() => {
    setStatusFilter(initialFilter);
    setCurrentPage(1);
    setSearchTerm('');
  }, [initialFilter]);

  useEffect(() => {
    let active = true;

    async function loadApplications() {
      const rmContext = getCurrentRMContext();

      if (!rmContext.rmId) {
        setApplications([]);
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

        const matchedAgents = filterAgentsForRm(resolveApiArray(agentsData), rmContext.rmId);
        const agentsById = matchedAgents.reduce((result, agent) => {
          const id = agent.agentId || agent.AgentId;
          if (id !== undefined && id !== null) result[String(id)] = agent;
          return result;
        }, {});
        const agentIds = buildAllowedAgentIdSet(matchedAgents);

        const filtered = resolveApiArray(customersData).filter((item) => {
          const rowAgentId = Number(item.agentId || item.AgentId);
          return agentIds.has(rowAgentId);
        });

        if (active) {
          setApplications(filtered.map((item, index) => mapBackendApplication(item, index, agentsById)));
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
  }, [filteredData, currentPage]);

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
      render: (row) => <StatusBadge status={row.status} />,
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
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate(ROUTES.APPLICATION_DETAILS.replace(':applicationId', applicationId))}
          >
            {btnText}
          </Button>
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
                  {value: "All", label: "All Statuses"},
                  {value: "New", label: "New"},
                  {value: "Pending", label: "Pending"},
                  {value: "Under Review", label: "Under Review"},
                  {value: "Approved", label: "Approved"},
                  {value: "Returned", label: "Returned"}
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
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      </div>
    </div>
  );
}
