import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import Sidebar from '../../components/Sidebar/Sidebar';
import Header from '../../components/Header/Header';
import { NAV_ITEMS } from '../../config/navConfig';
import '../../styles/variables.css';
import '../../styles/listingPages.css';
import './MainLayout.css';

function formatHeaderDate(date) {
  return date.toLocaleDateString('en-IN', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
}

function MainLayout({
  title = '',
  subtitle = '',
  badgeCounts = { newApplications: 12, verification: 5, returned: 2 },
  user = { name: 'Rajesh Kumar', role: 'Relationship Manager' },
  notificationCount = 3,
  onNotificationsClick,
  onUserMenuClick,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const getCurrentUser = useCallback(() => {
    try {
      const raw = localStorage.getItem('sivels_currentUser');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  useEffect(() => {
    document.body.classList.toggle('body--no-scroll', sidebarOpen);
    return () => document.body.classList.remove('body--no-scroll');
  }, [sidebarOpen]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleStorage = () => setCurrentUser(getCurrentUser());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [getCurrentUser]);

  const handleMenuToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleNavigate = useCallback((route) => {
    navigate(route);
  }, [navigate]);

  const todayDate = formatHeaderDate(new Date());
  const resolvedUser = currentUser
    ? {
        name: currentUser.fullName || currentUser.name || 'Relationship Manager',
        role: currentUser.role || 'Relationship Manager',
      }
    : user;

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
          user={resolvedUser}
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

export default MainLayout;
