/**
 * routeConfig.js
 *
 * Centralised route path constants for the Customer Module.
 */

const BASE = '';
const LEGACY_BASE = '/customer';

export const ROUTES = {
  HOME: '/client',
  VERIFY_OTP: '/client/verify',
  PENDING_APPROVAL: '/client/pending-approval',
  REGISTER: '/client/register',
  DASHBOARD: '/dashboard',
  MY_LOAN: '/my-loan',
  EMI_HISTORY: '/emi-history',
  PROFILE: '/profile',
};

export const LEGACY_ROUTES = {
  HOME: `${LEGACY_BASE}`,
  VERIFY_OTP: `${LEGACY_BASE}/verify`,
  PENDING_APPROVAL: `${LEGACY_BASE}/pending-approval`,
  REGISTER: `${LEGACY_BASE}/register`,
  DASHBOARD: `${LEGACY_BASE}/dashboard`,
  MY_LOAN: `${LEGACY_BASE}/my-loan`,
  EMI_HISTORY: `${LEGACY_BASE}/emi-history`,
  PROFILE: `${LEGACY_BASE}/profile`,
};
