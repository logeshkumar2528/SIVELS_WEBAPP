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
import { useRmDashboardData } from '../../hooks/useRmDashboardData';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedAgent, setSelectedAgent] = useState(null);
  const {
    badgeCounts = { newApplications: 0, verification: 0, returned: 0, approved: 0 },
    dashboardStats = [],
    recentApplicationsData,
    agentPerformanceData = [],
    statusSummaryData,
    totalApplications = 0,
    activeAgentsCount = 0,
    inProgressCount = 0,
    approvedLoansCount = 0,
    submissionHistoryCount = 0,
    rmProfile = { rmCode: 'RM0001', fullName: 'Relationship Manager', branch: 'Branch Details & Targets' },
    isLoading,
    error,
  } = useRmDashboardData();

  const currentUser = JSON.parse(localStorage.getItem('sivels_currentUser') || 'null');
  const displayRmCode = rmProfile?.rmCode || currentUser?.rmCode || rmProfile?.fullName || currentUser?.fullName || currentUser?.name || 'RM Profile';
  const displayBranch = rmProfile?.branch || currentUser?.branch || 'Branch Details & Targets';

  const dashboardCards = [
    {
      id: 'total-applications',
      title: 'Total Applications',
      value: String(totalApplications),
      description: 'All Customer Files',
      variant: 'default',
      icon: iconMap['FileText'] ? <iconMap.FileText size={22} /> : null,
      onClick: () => navigate(ROUTES.NEW_APPLICATIONS),
    },
    {
      id: 'new-applications',
      title: 'New Applications',
      value: String(badgeCounts.newApplications),
      description: 'Requires Verification',
      variant: 'info',
      icon: iconMap['FilePlus'] ? <iconMap.FilePlus size={22} /> : null,
      onClick: () => navigate(ROUTES.NEW_APPLICATIONS),
    },
    {
      id: 'pending-applications',
      title: 'Pending Applications',
      value: String(badgeCounts.verification),
      description: 'Awaiting RM Action',
      variant: 'warning',
      icon: iconMap['Clock'] ? <iconMap.Clock size={22} /> : null,
      onClick: () => navigate(ROUTES.PENDING_APPLICATIONS),
    },
    {
      id: 'in-progress',
      title: 'In Progress',
      value: String(inProgressCount),
      description: 'Under Verification',
      variant: 'warning',
      icon: iconMap['RefreshCw'] ? <iconMap.RefreshCw size={22} /> : null,
      onClick: () => navigate(ROUTES.PENDING_APPLICATIONS),
    },
    {
      id: 'login-to-ho',
      title: 'Logged to HO',
      value: String(approvedLoansCount),
      description: 'Ready for HO Credit',
      variant: 'success',
      icon: iconMap['Send'] ? <iconMap.Send size={22} /> : null,
      onClick: () => navigate(ROUTES.APPROVED_APPLICATIONS),
    },
    {
      id: 'active-agents',
      title: 'Active Agents',
      value: String(activeAgentsCount),
      description: 'Reporting to RM',
      variant: 'default',
      icon: iconMap['Users'] ? <iconMap.Users size={22} /> : null,
      onClick: () => navigate(ROUTES.MY_AGENTS),
    },
    {
      id: 'my-profile',
      title: 'My Profile',
      value: displayRmCode,
      description: displayBranch,
      variant: 'default',
      icon: iconMap['UserCircle'] ? <iconMap.UserCircle size={22} /> : null,
      onClick: () => navigate(ROUTES.PROFILE),
    },
    {
      id: 'submission-history',
      title: 'Submission History',
      value: String(submissionHistoryCount),
      description: 'Submitted Applications',
      variant: 'success',
      icon: iconMap['History'] ? <iconMap.History size={22} /> : null,
      onClick: () => navigate(ROUTES.SUBMISSION_HISTORY),
    },
  ];

  const columns = [
    { key: 'displayId', label: 'APP ID' },
    { key: 'customerName', label: 'CUSTOMER' },
    { key: 'mobile', label: 'MOBILE' },
    { key: 'loanType', label: 'PURPOSE' },
    { key: 'amount', label: 'AMOUNT' },
    { key: 'agentName', label: 'AGENT' },
    {
      key: 'status',
      label: 'STATUS',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'action',
      label: 'ACTION',
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(ROUTES.APPLICATION_DETAILS.replace(':applicationId', row.id))}
        >
          Verify
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

      {isLoading && (
        <div className="panel" style={{ marginBottom: '20px' }}>
          Loading live RM dashboard data...
        </div>
      )}

      {error && (
        <div className="panel" style={{ marginBottom: '20px', borderColor: '#fca5a5', color: '#b91c1c' }}>
          {error}
        </div>
      )}

      {/* 8 RM Dashboard Cards Grid */}
      <div className="dashboard-cards-grid">
        {dashboardCards.map((card) => (
          <StatCard
            key={card.id}
            title={card.title}
            value={card.value}
            description={card.description}
            variant={card.variant}
            icon={card.icon}
            onClick={card.onClick}
          />
        ))}
      </div>

      {/* Main Table + Donut Summary Section */}
      <div className="three-col-grid dashboard-main-grid">
        <div className="panel dashboard-recent-panel" style={{ gridColumn: 'span 2' }}>
          <div className="panel-header">
            <h3 className="panel-title">Recent Applications Requiring Action</h3>
            <Button size="sm" variant="secondary" onClick={() => navigate(ROUTES.NEW_APPLICATIONS)}>
              View All
            </Button>
          </div>
          <DataTable
            columns={columns}
            data={recentApplicationsData}
            rowKeyField="id"
            className="rm-dashboard-recent-table"
          />
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Application Status</h3>
          </div>
          <DonutChart data={statusSummaryData} total={totalApplications} />
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
