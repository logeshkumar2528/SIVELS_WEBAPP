const BASE = '/operations';

export const ROUTES = {
  ROOT: BASE,
  MAKER_DASHBOARD: `${BASE}/maker-dashboard`,
  PROFILE: `${BASE}/profile`,
};

export const buildRoute = {
  dashboard: () => ROUTES.ROOT,
  makerDashboard: () => ROUTES.MAKER_DASHBOARD,
  profile: () => ROUTES.PROFILE,
};
