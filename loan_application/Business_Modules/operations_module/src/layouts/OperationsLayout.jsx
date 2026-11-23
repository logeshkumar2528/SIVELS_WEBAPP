import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../../../back_office/src/back-office/components/Header/Header';
import Sidebar from '../../../back_office/src/back-office/components/Sidebar/Sidebar';
import { getStoredRoleCode, getStoredUser, logout } from '../../../../Core/src/auth/session';
import { usePermissions } from '../../../../Core/src/auth/permissions';
import { NAV_ITEMS } from '../config/navConfig';
import './OperationsLayout.css';

function formatHeaderDate(date) {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function displayName(user) {
  return user?.fullName || user?.name || user?.displayName || 'Operations User';
}

function displayRole(user, roleCode) {
  return user?.roleName || (roleCode === 'MAKER' ? 'Operations Maker' : 'Operations Checker');
}

export default function OperationsLayout({ title, subtitle, children, profile = null }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { filterNav } = usePermissions();
  const roleCode = getStoredRoleCode(['MAKER', 'CHECKER']);
  const storedUser = getStoredUser(['MAKER', 'CHECKER']);
  const resolvedProfile = profile && Object.keys(profile).length > 0 ? profile : storedUser;

  useEffect(() => {
    document.body.classList.toggle('body--no-scroll', sidebarOpen);
    return () => document.body.classList.remove('body--no-scroll');
  }, [sidebarOpen]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleNavigate = useCallback((route) => {
    navigate(route);
  }, [navigate]);

  const user = useMemo(() => ({
    id: resolvedProfile?.operationsUserId || resolvedProfile?.id || storedUser?.userId || storedUser?.staffId || null,
    name: displayName(resolvedProfile),
    role: displayRole(resolvedProfile, roleCode),
    employeeCode: resolvedProfile?.employeeCode || resolvedProfile?.staffCode || storedUser?.employeeCode || '',
    avatarUrl: resolvedProfile?.profileImage || resolvedProfile?.profileImageUrl || resolvedProfile?.avatarUrl || null,
    imageRole: 'Operations',
  }), [resolvedProfile, roleCode, storedUser]);

  return (
    <div className={['layout', sidebarOpen ? 'layout--sidebar-open' : ''].join(' ').trim()}>
      <Sidebar
        menu={filterNav(NAV_ITEMS)}
        activeRoute={pathname === '/operations/profile' ? pathname : '/operations'}
        badgeCounts={{}}
        isOpen={sidebarOpen}
        onNavigate={handleNavigate}
        onClose={() => setSidebarOpen(false)}
        onLogout={() => logout()}
      />

      <div className="layout-body">
        <Header
          title={title}
          subtitle={subtitle}
          date={formatHeaderDate(new Date())}
          notificationCount={0}
          user={user}
          onMenuToggle={() => setSidebarOpen((open) => !open)}
          onNotificationsClick={() => {}}
          onUserMenuClick={() => navigate('/operations/profile')}
        />

        <main className="layout-content operations-content" id="main-content" aria-label="Operations page content">
          {children}
        </main>
      </div>
    </div>
  );
}
