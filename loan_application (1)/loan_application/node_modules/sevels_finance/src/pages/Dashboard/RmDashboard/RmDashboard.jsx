import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  LayoutDashboard,
  Users,
  PhoneCall,
  ShieldCheck,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Bell,
  LogOut,
  HelpCircle,
  UserCheck,
  ChevronRight,
  Phone,
  ArrowRight,
  X,
  Building2,
  Share2,
  Sun,
  Moon,
} from "lucide-react";
import "./RmDashboard.css";

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

// Sivels Finance NBFC — Relationship Manager (RM) Console
// Implements Step 3 (Call & Aadhaar OTP e-KYC) and Step 6 (Share Eligibility to Agent)

const navItems = [
  { key: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { key: "queue", icon: Users, label: "Verification Queue" },
  { key: "dispatch", icon: Share2, label: "Eligibility Dispatch" },
  { key: "agents", icon: UserCheck, label: "My Field Agents" },
  { key: "sla", icon: Clock, label: "SLA Tracker" },
];

const rmMetrics = {
  pendingVerification: 6,
  submittedToBackOffice: 14,
  avgSlaMinutes: 18,
  managedAgentsCount: 5,
};

// Incoming leads from Agents awaiting Step 3 RM Tele-call & Aadhaar e-KYC
const verificationQueue = [
  { id: "LA-2299", customer: "K. Selvam", agent: "Manikandan (AG-0142)", phone: "+91 98401 22910", amount: "₹1,20,000", callDone: true, aadhaarOtpDone: false, status: "e-KYC Pending" },
  { id: "LA-2298", customer: "R. Priyadarshini", agent: "Deepak (AG-0118)", phone: "+91 97102 44102", amount: "₹2,50,000", callDone: false, aadhaarOtpDone: false, status: "Call Pending" },
  { id: "LA-2295", customer: "M. Ganesan", agent: "Karthik (AG-0155)", phone: "+91 94441 88920", amount: "₹90,000", callDone: true, aadhaarOtpDone: true, status: "Submitted to Back Office" },
  { id: "LA-2292", customer: "V. Lakshmi", agent: "Manikandan (AG-0142)", phone: "+91 98842 11094", amount: "₹1,80,000", callDone: true, aadhaarOtpDone: false, status: "e-KYC Pending" },
];

// Back Office Eligibility Results awaiting Step 6 RM Dispatch to Agent
const eligibilityDispatch = [
  { id: "LA-2290", customer: "S. Murugan", agent: "Manikandan (AG-0142)", requested: "₹1,00,000", approved: "₹50,000", cibil: 450, status: "Ready to Dispatch" },
  { id: "LA-2287", customer: "A. Farooq", agent: "Karthik (AG-0155)", requested: "₹2,00,000", approved: "₹1,50,000", cibil: 710, status: "Ready to Dispatch" },
  { id: "LA-2284", customer: "T. Kavitha", agent: "Deepak (AG-0118)", requested: "₹75,000", approved: "₹75,000", cibil: 740, status: "Dispatched to Agent" },
];

const agentProductivity = [
  { agent: "Manikandan", sourced: 14, verified: 12 },
  { agent: "Deepak", sourced: 10, verified: 9 },
  { agent: "Karthik", sourced: 8, verified: 7 },
  { agent: "Suresh", sourced: 6, verified: 5 },
];

// Hero metric cards, tagged with which tab(s) they should appear under
const heroCards = [
  { key: "pending", tabs: ["dashboard", "queue"], title: "Pending Verification", icon: PhoneCall, value: rmMetrics.pendingVerification, sub: "Leads awaiting call & OTP", variant: "purple" },
  { key: "submitted", tabs: ["dashboard", "dispatch"], title: "Submitted to Back Office", icon: Building2, value: rmMetrics.submittedToBackOffice, sub: "Passed to underwriting today" },
  { key: "sla", tabs: ["dashboard", "sla"], title: "Avg Verification SLA", icon: Clock, value: rmMetrics.avgSlaMinutes, suffix: "mins", sub: "Lead arrival to submission" },
  { key: "agents", tabs: ["dashboard", "agents"], title: "Assigned Field Agents", icon: Users, value: rmMetrics.managedAgentsCount, sub: "Active sourcing agents" },
];

export default function RmDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [theme, setTheme] = useState("light");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  const handleOpenOtpModal = (lead) => {
    setSelectedLead(lead);
    setOtpCode("");
    setOtpVerified(false);
    setShowOtpModal(true);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const visibleHeroCards = heroCards.filter((c) => c.tabs.includes(activeTab));
  const showVerificationBanner = activeTab === "dashboard" || activeTab === "queue";
  const showQueueTable = activeTab === "dashboard" || activeTab === "queue";
  const showAgentChart = activeTab === "dashboard" || activeTab === "agents";
  const showDispatchBoard = activeTab === "dashboard" || activeTab === "dispatch";

  const queueTableCard = (
    <div className="rdash-card">
      <div className="rdash-card-head">
        <h3>
          <UserCheck size={18} style={{ color: "var(--rdash-accent-primary)" }} /> RM Verification Queue
        </h3>
      </div>

      <div className="rdash-table-container">
        <table className="rdash-table">
          <thead>
            <tr>
              <th>Lead ID</th>
              <th>Customer Name</th>
              <th>Agent</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {verificationQueue.map((row) => (
              <tr key={row.id}>
                <td style={{ fontWeight: 600, color: "var(--rdash-text-primary)" }}>{row.id}</td>
                <td>{row.customer}</td>
                <td style={{ color: "var(--rdash-text-muted)" }}>{row.agent}</td>
                <td>{row.amount}</td>
                <td>
                  <span
                    className={`rdash-badge ${
                      row.status.includes("Submitted")
                        ? "submitted"
                        : row.status.includes("Pending")
                        ? "pending"
                        : "verified"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                <td>
                  <button
                    className="rdash-action-btn"
                    onClick={() => handleOpenOtpModal(row)}
                  >
                    <Phone size={13} /> Verify
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const agentChartCard = (
    <div className="rdash-card">
      <div className="rdash-card-head">
        <h3>Agent Lead Conversion</h3>
      </div>

      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={agentProductivity}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--rdash-card-border)" vertical={false} />
          <XAxis dataKey="agent" stroke="var(--rdash-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--rdash-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--rdash-card-bg)",
              borderColor: "var(--rdash-card-border)",
              borderRadius: 10,
              color: "var(--rdash-text-primary)",
            }}
          />
          <Bar dataKey="sourced" fill="var(--rdash-accent-secondary)" name="Sourced" radius={[4, 4, 0, 0]} />
          <Bar dataKey="verified" fill="var(--rdash-accent-primary)" name="RM Verified" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className={`rdash-shell ${theme === "dark" ? "rdash-theme-dark" : ""}`}>
      {/* Sidebar */}
      <aside className={`rdash-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <button
          className="rdash-sidebar-toggle"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label="Toggle Sidebar"
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <SidebarLayoutIcon size={20} />
        </button>

        <nav className="rdash-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={activeTab === item.key ? "rdash-nav-btn active" : "rdash-nav-btn"}
                onClick={() => setActiveTab(item.key)}
              >
                <Icon size={18} strokeWidth={1.8} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="rdash-sidebar-footer">
          <button className="rdash-nav-btn">
            <LogOut size={18} strokeWidth={1.8} />
            {!sidebarCollapsed && <span>Log Out</span>}
          </button>
          <button className="rdash-nav-btn">
            <HelpCircle size={18} strokeWidth={1.8} />
            {!sidebarCollapsed && <span>RM Guidelines</span>}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="rdash-main">
        {/* Topbar Header */}
        <header className="rdash-topbar">
          <div className="rdash-topbar-title">
            <h1>Relationship Manager Console</h1>
            <p>Verification, e-KYC &amp; Eligibility Dispatch</p>
          </div>

          <div className="rdash-topbar-actions">
            <button
              className="rdash-theme-toggle-btn"
              onClick={toggleTheme}
              title="Toggle Theme (Light / Dark)"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <div className="rdash-user-profile">
              <div className="rdash-avatar">RM</div>
              <div>
                <p className="rdash-user-name">Rajesh Kumar</p>
                <p className="rdash-user-role">RM ID: RM-0082</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="rdash-content">
          {/* Hero Metrics — filtered to whichever apply to the active tab */}
          {visibleHeroCards.length > 0 && (
            <div
              className="rdash-hero-grid"
              style={{ gridTemplateColumns: `repeat(${visibleHeroCards.length}, 1fr)` }}
            >
              {visibleHeroCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.key} className={`rdash-hero-card ${card.variant || ""}`}>
                    <div className="rdash-hero-header">
                      <span className="rdash-hero-title">{card.title}</span>
                      <div className="rdash-hero-icon-wrapper">
                        <Icon size={18} />
                      </div>
                    </div>
                    <p className="rdash-hero-val">
                      {card.value}
                      {card.suffix && (
                        <small style={{ fontSize: "0.9rem", color: "var(--rdash-accent-primary)", marginLeft: 4 }}>
                          {card.suffix}
                        </small>
                      )}
                    </p>
                    <span className="rdash-hero-sub">{card.sub}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Action Verification Card */}
          {showVerificationBanner && (
            <div className="rdash-verification-card">
              <div className="rdash-card-head">
                <h3>
                  <PhoneCall size={18} style={{ color: "var(--rdash-accent-primary)" }} /> Active Tele-Verification &amp; e-KYC
                </h3>
                <span className="rdash-step-badge">Tele-KYC Active</span>
              </div>

              <div className="rdash-verification-grid">
                <div className="rdash-applicant-box">
                  <div className="rdash-applicant-avatar">KS</div>
                  <div>
                    <p className="rdash-applicant-name">K. Selvam — LA-2299</p>
                    <p className="rdash-applicant-sub">
                      Requested: <strong>₹1,20,000</strong> · Sourced by Manikandan (AG-0142)
                    </p>
                  </div>
                </div>

                <div className="rdash-status-box">
                  <div className="rdash-status-row">
                    <CheckCircle2 size={15} style={{ color: "#10b981" }} /> Voice Call: Intent Confirmed
                  </div>
                  <div className="rdash-status-row">
                    <AlertCircle size={15} style={{ color: "#f59e0b" }} /> Aadhaar OTP: Pending Verification
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Verification Queue & Agent Chart — shown together on Dashboard, standalone on their own tabs */}
          {activeTab === "dashboard" && showQueueTable && showAgentChart && (
            <div className="rdash-main-grid">
              {queueTableCard}
              {agentChartCard}
            </div>
          )}
          {activeTab !== "dashboard" && showQueueTable && queueTableCard}
          {activeTab !== "dashboard" && showAgentChart && agentChartCard}

          {/* Eligibility Dispatch Board */}
          {showDispatchBoard && (
            <div className="rdash-card">
              <div className="rdash-card-head">
                <h3>
                  <Share2 size={18} style={{ color: "var(--rdash-accent-green)" }} /> Eligibility Dispatch to Agent
                </h3>
                <span className="rdash-step-badge">Back Office Approved</span>
              </div>

              <div className="rdash-table-container">
                <table className="rdash-table">
                  <thead>
                    <tr>
                      <th>Lead ID</th>
                      <th>Customer Name</th>
                      <th>Agent</th>
                      <th>Requested</th>
                      <th>Back Office Sanction</th>
                      <th>CIBIL Score</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibilityDispatch.map((row) => (
                      <tr key={row.id}>
                        <td style={{ fontWeight: 600, color: "var(--rdash-text-primary)" }}>{row.id}</td>
                        <td>{row.customer}</td>
                        <td style={{ color: "var(--rdash-text-muted)" }}>{row.agent}</td>
                        <td style={{ textDecoration: "line-through", color: "var(--rdash-text-muted)" }}>{row.requested}</td>
                        <td style={{ fontWeight: 700, color: "var(--rdash-accent-green)" }}>{row.approved}</td>
                        <td>
                          <span style={{ fontWeight: 600, color: row.cibil >= 700 ? "var(--rdash-accent-green)" : "var(--rdash-accent-amber)" }}>
                            {row.cibil}
                          </span>
                        </td>
                        <td>
                          <button
                            className="rdash-btn-purple"
                            style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                            onClick={() => alert(`Eligibility of ${row.approved} dispatched to Agent ${row.agent} for ${row.customer}!`)}
                          >
                            <Send size={13} /> Share with Agent
                          </button>
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

      {/* Aadhaar OTP e-KYC Modal */}
      {showOtpModal && selectedLead && (
        <div className="rdash-modal-overlay">
          <div className="rdash-modal">
            <div className="rdash-modal-header">
              <h3>Aadhaar OTP e-KYC Verification</h3>
              <button className="rdash-close-btn" onClick={() => setShowOtpModal(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--rdash-text-muted)", marginBottom: 16 }}>
              Verifying applicant <strong>{selectedLead.customer}</strong> ({selectedLead.id}). Phone: {selectedLead.phone}
            </p>

            <div className="rdash-form-group">
              <label>Applicant Intent Call Status</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--rdash-accent-green)", fontSize: "0.85rem" }}>
                <CheckCircle2 size={16} /> "Did you apply for this loan?" — Confirmed Yes
              </div>
            </div>

            <div className="rdash-form-group">
              <label>Enter 6-Digit Aadhaar OTP</label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="e.g. 582910"
              />
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button
                className="rdash-action-btn"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setShowOtpModal(false)}
              >
                Cancel
              </button>
              <button
                className="rdash-btn-purple"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => {
                  if (otpCode.length < 6) {
                    alert("Please enter a valid 6-digit OTP!");
                    return;
                  }
                  alert(`Aadhaar e-KYC verified for ${selectedLead.customer}! Application submitted to Back Office for credit check.`);
                  setShowOtpModal(false);
                }}
              >
                Verify &amp; Submit to Back Office <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}