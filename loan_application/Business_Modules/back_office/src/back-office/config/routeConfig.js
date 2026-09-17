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
  CUSTOMER_VIEW_FORM:   `${BASE}/customers/:customerId/view-form`,
  SUBMIT_TO_CREDIT:     `${BASE}/submit-to-credit`,
  SUBMIT_TO_CREDIT_DETAIL: `${BASE}/submit-to-credit/:customerId`,

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
  customerViewForm: (customerId) => `${BASE}/customers/${customerId}/view-form`,
  submitToCredit: () => ROUTES.SUBMIT_TO_CREDIT,
  submitToCreditDetail: (customerId) => `${BASE}/submit-to-credit/${customerId}`,
  profile: () => ROUTES.PROFILE,
  logout: () => ROUTES.LOGOUT,
};
