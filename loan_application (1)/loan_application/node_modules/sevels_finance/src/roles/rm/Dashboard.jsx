import React, { useState } from "react";
import {
  Menu,
  Bell,
  ChevronDown,
  Home,
  ClipboardList,
  ShieldCheck,
  FileClock,
  User,
  LogOut,
  Headphones,
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
  BarChart2,
} from "lucide-react";
import "./Dashboard.css";

const navItems = [
  { icon: Home, label: "Dashboard", active: true },
  { icon: ClipboardList, label: "New Applications", badge: 24 },
  { icon: ShieldCheck, label: "Verified Applications" },
  { icon: FileClock, label: "Submission History" },
  { icon: User, label: "Profile" },
];

const statCards = [
  {
    icon: Users,
    iconBg: "#0f7a4c",
    value: 12,
    label: "Total Agents",
    sub: "Active agents under you",
    link: "+ 2 new this month",
    linkColor: "#0f7a4c",
    tint: "card-tint-green",
  },
  {
    icon: FileText,
    iconBg: "#2f8ef0",
    value: 24,
    label: "New Applications",
    sub: "New customers added",
    link: "View All",
    linkColor: "#2f8ef0",
    tint: "card-tint-blue",
    hasArrow: true,
  },
  {
    icon: Hourglass,
    iconBg: "#f5a524",
    value: 8,
    label: "Pending Verification",
    sub: "Waiting for your verification",
    link: "View All",
    linkColor: "#f5a524",
    tint: "card-tint-orange",
    hasArrow: true,
  },
  {
    icon: Send,
    iconBg: "#8b5cf6",
    value: 102,
    label: "Submitted to Back Office",
    sub: "Total applications submitted",
    link: "▲ 16 this week",
    linkColor: "#8b5cf6",
    tint: "card-tint-purple",
  },
  {
    icon: IndianRupee,
    iconBg: "#ef4444",
    value: 30,
    label: "Pending Collections",
    sub: "Loan pending collection",
    link: "View Details",
    linkColor: "#ef4444",
    tint: "card-tint-red",
    hasArrow: true,
  },
  {
    icon: UserCheck,
    iconBg: "#0f7a4c",
    value: 8,
    label: "Active Customers",
    sub: "Loan disbursed customers",
    link: "View Details",
    linkColor: "#0f7a4c",
    tint: "card-tint-green",
    hasArrow: true,
  },
];

const agentPerformance = [
  { name: "Thiru", totalCustomers: 15, pendingVerification: 3, submitted: 10, activeCustomers: 8, pendingCollection: 2 },
  { name: "Arun Kumar", totalCustomers: 12, pendingVerification: 2, submitted: 8, activeCustomers: 5, pendingCollection: 4 },
  { name: "Suresh B", totalCustomers: 10, pendingVerification: 1, submitted: 7, activeCustomers: 6, pendingCollection: 3 },
  { name: "Priya N", totalCustomers: 8, pendingVerification: 1, submitted: 5, activeCustomers: 3, pendingCollection: 1 },
  { name: "Kumaravel M", totalCustomers: 9, pendingVerification: 1, submitted: 6, activeCustomers: 4, pendingCollection: 2 },
];

const notifications = [
  { icon: UserCheck, iconBg: "#0f7a4c", title: "New customer added by Thiru", sub: "Customer: Ramesh Kumar", time: "10:35 AM" },
  { icon: UserCheck, iconBg: "#2f8ef0", title: "New customer added by Arun Kumar", sub: "Customer: Priya N", time: "10:22 AM" },
  { icon: Hourglass, iconBg: "#f5a524", title: "Aadhaar OTP expired", sub: "Customer: Mahesh Babu", time: "09:58 AM" },
  { icon: Send, iconBg: "#8b5cf6", title: "Application submitted to Back Office", sub: "Customer: Suresh B", time: "09:30 AM" },
  { icon: IndianRupee, iconBg: "#ef4444", title: "Collection overdue for 5 customers", sub: "Total overdue amount: ₹ 1,25,000", time: "09:10 AM" },
];

const pendingCollections = [
  { name: "Thiru", customersWithPending: 2, totalOverdue: "₹ 45,000", overdue30: 1 },
  { name: "Arun Kumar", customersWithPending: 4, totalOverdue: "₹ 60,000", overdue30: 2 },
  { name: "Suresh B", customersWithPending: 3, totalOverdue: "₹ 20,000", overdue30: 0 },
];

