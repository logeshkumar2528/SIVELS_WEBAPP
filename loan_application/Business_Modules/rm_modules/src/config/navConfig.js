/**
 * navConfig.js
 * Centralized sidebar navigation definitions for RM Module
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
    id:       'add-customer',
    label:    'Add Customer',
    icon:     'UserPlus',
    route:    ROUTES.ADD_CUSTOMER,
    badgeKey: null,
    section:  'APPLICATIONS',
    permission: 'APPLICATIONS.EDIT',
  },
  {
    id:       'new-applications',
    label:    'New Applications',
    icon:     'FilePlus',
    route:    ROUTES.NEW_APPLICATIONS,
    badgeKey: 'newApplications',
    section:  'APPLICATIONS',
    permission: 'APPLICATIONS.VIEW',
  },
  {
    id:       'pending-applications',
    label:    'Pending Applications',
    icon:     'Clock',
    route:    ROUTES.PENDING_APPLICATIONS,
    badgeKey: 'verification',
    section:  'APPLICATIONS',
    permission: 'APPLICATIONS.VIEW',
  },
  {
    id:       'approved-applications',
    label:    'Logged to HO',
    icon:     'CheckCircle',
    route:    ROUTES.APPROVED_APPLICATIONS,
    badgeKey: 'approved',
    section:  'APPLICATIONS',
    permission: 'APPLICATIONS.VIEW',
  },
  {
    id:       'returned-applications',
    label:    'Returned Applications',
    icon:     'RotateCcw',
    route:    ROUTES.RETURNED_APPLICATIONS,
    badgeKey: 'returned',
    section:  'APPLICATIONS',
    permission: 'APPLICATIONS.VIEW',
  },
  {
    id:       'customer-submission-history',
    label:    "RM's Customer Submission History",
    icon:     'FileText',
    route:    ROUTES.CUSTOMER_SUBMISSION_HISTORY,
    badgeKey: 'customerSubmissionHistory',
    section:  'APPLICATIONS',
    permission: 'APPLICATIONS.VIEW',
  },

  {
    id:       'my-agents',
    label:    'My Agents',
    icon:     'Users',
    route:    ROUTES.MY_AGENTS,
    badgeKey: 'myAgents',
    section:  'MANAGEMENT',
    permission: 'STAFF.VIEW',
  },
  {
    id:       'profile',
    label:    'My Profile',
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
