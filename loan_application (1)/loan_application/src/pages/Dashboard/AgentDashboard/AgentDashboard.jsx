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
  Wallet,
  FileText,
  Bell,
  LogOut,
  HelpCircle,
  Search,
  Plus,
  ChevronRight,
  PanelLeft,
  IndianRupee,
  TrendingUp,
  FileCheck2,
  CreditCard,
  Camera,
  MapPin,
  Wallet2,
  Landmark,
  AlertTriangle,
  Phone,
  MessageSquareText,
} from "lucide-react";
import "./AgentDashboard.css";

// AgentDashboard.jsx
// Sivels Finance NBFC console — Agent dashboard, rebuilt against the
// actual 15-step loan process flow (Client -> Agent -> RM -> Back Office
// -> Offer -> Acceptance -> Disbursement -> EMI Collection -> Closure).
// Sidebar nav is now a real tab switcher: Dashboard / My Customers /
// Commission / Field Sheet each render their own view.
// Requires: npm install recharts lucide-react

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Users, label: "My Customers" },
  { icon: Wallet, label: "Commission" },
  { icon: FileText, label: "Field Sheet" },
];

const pageSubtitles = {
  "Dashboard": "Your leads, offers and collections at a glance.",
  "My Customers": "Every customer you've sourced, searchable by name or stage.",
  "Commission": "Upfront and trail earnings, and when they were paid out.",
  "Field Sheet": "Today's doorstep work — new sign-ups and overdue collections.",
};

// TODO: replace with GET /api/agent/summary
const heroData = {
  leadsThisMonth: 14,
  target: 20,
  awaitingOffer: 2,
  overdueToCollect: 3,
  commissionMtd: 8400,
};

// TODO: replace with GET /api/agent/commission-breakdown
const commissionTrend = [
  { month: "Mar", upfront: 3200, trail: 1100 },
  { month: "Apr", upfront: 3800, trail: 1400 },
  { month: "May", upfront: 4200, trail: 1650 },
  { month: "Jun", upfront: 3900, trail: 1900 },
  { month: "Jul", upfront: 4600, trail: 2200 },
];

// TODO: replace with GET /api/agent/commission-ledger
const commissionLedger = [
  { date: "28 Jul", customer: "D. Prakash", loanId: "LA-2288", type: "Upfront Fee", amount: 1500, status: "paid" },
  { date: "26 Jul", customer: "N. Iyer", loanId: "LA-2285", type: "Trail Fee", amount: 320, status: "paid" },
  { date: "22 Jul", customer: "M. Bharathi", loanId: "LA-2279", type: "Upfront Fee", amount: 1100, status: "paid" },
  { date: "18 Jul", customer: "A. Joseph", loanId: "LA-2294", type: "Upfront Fee", amount: 2100, status: "pending" },
  { date: "15 Jul", customer: "K. Selvam", loanId: "LA-2299", type: "Trail Fee", amount: 410, status: "pending" },
];

// Document checklist — matches Step 2 of the flow exactly
const requiredDocs = [
  { id: "aadhaar", label: "Aadhaar Card", icon: FileCheck2 },
  { id: "pan", label: "PAN Card", icon: CreditCard },
  { id: "bank", label: "Bank Passbook", icon: Landmark },
  { id: "mobile", label: "Mobile Number", icon: Phone },
  { id: "photo", label: "Photo", icon: Camera },
  { id: "address", label: "Address Proof", icon: MapPin },
];

// Pipeline stages — matches the actual flow stage names, not generic ones
const stageMeta = {
  docs_collected: { label: "Docs Collected", cls: "docs" },
  sent_to_rm: { label: "Sent to RM", cls: "rm" },
  rm_verified: { label: "RM Verified", cls: "verified" },
  eligibility_check: { label: "Eligibility Check", cls: "eligibility" },
  offer_shared: { label: "Offer Shared", cls: "offer" },
  accepted: { label: "Accepted", cls: "approved" },
  rejected: { label: "Rejected", cls: "rejected" },
  disbursed: { label: "Disbursed", cls: "approved" },
};

