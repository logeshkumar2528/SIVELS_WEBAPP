import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Coins,
  Eye,
  FileClock,
  Filter,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPinned,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  UserRound,
  X,
  Building2,
  Phone,
  Mail,
} from 'lucide-react';
import logoImg from '../../../../Core/Logo_img/Logo.png';
import { getAMSById, getAMSDistrictsByAmsId } from '../../api/amsApi';
import { getAllRelationshipManagers } from '../../api/rmApi';
import { getAllAgents } from '../../api/agentApi';
import { agentCustomerService } from '../../../../Core/src/services/agentCustomerService';
import axiosInstance from '../../api/axiosInstance';
import './AMSDashboard.css';

const unwrap = (response) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.value)) return response.value;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const read = (record, keys, fallback = '') =>
  keys.map((key) => record?.[key]).find((value) => value !== undefined && value !== null && value !== '') ?? fallback;

const initials = (name = '') =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'AM';

const formatMoney = (amount) => {
  const num = Number(amount) || 0;
  if (num === 0) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

const formatMoneyShort = (amount) => {
  const num = Number(amount) || 0;
  if (num === 0) return '₹0';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}k`;
  return `₹${num}`;
};

const normalizeStatus = (value, statusName = '') => {
  const named = String(statusName || '').trim().toLowerCase();
  if (named.includes('approved') || named.includes('disburs')) return 'Approved';
  if (named.includes('returned') || named.includes('reject')) return 'Rejected';
  if (named.includes('review')) return 'Under Review';
  if (named.includes('pending') || named.includes('progress')) return 'Pending';
  if (named.includes('new') || named.includes('draft')) return 'New';

  const numeric = Number(value);
  if (numeric === 2) return 'Approved';
  if (numeric === 1) return 'Pending';
  if (numeric === 0) return 'New';
  if (numeric === 3) return 'Rejected';

  const raw = String(value || '').trim();
  if (!raw || raw.toLowerCase() === 'draft') return 'New';
  return raw.replace(/^./, (letter) => letter.toUpperCase());
};

const getLoggedInAmsInfo = () => {
  try {
    const user = JSON.parse(localStorage.getItem('sivels_currentUser') || '{}');
    const amsData = JSON.parse(localStorage.getItem('amsData') || '{}');
    const amsId = user?.amsId || user?.id || user?.AmsId || amsData?.amsId || amsData?.id || null;
    const fullName = user?.fullName || user?.name || amsData?.fullName || 'AMS Officer';
    const amsCode = user?.amsCode || amsData?.amsCode || (amsId ? `AMS${String(amsId).padStart(4, '0')}` : 'AMS0001');
    const mobileNumber = user?.mobileNumber || user?.phone || amsData?.mobileNumber || '';
    const emailAddress = user?.emailAddress || user?.email || amsData?.emailAddress || '';
    const branch = user?.branch || amsData?.branch || '';
    return { amsId, fullName, amsCode, mobileNumber, emailAddress, branch };
  } catch {
    return { amsId: null, fullName: 'AMS Officer', amsCode: 'AMS0001', mobileNumber: '', emailAddress: '', branch: '' };
  }
};

export default function AMSDashboard() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');
  const [lastUpdated, setLastUpdated] = useState('Just now');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('overview');

  // Raw API State
  const [amsProfile, setAmsProfile] = useState(null);
  const [rawDistricts, setRawDistricts] = useState([]);
  const [rawRms, setRawRms] = useState([]);
  const [rawAgents, setRawAgents] = useState([]);
  const [rawApplications, setRawApplications] = useState([]);

  // UI Filter State
  const [selectedDistrictId, setSelectedDistrictId] = useState(null);
  const [selectedRmId, setSelectedRmId] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedAgent, setSelectedAgent] = useState(null);

  const sessionUser = useMemo(() => getLoggedInAmsInfo(), []);
  const currentAmsId = sessionUser.amsId;

  const loadDashboardData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorNotice('');

    try {
      const requests = [
        // 1. AMS District Mapping
        currentAmsId
          ? getAMSDistrictsByAmsId(currentAmsId).catch(() => [])
          : Promise.resolve([]),
        // 2. All Relationship Managers
        getAllRelationshipManagers().catch(() =>
          axiosInstance.get('/RMMaster').then((r) => r.data).catch(() => [])
        ),
        // 3. All Agents
        getAllAgents().catch(() =>
          axiosInstance.get('/AgentMaster').then((r) => r.data).catch(() => [])
        ),
        // 4. All Customers / Loan Applications
        agentCustomerService.getAllCustomers().catch(() =>
          axiosInstance.get('/AgentAddCustomer').then((r) => r.data).catch(() => [])
        ),
        // 5. AMS Detailed Profile (if ID exists)
        currentAmsId
          ? getAMSById(currentAmsId).catch(() => null)
          : Promise.resolve(null),
      ];

      const [districtRes, rmRes, agentRes, appRes, profileRes] = await Promise.allSettled(requests);

      let hasRejection = false;
      if (districtRes.status === 'rejected' || rmRes.status === 'rejected') {
        hasRejection = true;
      }

      // Process districts
      const districtData = districtRes.status === 'fulfilled' ? unwrap(districtRes.value) : [];
      setRawDistricts(districtData);

      // Process RMs
      const rmData = rmRes.status === 'fulfilled' ? unwrap(rmRes.value) : [];
      setRawRms(rmData);

      // Process Agents
      const agentData = agentRes.status === 'fulfilled' ? unwrap(agentRes.value) : [];
      setRawAgents(agentData);

      // Process Applications
      const appData = appRes.status === 'fulfilled' ? unwrap(appRes.value) : [];
      setRawApplications(appData);

      // Process Profile
      if (profileRes.status === 'fulfilled' && profileRes.value) {
        setAmsProfile(profileRes.value);
      }

      if (hasRejection) {
        setErrorNotice('Some live monitoring records could not be synchronized. Available data is shown below.');
      }

      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Failed to load AMS dashboard data:', err);
      setErrorNotice('Failed to synchronize dashboard with server. Please try refreshing.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentAmsId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // AMS Identity Details
  const amsName = amsProfile?.fullName || amsProfile?.name || sessionUser.fullName || 'AMS Officer';
  const amsFirstName = amsName.split(' ')[0] || 'User';
  const amsCode = amsProfile?.amsCode || amsProfile?.code || sessionUser.amsCode || 'AMS0001';

  // Normalize Applications
  const liveApplications = useMemo(() => {
    return rawApplications.map((c) => {
      const id = read(c, ['agentCustomerId', 'AgentCustomerId', 'applicationId', 'id']);
      const agentId = Number(read(c, ['agentId', 'AgentId', 'createdBy']));
      const customerName = read(c, ['fullName', 'customerName', 'FullName', 'name'], 'Unnamed Customer');
      const mobile = read(c, ['mobileNumber', 'MobileNumber', 'mobile', 'phone'], '—');
      const email = read(c, ['email', 'emailAddress', 'Email'], '—');
      const employmentType = read(c, ['employmentTypeName', 'EmploymentTypeName', 'employmentType'], '—');
      const loanPurpose = read(c, ['loanPurposeName', 'LoanPurposeName', 'loanType', 'purpose'], 'General');
      const rawAmount = read(c, ['expectedLoanAmount', 'ExpectedLoanAmount', 'loanAmount', 'disbursedAmount', 'requestedAmount'], 0);
      const amount = Number(String(rawAmount).replace(/[^0-9.-]/g, '')) || 0;
      const status = normalizeStatus(
        read(c, ['status', 'applicationStatus', 'ApplicationStatus']),
        read(c, ['statusName', 'StatusName'])
      );
      const createdAt = read(c, ['createdAt', 'CreatedAt', 'createdDate', 'dateJoined']);

      return {
        id,
        agentId,
        customerName,
        mobile,
        email,
        employmentType,
        loanPurpose,
        amount,
        status,
        createdAt: createdAt ? String(createdAt).slice(0, 10) : '—',
      };
    }).filter((c) => c.id);
  }, [rawApplications]);

  // Normalize Agents
  const liveAgents = useMemo(() => {
    return rawAgents.map((ag) => {
      const id = Number(read(ag, ['agentId', 'AgentId', 'id']));
      const rmId = Number(read(ag, ['rmId', 'RMId', 'relationshipManagerId', 'RelationshipManagerId', 'createdBy']));
      const name = read(ag, ['fullName', 'agentName', 'name'], 'Unnamed Agent');
      const code = read(ag, ['agentCode', 'AgentCode', 'code'], `AG${id || '000'}`);
      const rmName = read(ag, ['rmName', 'RMName', 'relationshipManager'], 'Unassigned RM');
      const branch = read(ag, ['branch', 'Branch', 'branchName'], '—');
      const mobile = read(ag, ['mobileNumber', 'MobileNumber', 'phone'], '—');
      const email = read(ag, ['emailAddress', 'EmailAddress', 'email'], '—');
      const isActive = ag.isActive ?? ag.IsActive ?? true;

      return {
        id,
        agentId: id,
        rmId,
        name,
        code,
        rmName,
        branch,
        mobile,
        email,
        isActive,
        status: isActive ? 'Active' : 'Inactive',
      };
    }).filter((ag) => ag.id);
  }, [rawAgents]);

  // Normalize RMs
  const liveRms = useMemo(() => {
    return rawRms.map((rm) => {
      const id = Number(read(rm, ['rmId', 'RMId', 'id']));
      const code = read(rm, ['rmCode', 'RMCode', 'code'], `RM${id || '000'}`);
      const name = read(rm, ['fullName', 'rmName', 'RMName', 'name']) || `${read(rm, ['firstName'])} ${read(rm, ['lastName'])}`.trim() || 'Unnamed RM';
      const districtId = Number(read(rm, ['districtId', 'DistrictId', 'districtID']));
      const districtName = read(rm, ['districtName', 'DistrictName', 'district'], '');
      const amsId = read(rm, ['amsId', 'AmsId', 'amsID']);
      const branch = read(rm, ['branch', 'Branch', 'branchName'], '—');
      const mobile = read(rm, ['mobileNumber', 'MobileNumber', 'phone'], '—');
      const email = read(rm, ['emailAddress', 'EmailAddress', 'email'], '—');
      const isActive = rm.isActive ?? rm.IsActive ?? true;

      return {
        id,
        rmId: id,
        code,
        name,
        districtId,
        districtName,
        amsId: amsId ? Number(amsId) : null,
        branch,
        mobile,
        email,
        isActive,
      };
    }).filter((rm) => rm.id);
  }, [rawRms]);

  // Normalize Assigned Districts
  const liveDistricts = useMemo(() => {
    return rawDistricts.map((d) => {
      const id = Number(read(d, ['districtId', 'DistrictId', 'id']));
      const name = read(d, ['districtName', 'DistrictName', 'name'], `District #${id}`);
      return {
        id: String(id),
        districtId: id,
        name,
      };
    }).filter((d) => d.districtId);
  }, [rawDistricts]);

  // Build Central Scoped Hierarchy via useMemo
  const {
    assignedDistrictsWithData,
    assignedRmsWithData,
    assignedAgentsWithData,
    totals,
    rmsNeedingReview,
  } = useMemo(() => {
    const assignedDistrictIds = new Set(liveDistricts.map((d) => Number(d.districtId)));

    // 1. Scoped RMs (Belonging to AMS districts OR directly mapped to amsId)
    const scopedRms = liveRms.filter((rm) =>
      (rm.districtId && assignedDistrictIds.has(Number(rm.districtId))) ||
      (currentAmsId && Number(rm.amsId) === Number(currentAmsId))
    );
    const scopedRmIds = new Set(scopedRms.map((rm) => Number(rm.id)));

    // 2. Scoped Agents (Belonging to scoped RMs)
    const scopedAgents = liveAgents.filter((ag) => scopedRmIds.has(Number(ag.rmId)));
    const scopedAgentIds = new Set(scopedAgents.map((ag) => Number(ag.id)));

    // 3. Scoped Customers (Belonging to scoped Agents)
    const scopedCustomers = liveApplications.filter((c) => scopedAgentIds.has(Number(c.agentId)));

    // 4. Index customers by agentId
    const customersByAgent = new Map();
    scopedCustomers.forEach((c) => {
      const list = customersByAgent.get(Number(c.agentId)) || [];
      list.push(c);
      customersByAgent.set(Number(c.agentId), list);
    });

    // 5. Enrich Agents
    const enrichedAgents = scopedAgents.map((ag) => {
      const custs = customersByAgent.get(Number(ag.id)) || [];
      const totalCustomers = custs.length;
      const pendingCustomers = custs.filter((c) => c.status === 'Pending' || c.status === 'Under Review').length;
      const approvedCustomers = custs.filter((c) => c.status === 'Approved').length;
      const rejectedCustomers = custs.filter((c) => c.status === 'Rejected').length;
      const newCustomers = custs.filter((c) => c.status === 'New').length;
      const totalExpectedLoanAmount = custs.reduce((sum, c) => sum + (c.amount || 0), 0);

      return {
        ...ag,
        totalCustomers,
        pendingCustomers,
        approvedCustomers,
        rejectedCustomers,
        newCustomers,
        totalExpectedLoanAmount,
        customerList: custs,
      };
    });

    // 6. Index enriched agents by rmId
    const agentsByRm = new Map();
    enrichedAgents.forEach((ag) => {
      const list = agentsByRm.get(Number(ag.rmId)) || [];
      list.push(ag);
      agentsByRm.set(Number(ag.rmId), list);
    });

    // 7. Enrich RMs
    const enrichedRms = scopedRms.map((rm) => {
      const agList = agentsByRm.get(Number(rm.id)) || [];
      const totalAgents = agList.length;
      const totalCustomers = agList.reduce((sum, ag) => sum + ag.totalCustomers, 0);
      const pendingCustomers = agList.reduce((sum, ag) => sum + ag.pendingCustomers, 0);
      const approvedCustomers = agList.reduce((sum, ag) => sum + ag.approvedCustomers, 0);
      const rejectedCustomers = agList.reduce((sum, ag) => sum + ag.rejectedCustomers, 0);
      const totalExpectedLoanAmount = agList.reduce((sum, ag) => sum + ag.totalExpectedLoanAmount, 0);
      const status = pendingCustomers > 5 ? 'Needs review' : 'On track';

      return {
        ...rm,
        totalAgents,
        totalCustomers,
        pendingCustomers,
        approvedCustomers,
        rejectedCustomers,
        totalExpectedLoanAmount,
        agentList: agList,
        status,
        lastActive: 'Active today',
      };
    });

    // 8. Index enriched RMs by districtId
    const rmsByDistrict = new Map();
    enrichedRms.forEach((rm) => {
      const dId = Number(rm.districtId);
      const list = rmsByDistrict.get(dId) || [];
      list.push(rm);
      rmsByDistrict.set(dId, list);
    });

    // 9. Enrich Districts
    const enrichedDistricts = liveDistricts.map((dist) => {
      const mgrs = rmsByDistrict.get(Number(dist.districtId)) || [];
      const rmsCount = mgrs.length;
      const agentsCount = mgrs.reduce((sum, rm) => sum + rm.totalAgents, 0);
      const applicationsCount = mgrs.reduce((sum, rm) => sum + rm.totalCustomers, 0);
      const pendingCount = mgrs.reduce((sum, rm) => sum + rm.pendingCustomers, 0);
      const approvedCount = mgrs.reduce((sum, rm) => sum + rm.approvedCustomers, 0);
      const rejectedCount = mgrs.reduce((sum, rm) => sum + rm.rejectedCustomers, 0);
      const totalExpectedLoanAmount = mgrs.reduce((sum, rm) => sum + rm.totalExpectedLoanAmount, 0);
      const progressPercent = applicationsCount > 0 ? Math.min(100, Math.round(((applicationsCount - pendingCount) / applicationsCount) * 100)) : 0;

      return {
        ...dist,
        rmsCount,
        agentsCount,
        applicationsCount,
        pendingCount,
        approvedCount,
        rejectedCount,
        totalExpectedLoanAmount,
        progressPercent,
        managers: mgrs,
        lastSync: 'Live sync',
      };
    });

    // 10. Global Totals
    const calculatedTotals = {
      districts: enrichedDistricts.length,
      rms: enrichedRms.length,
      agents: enrichedAgents.length,
      applications: scopedCustomers.length,
      pending: enrichedDistricts.reduce((sum, d) => sum + d.pendingCount, 0),
      approved: enrichedDistricts.reduce((sum, d) => sum + d.approvedCount, 0),
      rejected: enrichedDistricts.reduce((sum, d) => sum + d.rejectedCount, 0),
      totalExpectedLoanAmount: enrichedDistricts.reduce((sum, d) => sum + d.totalExpectedLoanAmount, 0),
    };

    const reviewRms = enrichedRms.filter((r) => r.status === 'Needs review');

    return {
      assignedDistrictsWithData: enrichedDistricts,
      assignedRmsWithData: enrichedRms,
      assignedAgentsWithData: enrichedAgents,
      totals: calculatedTotals,
      rmsNeedingReview: reviewRms,
    };
  }, [liveDistricts, liveRms, liveAgents, liveApplications, currentAmsId]);

  // Set default selected district if not selected
  useEffect(() => {
    if (!selectedDistrictId && assignedDistrictsWithData.length > 0) {
      setSelectedDistrictId(assignedDistrictsWithData[0].id);
    }
  }, [assignedDistrictsWithData, selectedDistrictId]);

  const selectedDistrict =
    assignedDistrictsWithData.find((d) => d.id === selectedDistrictId) ||
    assignedDistrictsWithData[0] ||
    null;

  const selectedRm =
    selectedDistrict?.managers.find((rm) => rm.id === selectedRmId) ||
    assignedRmsWithData.find((rm) => rm.id === selectedRmId) ||
    null;

  const visibleManagers = useMemo(() => {
    if (!selectedDistrict) return [];
    return selectedDistrict.managers.filter((rm) => {
      const matchesQuery = `${rm.name} ${rm.code} ${rm.branch}`.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === 'All' || rm.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, selectedDistrict, statusFilter]);

  const selectDistrict = (districtId) => {
    setSelectedDistrictId(districtId);
    setSelectedRmId(null);
  };

  const goToView = (view) => {
    setActiveView(view);
    setSidebarOpen(false);
    const target = document.getElementById(`ams-${view}`) || (view === 'applications' ? document.querySelector('.ams-bottom-grid') : null);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="ams-dashboard-shell">
        <div className="ams-dashboard-loading" style={{ width: '100%' }}>
          <Loader2 size={38} className="ams-spin" />
          <p>Loading live AMS monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ams-dashboard-shell">
      {sidebarOpen && (
        <button
          type="button"
          className="ams-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <aside className={`ams-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="ams-sidebar-brand">
          <img src={logoImg} alt="Sivels Finance" />
          <span>
            <strong>SIVELS</strong>
            <small>FINANCE</small>
          </span>
        </div>
        <div className="ams-sidebar-profile">
          <span className="ams-sidebar-avatar">{initials(amsName)}</span>
          <span>
            <strong>{amsName}</strong>
            <small>AMS · {totals.districts} district{totals.districts === 1 ? '' : 's'}</small>
          </span>
        </div>
        <nav className="ams-sidebar-nav" aria-label="AMS dashboard navigation">
          <span className="ams-sidebar-label">MONITORING</span>
          <button
            type="button"
            className={activeView === 'overview' ? 'is-active' : ''}
            onClick={() => goToView('overview')}
          >
            <LayoutDashboard size={17} /> Overview
          </button>
          <button
            type="button"
            className={activeView === 'collections' ? 'is-active' : ''}
            onClick={() => goToView('collections')}
          >
            <Coins size={17} /> Loan Pipeline <b>{totals.pending}</b>
          </button>
          <button
            type="button"
            className={activeView === 'rms' ? 'is-active' : ''}
            onClick={() => goToView('rms')}
          >
            <Users size={17} /> RM monitoring
          </button>
          <button
            type="button"
            className={activeView === 'agents' ? 'is-active' : ''}
            onClick={() => goToView('agents')}
          >
            <UserRound size={17} /> Agent monitoring
          </button>
          <button
            type="button"
            className={activeView === 'applications' ? 'is-active' : ''}
            onClick={() => goToView('applications')}
          >
            <FileClock size={17} /> Application status
          </button>
        </nav>
        <div className="ams-sidebar-bottom">
          <div className="ams-sidebar-scope">
            <ShieldCheck size={16} />
            <span>
              <strong>View-only access</strong>
              <small>No edit or approval actions</small>
            </span>
          </div>
          <button
            type="button"
            className="ams-sidebar-logout"
            onClick={() => {
              localStorage.removeItem('sivels_currentUser');
              localStorage.removeItem('amsData');
              window.location.href = '/login';
            }}
          >
            <LogOut size={17} /> Logout
          </button>
        </div>
      </aside>

      <main className="ams-dashboard-page">
        <button
          type="button"
          className="ams-mobile-menu"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={21} />
        </button>

        {errorNotice && (
          <div className="ams-notice-banner">
            <AlertCircle size={18} />
            <span>{errorNotice}</span>
          </div>
        )}

        <div id="ams-overview">
          <header className="ams-dashboard-hero">
            <div className="ams-dashboard-hero-copy">
              <span className="ams-dashboard-eyebrow">
                <ShieldCheck size={14} /> AMS MONITORING CONSOLE
              </span>
              <h1>Good morning, {amsFirstName}</h1>
              <p>Monitor RM performance, agent activity, and pending work across your assigned districts.</p>
              <div className="ams-scope-line">
                <MapPinned size={15} /> Viewing {totals.districts} assigned district{totals.districts === 1 ? '' : 's'} <span>•</span> View-only access
              </div>
            </div>
            <div className="ams-dashboard-hero-side">
              <div className="ams-account-badge">
                <span className="ams-account-avatar">{initials(amsName)}</span>
                <span>
                  <strong>{amsCode}</strong>
                  <small>Area Management Specialist</small>
                </span>
              </div>
              <button
                type="button"
                className="ams-refresh-button"
                onClick={() => loadDashboardData(true)}
                disabled={isRefreshing}
              >
                <RefreshCw size={16} className={isRefreshing ? 'ams-spin' : ''} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </header>

          <section className="ams-summary-grid">
            <div className="ams-summary-card is-green">
              <div className="ams-summary-icon"><MapPinned size={19} /></div>
              <span>Assigned districts</span>
              <strong>{totals.districts}</strong>
              <small>District-level visibility</small>
            </div>
            <div className="ams-summary-card is-blue">
              <div className="ams-summary-icon"><Users size={19} /></div>
              <span>Relationship managers</span>
              <strong>{totals.rms}</strong>
              <small>Across assigned districts</small>
            </div>
            <div className="ams-summary-card is-orange">
              <div className="ams-summary-icon"><UserRound size={19} /></div>
              <span>Total agents</span>
              <strong>{totals.agents}</strong>
              <small>Mapped under assigned RMs</small>
            </div>
            <div className="ams-summary-card is-red">
              <div className="ams-summary-icon"><AlertCircle size={19} /></div>
              <span>Pending work</span>
              <strong>{totals.pending}</strong>
              <small>Needs attention today</small>
            </div>
          </section>

          <section className="ams-panel">
            <div className="ams-panel-heading">
              <div>
                <span className="ams-section-kicker">DISTRICT OVERVIEW</span>
                <h2>Choose a district to inspect</h2>
                <p>Start at district level, then open an RM to see the agents and workload underneath.</p>
              </div>
              <span className="ams-live-pill"><i /> Live view</span>
            </div>

            {assignedDistrictsWithData.length === 0 ? (
              <div className="ams-empty-card-state">
                No districts are currently mapped to this AMS user.
              </div>
            ) : (
              <div className="ams-district-cards">
                {assignedDistrictsWithData.map((district) => (
                  <button
                    type="button"
                    className={`ams-district-overview ${selectedDistrict?.id === district.id ? 'is-selected' : ''}`}
                    key={district.id}
                    onClick={() => selectDistrict(district.id)}
                  >
                    <div className="ams-district-card-heading">
                      <span className="ams-district-marker"><MapPinned size={16} /></span>
                      <span>
                        <strong>{district.name}</strong>
                        <small>{district.rmsCount} RM{district.rmsCount === 1 ? '' : 's'} assigned</small>
                      </span>
                      <ChevronRight size={17} />
                    </div>
                    <div className="ams-district-metrics">
                      <span><b>{district.rmsCount}</b><small>RMs</small></span>
                      <span><b>{district.agentsCount}</b><small>Agents</small></span>
                      <span className="is-attention"><b>{district.pendingCount}</b><small>Pending</small></span>
                    </div>
                    <div className="ams-mini-progress">
                      <i style={{ width: `${district.progressPercent}%` }} />
                    </div>
                    <small className="ams-district-sync">Synced {district.lastSync}</small>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {selectedDistrict && (
          <section className="ams-panel ams-collection-panel" id="ams-collections">
            <div className="ams-panel-heading">
              <div>
                <span className="ams-section-kicker">LOAN PIPELINE & MONITORING · {selectedDistrict.name.toUpperCase()}</span>
                <h2>District workload & expected pipeline</h2>
                <p>Track loan pipeline volume, approved cases, and pending verifications at a glance.</p>
              </div>
              <Coins size={20} className="ams-heading-icon" />
            </div>
            <div className="ams-collection-overview">
              <div className="ams-collection-total">
                <span>District loan pipeline</span>
                <strong>{formatMoneyShort(selectedDistrict.totalExpectedLoanAmount)}</strong>
                <small>
                  {selectedDistrict.approvedCount} approved · {selectedDistrict.pendingCount} pending review
                </small>
              </div>
              <div className="ams-collection-progress">
                <div className="ams-progress-top">
                  <span>Application progression</span>
                  <strong>{selectedDistrict.progressPercent}%</strong>
                </div>
                <div className="ams-large-progress">
                  <i style={{ width: `${selectedDistrict.progressPercent}%` }} />
                </div>
                <div className="ams-progress-footer">
                  <span>{selectedDistrict.applicationsCount} total cases</span>
                  <span className="is-warning">{selectedDistrict.pendingCount} pending applications</span>
                </div>
              </div>
              <div className="ams-collection-side">
                <span>Expected Pipeline</span>
                <strong>{formatMoneyShort(selectedDistrict.totalExpectedLoanAmount)}</strong>
                <small>Across {selectedDistrict.rmsCount} RM{selectedDistrict.rmsCount === 1 ? '' : 's'}</small>
              </div>
            </div>

            {selectedDistrict.managers.length > 0 && (
              <div className="ams-collection-rm-grid">
                {selectedDistrict.managers.map((rm) => (
                  <button
                    type="button"
                    className="ams-collection-rm-card"
                    key={rm.id}
                    onClick={() => {
                      setSelectedRmId(rm.id);
                      goToView('rms');
                    }}
                  >
                    <div className="ams-collection-rm-top">
                      <span className="ams-person-avatar small">{initials(rm.name)}</span>
                      <span>
                        <strong>{rm.name}</strong>
                        <small>{rm.totalAgents} agents · {rm.pendingCustomers} pending</small>
                      </span>
                      <ChevronRight size={16} />
                    </div>
                    <div className="ams-rm-collection-values">
                      <span><small>Cases</small><b>{rm.totalCustomers}</b></span>
                      <span><small>Approved</small><b className="is-success">{rm.approvedCustomers}</b></span>
                      <span><small>Pending</small><b className="is-warning">{rm.pendingCustomers}</b></span>
                    </div>
                    <div className="ams-mini-progress">
                      <i style={{ width: `${rm.totalCustomers > 0 ? Math.min(100, Math.round(((rm.totalCustomers - rm.pendingCustomers) / rm.totalCustomers) * 100)) : 0}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="ams-panel ams-rm-panel" id="ams-rms">
          <div className="ams-panel-heading ams-table-heading">
            <div>
              <span className="ams-section-kicker">
                {selectedDistrict ? selectedDistrict.name.toUpperCase() : 'DISTRICT'} · RELATIONSHIP MANAGERS
              </span>
              <h2>RM performance and workload</h2>
              <p>View every RM assigned in this district and the agents and customer cases under them.</p>
            </div>
            <div className="ams-table-controls">
              <label className="ams-search">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search RM by name/code"
                />
              </label>
              <label className="ams-filter">
                <Filter size={15} />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option>All</option>
                  <option>On track</option>
                  <option>Needs review</option>
                </select>
              </label>
            </div>
          </div>

          <div className="ams-table-scroll">
            <table className="ams-monitor-table">
              <thead>
                <tr>
                  <th>Relationship manager</th>
                  <th>Branch</th>
                  <th>Agents</th>
                  <th>Applications</th>
                  <th>Pending</th>
                  <th>Loan Pipeline</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {visibleManagers.map((rm) => (
                  <tr key={rm.id} className={selectedRmId === rm.id ? 'is-open' : ''}>
                    <td>
                      <div className="ams-person-cell">
                        <span className="ams-person-avatar">{initials(rm.name)}</span>
                        <span>
                          <strong>{rm.name}</strong>
                          <small>{rm.code} · {rm.status}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <strong>{rm.branch || '—'}</strong>
                    </td>
                    <td>
                      <strong>{rm.totalAgents}</strong>
                      <small className="ams-cell-note">assigned agents</small>
                    </td>
                    <td>
                      <strong>{rm.totalCustomers}</strong>
                      <small className="ams-cell-note">total cases</small>
                    </td>
                    <td>
                      <span className="ams-number-alert">{rm.pendingCustomers}</span>
                      <small className="ams-cell-note">to review</small>
                    </td>
                    <td>
                      <strong className="ams-number-warning">
                        {formatMoneyShort(rm.totalExpectedLoanAmount)}
                      </strong>
                      <small className="ams-cell-note">{rm.approvedCustomers} approved</small>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ams-view-button"
                        onClick={() => setSelectedRmId(selectedRmId === rm.id ? null : rm.id)}
                      >
                        <Eye size={15} /> {selectedRmId === rm.id ? 'Close' : 'View agents'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!visibleManagers.length && (
                  <tr>
                    <td colSpan="7" className="ams-empty-state">
                      {selectedDistrict
                        ? 'No relationship managers found matching your search or filters.'
                        : 'Please choose an assigned district to inspect relationship managers.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedRm && (
          <section className="ams-panel ams-agent-panel" id="ams-agents">
            <div className="ams-panel-heading">
              <div>
                <span className="ams-section-kicker">RM DETAIL · {selectedRm.code}</span>
                <h2>Agents under {selectedRm.name}</h2>
                <p>View applications, pending verification, and loan pipeline for every agent under this RM.</p>
              </div>
              <span className={`ams-status-tag ${selectedRm.status === 'Needs review' ? 'needs-review' : ''}`}>
                {selectedRm.status}
              </span>
            </div>

            <div className="ams-rm-detail-strip">
              <span>
                <small>Total Agents</small>
                <strong>{selectedRm.totalAgents}</strong>
              </span>
              <span>
                <small>Customer Cases</small>
                <strong className="is-success">{selectedRm.totalCustomers}</strong>
              </span>
              <span>
                <small>Pending Cases</small>
                <strong className="is-warning">{selectedRm.pendingCustomers}</strong>
              </span>
              <span>
                <small>Expected Pipeline</small>
                <strong className="is-warning">{formatMoneyShort(selectedRm.totalExpectedLoanAmount)}</strong>
              </span>
            </div>

            {selectedRm.agentList.length === 0 ? (
              <div className="ams-empty-card-state">
                No agents are currently mapped under this Relationship Manager.
              </div>
            ) : (
              <div className="ams-agent-grid">
                {selectedRm.agentList.map((agent) => (
                  <button
                    type="button"
                    className="ams-agent-card"
                    key={agent.id}
                    onClick={() =>
                      setSelectedAgent({
                        ...agent,
                        rm: selectedRm.name,
                        district: selectedDistrict?.name || '',
                      })
                    }
                  >
                    <div className="ams-agent-card-top">
                      <span className="ams-person-avatar small">{initials(agent.name)}</span>
                      <span>
                        <strong>{agent.name}</strong>
                        <small>{agent.code} · {agent.branch || 'Main Branch'}</small>
                      </span>
                      <ChevronRight size={16} />
                    </div>
                    <div className="ams-agent-metrics">
                      <span><b>{agent.totalCustomers}</b><small>Cases</small></span>
                      <span className="is-attention"><b>{agent.pendingCustomers}</b><small>Pending</small></span>
                      <span className="is-success"><b>{agent.approvedCustomers}</b><small>Approved</small></span>
                    </div>
                    <div className="ams-agent-collection">
                      <span>
                        <small>Pipeline</small>
                        <b>{formatMoneyShort(agent.totalExpectedLoanAmount)}</b>
                      </span>
                      <div className="ams-mini-progress">
                        <i
                          style={{
                            width: `${
                              agent.totalCustomers > 0
                                ? Math.min(
                                    100,
                                    Math.round(
                                      ((agent.totalCustomers - agent.pendingCustomers) / agent.totalCustomers) *
                                        100
                                    )
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="ams-agent-card-footer">
                      <Activity size={14} /> Monitoring details <span>View history</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="ams-bottom-grid">
          <div className="ams-panel ams-attention-panel">
            <div className="ams-panel-heading">
              <div>
                <span className="ams-section-kicker">MONITORING QUEUE</span>
                <h2>What needs attention</h2>
                <p>Quick signals across your assigned districts.</p>
              </div>
              <ClipboardList size={20} className="ams-heading-icon" />
            </div>
            <div className="ams-queue-list">
              <div>
                <span className="ams-queue-icon red"><AlertCircle size={17} /></span>
                <span>
                  <strong>{totals.pending} applications pending review</strong>
                  <small>Across {totals.rms} relationship managers and {totals.agents} agents</small>
                </span>
                <ChevronRight size={16} />
              </div>
              <div>
                <span className="ams-queue-icon amber"><Activity size={17} /></span>
                <span>
                  <strong>
                    {rmsNeedingReview.length > 0
                      ? `${rmsNeedingReview.length} RM${rmsNeedingReview.length === 1 ? '' : 's'} need review`
                      : 'All RMs are operating on track'}
                  </strong>
                  <small>
                    {rmsNeedingReview.length > 0
                      ? `High pending workload detected in ${rmsNeedingReview.map((r) => r.districtName || r.name).join(', ')}`
                      : 'Workload distribution is within normal limits'}
                  </small>
                </span>
                <ChevronRight size={16} />
              </div>
              <div>
                <span className="ams-queue-icon green"><CheckCircle2 size={17} /></span>
                <span>
                  <strong>{totals.approved} cases approved & progressing</strong>
                  <small>Total expected loan value: {formatMoney(totals.totalExpectedLoanAmount)}</small>
                </span>
                <ChevronRight size={16} />
              </div>
            </div>
          </div>

          <div className="ams-panel ams-boundary-panel">
            <div className="ams-panel-heading">
              <div>
                <span className="ams-section-kicker">ACCESS SCOPE</span>
                <h2>Your monitoring boundary</h2>
              </div>
              <ShieldCheck size={20} className="ams-heading-icon" />
            </div>
            <div className="ams-boundary-content">
              <div className="ams-boundary-row">
                <MapPinned size={16} />
                <span>
                  <strong>{totals.districts} assigned district{totals.districts === 1 ? '' : 's'}</strong>
                  <small>
                    {assignedDistrictsWithData.map((d) => d.name).join(', ') || 'No districts assigned'}
                  </small>
                </span>
              </div>
              <div className="ams-boundary-row">
                <Eye size={16} />
                <span>
                  <strong>View only access</strong>
                  <small>No create, edit, update or approval actions</small>
                </span>
              </div>
              <div className="ams-boundary-footer">
                Last synchronized {lastUpdated}
              </div>
            </div>
          </div>
        </section>

        {selectedAgent && (
          <div
            className="ams-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => event.target === event.currentTarget && setSelectedAgent(null)}
          >
            <section
              className="ams-agent-modal wide-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ams-agent-title"
            >
              <button
                type="button"
                className="ams-modal-close"
                onClick={() => setSelectedAgent(null)}
                aria-label="Close agent details"
              >
                <X size={18} />
              </button>

              <span className="ams-modal-kicker">AGENT MONITORING DETAILS</span>
              
              <div className="ams-modal-person">
                <span className="ams-person-avatar large">{initials(selectedAgent.name)}</span>
                <div>
                  <h2 id="ams-agent-title">{selectedAgent.name}</h2>
                  <p>
                    {selectedAgent.code} · RM: {selectedAgent.rm} ({selectedAgent.district})
                  </p>
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                    {selectedAgent.branch} {selectedAgent.mobile ? `• ${selectedAgent.mobile}` : ''} {selectedAgent.email ? `• ${selectedAgent.email}` : ''}
                  </p>
                </div>
              </div>

              <div className="ams-modal-stats" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                <div>
                  <span>Total cases</span>
                  <strong>{selectedAgent.totalCustomers}</strong>
                </div>
                <div className="is-warning">
                  <span>Pending</span>
                  <strong>{selectedAgent.pendingCustomers}</strong>
                </div>
                <div className="is-success">
                  <span>Approved</span>
                  <strong>{selectedAgent.approvedCustomers}</strong>
                </div>
                <div style={{ color: '#c62828' }}>
                  <span>Rejected</span>
                  <strong>{selectedAgent.rejectedCustomers}</strong>
                </div>
                <div>
                  <span>Pipeline</span>
                  <strong style={{ fontSize: '16px' }}>{formatMoneyShort(selectedAgent.totalExpectedLoanAmount)}</strong>
                </div>
              </div>

              <div className="ams-modal-table-section">
                <div className="ams-modal-table-title">
                  <span>Customer Applications Handled ({selectedAgent.customerList.length})</span>
                  <small style={{ color: '#64748b' }}>Live application records</small>
                </div>

                {selectedAgent.customerList.length === 0 ? (
                  <div className="ams-empty-card-state" style={{ padding: '20px' }}>
                    No customer applications found for this agent.
                  </div>
                ) : (
                  <div className="ams-modal-table-scroll">
                    <table className="ams-customer-history-table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Mobile</th>
                          <th>Purpose</th>
                          <th>Employment</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAgent.customerList.map((cust) => {
                          const statusClass =
                            cust.status === 'Approved'
                              ? 'is-approved'
                              : cust.status === 'Pending' || cust.status === 'Under Review'
                              ? 'is-pending'
                              : cust.status === 'Rejected'
                              ? 'is-rejected'
                              : 'is-new';

                          return (
                            <tr key={cust.id}>
                              <td>
                                <strong>{cust.customerName}</strong>
                              </td>
                              <td>{cust.mobile}</td>
                              <td>{cust.loanPurpose}</td>
                              <td>{cust.employmentType}</td>
                              <td>
                                <strong>{formatMoney(cust.amount)}</strong>
                              </td>
                              <td>
                                <span className={`ams-cust-badge ${statusClass}`}>
                                  {cust.status}
                                </span>
                              </td>
                              <td>
                                <small>{cust.createdAt}</small>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="ams-modal-note">
                <ShieldCheck size={16} />
                <span>
                  This is a view-only monitoring screen. All customer records and loan applications shown above are live data from the system.
                </span>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
