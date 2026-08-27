import { ROUTES } from './routeConfig';

export const FIELD_VERIFICATION_STEPS = [
  { id: 'address-verification', label: 'Address', route: ROUTES.FIELD_VERIFICATION },
  { id: 'collateral-verification', label: 'Collateral', route: ROUTES.FIELD_VERIFICATION_STEP2 },
];