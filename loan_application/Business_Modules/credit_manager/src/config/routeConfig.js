/**
 * routeConfig.js
 * --------------------
 * Route path constants for the Credit Manager module.
 * Paths are relative to the router basename `/credit`.
 */

export const ROUTES = {
  DASHBOARD: '/dashboard',
  RECEIVED: '/received',
  PENDING: '/pending',
  APPROVED: '/approved',
  REJECTED: '/rejected',
  REPORTS: '/reports',
  APPLICATION_REVIEW: '/applications/:customerId',
  PROFILE: '/profile',
  LOGOUT: '/logout',
};

export function buildApplicationReviewRoute(customerId) {
  return ROUTES.APPLICATION_REVIEW.replace(':customerId', encodeURIComponent(customerId));
}
