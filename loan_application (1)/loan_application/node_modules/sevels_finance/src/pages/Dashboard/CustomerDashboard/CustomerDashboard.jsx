import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  FileText,
  CreditCard,
  History,
  User,
  LogOut,
  CheckCircle2,
  Calendar,
  Wallet,
  Clock,
  ShieldCheck,
  Download,
  X,
  Sun,
  Moon,
  ChevronDown,
  Shield,
  Users,
  UserCog,
} from "lucide-react";
import "./CustomerDashboard.css";

// Sivels Finance NBFC — Customer Portal (Template Replica)

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
  { icon: Home, label: "Dashboard", view: "dashboard" },
  { icon: FileText, label: "Loan Details", view: "loanDetails" },
  { icon: CreditCard, label: "Payments", view: "payments" },
  { icon: History, label: "Transactions", view: "transactions" },
  { icon: User, label: "Profile", view: "profile" },
];

const sectionTitles = {
  dashboard: "Overview",
  loanDetails: "Loan Details",
  payments: "Payments",
  transactions: "Transactions",
  profile: "Profile",
};

const loanDetails = {
  loanId: "LA-2288",
  requestedAmount: 100000,
  approvedAmount: 50000,
  deductions: {
    processingFee: 2500,
    gst: 450,
    docCharges: 500,
    total: 3450,
  },
  netDisbursed: 46550,
  tenureMonths: 12,
  interestRate: 24,
  monthlyEmi: 3000,
  dailyPayable: 350,
  dueDate: "05 Jun 2025",
  outstandingPrincipal: 34500,
  currentMonthPaid: 1450,
};

const initialAmortizationSchedule = [
  { month: 1, dueDate: "05 Jun 2025", emi: 3000, principal: 1833, status: "Partial (₹1,450 Paid)" },
  { month: 2, dueDate: "05 Jul 2025", emi: 3000, principal: 1876, status: "Upcoming" },
  { month: 3, dueDate: "05 Aug 2025", emi: 3000, principal: 1920, status: "Upcoming" },
  { month: 4, dueDate: "05 Sep 2025", emi: 3000, principal: 1965, status: "Upcoming" },
  { month: 5, dueDate: "05 Oct 2025", emi: 3000, principal: 2011, status: "Upcoming" },
  { month: 6, dueDate: "05 Nov 2025", emi: 3000, principal: 2055, status: "Upcoming" },
];

