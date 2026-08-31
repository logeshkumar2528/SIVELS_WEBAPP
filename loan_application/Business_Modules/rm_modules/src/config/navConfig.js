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
    id:       'new-applications',
    label:    'New Applications',
    icon:     'FilePlus',
    route:    ROUTES.NEW_APPLICATIONS,
    badgeKey: 'newApplications',
    section:  'APPLICATIONS',
  },
  {
    id:       'pending-applications',
    label:    'Pending Applications',
    icon:     'Clock',
    route:    ROUTES.PENDING_APPLICATIONS,
    badgeKey: 'verification',
    section:  'APPLICATIONS',
  },
  {
    id:       'approved-applications',
    label:    'Approved Applications',
    icon:     'CheckCircle',
    route:    ROUTES.APPROVED_APPLICATIONS,
    badgeKey: null,
    section:  'APPLICATIONS',
  },
  {
    id:       'returned-applications',
    label:    'Returned Applications',
    icon:     'RotateCcw',
    route:    ROUTES.RETURNED_APPLICATIONS,
    badgeKey: null,
    section:  'APPLICATIONS',
  },
  {
    id:       'field-verification',
    label:    'Field Verification',
    icon:     'MapPin',
    route:    ROUTES.FIELD_VERIFICATION,
    badgeKey: null,
    section:  'APPLICATIONS',
  },
  {
    id:       'submission-history',
    label:    'Submission History',
    icon:     'History',
    route:    ROUTES.SUBMISSION_HISTORY,
    badgeKey: null,
    section:  'APPLICATIONS',
  },

  {
    id:       'my-agents',
    label:    'My Agents',
    icon:     'Users',
    route:    ROUTES.MY_AGENTS,
    badgeKey: null,
    section:  'MANAGEMENT',
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
