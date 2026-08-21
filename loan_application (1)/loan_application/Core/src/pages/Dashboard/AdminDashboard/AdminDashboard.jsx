import { useEffect, useState } from "react";
import { Bell, Settings, Archive as ArchiveIcon } from "lucide-react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import HeroMetrics from "./components/HeroMetrics";
import DisbursementChart from "./components/DisbursementChart";
import InvestorMarginCard from "./components/InvestorMarginCard";
import ProductSplitChart from "./components/ProductSplitChart";
import NpaLedgerStamp from "./components/NpaLedgerStamp";
import LoanApprovalQueue from "./components/LoanApprovalQueue";
import BorrowerAnalysis from "./components/BorrowerAnalysis";
import LoanActivityTable from "./components/LoanActivityTable";
import { CardSkeleton } from "./components/Skeleton";
import "./AdminDashboard.css";

// AdminDashboard.jsx
// Sivels Finance NBFC console — Admin dashboard, mapped to the 9-KPI
// dashboard requirements spec (Total Loans, Total Disbursement,
// Outstanding, Collection Efficiency, Investor Payable, Spread Income,
// NPA/DPD Status, Portfolio Graphs, Loan Product Split).
// Every child component owns its own mock data, shaped like the API
// response it should eventually receive — see the TODO markers inside
// each component for the endpoint it expects.
// Requires: npm install recharts lucide-react

// Section titles shown in the Topbar for each sidebar nav item.
const sectionTitles = {
  dashboard: "Dashboard",
  statistics: "Statistics",
  reports: "Reports",
  loanMaster: "Loan Master",
  borrowers: "Borrowers",
  collections: "Collections",
  investors: "Investors",
  notifications: "Notifications",
  settings: "Settings",
  archive: "Archive",
};

// Simple placeholder for sections that don't have a dedicated component yet.
function ComingSoonCard({ icon: Icon, message }) {
  return (
    <div className="ldash-card">
      <div className="ldash-empty">
        <Icon size={18} strokeWidth={1.8} />
        <p>{message}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");

  useEffect(() => {
    // TODO: remove once real data fetching drives `loading`.
    // This timeout exists only to exercise the skeleton state below.
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="ldash-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeView={activeView}
        onNavigate={setActiveView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />

      <div className="ldash-main">
        <Topbar onMenuClick={() => setSidebarOpen(true)} title={sectionTitles[activeView]} />

        <div className="ldash-content">
          {loading ? (
            <>
              <div className="ldash-hero ldash-hero-skel">
                <CardSkeleton height={70} />
              </div>
              <div className="ldash-grid">
                <CardSkeleton height={230} />
                <CardSkeleton height={230} />
              </div>
            </>
          ) : (
            <>
              {/* Dashboard — the full overview, every card */}
              {activeView === "dashboard" && (
                <>
                  <div className="ldash-fade-up">
                    <HeroMetrics />
                  </div>
                  <div className="ldash-grid">
                    <div className="ldash-fade-up" style={{ animationDelay: "80ms" }}>
                      <DisbursementChart />
                    </div>
                    <div className="ldash-fade-up" style={{ animationDelay: "140ms" }}>
                      <InvestorMarginCard />
                    </div>
                  </div>
                  <div className="ldash-grid-bottom">
                    <div className="ldash-fade-up" style={{ animationDelay: "180ms" }}>
                      <ProductSplitChart />
                    </div>
                    <div className="ldash-fade-up" style={{ animationDelay: "220ms" }}>
                      <NpaLedgerStamp />
                    </div>
                  </div>
                  <div className="ldash-grid-bottom">
                    <div className="ldash-fade-up" style={{ animationDelay: "260ms" }}>
                      <LoanApprovalQueue />
                    </div>
                    <div className="ldash-fade-up" style={{ animationDelay: "300ms" }}>
                      <BorrowerAnalysis />
                    </div>
                    <div className="ldash-fade-up ldash-span-2" style={{ animationDelay: "340ms" }}>
                      <LoanActivityTable />
                    </div>
                  </div>
                </>
              )}

              {/* Statistics — portfolio trend, product split, DPD/NPA */}
              {activeView === "statistics" && (
                <>
                  <div className="ldash-fade-up">
                    <HeroMetrics />
                  </div>
                  <div className="ldash-grid-bottom">
                    <div className="ldash-fade-up" style={{ animationDelay: "80ms" }}>
                      <ProductSplitChart />
                    </div>
                    <div className="ldash-fade-up" style={{ animationDelay: "140ms" }}>
                      <NpaLedgerStamp />
                    </div>
                  </div>
                  <div className="ldash-grid">
                    <div className="ldash-fade-up ldash-span-2" style={{ animationDelay: "180ms" }}>
                      <DisbursementChart />
                    </div>
                  </div>
                </>
              )}

              {/* Reports — recent loan activity in full */}
              {activeView === "reports" && (
                <div className="ldash-grid-bottom">
                  <div className="ldash-fade-up ldash-span-2">
                    <LoanActivityTable />
                  </div>
                </div>
              )}

              {/* Loan Master — approvals queue + activity ledger */}
              {activeView === "loanMaster" && (
                <div className="ldash-grid-bottom">
                  <div className="ldash-fade-up">
                    <LoanApprovalQueue />
                  </div>
                  <div className="ldash-fade-up ldash-span-2" style={{ animationDelay: "60ms" }}>
                    <LoanActivityTable />
                  </div>
                </div>
              )}

              {/* Borrowers — borrower mix + activity ledger */}
              {activeView === "borrowers" && (
                <div className="ldash-grid-bottom">
                  <div className="ldash-fade-up">
                    <BorrowerAnalysis />
                  </div>
                  <div className="ldash-fade-up ldash-span-2" style={{ animationDelay: "60ms" }}>
                    <LoanActivityTable />
                  </div>
                </div>
              )}

              {/* Collections — disbursement/collection trend + DPD buckets */}
              {activeView === "collections" && (
                <div className="ldash-grid">
                  <div className="ldash-fade-up">
                    <DisbursementChart />
                  </div>
                  <div className="ldash-fade-up" style={{ animationDelay: "80ms" }}>
                    <NpaLedgerStamp />
                  </div>
                </div>
              )}

              {/* Investors — payable & margin only */}
              {activeView === "investors" && (
                <div className="ldash-grid">
                  <div className="ldash-fade-up">
                    <InvestorMarginCard />
                  </div>
                </div>
              )}

              {/* Sections without a dedicated component yet */}
              {activeView === "notifications" && (
                <div className="ldash-grid">
                  <ComingSoonCard icon={Bell} message="No notifications yet." />
                </div>
              )}
              {activeView === "settings" && (
                <div className="ldash-grid">
                  <ComingSoonCard icon={Settings} message="Settings panel coming soon." />
                </div>
              )}
              {activeView === "archive" && (
                <div className="ldash-grid">
                  <ComingSoonCard icon={ArchiveIcon} message="Archive is empty." />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}