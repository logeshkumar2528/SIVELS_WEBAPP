import React, { useState } from "react";
import Sidebar from "./layout/Sidebar";
import Header from "./layout/Header";
import DashboardPage from "./pages/DashboardPage";
import CustomerVerificationPage from "./pages/CustomerVerificationPage";
import NewApplicationsPage from "./pages/NewApplicationsPage";
import AadhaarEkycPage from "./pages/AadhaarEkycPage";
import CustomerRegistrationPage from "./pages/CustomerRegistrationPage";
import CreateLoginPage from "./pages/CreateLoginPage";
import ReviewSubmitPage from "./pages/ReviewSubmitPage";
import RmProfilePage from "./pages/RmProfilePage";
import MyAgentsPage from "./pages/MyAgentsPage";
import RmLoginPage from "./pages/RmLoginPage";
import "./Rm.css";

export default function RmApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeKey, setActiveKey] = useState("dashboard");

  if (!isAuthenticated) {
    return <RmLoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="dash-root">
      <Sidebar activeKey={activeKey} onNavigate={(k) => setActiveKey(k)} />
      <div className="main-wrap">
        <Header 
          title={
            activeKey === "new-apps" ? "New Applications" : 
            activeKey === "verification" ? "Customer Verification" : 
            activeKey === "aadhaar-ekyc" ? "Aadhaar eKYC Verification" : 
            activeKey === "registration" ? "Customer Registration" : 
            activeKey === "create-login" ? "Create Customer Login" : 
            activeKey === "review-submit" ? "Review & Submit" : 
            activeKey === "profile" ? "My Profile" : 
            activeKey === "my-agents" ? "My Agents" : 
            activeKey === "dashboard" ? "Dashboard" : ""
          }
          breadcrumbs={
            activeKey === "new-apps" ? ["Dashboard", "New Applications"] : 
            activeKey === "verification" ? ["New Applications", "Application Details", "Customer Verification"] : 
            activeKey === "aadhaar-ekyc" ? ["New Applications", "Application Details", "Customer Verification", "Aadhaar eKYC Verification"] : 
            activeKey === "registration" ? ["New Applications", "Application Details", "Customer Verification", "Aadhaar eKYC Verification", "Customer Registration"] : 
            activeKey === "create-login" ? ["New Applications", "Application Details", "Customer Verification", "Aadhaar eKYC Verification", "Customer Registration", "Create Customer Login"] : 
            activeKey === "review-submit" ? ["New Applications", "Application Details", "Customer Verification", "Aadhaar eKYC Verification", "Customer Registration", "Create Login", "Review & Submit"] : 
            activeKey === "profile" ? ["Dashboard", "Profile"] : 
            activeKey === "my-agents" ? ["Dashboard", "My Agents"] : 
            activeKey === "dashboard" ? ["Dashboard", "Overview"] : null
          }
        />
        {activeKey === "new-apps" ? (
          <NewApplicationsPage onProceed={() => setActiveKey("verification")} />
        ) : activeKey === "verification" ? (
          <CustomerVerificationPage onBack={() => setActiveKey("new-apps")} onProceed={() => setActiveKey("aadhaar-ekyc")} />
        ) : activeKey === "aadhaar-ekyc" ? (
          <AadhaarEkycPage onBack={() => setActiveKey("verification")} onProceed={() => setActiveKey("registration")} />
        ) : activeKey === "registration" ? (
          <CustomerRegistrationPage onBack={() => setActiveKey("aadhaar-ekyc")} onProceed={() => setActiveKey("create-login")} />
        ) : activeKey === "create-login" ? (
          <CreateLoginPage onBack={() => setActiveKey("registration")} onProceed={() => setActiveKey("review-submit")} />
        ) : activeKey === "review-submit" ? (
          <ReviewSubmitPage onBack={() => setActiveKey("create-login")} onSubmit={() => setActiveKey("dashboard")} onSaveDraft={() => alert("Saved as draft")} />
        ) : activeKey === "profile" ? (
          <RmProfilePage />
        ) : activeKey === "my-agents" ? (
          <MyAgentsPage />
        ) : (
          <DashboardPage onNavigate={(k) => setActiveKey(k)} />
        )}
      </div>
    </div>
  );
}
