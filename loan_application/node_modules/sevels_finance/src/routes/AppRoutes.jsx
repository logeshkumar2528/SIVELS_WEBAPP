import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout/AuthLayout';
import CustomerLayout from '../components/layout/CustomerLayout/CustomerLayout';
import CreateUser from '../pages/Users/CreateUser';
import CustomerLoanOffer from '../pages/CustomerLoanOffer/CustomerLoanOffer';
import CustomerProfile from '../pages/CustomerProfile/CustomerProfile';
import CustomerVerification from '../pages/CustomerVerification/CustomerVerification';
import EditGroup from '../pages/Groups/EditGroup';
import GroupPermissions from '../pages/Groups/GroupPermissions';
import Groups from '../pages/Groups/Groups';
import OTPVerification from '../pages/VerifyOTP/VerifyOTP';
import RoleForm from '../pages/Roles/RoleForm';
import Roles from '../pages/Roles/Roles';
import Login from '../pages/Login/Login';
import UserEffectivePermissions from '../pages/Users/UserEffectivePermissions';
import UserGroupAssignments from '../pages/Users/UserGroupAssignments';
import Users from '../pages/Users/Users';
import CustomerApp from '../../../Business_Modules/customer_module/src/App';
import EmploymentTypeDocumentMapping from '../pages/EmploymentTypeDocumentMapping/EmploymentTypeDocumentMapping';

// ─── Placeholder for dashboard pages not yet implemented in Core ───────────
const PlaceholderPage = ({ title }) => (
  <div className="flex items-center justify-center p-12 text-slate-500 bg-white rounded-lg border border-slate-200">
    <p>This module ({title}) will be implemented later.</p>
  </div>
);

// Dashboard stubs (these routes are served by Business_Modules via vite.config.js routing)
const DashboardWelcome   = () => <PlaceholderPage title="Dashboard" />;
const AdminDashboard     = () => <PlaceholderPage title="Admin Dashboard" />;
const AgentDashboard     = () => <PlaceholderPage title="Agent Dashboard" />;
const CustomerDashboard  = () => <PlaceholderPage title="Customer Dashboard" />;
const RmDashboard        = () => <PlaceholderPage title="RM Dashboard" />;
const InvestorDashboard  = () => <PlaceholderPage title="Investor Dashboard" />;
const InvestorApp        = () => <PlaceholderPage title="Investor App" />;

// ── Customer sub-routes ──────────────────────────────────────────────────────
const customerRoutes = [
  { index: true, element: <Navigate to="profile" replace /> },
  { path: 'dashboard', element: <CustomerDashboard /> },
  { path: 'profile',   element: <CustomerProfile /> },
  { path: 'verification', element: <CustomerVerification /> },
  { path: 'loan-offer',   element: <CustomerLoanOffer /> },
  { path: 'apply-loan',   element: <PlaceholderPage title="Apply Loan" /> },
  { path: 'applications', element: <PlaceholderPage title="My Applications" /> },
];

const adminRoutes = [
  { path: '/dashboard',    element: <DashboardWelcome /> },
  { path: '/admin',        element: <AdminDashboard /> },
  { path: '/agent',        element: <AgentDashboard /> },
  { path: '/rm/dashboard', element: <RmDashboard /> },
  { path: '/investor',     element: <InvestorDashboard /> },
  { path: '/investor-new', element: <InvestorApp /> },
];

const managementRoutes = [
  { path: '/groups',                        element: <Groups /> },
  { path: '/groups/create',                 element: <EditGroup /> },
  { path: '/groups/edit/:id',               element: <EditGroup /> },
  { path: '/groups/permissions/:id',        element: <GroupPermissions /> },
  { path: '/users',                         element: <Users /> },
  { path: '/users/create',                  element: <CreateUser /> },
  { path: '/users/groups/:id',              element: <UserGroupAssignments /> },
  { path: '/users/permissions/:id',         element: <UserEffectivePermissions /> },
  { path: '/roles',                         element: <Roles /> },
  { path: '/roles/create',                  element: <RoleForm /> },
  { path: '/roles/edit/:id',                element: <RoleForm /> },
  { path: '/employment-type-document-mapping', element: <EmploymentTypeDocumentMapping /> },
];

const AppRoutes = () => {
  return (
    <Routes>
      {/* Root → Common Login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Backward-compat redirects for old routes */}
      <Route path="/signup" element={<Navigate to="/login" replace />} />
      <Route path="/otp"    element={<Navigate to="/verify" replace />} />

      {/* ── COMMON AUTH ROUTES (shared for ALL roles) ────────────────────── */}
      <Route element={<AuthLayout />}>
        <Route path="/login"  element={<Login />} />
        <Route path="/verify" element={<OTPVerification />} />
      </Route>

      {/* Legacy role-specific login URLs now redirect to the single common login. */}
      <Route path="/rm/login" element={<Navigate to="/login" replace />} />
      <Route path="/Agent/login" element={<Navigate to="/login" replace />} />
      <Route path="/investors/login" element={<Navigate to="/login" replace />} />
      <Route path="/company/login" element={<Navigate to="/login" replace />} />
      <Route path="/client" element={<Navigate to="/login" replace />} />

      {/* ── DASHBOARDS (rendered by vite multi-module router per URL prefix) */}
      {adminRoutes.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}

      {/* ── AGENT MODULE ────────────────────────────────────────────────── */}
      {/* Agent module is now handled exclusively by Vite multi-module router via agent_module/index.html */}

      {/* ── CUSTOMER (Core layout) ──────────────────────────────────────── */}
      <Route path="/customer" element={<CustomerLayout />}>
        {customerRoutes.map((route) =>
          route.index ? (
            <Route key="customer-index" index element={route.element} />
          ) : (
            <Route key={route.path} path={route.path} element={route.element} />
          ),
        )}
      </Route>
      <Route path="/customer-profile" element={<Navigate to="/customer/profile" replace />} />

      {/* ── MANAGEMENT ROUTES ───────────────────────────────────────────── */}
      {managementRoutes.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}

      {/* ── INTEGRATED BUSINESS MODULES ─────────────────────────────────── */}
      <Route path="/client/*"   element={<CustomerApp />} />
      <Route path="/customer/*" element={<Navigate to="/client" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
