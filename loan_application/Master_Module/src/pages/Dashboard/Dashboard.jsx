import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowUpRight, BriefcaseBusiness, CheckCircle2, Clock3, Eye, Plus, RefreshCw, Search, Users, X } from 'lucide-react';
import './Dashboard.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
const unwrap = (response) => Array.isArray(response) ? response : (response?.data || response?.value || []);
const read = (record, keys, fallback = '') => keys.map((key) => record?.[key]).find((value) => value !== undefined && value !== null && value !== '') ?? fallback;
const status = (value, fallback = 'Active') => typeof value === 'boolean' ? (value ? 'Active' : 'Inactive') : String(value || fallback).replace(/^./, (letter) => letter.toUpperCase());
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'A';
const money = (value) => Number(String(value ?? '').replace(/[^0-9.-]/g, '')) || 0;
const formatAmount = (amount) => amount > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount) : '—';
const formatWhen = (value) => { const date = new Date(value); if (!value || Number.isNaN(date.getTime())) return 'Recently updated'; const minutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000)); return minutes < 60 ? `${minutes} min ago` : minutes < 1440 ? `${Math.floor(minutes / 60)} hr ago` : `${Math.floor(minutes / 1440)} days ago`; };
const authHeaders = () => { const token = localStorage.getItem('authToken'); return token ? { Authorization: `Bearer ${token}` } : {}; };

