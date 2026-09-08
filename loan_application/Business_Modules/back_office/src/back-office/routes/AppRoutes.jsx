/**
 * AppRoutes.jsx
 * --------------------
 * Purpose:
 *   Centralised route declarations for the Back Office module.
 *
 * Responsibilities:
 *   - Map every path constant to its page component.
 *   - Guard private operational routes using ProtectedRoute.
 *   - Render Login view for unauthenticated users.
 *   - Wrap authenticated routes inside MainLayout via LayoutWrapper.
 *   - Provide clean top-level title and subtitle metadata to Header.
 *   - Redirect root and fallback paths smoothly.
 */

import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary/ErrorBoundary';
import MainLayout from '../layouts/MainLayout/MainLayout';
import ProtectedRoute from '../auth/ProtectedRoute';
import { removeBackOfficeAuth } from '../auth/authStorage';
import { ROUTES } from '../config/routeConfig';

// Global Monitoring Pages
import Dashboard from '../pages/Dashboard/Dashboard';
import DistrictOverview from '../pages/DistrictOverview/DistrictOverview';
import RMMonitoring from '../pages/RMMonitoring/RMMonitoring';
import AgentMonitoring from '../pages/AgentMonitoring/AgentMonitoring';
import CustomerMonitoring from '../pages/CustomerMonitoring/CustomerMonitoring';
import CustomerVerification from '../pages/CustomerVerification/CustomerVerification';
import Profile from '../pages/Profile/Profile';

// Hierarchical Drill-Down Detail Pages
import DistrictDetail from '../pages/DistrictDetail/DistrictDetail';
import RMDetail from '../pages/RMDetail/RMDetail';
import AgentDetail from '../pages/AgentDetail/AgentDetail';

/**
 * LayoutWrapper
 * Uniformly wraps authenticated page components inside MainLayout and connects navigation callbacks.
 */
function LayoutWrapper({ children, title, subtitle }) {
  const navigate = useNavigate();
  return (
    <MainLayout
      title={title}
      subtitle={subtitle}
      onUserMenuClick={() => navigate(ROUTES.PROFILE)}
      onNotificationsClick={() => {}}
    >
      {children}
    </MainLayout>
  );
}

/**
 * LogoutHandler
 * Safely clears Back Office session keys and redirects to /login.
 */
function LogoutHandler() {
  React.useEffect(() => {
    removeBackOfficeAuth();
    window.location.href = '/login';
  }, []);

  return null;
}

export default function AppRoutes() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* ---- Root & Base Redirects ---- */}
        <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path="/backoffice" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

        {/* ---- Back Office Dashboard (Protected) ---- */}
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <ProtectedRoute>
              <LayoutWrapper
                title="Back Office Dashboard"
                subtitle="Monitor district operations, relationship managers, agents, and customer portfolios."
              >
                <Dashboard />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* ---- District Overview (Global - Protected) ---- */}
        <Route
          path={ROUTES.DISTRICTS}
          element={
            <ProtectedRoute>
              <LayoutWrapper
                title="District Overview"
                subtitle="Real-time monitoring of Tamil Nadu district branches, RM allocations, and loan disbursals."
              >
                <DistrictOverview />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* ---- District Detail (Hierarchy Flow - Protected) ---- */}
        <Route
          path={ROUTES.DISTRICT_DETAIL}
          element={
            <ProtectedRoute>
              <LayoutWrapper
                title="District Operations"
                subtitle="District branch metrics, Relationship Manager allocations, and portfolio performance."
              >
                <DistrictDetail />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* ---- RM Monitoring (Global - Protected) ---- */}
        <Route
          path={ROUTES.RMS}
          element={
            <ProtectedRoute>
              <LayoutWrapper
                title="RM Monitoring"
                subtitle="Supervise active Relationship Managers, assigned field agents, and performance metrics."
              >
                <RMMonitoring />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* ---- RM Detail (Hierarchy Flow - Protected) ---- */}
        <Route
          path={ROUTES.RM_DETAIL}
          element={
            <ProtectedRoute>
              <LayoutWrapper
                title="Relationship Manager Details"
                subtitle="RM branch supervision, assigned field agents network, and target metrics."
              >
                <RMDetail />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* ---- Agent Monitoring (Global - Protected) ---- */}
        <Route
          path={ROUTES.AGENTS}
          element={
            <ProtectedRoute>
              <LayoutWrapper
                title="Agent Monitoring"
                subtitle="Track ground-level loan sourcing agents, active applications, and conversion rates."
              >
                <AgentMonitoring />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* ---- Agent Detail (Hierarchy Flow - Protected) ---- */}
        <Route
          path={ROUTES.AGENT_DETAIL}
          element={
            <ProtectedRoute>
              <LayoutWrapper
                title="Field Agent Operations"
                subtitle="Field agent portfolio, sourced customer applications, and KYC verification queue."
              >
                <AgentDetail />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* ---- Customer Monitoring (Global Queue - Protected) ---- */}
        <Route
          path={ROUTES.CUSTOMERS}
          element={
            <ProtectedRoute>
              <LayoutWrapper
                title="Customer Monitoring"
                subtitle="Track customer loan applications, verification statuses, and operational workflows."
              >
                <CustomerMonitoring />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* ---- Customer Verification Workspace (Dedicated Full-Page Layout - Protected) ---- */}
        <Route
          path={ROUTES.CUSTOMER_VERIFICATION}
          element={
            <ProtectedRoute>
              <CustomerVerification />
            </ProtectedRoute>
          }
        />

        {/* ---- Profile & System Account (Protected) ---- */}
        <Route
          path={ROUTES.PROFILE}
          element={
            <ProtectedRoute>
              <LayoutWrapper
                title="Back Office Profile"
                subtitle="Operational credentials, assigned regional permissions, and system settings."
              >
                <Profile />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />

        {/* ---- Logout Handler Route ---- */}
        <Route
          path={ROUTES.LOGOUT}
          element={
            <LogoutHandler />
          }
        />

        {/* ---- Catch-all Fallback ---- */}
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
