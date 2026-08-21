import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { Users, Handshake, PieChart, IndianRupee, CalendarCheck, TrendingUp, Search, Download, Eye, Info } from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

/* --- Dummy Data --- */
const stats = [
  { label: "Total Customers", value: "10", sub: "Across 4 loan types", icon: Users, color: "#16a34a", bg: "#dcfce7", cardBg: "#f8fcf9", cardBorder: "#e6f6ec" },
  { label: "Total Allocated Amount", value: "₹ 10,00,000", sub: "100% of Investment", icon: Handshake, color: "#2563eb", bg: "#dbeafe", cardBg: "#f8faff", cardBorder: "#e6effc" },
  { label: "Active Loans", value: "10", sub: "All loans are active", icon: PieChart, color: "#9333ea", bg: "#f3e8ff", cardBg: "#fbf8ff", cardBorder: "#f3e6fc" },
  { label: "Total Interest Earned", value: "₹ 1,24,560", sub: "All time interest earned", icon: IndianRupee, color: "#ea580c", bg: "#ffedd5", cardBg: "#fffcf8", cardBorder: "#fcece6" },
  { label: "EMIs Received", value: "82", sub: "This month", icon: CalendarCheck, color: "#16a34a", bg: "#dcfce7", cardBg: "#f8fcf9", cardBorder: "#e6f6ec" },
  { label: "Average ROI (p.a.)", value: "15.60%", sub: "Weighted average", icon: TrendingUp, color: "#2563eb", bg: "#dbeafe", cardBg: "#f8faff", cardBorder: "#e6effc" },
];

const CUSTOMERS = [
  { id: "APP25060500024", name: "Ramesh Kumar", type: "Business Loan", amount: "₹ 2,00,000", allocation: "₹ 75,000", allocPct: "(37.50%)", rate: "18.00%", emi: "₹ 4,980", date: "05 Jun 2025", status: "Active" },
  { id: "APP25060500023", name: "Priya Sharma", type: "Personal Loan", amount: "₹ 1,50,000", allocation: "₹ 50,000", allocPct: "(33.33%)", rate: "16.00%", emi: "₹ 4,250", date: "05 Jun 2025", status: "Active" },
  { id: "APP25060500022", name: "Suresh Babu", type: "Housing Loan", amount: "₹ 4,00,000", allocation: "₹ 80,000", allocPct: "(20.00%)", rate: "14.00%", emi: "₹ 10,230", date: "04 Jun 2025", status: "Active" },
  { id: "APP25060500021", name: "Kavitha R", type: "Personal Loan", amount: "₹ 1,25,000", allocation: "₹ 40,000", allocPct: "(32.00%)", rate: "16.00%", emi: "₹ 3,650", date: "04 Jun 2025", status: "Active" },
  { id: "APP25060500019", name: "Manoj Kumar", type: "Business Loan", amount: "₹ 1,80,000", allocation: "₹ 60,000", allocPct: "(33.33%)", rate: "18.00%", emi: "₹ 4,860", date: "03 Jun 2025", status: "Active" },
  { id: "APP25060500017", name: "Deepa Lakshmi", type: "Housing Loan", amount: "₹ 2,50,000", allocation: "₹ 50,000", allocPct: "(20.00%)", rate: "14.00%", emi: "₹ 6,410", date: "03 Jun 2025", status: "Active" },
  { id: "APP25060500018", name: "Gokul V", type: "Property Loan", amount: "₹ 1,00,000", allocation: "₹ 30,000", allocPct: "(30.00%)", rate: "15.50%", emi: "₹ 2,980", date: "02 Jun 2025", status: "Active" },
  { id: "APP25060500015", name: "Vijayalakshmi", type: "Personal Loan", amount: "₹ 90,000", allocation: "₹ 25,000", allocPct: "(27.78%)", rate: "14.00%", emi: "₹ 3,840", date: "02 Jun 2025", status: "Active" },
  { id: "APP25060500020", name: "Ragul M", type: "Property Loan", amount: "₹ 1,55,000", allocation: "₹ 35,000", allocPct: "(16.13%)", rate: "15.50%", emi: "₹ 3,790", date: "01 Jun 2025", status: "Active" },
];

// Add one more to make it 10 rows
CUSTOMERS.push({ id: "APP25060500014", name: "Sathish Kumar", type: "Business Loan", amount: "₹ 1,50,000", allocation: "₹ 25,000", allocPct: "(16.67%)", rate: "18.00%", emi: "₹ 3,250", date: "01 Jun 2025", status: "Active" });

