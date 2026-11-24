const BASE = '/operations';

export const ROUTES = {
  ROOT: BASE,
  MAKER_DASHBOARD: `${BASE}/maker-dashboard`,
  MAKER_LOAN_BASIC_DETAILS: `${BASE}/maker/loan-basic-details`,
  MAKER_FEES: `${BASE}/maker/fees`,
  MAKER_COVENANTS: `${BASE}/maker/covenants`,
  MAKER_MANDATE_DETAILS: `${BASE}/maker/mandate-details`,
  MAKER_CHEQUE_DETAILS: `${BASE}/maker/cheque-details`,
  PROFILE: `${BASE}/profile`,
};

export const buildRoute = {
  dashboard: () => ROUTES.ROOT,
  makerDashboard: () => ROUTES.MAKER_DASHBOARD,
  makerLoanBasicDetails: () => ROUTES.MAKER_LOAN_BASIC_DETAILS,
  makerFees: () => ROUTES.MAKER_FEES,
  makerCovenants: () => ROUTES.MAKER_COVENANTS,
  makerMandateDetails: () => ROUTES.MAKER_MANDATE_DETAILS,
  makerChequeDetails: () => ROUTES.MAKER_CHEQUE_DETAILS,
  profile: () => ROUTES.PROFILE,
};
