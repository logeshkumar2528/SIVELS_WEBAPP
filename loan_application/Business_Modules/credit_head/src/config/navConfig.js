/**
 * navConfig.js
 * --------------------
 * Sidebar navigation items for the Credit Head module.
 * Shape matches Back Office navConfig for consumption by the shared Back Office Sidebar.
 * Credit Head currently contains ONLY:
 *   1. Dashboard
 *   2. Profile
 *   3. Logout
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