const PIE_DATA = [
  { name: "Personal Loan", value: 300000, color: "#3b82f6", label: "₹ 3,00,000 (30%)" },
  { name: "Business Loan", value: 200000, color: "#16a34a", label: "₹ 2,00,000 (20%)" },
  { name: "Housing Loan", value: 400000, color: "#9333ea", label: "₹ 4,00,000 (40%)" },
  { name: "Property Loan", value: 100000, color: "#ea580c", label: "₹ 1,00,000 (10%)" },
];

const TOP_CUSTOMERS = [
  { id: 1, name: "Ramesh Kumar", earned: "₹ 9,850" },
  { id: 2, name: "Suresh Babu", earned: "₹ 8,640" },
  { id: 3, name: "Priya Sharma", earned: "₹ 6,200" },
  { id: 4, name: "Manoj Kumar", earned: "₹ 5,480" },
  { id: 5, name: "Deepa Lakshmi", earned: "₹ 5,120" },
];

function getLoanTypeStyle(type) {
  switch (type) {
    case "Business Loan": return { color: "#16a34a", bg: "#f0fdf4" };
    case "Personal Loan": return { color: "#2563eb", bg: "#eff6ff" };
    case "Housing Loan": return { color: "#9333ea", bg: "#faf5ff" };
    case "Property Loan": return { color: "#ea580c", bg: "#fff7ed" };
    default: return { color: "#64748b", bg: "#f1f5f9" };
  }
}

