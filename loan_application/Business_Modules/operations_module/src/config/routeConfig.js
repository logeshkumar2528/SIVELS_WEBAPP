const BASE = '/operations';

export const ROUTES = {
  ROOT: BASE,
  MAKER_DASHBOARD: `${BASE}/maker-dashboard`,
  MAKER_LOAN_BASIC_DETAILS: `${BASE}/maker/loan-basic-details`,
  PROFILE: `${BASE}/profile`,
};

export const buildRoute = {
  dashboard: () => ROUTES.ROOT,
  makerDashboard: () => ROUTES.MAKER_DASHBOARD,
  makerLoanBasicDetails: () => ROUTES.MAKER_LOAN_BASIC_DETAILS,
  profile: () => ROUTES.PROFILE,
};
