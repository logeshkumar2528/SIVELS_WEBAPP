import React, { useEffect, useRef, useState } from 'react';
import PermissionNotice from './PermissionNotice';
import { LOGIN_PATH, handleSessionExpired, navigation, redirectToLogin } from './authEvents';
import { getStoredLandingPath, getStoredRoleCode, restoreSession } from './session';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, hasSession } from './tokenStore';

let restorePromise = null;

function restoreOnce() {
  if (!restorePromise) {
    restorePromise = restoreSession().catch((error) => {
      restorePromise = null;
      throw error;
    });
  }
  return restorePromise;
}

function redirectToOwnLanding() {
  const target = getStoredLandingPath();
  const current = `${window.location.pathname}${window.location.search}`;
  if (!target || target === current || target === window.location.pathname) {
    handleSessionExpired();
    return;
  }
  navigation.replace(target);
}

function initialStatus(isRoleAllowed) {
  if (!hasSession()) return 'no-session';
  const roleCode = getStoredRoleCode();
  if (!roleCode) return 'checking';
  return isRoleAllowed(roleCode) ? 'allowed' : 'wrong-role';
}

/**
 * Module-level route guard. Requires a session token and a roleCode accepted by the module,
 * verifies the session once per page load with GET /auth/me, and sends users with another
 * role to their own landing page.
 *
 * @param {string[]} [allowedRoles]  roleCodes allowed into the module
 * @param {(roleCode: string, pathname: string) => boolean} [isAllowed]  custom check (overrides allowedRoles)
 * @param {string} [pathname]  current router path; when given, the role is re-checked on every navigation
 */
export default function RequireAuth({ allowedRoles = [], isAllowed, pathname, children }) {
  const isRoleAllowed = (roleCode) =>
    isAllowed ? isAllowed(roleCode, pathname ?? window.location.pathname) : allowedRoles.includes(roleCode);
  const checkRef = useRef(isRoleAllowed);
  useEffect(() => {
    checkRef.current = isRoleAllowed;
  });

  const [status, setStatus] = useState(() => initialStatus(isRoleAllowed));
  const mountStatusRef = useRef(status);

  useEffect(() => {
    if (status !== 'allowed' || pathname === undefined) return;
    const roleCode = getStoredRoleCode();
    if (roleCode && !checkRef.current(roleCode)) {
      redirectToOwnLanding();
    }
  }, [pathname, status]);

  useEffect(() => {
    const mountStatus = mountStatusRef.current;
    if (mountStatus === 'no-session') {
      handleSessionExpired();
      return undefined;
    }
    if (mountStatus === 'wrong-role') {
      redirectToOwnLanding();
      return undefined;
    }

    let cancelled = false;
    restoreOnce()
      .then((roleCode) => {
        if (cancelled) return;
        if (!roleCode) {
          handleSessionExpired();
        } else if (!checkRef.current(roleCode)) {
          redirectToOwnLanding();
        } else if (mountStatus === 'checking') {
          setStatus('allowed');
        }
      })
      .catch(() => {
        // A 401 has already been handled by the HTTP client. Without a stored role the
        // module cannot be authorised, so send the user back to login.
        if (!cancelled && mountStatus === 'checking') {
          handleSessionExpired();
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Pages restored from the back/forward cache after logout must not stay visible.
    const onPageShow = (event) => {
      if (event.persisted && !hasSession()) {
        navigation.replace(LOGIN_PATH);
      }
    };
    const onStorage = (event) => {
      if ((event.key === null || event.key === ACCESS_TOKEN_KEY || event.key === REFRESH_TOKEN_KEY) && !hasSession()) {
        redirectToLogin();
      }
    };
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  if (status !== 'allowed') return null;

  return (
    <>
      {children}
      <PermissionNotice />
    </>
  );
}