export function Dashboard() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]); const [applications, setApplications] = useState([]); const [rms, setRms] = useState([]);
  const [query, setQuery] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [updatedAt, setUpdatedAt] = useState(null); const [selectedPerson, setSelectedPerson] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const headers = authHeaders();
      const [agentResult, applicationResult, rmResult] = await Promise.allSettled([
        fetch(`${API_BASE}/AgentMaster`, { headers }).then((response) => response.ok ? response.json() : Promise.reject(new Error('Agents request failed'))),
        fetch(`${API_BASE}/AgentAddCustomer`, { headers }).then((response) => response.ok ? response.json() : Promise.reject(new Error('Applications request failed'))),
        fetch(`${API_BASE}/RMMaster`, { headers }).then((response) => response.ok ? response.json() : Promise.reject(new Error('RM request failed'))),
      ]);
      if ([agentResult, applicationResult, rmResult].some((result) => result.status === 'rejected')) setError('Some live records could not be loaded. Available data is shown below.');
      const rmRows = rmResult.status === 'fulfilled' ? unwrap(rmResult.value) : [];
      const liveRms = rmRows.map((rm) => ({ id: read(rm, ['rmId', 'RMId', 'id']), name: read(rm, ['fullName', 'name', 'rmName', 'RMName']) || `${read(rm, ['firstName'])} ${read(rm, ['lastName'])}`.trim(), email: read(rm, ['emailAddress', 'email']), phone: read(rm, ['mobileNumber', 'phone']), branch: read(rm, ['branch', 'Branch', 'branchName', 'BranchName']), status: status(read(rm, ['status', 'isActive', 'IsActive'])) })).filter((rm) => rm.id && rm.name);
      const rmNames = new Map(liveRms.map((rm) => [String(rm.id), rm.name]));
      const customerRows = applicationResult.status === 'fulfilled' ? unwrap(applicationResult.value) : [];
      const liveApplications = customerRows.map((application) => ({
        id: read(application, ['agentCustomerId', 'AgentCustomerId', 'applicationId', 'id']), agentId: read(application, ['agentId', 'AgentId']),
        status: status(read(application, ['status', 'applicationStatus', 'ApplicationStatus', 'isActive'], 'Pending'), 'Pending'),
        amount: money(read(application, ['disbursedAmount', 'DisbursedAmount', 'loanAmount', 'LoanAmount', 'requestedAmount'])), updatedAt: read(application, ['modifiedAt', 'updatedAt', 'createdAt', 'createdDate']),
      }));
      const applicationsByAgent = liveApplications.reduce((map, application) => map.set(String(application.agentId || ''), (map.get(String(application.agentId || '')) || 0) + 1), new Map());
      const agentRows = agentResult.status === 'fulfilled' ? unwrap(agentResult.value) : [];
      const liveAgents = agentRows.map((agent) => { const rmId = read(agent, ['rmId', 'RMId', 'relationshipManagerId', 'RelationshipManagerId', 'createdBy']); const id = read(agent, ['agentId', 'AgentId', 'id']); return { id, name: read(agent, ['fullName', 'agentName', 'name'], 'Unnamed agent'), email: read(agent, ['emailAddress', 'email']), phone: read(agent, ['mobileNumber', 'phone']), rm: read(agent, ['relationshipManager', 'rmName', 'RMName']) || rmNames.get(String(rmId)) || 'Unassigned', rmId, status: status(read(agent, ['status', 'isActive', 'IsActive'])), applications: applicationsByAgent.get(String(id)) || 0, updatedAt: read(agent, ['modifiedAt', 'updatedAt', 'createdAt', 'createdDate', 'dateJoined']) }; }).filter((agent) => agent.id || agent.name);
      setAgents(liveAgents); setApplications(liveApplications); setRms(liveRms); setUpdatedAt(new Date());
    } catch { setError('Live dashboard data is unavailable. Check your connection and try again.'); setAgents([]); setApplications([]); setRms([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  const filteredAgents = useMemo(() => agents.filter((agent) => `${agent.name} ${agent.email} ${agent.rm}`.toLowerCase().includes(query.toLowerCase())), [agents, query]);
  const pending = applications.filter((application) => /pending|review|new|submitted/i.test(application.status));
  const disbursed = applications.filter((application) => /disburs/i.test(application.status));
  const coverage = rms.map((rm) => ({ ...rm, agents: agents.filter((agent) => String(agent.rmId) === String(rm.id) || agent.rm === rm.name).length }));
  const maxCoverage = Math.max(...coverage.map((rm) => rm.agents), 1);
  const activity = [...agents, ...applications].filter((item) => item.updatedAt).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 3);
  const stats = [[Users, 'green', 'Relationship managers', rms.length, 'Live RM master'], [BriefcaseBusiness, 'blue', 'Total agents', agents.length, 'Live agent master'], [Clock3, 'orange', 'Pending review', pending.length, 'Requires action'], [CheckCircle2, 'purple', 'Disbursed amount', formatAmount(disbursed.reduce((total, application) => total + application.amount, 0)), disbursed.length ? `${disbursed.length} disbursed` : 'No disbursements recorded']];

  return <div className="dashboard-page">
    <header className="dashboard-header"><div><span className="eyebrow">MASTER WORKSPACE</span><h1 className="dashboard-title">Admin dashboard</h1><p className="dashboard-description">A live view of your lending network, applications, and RM coverage.</p>{updatedAt && <p className="dashboard-meta">Last synced {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}</div><div className="dashboard-actions"><button className="masters-btn-secondary" onClick={loadDashboard} disabled={loading}><RefreshCw size={17} className={loading ? 'master-spin' : ''} /> Refresh</button><button className="primary-button" onClick={() => navigate('/create-user')}><Plus size={18} /> Create user</button></div></header>
    {error && <div className="dashboard-error" role="status">{error}</div>}
    <section className="stat-grid">{stats.map(([Icon, color, label, value, note]) => <div className="stat-card" key={label}><div className={`stat-icon ${color}`}><Icon size={20} /></div><div><span>{label}</span><strong>{value}</strong><small className={label === 'Pending review' ? 'neutral' : ''}><ArrowUpRight size={13} /> {note}</small></div></div>)}</section>
    <section className="content-card agent-card"><div className="card-heading"><div><h2>Agents</h2><p>Live agents and their relationship-manager assignments.</p></div><div className="search-box"><Search size={17} /><input aria-label="Search agents" placeholder="Search agents..." value={query} onChange={(event) => setQuery(event.target.value)} /></div></div><div className="table-wrap"><table><thead><tr><th>Agent</th><th>Contact</th><th>Assigned RM</th><th>Applications</th><th>Status</th><th>Details</th></tr></thead><tbody>{loading ? <tr><td className="empty-table" colSpan="6">Loading live agent data…</td></tr> : filteredAgents.length ? filteredAgents.map((agent) => <tr key={agent.id || agent.name}><td><div className="agent-name"><span>{initials(agent.name)}</span><strong>{agent.name}</strong></div></td><td><div>{agent.email || '—'}</div><small>{agent.phone || '—'}</small></td><td>{agent.rm}</td><td><strong>{agent.applications}</strong></td><td><span className={`status ${agent.status.toLowerCase().replace(/\s+/g, '-')}`}>{agent.status}</span></td><td><button className="details-button" onClick={() => setSelectedPerson({ ...agent, type: 'Agent' })}><Eye size={15} /> View</button></td></tr>) : <tr><td className="empty-table" colSpan="6">No matching agents found.</td></tr>}</tbody></table></div></section>
    <section className="bottom-grid"><div className="content-card"><div className="card-heading"><div><h2>Relationship managers</h2><p>Select an RM to see their contact and assignment details.</p></div><Activity size={20} className="heading-icon" /></div>{loading ? <p className="loading-line">Loading relationship managers…</p> : coverage.length ? <div className="coverage-list">{coverage.map((rm) => <button className="coverage-row" key={rm.id || rm.name} onClick={() => setSelectedPerson({ ...rm, type: 'Relationship manager' })}><div className="rm-avatar">{initials(rm.name)}</div><div className="coverage-info"><strong>{rm.name}</strong><span>{rm.agents} agents assigned</span></div><div className="coverage-bar"><i style={{ width: `${(rm.agents / maxCoverage) * 100}%` }} /></div><Eye size={16} /></button>)}</div> : <p className="loading-line">No relationship managers are available.</p>}</div><div className="content-card activity-card"><div className="card-heading"><div><h2>Recent activity</h2><p>Latest changes reported by the live records.</p></div></div>{activity.length ? activity.map((record, index) => <div className="activity-item" key={`${record.id || index}-${record.updatedAt}`}><CheckCircle2 size={18} /><div><strong>{record.name ? `${record.name} updated` : `${record.status} application updated`}</strong><span>{formatWhen(record.updatedAt)}</span></div></div>) : <p className="loading-line">No recent activity is available.</p>}</div></section>
    {selectedPerson && <div className="person-dialog-backdrop" role="presentation" onMouseDown={() => setSelectedPerson(null)}><section className="person-dialog" role="dialog" aria-modal="true" aria-label={`${selectedPerson.type} details`} onMouseDown={(event) => event.stopPropagation()}><button className="person-dialog-close" onClick={() => setSelectedPerson(null)} aria-label="Close details"><X size={18} /></button><div className="person-dialog-avatar">{initials(selectedPerson.name)}</div><span className="eyebrow">{selectedPerson.type}</span><h2>{selectedPerson.name}</h2><span className={`status ${String(selectedPerson.status || 'active').toLowerCase()}`}>{selectedPerson.status || 'Active'}</span><dl className="person-detail-grid"><div><dt>Email</dt><dd>{selectedPerson.email || 'Not available'}</dd></div><div><dt>Phone</dt><dd>{selectedPerson.phone || 'Not available'}</dd></div>{selectedPerson.type === 'Agent' ? <><div><dt>Assigned RM</dt><dd>{selectedPerson.rm}</dd></div><div><dt>Applications</dt><dd>{selectedPerson.applications}</dd></div></> : <><div><dt>Branch</dt><dd>{selectedPerson.branch || 'Not available'}</dd></div><div><dt>Assigned agents</dt><dd>{selectedPerson.agents}</dd></div></>}</dl></section></div>}
  </div>;
}