// Full customer book — TODO: replace with GET /api/agent/customers
const allCustomers = [
  { id: "LA-2299", customer: "K. Selvam", location: "Salem", amount: "₹1,20,000", stage: "sent_to_rm", updated: "2h ago" },
  { id: "LA-2297", customer: "R. Meena", location: "Erode", amount: "₹85,000", stage: "eligibility_check", updated: "5h ago" },
  { id: "LA-2294", customer: "A. Joseph", location: "Coimbatore", amount: "₹2,10,000", stage: "offer_shared", updated: "1d ago" },
  { id: "LA-2291", customer: "S. Fatima", location: "Trichy", amount: "₹60,000", stage: "rejected", updated: "1d ago" },
  { id: "LA-2288", customer: "D. Prakash", location: "Madurai", amount: "₹1,50,000", stage: "disbursed", updated: "2d ago" },
  { id: "LA-2285", customer: "N. Iyer", location: "Chennai", amount: "₹95,000", stage: "docs_collected", updated: "3d ago" },
  { id: "LA-2282", customer: "V. Kannan", location: "Salem", amount: "₹1,10,000", stage: "rm_verified", updated: "3d ago" },
  { id: "LA-2279", customer: "M. Bharathi", location: "Namakkal", amount: "₹75,000", stage: "accepted", updated: "4d ago" },
  { id: "LA-2276", customer: "J. Vinoth", location: "Erode", amount: "₹1,35,000", stage: "docs_collected", updated: "5d ago" },
  { id: "LA-2273", customer: "T. Rajeshwari", location: "Trichy", amount: "₹65,000", stage: "eligibility_check", updated: "6d ago" },
];

// Customer with an offer ready to explain — Step 7 of the flow
// TODO: replace with GET /api/agent/offers/pending
const pendingOffer = {
  customer: "A. Joseph",
  requested: 210000,
  approved: 150000,
  tenure: 12,
  rate: 24,
  emi: 8900,
  processingFee: 7500,
  gst: 1350,
  docCharges: 500,
  netCredited: 140650,
};

// Overdue collection queue — Step 13 of the flow (Agent visits customer to collect)
// TODO: replace with GET /api/agent/overdue-collections
const overdueQueue = [
  { id: "OD-441", customer: "P. Rangan", emi: "₹3,000", daysOverdue: 4, penalty: "2% on overdue EMI" },
  { id: "OD-439", customer: "L. Banu", emi: "₹2,200", daysOverdue: 12, penalty: "3% on overdue EMI" },
  { id: "OD-437", customer: "G. Vasan", emi: "₹4,500", daysOverdue: 33, penalty: "5% on overdue EMI" },
];

const initials = (name) => name.split(" ").map((n) => n[0]).join("");

