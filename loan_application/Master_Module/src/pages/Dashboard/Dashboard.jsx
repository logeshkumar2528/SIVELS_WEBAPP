import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  Camera,
  CheckCircle2,
  Eye,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { formatDateTime, formatDateTimeFriendly } from '../../utils/dateHelper';
import { getAMSById, getAMSDistrictsByAmsId } from '../../api/amsApi';
import './Dashboard.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
const unwrap = (response) => Array.isArray(response) ? response : (response?.data || response?.value || []);
const read = (record, keys, fallback = '') => keys.map((key) => record?.[key]).find((value) => value !== undefined && value !== null && value !== '') ?? fallback;
const status = (value, fallback = 'Active') => typeof value === 'boolean' ? (value ? 'Active' : 'Inactive') : String(value || fallback).replace(/^./, (letter) => letter.toUpperCase());
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'A';
const money = (value) => Number(String(value ?? '').replace(/[^0-9.-]/g, '')) || 0;
const formatAmount = (amount) => amount > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount) : '—';

export const getFileUrl = (path) => {
  if (!path) return null;

  const cleanPath = String(path).trim();

  if (!cleanPath) return null;

  if (
    cleanPath.startsWith('http://') ||
    cleanPath.startsWith('https://') ||
    cleanPath.startsWith('blob:') ||
    cleanPath.startsWith('data:')
  ) {
    return cleanPath;
  }

  const normalizedPath = cleanPath
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

  const rawBase = (
    import.meta.env.VITE_API_BASE_URL ||
    'https://fusiontecsoftware.com/sivels/api'
  ).replace(/\/+$/, '');

  // Remove API route prefix for static uploaded files
  const staticBase = rawBase.replace(/\/api$/i, '');

  return `${staticBase}/${normalizedPath}`;
};

export const getAadhaarPath = (record) =>
  read(record, [
    'aadhaarDocumentPath',
    'AadhaarDocumentPath',
    'aadharDocumentPath',
    'AadharDocumentPath',
    'aadhaarPath',
    'AadhaarPath',
    'aadharPath',
    'AadharPath',
    'aadhaarCardPath',
    'AadhaarCardPath',
  ]);

export const getPanPath = (record) =>
  read(record, [
    'panCardPath',
    'PanCardPath',
    'panDocumentPath',
    'PanDocumentPath',
    'panPath',
    'PanPath',
  ]);

export const getProfilePath = (record) =>
  read(record, [
    'profileImagePath',
    'ProfileImagePath',
    'profilePath',
    'ProfilePath',
    'profileImage',
    'ProfileImage',
    'profilePicturePath',
    'ProfilePicturePath',
  ]);

export const isPdfFile = (urlOrPath = '') => {
  if (!urlOrPath) return false;
  return /\.pdf(\?.*)?$/i.test(String(urlOrPath));
};

export const formatDistrictList = (districts) => {
  if (!districts || !Array.isArray(districts) || districts.length === 0) {
    return 'No districts assigned';
  }
  const names = districts
    .map((d) => {
      if (typeof d === 'string') return d.trim();
      if (typeof d === 'object' && d !== null) {
        return (d.districtName || d.name || d.district || `District #${d.districtId || ''}`).trim();
      }
      return String(d || '').trim();
    })
    .filter(Boolean);

  return names.length > 0 ? names.join(', ') : 'No districts assigned';
};

