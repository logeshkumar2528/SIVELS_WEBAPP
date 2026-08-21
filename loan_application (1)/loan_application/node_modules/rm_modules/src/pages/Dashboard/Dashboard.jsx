import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import StatCard from '../../components/StatCard/StatCard';
import DataTable from '../../components/DataTable/DataTable';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import DonutChart from '../../components/DonutChart/DonutChart';
import SectionHeader from '../../components/SectionHeader/SectionHeader';
import Modal from '../../components/Modal/Modal';
import Button from '../../components/Button/Button';
import { ROUTES } from '../../config/routeConfig';
import {
  dashboardStats,
  recentApplicationsData,
  agentPerformanceData,
  statusSummaryData,
} from './dashboardData';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedAgent, setSelectedAgent] = useState(null);

  const FilePlusIcon = iconMap['FilePlus'];
  const ShieldCheckIcon = iconMap['ShieldCheck'];
  const UsersIcon = iconMap['Users'];
  const UserCircleIcon = iconMap['UserCircle'];
  const ArrowRightIcon = iconMap['ArrowRight'];

  const statsIconMap = {
    'new-apps': iconMap['FilePlus'] ? <iconMap.FilePlus size={22} /> : null,
    'pending-verif': iconMap['Clock'] ? <iconMap.Clock size={22} /> : null,
    'approved-apps': iconMap['CheckCircle'] ? <iconMap.CheckCircle size={22} /> : null,
    'total-agents': iconMap['Users'] ? <iconMap.Users size={22} /> : null,
  };

  const columns = [
    { key: 'id', label: 'App ID' },
    { key: 'customerName', label: 'Customer Name' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'loanType', label: 'Loan Purpose' },
    { key: 'amount', label: 'Requested Amount' },
    { key: 'agentName', label: 'Agent' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'action',
      label: 'Action',
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(ROUTES.APPLICATION_DETAILS.replace(':applicationId', row.id))}
        >
          Verify Customer
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <SectionHeader
        title="Relationship Manager Dashboard"
        subtitle="Overview of customer applications, verification tasks, and field agent performance."
      />

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        {dashboardStats.map((st) => (
          <StatCard
            key={st.id}
            title={st.title}
            value={st.value}
            description={st.description}
            trend={st.trend}
            trendDirection={st.trendDirection}
            variant={st.variant}
            icon={statsIconMap[st.id]}
            onClick={() => navigate(ROUTES.NEW_APPLICATIONS)}
          />
        ))}
      </div>

      {/* Quick Action Cards */}
      <div className="quick-actions-row">
        <div className="quick-action-card" onClick={() => navigate(ROUTES.NEW_APPLICATIONS)}>
          <div className="quick-action-icon bg-green">
            {FilePlusIcon && <FilePlusIcon size={20} />}
          </div>
          <div className="quick-action-info">
            <span className="quick-action-title">New Applications</span>
            <span className="quick-action-desc">Process pending verification list</span>
          </div>
          {ArrowRightIcon && <ArrowRightIcon size={16} className="quick-action-arrow" />}
        </div>

        <div className="quick-action-card" onClick={() => navigate(ROUTES.APPLICATION_DETAILS.replace(':applicationId', 'APP-2024-001'))}>
          <div className="quick-action-icon bg-amber">
            {ShieldCheckIcon && <ShieldCheckIcon size={20} />}
          </div>
          <div className="quick-action-info">
            <span className="quick-action-title">Start Verification</span>
            <span className="quick-action-desc">Launch 5-step customer wizard</span>
          </div>
          {ArrowRightIcon && <ArrowRightIcon size={16} className="quick-action-arrow" />}
        </div>

        <div className="quick-action-card" onClick={() => navigate(ROUTES.MY_AGENTS)}>
          <div className="quick-action-icon bg-blue">
            {UsersIcon && <UsersIcon size={20} />}
          </div>
          <div className="quick-action-info">
            <span className="quick-action-title">Manage Agents</span>
            <span className="quick-action-desc">View active team & performance</span>
          </div>
          {ArrowRightIcon && <ArrowRightIcon size={16} className="quick-action-arrow" />}
        </div>

        <div className="quick-action-card" onClick={() => navigate(ROUTES.PROFILE)}>
          <div className="quick-action-icon bg-purple">
            {UserCircleIcon && <UserCircleIcon size={20} />}
          </div>
          <div className="quick-action-info">
            <span className="quick-action-title">My RM Profile</span>
            <span className="quick-action-desc">Branch details & monthly target</span>
          </div>
          {ArrowRightIcon && <ArrowRightIcon size={16} className="quick-action-arrow" />}
        </div>
      </div>

      {/* Main Table + Donut Summary Section */}
      <div className="three-col-grid">
        <div className="panel" style={{ gridColumn: 'span 2' }}>
          <div className="panel-header">
            <h3 className="panel-title">Recent Applications Requiring Action</h3>
            <Button size="sm" variant="secondary" onClick={() => navigate(ROUTES.NEW_APPLICATIONS)}>
              View All
            </Button>
          </div>
          <DataTable columns={columns} data={recentApplicationsData} rowKeyField="id" />
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Application Status</h3>
          </div>
          <DonutChart data={statusSummaryData} total={182} />
          <div className="status-legend-list">
            {statusSummaryData.map((s) => (
              <div key={s.label} className="status-legend-item">
                <span className="legend-dot" style={{ backgroundColor: s.color }} />
                <span className="legend-name">{s.label}</span>
                <span className="legend-count">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Performance Panel */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Field Agent Performance Overview</h3>
          <Button size="sm" variant="outline" onClick={() => navigate(ROUTES.MY_AGENTS)}>
            Agent Details
          </Button>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent Name</th>
                <th>Total Customers</th>
                <th>Pending Verification</th>
                <th>Submitted</th>
                <th>Active Customers</th>
                <th>Pending Collections</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {agentPerformanceData.map((ag) => (
                <tr key={ag.name}>
                  <td className="font-semibold">{ag.name}</td>
                  <td>{ag.totalCustomers}</td>
                  <td className="text-warning font-semibold">{ag.pendingVerification}</td>
                  <td className="text-success font-semibold">{ag.submitted}</td>
                  <td>{ag.activeCustomers}</td>
                  <td className="text-danger font-semibold">{ag.pendingCollection}</td>
                  <td>
                    <Button size="sm" variant="secondary" onClick={() => setSelectedAgent(ag)}>
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent Details Modal */}
      <Modal show={!!selectedAgent} onHide={() => setSelectedAgent(null)} title="Agent Details">
        {selectedAgent && (
          <div className="agent-modal-body">
            <div className="agent-modal-header">
              <div className="agent-avatar-lg">
                {selectedAgent.name[0]}
              </div>
              <h3 className="agent-modal-name">{selectedAgent.name}</h3>
              <p className="text-muted">Field Relationship Executive</p>
            </div>

            <div className="agent-metrics-grid">
              <div className="agent-metric-box">
                <span className="metric-lbl">Total Customers</span>
                <span className="metric-val">{selectedAgent.totalCustomers}</span>
              </div>
              <div className="agent-metric-box">
                <span className="metric-lbl">Pending Verification</span>
                <span className="metric-val text-warning">{selectedAgent.pendingVerification}</span>
              </div>
              <div className="agent-metric-box">
                <span className="metric-lbl">Applications Submitted</span>
                <span className="metric-val text-success">{selectedAgent.submitted}</span>
              </div>
              <div className="agent-metric-box">
                <span className="metric-lbl">Pending Collection</span>
                <span className="metric-val text-danger">{selectedAgent.pendingCollection}</span>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <Button fullWidth variant="primary" onClick={() => setSelectedAgent(null)}>
                Close Window
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
