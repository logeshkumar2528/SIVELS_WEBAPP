import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowUpRight, BriefcaseBusiness, CheckCircle2, Eye, FileText, Pencil, Plus, RefreshCw, Search, Users, X } from 'lucide-react';
import { formatDateTime, formatDateTimeFriendly } from '../../utils/dateHelper';
import './Dashboard.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
const unwrap = (response) => Array.isArray(response) ? response : (response?.data || response?.value || []);
const read = (record, keys, fallback = '') => keys.map((key) => record?.[key]).find((value) => value !== undefined && value !== null && value !== '') ?? fallback;
const status = (value, fallback = 'Active') => typeof value === 'boolean' ? (value ? 'Active' : 'Inactive') : String(value || fallback).replace(/^./, (letter) => letter.toUpperCase());
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'A';
const money = (value) => Number(String(value ?? '').replace(/[^0-9.-]/g, '')) || 0;
const formatAmount = (amount) => amount > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount) : '—';

const normalizeApplicationStatus = (value, statusName = '') => {
  const named = String(statusName || '').trim().toLowerCase();
  if (named.includes('approved')) return 'Approved';
  if (named.includes('returned') || named.includes('reject')) return 'Returned';
  if (named.includes('review')) return 'Under Review';
  if (named.includes('pending') || named.includes('progress')) return 'Pending';
  if (named.includes('new') || named.includes('draft')) return 'New';
  if (named.includes('disburs')) return 'Disbursed';

  const numeric = Number(value);
  if (numeric === 2) return 'Approved';
  if (numeric === 1) return 'Pending';
  if (numeric === 0) return 'New';

  const raw = String(value || '').trim();
  if (!raw || raw.toLowerCase() === 'draft') return 'New';
  return raw.replace(/^./, (letter) => letter.toUpperCase());
};

