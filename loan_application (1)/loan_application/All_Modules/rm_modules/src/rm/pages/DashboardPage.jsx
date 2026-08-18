import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import {
  MapPin,
  CalendarDays,
  Clock,
  Calendar,
  Users,
  FileText,
  Hourglass,
  Send,
  IndianRupee,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  BarChart2,
  Contact,
  TrendingUp,
  Info
} from "lucide-react";

const statCards = [
  {
    icon: Users,
    iconBg: "#16a34a",
    value: 12,
    label: "Total Agents",
    sub: "Active agents under you",
    link: "↗ 2 new this month",
    linkColor: "#16a34a",
    tint: "card-tint-green",
  },
  {
    icon: FileText,
    iconBg: "#3b82f6",
    value: 24,
    label: "New Applications",
    sub: "New customers added",
    link: "View All >",
    linkColor: "#3b82f6",
    tint: "card-tint-blue",
  },
  {
    icon: Hourglass,
    iconBg: "#f5a524",
    value: 8,
    label: "Pending Verification",
    sub: "Waiting for your verification",
    link: "View All >",
    linkColor: "#f5a524",
    tint: "card-tint-orange",
  },
  {
    icon: Send,
    iconBg: "#a855f7",
    value: 102,
    label: "Submitted to Back Office",
    sub: "Total applications submitted",
    link: "↗ 16 this week",
    linkColor: "#a855f7",
    tint: "card-tint-purple",
  },
  {
    icon: IndianRupee,
    iconBg: "#ef4444",
    value: 30,
    label: "Pending Collections",
    sub: "Loan pending collection",
    link: "View Details >",
    linkColor: "#ef4444",
    tint: "card-tint-red",
  },
  {
    icon: UserCheck,
    iconBg: "#16a34a",
    value: 8,
    label: "Active Customers",
    sub: "Loan disbursed customers",
    link: "View Details >",
    linkColor: "#16a34a",
    tint: "card-tint-green",
  },
];

const agentPerformance = [
  { name: "Thiru", totalCustomers: 15, pendingVerification: 3, submitted: 10, activeCustomers: 8, pendingCollection: 2 },
  { name: "Arun Kumar", totalCustomers: 12, pendingVerification: 2, submitted: 8, activeCustomers: 5, pendingCollection: 4 },
  { name: "Suresh B", totalCustomers: 10, pendingVerification: 1, submitted: 7, activeCustomers: 6, pendingCollection: 3 },
  { name: "Priya N", totalCustomers: 8, pendingVerification: 1, submitted: 5, activeCustomers: 3, pendingCollection: 1 },
  { name: "Kumaravel M", totalCustomers: 9, pendingVerification: 1, submitted: 6, activeCustomers: 4, pendingCollection: 2 },
  { name: "Lakshmi S", totalCustomers: 18, pendingVerification: 4, submitted: 12, activeCustomers: 10, pendingCollection: 3 },
  { name: "Vignesh R", totalCustomers: 14, pendingVerification: 2, submitted: 9, activeCustomers: 7, pendingCollection: 2 },
  { name: "Meena D", totalCustomers: 11, pendingVerification: 3, submitted: 6, activeCustomers: 5, pendingCollection: 1 },
  { name: "Karthik P", totalCustomers: 20, pendingVerification: 5, submitted: 14, activeCustomers: 12, pendingCollection: 5 },
  { name: "Anita V", totalCustomers: 16, pendingVerification: 2, submitted: 11, activeCustomers: 9, pendingCollection: 3 },
  { name: "Ravi K", totalCustomers: 13, pendingVerification: 1, submitted: 9, activeCustomers: 8, pendingCollection: 2 },
  { name: "Deepa M", totalCustomers: 7, pendingVerification: 0, submitted: 4, activeCustomers: 3, pendingCollection: 1 },
];


const pendingCollections = [
  { name: "Thiru", customersWithPending: 2, totalOverdue: "₹ 45,000", overdue30: 1 },
  { name: "Arun Kumar", customersWithPending: 4, totalOverdue: "₹ 60,000", overdue30: 2 },
  { name: "Suresh B", customersWithPending: 3, totalOverdue: "₹ 20,000", overdue30: 0 },
];

const statusSummary = [
  { label: "Approved (Disbursed)", value: 102, percent: 56, color: "#16a34a" },
  { label: "Pending Verification", value: 8, percent: 4, color: "#3b82f6" },
  { label: "In Progress (BO)", value: 24, percent: 13, color: "#f5a524" },
  { label: "Rejected / Returned", value: 48, percent: 27, color: "#ef4444" },
];

