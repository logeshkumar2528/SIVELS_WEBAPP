import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../../../back_office/src/back-office/components/Header/Header';
import { API_BASE_URL } from '../../../../Core/src/api/apiConfig';
import { getStoredRoleCode, getStoredUser, logout } from '../../../../Core/src/auth/session';
import { usePermissions } from '../../../../Core/src/auth/permissions';
import { NAV_ITEMS } from '../config/navConfig';
import { ROUTES } from '../config/routeConfig';
import OperationsSidebar from '../components/OperationsSidebar';
import { useOperationsApplication } from '../context/OperationsApplicationContext';
import './OperationsLayout.css';

function displayName(user) {
  return user?.fullName || user?.name || user?.displayName || 'Operations User';
}

function displayRole(user, roleCode) {
  if (roleCode === 'MAKER') return 'Maker';
  if (roleCode === 'CHECKER') return 'Checker';
  return String(user?.roleName || user?.role || '').replace(/^Operations\s+/i, '') || 'Operations';
}

function getEmployeeCode(user, storedUser) {
  return user?.employeeCode
    || user?.EmployeeCode
    || user?.staffCode
    || user?.StaffCode
    || storedUser?.employeeCode
    || storedUser?.EmployeeCode
    || storedUser?.staffCode
    || storedUser?.StaffCode
    || '';
}

function getOperationsUserId(profile, storedUser) {
  return profile?.operationsUserId
    || profile?.OperationsUserId
    || profile?.id
    || profile?.Id
    || storedUser?.operationsUserId
    || storedUser?.OperationsUserId
    || storedUser?.legacyId
    || storedUser?.LegacyId
    || null;
}

export default function OperationsLayout({ title, subtitle, children, profile = null }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [imageVersion, setImageVersion] = useState(null);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { filterNav } = usePermissions();
  const {
    profile: sharedProfile,
    newApplicationCount,
    pendingApplicationCount,
    queueStatus,
  } = useOperationsApplication();
  const roleCode = getStoredRoleCode(['MAKER', 'CHECKER']);
  const storedUser = getStoredUser(['MAKER', 'CHECKER']);
  const resolvedProfile = sharedProfile && Object.keys(sharedProfile).length > 0
    ? sharedProfile
    : profile && Object.keys(profile).length > 0
      ? profile
      : storedUser;
  const employeeCode = getEmployeeCode(resolvedProfile, storedUser);
  const operationsUserId = getOperationsUserId(resolvedProfile, storedUser);
  const visibleNav = filterNav(NAV_ITEMS).filter((item) => !item.makerOnly || roleCode === 'MAKER');

  useEffect(() => {
    document.body.classList.toggle('body--no-scroll', sidebarOpen);
    return () => document.body.classList.remove('body--no-scroll');
  }, [sidebarOpen]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleProfileImageUpdate = (event) => {
      const updatedRole = String(event.detail?.role || '').toLowerCase();
      if (!updatedRole || updatedRole.includes('operation') || updatedRole.includes('backoffice')) {
        setImageVersion(event.detail?.timestamp || Date.now());
      }
    };

    window.addEventListener('profile-image-updated', handleProfileImageUpdate);
    return () => window.removeEventListener('profile-image-updated', handleProfileImageUpdate);
  }, []);

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
    id: operationsUserId,
    name: displayName(resolvedProfile),
    role: [displayRole(resolvedProfile, roleCode), employeeCode ? `Employee Code : ${employeeCode}` : ''].filter(Boolean).join('\n'),
    employeeCode,
    avatarUrl: API_BASE_URL && operationsUserId
      ? `${API_BASE_URL}/OperationsUsers/${encodeURIComponent(String(operationsUserId))}/profile-image${imageVersion ? `?v=${encodeURIComponent(String(imageVersion))}` : ''}`
      : null,
    imageRole: 'Operations',
  }), [employeeCode, imageVersion, operationsUserId, resolvedProfile, roleCode, storedUser]);

  return (
    <div className={['layout', 'operations-layout', sidebarOpen ? 'layout--sidebar-open' : ''].join(' ').trim()}>
      <OperationsSidebar
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
        badgeCounts={queueStatus === 'ready' && roleCode === 'MAKER'
          ? { newApplications: newApplicationCount, pendingApplications: pendingApplicationCount }
          : {}}
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
