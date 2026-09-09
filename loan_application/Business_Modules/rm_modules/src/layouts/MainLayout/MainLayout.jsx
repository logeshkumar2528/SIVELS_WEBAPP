import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import Sidebar from '../../components/Sidebar/Sidebar';
import Header from '../../components/Header/Header';
import { NAV_ITEMS } from '../../config/navConfig';
import { useRmDashboardData } from '../../hooks/useRmDashboardData';
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
      // 1. Priority 1: rmData
      const rmDataRaw = localStorage.getItem('rmData');
      if (rmDataRaw) {
        const rm = JSON.parse(rmDataRaw);
        if (rm && typeof rm === 'object') {
          const rmId = rm.rmId || rm.id || localStorage.getItem('rmId') || null;
          return {
            id: rmId,
            rmId: rmId,
            name: rm.fullName || rm.name || 'Relationship Manager',
            role: rm.role || 'Relationship Manager',
            avatarUrl: rm.avatarUrl || rm.profileImageUrl || null,
          };
        }
      }

      // 2. Priority 2: sivels_currentUser ONLY if role === 'RM' / Relationship Manager
      const raw = localStorage.getItem('sivels_currentUser');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const roleStr = String(parsed.role || '').toLowerCase();
          if (roleStr.includes('rm') || roleStr.includes('relationship')) {
            const rmId = parsed.rmId || parsed.id || parsed.userId || localStorage.getItem('rmId') || null;
            return {
              id: rmId,
              rmId: rmId,
              name: parsed.fullName || parsed.name || 'Relationship Manager',
              role: parsed.role || 'Relationship Manager',
              avatarUrl: parsed.avatarUrl || parsed.profileImageUrl || null,
            };
          }
        }
      }

      // 3. Fallback
      const rmId = localStorage.getItem('rmId') || null;
      return {
        id: rmId,
        rmId: rmId,
        name: 'Relationship Manager',
        role: 'Relationship Manager',
        avatarUrl: null,
      };
    } catch {
      const rmId = localStorage.getItem('rmId') || null;
      return {
        id: rmId,
        rmId: rmId,
        name: 'Relationship Manager',
        role: 'Relationship Manager',
        avatarUrl: null,
      };
    }
  }, []);
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const { badgeCounts } = useRmDashboardData();

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
  const fallbackUser = getCurrentUser();
  const resolvedUser = {
    ...fallbackUser,
    ...(currentUser || {}),
    ...(user?.name && user.name !== 'Rajesh Kumar' ? user : {}),
    id: user?.id || user?.rmId || currentUser?.id || currentUser?.rmId || fallbackUser?.id,
    name: (user?.name && user.name !== 'Rajesh Kumar' ? user.name : null) || currentUser?.name || fallbackUser?.name,
    role: (user?.role && user.role !== 'Relationship Manager' ? user.role : null) || currentUser?.role || fallbackUser?.role,
    avatarUrl: user?.avatarUrl || currentUser?.avatarUrl || fallbackUser?.avatarUrl,
  };

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
