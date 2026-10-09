/**
 * MainLayout
 * --------------------
 * Credit Manager layout built on the shared Back Office Sidebar, Header and layout styles.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../../../back_office/src/back-office/components/Sidebar/Sidebar';
import Header from '../../../back_office/src/back-office/components/Header/Header';
import '../../../back_office/src/back-office/layouts/MainLayout/MainLayout.css';
import { NAV_ITEMS } from '../config/navConfig';
import { ROUTES } from '../config/routeConfig';
import { getCreditManagerAuth } from '../auth/authStorage';
import { useCreditApplications } from '../context/CreditApplicationsContext';

function formatHeaderDate(date) {
  return date.toLocaleDateString('en-IN', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
}

function MainLayout({ title = '', subtitle = '', children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { counts } = useCreditApplications();

  useEffect(() => {
    document.body.classList.toggle('body--no-scroll', sidebarOpen);
    return () => document.body.classList.remove('body--no-scroll');
  }, [sidebarOpen]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleMenuToggle = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const handleSidebarClose = useCallback(() => setSidebarOpen(false), []);
  const handleNavigate = useCallback((route) => navigate(route), [navigate]);
  const handleLogout = useCallback(() => navigate(ROUTES.LOGOUT), [navigate]);
  const handleUserMenuClick = useCallback(() => navigate(ROUTES.PROFILE), [navigate]);

  const badgeCounts = useMemo(() => ({
    receivedApplications: counts.received,
    pendingReview: counts.pending,
    approved: counts.approved,
    rejected: counts.rejected,
  }), [counts]);

  const user = useMemo(() => {
    const auth = getCreditManagerAuth();
    return {
      id: auth?.creditManagerId ?? null,
      name: auth?.name || 'Credit Manager',
      role: auth?.creditManagerCode ? `Credit Manager • ${auth.creditManagerCode}` : 'Credit Manager',
      imageRole: 'CreditManager',
      avatarUrl: null,
    };
  }, []);

  return (
    <div className={['layout', sidebarOpen ? 'layout--sidebar-open' : ''].join(' ').trim()}>
      <Sidebar
        menu={NAV_ITEMS}
        activeRoute={pathname}
        badgeCounts={badgeCounts}
        isOpen={sidebarOpen}
        onNavigate={handleNavigate}
        onClose={handleSidebarClose}
        onLogout={handleLogout}
      />

      <div className="layout-body">
        <Header
          title={title}
          subtitle={subtitle}
          date={formatHeaderDate(new Date())}
          notificationCount={0}
          user={user}
          onMenuToggle={handleMenuToggle}
          onNotificationsClick={() => {}}
          onUserMenuClick={handleUserMenuClick}
        />

        <main className="layout-content" id="main-content" aria-label="Page content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
