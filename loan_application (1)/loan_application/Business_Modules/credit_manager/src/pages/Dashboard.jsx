import React from 'react';
import { Users, Hourglass, CheckCircle, RotateCcw, Eye, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const pieData = [
  { name: 'Pending Review', value: 12, color: '#f59e0b' },
  { name: 'Approved', value: 15, color: '#10b981' },
  { name: 'Rejected', value: 7, color: '#ef4444' },
  { name: 'Sent to Credit Head', value: 9, color: '#8b5cf6' },
];

const lineData = [
  { name: '05 Aug', uv: 6 },
  { name: '06 Aug', uv: 8 },
  { name: '07 Aug', uv: 7 },
  { name: '08 Aug', uv: 11 },
  { name: '09 Aug', uv: 4 },
  { name: '10 Aug', uv: 8 },
  { name: '11 Aug', uv: 10 },
];

const recentApps = [
  { id: 'APP-2026-00018', name: 'Karthik Kumar', amount: '₹ 5,00,000', date: '12 Aug 2026', stage: 'Pending Review', statusClass: 'status-pending' },
  { id: 'APP-2026-00017', name: 'Priya Natarajan', amount: '₹ 3,50,000', date: '12 Aug 2026', stage: 'Pending Review', statusClass: 'status-pending' },
  { id: 'APP-2026-00016', name: 'Suresh Babu', amount: '₹ 7,50,000', date: '11 Aug 2026', stage: 'Sent to Credit Head', statusClass: 'status-sent' },
  { id: 'APP-2026-00015', name: 'Meena Lakshmi', amount: '₹ 2,00,000', date: '11 Aug 2026', stage: 'Pending Review', statusClass: 'status-pending' },
  { id: 'APP-2026-00014', name: 'Rajeshwari R', amount: '₹ 4,00,000', date: '10 Aug 2026', stage: 'Pending Review', statusClass: 'status-pending' },
];

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      {/* Metric Cards */}
      <div className="metric-cards">
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#f3e8ff', color: '#8b5cf6' }}>
            <Users size={24} />
          </div>
          <div className="metric-info">
            <p className="metric-title">Received Applications</p>
            <h3 className="metric-value">18</h3>
            <p className="metric-trend text-green">
              <TrendingUp size={12} /> +18% vs yesterday
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#fef3c7', color: '#f59e0b' }}>
            <Hourglass size={24} />
          </div>
          <div className="metric-info">
            <p className="metric-title">Pending Review</p>
            <h3 className="metric-value">12</h3>
            <p className="metric-trend text-green">
              <TrendingUp size={12} /> +14% vs yesterday
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#d1fae5', color: '#10b981' }}>
            <CheckCircle size={24} />
          </div>
          <div className="metric-info">
            <p className="metric-title">Approved Applications</p>
            <h3 className="metric-value">15</h3>
            <p className="metric-trend text-green">
              <TrendingUp size={12} /> +20% vs last month
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}>
            <RotateCcw size={24} />
          </div>
          <div className="metric-info">
            <p className="metric-title">Rejected Applications</p>
            <h3 className="metric-value">07</h3>
            <p className="metric-trend text-green">
              <TrendingUp size={12} /> +9% vs last month
            </p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        <div className="chart-card pie-chart-card">
          <h3 className="chart-title">Application Status Overview</h3>
          <div className="pie-chart-container">
            <div className="pie-chart-wrapper">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="pie-chart-legend">
              {pieData.map((item, index) => (
                <div className="legend-item" key={index}>
                  <div className="legend-label">
                    <span className="legend-dot" style={{ backgroundColor: item.color }}></span>
                    {item.name}
                  </div>
                  <span className="legend-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-card line-chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Applications Received (Last 7 Days)</h3>
            <select className="chart-select">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="line-chart-wrapper">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="uv" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table Row */}
      <div className="table-card">
        <div className="table-header">
          <h3 className="table-title">Recent Applications</h3>
          <button className="btn-view-all">View All</button>
        </div>
        <div className="table-responsive">
          <table className="recent-table">
            <thead>
              <tr>
                <th>Application ID</th>
                <th>Customer Name</th>
                <th>Loan Amount</th>
                <th>Received Date</th>
                <th>Current Stage</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentApps.map((app, index) => (
                <tr key={index}>
                  <td className="font-medium">{app.id}</td>
                  <td>{app.name}</td>
                  <td>{app.amount}</td>
                  <td>{app.date}</td>
                  <td>
                    <span className={`status-badge ${app.statusClass}`}>{app.stage}</span>
                  </td>
                  <td>
                    <button className="btn-action">
                      <Eye size={16} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