const PaymentGraphicIllustration = () => (
  <svg width="125" height="85" viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Soft Decorative Background Leaves */}
    <path d="M25 65C18 55 15 42 22 35C29 28 40 38 42 48" fill="#D9E6FF" opacity="0.85" />
    <path d="M15 72C10 65 8 52 16 45C24 38 32 48 34 58" fill="#C5DAFF" opacity="0.85" />
    
    {/* Phone Frame */}
    <rect x="42" y="10" width="46" height="78" rx="8" fill="#3B82F6" />
    <rect x="44" y="12" width="42" height="74" rx="6" fill="#FFFFFF" />
    <rect x="58" y="14" width="14" height="3" rx="1.5" fill="#3B82F6" />
    
    {/* Phone Wireframes */}
    <rect x="48" y="24" width="22" height="12" rx="3" fill="#D9E6FF" />
    <rect x="48" y="40" width="34" height="3" rx="1.5" fill="#93C5FD" />
    <rect x="48" y="47" width="24" height="3" rx="1.5" fill="#E2E8F0" />
    
    {/* White Calendar Widget Card */}
    <rect x="74" y="22" width="36" height="34" rx="5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
    <path d="M74 27C74 24.2386 76.2386 22 79 22H105C107.761 22 110 24.2386 110 27V30H74V27Z" fill="#F97316" />
    <circle cx="82" cy="36" r="1.5" fill="#94A3B8" />
    <circle cx="89" cy="36" r="1.5" fill="#94A3B8" />
    <circle cx="96" cy="36" r="1.5" fill="#94A3B8" />
    <circle cx="103" cy="36" r="1.5" fill="#94A3B8" />
    <circle cx="82" cy="43" r="1.5" fill="#94A3B8" />
    <circle cx="89" cy="43" r="1.5" fill="#F97316" />
    <circle cx="96" cy="43" r="1.5" fill="#94A3B8" />
    <circle cx="103" cy="43" r="1.5" fill="#94A3B8" />
    <circle cx="82" cy="50" r="1.5" fill="#94A3B8" />
    <circle cx="89" cy="50" r="1.5" fill="#94A3B8" />
    <circle cx="96" cy="50" r="1.5" fill="#94A3B8" />
    
    {/* Foreground Orange Payment Card */}
    <rect x="64" y="46" width="48" height="28" rx="5" fill="#FF6B00" />
    <rect x="70" y="54" width="20" height="3" rx="1.5" fill="#FFFFFF" opacity="0.9" />
    <rect x="70" y="61" width="14" height="3" rx="1.5" fill="#FFFFFF" opacity="0.75" />
    <circle cx="102" cy="60" r="4.5" fill="#FFFFFF" opacity="0.9" />
    
    {/* Ground Baseline */}
    <line x1="20" y1="90" x2="120" y2="90" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const LoanGraphicIllustration = () => (
  <svg width="150" height="150" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Soft Background Circle */}
    <circle cx="100" cy="100" r="90" fill="#E8EFFC" />

    {/* Decorative Leaves */}
    <path d="M40 130C20 110 15 80 35 60C55 40 75 55 78 75" fill="#B9CBF3" opacity="0.9" />
    <path d="M25 140C10 120 8 95 25 78C42 61 58 75 60 92" fill="#A3B9EE" opacity="0.9" />

    {/* Clipboard */}
    <rect x="55" y="22" width="100" height="150" rx="12" fill="#1B2A6B" />
    <rect x="62" y="30" width="86" height="134" rx="8" fill="#EDF2FC" />
    <rect x="86" y="12" width="28" height="16" rx="6" fill="#1B2A6B" />
    <circle cx="100" cy="20" r="3" fill="#7C93E8" />

    {/* LOAN Title */}
    <text x="100" y="58" textAnchor="middle" fontFamily="'Outfit', sans-serif" fontSize="18" fontWeight="800" fill="#3B5BDB">
      LOAN
    </text>

    {/* Text Lines */}
    <rect x="72" y="72" width="56" height="4" rx="2" fill="#C7D3F0" />
    <rect x="72" y="86" width="56" height="4" rx="2" fill="#C7D3F0" />
    <rect x="72" y="100" width="42" height="4" rx="2" fill="#C7D3F0" />
    <rect x="72" y="114" width="48" height="4" rx="2" fill="#C7D3F0" />

    {/* Signature squiggle */}
    <path d="M74 148C82 140 88 152 96 144C102 138 108 148 116 142" stroke="#3B5BDB" strokeWidth="2.5" strokeLinecap="round" fill="none" />

    {/* Money Bag */}
    <ellipse cx="55" cy="104" rx="10" ry="6" fill="#3448B5" />
    <rect x="48" y="104" width="14" height="18" fill="#3448B5" />
    <path d="M45 120C30 120 20 135 20 155C20 176 35 189 55 189C75 189 88 176 88 155C88 135 78 120 63 120Z" fill="#4C5FD5" />
    <text x="54" y="166" textAnchor="middle" fontFamily="'Outfit', sans-serif" fontSize="32" fontWeight="900" fill="#FF7A45">
      $
    </text>

    {/* +% Badge */}
    <text x="150" y="42" fontFamily="'Outfit', sans-serif" fontSize="20" fontWeight="800" fill="#FF7A45">
      +%
    </text>

    {/* Person writing */}
    <circle cx="152" cy="140" r="9" fill="#FFB199" />
    <path d="M143 150C143 144 147 140 152 140C157 140 161 144 161 150V172H143V150Z" fill="#FF7A45" />
    <rect x="146" y="172" width="7" height="18" rx="3" fill="#3448B5" />
    <rect x="155" y="172" width="7" height="18" rx="3" fill="#3448B5" />
    <g transform="rotate(-38 150 165)">
      <rect x="112" y="160" width="80" height="10" rx="2" fill="#1B2A6B" />
      <rect x="106" y="160" width="10" height="10" fill="#FFB199" />
      <rect x="188" y="160" width="10" height="10" rx="2" fill="#FF9A76" />
    </g>
  </svg>
);

