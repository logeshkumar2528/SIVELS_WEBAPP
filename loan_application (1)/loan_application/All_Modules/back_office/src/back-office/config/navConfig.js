/**
 * navConfig.js
 * --------------------
 * Purpose:
 *   Single source of truth for all sidebar navigation items.
 *
 * Responsibilities:
 *   - Define every nav item with exactly the required shape.
 *   - Sidebar.jsx receives this data as a prop — it never imports this file.
 *   - MainLayout imports this and passes it down as `menu`.
 *   - Adding, removing, or reordering a nav item means editing only this file.
 *
 * Nav item shape (strict — no extra properties):
 *   id       {string}      — Unique key; used as React key and aria-label base
 *   label    {string}      — Display text shown in the sidebar
 *   icon     {string}      — Key in iconMap.js; never a direct component reference
 *   route    {string}      — Path from routeConfig.js; never a hardcoded string
 *   badgeKey {string|null} — Key to look up a live count in badgeCounts; null = no badge
 *   section  {string|null} — Section heading label; null = no heading (top-level items)
 *                            'BOTTOM' = pinned at the bottom of the sidebar
 */

import { ROUTES } from './routeConfig';

/**
 * @typedef {Object} NavItem
 * @property {string}      id
 * @property {string}      label
 * @property {string}      icon
 * @property {string}      route
 * @property {string|null} badgeKey
 * @property {string|null} section
 */

/** @type {NavItem[]} */
export const NAV_ITEMS = [

  /* ==========================================
     TOP LEVEL (no section heading)
  ========================================== */
  {
    id:       'dashboard',
    label:    'Dashboard',
    icon:     'LayoutDashboard',
    route:    ROUTES.DASHBOARD,
    badgeKey: null,
    section:  null,
  },

  /* ==========================================
     APPLICATIONS
  ========================================== */
  {
    id:       'new-applications',
    label:    'New Applications',
    icon:     'FilePlus',
    route:    ROUTES.NEW_APPLICATIONS,
    badgeKey: 'newApplications',
    section:  'APPLICATIONS',
  },
  {
    id:       'returned',
    label:    'Returned',
    icon:     'RotateCcw',
    route:    ROUTES.RETURNED,
    badgeKey: 'returned',
    section:  'APPLICATIONS',
  },
  {
    id:       'pending-applications',
    label:    'Pending',
    icon:     'Clock',
    route:    ROUTES.PENDING_APPLICATIONS,
    badgeKey: 'pendingApplications',
    section:  'APPLICATIONS',
  },
  {
    id:       'rejected',
    label:    'Rejected',
    icon:     'XCircle',
    route:    ROUTES.REJECTED_APPLICATIONS,
    badgeKey: 'rejected',
    section:  'APPLICATIONS',
  },
  {
    id:       'approved',
    label:    'Approved',
    icon:     'CheckCircle',
    route:    ROUTES.APPROVED,
    badgeKey: 'approved',
    section:  'APPLICATIONS',
  },
  {
    id:       'disbursement-history',
    label:    'Disbursement History',
    icon:     'History',
    route:    ROUTES.DISBURSEMENT_HISTORY,
    badgeKey: null,
    section:  'APPLICATIONS',
  },

  /* ==========================================
     REPORTS
  ========================================== */
  {
    id:       'reports-analytics',
    label:    'Reports & Analytics',
    icon:     'BarChart2',
    route:    ROUTES.REPORTS_ANALYTICS,
    badgeKey: null,
    section:  'REPORTS',
  },

  /* ==========================================
     BOTTOM (pinned — Profile, Logout)
     section: 'BOTTOM' tells Sidebar to render
     these outside the scrollable nav area.
  ========================================== */
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
