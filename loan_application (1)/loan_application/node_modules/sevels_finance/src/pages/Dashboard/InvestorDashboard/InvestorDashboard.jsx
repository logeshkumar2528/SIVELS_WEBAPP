import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Landmark,
  TrendingUp,
  Wallet,
  ShieldCheck,
  ArrowUpRight,
  Download,
  RefreshCw,
  Search,
  Bell,
  LogOut,
  HelpCircle,
  CheckCircle2,
  DollarSign,
  PieChart,
  Layers,
  Calendar,
  ChevronRight,
  Plus,
  FileText,
  X,
} from "lucide-react";
import "./InvestorDashboard.css";

// Sivels Finance NBFC — Investor Dashboard Console
// Isolated view for HNIs, Institutional Lenders & Capital Partners

// Same collapse-toggle glyph used on the Customer & Admin Dashboard sidebars.
const SidebarLayoutIcon = ({ size = 20, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="18" height="18" rx="4" ry="4" />
    <line x1="14" y1="3" x2="14" y2="21" />
    <line x1="16.5" y1="8" x2="18.5" y2="8" strokeWidth="2.5" />
    <line x1="16.5" y1="12" x2="18.5" y2="12" strokeWidth="2.5" />
    <line x1="16.5" y1="16" x2="18.5" y2="16" strokeWidth="2.5" />
  </svg>
);

const navItems = [
  { icon: Layers, label: "Overview", view: "overview" },
  { icon: Wallet, label: "My Capital", view: "myCapital" },
  { icon: Calendar, label: "Payout Schedule", view: "payoutSchedule" },
  { icon: FileText, label: "Tax & Statements", view: "taxStatements" },
];

const sectionInfo = {
  overview: { title: "Investor Overview", sub: "Institutional Capital & Yield Console" },
  myCapital: { title: "My Capital", sub: "Deployed capital across active loan pools" },
  payoutSchedule: { title: "Payout Schedule", sub: "Monthly interest & principal cash flow" },
  taxStatements: { title: "Tax & Statements", sub: "Ledger, payouts & downloadable statements" },
};

const investorMetrics = {
  totalCapital: 25000000, // ₹2.50 Cr
  activeDeployed: 21500000, // ₹2.15 Cr
  walletBalance: 3500000, // ₹35 Lakhs
  annualizedYield: 14.5, // 14.5% XIRR
  mtdInterest: 258000, // ₹2.58 Lakhs
  lifetimePayout: 1845000, // ₹18.45 Lakhs
  fldgProtection: 100, // 100% principal protected
};

const payoutScheduleData = [
  { month: "Feb '25", principal: 150000, interest: 245000, total: 395000 },
  { month: "Mar '25", principal: 180000, interest: 252000, total: 432000 },
  { month: "Apr '25", principal: 210000, interest: 258000, total: 468000 },
  { month: "May '25", principal: 195000, interest: 260000, total: 455000 },
  { month: "Jun '25", principal: 230000, interest: 265000, total: 495000 },
  { month: "Jul '25", principal: 250000, interest: 270000, total: 520000 },
];

const trancheAllocation = [
  { name: "Senior Secured Pool (A+)", value: 50, amount: "₹1.07 Cr", yieldRate: "12.8% p.a.", color: "#10b981" },
  { name: "MSME Growth Pool (A)", value: 30, amount: "₹64.5 Lakhs", yieldRate: "15.2% p.a.", color: "#3b82f6" },
  { name: "Microfinance High-Yield Pool (BBB)", value: 20, amount: "₹43.0 Lakhs", yieldRate: "17.5% p.a.", color: "#f59e0b" },
];

const recentTransactions = [
  { id: "TX-9921", date: "Jul 28, 2026", type: "Monthly Interest Payout", pool: "Senior Secured Pool", amount: "+ ₹1,42,500", status: "Completed" },
  { id: "TX-9844", date: "Jul 15, 2026", type: "Capital Injection", pool: "Wallet Balance", amount: "+ ₹10,00,000", status: "Completed" },
  { id: "TX-9712", date: "Jul 05, 2026", type: "Principal Redemption", pool: "MSME Growth Pool", amount: "+ ₹2,10,000", status: "Completed" },
  { id: "TX-9601", date: "Jun 28, 2026", type: "Monthly Interest Payout", pool: "Senior Secured Pool", amount: "+ ₹1,38,000", status: "Completed" },
  { id: "TX-9520", date: "Jun 12, 2026", type: "Auto-Reinvestment", pool: "Microfinance Pool", amount: "- ₹1,50,000", status: "Completed" },
];

export default function InvestorDashboard() {
  const [autoReinvest, setAutoReinvest] = useState(true);
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [investAmount, setInvestAmount] = useState("500000");
  const [selectedPool, setSelectedPool] = useState("Senior Secured Pool (A+)");
  const [activeView, setActiveView] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="idash-shell">
      {/* Sidebar Navigation */}
      <aside className={`idash-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="idash-brand">
          {/* Left side intentionally left empty — drop your company logo/icon here */}
          <div className="idash-brand-logo-slot" />

          <button
            className="idash-sidebar-toggle"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <SidebarLayoutIcon size={20} />
          </button>
        </div>

        <nav className="idash-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={activeView === item.view ? "idash-nav-btn active" : "idash-nav-btn"}
                onClick={() => setActiveView(item.view)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={18} strokeWidth={1.8} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="idash-sidebar-footer">
          <button className="idash-nav-btn" title={sidebarCollapsed ? "Log Out" : undefined}>
            <LogOut size={18} strokeWidth={1.8} />
            {!sidebarCollapsed && <span>Log Out</span>}
          </button>
          <button className="idash-nav-btn" title={sidebarCollapsed ? "Investor Support" : undefined}>
            <HelpCircle size={18} strokeWidth={1.8} />
            {!sidebarCollapsed && <span>Investor Support</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="idash-main">
        {/* Topbar Header */}
        <header className="idash-topbar">
          <div className="idash-topbar-title">
            <h1>{sectionInfo[activeView].title}</h1>
            <p>{sectionInfo[activeView].sub}</p>
          </div>

          <div className="idash-topbar-actions">
            <div className="idash-user-profile">
              <div className="idash-avatar">AC</div>
              <div>
                <p className="idash-user-name">Apex Capital Partners</p>
                <p className="idash-user-role">ID: INV-99214</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content Grid */}
        <div className="idash-content">
          {/* Hero Metrics Row — Overview & My Capital */}
          {(activeView === "overview" || activeView === "myCapital") && (
          <div className="idash-hero-grid">
            <div className="idash-hero-card highlight">
              <div className="idash-hero-header">
                <span className="idash-hero-title">Total Portfolio Value</span>
                <div className="idash-hero-icon-wrapper">
                  <Landmark size={18} />
                </div>
              </div>
              <p className="idash-hero-val">₹{(investorMetrics.totalCapital / 10000000).toFixed(2)} Cr</p>
              <span className="idash-hero-sub">
                <span className="idash-trend-up">+12.4% YTD</span> vs initial deposit
              </span>
            </div>

            <div className="idash-hero-card">
              <div className="idash-hero-header">
                <span className="idash-hero-title">Active Deployed</span>
                <div className="idash-hero-icon-wrapper">
                  <TrendingUp size={18} />
                </div>
              </div>
              <p className="idash-hero-val">₹{(investorMetrics.activeDeployed / 10000000).toFixed(2)} Cr</p>
              <span className="idash-hero-sub">Earning interest across 3 pools</span>
            </div>

            {activeView === "overview" && (
            <div className="idash-hero-card">
              <div className="idash-hero-header">
                <span className="idash-hero-title">Portfolio Net Yield</span>
                <div className="idash-hero-icon-wrapper">
                  <DollarSign size={18} />
                </div>
              </div>
              <p className="idash-hero-val">{investorMetrics.annualizedYield}% <small style={{ fontSize: "0.9rem", color: "#10b981" }}>XIRR</small></p>
              <span className="idash-hero-sub">Blended net annualized return</span>
            </div>
            )}

            <div className="idash-hero-card">
              <div className="idash-hero-header">
                <span className="idash-hero-title">Unallocated Cash</span>
                <div className="idash-hero-icon-wrapper">
                  <Wallet size={18} />
                </div>
              </div>
              <p className="idash-hero-val">₹{(investorMetrics.walletBalance / 100000).toFixed(1)} L</p>
              <span className="idash-hero-sub">Ready for deployment</span>
            </div>
          </div>
          )}
          {/* Extra payout stats — Payout Schedule only */}
          {activeView === "payoutSchedule" && (
          <div className="idash-hero-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <div className="idash-hero-card highlight">
              <div className="idash-hero-header">
                <span className="idash-hero-title">MTD Interest Earned</span>
                <div className="idash-hero-icon-wrapper">
                  <DollarSign size={18} />
                </div>
              </div>
              <p className="idash-hero-val">₹{(investorMetrics.mtdInterest / 1000).toFixed(1)} K</p>
              <span className="idash-hero-sub">Accrued so far this month</span>
            </div>
            <div className="idash-hero-card">
              <div className="idash-hero-header">
                <span className="idash-hero-title">Lifetime Payout</span>
                <div className="idash-hero-icon-wrapper">
                  <ArrowUpRight size={18} />
                </div>
              </div>
              <p className="idash-hero-val">₹{(investorMetrics.lifetimePayout / 100000).toFixed(2)} L</p>
              <span className="idash-hero-sub">Total interest + principal received</span>
            </div>
          </div>
          )}

          {/* Charts Row — Overview shows both side by side; My Capital / Payout Schedule show their own card full-width */}
          {activeView === "overview" && (
          <div className="idash-main-grid">
            {/* Monthly Payout Timeline */}
            <div className="idash-card">
              <div className="idash-card-title-bar">
                <h2>
                  <Calendar size={18} style={{ color: "#10b981" }} /> Payout &amp; Cash Flow Projection
                </h2>
                <span className="idash-chip green">Monthly Interest + Principal</span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={payoutScheduleData}>
                  <defs>
                    <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f192e",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      color: "#fff",
                    }}
                  />
                  <Area type="monotone" dataKey="interest" name="Interest Payout (₹)" stroke="#10b981" fillOpacity={1} fill="url(#colorInterest)" strokeWidth={2} />
                  <Area type="monotone" dataKey="principal" name="Principal Return (₹)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPrincipal)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Tranche Allocation & Security */}
            <div className="idash-card">
              <div className="idash-card-title-bar">
                <h2>
                  <PieChart size={18} style={{ color: "#3b82f6" }} /> Asset Tranches
                </h2>
                <span className="idash-chip">Risk Rating</span>
              </div>

              <div className="idash-tranche-list">
                {trancheAllocation.map((item) => (
                  <div className="idash-tranche-item" key={item.name}>
                    <div className="idash-tranche-info">
                      <div className="idash-tranche-dot" style={{ backgroundColor: item.color }} />
                      <div>
                        <p className="idash-tranche-name">{item.name}</p>
                        <p className="idash-tranche-desc">{item.amount} allocated</p>
                      </div>
                    </div>
                    <div className="idash-tranche-val">
                      <p className="idash-tranche-amount">{item.value}%</p>
                      <p className="idash-tranche-yield">{item.yieldRate}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={16} style={{ color: "#10b981" }} /> FLDG Protection Cover
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#10b981" }}>100% Protected</span>
              </div>
            </div>
          </div>
          )}

          {activeView === "payoutSchedule" && (
            <div className="idash-card">
              <div className="idash-card-title-bar">
                <h2>
                  <Calendar size={18} style={{ color: "#10b981" }} /> Payout &amp; Cash Flow Projection
                </h2>
                <span className="idash-chip green">Monthly Interest + Principal</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={payoutScheduleData}>
                  <defs>
                    <linearGradient id="colorInterest2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorPrincipal2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f192e",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      color: "#fff",
                    }}
                  />
                  <Area type="monotone" dataKey="interest" name="Interest Payout (₹)" stroke="#10b981" fillOpacity={1} fill="url(#colorInterest2)" strokeWidth={2} />
                  <Area type="monotone" dataKey="principal" name="Principal Return (₹)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPrincipal2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeView === "myCapital" && (
            <div className="idash-card">
              <div className="idash-card-title-bar">
                <h2>
                  <PieChart size={18} style={{ color: "#3b82f6" }} /> Asset Tranches
                </h2>
                <span className="idash-chip">Risk Rating</span>
              </div>

              <div className="idash-tranche-list">
                {trancheAllocation.map((item) => (
                  <div className="idash-tranche-item" key={item.name}>
                    <div className="idash-tranche-info">
                      <div className="idash-tranche-dot" style={{ backgroundColor: item.color }} />
                      <div>
                        <p className="idash-tranche-name">{item.name}</p>
                        <p className="idash-tranche-desc">{item.amount} allocated</p>
                      </div>
                    </div>
                    <div className="idash-tranche-val">
                      <p className="idash-tranche-amount">{item.value}%</p>
                      <p className="idash-tranche-yield">{item.yieldRate}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={16} style={{ color: "#10b981" }} /> FLDG Protection Cover
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#10b981" }}>100% Protected</span>
              </div>
            </div>
          )}

          {/* Transactions & Statement Table — Overview & Tax/Statements */}
          {(activeView === "overview" || activeView === "taxStatements") && (
          <div className="idash-card">
            <div className="idash-card-title-bar">
              <h2>
                <FileText size={18} style={{ color: "#f59e0b" }} /> Recent Investor Ledger &amp; Payouts
              </h2>
              <button className="idash-btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
                <Download size={14} /> Download Statement
              </button>
            </div>

            <div className="idash-table-container">
              <table className="idash-table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Date</th>
                    <th>Transaction Type</th>
                    <th>Pool / Source</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td style={{ fontWeight: 600, color: "#ffffff" }}>{tx.id}</td>
                      <td>{tx.date}</td>
                      <td>{tx.type}</td>
                      <td style={{ color: "#94a3b8" }}>{tx.pool}</td>
                      <td style={{ fontWeight: 700, color: tx.amount.startsWith("+") ? "#10b981" : "#3b82f6" }}>
                        {tx.amount}
                      </td>
                      <td>
                        <span className="idash-status-pill completed">
                          <CheckCircle2 size={12} /> {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Deploy Capital Modal */}
      {showInvestModal && (
        <div className="idash-modal-overlay">
          <div className="idash-modal">
            <div className="idash-modal-header">
              <h3>Deploy Additional Capital</h3>
              <button className="idash-close-btn" onClick={() => setShowInvestModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="idash-form-group">
              <label>Select Target Loan Pool</label>
              <select value={selectedPool} onChange={(e) => setSelectedPool(e.target.value)}>
                <option value="Senior Secured Pool (A+)">Senior Secured Pool (A+) — 12.8% p.a.</option>
                <option value="MSME Growth Pool (A)">MSME Growth Pool (A) — 15.2% p.a.</option>
                <option value="Microfinance Pool (BBB)">Microfinance Pool (BBB) — 17.5% p.a.</option>
              </select>
            </div>

            <div className="idash-form-group">
              <label>Investment Amount (₹)</label>
              <input
                type="number"
                value={investAmount}
                onChange={(e) => setInvestAmount(e.target.value)}
                placeholder="Enter amount in ₹"
              />
            </div>

            <div className="idash-form-group">
              <label>Source Account</label>
              <select>
                <option>Wallet Balance (₹35.0 Lakhs available)</option>
                <option>HDFC Bank - Net Banking (•••• 4821)</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button
                className="idash-btn-secondary"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setShowInvestModal(false)}
              >
                Cancel
              </button>
              <button
                className="idash-btn-primary"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => {
                  alert(`Successfully initiated deployment of ₹${Number(investAmount).toLocaleString("en-IN")} into ${selectedPool}!`);
                  setShowInvestModal(false);
                }}
              >
                Confirm Investment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}