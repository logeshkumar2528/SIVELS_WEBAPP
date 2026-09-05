import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil } from 'lucide-react';
import iconMap from '../../config/iconMap';
import DataTable from '../../components/DataTable/DataTable';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Button from '../../components/Button/Button';
import Pagination from '../../components/Pagination/Pagination';
import { ROUTES } from '../../config/routeConfig';
import { formatDate, formatTime, getDateTimestamp } from '../../utils/dateHelper';
import {
  buildAllowedAgentIdSet,
  filterAgentsForRm,
  getCurrentRMContext,
  normalizeApplicationStatus,
  resolveApiArray,
} from '../../utils/rmContext';
import { buildApplicationDisplayId } from '../applicationWizard/flowUtils';
import './SubmissionHistory.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api').replace(/\/$/, '');

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function mapSubmission(record, agentsById) {
  const id = record.applicationId || record.applicationNumber || record.agentCustomerId || record.customerId;
  const agentId = record.agentId || record.AgentId;
  const agent = agentsById[String(agentId)] || {};
  const submittedRaw = record.submittedAt || record.SubmittedAt || record.createdAt || record.CreatedAt || record.createdDate || '';
  return {
    internalId: String(id),
    id: buildApplicationDisplayId(record, id),
    customerName: record.fullName || record.FullName || record.customerName || 'Unknown',
    mobile: record.mobileNumber || record.MobileNumber || record.mobile || 'N/A',
    loanType: record.loanPurposeName || record.LoanPurposeName || record.loanType || 'N/A',
    amount: record.expectedLoanAmount == null ? (record.amount || 'N/A') : `Rs. ${Number(record.expectedLoanAmount).toLocaleString('en-IN')}`,
    agentName: record.agentName || record.AgentName || agent.fullName || agent.FullName || 'N/A',
    branch: agent.branch || agent.Branch || record.branch || record.Branch || 'N/A',
    submittedDate: formatDate(submittedRaw),
    submittedTime: formatTime(submittedRaw),
    submittedAt: submittedRaw,
    status: normalizeApplicationStatus(record.status ?? record.Status, record.statusName || record.StatusName),
  };
}

export default function SubmissionHistory() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const pageSizeOptions = [7, 10, 15, 20];

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const SearchIcon = iconMap['Search'];

  useEffect(() => {
    let active = true;
    async function loadLiveSubmissions() {
      setIsLoading(true);
      setError('');
      try {
        const rmContext = getCurrentRMContext();
        if (!rmContext.rmId) {
          throw new Error('No RM context found in session. Please sign in again.');
        }

        const [customersResponse, agentsResponse] = await Promise.all([
          fetch(`${API_BASE}/AgentAddCustomer`),
          fetch(`${API_BASE}/AgentMaster`),
        ]);
        if (!customersResponse.ok) throw new Error(`Failed to load submissions (${customersResponse.status})`);
        if (!agentsResponse.ok) throw new Error(`Failed to load agents (${agentsResponse.status})`);
        const [customersData, agentsData] = await Promise.all([customersResponse.json(), agentsResponse.json()]);

        const matchedAgents = filterAgentsForRm(resolveApiArray(agentsData), rmContext.rmId);
        const agentsById = matchedAgents.reduce((result, agent) => {
          const id = agent.agentId || agent.AgentId;
          if (id !== undefined && id !== null) result[String(id)] = agent;
          return result;
        }, {});
        const assignedAgentIds = buildAllowedAgentIdSet(matchedAgents);

        const liveRows = resolveApiArray(customersData)
          .filter((record) => assignedAgentIds.has(Number(record.agentId || record.AgentId)))
          .map((record) => mapSubmission(record, agentsById))
          .filter((record) => record.id && record.id !== 'undefined');

        if (active) setSubmissions(liveRows);
      } catch (loadError) {
        if (active) {
          setSubmissions([]);
          setError(loadError.message || 'Unable to load live submission history.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadLiveSubmissions();
    return () => { active = false; };
  }, []);

  const filteredData = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();
    return submissions
      .filter((row) => [row.customerName, row.id, row.mobile, row.loanType, row.branch]
        .some((value) => String(value).toLowerCase().includes(searchLower)))
      .sort((a, b) => getDateTimestamp(b.submittedAt) - getDateTimestamp(a.submittedAt));
  }, [submissions, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize).map((row, index) => ({ ...row, sno: start + index + 1 }));
  }, [filteredData, currentPage, pageSize]);

  const columns = [
    { key: 'sno', label: 'S.NO' },
    {
      key: 'id',
      label: 'APP ID',
      render: (row) => <span className="sh-app-id" title={row.id}>{row.id}</span>,
    },
    {
      key: 'customerName',
      label: 'CUSTOMER',
      render: (row) => (
        <div className="sh-cell sh-cell--row">
          <span className="sh-avatar" aria-hidden="true">{getInitials(row.customerName)}</span>
          <div className="sh-cell">
            <span className="sh-cell__primary" title={row.customerName}>{row.customerName}</span>
            <span className="sh-cell__secondary" title={row.mobile}>{row.mobile}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'loanType',
      label: 'LOAN',
      render: (row) => (
        <div className="sh-cell">
          <span className="sh-cell__primary" title={row.loanType}>{row.loanType}</span>
          <span className="sh-cell__secondary sh-amount" title={row.amount}>{row.amount}</span>
        </div>
      ),
    },
    {
      key: 'agentName',
      label: 'FIELD AGENT',
      render: (row) => (
        <div className="sh-cell">
          <span className="sh-cell__primary" title={row.agentName}>{row.agentName}</span>
        </div>
      ),
    },
    {
      key: 'submitted',
      label: 'SUBMITTED',
      render: (row) => (
        <div className="sh-cell">
          <span className="sh-cell__primary">{row.submittedDate}</span>
          <span className="sh-cell__secondary">{row.submittedTime}</span>
        </div>
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
        <div className="sh-actions">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate(ROUTES.APPLICATION_PDF_VIEW.replace(':applicationId', row.internalId))}
          >
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(ROUTES.APPLICATION_DETAILS.replace(':applicationId', row.internalId))}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="listing-page-wrapper rm-submission-history">
      <div className="panel listing-card-full">
        <div className="filter-bar">
          <div className="search-box">
            {SearchIcon && <SearchIcon size={16} className="search-icon" />}
            <input
              type="text"
              className="form-input"
              placeholder="Search by ID, Customer or Mobile..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
        <div className="listing-table-flex">
          {isLoading ? (
            <div className="listing-state">Loading live submissions...</div>
          ) : error ? (
            <div className="listing-state listing-state--error">{error}</div>
          ) : filteredData.length === 0 ? (
            <div className="listing-state">No live applications found for this RM.</div>
          ) : (
            <>
              <DataTable columns={columns} data={paginatedData} rowKeyField="id" className="rm-submission-history-table" />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={filteredData.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
