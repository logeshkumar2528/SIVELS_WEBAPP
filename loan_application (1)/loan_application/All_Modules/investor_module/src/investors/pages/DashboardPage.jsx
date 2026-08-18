import React from "react";
import { 
  PlusCircle, Briefcase, Users, Wallet, TrendingUp, IndianRupee, 
  PiggyBank, Landmark, UserCheck, ArrowUpRight, ArrowDownRight, 
  Clock, FileWarning, Sparkles, ChevronDown, Download, AlertTriangle, Info,
  PieChart as PieChartIcon
} from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid 
} from "recharts";
import "../Investor.css";

/* ------------------------------------------------------------------ */
/*  DUMMY DATA                                                        */
/* ------------------------------------------------------------------ */

const statCards = [
  { label: "Total Investment", value: "₹ 10,00,000", delta: "↑ 10.25% vs last month", positive: true, icon: Wallet, tint: "#16a34a", bg: "#f0fdf4" },
  { label: "Current Portfolio Value", value: "₹ 11,24,560", delta: "↑ 11.24% vs last month", positive: true, icon: PieChartIcon, tint: "#3b82f6", bg: "#eff6ff" },
  { label: "Total Interest Earned", value: "₹ 1,24,560", delta: "↑ 12.18% vs last month", positive: true, icon: TrendingUp, tint: "#a855f7", bg: "#faf5ff" },
  { label: "Available Balance", value: "₹ 45,230", delta: "↑ 8.35% vs last month", positive: true, icon: IndianRupee, tint: "#f97316", bg: "#fff7ed" },
  { label: "Active Investments", value: "10", delta: "Across 4 loan types", positive: null, icon: Landmark, tint: "#0f7a4c", bg: "#f0fdf4" },
  { label: "Customers Funded", value: "10", delta: "Across 4 loan types", positive: null, icon: UserCheck, tint: "#3b82f6", bg: "#eff6ff" },
];

const distribution = [
  { name: "Personal Loan", value: 300000, pct: 30, color: "#3b82f6" },
  { name: "Business Loan", value: 200000, pct: 20, color: "#16a34a" },
  { name: "Housing Loan", value: 400000, pct: 40, color: "#a855f7" },
  { name: "Property Loan", value: 100000, pct: 10, color: "#f97316" },
];

const monthlyEarnings = [
  { month: "Jan", value: 0 },
  { month: "Feb", value: 8450 },
  { month: "Mar", value: 10230 },
  { month: "Apr", value: 12580 },
  { month: "May", value: 15620 },
  { month: "Jun", value: 18750 },
  { month: "Jul", value: 22930 },
];

const recentActivity = [
  { icon: ArrowUpRight, tint: "#16a34a", bg: "#f0fdf4", title: "Interest Credited", desc: "₹ 2,450 credited to your account", time: "Today, 11:30 AM" },
  { icon: Users, tint: "#3b82f6", bg: "#eff6ff", title: "New Allocation", desc: "₹ 75,000 allocated to Ramesh Kumar", time: "Today, 10:45 AM" },
  { icon: IndianRupee, tint: "#f97316", bg: "#fff7ed", title: "EMI Received", desc: "₹ 1,200 received from Priya Sharma", time: "Today, 09:20 AM" },
  { icon: Briefcase, tint: "#a855f7", bg: "#faf5ff", title: "Loan Closed", desc: "Loan closed for Suresh Babu", time: "Yesterday, 06:15 PM" },
  { icon: Landmark, tint: "#3b82f6", bg: "#eff6ff", title: "Withdrawal Request", desc: "₹ 20,000 withdrawal requested", time: "Yesterday, 03:40 PM" },
];