const statusSummary = [
  { label: "Approved (Disbursed)", value: 102, percent: 56, color: "#22b573" },
  { label: "Pending Verification", value: 8, percent: 4, color: "#2f8ef0" },
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

export default function Dashboard() {
  const [activePage, setActivePage] = useState(1);

  return (
    <div className="dash-root">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">S</div>
          <div className="logo-text">
            <span className="logo-title">SIVELS</span>
            <span className="logo-sub">FINANCE</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${item.active ? "nav-item-active" : ""}`}
            >
              <item.icon size={18} strokeWidth={2} />
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-divider" />

        <button className="nav-item nav-logout">
          <LogOut size={18} strokeWidth={2} />
          <span>Logout</span>
        </button>

        <div className="sidebar-help">
          <Headphones size={20} strokeWidth={1.8} />
          <span className="help-title">Need Help?</span>
          <a href="#" className="help-link">Contact Support</a>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-wrap">
        {/* Top bar */}
        <header className="topbar">
          <button className="icon-btn topbar-menu">
            <Menu size={20} />
          </button>
          <div className="topbar-right">
            <button className="icon-btn notif-btn">
              <Bell size={20} />
              <span className="notif-dot">0</span>
              <span className="notif-label">Notifications</span>
            </button>
            <div className="topbar-divider" />
            <div className="user-chip">
              <div className="avatar" />
              <div className="user-info">
                <span className="user-name">Ramesh Kumar</span>
                <span className="user-id">RM ID : RM0001</span>
              </div>
              <ChevronDown size={16} />
            </div>
          </div>
        </header>

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
                <MapPin size={16} className="meta-icon" />
                <div>
                  <span className="meta-label">Branch / Area</span>
                  <span className="meta-value">Chennai South</span>
                </div>
              </div>
              <div className="meta-item">
                <CalendarDays size={16} className="meta-icon" />
                <div>
                  <span className="meta-label">Today's Date</span>
                  <span className="meta-value">05 Jun 2025</span>
                </div>
              </div>
              <div className="meta-item">
                <Clock size={16} className="meta-icon" />
                <div>
                  <span className="meta-label">Last Login</span>
                  <span className="meta-value">Today, 09:15 AM</span>
                </div>
              </div>
            </div>

            <div className="filters">
              <button className="filter-select">
                All Agents <ChevronDown size={14} />
              </button>
              <button className="filter-select">
                05 Jun 2025 <Calendar size={14} />
              </button>
            </div>
          </div>

          {/* Stat cards */}
          <div className="stat-grid">
            {statCards.map((c) => (
              <div key={c.label} className={`stat-card ${c.tint}`}>
                <div className="stat-icon" style={{ background: c.iconBg }}>
                  <c.icon size={18} color="#fff" strokeWidth={2} />
                </div>
                <div className="stat-value">{c.value}</div>
                <div className="stat-label">{c.label}</div>
                <div className="stat-sub">{c.sub}</div>
                <a href="#" className="stat-link" style={{ color: c.linkColor }}>
                  {c.link} {c.hasArrow && <ChevronRight size={12} />}
                </a>
              </div>
            ))}
          </div>

          {/* Middle row: Agent performance + notifications */}
          <div className="two-col-row">
            <section className="panel agent-panel">
              <div className="panel-header">
                <h2>
                  <BarChart2 size={16} className="panel-header-icon" />
                  Agent Performance Overview
                </h2>
                <a href="#" className="panel-link">View All Agents</a>
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
                    {agentPerformance.map((row) => (
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
                          <button className="view-details-btn">View Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="table-footer">
                <span className="table-footer-note">Showing 1 to 5 of 12 agents</span>
                <div className="pagination">
                  <button className="page-arrow"><ChevronLeft size={14} /></button>
                  {[1, 2, 3].map((p) => (
                    <button
                      key={p}
                      className={`page-num ${activePage === p ? "page-num-active" : ""}`}
                      onClick={() => setActivePage(p)}
                    >
                      {p}
                    </button>
                  ))}
                  <button className="page-arrow"><ChevronRight size={14} /></button>
                </div>
              </div>
            </section>

            <section className="panel notif-panel">
              <div className="panel-header">
                <h2>Recent Notifications</h2>
                <a href="#" className="panel-link">View All</a>
              </div>
              <ul className="notif-list">
                {notifications.map((n, i) => (
                  <li key={i} className="notif-item">
                    <div className="notif-icon" style={{ background: n.iconBg }}>
                      <n.icon size={14} color="#fff" />
                    </div>
                    <div className="notif-body">
                      <span className="notif-title">{n.title}</span>
                      <span className="notif-sub">{n.sub}</span>
                    </div>
                    <span className="notif-time">{n.time}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Bottom row: Pending collections + status summary */}
          <div className="two-col-row">
            <section className="panel collections-panel">
              <div className="panel-header">
                <h2>Pending Collections Overview</h2>
                <a href="#" className="panel-link">View All Collections</a>
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
                        <td>{row.name}</td>
                        <td>{row.customersWithPending}</td>
                        <td className="text-danger-solid">{row.totalOverdue}</td>
                        <td>{row.overdue30}</td>
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
                        {s.value} ({s.percent}%)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="status-footer">
                <span>Total Applications</span>
                <span className="status-footer-value">
                  182 <ChevronRight size={14} />
                </span>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}