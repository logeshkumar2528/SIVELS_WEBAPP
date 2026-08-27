/**
 * navConfig.js
 * Single source of truth for Investors module sidebar navigation items.
 */

import { ROUTES } from './routeConfig';

export const NAV_ITEMS = [
  {
    id:       'dashboard',
    label:    'Dashboard',
    icon:     'LayoutDashboard',
    route:    ROUTES.DASHBOARD,
    badgeKey: null,
    section:  null,
  },
  {
    id:       'new-investment',
    label:    'New Investment',
    icon:     'PlusCircle',
    route:    ROUTES.NEW_INVESTMENT,
    badgeKey: null,
    section:  'INVESTMENTS',
  },
  {
    id:       'customer-allocation',
    label:    'Customer Allocation',
    icon:     'Users',
    route:    ROUTES.CUSTOMER_ALLOCATION,
    badgeKey: 'customers',
    section:  'INVESTMENTS',
  },
  {
    id:       'profile',
    label:    'Profile',
    icon:     'UserCircle',
    route:    ROUTES.PROFILE,
    badgeKey: null,
    section:  'BOTTOM',
  },
  {
    id:       'logout',
    label:    'Logout',
    icon:     'LogOut',
    route:    ROUTES.LOGOUT,
    badgeKey: null,
    section:  'BOTTOM',
  },
];