function DonutChart({ data, total }) {
  const size = 130;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offsetAcc = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-svg">
      {data.map((slice, i) => {
        const dash = (slice.percent / 100) * circumference;
        const gap = circumference - dash;
        const rotation = (offsetAcc / 100) * 360 - 90;
        offsetAcc += slice.percent;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={slice.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${gap}`}
            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
            strokeLinecap="butt"
          />
        );
      })}
      <text x="50%" y="47%" textAnchor="middle" className="donut-total-label">
        Total
      </text>
      <text x="50%" y="63%" textAnchor="middle" className="donut-total-value">
        {total}
      </text>
    </svg>
  );
}

export default function DashboardPage({ onNavigate }) {
  const [activePage, setActivePage] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('2025-06-05');
  const [selectedAgent, setSelectedAgent] = useState(null);

  const formatDate = (dateStr) => {
    if(!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <main className="content">
      {/* Welcome row */}
      <div className="welcome-row">
        <div>
          <h1 className="welcome-title">
            Good Morning, Ramesh Kumar! <span className="wave">👋</span>
          </h1>
          <p className="welcome-sub">Here's what's happening in your area today.</p>
        </div>
      </div>

      <div className="meta-filter-row">
        <div className="meta-info">
          <div className="meta-item">
            <Contact size={20} className="meta-icon" />
            <div>
              <span className="meta-label">RM ID</span>
              <span className="meta-value">RM0001</span>
            </div>
          </div>
          <div className="meta-item">
            <MapPin size={20} className="meta-icon" />
            <div>
              <span className="meta-label">Branch / Area</span>
              <span className="meta-value">Chennai South</span>
            </div>
          </div>
          <div className="meta-item">
            <CalendarDays size={20} className="meta-icon" />
            <div>
              <span className="meta-label">Today's Date</span>
              <span className="meta-value">05 Jun 2025</span>
            </div>
          </div>
          <div className="meta-item">
            <Clock size={20} className="meta-icon" />
            <div>
              <span className="meta-label">Last Login</span>
              <span className="meta-value">Today, 09:15 AM</span>
            </div>
          </div>
        </div>

        <div className="filters" style={{ position: "relative" }}>
          <button className="filter-select">
            All Agents <ChevronDown size={14} />
          </button>
          <button className="filter-select" onClick={() => setShowDatePicker(!showDatePicker)}>
            {formatDate(selectedDate)} <Calendar size={14} />
          </button>

          {showDatePicker && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '8px',
              background: '#fff', border: '1px solid #edf0f2', borderRadius: '8px',
              padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#5b6472' }}>Select Date</div>
              <input 
                type="date" 
                style={{ width: '150px', padding: '8px 12px', border: '1px solid #edf0f2', borderRadius: '6px', fontSize: '13px', outline: 'none' }} 
                value={selectedDate} 
                onChange={e => { 
                  setSelectedDate(e.target.value); 
                  setShowDatePicker(false); 
                }} 
              />
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid-6">
        {statCards.map((c) => {
          const isViewAll = c.link.includes("View");
          return (
            <div key={c.label} className={`stat-card ${c.tint}`}>
              <div className="stat-card-top">
                <div className="stat-icon" style={{ background: c.iconBg }}>
                  <c.icon size={20} color="#fff" strokeWidth={2} />
                </div>
                <div className="stat-card-header-text">
                  <div className="stat-label">{c.label}</div>
                  <div className="stat-value">{c.value}</div>
                </div>
              </div>
              <div className="stat-sub">{c.sub}</div>
              <div className="stat-link-row">
                <a href="#" className="stat-link font-bold" style={{ color: c.linkColor }}>
                  {c.link.replace(" >", "")}
                </a>
                {isViewAll && (
                  <a href="#" className="stat-link-arrow" style={{ color: c.linkColor }}>
                    <ChevronRight size={14} strokeWidth={3} />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle row: Agent performance */}
      <div className="mt-4">
        <section className="panel agent-panel">
          <div className="panel-header">
            <h2>
              <BarChart2 size={16} className="panel-header-icon" />
              Agent Performance Overview
            </h2>
            <a href="#" onClick={(e) => { e.preventDefault(); if (onNavigate) onNavigate("my-agents"); }} className="panel-link font-bold">View All Agents</a>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent Name</th>
                  <th>Total Customers ⓘ</th>
                  <th>Pending Verification</th>
                  <th>Submitted</th>
                  <th>Active Customers ⓘ</th>
                  <th>Pending Collection</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {agentPerformance.slice((activePage - 1) * 5, activePage * 5).map((row) => (
                  <tr key={row.name}>
                    <td className="agent-name-cell">
                      <span className="avatar-sm" />
                      {row.name}
                    </td>
                    <td>{row.totalCustomers}</td>
                    <td className="text-warning">{row.pendingVerification}</td>
                    <td className="text-success">{row.submitted}</td>
                    <td className="text-success">{row.activeCustomers}</td>
                    <td className="text-danger">{row.pendingCollection}</td>
                    <td>
                      <button className="view-details-btn" onClick={() => setSelectedAgent(row)}>View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span className="table-footer-note">
              Showing {(activePage - 1) * 5 + 1} to {Math.min(activePage * 5, agentPerformance.length)} of {agentPerformance.length} agents
            </span>
            <div className="pagination">
              <button className="page-arrow" onClick={() => setActivePage(p => Math.max(1, p - 1))} disabled={activePage === 1}><ChevronLeft size={14} /></button>
              {Array.from({ length: Math.ceil(agentPerformance.length / 5) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`page-num ${activePage === p ? "page-num-active" : ""}`}
                  onClick={() => setActivePage(p)}
                >
                  {p}
                </button>
              ))}
              <button className="page-arrow" onClick={() => setActivePage(p => Math.min(Math.ceil(agentPerformance.length / 5), p + 1))} disabled={activePage === Math.ceil(agentPerformance.length / 5)}><ChevronRight size={14} /></button>
            </div>
          </div>
        </section>


      </div>

      {/* Bottom row: Pending collections + status summary */}
      <div className="two-col-row mt-4">
        <section className="panel collections-panel">
          <div className="panel-header">
            <h2>
              <IndianRupee size={16} className="panel-header-icon" />
              Pending Collections Overview
            </h2>
            <a href="#" className="panel-link font-bold">View All Collections</a>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent Name</th>
                  <th>Customers with Pending</th>
                  <th>Total Overdue Amount</th>
                  <th>Overdue &gt; 30 Days</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingCollections.map((row) => (
                  <tr key={row.name}>
                    <td className="font-bold text-dark">{row.name}</td>
                    <td>{row.customersWithPending}</td>
                    <td className="text-danger-solid">{row.totalOverdue}</td>
                    <td className="font-bold text-dark">{row.overdue30}</td>
                    <td>
                      <button className="view-details-btn">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel status-panel">
          <div className="panel-header">
            <h2>Application Status Summary</h2>
          </div>
          <div className="status-body">
            <DonutChart data={statusSummary} total={182} />
            <ul className="status-legend">
              {statusSummary.map((s) => (
                <li key={s.label}>
                  <span className="legend-dot" style={{ background: s.color }} />
                  <span className="legend-label">{s.label}</span>
                  <span className="legend-value">
                    {s.value} <span className="text-muted text-xs">({s.percent}%)</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="status-footer mt-4">
            <span className="text-muted">Total Applications</span>
            <span className="status-footer-value font-bold text-dark flex-align-center gap-1">
              182 <ChevronRight size={14} className="text-muted" />
            </span>
          </div>
        </section>
      </div>
      {/* Agent Details Modal */}
      <Modal show={!!selectedAgent} onHide={() => setSelectedAgent(null)} centered size="md">
        <div style={{ padding: "24px", position: "relative" }}>
          <button 
            onClick={() => setSelectedAgent(null)} 
            style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#8a94a6" }}
          >
            ×
          </button>
          
          <div className="flex-col-center text-center" style={{ marginBottom: "24px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#dde9e2", border: "2px solid #0f7a4c", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={32} color="#0f7a4c" />
            </div>
            <h2 className="font-bold text-dark" style={{ fontSize: "20px", margin: "0 0 4px" }}>
              {selectedAgent?.name}
            </h2>
            <div className="text-muted" style={{ fontSize: "12px" }}>
              Agent Performance Overview
            </div>
          </div>
          
          <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#5b6472", fontWeight: 600, marginBottom: "4px" }}>Total Customers</div>
              <div className="font-bold text-dark" style={{ fontSize: "16px" }}>{selectedAgent?.totalCustomers}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#5b6472", fontWeight: 600, marginBottom: "4px" }}>Submitted</div>
              <div className="font-bold text-success" style={{ fontSize: "16px" }}>{selectedAgent?.submitted}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#5b6472", fontWeight: 600, marginBottom: "4px" }}>Pending Verification</div>
              <div className="font-bold text-warning" style={{ fontSize: "16px" }}>{selectedAgent?.pendingVerification}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#5b6472", fontWeight: 600, marginBottom: "4px" }}>Active Customers</div>
              <div className="font-bold text-success" style={{ fontSize: "16px" }}>{selectedAgent?.activeCustomers}</div>
            </div>
            <div style={{ gridColumn: "span 2", borderTop: "1px solid #edf0f2", paddingTop: "12px", marginTop: "4px" }}>
              <div style={{ fontSize: "11px", color: "#5b6472", fontWeight: 600, marginBottom: "4px" }}>Pending Collection</div>
              <div className="font-bold text-danger" style={{ fontSize: "16px" }}>{selectedAgent?.pendingCollection}</div>
            </div>
          </div>
          
          <button 
            className="btn-primary w-100" 
            style={{ marginTop: "24px", justifyContent: "center" }}
            onClick={() => setSelectedAgent(null)}
          >
            Close Details
          </button>
        </div>
      </Modal>
    </main>
  );
}
