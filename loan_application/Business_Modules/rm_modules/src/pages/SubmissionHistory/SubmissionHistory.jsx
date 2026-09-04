import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil } from 'lucide-react';
import iconMap from '../../config/iconMap';
import DataTable from '../../components/DataTable/DataTable';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Button from '../../components/Button/Button';
import Pagination from '../../components/Pagination/Pagination';
import { ROUTES } from '../../config/routeConfig';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api').replace(/\/$/, '');

function resolveArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.value)) return data.value;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function normalizeStatus(record) {
  const name = String(record.statusName || record.StatusName || record.statusDescription || '').toLowerCase();
  if (name.includes('approved') || name.includes('submitted')) return 'Approved';
  if (name.includes('pending')) return 'Pending';
  if (name.includes('returned')) return 'Returned';
  const status = Number(record.status ?? record.Status);
  if (status === 2) return 'Approved';
  if (status === 1) return 'Pending';
  return 'New';
}

function formatSubmittedDateTime(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, '0');

  return `${day} ${month} ${year}, ${hoursStr}:${minutes} ${ampm}`;
}

function mapSubmission(record, agentsById) {
  const id = record.applicationId || record.applicationNumber || record.agentCustomerId || record.customerId;
  const agentId = record.agentId || record.AgentId;
  const agent = agentsById[String(agentId)] || {};
  const submittedRaw = record.submittedAt || record.SubmittedAt || record.createdAt || record.CreatedAt || record.createdDate;
  return {
    id: String(id),
    customerName: record.fullName || record.FullName || record.customerName || 'Unknown',
    mobile: record.mobileNumber || record.MobileNumber || record.mobile || 'N/A',
    loanType: record.loanPurposeName || record.LoanPurposeName || record.loanType || 'N/A',
    amount: record.expectedLoanAmount == null ? (record.amount || 'N/A') : `Rs. ${Number(record.expectedLoanAmount).toLocaleString('en-IN')}`,
    agentName: record.agentName || record.AgentName || agent.fullName || agent.FullName || 'N/A',
    branch: agent.branch || agent.Branch || record.branch || record.Branch || 'N/A',
    submitted: formatSubmittedDateTime(submittedRaw),
    rawSubmitted: submittedRaw,
    // Submission History uses the business-facing workflow label. The API
    // status remains unchanged; only this page's display label is mapped.
    status: 'Ready for Review',
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
        const [customersResponse, agentsResponse] = await Promise.all([
          fetch(`${API_BASE}/AgentAddCustomer`),
          fetch(`${API_BASE}/AgentMaster`),
        ]);
        if (!customersResponse.ok) throw new Error(`Failed to load submissions (${customersResponse.status})`);
        if (!agentsResponse.ok) throw new Error(`Failed to load agents (${agentsResponse.status})`);
        const [customersData, agentsData] = await Promise.all([customersResponse.json(), agentsResponse.json()]);
        const agentsById = resolveArray(agentsData).reduce((result, agent) => {
          const id = agent.agentId || agent.AgentId;
          if (id !== undefined && id !== null) result[String(id)] = agent;
          return result;
        }, {});
        const currentUser = JSON.parse(localStorage.getItem('sivels_currentUser') || 'null');
        const rmId = Number(currentUser?.rmId || currentUser?.RMId || currentUser?.rmid || localStorage.getItem('rmId') || 0);
        const assignedAgentIds = new Set(Object.values(agentsById).filter((agent) => Number(agent.rmId || agent.RMId || agent.relationshipManagerId || agent.RelationshipManagerId || agent.createdBy || 0) === rmId).map((agent) => String(agent.agentId || agent.AgentId)));
        const liveRows = resolveArray(customersData)
          .filter((record) => assignedAgentIds.has(String(record.agentId || record.AgentId)))
          .map((record) => mapSubmission(record, agentsById))
          .filter((record) => record.id !== 'undefined');
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
      .filter((row) => [row.customerName, row.id, row.mobile, row.loanType, row.branch, row.agentName]
        .some((value) => String(value || '').toLowerCase().includes(searchLower)))
      .sort((a, b) => {
        const timeA = a.rawSubmitted ? new Date(a.rawSubmitted).getTime() : 0;
        const timeB = b.rawSubmitted ? new Date(b.rawSubmitted).getTime() : 0;
        return timeB - timeA;
      });
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
    { key: 'id', label: 'APP ID' },
    { key: 'customerName', label: 'CUSTOMER NAME' },
    { key: 'mobile', label: 'MOBILE' },
    { key: 'branch', label: 'BRANCH' },
    { key: 'loanType', label: 'LOAN PURPOSE' },
    { key: 'amount', label: 'AMOUNT' },
    { key: 'submitted', label: 'SUBMITTED' },
    { key: 'agentName', label: 'FIELD AGENT' },
    { key: 'status', label: 'STATUS', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'action', label: 'ACTIONS',
      render: (row) => (
        <div className="sub-hist-actions-cell">
          <button
            type="button"
            className="sub-hist-btn sub-hist-btn--view"
            title="View Form"
            aria-label="View Form"
            onClick={() => navigate(ROUTES.APPLICATION_PDF_VIEW.replace(':applicationId', row.id))}
          >
            <Eye size={15} />
          </button>
          <button
            type="button"
            className="sub-hist-btn sub-hist-btn--edit"
            title="Edit Form"
            aria-label="Edit Form"
            onClick={() => navigate(ROUTES.APPLICATION_DETAILS.replace(':applicationId', row.id))}
          >
            <Pencil size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="listing-page-wrapper">
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
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading live submissions...</div>
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#b91c1c' }}>{error}</div>
          ) : filteredData.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No live applications found.</div>
          ) : (
            <>
              <DataTable columns={columns} data={paginatedData} rowKeyField="id" className="rm-submission-history-table" />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={filteredData.length}
                pageSize={pageSize}
                pageSizeOptions={pageSizeOptions}
                onPageSizeChange={handlePageSizeChange}
                onPageChange={(newPage) => setCurrentPage(newPage)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
