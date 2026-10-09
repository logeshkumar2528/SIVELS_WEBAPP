/**
 * AppRoutes.jsx
 * --------------------
 * Centralised route declarations for the Credit Manager module.
 * Mirrors the Back Office AppRoutes: protected routes wrapped in MainLayout,
 * a dedicated logout route, and root/fallback redirects.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '../../../back_office/src/back-office/components/ErrorBoundary/ErrorBoundary';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from '../auth/ProtectedRoute';
import { removeCreditManagerAuth } from '../auth/authStorage';
import { ROUTES } from '../config/routeConfig';

import Dashboard from '../pages/Dashboard';
import ReceivedApplications from '../pages/ReceivedApplications';
import PendingReview from '../pages/PendingReview';
import ApprovedApplications from '../pages/ApprovedApplications';
import RejectedApplications from '../pages/RejectedApplications';
import Reports from '../pages/Reports';
import ApplicationReview from '../pages/ApplicationReview';
import MyProfile from '../pages/MyProfile';

function LayoutWrapper({ children, title, subtitle }) {
  return (
    <MainLayout title={title} subtitle={subtitle}>
      {children}
    </MainLayout>
  );
}

/**
 * LogoutHandler
 * Safely clears Credit Manager session keys and redirects to /login.
 */
function LogoutHandler() {
  React.useEffect(() => {
    removeCreditManagerAuth();
    window.location.href = '/login';
  }, []);

  return null;
}

const PAGES = [
  {
    path: ROUTES.DASHBOARD,
    title: 'Credit Manager Dashboard',
    subtitle: 'Overview of loan applications received from the Back Office for credit review.',
    element: <Dashboard />,
  },
  {
    path: ROUTES.RECEIVED,
    title: 'Received Applications',
    subtitle: 'All applications submitted to the Credit Manager by the Back Office.',
    element: <ReceivedApplications />,
  },
  {
    path: ROUTES.PENDING,
    title: 'Pending Review',
    subtitle: 'Applications awaiting Credit Manager review and decision.',
    element: <PendingReview />,
  },
  {
    path: ROUTES.APPROVED,
    title: 'Approved Applications',
    subtitle: 'Applications approved by the Credit Manager.',
    element: <ApprovedApplications />,
  },
  {
    path: ROUTES.REJECTED,
    title: 'Rejected Applications',
    subtitle: 'Applications rejected during credit review.',
    element: <RejectedApplications />,
  },
  {
    path: ROUTES.REPORTS,
    title: 'Reports',
    subtitle: 'Credit review summary across all received applications.',
    element: <Reports />,
  },
  {
    path: ROUTES.PROFILE,
    title: 'Credit Manager Profile',
    subtitle: 'Account credentials and access details.',
    element: <MyProfile />,
  },
];

export default function AppRoutes() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

        {PAGES.map(({ path, title, subtitle, element }) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute>
                <LayoutWrapper title={title} subtitle={subtitle}>
                  {element}
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />
        ))}

        {/* Full-screen workspace, same as the Back Office Customer Verification route */}
        <Route
          path={ROUTES.APPLICATION_REVIEW}
          element={
            <ProtectedRoute>
              <ApplicationReview />
            </ProtectedRoute>
          }
        />

        <Route path={ROUTES.LOGOUT} element={<LogoutHandler />} />

        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