export default function CustomerAllocationsPage({ onToast }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const handleView = (customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  return (
    <div style={{ padding: "24px", background: "#f8fafc", minHeight: "100%", paddingBottom: "100px" }}>
      {/* 6 Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} style={{ background: s.cardBg, borderRadius: "12px", border: `1px solid ${s.cardBorder}`, padding: "20px 16px", boxShadow: "0 1px 2px rgba(0,0,0,0.01)", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={24} color={s.color} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#1e3a8a", marginBottom: "6px", lineHeight: "1.2" }}>{s.label}</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", marginBottom: "6px", lineHeight: "1", whiteSpace: "nowrap" }}>{s.value}</div>
                <div style={{ fontSize: "11px", color: "#475569", fontWeight: 500, lineHeight: "1" }}>{s.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>Loan Type</label>
            <select style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px", fontWeight: 600, color: "#0f172a", width: "180px", background: "#fff", appearance: "auto" }}>
              <option>All Loan Types</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>Customer Status</label>
            <select style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px", fontWeight: 600, color: "#0f172a", width: "180px", background: "#fff", appearance: "auto" }}>
              <option>All</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>Allocation Date</label>
            <div style={{ position: "relative" }}>
              <select style={{ padding: "10px 36px 10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px", fontWeight: 600, color: "#0f172a", width: "180px", background: "#fff", appearance: "none" }}>
                <option>All Time</option>
              </select>
              <CalendarCheck size={16} color="#64748b" style={{ position: "absolute", right: "12px", top: "11px", pointerEvents: "none" }} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "8px", overflow: "hidden", background: "#fff", padding: "0 14px", height: "40px", width: "280px" }}>
              <input type="text" placeholder="Search by Customer Name / Loan ID" style={{ border: "none", outline: "none", padding: "0", fontSize: "13px", width: "100%", color: "#0f172a", fontWeight: 500 }} />
              <Search size={16} color="#94a3b8" />
            </div>
          </div>
        </div>

        <div>
          <button style={{ display: "flex", alignItems: "center", gap: "8px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "10px 18px", cursor: "pointer", fontSize: "13px", fontWeight: 700, color: "#0f172a", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
            <Download size={16} color="#0f172a" /> Export
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
        
        {/* Main Table Card */}
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#1e3a8a", margin: 0 }}>Customer Allocation Details</h3>
          </div>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "12px", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>#</th>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "12px", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>Customer Name</th>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "12px", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>Loan Type</th>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "12px", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>My Allocation</th>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "12px", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>Interest Rate (p.a.)</th>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "12px", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>Disbursed On</th>
                  <th style={{ padding: "16px 24px", textAlign: "left", fontSize: "12px", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>Status</th>
                  <th style={{ padding: "16px 24px", textAlign: "center", fontSize: "12px", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {CUSTOMERS.map((c, i) => {
                  const lStyle = getLoanTypeStyle(c.type);
                  // Generate a pseudo-random seed for avatar based on index
                  const avatarId = 60 + i;
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "16px 24px", fontSize: "13px", color: "#0f172a", fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <img src={`https://i.pravatar.cc/150?img=${avatarId}`} alt={c.name} style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} />
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{c.name}</div>
                            <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 500, marginTop: "2px" }}>{c.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <span style={{ background: lStyle.bg, color: lStyle.color, padding: "6px 10px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 700, whiteSpace: "nowrap" }}>
                          {c.type}
                        </span>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>{c.allocation}</div>
                        <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 500, marginTop: "2px" }}>{c.allocPct}</div>
                      </td>
                      <td style={{ padding: "16px 24px", fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>{c.rate}</td>
                      <td style={{ padding: "16px 24px", fontSize: "13px", fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>{c.date}</td>
                      <td style={{ padding: "16px 24px" }}>
                        <span style={{ background: "#dcfce7", color: "#16a34a", padding: "6px 10px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 700 }}>{c.status}</span>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "center" }}>
                        <button onClick={() => handleView(c)} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#0f172a", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                          <Eye size={16} color="#3b82f6" /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: 700 }}>Rows per page</span>
              <select style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                <option>10</option>
              </select>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button style={{ width: "32px", height: "32px", border: "1px solid #cbd5e1", background: "#fff", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}>{'<'}</button>
              <button style={{ width: "32px", height: "32px", border: "none", background: "#16a34a", color: "#fff", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>1</button>
              <button style={{ width: "32px", height: "32px", border: "1px solid #cbd5e1", background: "#fff", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, cursor: "pointer", color: "#0f172a" }}>2</button>
              <button style={{ width: "32px", height: "32px", border: "1px solid #cbd5e1", background: "#fff", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}>{'>'}</button>
            </div>

            <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 700 }}>
              Showing 1 to 10 of 10 entries
            </div>
          </div>
        </div>



      </div>

      {/* View Customer Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered dialogClassName="premium-modal">
        <Modal.Header closeButton style={{ borderBottom: "none", padding: "24px 24px 0" }}>
          <Modal.Title style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
            Customer Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: "24px" }}>
          {selectedCustomer && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* Profile Header Block */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                {/* We use a pseudo-random seed based on customer id or name for consistency, here just using 60 as fallback */}
                <img src={`https://i.pravatar.cc/150?u=${selectedCustomer.id}`} alt={selectedCustomer.name} style={{ width: "56px", height: "56px", borderRadius: "50%", objectFit: "cover", border: "2px solid #fff", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>{selectedCustomer.name}</h4>
                    <span style={{ background: getLoanTypeStyle(selectedCustomer.type).bg, color: getLoanTypeStyle(selectedCustomer.type).color, padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 }}>
                      {selectedCustomer.type}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600, marginTop: "4px" }}>ID: {selectedCustomer.id}</div>
                </div>
              </div>

              {/* Data Grid Block */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                
                {/* Allocation Card */}
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <div style={{ background: "#dbeafe", padding: "6px", borderRadius: "8px" }}>
                      <IndianRupee size={16} color="#2563eb" />
                    </div>
                    <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>My Allocation</span>
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                    {selectedCustomer.allocation}
                  </div>
                  <div style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600, marginTop: "4px" }}>
                    {selectedCustomer.allocPct} of total
                  </div>
                </div>

                {/* Interest Rate Card */}
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <div style={{ background: "#ffedd5", padding: "6px", borderRadius: "8px" }}>
                      <TrendingUp size={16} color="#ea580c" />
                    </div>
                    <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>Interest Rate</span>
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                    {selectedCustomer.rate} <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>p.a.</span>
                  </div>
                </div>

                {/* Disbursed Card */}
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <div style={{ background: "#f3e8ff", padding: "6px", borderRadius: "8px" }}>
                      <CalendarCheck size={16} color="#9333ea" />
                    </div>
                    <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>Disbursed On</span>
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                    {selectedCustomer.date}
                  </div>
                </div>

                {/* Status Card */}
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600, marginBottom: "8px" }}>Current Status</span>
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#dcfce7", color: "#16a34a", padding: "6px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: 700 }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16a34a" }}></div>
                      {selectedCustomer.status}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: "none", padding: "0 24px 24px" }}>
          <Button onClick={() => setShowModal(false)} style={{ width: "100%", background: "#0f172a", border: "none", padding: "12px", borderRadius: "8px", fontSize: "14px", fontWeight: 700, color: "#fff" }}>
            Close Details
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}