const portfolioSummary = [
  { type: "Personal Loan", dot: "#3b82f6", icon: UserCheck, iconBg: "#eff6ff", invested: "₹ 3,00,000", customers: 4, interest: "₹ 37,450", roi: "16.25%", status: "Active" },
  { type: "Business Loan", dot: "#16a34a", icon: Briefcase, iconBg: "#f0fdf4", invested: "₹ 2,00,000", customers: 2, interest: "₹ 24,860", roi: "18.40%", status: "Active" },
  { type: "Housing Loan", dot: "#a855f7", icon: Landmark, iconBg: "#faf5ff", invested: "₹ 4,00,000", customers: 3, interest: "₹ 52,280", roi: "14.35%", status: "Active" },
  { type: "Property Loan", dot: "#f97316", icon: Landmark, iconBg: "#fff7ed", invested: "₹ 1,00,000", customers: 1, interest: "₹ 10,970", roi: "15.10%", status: "Active" },
];

const portfolioTotal = { invested: "₹ 10,00,000", customers: 10, interest: "₹ 1,24,560", roi: "15.60%" };

const topInvestments = [
  { name: "Ramesh Kumar", type: "Business Loan", invested: "₹ 75,000", interest: "₹ 9,850", roi: "19.70%", status: "Up to Date" },
  { name: "Priya Sharma", type: "Personal Loan", invested: "₹ 50,000", interest: "₹ 6,200", roi: "18.30%", status: "Up to Date" },
  { name: "Suresh Babu", type: "Housing Loan", invested: "₹ 80,000", interest: "₹ 8,640", roi: "15.20%", status: "Up to Date" },
  { name: "Karthik Moorthy", type: "Property Loan", invested: "₹ 1,00,000", interest: "₹ 10,970", roi: "15.10%", status: "Up to Date" },
];

/* ------------------------------------------------------------------ */
/*  COMPONENTS                                                        */
/* ------------------------------------------------------------------ */

