import React, { useState, useCallback } from "react";
import Sidebar from "./layout/Sidebar";
import Header from "./layout/Header";
import Toast from "./layout/Toast";
import DashboardPage from "./pages/DashboardPage";
import NewInvestmentPage from "./pages/Newinvestmentpage";
import CustomerAllocationsPage from "./pages/CustomerAllocationsPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import "./Investor.css";

function PlaceholderPage({ label }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center placeholder-page text-center px-4">
      <div className="placeholder-icon d-flex align-items-center justify-content-center mb-3">
        <span className="text-success fw-semibold">•</span>
      </div>
      <h2 className="h5 fw-semibold mb-1">{label}</h2>
      <p className="text-muted small mb-0" style={{ maxWidth: 360 }}>
        This section isn't built yet — wire it up the same way as the
        dashboard once the screen design is ready.
      </p>
    </div>
  );
}

export default function InvestorApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeKey, setActiveKey] = useState("dashboard");
  const [activeLabel, setActiveLabel] = useState("Dashboard");
  const [toastMsg, setToastMsg] = useState("");

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
    setActiveKey("dashboard");
    setActiveLabel("Dashboard");
  }, []);

  const handleNavigate = useCallback(
    (key, label) => {
      setActiveKey(key);
      setActiveLabel(label);
      if (key !== "dashboard") showToast(`Navigated to ${label}`);
    },
    [showToast]
  );

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setActiveKey("dashboard");
    setActiveLabel("Dashboard");
  }, []);

  const handleSupport = useCallback(() => {
    showToast("Opening customer support");
  }, [showToast]);

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const isDashboard = activeKey === "dashboard";
  const isNewInvestment = activeKey === "new-investment";
  const isCustomers = activeKey === "customer-allocation";
  const isProfile = activeKey === "profile";

  return (
    <div className="investor-app d-flex vh-100 overflow-hidden">
      <Sidebar
        activeKey={activeKey}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onSupport={handleSupport}
      />

      <main className="investor-main flex-grow-1 overflow-auto">
        <Header onAction={showToast} />

        {isDashboard ? (
          <DashboardPage onToast={showToast} />
        ) : isNewInvestment ? (
          <NewInvestmentPage
            onToast={showToast}
            onBackToDashboard={() => handleNavigate("dashboard", "Dashboard")}
            onGoToCustomerAllocation={() => handleNavigate("customer-allocation", "Customer Allocation")}
          />
        ) : isCustomers ? (
          <CustomerAllocationsPage onToast={showToast} />
        ) : isProfile ? (
          <ProfilePage onToast={showToast} />
        ) : (
          <PlaceholderPage label={activeLabel} />
        )}
      </main>

      <Toast message={toastMsg} onClose={() => setToastMsg("")} />
    </div>
  );
}