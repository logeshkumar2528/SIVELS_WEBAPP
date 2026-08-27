import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary/ErrorBoundary';
import MainLayout from '../layouts/MainLayout/MainLayout';
import { ROUTES } from '../config/routeConfig';
import Dashboard from '../pages/Dashboard/Dashboard';
import NewInvestment from '../pages/NewInvestment/NewInvestment';
import CustomerAllocations from '../pages/CustomerAllocations/CustomerAllocations';
import Profile from '../pages/Profile/Profile';

export default function AppRoutes() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Root redirects directly to Dashboard */}
        <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

        <Route
          path={ROUTES.DASHBOARD}
          element={
            <MainLayout title="Investor Dashboard" subtitle="Overview of your investments and earnings">
              <Dashboard />
            </MainLayout>
          }
        />

        <Route
          path={ROUTES.NEW_INVESTMENT}
          element={
            <MainLayout title="New Investment" subtitle="Configure and allocate funds across loan categories">
              <NewInvestment />
            </MainLayout>
          }
        />

        <Route
          path={ROUTES.CUSTOMER_ALLOCATION}
          element={
            <MainLayout title="Customer Allocation" subtitle="View and manage allocated customer loans">
              <CustomerAllocations />
            </MainLayout>
          }
        />

        <Route
          path={ROUTES.PROFILE}
          element={
            <MainLayout title="Investor Profile" subtitle="Account details, security settings, and activity">
              <Profile />
            </MainLayout>
          }
        />

        <Route
          path={ROUTES.LOGOUT}
          element={<Navigate to={ROUTES.DASHBOARD} replace />}
        />

        {/* Fallback 404 -> Dashboard */}
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