export default function AgentDashboard() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [range] = useState("Last 5 Months");
  const [customerSearch, setCustomerSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");

  const progressPct = Math.min(100, Math.round((heroData.leadsThisMonth / heroData.target) * 100));
  const totalDeductions = pendingOffer.processingFee + pendingOffer.gst + pendingOffer.docCharges;

  const stageChips = [{ key: "all", label: "All" }, ...Object.entries(stageMeta).map(([key, v]) => ({ key, label: v.label }))];

  const filteredCustomers = allCustomers.filter((c) => {
    const matchesStage = stageFilter === "all" || c.stage === stageFilter;
    const q = customerSearch.trim().toLowerCase();
    const matchesSearch = q === "" || c.customer.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
    return matchesStage && matchesSearch;
  });

  const commissionYtd = commissionTrend.reduce((sum, m) => sum + m.upfront + m.trail, 0);

  return (
    <div className="adash-shell">
      <aside className={sidebarCollapsed ? "adash-sidebar collapsed" : "adash-sidebar"}>
        <div className="adash-sidebar-top">
          <div className="adash-logo-slot" title="Your company logo">
            {/* Drop your company logo (img or svg) in here */}
          </div>
          <button
            className="adash-sidebar-toggle"
            onClick={() => setSidebarCollapsed((v) => !v)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft size={16} strokeWidth={1.8} />
          </button>
        </div>

        <nav className="adash-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.label;
            return (
              <button
                key={item.label}
                className={isActive ? "adash-nav-item active" : "adash-nav-item"}
                onClick={() => setActiveTab(item.label)}
                title={item.label}
              >
                <Icon size={17} strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="adash-sidebar-footer">
          <button className="adash-nav-item" title="Log Out">
            <LogOut size={17} strokeWidth={1.8} />
            <span>Log Out</span>
          </button>
          <button className="adash-nav-item" title="Help">
            <HelpCircle size={17} strokeWidth={1.8} />
            <span>Help</span>
          </button>
        </div>
      </aside>

      <div className="adash-main">
        <header className="adash-topbar">
          <h1 className="adash-title">{activeTab}</h1>
          <div className="adash-profile">
            <div>
              <p className="adash-profile-name">Manikandan S.</p>
              <p className="adash-profile-role">Agent Code: AG-0142</p>
            </div>
            <div className="adash-avatar">MS</div>
          </div>
        </header>

        <div className="adash-content">
          <div className="adash-page-head">
            <p>{pageSubtitles[activeTab]}</p>
          </div>

          {/* ---------------- DASHBOARD ---------------- */}
          {activeTab === "Dashboard" && (
            <>
              <div className="adash-hero">
                <div className="adash-hero-metric">
                  <span className="adash-hero-label">Leads This Month</span>
                  <span className="adash-hero-value">{heroData.leadsThisMonth}</span>
                  <div className="adash-progress-track">
                    <div className="adash-progress-fill" style={{ width: `${progressPct}%` }}></div>
                  </div>
                </div>
                <div className="adash-hero-divider"></div>
                <div className="adash-hero-metric">
                  <span className="adash-hero-label">Offers to Explain</span>
                  <span className="adash-hero-value">{heroData.awaitingOffer}</span>
                  <span className="adash-hero-sub">Ready for client</span>
                </div>
                <div className="adash-hero-divider"></div>
                <div className="adash-hero-metric warn">
                  <span className="adash-hero-label">Overdue to Collect</span>
                  <span className="adash-hero-value">{heroData.overdueToCollect}</span>
                  <span className="adash-hero-sub">Needs a visit</span>
                </div>
                <div className="adash-hero-divider"></div>
                <div className="adash-hero-metric">
                  <span className="adash-hero-label">Commission (MTD)</span>
                  <span className="adash-hero-value">₹{heroData.commissionMtd.toLocaleString("en-IN")}</span>
                  <span className="adash-hero-sub">Upfront + trail</span>
                </div>
              </div>

              <button className="adash-quick-action" onClick={() => setActiveTab("Field Sheet")}>
                <div className="adash-quick-action-icon"><Plus size={18} /></div>
                <div>
                  <p className="adash-quick-action-title">Log a New Customer</p>
                  <p className="adash-quick-action-sub">Collect documents and submit to RM for verification</p>
                </div>
                <ChevronRight size={18} className="adash-quick-action-arrow" />
              </button>

              {heroData.awaitingOffer > 0 && (
                <div className="adash-card adash-offer-card">
                  <div className="adash-card-head">
                    <h3><MessageSquareText size={15} /> Offer Ready — Explain to Client</h3>
                  </div>
                  <div className="adash-offer-body">
                    <div className="adash-offer-customer">
                      <div className="adash-mini-avatar lg">{initials(pendingOffer.customer)}</div>
                      <div>
                        <p className="adash-offer-name">{pendingOffer.customer}</p>
                        <p className="adash-muted">Requested ₹{pendingOffer.requested.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                    <div className="adash-offer-grid">
                      <div>
                        <p className="adash-summary-label">Approved Amount</p>
                        <p className="adash-summary-value big">₹{pendingOffer.approved.toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <p className="adash-summary-label">Tenure</p>
                        <p className="adash-summary-value big">{pendingOffer.tenure} months</p>
                      </div>
                      <div>
                        <p className="adash-summary-label">Interest Rate</p>
                        <p className="adash-summary-value big">{pendingOffer.rate}% p.a.</p>
                      </div>
                      <div>
                        <p className="adash-summary-label">Monthly EMI</p>
                        <p className="adash-summary-value big">₹{pendingOffer.emi.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                    <div className="adash-offer-net">
                      <span>Net Amount to be Credited</span>
                      <strong>₹{pendingOffer.netCredited.toLocaleString("en-IN")}</strong>
                    </div>
                    <button className="adash-primary-btn">Mark as Explained to Client</button>
                  </div>
                </div>
              )}

              <div className="adash-grid">
                <div className="adash-card adash-chart-card">
                  <div className="adash-card-head">
                    <h3>Commission Earned</h3>
                    <span className="adash-range-label">{range}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={commissionTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8edf7" vertical={false} />
                      <XAxis dataKey="month" stroke="#8892a3" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis stroke="#8892a3" tickLine={false} axisLine={false} fontSize={12} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8edf7" }} />
                      <Bar dataKey="upfront" stackId="a" fill="#4f7fe0" radius={[0, 0, 0, 0]} name="Upfront Fee (₹)" />
                      <Bar dataKey="trail" stackId="a" fill="#16305c" radius={[6, 6, 0, 0]} name="Trail Fee (₹)" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="adash-legend">
                    <span><i style={{ background: "#4f7fe0" }}></i> Upfront Fee</span>
                    <span><i style={{ background: "#16305c" }}></i> Trail Fee</span>
                  </div>
                </div>

                <div className="adash-card adash-summary-card">
                  <div className="adash-card-head">
                    <h3>Commission Structure</h3>
                  </div>
                  <div className="adash-summary-row">
                    <div className="adash-summary-icon"><IndianRupee size={15} /></div>
                    <div>
                      <p className="adash-summary-label">Upfront Sourcing Fee</p>
                      <p className="adash-summary-value">1.00% of loan amount</p>
                    </div>
                  </div>
                  <div className="adash-summary-row">
                    <div className="adash-summary-icon"><TrendingUp size={15} /></div>
                    <div>
                      <p className="adash-summary-label">Collection Trail Fee</p>
                      <p className="adash-summary-value">1.25% p.a. on active book</p>
                    </div>
                  </div>
                  <div className="adash-summary-note">
                    Paid monthly as long as your sourced loans stay current — active collections directly grow your trail income.
                  </div>
                </div>
              </div>

              <div className="adash-card">
                <div className="adash-card-head">
                  <h3><AlertTriangle size={15} className="adash-warn-icon" /> Overdue Customers to Visit</h3>
                  <a className="adash-see-details" onClick={() => setActiveTab("Field Sheet")}>View All</a>
                </div>
                <table className="adash-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>EMI Amount</th>
                      <th>Days Overdue</th>
                      <th>Penalty</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueQueue.slice(0, 3).map((row) => (
                      <tr key={row.id} className="adash-table-row">
                        <td>
                          <div className="adash-cell-with-avatar">
                            <div className="adash-mini-avatar">{initials(row.customer)}</div>
                            {row.customer}
                          </div>
                        </td>
                        <td>{row.emi}</td>
                        <td>
                          <span className={`adash-overdue-badge ${row.daysOverdue > 30 ? "high" : row.daysOverdue > 10 ? "mid" : "low"}`}>
                            {row.daysOverdue} days
                          </span>
                        </td>
                        <td className="adash-muted">{row.penalty}</td>
                        <td>
                          <button className="adash-collect-btn">
                            <Wallet2 size={13} /> Collect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="adash-card">
                <div className="adash-card-head">
                  <h3>My Customer Pipeline</h3>
                  <a className="adash-see-details" onClick={() => setActiveTab("My Customers")}>View All</a>
                </div>
                <table className="adash-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Stage</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCustomers.slice(0, 5).map((row) => {
                      const meta = stageMeta[row.stage];
                      return (
                        <tr key={row.id} className="adash-table-row">
                          <td>
                            <div className="adash-cell-with-avatar">
                              <div className="adash-mini-avatar">{initials(row.customer)}</div>
                              {row.customer}
                            </div>
                          </td>
                          <td>{row.amount}</td>
                          <td>
                            <span className={`adash-stage-badge ${meta.cls}`}>{meta.label}</span>
                          </td>
                          <td className="adash-muted">{row.updated}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ---------------- MY CUSTOMERS ---------------- */}
          {activeTab === "My Customers" && (
            <div className="adash-card">
              <div className="adash-card-head">
                <h3>Full Customer Book ({filteredCustomers.length})</h3>
              </div>

              <div className="adash-filter-row">
                <div className="adash-local-search">
                  <Search size={14} />
                  <input
                    placeholder="Search by name or loan ID"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="adash-filter-row">
                {stageChips.map((chip) => (
                  <button
                    key={chip.key}
                    className={stageFilter === chip.key ? "adash-filter-chip active" : "adash-filter-chip"}
                    onClick={() => setStageFilter(chip.key)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="adash-empty-state">No customers match that search or filter.</div>
              ) : (
                <table className="adash-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Location</th>
                      <th>Amount</th>
                      <th>Stage</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((row) => {
                      const meta = stageMeta[row.stage];
                      return (
                        <tr key={row.id} className="adash-table-row">
                          <td>
                            <div className="adash-cell-with-avatar">
                              <div className="adash-mini-avatar">{initials(row.customer)}</div>
                              <div>
                                {row.customer}
                                <div className="adash-muted" style={{ fontSize: 10.5 }}>{row.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="adash-muted">{row.location}</td>
                          <td>{row.amount}</td>
                          <td>
                            <span className={`adash-stage-badge ${meta.cls}`}>{meta.label}</span>
                          </td>
                          <td className="adash-muted">{row.updated}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ---------------- COMMISSION ---------------- */}
          {activeTab === "Commission" && (
            <>
              <div className="adash-stat-strip">
                <div className="adash-stat-chip">
                  <p className="adash-stat-chip-label">Commission (MTD)</p>
                  <p className="adash-stat-chip-value">₹{heroData.commissionMtd.toLocaleString("en-IN")}</p>
                </div>
                <div className="adash-stat-chip">
                  <p className="adash-stat-chip-label">Commission (5-Month Total)</p>
                  <p className="adash-stat-chip-value">₹{commissionYtd.toLocaleString("en-IN")}</p>
                </div>
                <div className="adash-stat-chip">
                  <p className="adash-stat-chip-label">Pending Payout</p>
                  <p className="adash-stat-chip-value">
                    ₹{commissionLedger.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="adash-grid">
                <div className="adash-card adash-chart-card">
                  <div className="adash-card-head">
                    <h3>Commission Earned</h3>
                    <span className="adash-range-label">{range}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={commissionTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8edf7" vertical={false} />
                      <XAxis dataKey="month" stroke="#8892a3" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis stroke="#8892a3" tickLine={false} axisLine={false} fontSize={12} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8edf7" }} />
                      <Bar dataKey="upfront" stackId="a" fill="#4f7fe0" radius={[0, 0, 0, 0]} name="Upfront Fee (₹)" />
                      <Bar dataKey="trail" stackId="a" fill="#16305c" radius={[6, 6, 0, 0]} name="Trail Fee (₹)" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="adash-legend">
                    <span><i style={{ background: "#4f7fe0" }}></i> Upfront Fee</span>
                    <span><i style={{ background: "#16305c" }}></i> Trail Fee</span>
                  </div>
                </div>

                <div className="adash-card adash-summary-card">
                  <div className="adash-card-head">
                    <h3>Commission Structure</h3>
                  </div>
                  <div className="adash-summary-row">
                    <div className="adash-summary-icon"><IndianRupee size={15} /></div>
                    <div>
                      <p className="adash-summary-label">Upfront Sourcing Fee</p>
                      <p className="adash-summary-value">1.00% of loan amount</p>
                    </div>
                  </div>
                  <div className="adash-summary-row">
                    <div className="adash-summary-icon"><TrendingUp size={15} /></div>
                    <div>
                      <p className="adash-summary-label">Collection Trail Fee</p>
                      <p className="adash-summary-value">1.25% p.a. on active book</p>
                    </div>
                  </div>
                  <div className="adash-summary-note">
                    Paid monthly as long as your sourced loans stay current — active collections directly grow your trail income.
                  </div>
                </div>
              </div>

              <div className="adash-card">
                <div className="adash-card-head">
                  <h3>Payout Ledger</h3>
                </div>
                <table className="adash-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Loan ID</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissionLedger.map((row, i) => (
                      <tr key={i} className="adash-table-row">
                        <td className="adash-muted">{row.date}</td>
                        <td>{row.customer}</td>
                        <td className="adash-muted">{row.loanId}</td>
                        <td>{row.type}</td>
                        <td>₹{row.amount.toLocaleString("en-IN")}</td>
                        <td>
                          <span className={`adash-status-pill ${row.status}`}>
                            {row.status === "paid" ? "Paid" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ---------------- FIELD SHEET ---------------- */}
          {activeTab === "Field Sheet" && (
            <>
              <div className="adash-card adash-new-customer-card">
                <div className="adash-card-head">
                  <h3><Plus size={15} /> Log a New Customer</h3>
                </div>
                <p className="adash-quick-action-sub" style={{ marginBottom: 12 }}>
                  Collect the following from the customer, then submit to RM for verification.
                </p>
                <div className="adash-doc-grid">
                  {requiredDocs.map((d) => {
                    const Icon = d.icon;
                    return (
                      <div className="adash-doc-chip" key={d.id}>
                        <Icon size={14} strokeWidth={1.8} />
                        <span>{d.label}</span>
                      </div>
                    );
                  })}
                </div>
                <button className="adash-primary-btn">
                  Start New Customer Entry <ChevronRight size={15} />
                </button>
              </div>

              <div className="adash-card">
                <div className="adash-card-head">
                  <h3><AlertTriangle size={15} className="adash-warn-icon" /> Overdue Customers to Visit</h3>
                </div>
                <table className="adash-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>EMI Amount</th>
                      <th>Days Overdue</th>
                      <th>Penalty</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueQueue.map((row) => (
                      <tr key={row.id} className="adash-table-row">
                        <td>
                          <div className="adash-cell-with-avatar">
                            <div className="adash-mini-avatar">{initials(row.customer)}</div>
                            {row.customer}
                          </div>
                        </td>
                        <td>{row.emi}</td>
                        <td>
                          <span className={`adash-overdue-badge ${row.daysOverdue > 30 ? "high" : row.daysOverdue > 10 ? "mid" : "low"}`}>
                            {row.daysOverdue} days
                          </span>
                        </td>
                        <td className="adash-muted">{row.penalty}</td>
                        <td>
                          <button className="adash-collect-btn">
                            <Wallet2 size={13} /> Collect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}