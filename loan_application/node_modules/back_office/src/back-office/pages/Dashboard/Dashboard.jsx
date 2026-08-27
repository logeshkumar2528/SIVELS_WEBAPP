/**
 * Dashboard
 * --------------------
 * Purpose:
 *   Back Office Dashboard page — the primary view for Back Office Officers.
 *
 * Responsibilities:
 *   - Compose reusable components to build the full dashboard layout.
 *   - Own filter tab state and pagination state.
 *   - Derive filtered and paginated application data.
 *   - Define table column renderers (which reference StatusBadge and Button).
 *   - Pass all data to children as props — no business logic in JSX.
 *
 * Rules:
 *   - Must stay under 250 lines.
 *   - All business data imported from dashboardData.js.
 *   - No hardcoded strings, colors, or values.
 *   - Does not import or know about Sidebar or Header.
 */

import { useState, useMemo, useCallback } from 'react';
import MainLayout    from '../../layouts/MainLayout/MainLayout';
import StatCard      from '../../components/StatCard/StatCard';
import SectionHeader from '../../components/SectionHeader/SectionHeader';
import StatusBadge   from '../../components/StatusBadge/StatusBadge';
import Button        from '../../components/Button/Button';
import DataTable     from '../../components/DataTable/DataTable';
import Pagination    from '../../components/Pagination/Pagination';
import DonutChart    from '../../components/DonutChart/DonutChart';
import iconMap       from '../../config/iconMap';
import {
  CURRENT_USER, BADGE_COUNTS, STAT_CARDS, FILTER_TABS,
  APPLICATIONS, CHART_DATA, CHART_TOTAL, TASKS, ALERTS,
} from './dashboardData';
import './Dashboard.css';

/* ==========================================
   EYE ICON — resolved once at module level
========================================== */
const EyeIcon = iconMap['Eye'];

/* ==========================================
   STACKED CELL — internal render helper
========================================== */
function StackedCell({ primary, secondary }) {
  return (
    <div className="dashboard-cell-stack">
      <span className="dashboard-cell-primary">{primary}</span>
      <span className="dashboard-cell-secondary">{secondary}</span>
    </div>
  );
}

