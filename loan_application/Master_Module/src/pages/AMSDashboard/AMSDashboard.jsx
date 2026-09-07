import { useMemo, useState } from 'react';
import {
  Activity, AlertCircle, BarChart3, CheckCircle2, ChevronRight, ClipboardList,
  Coins, Eye, FileClock, Filter, LayoutDashboard, LogOut, MapPinned, Menu,
  RefreshCw, Search, ShieldCheck, Users, UserRound, X,
} from 'lucide-react';
import logoImg from '../../../../Core/Logo_img/Logo.png';
import './AMSDashboard.css';

const BASE_DISTRICTS = [
  {
    id: 'chennai', name: 'Chennai', region: 'North', rms: 4, agents: 18, applications: 126, pending: 24,
    lastSync: '4 min ago',
    managers: [
      { id: 'rm-101', name: 'Arun Kumar', code: 'RM250101', agents: 5, applications: 38, pending: 7, approved: 21, status: 'On track', phone: '98765 43210', lastActive: '8 min ago', agentList: [{ name: 'Priya S', applications: 12, pending: 2, approved: 7, status: 'Active' }, { name: 'Vijay R', applications: 9, pending: 1, approved: 6, status: 'Active' }, { name: 'Meena K', applications: 8, pending: 2, approved: 4, status: 'Active' }, { name: 'Sathish P', applications: 5, pending: 1, approved: 3, status: 'Active' }, { name: 'Divya M', applications: 4, pending: 1, approved: 1, status: 'Active' }] },
      { id: 'rm-102', name: 'Kavitha Raj', code: 'RM250102', agents: 4, applications: 31, pending: 8, approved: 15, status: 'Needs review', phone: '98765 43120', lastActive: '22 min ago', agentList: [{ name: 'Gokul S', applications: 11, pending: 4, approved: 4, status: 'Active' }, { name: 'Anitha P', applications: 8, pending: 2, approved: 5, status: 'Active' }, { name: 'Mohan V', applications: 7, pending: 1, approved: 4, status: 'Active' }, { name: 'Reshma A', applications: 5, pending: 1, approved: 2, status: 'Active' }] },
      { id: 'rm-103', name: 'Senthil Nathan', code: 'RM250103', agents: 3, applications: 27, pending: 4, approved: 17, status: 'On track', phone: '98765 43020', lastActive: '35 min ago', agentList: [{ name: 'Hari M', applications: 10, pending: 1, approved: 7, status: 'Active' }, { name: 'Nithya R', applications: 9, pending: 2, approved: 5, status: 'Active' }, { name: 'Bala K', applications: 8, pending: 1, approved: 5, status: 'Active' }] },
      { id: 'rm-104', name: 'Lakshmi Devi', code: 'RM250104', agents: 6, applications: 30, pending: 5, approved: 18, status: 'On track', phone: '98765 42920', lastActive: '1 hr ago', agentList: [{ name: 'Ravi S', applications: 8, pending: 2, approved: 4, status: 'Active' }, { name: 'Karthik M', applications: 7, pending: 1, approved: 5, status: 'Active' }, { name: 'Sowmya P', applications: 6, pending: 1, approved: 4, status: 'Active' }, { name: 'Irfan A', applications: 5, pending: 0, approved: 4, status: 'Active' }, { name: 'Janani V', applications: 3, pending: 1, approved: 1, status: 'Active' }, { name: 'Naveen K', applications: 1, pending: 0, approved: 0, status: 'Inactive' }] },
    ],
  },
  {
    id: 'coimbatore', name: 'Coimbatore', region: 'West', rms: 3, agents: 13, applications: 94, pending: 16,
    lastSync: '7 min ago',
    managers: [
      { id: 'rm-201', name: 'Suresh Babu', code: 'RM250201', agents: 5, applications: 41, pending: 6, approved: 26, status: 'On track', phone: '98765 42820', lastActive: '12 min ago', agentList: [{ name: 'Dinesh K', applications: 14, pending: 2, approved: 9, status: 'Active' }, { name: 'Asha R', applications: 10, pending: 1, approved: 7, status: 'Active' }, { name: 'Manoj P', applications: 9, pending: 2, approved: 5, status: 'Active' }, { name: 'Keerthi S', applications: 8, pending: 1, approved: 5, status: 'Active' }] },
      { id: 'rm-202', name: 'Malarvizhi T', code: 'RM250202', agents: 4, applications: 29, pending: 7, approved: 14, status: 'Needs review', phone: '98765 42720', lastActive: '28 min ago', agentList: [{ name: 'Sanjay V', applications: 11, pending: 3, approved: 5, status: 'Active' }, { name: 'Deepa M', applications: 8, pending: 2, approved: 4, status: 'Active' }, { name: 'Kumar S', applications: 6, pending: 1, approved: 3, status: 'Active' }, { name: 'Fathima N', applications: 4, pending: 1, approved: 2, status: 'Active' }] },
      { id: 'rm-203', name: 'Prakash J', code: 'RM250203', agents: 4, applications: 24, pending: 3, approved: 16, status: 'On track', phone: '98765 42620', lastActive: '41 min ago', agentList: [{ name: 'Vimal R', applications: 8, pending: 1, approved: 5, status: 'Active' }, { name: 'Renu P', applications: 7, pending: 1, approved: 5, status: 'Active' }, { name: 'Aswin K', applications: 5, pending: 1, approved: 3, status: 'Active' }, { name: 'Malini S', applications: 4, pending: 0, approved: 3, status: 'Active' }] },
    ],
  },
  {
    id: 'madurai', name: 'Madurai', region: 'South', rms: 3, agents: 11, applications: 78, pending: 13,
    lastSync: '11 min ago',
    managers: [
      { id: 'rm-301', name: 'Balaji M', code: 'RM250301', agents: 4, applications: 33, pending: 5, approved: 20, status: 'On track', phone: '98765 42520', lastActive: '18 min ago', agentList: [{ name: 'Muthu S', applications: 10, pending: 2, approved: 6, status: 'Active' }, { name: 'Gowri P', applications: 9, pending: 1, approved: 6, status: 'Active' }, { name: 'Saravanan R', applications: 8, pending: 1, approved: 5, status: 'Active' }, { name: 'Thara K', applications: 6, pending: 1, approved: 3, status: 'Active' }] },
      { id: 'rm-302', name: 'Revathi S', code: 'RM250302', agents: 3, applications: 22, pending: 5, approved: 11, status: 'Needs review', phone: '98765 42420', lastActive: '46 min ago', agentList: [{ name: 'Aravind M', applications: 9, pending: 3, approved: 4, status: 'Active' }, { name: 'Bhuvana T', applications: 7, pending: 1, approved: 4, status: 'Active' }, { name: 'Kannan V', applications: 6, pending: 1, approved: 3, status: 'Active' }] },
      { id: 'rm-303', name: 'Dhanush K', code: 'RM250303', agents: 4, applications: 23, pending: 3, approved: 15, status: 'On track', phone: '98765 42320', lastActive: '1 hr ago', agentList: [{ name: 'Magesh P', applications: 8, pending: 1, approved: 6, status: 'Active' }, { name: 'Uma R', applications: 7, pending: 1, approved: 4, status: 'Active' }, { name: 'Yogesh S', applications: 5, pending: 1, approved: 3, status: 'Active' }, { name: 'Shalini A', applications: 3, pending: 0, approved: 2, status: 'Inactive' }] },
    ],
  },
];