const formatWhen = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return 'Recently updated';
  const minutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ago`;
  return `${Math.floor(minutes / 1440)} days ago · ${formatDateTimeFriendly(value)}`;
};

const authHeaders = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export function Dashboard() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [rms, setRms] = useState([]);
  const [query, setQuery] = useState('');
  const [applicationQuery, setApplicationQuery] = useState('');
  const [applicationStatusFilter, setApplicationStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = authHeaders();
      const [agentResult, applicationResult, rmResult] = await Promise.allSettled([
        fetch(`${API_BASE}/AgentMaster`, { headers }).then((response) => response.ok ? response.json() : Promise.reject(new Error('Agents request failed'))),
        fetch(`${API_BASE}/AgentAddCustomer`, { headers }).then((response) => response.ok ? response.json() : Promise.reject(new Error('Applications request failed'))),
        fetch(`${API_BASE}/RMMaster`, { headers }).then((response) => response.ok ? response.json() : Promise.reject(new Error('RM request failed'))),
      ]);
      if ([agentResult, applicationResult, rmResult].some((result) => result.status === 'rejected')) {
        setError('Some live records could not be loaded. Available data is shown below.');
      }
      const rmRows = rmResult.status === 'fulfilled' ? unwrap(rmResult.value) : [];
      const liveRms = rmRows.map((rm) => ({
        id: read(rm, ['rmId', 'RMId', 'id']),
        name: read(rm, ['fullName', 'name', 'rmName', 'RMName']) || `${read(rm, ['firstName'])} ${read(rm, ['lastName'])}`.trim(),
        email: read(rm, ['emailAddress', 'email']),
        phone: read(rm, ['mobileNumber', 'phone']),
        branch: read(rm, ['branch', 'Branch', 'branchName', 'BranchName']),
        status: status(read(rm, ['status', 'isActive', 'IsActive'])),
      })).filter((rm) => rm.id && rm.name);
      const rmNames = new Map(liveRms.map((rm) => [String(rm.id), rm.name]));

      const agentRows = agentResult.status === 'fulfilled' ? unwrap(agentResult.value) : [];
      const agentLookup = new Map();
      agentRows.forEach((agent) => {
        const id = read(agent, ['agentId', 'AgentId', 'id']);
        if (!id) return;
        const rmId = read(agent, ['rmId', 'RMId', 'relationshipManagerId', 'RelationshipManagerId', 'createdBy']);
        agentLookup.set(String(id), {
          id,
          name: read(agent, ['fullName', 'agentName', 'name'], 'Unnamed agent'),
          email: read(agent, ['emailAddress', 'email']),
          phone: read(agent, ['mobileNumber', 'phone']),
          branch: read(agent, ['branch', 'Branch']),
          rmId,
          rmName: read(agent, ['rmName', 'RMName', 'relationshipManager']) || rmNames.get(String(rmId)) || 'Unassigned',
        });
      });

      const customerRows = applicationResult.status === 'fulfilled' ? unwrap(applicationResult.value) : [];
      const liveApplications = customerRows.map((application) => {
        const agentId = read(application, ['agentId', 'AgentId']);
        const agent = agentLookup.get(String(agentId)) || {};
        return {
          id: read(application, ['agentCustomerId', 'AgentCustomerId', 'applicationId', 'id']),
          agentId,
          agentName: read(application, ['agentName', 'AgentName']) || agent.name || '—',
          agentPhone: agent.phone || '—',
          agentEmail: agent.email || '—',
          rmId: agent.rmId || '',
          rmName: agent.rmName || 'Unassigned',
          customerName: read(application, ['fullName', 'customerName', 'FullName'], 'Unknown customer'),
          mobile: read(application, ['mobileNumber', 'MobileNumber', 'mobile'], '—'),
          email: read(application, ['email', 'Email', 'emailAddress'], '—'),
          employmentType: read(application, ['employmentTypeName', 'EmploymentTypeName'], '—'),
          loanPurpose: read(application, ['loanPurposeName', 'LoanPurposeName', 'loanType'], '—'),
          amount: money(read(application, ['expectedLoanAmount', 'ExpectedLoanAmount', 'disbursedAmount', 'loanAmount', 'requestedAmount'])),
          remarks: read(application, ['remarks', 'Remarks'], '—'),
          status: normalizeApplicationStatus(
            read(application, ['status', 'applicationStatus', 'ApplicationStatus'], '0'),
            read(application, ['statusName', 'StatusName'])
          ),
          isActive: application.isActive ?? application.IsActive ?? true,
          createdAt: read(application, ['createdAt', 'CreatedAt', 'createdDate']),
          updatedAt: read(application, ['modifiedAt', 'ModifiedAt', 'updatedAt', 'createdAt', 'createdDate']),
          branch: agent.branch || '—',
        };
      }).filter((application) => application.id);

      const applicationsByAgent = liveApplications.reduce(
        (map, application) => map.set(String(application.agentId || ''), (map.get(String(application.agentId || '')) || 0) + 1),
        new Map()
      );

      const liveAgents = agentRows.map((agent) => {
        const rmId = read(agent, ['rmId', 'RMId', 'relationshipManagerId', 'RelationshipManagerId', 'createdBy']);
        const id = read(agent, ['agentId', 'AgentId', 'id']);
        return {
          id,
          name: read(agent, ['fullName', 'agentName', 'name'], 'Unnamed agent'),
          email: read(agent, ['emailAddress', 'email']),
          phone: read(agent, ['mobileNumber', 'phone']),
          rm: read(agent, ['relationshipManager', 'rmName', 'RMName']) || rmNames.get(String(rmId)) || 'Unassigned',
          rmId,
          status: status(read(agent, ['status', 'isActive', 'IsActive'])),
          applications: applicationsByAgent.get(String(id)) || 0,
          updatedAt: read(agent, ['modifiedAt', 'updatedAt', 'createdAt', 'createdDate', 'dateJoined']),
        };
      }).filter((agent) => agent.id || agent.name);

      setAgents(liveAgents);
      setApplications(liveApplications);
      setRms(liveRms);
      setUpdatedAt(new Date());
    } catch {
      setError('Live dashboard data is unavailable. Check your connection and try again.');
      setAgents([]);
      setApplications([]);
      setRms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const filteredAgents = useMemo(
    () => agents.filter((agent) => `${agent.name} ${agent.email} ${agent.rm}`.toLowerCase().includes(query.toLowerCase())),
    [agents, query]
  );

  const filteredApplications = useMemo(() => {
    const search = applicationQuery.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesStatus = applicationStatusFilter === 'All' || application.status === applicationStatusFilter;
      if (!matchesStatus) return false;
      if (!search) return true;
      return [
        application.id,
        application.customerName,
        application.mobile,
        application.agentName,
        application.rmName,
        application.loanPurpose,
        application.status,
      ].some((value) => String(value || '').toLowerCase().includes(search));
    });
  }, [applications, applicationQuery, applicationStatusFilter]);

  const pending = applications.filter((application) => /pending|review|new|submitted/i.test(application.status));
  const approved = applications.filter((application) => /approved/i.test(application.status));
  const disbursed = applications.filter((application) => /disburs/i.test(application.status));
  const coverage = rms.map((rm) => ({
    ...rm,
    agents: agents.filter((agent) => String(agent.rmId) === String(rm.id) || agent.rm === rm.name).length,
  }));
  const maxCoverage = Math.max(...coverage.map((rm) => rm.agents), 1);
  const activity = [...agents, ...applications]
    .filter((item) => item.updatedAt)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);
  const stats = [
    [Users, 'green', 'Relationship managers', rms.length, 'Live RM master'],
    [BriefcaseBusiness, 'blue', 'Total agents', agents.length, 'Live agent master'],
    [FileText, 'orange', 'Total applications', applications.length, `${pending.length} pending · ${approved.length} approved`],
    [CheckCircle2, 'purple', 'Approved amount', formatAmount(approved.reduce((total, application) => total + application.amount, 0)), disbursed.length ? `${disbursed.length} disbursed` : `${approved.length} approved loans`],
  ];

  const openEdit = (person) => {
    if (!person?.id) return;
    if (person.type === 'Agent') {
      navigate(`/edit-agent/${person.id}`);
      return;
    }
    navigate(`/edit-relationship-manager/${person.id}`);
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <span className="eyebrow">MASTER WORKSPACE</span>
          <h1 className="dashboard-title">Admin dashboard</h1>
          <p className="dashboard-description">A live view of your lending network, applications, and RM coverage.</p>
          {updatedAt && (
            <p className="dashboard-meta">
              Last synced {formatDateTimeFriendly(updatedAt)}
            </p>
          )}
        </div>
        <div className="dashboard-actions">
          <button className="masters-btn-secondary" onClick={loadDashboard} disabled={loading}>
            <RefreshCw size={17} className={loading ? 'master-spin' : ''} /> Refresh
          </button>
          <button className="primary-button" onClick={() => navigate('/create-user')}>
            <Plus size={18} /> Create user
          </button>
        </div>
      </header>

      {error && <div className="dashboard-error" role="status">{error}</div>}

      <section className="stat-grid">
        {stats.map(([Icon, color, label, value, note]) => (
          <div className="stat-card" key={label}>
            <div className={`stat-icon ${color}`}><Icon size={20} /></div>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
              <small className={label === 'Total applications' ? 'neutral' : ''}>
                <ArrowUpRight size={13} /> {note}
              </small>
            </div>
          </div>
        ))}
      </section>

      <section className="content-card agent-card">
        <div className="card-heading">
          <div>
            <h2>Applications</h2>
            <p>Live application list with full customer, agent, and RM details.</p>
          </div>
          <div className="application-filters">
            <div className="search-box">
              <Search size={17} />
              <input
                aria-label="Search applications"
                placeholder="Search apps, customers, agents..."
                value={applicationQuery}
                onChange={(event) => setApplicationQuery(event.target.value)}
              />
            </div>
            <select
              className="status-filter"
              aria-label="Filter application status"
              value={applicationStatusFilter}
              onChange={(event) => setApplicationStatusFilter(event.target.value)}
            >
              <option value="All">All statuses</option>
              <option value="New">New</option>
              <option value="Pending">Pending</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="Returned">Returned</option>
              <option value="Disbursed">Disbursed</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>App ID</th>
                <th>Customer</th>
                <th>Loan</th>
                <th>Agent / RM</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="empty-table" colSpan="7">Loading live applications…</td></tr>
              ) : filteredApplications.length ? (
                filteredApplications.map((application) => (
                  <tr key={application.id}>
                    <td><strong>#{application.id}</strong></td>
                    <td>
                      <div className="agent-name">
                        <span>{initials(application.customerName)}</span>
                        <div>
                          <strong>{application.customerName}</strong>
                          <small>{application.mobile}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{application.loanPurpose}</div>
                      <small>{formatAmount(application.amount)}</small>
                    </td>
                    <td>
                      <div>{application.agentName}</div>
                      <small>{application.rmName}</small>
                    </td>
                    <td>
                      <div>{formatDateTimeFriendly(application.createdAt)}</div>
                      <small>Updated {formatWhen(application.updatedAt)}</small>
                    </td>
                    <td>
                      <span className={`status ${application.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {application.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="details-button"
                        onClick={() => setSelectedApplication(application)}
                      >
                        <Eye size={15} /> View details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td className="empty-table" colSpan="7">No matching applications found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="content-card agent-card">
        <div className="card-heading">
          <div>
            <h2>Agents</h2>
            <p>Live agents and their relationship-manager assignments.</p>
          </div>
          <div className="search-box">
            <Search size={17} />
            <input
              aria-label="Search agents"
              placeholder="Search agents..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Contact</th>
                <th>Assigned RM</th>
                <th>Applications</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="empty-table" colSpan="6">Loading live agent data…</td></tr>
              ) : filteredAgents.length ? (
                filteredAgents.map((agent) => (
                  <tr key={agent.id || agent.name}>
                    <td>
                      <div className="agent-name">
                        <span>{initials(agent.name)}</span>
                        <strong>{agent.name}</strong>
                      </div>
                    </td>
                    <td>
                      <div>{agent.email || '—'}</div>
                      <small>{agent.phone || '—'}</small>
                    </td>
                    <td>{agent.rm}</td>
                    <td><strong>{agent.applications}</strong></td>
                    <td>
                      <span className={`status ${agent.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {agent.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="details-button"
                          onClick={() => setSelectedPerson({ ...agent, type: 'Agent' })}
                        >
                          <Eye size={15} /> View
                        </button>
                        <button
                          className="details-button edit-button"
                          onClick={() => navigate(`/edit-agent/${agent.id}`)}
                        >
                          <Pencil size={15} /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td className="empty-table" colSpan="6">No matching agents found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bottom-grid">
        <div className="content-card">
          <div className="card-heading">
            <div>
              <h2>Relationship managers</h2>
              <p>Select an RM to view or update their details.</p>
            </div>
            <Activity size={20} className="heading-icon" />
          </div>
          {loading ? (
            <p className="loading-line">Loading relationship managers…</p>
          ) : coverage.length ? (
            <div className="coverage-list">
              {coverage.map((rm) => (
                <div className="coverage-row-wrap" key={rm.id || rm.name}>
                  <button
                    className="coverage-row"
                    onClick={() => setSelectedPerson({ ...rm, type: 'Relationship manager' })}
                  >
                    <div className="rm-avatar">{initials(rm.name)}</div>
                    <div className="coverage-info">
                      <strong>{rm.name}</strong>
                      <span>{rm.agents} agents assigned</span>
                    </div>
                    <div className="coverage-bar">
                      <i style={{ width: `${(rm.agents / maxCoverage) * 100}%` }} />
                    </div>
                    <Eye size={16} />
                  </button>
                  <button
                    className="details-button edit-button coverage-edit"
                    onClick={() => navigate(`/edit-relationship-manager/${rm.id}`)}
                  >
                    <Pencil size={14} /> Edit
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="loading-line">No relationship managers are available.</p>
          )}
        </div>

        <div className="content-card activity-card">
          <div className="card-heading">
            <div>
              <h2>Recent activity</h2>
              <p>Latest changes reported by the live records.</p>
            </div>
          </div>
          {activity.length ? (
            activity.map((record, index) => (
              <div className="activity-item" key={`${record.id || index}-${record.updatedAt}`}>
                <CheckCircle2 size={18} />
                <div>
                  <strong>
                    {record.customerName
                      ? `${record.customerName} · ${record.status}`
                      : record.name
                        ? `${record.name} updated`
                        : `${record.status} application updated`}
                  </strong>
                  <span>{formatWhen(record.updatedAt)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="loading-line">No recent activity is available.</p>
          )}
        </div>
      </section>

      {selectedPerson && (
        <div
          className="person-dialog-backdrop"
          role="presentation"
          onMouseDown={() => setSelectedPerson(null)}
        >
          <section
            className="person-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedPerson.type} details`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="person-dialog-close"
              onClick={() => setSelectedPerson(null)}
              aria-label="Close details"
            >
              <X size={18} />
            </button>
            <div className="person-dialog-avatar">{initials(selectedPerson.name)}</div>
            <span className="eyebrow">{selectedPerson.type}</span>
            <h2>{selectedPerson.name}</h2>
            <span className={`status ${String(selectedPerson.status || 'active').toLowerCase()}`}>
              {selectedPerson.status || 'Active'}
            </span>
            <dl className="person-detail-grid">
              <div>
                <dt>Email</dt>
                <dd>{selectedPerson.email || 'Not available'}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{selectedPerson.phone || 'Not available'}</dd>
              </div>
              {selectedPerson.type === 'Agent' ? (
                <>
                  <div>
                    <dt>Assigned RM</dt>
                    <dd>{selectedPerson.rm}</dd>
                  </div>
                  <div>
                    <dt>Applications</dt>
                    <dd>{selectedPerson.applications}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <dt>Branch</dt>
                    <dd>{selectedPerson.branch || 'Not available'}</dd>
                  </div>
                  <div>
                    <dt>Assigned agents</dt>
                    <dd>{selectedPerson.agents}</dd>
                  </div>
                </>
              )}
            </dl>
            <div className="person-dialog-actions">
              <button className="masters-btn-secondary" onClick={() => setSelectedPerson(null)}>
                Close
              </button>
              <button className="primary-button" onClick={() => openEdit(selectedPerson)}>
                <Pencil size={16} /> Edit {selectedPerson.type === 'Agent' ? 'agent' : 'RM'}
              </button>
            </div>
          </section>
        </div>
      )}

      {selectedApplication && (
        <div
          className="person-dialog-backdrop"
          role="presentation"
          onMouseDown={() => setSelectedApplication(null)}
        >
          <section
            className="person-dialog application-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Application details"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="person-dialog-close"
              onClick={() => setSelectedApplication(null)}
              aria-label="Close application details"
            >
              <X size={18} />
            </button>
            <div className="person-dialog-avatar">{initials(selectedApplication.customerName)}</div>
            <span className="eyebrow">Application #{selectedApplication.id}</span>
            <h2>{selectedApplication.customerName}</h2>
            <span className={`status ${selectedApplication.status.toLowerCase().replace(/\s+/g, '-')}`}>
              {selectedApplication.status}
            </span>
            <dl className="person-detail-grid application-detail-grid">
              <div>
                <dt>Mobile</dt>
                <dd>{selectedApplication.mobile}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{selectedApplication.email}</dd>
              </div>
              <div>
                <dt>Loan purpose</dt>
                <dd>{selectedApplication.loanPurpose}</dd>
              </div>
              <div>
                <dt>Expected amount</dt>
                <dd>{formatAmount(selectedApplication.amount)}</dd>
              </div>
              <div>
                <dt>Employment type</dt>
                <dd>{selectedApplication.employmentType}</dd>
              </div>
              <div>
                <dt>Branch</dt>
                <dd>{selectedApplication.branch}</dd>
              </div>
              <div>
                <dt>Field agent</dt>
                <dd>
                  {selectedApplication.agentName}
                  <small>{selectedApplication.agentPhone}</small>
                </dd>
              </div>
              <div>
                <dt>Relationship manager</dt>
                <dd>{selectedApplication.rmName}</dd>
              </div>
              <div>
                <dt>Submitted (IST)</dt>
                <dd>{formatDateTime(selectedApplication.createdAt)}</dd>
              </div>
              <div>
                <dt>Last updated (IST)</dt>
                <dd>{formatDateTime(selectedApplication.updatedAt)}</dd>
              </div>
              <div className="full-width">
                <dt>Remarks</dt>
                <dd>{selectedApplication.remarks}</dd>
              </div>
            </dl>
            <div className="person-dialog-actions">
              <button className="masters-btn-secondary" onClick={() => setSelectedApplication(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
