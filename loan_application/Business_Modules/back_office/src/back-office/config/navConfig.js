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
     MAIN OPERATIONS & MONITORING
  ========================================== */
  {
    id:       'dashboard',
    label:    'Dashboard',
    icon:     'LayoutDashboard',
    route:    ROUTES.DASHBOARD,
    badgeKey: null,
    section:  null,
  },
  {
    id:       'districts',
    label:    'District Overview',
    icon:     'MapPin',
    route:    ROUTES.DISTRICTS,
    badgeKey: null,
    section:  'OPERATIONS',
  },
  {
    id:       'rms',
    label:    'RM Monitoring',
    icon:     'Users',
    route:    ROUTES.RMS,
    badgeKey: null,
    section:  'OPERATIONS',
  },
  {
    id:       'agents',
    label:    'Agent Monitoring',
    icon:     'UserCheck',
    route:    ROUTES.AGENTS,
    badgeKey: null,
    section:  'OPERATIONS',
  },
  {
    id:       'customers',
    label:    'Customer Monitoring',
    icon:     'FileText',
    route:    ROUTES.CUSTOMERS,
    badgeKey: null,
    section:  'OPERATIONS',
  },

  /* ==========================================
     BOTTOM (pinned — Profile, Logout)
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
