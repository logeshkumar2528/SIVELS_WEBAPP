import { useEffect, useState } from 'react';

// Kept in step with session.js (CURRENT_USER_KEY); not imported to avoid a cycle through the HTTP client.
const CURRENT_USER_KEY = 'sivels_currentUser';
export const PERMISSIONS_CHANGED_EVENT = 'sivels:permissions-changed';
export const PERMISSION_DENIED_CODE = 'PERMISSION_DENIED';

const MODULE_NAMES = {
  DASHBOARD: 'dashboards',
  MASTERS: 'masters',
  STAFF: 'staff',
  ROLES: 'roles and permissions',
  APPLICATIONS: 'applications',
  DOCUMENTS: 'documents',
  ELIGIBILITY: 'eligibility',
  VERIFICATION: 'Back Office verification',
  DEVIATION: 'deviations',
  CREDIT: 'credit review',
  NOTIFICATIONS: 'SMS notifications',
  WALLET: 'the Aadhaar wallet',
};

const LEVEL_VERBS = { VIEW: 'view', EDIT: 'edit', APPROVE: 'approve' };

function readUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** Plain words for a permission code, e.g. "CREDIT.APPROVE" -> "approve credit review". */
export function describePermission(code) {
  const [module, level] = String(code || '').toUpperCase().split('.');
  const name = MODULE_NAMES[module];
  const verb = LEVEL_VERBS[level];
  return name && verb ? `${verb} ${name}` : String(code || '');
}

/**
 * The signed-in user's permission codes, or null when the session predates permissions
 * (nothing is hidden then; the backend still enforces every call).
 */
export function getPermissions(user = readUser()) {
  return Array.isArray(user?.permissions) ? user.permissions : null;
}

export function hasPermission(code, user = readUser()) {
  if (!code) return true;
  const permissions = getPermissions(user);
  if (permissions === null) return true;
  return permissions.includes(String(code).toUpperCase());
}

export function hasAnyPermission(codes, user = readUser()) {
  const list = (Array.isArray(codes) ? codes : [codes]).filter(Boolean);
  return list.length === 0 || list.some((code) => hasPermission(code, user));
}

/** Sidebar/menu items the user can open; items without a `permission` field are always kept. */
export function filterNavItems(items, user = readUser()) {
  return (items || []).filter((item) => !item.permission || hasPermission(item.permission, user));
}

/** Copies roleId, roleName and permissions from a login, /auth/me or refresh response into the stored user. */
export function storeRoleDetails(response) {
  if (!response || !Array.isArray(response.permissions)) return false;
  const user = readUser();
  if (!user) return false;
  const next = {
    ...user,
    permissions: response.permissions,
    ...(response.roleId != null ? { roleId: response.roleId } : {}),
    ...(response.roleName ? { roleName: response.roleName } : {}),
  };
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(next));
  } catch {
    return false;
  }
  window.dispatchEvent(new CustomEvent(PERMISSIONS_CHANGED_EVENT));
  return true;
}

/** React hook: the current permissions plus a `can(code)` helper; re-renders when they change. */
export function usePermissions() {
  const [user, setUser] = useState(readUser);

  useEffect(() => {
    const reload = () => setUser(readUser());
    const onStorage = (event) => {
      if (event.key === null || event.key === CURRENT_USER_KEY) reload();
    };
    window.addEventListener(PERMISSIONS_CHANGED_EVENT, reload);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PERMISSIONS_CHANGED_EVENT, reload);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return {
    permissions: getPermissions(user),
    roleName: user?.roleName || null,
    can: (code) => hasPermission(code, user),
    canAny: (codes) => hasAnyPermission(codes, user),
    filterNav: (items) => filterNavItems(items, user),
  };
}

/**
 * Renders children only when the user holds `permission` (or any of `anyOf`).
 * Hiding is a convenience; the backend rejects the call anyway.
 */
export function Can({ permission, anyOf, fallback = null, children }) {
  const { can, canAny } = usePermissions();
  const allowed = anyOf ? canAny(anyOf) : can(permission);
  return allowed ? children : fallback;
}