const COLLECTION_SEEDS = {
  chennai: { target: 4200000, collected: 2860000, overdue: 8 },
  coimbatore: { target: 3150000, collected: 2240000, overdue: 5 },
  madurai: { target: 2680000, collected: 1760000, overdue: 6 },
};

const DISTRICTS = BASE_DISTRICTS.map((district) => {
  const seed = COLLECTION_SEEDS[district.id];
  const managers = district.managers.map((manager, managerIndex) => {
    const target = Math.round((seed.target * manager.applications) / district.applications);
    const collected = Math.round(target * (managerIndex === 1 ? 0.57 : managerIndex === 2 ? 0.76 : 0.68));
    return {
      ...manager,
      collection: { target, collected, outstanding: target - collected, overdue: manager.pending + (managerIndex === 1 ? 2 : 0) },
      agentList: manager.agentList.map((agent, agentIndex) => {
        const agentTarget = Math.round((target * agent.applications) / manager.applications);
        const agentCollected = Math.round(agentTarget * (agentIndex === 1 ? 0.58 : 0.71));
        return { ...agent, collection: { target: agentTarget, collected: agentCollected, outstanding: agentTarget - agentCollected, overdue: agent.pending + (agentIndex === 0 ? 1 : 0) } };
      }),
    };
  });
  return { ...district, collection: { ...seed, outstanding: seed.target - seed.collected }, managers };
});

