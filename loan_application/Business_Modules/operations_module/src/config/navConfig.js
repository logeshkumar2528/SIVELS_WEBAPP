import { ROUTES } from './routeConfig';

export const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    route: '/operations',
    icon: 'LayoutDashboard',
    section: 'OPERATIONS',
  },
  {
    id: 'new-applications',
    label: 'New Applications',
    route: ROUTES.MAKER_NEW_APPLICATIONS,
    icon: 'FileText',
    section: 'OPERATIONS',
    makerOnly: true,
    badgeKey: 'newApplications',
    showZeroBadge: true,
  },
  {
    id: 'pending-applications',
    label: 'Pending Applications',
    route: ROUTES.MAKER_PENDING_APPLICATIONS,
    icon: 'FileText',
    section: 'OPERATIONS',
    makerOnly: true,
    badgeKey: 'pendingApplications',
    showZeroBadge: true,
  },
  {
    id: 'profile',
    label: 'Profile',
    route: '/operations/profile',
    icon: 'UserCircle',
    section: 'ACCOUNT',
  },
  {
    id: 'logout',
    label: 'Logout',
    route: '/login',
    icon: 'LogOut',
    section: 'BOTTOM',
  },
];
