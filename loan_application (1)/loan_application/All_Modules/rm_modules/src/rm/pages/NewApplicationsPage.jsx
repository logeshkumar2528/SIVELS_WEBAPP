import React, { useState } from "react";
import { Search, Filter, MoreVertical, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";
import "../Rm.css";

const dummyApplications = [
  { id: "APP-2025-001", name: "Ramesh Kumar", mobile: "+91 9876543210", amount: "₹ 50,000", date: "05 Jun 2025", agent: "Thiru" },
  { id: "APP-2025-002", name: "Priya N", mobile: "+91 8765432109", amount: "₹ 75,000", date: "05 Jun 2025", agent: "Arun Kumar" },
  { id: "APP-2025-003", name: "Suresh B", mobile: "+91 7654321098", amount: "₹ 1,20,000", date: "04 Jun 2025", agent: "Suresh B" },
  { id: "APP-2025-004", name: "Anita Raj", mobile: "+91 6543210987", amount: "₹ 45,000", date: "04 Jun 2025", agent: "Thiru" },
  { id: "APP-2025-005", name: "Karthik M", mobile: "+91 5432109876", amount: "₹ 2,00,000", date: "03 Jun 2025", agent: "Kumaravel M" },
  { id: "APP-2025-006", name: "Lakshmi S", mobile: "+91 9123456780", amount: "₹ 80,000", date: "03 Jun 2025", agent: "Priya N" },
  { id: "APP-2025-007", name: "Manoj V", mobile: "+91 8234567891", amount: "₹ 60,000", date: "02 Jun 2025", agent: "Arun Kumar" },
  { id: "APP-2025-008", name: "Divya K", mobile: "+91 7345678902", amount: "₹ 1,50,000", date: "02 Jun 2025", agent: "Thiru" },
  { id: "APP-2025-009", name: "Vikram R", mobile: "+91 6456789013", amount: "₹ 95,000", date: "01 Jun 2025", agent: "Kumaravel M" },
  { id: "APP-2025-010", name: "Sneha P", mobile: "+91 9567890124", amount: "₹ 30,000", date: "01 Jun 2025", agent: "Suresh B" },
  { id: "APP-2025-011", name: "Gokul V", mobile: "+91 8456789015", amount: "₹ 1,00,000", date: "01 Jun 2025", agent: "Thiru" },
  { id: "APP-2025-012", name: "Vijayalakshmi", mobile: "+91 7567890126", amount: "₹ 90,000", date: "31 May 2025", agent: "Arun Kumar" },
  { id: "APP-2025-013", name: "Ragul M", mobile: "+91 6678901237", amount: "₹ 1,55,000", date: "31 May 2025", agent: "Kumaravel M" },
  { id: "APP-2025-014", name: "Sathish Kumar", mobile: "+91 9789012348", amount: "₹ 1,50,000", date: "31 May 2025", agent: "Suresh B" },
  { id: "APP-2025-015", name: "Anand C", mobile: "+91 8890123459", amount: "₹ 2,20,000", date: "30 May 2025", agent: "Thiru" },
  { id: "APP-2025-016", name: "Meena K", mobile: "+91 7901234560", amount: "₹ 40,000", date: "30 May 2025", agent: "Arun Kumar" },
  { id: "APP-2025-017", name: "Balaji V", mobile: "+91 6012345671", amount: "₹ 85,000", date: "29 May 2025", agent: "Kumaravel M" },
  { id: "APP-2025-018", name: "Nandhini S", mobile: "+91 9123456782", amount: "₹ 1,10,000", date: "29 May 2025", agent: "Suresh B" },
  { id: "APP-2025-019", name: "Deepak L", mobile: "+91 8234567893", amount: "₹ 35,000", date: "28 May 2025", agent: "Thiru" },
  { id: "APP-2025-020", name: "Kavitha R", mobile: "+91 7345678904", amount: "₹ 1,25,000", date: "28 May 2025", agent: "Arun Kumar" },
  { id: "APP-2025-021", name: "Senthil K", mobile: "+91 6456789015", amount: "₹ 65,000", date: "27 May 2025", agent: "Kumaravel M" },
  { id: "APP-2025-022", name: "Uma Maheshwari", mobile: "+91 9567890126", amount: "₹ 1,80,000", date: "27 May 2025", agent: "Suresh B" },
  { id: "APP-2025-023", name: "Rajesh S", mobile: "+91 8678901237", amount: "₹ 70,000", date: "26 May 2025", agent: "Thiru" },
  { id: "APP-2025-024", name: "Saranya M", mobile: "+91 7789012348", amount: "₹ 55,000", date: "26 May 2025", agent: "Arun Kumar" },
];

export default function NewApplicationsPage({ onProceed }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredApps = dummyApplications.filter(app => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    app.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredApps.length / pageSize);
  const paginatedApps = filteredApps.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  return (
    <main className="content">


      <section className="panel">
        <div className="panel-header" style={{ marginBottom: "20px" }}>
          <div className="flex-align-center gap-2" style={{ width: "300px" }}>
            <div className="search-input-wrapper" style={{ position: "relative", width: "100%" }}>
              <Search size={16} color="#8a94a6" style={{ position: "absolute", left: "12px", top: "10px" }} />
              <input 
                type="text" 
                placeholder="Search by ID or Name..." 
                value={searchTerm}
                onChange={handleSearchChange}
                style={{ 
                  width: "100%", padding: "8px 12px 8px 36px", 
                  border: "1px solid #edf0f2", borderRadius: "8px", 
                  fontSize: "13px", outline: "none"
                }}
              />
            </div>
          </div>
          <button style={{ 
            display: "flex", alignItems: "center", gap: "8px", 
            background: "#fff", border: "1px solid #cbd5e1", 
            borderRadius: "8px", padding: "10px 18px", 
            cursor: "pointer", fontSize: "13px", fontWeight: 700, 
            color: "#0f172a", boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
          }}>
            <Filter size={16} color="#64748b" /> Filter
          </button>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>App ID</th>
                <th>Customer Name</th>
                <th>Mobile Number</th>
                <th>Requested Amount</th>
                <th>Date</th>
                <th>Agent</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedApps.map((app) => (
                <tr key={app.id}>
                  <td className="font-bold text-dark">{app.id}</td>
                  <td>
                    <div className="flex-align-center gap-2">
                      <img src={`https://ui-avatars.com/api/?name=${app.name.replace(' ', '+')}&background=f1f7fe&color=3b82f6&rounded=true`} alt={app.name} className="avatar-sm" />
                      <span className="font-bold text-dark">{app.name}</span>
                    </div>
                  </td>
                  <td className="text-muted">{app.mobile}</td>
                  <td className="font-bold text-success">{app.amount}</td>
                  <td className="text-muted">{app.date}</td>
                  <td>{app.agent}</td>
                  <td>
                    <button 
                      onClick={() => onProceed(app)} 
                      style={{ 
                        display: "flex", alignItems: "center", gap: "6px",
                        background: "#eff6ff", border: "1px solid #bfdbfe", 
                        color: "#2563eb", padding: "6px 12px", 
                        borderRadius: "6px", fontSize: "11px", fontWeight: 700, 
                        cursor: "pointer", transition: "all 0.2s ease"
                      }}
                    >
                      <ShieldAlert size={14} strokeWidth={2} /> Verify Now
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedApps.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "32px", color: "#8a94a6" }}>
                    No applications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderTop: "1px solid #edf0f2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", color: "#5b6472" }}>
            <span>Rows per page:</span>
            <select 
              value={pageSize} 
              onChange={handlePageSizeChange}
              style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #edf0f2", outline: "none", background: "#fff", cursor: "pointer" }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "13px", color: "#5b6472" }}>
            <span>
              Showing {filteredApps.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredApps.length)} of {filteredApps.length}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", borderRadius: "6px", border: "1px solid #edf0f2", background: currentPage === 1 ? "#f7f8fa" : "#fff", cursor: currentPage === 1 ? "not-allowed" : "pointer", color: currentPage === 1 ? "#8a94a6" : "#16241f" }}
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", borderRadius: "6px", border: "1px solid #edf0f2", background: currentPage === totalPages || totalPages === 0 ? "#f7f8fa" : "#fff", cursor: currentPage === totalPages || totalPages === 0 ? "not-allowed" : "pointer", color: currentPage === totalPages || totalPages === 0 ? "#8a94a6" : "#16241f" }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

      </section>
    </main>
  );
}