const initials = (name) => name.split(' ').map((part) => part[0]).slice(0, 2).join('');
const money = (amount) => `₹${(amount / 100000).toFixed(1)}L`;
const collectionPercent = (collection) => Math.min(100, Math.round((collection.collected / collection.target) * 100));

export default function AMSDashboard() {
  const [selectedDistrictId, setSelectedDistrictId] = useState('chennai');
  const [selectedRmId, setSelectedRmId] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('Just now');
  const [activeView, setActiveView] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const selectedDistrict = DISTRICTS.find((district) => district.id === selectedDistrictId) || DISTRICTS[0];
  const selectedRm = selectedDistrict.managers.find((rm) => rm.id === selectedRmId) || null;
  const visibleManagers = useMemo(() => selectedDistrict.managers.filter((rm) => {
    const matchesQuery = `${rm.name} ${rm.code}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'All' || rm.status === statusFilter;
    return matchesQuery && matchesStatus;
  }), [query, selectedDistrict, statusFilter]);
  const totals = DISTRICTS.reduce((sum, district) => ({
    rms: sum.rms + district.rms, agents: sum.agents + district.agents, applications: sum.applications + district.applications, pending: sum.pending + district.pending,
    target: sum.target + district.collection.target, collected: sum.collected + district.collection.collected,
  }), { rms: 0, agents: 0, applications: 0, pending: 0, target: 0, collected: 0 });

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

  return (
    <div className="ams-dashboard-shell">
      {sidebarOpen && <button type="button" className="ams-sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
      <aside className={`ams-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="ams-sidebar-brand"><img src={logoImg} alt="Sivels Finance" /><span><strong>SIVELS</strong><small>FINANCE</small></span></div>
        <div className="ams-sidebar-profile"><span className="ams-sidebar-avatar">AM</span><span><strong>Arun Kumar</strong><small>AMS · 3 districts</small></span></div>
        <nav className="ams-sidebar-nav" aria-label="AMS dashboard navigation">
          <span className="ams-sidebar-label">MONITORING</span>
          <button type="button" className={activeView === 'overview' ? 'is-active' : ''} onClick={() => goToView('overview')}><LayoutDashboard size={17} /> Overview</button>
          <button type="button" className={activeView === 'collections' ? 'is-active' : ''} onClick={() => goToView('collections')}><Coins size={17} /> Collections <b>{totals.pending}</b></button>
          <button type="button" className={activeView === 'rms' ? 'is-active' : ''} onClick={() => goToView('rms')}><Users size={17} /> RM monitoring</button>
          <button type="button" className={activeView === 'agents' ? 'is-active' : ''} onClick={() => goToView('agents')}><UserRound size={17} /> Agent monitoring</button>
          <button type="button" className={activeView === 'applications' ? 'is-active' : ''} onClick={() => goToView('applications')}><FileClock size={17} /> Application status</button>
        </nav>
        <div className="ams-sidebar-bottom"><div className="ams-sidebar-scope"><ShieldCheck size={16} /><span><strong>View-only access</strong><small>No edit or approval actions</small></span></div><button type="button" className="ams-sidebar-logout" onClick={() => { localStorage.removeItem('sivels_currentUser'); window.location.href = '/login'; }}><LogOut size={17} /> Logout</button></div>
      </aside>
      <main className="ams-dashboard-page">
        <button type="button" className="ams-mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
        <div id="ams-overview">
      <header className="ams-dashboard-hero">
        <div className="ams-dashboard-hero-copy">
          <span className="ams-dashboard-eyebrow"><ShieldCheck size={14} /> AMS MONITORING CONSOLE</span>
          <h1>Good morning, Arun</h1>
          <p>Monitor RM performance, agent activity, and pending work across your assigned districts.</p>
          <div className="ams-scope-line"><MapPinned size={15} /> Viewing {DISTRICTS.length} assigned districts <span>•</span> View-only access</div>
        </div>
        <div className="ams-dashboard-hero-side">
          <div className="ams-account-badge"><span className="ams-account-avatar">AM</span><span><strong>AMS250901</strong><small>Area Management Specialist</small></span></div>
          <button type="button" className="ams-refresh-button" onClick={() => setLastUpdated('Just now')}><RefreshCw size={16} /> Refresh</button>
        </div>
      </header>

      <section className="ams-summary-grid">
        <div className="ams-summary-card is-green"><div className="ams-summary-icon"><MapPinned size={19} /></div><span>Assigned districts</span><strong>{DISTRICTS.length}</strong><small>District-level visibility</small></div>
        <div className="ams-summary-card is-blue"><div className="ams-summary-icon"><Users size={19} /></div><span>Relationship managers</span><strong>{totals.rms}</strong><small>Across all districts</small></div>
        <div className="ams-summary-card is-orange"><div className="ams-summary-icon"><UserRound size={19} /></div><span>Total agents</span><strong>{totals.agents}</strong><small>Mapped under RMs</small></div>
        <div className="ams-summary-card is-red"><div className="ams-summary-icon"><AlertCircle size={19} /></div><span>Pending work</span><strong>{totals.pending}</strong><small>Needs attention today</small></div>
      </section>

      <section className="ams-panel">
        <div className="ams-panel-heading"><div><span className="ams-section-kicker">DISTRICT OVERVIEW</span><h2>Choose a district to inspect</h2><p>Start at district level, then open an RM to see the agents and workload underneath.</p></div><span className="ams-live-pill"><i /> Live view</span></div>
        <div className="ams-district-cards">
          {DISTRICTS.map((district) => (
            <button type="button" className={`ams-district-overview ${selectedDistrict.id === district.id ? 'is-selected' : ''}`} key={district.id} onClick={() => selectDistrict(district.id)}>
              <div className="ams-district-card-heading"><span className="ams-district-marker"><MapPinned size={16} /></span><span><strong>{district.name}</strong><small>{district.region} region</small></span><ChevronRight size={17} /></div>
              <div className="ams-district-metrics"><span><b>{district.rms}</b><small>RMs</small></span><span><b>{district.agents}</b><small>Agents</small></span><span className="is-attention"><b>{district.pending}</b><small>Pending</small></span></div>
              <div className="ams-mini-progress"><i style={{ width: `${Math.min(100, Math.round(((district.applications - district.pending) / district.applications) * 100))}%` }} /></div><small className="ams-district-sync">Synced {district.lastSync}</small>
            </button>
          ))}
        </div>
      </section>

        </div>

      <section className="ams-panel ams-collection-panel" id="ams-collections">
        <div className="ams-panel-heading"><div><span className="ams-section-kicker">COLLECTION MONITORING · {selectedDistrict.name.toUpperCase()}</span><h2>How much is left to collect</h2><p>Track the district target, collection progress, and overdue accounts at a glance.</p></div><Coins size={20} className="ams-heading-icon" /></div>
        <div className="ams-collection-overview"><div className="ams-collection-total"><span>District collection target</span><strong>{money(selectedDistrict.collection.target)}</strong><small>{money(selectedDistrict.collection.collected)} collected · {money(selectedDistrict.collection.outstanding)} outstanding</small></div><div className="ams-collection-progress"><div className="ams-progress-top"><span>Collection progress</span><strong>{collectionPercent(selectedDistrict.collection)}%</strong></div><div className="ams-large-progress"><i style={{ width: `${collectionPercent(selectedDistrict.collection)}%` }} /></div><div className="ams-progress-footer"><span>Collected {money(selectedDistrict.collection.collected)}</span><span className="is-warning">{selectedDistrict.collection.overdue} overdue accounts</span></div></div><div className="ams-collection-side"><span>Due this cycle</span><strong>{money(selectedDistrict.collection.outstanding)}</strong><small>Across {selectedDistrict.rms} RMs</small></div></div>
        <div className="ams-collection-rm-grid">{selectedDistrict.managers.map((rm) => <button type="button" className="ams-collection-rm-card" key={rm.id} onClick={() => { setSelectedRmId(rm.id); goToView('rms'); }}><div className="ams-collection-rm-top"><span className="ams-person-avatar small">{initials(rm.name)}</span><span><strong>{rm.name}</strong><small>{rm.agents} agents · {rm.collection.overdue} overdue</small></span><ChevronRight size={16} /></div><div className="ams-rm-collection-values"><span><small>Target</small><b>{money(rm.collection.target)}</b></span><span><small>Collected</small><b className="is-success">{money(rm.collection.collected)}</b></span><span><small>Left</small><b className="is-warning">{money(rm.collection.outstanding)}</b></span></div><div className="ams-mini-progress"><i style={{ width: `${collectionPercent(rm.collection)}%` }} /></div></button>)}</div>
      </section>

      <section className="ams-panel ams-rm-panel" id="ams-rms">
        <div className="ams-panel-heading ams-table-heading"><div><span className="ams-section-kicker">{selectedDistrict.name.toUpperCase()} · RELATIONSHIP MANAGERS</span><h2>RM performance and workload</h2><p>View every RM working in this district and the number of agents and applications under them.</p></div><div className="ams-table-controls"><label className="ams-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search RM" /></label><label className="ams-filter"><Filter size={15} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option><option>On track</option><option>Needs review</option></select></label></div></div>
        <div className="ams-table-scroll"><table className="ams-monitor-table"><thead><tr><th>Relationship manager</th><th>Agents</th><th>Applications</th><th>Pending</th><th>Collection left</th><th>Last active</th><th>View</th></tr></thead><tbody>{visibleManagers.map((rm) => <tr key={rm.id} className={selectedRmId === rm.id ? 'is-open' : ''}><td><div className="ams-person-cell"><span className="ams-person-avatar">{initials(rm.name)}</span><span><strong>{rm.name}</strong><small>{rm.code} · {rm.status}</small></span></div></td><td><strong>{rm.agents}</strong><small className="ams-cell-note">assigned agents</small></td><td><strong>{rm.applications}</strong><small className="ams-cell-note">total cases</small></td><td><span className="ams-number-alert">{rm.pending}</span><small className="ams-cell-note">to review</small></td><td><strong className="ams-number-warning">{money(rm.collection.outstanding)}</strong><small className="ams-cell-note">of {money(rm.collection.target)}</small></td><td><small>{rm.lastActive}</small></td><td><button type="button" className="ams-view-button" onClick={() => setSelectedRmId(selectedRmId === rm.id ? null : rm.id)}><Eye size={15} /> {selectedRmId === rm.id ? 'Close' : 'View agents'}</button></td></tr>)}{!visibleManagers.length && <tr><td colSpan="7" className="ams-empty-state">No relationship managers match your filters.</td></tr>}</tbody></table></div>
      </section>

      {selectedRm && <section className="ams-panel ams-agent-panel" id="ams-agents"><div className="ams-panel-heading"><div><span className="ams-section-kicker">RM DETAIL · {selectedRm.code}</span><h2>Agents under {selectedRm.name}</h2><p>View applications, pending verification, collection target, and amount left for every agent.</p></div><span className={`ams-status-tag ${selectedRm.status === 'Needs review' ? 'needs-review' : ''}`}>{selectedRm.status}</span></div><div className="ams-rm-detail-strip"><span><small>RM collection target</small><strong>{money(selectedRm.collection.target)}</strong></span><span><small>Collected</small><strong className="is-success">{money(selectedRm.collection.collected)}</strong></span><span><small>Collection left</small><strong className="is-warning">{money(selectedRm.collection.outstanding)}</strong></span><span><small>Overdue accounts</small><strong className="is-warning">{selectedRm.collection.overdue}</strong></span></div><div className="ams-agent-grid">{selectedRm.agentList.map((agent) => <button type="button" className="ams-agent-card" key={agent.name} onClick={() => setSelectedAgent({ ...agent, rm: selectedRm.name, district: selectedDistrict.name })}><div className="ams-agent-card-top"><span className="ams-person-avatar small">{initials(agent.name)}</span><span><strong>{agent.name}</strong><small>{agent.status} · {agent.collection.overdue} overdue</small></span><ChevronRight size={16} /></div><div className="ams-agent-metrics"><span><b>{agent.applications}</b><small>Cases</small></span><span className="is-attention"><b>{agent.pending}</b><small>Pending</small></span><span className="is-success"><b>{agent.approved}</b><small>Approved</small></span></div><div className="ams-agent-collection"><span><small>Collection left</small><b>{money(agent.collection.outstanding)}</b></span><div className="ams-mini-progress"><i style={{ width: `${collectionPercent(agent.collection)}%` }} /></div></div><div className="ams-agent-card-footer"><Activity size={14} /> Monitoring details <span>View</span></div></button>)}</div></section>}

      <section className="ams-bottom-grid"><div className="ams-panel ams-attention-panel"><div className="ams-panel-heading"><div><span className="ams-section-kicker">MONITORING QUEUE</span><h2>What needs attention</h2><p>Quick signals across your assigned districts.</p></div><ClipboardList size={20} className="ams-heading-icon" /></div><div className="ams-queue-list"><div><span className="ams-queue-icon red"><AlertCircle size={17} /></span><span><strong>{totals.pending} applications pending</strong><small>Across {totals.rms} relationship managers</small></span><ChevronRight size={16} /></div><div><span className="ams-queue-icon amber"><Activity size={17} /></span><span><strong>2 RMs need review</strong><small>High pending workload in Chennai and Madurai</small></span><ChevronRight size={16} /></div><div><span className="ams-queue-icon green"><CheckCircle2 size={17} /></span><span><strong>{totals.applications - totals.pending} cases progressing</strong><small>Approved and actively moving forward</small></span><ChevronRight size={16} /></div></div></div><div className="ams-panel ams-boundary-panel"><div className="ams-panel-heading"><div><span className="ams-section-kicker">ACCESS SCOPE</span><h2>Your monitoring boundary</h2></div><ShieldCheck size={20} className="ams-heading-icon" /></div><div className="ams-boundary-content"><div className="ams-boundary-row"><MapPinned size={16} /><span><strong>{DISTRICTS.length} districts</strong><small>Chennai, Coimbatore, Madurai</small></span></div><div className="ams-boundary-row"><Eye size={16} /><span><strong>View only</strong><small>No create, edit, or approval actions</small></span></div><div className="ams-boundary-footer">Last refreshed {lastUpdated}</div></div></div></section>

      {selectedAgent && <div className="ams-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedAgent(null)}><section className="ams-agent-modal" role="dialog" aria-modal="true" aria-labelledby="ams-agent-title"><button type="button" className="ams-modal-close" onClick={() => setSelectedAgent(null)} aria-label="Close agent details"><X size={18} /></button><span className="ams-modal-kicker">AGENT MONITORING DETAILS</span><div className="ams-modal-person"><span className="ams-person-avatar large">{initials(selectedAgent.name)}</span><div><h2 id="ams-agent-title">{selectedAgent.name}</h2><p>{selectedAgent.rm} · {selectedAgent.district}</p></div></div><div className="ams-modal-stats"><div><span>Total cases</span><strong>{selectedAgent.applications}</strong></div><div className="is-warning"><span>Pending</span><strong>{selectedAgent.pending}</strong></div><div className="is-success"><span>Approved</span><strong>{selectedAgent.approved}</strong></div></div><div className="ams-modal-note"><ShieldCheck size={16} /><span>This is a view-only monitoring screen. Agent details can be connected to the application records later.</span></div></section></div>}
        </main>
    </div>
  );
}
