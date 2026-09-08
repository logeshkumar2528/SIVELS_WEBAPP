/**
 * routeConfig.js
 * --------------------
 * Centralised route path constants and dynamic route builders for the Back Office module.
 *
 * Rules:
 *  - Never hardcode path strings inside components or config files.
 *  - Always import from here: import { ROUTES, buildRoute } from '../config/routeConfig'
 *  - Changing a URL means editing only this file.
 *  - All routes are prefixed with /backoffice as the base path.
 */

const BASE = '/backoffice';

export const ROUTES = {
  /* ==========================================
     MAIN OPERATIONS & MONITORING
  ========================================== */
  DASHBOARD:            `${BASE}/dashboard`,
  DISTRICTS:            `${BASE}/districts`,
  DISTRICT_DETAIL:      `${BASE}/districts/:districtId`,
  RMS:                  `${BASE}/rms`,
  RM_DETAIL:            `${BASE}/rms/:rmId`,
  AGENTS:               `${BASE}/agents`,
  AGENT_DETAIL:         `${BASE}/agents/:agentId`,
  CUSTOMERS:            `${BASE}/customers`,
  CUSTOMER_DETAIL:      `${BASE}/customers/:customerId`,
  CUSTOMER_VERIFICATION: `${BASE}/customers/:customerId/verify`,

  /* ==========================================
     ACCOUNT & SYSTEM
  ========================================== */
  PROFILE:              `${BASE}/profile`,
  LOGOUT:               `${BASE}/logout`,
};

/**
 * Reusable dynamic route builders for ID-based navigation.
 */
export const buildRoute = {
  dashboard: () => ROUTES.DASHBOARD,
  districts: () => ROUTES.DISTRICTS,
  districtDetail: (districtId) => `${BASE}/districts/${districtId}`,
  rms: () => ROUTES.RMS,
  rmDetail: (rmId) => `${BASE}/rms/${rmId}`,
  agents: () => ROUTES.AGENTS,
  agentDetail: (agentId) => `${BASE}/agents/${agentId}`,
  customers: () => ROUTES.CUSTOMERS,
  customerDetail: (customerId) => `${BASE}/customers/${customerId}`,
  customerVerification: (customerId) => `${BASE}/customers/${customerId}/verify`,
  profile: () => ROUTES.PROFILE,
  logout: () => ROUTES.LOGOUT,
};