const formatDob = (dob) => {
  if (!dob) return '—';
  try {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return String(dob).slice(0, 10);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(dob);
  }
};

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
  const [amsList, setAmsList] = useState([]);
  const [query, setQuery] = useState('');
  const [applicationQuery, setApplicationQuery] = useState('');
  const [applicationStatusFilter, setApplicationStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedAms, setSelectedAms] = useState(null);
  const [loadingAmsModal, setLoadingAmsModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = authHeaders();
      const [agentResult, applicationResult, rmResult, amsResult] = await Promise.allSettled([
        fetch(`${API_BASE}/AgentMaster`, { headers }).then((response) => response.ok ? response.json() : Promise.reject(new Error('Agents request failed'))),
        fetch(`${API_BASE}/AgentAddCustomer`, { headers }).then((response) => response.ok ? response.json() : Promise.reject(new Error('Applications request failed'))),
        fetch(`${API_BASE}/RMMaster`, { headers }).then((response) => response.ok ? response.json() : Promise.reject(new Error('RM request failed'))),
        fetch(`${API_BASE}/AMSMaster`, { headers }).then((response) => response.ok ? response.json() : Promise.reject(new Error('AMS request failed'))),
      ]);

      if ([agentResult, applicationResult, rmResult, amsResult].some((result) => result.status === 'rejected')) {
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

      const amsRows = amsResult.status === 'fulfilled' ? unwrap(amsResult.value) : [];
      const liveAms = amsRows.map((item) => {
        const id = read(item, ['amsId', 'AmsId', 'id']);
        return {
          id,
          amsId: id,
          amsCode: read(item, ['amsCode', 'AmsCode', 'code']),
          fullName: read(item, ['fullName', 'FullName', 'name'], 'Unnamed AMS'),
          genderId: item.genderId ?? item.GenderId,
          genderName: read(item, ['genderName', 'GenderName', 'gender', 'Gender']),
          dateOfBirth: read(item, ['dateOfBirth', 'DateOfBirth', 'dob']),
          address: read(item, ['address', 'Address']),
          stateId: item.stateId ?? item.StateId,
          stateName: read(item, ['stateName', 'StateName', 'state']),
          cityId: item.cityId ?? item.CityId,
          cityName: read(item, ['cityName', 'CityName', 'city']),
          pincode: read(item, ['pincode', 'Pincode']),
          mobileNumber: read(item, ['mobileNumber', 'MobileNumber', 'phone']),
          emailAddress: read(item, ['emailAddress', 'EmailAddress', 'email']),
          branch: read(item, ['branch', 'Branch', 'branchName']),
          dateJoined: read(item, ['dateJoined', 'DateJoined']),
          isActive: item.isActive ?? item.IsActive ?? true,
          accountNumber: read(item, ['accountNumber', 'AccountNumber']),
          ifscCode: read(item, ['ifscCode', 'IfscCode']),
          aadhaarDocumentPath: getAadhaarPath(item),
          panCardPath: getPanPath(item),
          profileImagePath: getProfilePath(item),
          districtNames: Array.isArray(item.districtNames || item.districts || item.amsDistricts)
            ? item.districtNames || item.districts || item.amsDistricts
            : [],
        };
      }).filter((a) => a.id || a.fullName);

      setAgents(liveAgents);
      setApplications(liveApplications);
      setRms(liveRms);
      setAmsList(liveAms);
      setUpdatedAt(new Date());
    } catch {
      setError('Live dashboard data is unavailable. Check your connection and try again.');
      setAgents([]);
      setApplications([]);
      setRms([]);
      setAmsList([]);
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

  // 5 Stats Cards: RM, Agents, AMS, Applications, Approved Amount
  const stats = [
    [Users, 'green', 'Relationship managers', rms.length, 'Live RM master'],
    [BriefcaseBusiness, 'blue', 'Total agents', agents.length, 'Live agent master'],
    [ShieldCheck, 'teal', 'Total AMS', amsList.length, 'Live AMS master'],
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

  const handleOpenAmsDetails = async (ams) => {
    setSelectedAms(ams);
    setLoadingAmsModal(true);
    try {
      const targetId = ams.id || ams.amsId || ams.AmsId;
      if (targetId) {
        const [fullDataResult, districtDataResult] = await Promise.allSettled([
          getAMSById(targetId),
          getAMSDistrictsByAmsId(targetId),
        ]);

        const fullData = fullDataResult.status === 'fulfilled' ? fullDataResult.value : null;
        const record = Array.isArray(fullData) ? fullData[0] : (fullData?.data || fullData?.value?.[0] || fullData);

        let mappedDistricts = [];
        if (districtDataResult.status === 'fulfilled' && districtDataResult.value) {
          const rawDistricts = districtDataResult.value;
          mappedDistricts = Array.isArray(rawDistricts)
            ? rawDistricts
            : (rawDistricts?.data || rawDistricts?.value || []);
        }

        setSelectedAms((prev) => {
          const currentRecord = record || {};
          const fallbackDistricts = Array.isArray(currentRecord.districtNames || currentRecord.districts || currentRecord.amsDistricts)
            ? currentRecord.districtNames || currentRecord.districts || currentRecord.amsDistricts
            : (prev?.districts || prev?.districtNames || []);

          const finalDistricts = mappedDistricts.length > 0 ? mappedDistricts : fallbackDistricts;

          return {
            ...prev,
            ...currentRecord,
            id: currentRecord.amsId || currentRecord.id || prev.id,
            fullName: currentRecord.fullName || prev.fullName,
            amsCode: currentRecord.amsCode || prev.amsCode,
            genderName: currentRecord.genderName || prev.genderName,
            stateName: currentRecord.stateName || prev.stateName,
            cityName: currentRecord.cityName || prev.cityName,
            branch: currentRecord.branch || prev.branch,
            accountNumber: currentRecord.accountNumber || prev.accountNumber,
            ifscCode: currentRecord.ifscCode || prev.ifscCode,
            aadhaarDocumentPath: getAadhaarPath(currentRecord) || prev.aadhaarDocumentPath,
            panCardPath: getPanPath(currentRecord) || prev.panCardPath,
            profileImagePath: getProfilePath(currentRecord) || prev.profileImagePath,
            districts: finalDistricts,
            districtNames: finalDistricts,
          };
        });
      }
    } catch (err) {
      console.error('Failed to load full AMS details:', err);
    } finally {
      setLoadingAmsModal(false);
    }
  };

  const handlePreviewDocument = (title, rawPath) => {
    if (!rawPath) return;
    const fullUrl = getFileUrl(rawPath);
    if (!fullUrl) return;
    const isPdf = isPdfFile(fullUrl) || isPdfFile(rawPath);
    setPreviewDoc({
      title,
      name: title,
      url: fullUrl,
      rawPath,
      isPdf,
    });
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

      {/* 5 Top Summary Cards */}
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

      {/* Applications Table */}
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

      {/* Agents Table */}
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

      {/* Bottom Grid: Relationship Managers & Area Management Specialists */}
      <section className="bottom-grid">
        {/* Left: Relationship Managers */}
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

        {/* Right: Area Management Specialists */}
        <div className="content-card">
          <div className="card-heading">
            <div>
              <h2>Area Management Specialists</h2>
              <p>Select an AMS to view their complete details.</p>
            </div>
            <ShieldCheck size={20} className="heading-icon" />
          </div>
          {loading ? (
            <p className="loading-line">Loading Area Management Specialists…</p>
          ) : amsList.length ? (
            <div className="coverage-list ams-list">
              {amsList.map((ams) => {
                const displayName = ams.fullName || 'Unnamed AMS';
                const genderLabel = ams.genderName || (ams.genderId === 1 ? 'Male' : ams.genderId === 2 ? 'Female' : ams.genderId === 3 ? 'Other' : '');
                const profileUrl = getFileUrl(getProfilePath(ams));

                return (
                  <div className="ams-row-wrap" key={ams.id || ams.amsCode || displayName}>
                    <div className="ams-row-left">
                      {profileUrl ? (
                        <img
                          src={profileUrl}
                          alt={displayName}
                          className="ams-row-avatar-img"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const next = e.currentTarget.nextElementSibling;
                            if (next) next.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`rm-avatar ams-avatar ${profileUrl ? 'hidden' : ''}`}>
                        {initials(displayName)}
                      </div>
                      <div className="ams-row-info">
                        <strong>{displayName}</strong>
                        <span>{genderLabel || 'Specialist'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="details-button"
                      onClick={() => handleOpenAmsDetails(ams)}
                    >
                      <Eye size={14} /> View
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="loading-line">No Area Management Specialists found.</p>
          )}
        </div>
      </section>

      {/* RM / Agent Details Modal */}
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

      {/* Application Details Modal */}
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

      {/* AMS Full Details Modal */}
      {selectedAms && (
        <div
          className="person-dialog-backdrop"
          role="presentation"
          onMouseDown={() => setSelectedAms(null)}
        >
          <section
            className="person-dialog ams-details-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Area Management Specialist details"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="person-dialog-close"
              onClick={() => setSelectedAms(null)}
              aria-label="Close AMS details"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="ams-modal-header">
              {getFileUrl(getProfilePath(selectedAms) || selectedAms.profileImagePath) ? (
                <img
                  src={getFileUrl(getProfilePath(selectedAms) || selectedAms.profileImagePath)}
                  alt={selectedAms.fullName}
                  className="ams-modal-avatar-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const next = e.currentTarget.nextElementSibling;
                    if (next) next.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`person-dialog-avatar ams-modal-avatar ${getFileUrl(getProfilePath(selectedAms) || selectedAms.profileImagePath) ? 'hidden' : ''}`}>
                {initials(selectedAms.fullName)}
              </div>
              <div className="ams-modal-title-block">
                <span className="eyebrow">AREA MANAGEMENT SPECIALIST</span>
                <h2>{selectedAms.fullName}</h2>
                <div className="ams-badge-row">
                  {selectedAms.amsCode && (
                    <span className="ams-code-badge">Code: {selectedAms.amsCode}</span>
                  )}
                  <span className={`status ${selectedAms.isActive !== false ? 'active' : 'inactive'}`}>
                    {selectedAms.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {loadingAmsModal ? (
              <p className="loading-line">Loading details…</p>
            ) : (
              <div className="ams-modal-scrollable">
                {/* Personal Information */}
                <div className="ams-modal-section">
                  <h3 className="ams-section-title">Personal Information</h3>
                  <dl className="person-detail-grid">
                    <div>
                      <dt>Full Name</dt>
                      <dd>{selectedAms.fullName || '—'}</dd>
                    </div>
                    <div>
                      <dt>AMS Code</dt>
                      <dd>{selectedAms.amsCode || '—'}</dd>
                    </div>
                    <div>
                      <dt>Date of Birth</dt>
                      <dd>{formatDob(selectedAms.dateOfBirth)}</dd>
                    </div>
                    <div>
                      <dt>Gender</dt>
                      <dd>
                        {selectedAms.genderName ||
                          (selectedAms.genderId === 1
                            ? 'Male'
                            : selectedAms.genderId === 2
                            ? 'Female'
                            : selectedAms.genderId === 3
                            ? 'Other'
                            : '—')}
                      </dd>
                    </div>
                    <div>
                      <dt>Mobile Number</dt>
                      <dd>{selectedAms.mobileNumber || '—'}</dd>
                    </div>
                    <div>
                      <dt>Email Address</dt>
                      <dd>{selectedAms.emailAddress || '—'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Location Information */}
                <div className="ams-modal-section">
                  <h3 className="ams-section-title">Location Information</h3>
                  <dl className="person-detail-grid">
                    <div className="full-width">
                      <dt>Address</dt>
                      <dd>{selectedAms.address || '—'}</dd>
                    </div>
                    <div>
                      <dt>State</dt>
                      <dd>{selectedAms.stateName || (selectedAms.stateId ? `State ID: ${selectedAms.stateId}` : '—')}</dd>
                    </div>
                    <div>
                      <dt>City</dt>
                      <dd>{selectedAms.cityName || (selectedAms.cityId ? `City ID: ${selectedAms.cityId}` : '—')}</dd>
                    </div>
                    <div>
                      <dt>Pincode</dt>
                      <dd>{selectedAms.pincode || '—'}</dd>
                    </div>
                    <div>
                      <dt>Branch</dt>
                      <dd>{selectedAms.branch || '—'}</dd>
                    </div>
                    <div className="full-width">
                      <dt>Districts</dt>
                      <dd>
                        {formatDistrictList(selectedAms.districts || selectedAms.districtNames)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Employment & Banking */}
                <div className="ams-modal-section">
                  <h3 className="ams-section-title">Employment & Banking</h3>
                  <dl className="person-detail-grid">
                    <div>
                      <dt>Date Joined</dt>
                      <dd>{formatDateTimeFriendly(selectedAms.dateJoined) || '—'}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{selectedAms.isActive !== false ? 'Active' : 'Inactive'}</dd>
                    </div>
                    <div>
                      <dt>Account Number</dt>
                      <dd>{selectedAms.accountNumber || '—'}</dd>
                    </div>
                    <div>
                      <dt>IFSC Code</dt>
                      <dd>{selectedAms.ifscCode || '—'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Assigned Districts (if available) */}
                {((selectedAms.districts && selectedAms.districts.length > 0) || (selectedAms.districtNames && selectedAms.districtNames.length > 0)) && (
                  <div className="ams-modal-section">
                    <h3 className="ams-section-title">Assigned Districts</h3>
                    <div className="ams-district-pills">
                      {(selectedAms.districts || selectedAms.districtNames).map((d, i) => (
                        <span key={d.districtId || i} className="ams-summary-pill">
                          {typeof d === 'string' ? d : d.districtName || d.name || `District #${d.districtId || i}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents Section */}
                <div className="ams-modal-section">
                  <h3 className="ams-section-title">Documents</h3>
                  <div className="ams-doc-links-grid">
                    {/* Aadhaar Card */}
                    <div className="ams-doc-card">
                      <div className="ams-doc-card-info">
                        <FileText size={18} className="ams-doc-icon" />
                        <div>
                          <strong>Aadhaar Card</strong>
                          <small>
                            {getAadhaarPath(selectedAms) || selectedAms.aadhaarDocumentPath
                              ? 'Document uploaded'
                              : 'No document uploaded'}
                          </small>
                        </div>
                      </div>
                      {(getAadhaarPath(selectedAms) || selectedAms.aadhaarDocumentPath) ? (
                        <button
                          type="button"
                          className="details-button"
                          onClick={() =>
                            handlePreviewDocument(
                              'Aadhaar Card',
                              getAadhaarPath(selectedAms) || selectedAms.aadhaarDocumentPath
                            )
                          }
                        >
                          <Eye size={14} /> View Document
                        </button>
                      ) : (
                        <span className="ams-doc-missing">Unavailable</span>
                      )}
                    </div>

                    {/* PAN Card */}
                    <div className="ams-doc-card">
                      <div className="ams-doc-card-info">
                        <FileText size={18} className="ams-doc-icon" />
                        <div>
                          <strong>PAN Card</strong>
                          <small>
                            {getPanPath(selectedAms) || selectedAms.panCardPath
                              ? 'Document uploaded'
                              : 'No document uploaded'}
                          </small>
                        </div>
                      </div>
                      {(getPanPath(selectedAms) || selectedAms.panCardPath) ? (
                        <button
                          type="button"
                          className="details-button"
                          onClick={() =>
                            handlePreviewDocument(
                              'PAN Card',
                              getPanPath(selectedAms) || selectedAms.panCardPath
                            )
                          }
                        >
                          <Eye size={14} /> View Document
                        </button>
                      ) : (
                        <span className="ams-doc-missing">Unavailable</span>
                      )}
                    </div>

                    {/* Profile Image */}
                    {(getProfilePath(selectedAms) || selectedAms.profileImagePath) && (
                      <div className="ams-doc-card">
                        <div className="ams-doc-card-info">
                          <Camera size={18} className="ams-doc-icon" />
                          <div>
                            <strong>Profile Image</strong>
                            <small>Photograph uploaded</small>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="details-button"
                          onClick={() =>
                            handlePreviewDocument(
                              'Profile Image',
                              getProfilePath(selectedAms) || selectedAms.profileImagePath
                            )
                          }
                        >
                          <Eye size={14} /> View Image
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="person-dialog-actions">
              <button className="masters-btn-secondary" onClick={() => setSelectedAms(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Dedicated Document / Image Preview Lightbox */}
      {previewDoc && (
        <div
          className="ams-doc-preview-backdrop"
          role="presentation"
          onMouseDown={() => setPreviewDoc(null)}
        >
          <div
            className="ams-doc-preview-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={previewDoc.title || 'Document Preview'}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="ams-doc-preview-header">
              <h3>
                {previewDoc.isPdf ? <FileText size={18} /> : <Camera size={18} />}
                {previewDoc.title || 'Document Preview'}
              </h3>
              <div className="ams-doc-preview-header-actions">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ams-doc-newtab-btn"
                  title="Open in new window or tab"
                >
                  <ArrowUpRight size={14} /> Open in New Tab
                </a>
                <button
                  type="button"
                  className="ams-doc-preview-close"
                  onClick={() => setPreviewDoc(null)}
                  aria-label="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="ams-doc-preview-body">
              {previewDoc.isPdf ? (
                <div className="ams-doc-iframe-container">
                  <iframe
                    src={previewDoc.url}
                    title={previewDoc.title || 'PDF Preview'}
                    className="ams-doc-iframe"
                  />
                  <div className="ams-doc-fallback-bar">
                    <span>Trouble viewing PDF?</span>
                    <a
                      href={previewDoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ams-doc-newtab-btn"
                    >
                      <ArrowUpRight size={13} /> Open in new tab
                    </a>
                  </div>
                </div>
              ) : (
                <div className="ams-doc-image-container">
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.title || 'Preview'}
                    className="ams-doc-image"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const errBox = document.getElementById('ams-doc-img-error');
                      if (errBox) errBox.style.display = 'flex';
                    }}
                  />
                  <div id="ams-doc-img-error" className="ams-doc-error-box" style={{ display: 'none' }}>
                    <p>Unable to load image preview directly.</p>
                    <a
                      href={previewDoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ams-doc-newtab-btn"
                    >
                      <ArrowUpRight size={14} /> Open Image in New Tab
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
