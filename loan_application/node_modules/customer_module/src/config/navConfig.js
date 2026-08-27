/**
 * navConfig.js
 *
 * Single source of truth for Customer Sidebar navigation items.
 */

import { ROUTES } from './routeConfig';

export const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    route: ROUTES.DASHBOARD,
  },
  {
    id: 'my-loan',
    label: 'My Loan',
    icon: 'CreditCard',
    route: ROUTES.MY_LOAN,
  },
  {
    id: 'emi-history',
    label: 'EMI History',
    icon: 'History',
    route: ROUTES.EMI_HISTORY,
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: 'User',
    route: ROUTES.PROFILE,
  },
];
