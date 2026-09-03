import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function mapSubmission(record, agentsById) {
  const id = record.applicationId || record.applicationNumber || record.agentCustomerId || record.customerId;
  const agentId = record.agentId || record.AgentId;
  const agent = agentsById[String(agentId)] || {};
  return {
    id: String(id),
    customerName: record.fullName || record.FullName || record.customerName || 'Unknown',
    mobile: record.mobileNumber || record.MobileNumber || record.mobile || 'N/A',
    loanType: record.loanPurposeName || record.LoanPurposeName || record.loanType || 'N/A',
    amount: record.expectedLoanAmount == null ? (record.amount || 'N/A') : `Rs. ${Number(record.expectedLoanAmount).toLocaleString('en-IN')}`,
    agentName: record.agentName || record.AgentName || agent.fullName || agent.FullName || 'N/A',
    branch: agent.branch || agent.Branch || record.branch || record.Branch || 'N/A',
    submitted: formatDate(record.submittedAt || record.SubmittedAt || record.createdAt || record.CreatedAt || record.createdDate),
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const pageSize = 10;
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
      .filter((row) => [row.customerName, row.id, row.mobile, row.loanType, row.branch]
        .some((value) => String(value).toLowerCase().includes(searchLower)))
      .sort((a, b) => new Date(b.submitted) - new Date(a.submitted));
  }, [submissions, searchTerm]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize).map((row, index) => ({ ...row, sno: start + index + 1 }));
  }, [filteredData, currentPage]);

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
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button size="sm" variant="secondary" onClick={() => navigate(ROUTES.APPLICATION_PDF_VIEW.replace(':applicationId', row.id))}>View Form</Button>
          <Button size="sm" variant="outline" onClick={() => navigate(ROUTES.APPLICATION_DETAILS.replace(':applicationId', row.id))}>Edit Form</Button>
        </div>
      ),
    },
  ];

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

  return (
    <div className="listing-page-wrapper">
      <div className="panel listing-card-full">
        <div className="filter-bar">
          <div className="search-box">
            {SearchIcon && <SearchIcon size={16} className="search-icon" />}
            <input type="text" className="form-input" placeholder="Search by ID, Customer or Mobile..." value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setCurrentPage(1); }} />
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
              <Pagination currentPage={currentPage} totalPages={totalPages} totalRecords={filteredData.length} pageSize={pageSize} onPageChange={setCurrentPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