export default function CustomerDashboard() {
  const [theme, setTheme] = useState("light"); // 'light' (white background, green text) or 'dark' (green background, white text)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [currentPaid, setCurrentPaid] = useState(loanDetails.currentMonthPaid);
  const [showPayModal, setShowPayModal] = useState(false);
  const [customPayAmount, setCustomPayAmount] = useState("350");
  const [paymentMode, setPaymentMode] = useState("UPI / GPay / PhonePe");
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const monthlyGoal = loanDetails.monthlyEmi;
  const remainingMonthBalance = Math.max(0, monthlyGoal - currentPaid);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleMakePayment = (amount) => {
    const val = Number(amount);
    if (!val || val <= 0) return;
    setCurrentPaid((prev) => prev + val);
    alert(`Payment of ₹${val.toLocaleString("en-IN")} successful!`);
    setShowPayModal(false);
  };

  return (
    <div className={`tmpl-shell ${theme === "dark" ? "tmpl-theme-dark" : ""}`}>
      {/* Left Sidebar — now spans full height, sibling of the main column */}
      <aside className={`tmpl-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <button
          className="tmpl-menu-btn tmpl-sidebar-toggle"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label="Toggle Sidebar"
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <SidebarLayoutIcon size={20} />
        </button>

        <nav className="tmpl-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={`tmpl-nav-btn ${activeView === item.view ? "active" : ""}`}
                onClick={() => setActiveView(item.view)}
              >
                <Icon size={18} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="tmpl-sidebar-footer">
          <button className="tmpl-nav-btn">
            <LogOut size={18} />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main column: topbar + content, only spans the width beside the sidebar */}
      <div className="tmpl-main-column">
        <header className="tmpl-topbar">
          <div className="tmpl-topbar-left">
            <span className="tmpl-topbar-title">Loan Dashboard</span>
          </div>

          <div className="tmpl-topbar-right">
            {/* Theme Toggle Button */}
            <button className="tmpl-theme-toggle-btn" onClick={toggleTheme} title="Toggle Theme (Light / Dark)">
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} style={{ color: "#ffffff" }} />}
            </button>

            <span className="tmpl-user-name">Thiru S.</span>
            <div className="tmpl-profile-container" ref={profileDropdownRef}>
              <div
                className="tmpl-profile-trigger"
                onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
              >
                <div className="tmpl-avatar">
                  <User size={18} />
                </div>
                <ChevronDown
                  size={14}
                  className="tmpl-dropdown-icon"
                  style={{
                    transform: isProfileDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </div>

              {isProfileDropdownOpen && (
                <div className="tmpl-user-dropdown-menu">
                  <div
                    className="tmpl-dropdown-item"
                    onClick={() => {
                      navigate("/dashboard");
                      setIsProfileDropdownOpen(false);
                    }}
                  >
                    <Shield size={16} />
                    <span>Dashboard</span>
                  </div>
                  <div
                    className="tmpl-dropdown-item"
                    onClick={() => {
                      navigate("/groups");
                      setIsProfileDropdownOpen(false);
                    }}
                  >
                    <Users size={16} />
                    <span>Groups</span>
                  </div>
                  <div
                    className="tmpl-dropdown-item"
                    onClick={() => {
                      navigate("/users");
                      setIsProfileDropdownOpen(false);
                    }}
                  >
                    <UserCog size={16} />
                    <span>Users</span>
                  </div>
                  <div
                    className="tmpl-dropdown-item"
                    onClick={() => {
                      navigate("/roles");
                      setIsProfileDropdownOpen(false);
                    }}
                  >
                    <Shield size={16} />
                    <span>Roles</span>
                  </div>
                  <div
                    className="tmpl-dropdown-item"
                    onClick={() => {
                      navigate("/customer-registration");
                      setIsProfileDropdownOpen(false);
                    }}
                  >
                    <Users size={16} />
                    <span>Customer</span>
                  </div>
                  <div className="tmpl-dropdown-divider"></div>
                  <div
                    className="tmpl-dropdown-item tmpl-logout"
                    onClick={() => {
                      navigate("/signup");
                      setIsProfileDropdownOpen(false);
                    }}
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="tmpl-content">
          {/* Section Heading */}
          <h2 className="tmpl-section-title">{sectionTitles[activeView]}</h2>

          {/* 5-KPI Top Card Row — shown on Dashboard & Loan Details */}
          {(activeView === "dashboard" || activeView === "loanDetails") && (
          <div className="tmpl-kpi-card">
            {/* KPI 1: Loan ID */}
            <div className="tmpl-kpi-col">
              <div className="tmpl-icon-badge blue">
                <FileText size={18} />
              </div>
              <span className="tmpl-kpi-label">Loan ID</span>
              <span className="tmpl-kpi-val">{loanDetails.loanId}</span>
            </div>

            {/* KPI 2: Loan Amount */}
            <div className="tmpl-kpi-col">
              <div className="tmpl-icon-badge green">
                <Wallet size={18} />
              </div>
              <span className="tmpl-kpi-label">Loan Amount</span>
              <span className="tmpl-kpi-val">₹ {loanDetails.approvedAmount.toLocaleString("en-IN")}</span>
            </div>

            {/* KPI 3: Monthly Due */}
            <div className="tmpl-kpi-col">
              <div className="tmpl-icon-badge orange">
                <Clock size={18} />
              </div>
              <span className="tmpl-kpi-label">Monthly Due</span>
              <span className="tmpl-kpi-val">₹ {loanDetails.monthlyEmi.toLocaleString("en-IN")}</span>
            </div>

            {/* KPI 4: Next Due Date */}
            <div className="tmpl-kpi-col">
              <div className="tmpl-icon-badge purple">
                <Calendar size={18} />
              </div>
              <span className="tmpl-kpi-label">Next Due Date</span>
              <span className="tmpl-kpi-val">{loanDetails.dueDate}</span>
            </div>

            {/* KPI 5: Status */}
            <div className="tmpl-kpi-col">
              <div className="tmpl-icon-badge amber">
                <ShieldCheck size={18} />
              </div>
              <span className="tmpl-kpi-label">Status</span>
              <span className="tmpl-status-badge">Active</span>
            </div>
          </div>
          )}

          {/* Daily Payment Section — shown on Dashboard & Payments */}
          {(activeView === "dashboard" || activeView === "payments") && (
          <div className="tmpl-section-card">
            <h3 className="tmpl-card-heading">Daily Payment</h3>

            <div className="tmpl-daily-grid">
              {/* Left Sub-Card: Daily Payable & Pay Button */}
              <div className="tmpl-daily-left">
                <span className="tmpl-sub-label">Daily Payable Amount</span>
                <div className="tmpl-daily-amount">
                  <span className="symbol">₹</span>
                  <span className="val">{loanDetails.dailyPayable}</span>
                </div>
                <button
                  className="tmpl-pay-now-btn"
                  onClick={() => setShowPayModal(true)}
                >
                  Pay Now
                </button>
              </div>

              {/* Right Sub-Card: Amount Due & Next Due Date */}
              <div className="tmpl-daily-right">
                <div className="tmpl-due-info">
                  <div className="tmpl-info-block">
                    <span className="tmpl-sub-label">Amount Due</span>
                    <span className="tmpl-info-val">₹ {remainingMonthBalance.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="tmpl-info-block">
                    <span className="tmpl-sub-label">Next Due Date</span>
                    <span className="tmpl-info-val">{loanDetails.dueDate}</span>
                  </div>
                </div>

                {/* Graphic Illustration */}
                <div className="tmpl-graphic">
                  <LoanGraphicIllustration />
                </div>
              </div>
            </div>

            {/* Tip Notice */}
            <p className="tmpl-tip">
              <strong>Tip:</strong> Pay your daily amount to stay on track and avoid late payments.
            </p>
          </div>
          )}

          {/* Additional Customer Data Cards */}
          <div className="tmpl-secondary-grid">
            {/* 12-Month EMI Schedule — shown on Dashboard & Transactions */}
            {(activeView === "dashboard" || activeView === "transactions") && (
            <div className="tmpl-table-card">
              <h3 className="tmpl-card-heading">12-Month EMI Schedule</h3>
              <div className="tmpl-table-container">
                <table className="tmpl-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Due Date</th>
                      <th>EMI Amount</th>
                      <th>Principal</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {initialAmortizationSchedule.map((row) => (
                      <tr key={row.month}>
                        <td>Month {row.month}</td>
                        <td>{row.dueDate}</td>
                        <td style={{ fontWeight: 600 }}>₹{row.emi.toLocaleString("en-IN")}</td>
                        <td>₹{row.principal.toLocaleString("en-IN")}</td>
                        <td>
                          <span className={`tmpl-pill ${row.status.includes("Paid") ? "green" : "gray"}`}>
                            {row.month === 1 && currentPaid >= monthlyGoal ? "Fully Paid" : row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* Sanction Breakdown — shown on Dashboard & Loan Details */}
            {(activeView === "dashboard" || activeView === "loanDetails") && (
            <div className="tmpl-breakdown-card">
              <h3 className="tmpl-card-heading">Sanction Breakdown</h3>
              <div className="tmpl-breakdown-list">
                <div className="tmpl-breakdown-row">
                  <span>Requested Loan</span>
                  <span>₹{loanDetails.requestedAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="tmpl-breakdown-row highlight">
                  <span>Approved Loan Amount</span>
                  <span>₹{loanDetails.approvedAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="tmpl-breakdown-row">
                  <span>Processing Fee (5%)</span>
                  <span>- ₹{loanDetails.deductions.processingFee.toLocaleString("en-IN")}</span>
                </div>
                <div className="tmpl-breakdown-row">
                  <span>GST (18%)</span>
                  <span>- ₹{loanDetails.deductions.gst.toLocaleString("en-IN")}</span>
                </div>
                <div className="tmpl-breakdown-row">
                  <span>Documentation Charges</span>
                  <span>- ₹{loanDetails.deductions.docCharges.toLocaleString("en-IN")}</span>
                </div>
                <div className="tmpl-breakdown-row net">
                  <span>Net Credited to Bank</span>
                  <span>₹{loanDetails.netDisbursed.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <button
                className="tmpl-pdf-btn"
                onClick={() => alert("Downloading Loan Agreement & Sanction Letter PDF...")}
              >
                <Download size={16} /> Download Sanction PDF
              </button>
            </div>
            )}
          </div>

          {/* Profile — shown only on Profile view */}
          {activeView === "profile" && (
            <div className="tmpl-section-card">
              <h3 className="tmpl-card-heading">Customer Profile</h3>
              <div className="tmpl-breakdown-list">
                <div className="tmpl-breakdown-row">
                  <span>Name</span>
                  <span>Thiru S.</span>
                </div>
                <div className="tmpl-breakdown-row">
                  <span>Customer ID</span>
                  <span>{loanDetails.loanId}</span>
                </div>
                <div className="tmpl-breakdown-row">
                  <span>Active Loan</span>
                  <span>₹{loanDetails.approvedAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="tmpl-breakdown-row">
                  <span>Loan Status</span>
                  <span>Active</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Pay Modal */}
      {showPayModal && (
        <div className="tmpl-modal-overlay">
          <div className="tmpl-modal">
            <div className="tmpl-modal-header">
              <h3>Make Daily Repayment</h3>
              <button className="tmpl-close-btn" onClick={() => setShowPayModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="tmpl-form-group">
              <label>Select Repayment Amount (₹)</label>
              <input
                type="number"
                value={customPayAmount}
                onChange={(e) => setCustomPayAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>

            <div className="tmpl-form-group">
              <label>Payment Method</label>
              <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option value="UPI / GPay / PhonePe">UPI (GPay / PhonePe / Paytm)</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Debit Card">Debit Card</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button
                className="tmpl-btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowPayModal(false)}
              >
                Cancel
              </button>
              <button
                className="tmpl-btn-primary"
                style={{ flex: 1 }}
                onClick={() => handleMakePayment(customPayAmount)}
              >
                Pay ₹{Number(customPayAmount || 0).toLocaleString("en-IN")} Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}