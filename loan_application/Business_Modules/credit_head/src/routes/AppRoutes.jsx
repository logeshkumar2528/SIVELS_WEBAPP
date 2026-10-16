/**
 * AppRoutes.jsx
 * --------------------
 * Centralised route declarations for the Credit Head module.
 * Protected routes wrapped in MainLayout, dedicated logout route, and fallback redirects.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '../../../back_office/src/back-office/components/ErrorBoundary/ErrorBoundary';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from '../auth/ProtectedRoute';
import { removeCreditHeadAuth } from '../auth/authStorage';
import { ROUTES } from '../config/routeConfig';

import Dashboard from '../pages/Dashboard';
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
 * Safely clears Credit Head session keys and redirects to /login.
 */
function LogoutHandler() {
  React.useEffect(() => {
    removeCreditHeadAuth();
    window.location.href = '/login';
  }, []);

  return null;
}

const PAGES = [
  {
    path: ROUTES.DASHBOARD,
    title: 'Credit Head Dashboard',
    subtitle: 'Executive credit administration and risk oversight.',
    element: <Dashboard />,
  },
  {
    path: ROUTES.PROFILE,
    title: 'Credit Head Profile',
    subtitle: 'Executive credentials and profile information.',
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

        <Route path={ROUTES.LOGOUT} element={<LogoutHandler />} />

        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
