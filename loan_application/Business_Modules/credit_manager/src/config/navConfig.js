/**
 * navConfig.js
 * --------------------
 * Sidebar navigation items for the Credit Manager module.
 * Same shape as the Back Office navConfig (consumed by the shared Back Office Sidebar).
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
    id:       'received',
    label:    'Received Applications',
    icon:     'FileText',
    route:    ROUTES.RECEIVED,
    badgeKey: 'receivedApplications',
    section:  'APPLICATIONS',
  },
  {
    id:       'pending',
    label:    'Pending Review',
    icon:     'Clock',
    route:    ROUTES.PENDING,
    badgeKey: 'pendingReview',
    section:  'APPLICATIONS',
  },
  {
    id:       'approved',
    label:    'Approved Applications',
    icon:     'CheckCircle',
    route:    ROUTES.APPROVED,
    badgeKey: 'approved',
    section:  'APPLICATIONS',
  },
  {
    id:       'rejected',
    label:    'Rejected Applications',
    icon:     'XCircle',
    route:    ROUTES.REJECTED,
    badgeKey: 'rejected',
    section:  'APPLICATIONS',
  },
  {
    id:       'reports',
    label:    'Reports',
    icon:     'BarChart2',
    route:    ROUTES.REPORTS,
    badgeKey: null,
    section:  'REPORTS',
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