export default function DashboardPage({ onToast }) {
  return (
    <div style={{ padding: "24px", background: "#f8fafc", minHeight: "100%" }}>
      {/* Top Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {statCards.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "16px", display: "flex", alignItems: "flex-start", gap: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={18} color={s.tint} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#1e293b", fontWeight: 600, marginBottom: "4px", lineHeight: "1.3" }}>{s.label}</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>{s.value}</div>
                </div>
                <div style={{ fontSize: "10px", color: s.positive === null ? "#64748b" : s.positive ? "#16a34a" : "#ef4444", fontWeight: 600, marginTop: "auto", textAlign: "center", width: "100%" }}>{s.delta}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3 Columns Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        
        {/* Investment Distribution */}
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Investment Distribution</h3>
            <Info size={14} color="#94a3b8" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <div style={{ width: "160px", height: "160px", position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distribution} dataKey="value" innerRadius={55} outerRadius={80} stroke="none" paddingAngle={2}>
                    {distribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>₹ 10,00,000</span>
                <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>Total Invested</span>
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
              {distribution.map(d => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: d.color }}></div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>{d.name}</span>
                      <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>₹ {d.value.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Interest Earnings */}
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px", display: "flex", flexDirection: "column", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Monthly Interest Earnings</h3>
            <div style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "11px", fontWeight: 600, color: "#64748b", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              This Year <ChevronDown size={14} />
            </div>
          </div>
          <div style={{ flex: 1, minHeight: "180px", marginLeft: "-15px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyEarnings} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }} tickFormatter={(v) => `₹ ${v.toLocaleString("en-IN")}`} width={55} />
                <Tooltip formatter={(v) => [`₹ ${v.toLocaleString("en-IN")}`, "Interest"]} contentStyle={{ fontSize: "12px", borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={3} dot={{ r: 4, fill: "#16a34a", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} label={{ position: 'top', fill: '#0f172a', fontSize: 10, fontWeight: 700, formatter: (val) => val === 0 ? '' : `₹${val.toLocaleString("en-IN")}` }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ textAlign: "center", fontSize: "10px", color: "#64748b", fontWeight: 600, marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <div style={{ width: "20px", height: "2px", background: "#16a34a" }}></div> Interest Earned (₹)
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Recent Activity</h3>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", cursor: "pointer", textDecoration: "underline" }}>View All</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {recentActivity.map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={18} color={a.tint} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{a.title}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>{a.desc}</div>
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, textAlign: "right" }}>{a.time}</div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Bottom Section: 2 Columns (Tables) & Right Side (Actions/Alerts) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px" }}>
        
        {/* Left Col (Tables) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Portfolio Summary Table */}
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: "0 0 20px 0" }}>Portfolio Summary by Loan Type</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0 0 12px 0", fontSize: "11px", color: "#64748b", fontWeight: 700 }}>Loan Type</th>
                  <th style={{ padding: "0 0 12px 0", fontSize: "11px", color: "#64748b", fontWeight: 700 }}>Invested Amount</th>
                  <th style={{ padding: "0 0 12px 0", fontSize: "11px", color: "#64748b", fontWeight: 700, textAlign: "center" }}>Active Customers</th>
                  <th style={{ padding: "0 0 12px 0", fontSize: "11px", color: "#64748b", fontWeight: 700 }}>Total Interest Earned</th>
                  <th style={{ padding: "0 0 12px 0", fontSize: "11px", color: "#64748b", fontWeight: 700 }}>Avg. ROI</th>
                  <th style={{ padding: "0 0 12px 0", fontSize: "11px", color: "#64748b", fontWeight: 700, textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {portfolioSummary.map((r, i) => {
                  const Icon = r.icon;
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "16px 0", fontSize: "12.5px", fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: r.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Icon size={16} color={r.dot} />
                        </div>
                        {r.type}
                      </td>
                      <td style={{ padding: "16px 0", fontSize: "12.5px", fontWeight: 600, color: "#0f172a" }}>{r.invested}</td>
                      <td style={{ padding: "16px 0", fontSize: "12.5px", fontWeight: 600, color: "#0f172a", textAlign: "center" }}>{r.customers}</td>
                      <td style={{ padding: "16px 0", fontSize: "12.5px", fontWeight: 600, color: "#0f172a" }}>{r.interest}</td>
                      <td style={{ padding: "16px 0", fontSize: "12.5px", fontWeight: 600, color: "#0f172a" }}>{r.roi}</td>
                      <td style={{ padding: "16px 0", textAlign: "center" }}>
                        <span style={{ background: "#f0fdf4", color: "#16a34a", padding: "4px 12px", borderRadius: "99px", fontSize: "11px", fontWeight: 700 }}>{r.status}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ padding: "16px 0", fontSize: "13px", fontWeight: 700, color: "#16a34a" }}>Total</td>
                  <td style={{ padding: "16px 0", fontSize: "13px", fontWeight: 700, color: "#16a34a" }}>{portfolioTotal.invested}</td>
                  <td style={{ padding: "16px 0", fontSize: "13px", fontWeight: 700, color: "#16a34a", textAlign: "center" }}>{portfolioTotal.customers}</td>
                  <td style={{ padding: "16px 0", fontSize: "13px", fontWeight: 700, color: "#16a34a" }}>{portfolioTotal.interest}</td>
                  <td style={{ padding: "16px 0", fontSize: "13px", fontWeight: 700, color: "#16a34a" }}>{portfolioTotal.roi}</td>
                  <td style={{ padding: "16px 0", textAlign: "center" }}><span style={{ color: "#16a34a", fontWeight: 700 }}>—</span></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Top Performing Investments Table */}
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Top Performing Investments</h3>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", cursor: "pointer", textDecoration: "underline" }}>View All</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0 0 12px 0", fontSize: "11px", color: "#64748b", fontWeight: 700 }}>Customer Name</th>
                  <th style={{ padding: "0 0 12px 0", fontSize: "11px", color: "#64748b", fontWeight: 700 }}>Loan Type</th>
                  <th style={{ padding: "0 0 12px 0", fontSize: "11px", color: "#64748b", fontWeight: 700 }}>Invested Amount</th>
                  <th style={{ padding: "0 0 12px 0", fontSize: "11px", color: "#64748b", fontWeight: 700 }}>Interest Earned</th>
                  <th style={{ padding: "0 0 12px 0", fontSize: "11px", color: "#64748b", fontWeight: 700 }}>ROI</th>
                  <th style={{ padding: "0 0 12px 0", fontSize: "11px", color: "#64748b", fontWeight: 700, textAlign: "right" }}>EMI Status</th>
                </tr>
              </thead>
              <tbody>
                {topInvestments.map((r, i) => (
                  <tr key={i} style={{ borderBottom: i === topInvestments.length - 1 ? "none" : "1px solid #f1f5f9" }}>
                    <td style={{ padding: "16px 0", fontSize: "12.5px", fontWeight: 700, color: "#0f172a" }}>{r.name}</td>
                    <td style={{ padding: "16px 0", fontSize: "12px", fontWeight: 600, color: "#64748b" }}>{r.type}</td>
                    <td style={{ padding: "16px 0", fontSize: "12.5px", fontWeight: 600, color: "#0f172a" }}>{r.invested}</td>
                    <td style={{ padding: "16px 0", fontSize: "12.5px", fontWeight: 600, color: "#0f172a" }}>{r.interest}</td>
                    <td style={{ padding: "16px 0", fontSize: "12.5px", fontWeight: 600, color: "#0f172a" }}>{r.roi}</td>
                    <td style={{ padding: "16px 0", textAlign: "right" }}>
                      <span style={{ background: "#f0fdf4", color: "#16a34a", padding: "4px 12px", borderRadius: "99px", fontSize: "11px", fontWeight: 700 }}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* Right Col (Actions & Alerts) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Quick Actions */}
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: "0 0 16px 0" }}>Quick Actions</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "12px", cursor: "pointer" }}>
                <div style={{ flexShrink: 0 }}>
                  <Briefcase size={22} color="#16a34a" />
                </div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#16a34a", marginBottom: "2px" }}>New Investment</div>
                  <div style={{ fontSize: "10px", color: "#16241f", fontWeight: 600, lineHeight: 1.2 }}>Invest in loans</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "12px", cursor: "pointer" }}>
                <div style={{ flexShrink: 0 }}>
                  <PieChart size={22} color="#3b82f6" />
                </div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#3b82f6", marginBottom: "2px" }}>My Portfolio</div>
                  <div style={{ fontSize: "10px", color: "#16241f", fontWeight: 600, lineHeight: 1.2 }}>View all investments</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "12px", padding: "12px", cursor: "pointer" }}>
                <div style={{ flexShrink: 0 }}>
                  <Users size={22} color="#a855f7" />
                </div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#a855f7", marginBottom: "2px" }}>Customers</div>
                  <div style={{ fontSize: "10px", color: "#16241f", fontWeight: 600, lineHeight: 1.2 }}>View funded customers</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "12px", padding: "12px", cursor: "pointer" }}>
                <div style={{ flexShrink: 0 }}>
                  <Download size={22} color="#f97316" />
                </div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#f97316", marginBottom: "2px" }}>Withdraw Funds</div>
                  <div style={{ fontSize: "10px", color: "#16241f", fontWeight: 600, lineHeight: 1.2 }}>Request withdrawal</div>
                </div>
              </div>
            </div>
          </div>
          {/* Important Alerts */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Important Alerts</h3>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", cursor: "pointer", textDecoration: "underline" }}>View All</span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", cursor: "pointer" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <AlertTriangle size={18} color="#ef4444" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a" }}>3 EMIs are overdue</div>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Total overdue amount: ₹ 4,250</div>
                </div>
                <ChevronDown size={16} color="#94a3b8" style={{ transform: "rotate(-90deg)" }} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", cursor: "pointer" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <AlertTriangle size={18} color="#f97316" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a" }}>2 loans are pending documentation</div>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Action required</div>
                </div>
                <ChevronDown size={16} color="#94a3b8" style={{ transform: "rotate(-90deg)" }} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", cursor: "pointer" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Info size={18} color="#3b82f6" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a" }}>New loan opportunities available</div>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Invest now and earn higher returns</div>
                </div>
                <ChevronDown size={16} color="#94a3b8" style={{ transform: "rotate(-90deg)" }} />
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}