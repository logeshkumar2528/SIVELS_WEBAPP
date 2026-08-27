import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import Sidebar from '../../components/Sidebar/Sidebar';
import Header from '../../components/Header/Header';
import { NAV_ITEMS } from '../../config/navConfig';
import './MainLayout.css';

function formatHeaderDate(date) {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function MainLayout({
  title = 'Investor Portal',
  subtitle = 'Overview of your investments and earnings',
  badgeCounts = { customers: 10 },
  user = { name: 'Rajesh Kumar', role: 'Investor' },
  notificationCount = 2,
  onNotificationsClick,
  onUserMenuClick,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    document.body.classList.toggle('body--no-scroll', sidebarOpen);
    return () => document.body.classList.remove('body--no-scroll');
  }, [sidebarOpen]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleMenuToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleNavigate = useCallback(
    (route) => {
      navigate(route);
    },
    [navigate]
  );

  const todayDate = formatHeaderDate(new Date());

  return (
    <div className={['layout', sidebarOpen ? 'layout--sidebar-open' : ''].join(' ').trim()}>
      <Sidebar
        menu={NAV_ITEMS}
        activeRoute={pathname}
        badgeCounts={badgeCounts}
        isOpen={sidebarOpen}
        onNavigate={handleNavigate}
        onClose={handleSidebarClose}
      />

      <div className="layout-body">
        <Header
          title={title}
          subtitle={subtitle}
          date={todayDate}
          notificationCount={notificationCount}
          user={user}
          onMenuToggle={handleMenuToggle}
          onNotificationsClick={onNotificationsClick}
          onUserMenuClick={onUserMenuClick}
        />

        <main className="layout-content" id="main-content" aria-label="Page content">
          {children}
        </main>
      </div>
    </div>
  );
}