/* ==========================================
   DASHBOARD PAGE
========================================== */
function Dashboard() {
  /* ---- Layout state ---- */
  const [activeTab,    setActiveTab]    = useState('all');
  const [currentPage,  setCurrentPage]  = useState(1);
  const [pageSize,     setPageSize]     = useState(10);

  /* ---- Filtered data ---- */
  const filteredData = useMemo(() => {
    if (activeTab === 'all') return APPLICATIONS;
    return APPLICATIONS.filter((app) => app.status === activeTab);
  }, [activeTab]);

  /* ---- Paginated slice ---- */
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  /* ---- Tab counts (derived from data, not hardcoded) ---- */
  const tabCounts = useMemo(() => {
    const counts = { all: APPLICATIONS.length };
    APPLICATIONS.forEach((app) => {
      counts[app.status] = (counts[app.status] ?? 0) + 1;
    });
    return counts;
  }, []);

  /* ---- Handlers ---- */
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
  }, []);

  const handlePageSizeChange = useCallback((size) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  /* ---- Table column definitions ---- */
  const columns = useMemo(() => [
    {
      key:   'id',
      label: 'Application ID',
    },
    {
      key:    'customer',
      label:  'Customer Name',
      render: (row) => (
        <StackedCell primary={row.customerName} secondary={row.customerPhone} />
      ),
    },
    {
      key:    'agent',
      label:  'Agent / RM',
      render: (row) => (
        <StackedCell primary={row.agentName} secondary={`RM: ${row.rmName}`} />
      ),
    },
    {
      key:    'loanAmount',
      label:  'Loan Amount',
    },
    {
      key:    'submittedOn',
      label:  'Submitted On',
      render: (row) => (
        <StackedCell primary={row.submittedDate} secondary={row.submittedTime} />
      ),
    },
    {
      key:    'status',
      label:  'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key:    'actions',
      label:  'Actions',
      render: (row) => {
        const isReview = ['new', 'inReview', 'returned'].includes(row.status);
        return (
          <Button
            label={isReview ? 'Review' : 'View'}
            variant="outline"
            size="sm"
            icon={<EyeIcon size={13} strokeWidth={2} />}
            onClick={() => {}}
          />
        );
      },
    },
  ], []);

  return (
    <MainLayout
      title="Back Office Dashboard"
      subtitle="Welcome back! Here's what's happening today."
      user={CURRENT_USER}
      badgeCounts={BADGE_COUNTS}
      notificationCount={12}
    >
      {/* ==================== STAT CARDS ==================== */}
      <div className="dashboard-stats">
        {STAT_CARDS.map((card) => {
          const Icon = iconMap[card.icon];
          return (
            <StatCard
              key={card.id}
              icon={<Icon size={22} strokeWidth={1.8} />}
              title={card.title}
              value={card.value}
              trend={card.trend}
              trendDirection={card.trendDirection}
              variant={card.variant}
            />
          );
        })}
      </div>

      {/* ==================== MAIN BODY ==================== */}
      <div className="dashboard-body">

        {/* ---------- LEFT PANEL ---------- */}
        <div className="dashboard-left">
          <div className="dashboard-card">

            <div className="dashboard-card-header">
              <SectionHeader
                title="Recent Applications"
              />

              {/* Filter tabs */}
              <div className="dashboard-tabs" role="tablist" aria-label="Application filter">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    type="button"
                    className={['dashboard-tab', activeTab === tab.id ? 'dashboard-tab--active' : ''].join(' ').trim()}
                    onClick={() => handleTabChange(tab.id)}
                    aria-selected={activeTab === tab.id}
                    aria-label={`${tab.label} (${tabCounts[tab.id] ?? 0})`}
                  >
                    {tab.label}
                    <span className="dashboard-tab-count">({tabCounts[tab.id] ?? 0})</span>
                  </button>
                ))}
              </div>
            </div>

            <DataTable columns={columns} data={paginatedData} rowKeyField="id" />

            <Pagination
              currentPage={currentPage}
              totalItems={filteredData.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        </div>

        {/* ---------- RIGHT PANEL ---------- */}
        <div className="dashboard-right">

          {/* Donut chart */}
          <div className="dashboard-card dashboard-card--padded">
            <SectionHeader title="Application Process Overview" />
            <DonutChart
              data={CHART_DATA}
              centerValue={CHART_TOTAL}
              centerLabel="Total"
            />
          </div>

          {/* Tasks */}
          <div className="dashboard-card dashboard-card--padded">
            <SectionHeader title="Tasks" />
            <ul className="dashboard-tasks" role="list">
              {TASKS.map((task) => {
                const TaskIcon = iconMap[task.icon];
                return (
                  <li key={task.id} className="dashboard-task-item">
                    <span className="dashboard-task-icon" aria-hidden="true">
                      {TaskIcon && <TaskIcon size={16} strokeWidth={1.8} />}
                    </span>
                    <span className="dashboard-task-label">{task.label}</span>
                    <span className="dashboard-task-count">{task.count}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Alerts */}
          <div className="dashboard-card dashboard-card--padded">
            <SectionHeader title="Important Alerts" />
            <ul className="dashboard-alerts" role="list">
              {ALERTS.map((alert) => {
                const AlertIcon   = iconMap[alert.icon];
                const ChevronIcon = iconMap['ChevronRight'];
                return (
                  <li key={alert.id} className={`dashboard-alert-item dashboard-alert-item--${alert.severity}`}>
                    <span className="dashboard-alert-icon" aria-hidden="true">
                      {AlertIcon && <AlertIcon size={16} strokeWidth={2} />}
                    </span>
                    <span className="dashboard-alert-message">{alert.message}</span>
                    <span className="dashboard-alert-chevron" aria-hidden="true">
                      {ChevronIcon && <ChevronIcon size={14} strokeWidth={2} />}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}

export default Dashboard;
