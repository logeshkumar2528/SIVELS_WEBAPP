import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import iconMap from '../../config/iconMap';
import StatCard from '../../components/StatCard/StatCard';
import DataTable from '../../components/DataTable/DataTable';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import {
  statCardsData,
  distributionData,
  monthlyEarningsData,
  recentActivityData,
  portfolioSummaryData,
  topInvestmentsData,
} from './dashboardData';
import './Dashboard.css';

export default function Dashboard() {
  const ChevronDown = iconMap['ChevronDown'];
  const Info = iconMap['Info'];

  const portfolioColumns = [
    { key: 'type', label: 'Loan Type' },
    { key: 'invested', label: 'Invested Amount' },
    { key: 'customers', label: 'Active Customers', align: 'center' },
    { key: 'interest', label: 'Interest Earned' },
    { key: 'roi', label: 'Weighted Avg ROI' },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const topInvestmentColumns = [
    { key: 'name', label: 'Customer Name' },
    { key: 'type', label: 'Loan Type' },
    { key: 'invested', label: 'My Allocation' },
    { key: 'interest', label: 'Interest Earned' },
    { key: 'roi', label: 'ROI (p.a.)' },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="dashboard-page">
      {/* 6 Top Stat Cards */}
      <div className="dashboard-stats-grid">
        {statCardsData.map((card, index) => (
          <StatCard key={index} {...card} />
        ))}
      </div>

      {/* 3 Column Charts & Activity Row */}
      <div className="dashboard-charts-grid">
        {/* Investment Distribution */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Investment Distribution</h3>
            {Info && <Info size={14} className="text-muted" />}
          </div>
          <div className="dashboard-chart-body">
            <div className="dashboard-pie-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    dataKey="value"
                    innerRadius={55}
                    outerRadius={80}
                    stroke="none"
                    paddingAngle={2}
                  >
                    {distributionData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="dashboard-pie-center">
                <span className="pie-center-val">₹ 10,00,000</span>
                <span className="pie-center-sub">Total Invested</span>
              </div>
            </div>
            <div className="dashboard-legend-list">
              {distributionData.map((d) => (
                <div key={d.name} className="legend-item">
                  <div className="legend-left">
                    <span className="legend-dot" style={{ background: d.color }} />
                    <div className="legend-info">
                      <span className="legend-name">{d.name}</span>
                      <span className="legend-val">₹ {d.value.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <span className="legend-pct">{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Interest Earnings */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Monthly Interest Earnings</h3>
            <button type="button" className="dashboard-filter-btn">
              This Year {ChevronDown && <ChevronDown size={14} />}
            </button>
          </div>
          <div className="dashboard-line-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyEarningsData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} tickFormatter={(v) => `₹ ${v}`} width={50} />
                <Tooltip formatter={(v) => [`₹ ${v.toLocaleString('en-IN')}`, 'Interest']} contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--color-primary)', strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Recent Activity</h3>
            <button type="button" className="dashboard-link-btn">View All</button>
          </div>
          <div className="dashboard-activity-list">
            {recentActivityData.map((a, i) => {
              const IconComp = iconMap[a.icon];
              return (
                <div key={i} className="activity-item">
                  <div className="activity-icon-wrap" style={{ background: a.bg }}>
                    {IconComp && <IconComp size={16} color={a.tint} />}
                  </div>
                  <div className="activity-body">
                    <div className="activity-title">{a.title}</div>
                    <div className="activity-desc">{a.desc}</div>
                  </div>
                  <div className="activity-time">{a.time}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="dashboard-tables-grid">
        <div className="dashboard-card">
          <h3 className="dashboard-card-title mb-3">Portfolio Summary by Loan Type</h3>
          <DataTable variant="plain" columns={portfolioColumns} data={portfolioSummaryData} />
        </div>

        <div className="dashboard-card">
          <h3 className="dashboard-card-title mb-3">Top Customer Investments</h3>
          <DataTable variant="plain" columns={topInvestmentColumns} data={topInvestmentsData} />
        </div>
      </div>
    </div>
  );
}
