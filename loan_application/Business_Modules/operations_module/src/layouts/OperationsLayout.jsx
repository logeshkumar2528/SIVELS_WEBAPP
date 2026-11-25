import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../../../back_office/src/back-office/components/Header/Header';
import Sidebar from '../../../back_office/src/back-office/components/Sidebar/Sidebar';
import { API_BASE_URL } from '../../../../Core/src/api/apiConfig';
import { getStoredRoleCode, getStoredUser, logout } from '../../../../Core/src/auth/session';
import { usePermissions } from '../../../../Core/src/auth/permissions';
import { NAV_ITEMS } from '../config/navConfig';
import { ROUTES } from '../config/routeConfig';
import './OperationsLayout.css';

function displayName(user) {
  return user?.fullName || user?.name || user?.displayName || 'Operations User';
}

function displayRole(user, roleCode) {
  return user?.roleName || (roleCode === 'MAKER' ? 'Operations Maker' : 'Operations Checker');
}

export default function OperationsLayout({ title, subtitle, children, profile = null }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { filterNav } = usePermissions();
  const roleCode = getStoredRoleCode(['MAKER', 'CHECKER']);
  const storedUser = getStoredUser(['MAKER', 'CHECKER']);
  const resolvedProfile = profile && Object.keys(profile).length > 0 ? profile : storedUser;
  const visibleNav = filterNav(NAV_ITEMS).filter((item) => !item.makerOnly || roleCode === 'MAKER');

  useEffect(() => {
    document.body.classList.toggle('body--no-scroll', sidebarOpen);
    return () => document.body.classList.remove('body--no-scroll');
  }, [sidebarOpen]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleNavigate = useCallback((route) => {
    const workflowRoutes = [
      ROUTES.MAKER_LOAN_BASIC_DETAILS,
      ROUTES.MAKER_FEES,
      ROUTES.MAKER_COVENANTS,
      ROUTES.MAKER_MANDATE_DETAILS,
      ROUTES.MAKER_CHEQUE_DETAILS,
    ];
    navigate(search && workflowRoutes.includes(route) ? `${route}${search}` : route);
  }, [navigate, search]);

  const user = useMemo(() => ({
    id: resolvedProfile?.operationsUserId || resolvedProfile?.id || storedUser?.userId || storedUser?.staffId || null,
    name: displayName(resolvedProfile),
    role: [
      displayRole(resolvedProfile, roleCode),
      resolvedProfile?.employeeCode || resolvedProfile?.staffCode || storedUser?.employeeCode
        ? `Employee Code : ${resolvedProfile?.employeeCode || resolvedProfile?.staffCode || storedUser?.employeeCode}`
        : '',
    ].filter(Boolean).join('\n'),
    employeeCode: resolvedProfile?.employeeCode || resolvedProfile?.staffCode || storedUser?.employeeCode || '',
    avatarUrl: (() => {
      const operationsUserId = resolvedProfile?.operationsUserId || resolvedProfile?.OperationsUserId || resolvedProfile?.id || storedUser?.userId || storedUser?.staffId;
      return API_BASE_URL && operationsUserId
        ? `${API_BASE_URL}/OperationsUsers/${encodeURIComponent(String(operationsUserId))}/profile-image`
        : null;
    })(),
    imageRole: 'Operations',
  }), [resolvedProfile, roleCode, storedUser]);

  return (
    <div className={['layout', 'operations-layout', sidebarOpen ? 'layout--sidebar-open' : ''].join(' ').trim()}>
      <Sidebar
        menu={visibleNav}
        activeRoute={
          pathname === ROUTES.PROFILE
            || pathname === ROUTES.MAKER_NEW_APPLICATIONS
            || pathname === ROUTES.MAKER_PENDING_APPLICATIONS
            || pathname === ROUTES.MAKER_LOAN_BASIC_DETAILS
            || pathname === ROUTES.MAKER_FEES
            || pathname === ROUTES.MAKER_COVENANTS
            || pathname === ROUTES.MAKER_MANDATE_DETAILS
            || pathname === ROUTES.MAKER_CHEQUE_DETAILS
            ? pathname
            : ROUTES.ROOT
        }
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
          date=""
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
