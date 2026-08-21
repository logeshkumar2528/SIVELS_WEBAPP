/**
 * dashboardData.js
 * --------------------
 * Purpose:
 *   All static business data for the Back Office Dashboard page.
 *
 * Responsibilities:
 *   - Define every data constant consumed by Dashboard.jsx.
 *   - Keep Dashboard.jsx free of hardcoded data.
 *   - In production, these constants are replaced by API responses.
 *
 * Notes:
 *   - CHART_DATA colors are hex values matching the --color-chart-* tokens
 *     in variables.css. Recharts Cell.fill cannot resolve CSS custom properties,
 *     so actual hex values are required here. If a chart color changes, update
 *     both variables.css and the corresponding entry here.
 */

import { NEW_APPLICATIONS_LIST } from '../NewApplicationsList/newApplicationsListData';
import { RETURNED_TABLE_DATA } from '../ReturnedApplications/returnedApplicationsData';
import { PENDING_TABLE_DATA } from '../PendingApplications/pendingApplicationsData';
import { REJECTED_TABLE_DATA } from '../RejectedApplications/rejectedApplicationsData';
import { APPROVED_TABLE_DATA } from '../ApprovedApplications/approvedApplicationsData';
import { DISBURSEMENT_TABLE_DATA } from '../DisbursementHistory/disbursementHistoryData';

/* ==========================================
   CURRENT USER
   Passed to MainLayout → Header
========================================== */
export const CURRENT_USER = {
  name:      'Rajesh Kumar',
  role:      'Back Office Officer',
  avatarUrl: null,           /* null triggers initials fallback in Header */
};

/* ==========================================
   BADGE COUNTS
   Passed to MainLayout → Sidebar
   Keys must match NavItem.badgeKey values.
========================================== */
export const BADGE_COUNTS = {
  get newApplications() { return NEW_APPLICATIONS_LIST.length; },
  get inReview() { return APPLICATIONS.filter(app => app.status === 'inReview').length; },
  get returned() { return RETURNED_TABLE_DATA.length; },
  get pendingApplications() { return PENDING_TABLE_DATA.length; },
  get rejected() { return REJECTED_TABLE_DATA.length; },
  get approved() { return APPROVED_TABLE_DATA.length; },
  get disbursed() { return DISBURSEMENT_TABLE_DATA.length; },
};

/* ==========================================
   STAT CARDS
   icon field must match a key in iconMap.js
========================================== */
export const STAT_CARDS = [
  {
    id:             'new-applications',
    icon:           'FilePlus',
    title:          'New Applications',
    value:          24,
    trend:          '20% vs yesterday',
    trendDirection: 'up',
    variant:        'info',
  },
  {
    id:             'in-review',
    icon:           'Clock',
    title:          'In Review',
    value:          18,
    trend:          '12% vs yesterday',
    trendDirection: 'up',
    variant:        'warning',
  },
  {
    id:             'returned',
    icon:           'RotateCcw',
    title:          'Returned',
    value:          6,
    trend:          '14% vs yesterday',
    trendDirection: 'down',
    variant:        'danger',
  },
  {
    id:             'approved',
    icon:           'CheckCircle',
    title:          'Approved',
    value:          32,
    trend:          '18% vs yesterday',
    trendDirection: 'up',
    variant:        'success',
  },
  {
    id:             'disbursed',
    icon:           'BadgeIndianRupee',
    title:          'Disbursed',
    value:          15,
    trend:          '25% vs yesterday',
    trendDirection: 'up',
    variant:        'default',
  },
];

/* ==========================================
   FILTER TABS
   Counts represent server-side totals —
   dynamically derived from APPLICATIONS in Dashboard.
========================================== */
export const FILTER_TABS = [
  { id: 'all',       label: 'All'       },
  { id: 'new',       label: 'New'       },
  { id: 'inReview',  label: 'In Review' },
  { id: 'returned',  label: 'Returned'  },
  { id: 'approved',  label: 'Approved'  },
  { id: 'disbursed', label: 'Disbursed' },
];

/* ==========================================
   RECENT APPLICATIONS
   status values must match STATUS_CONFIG keys.
========================================== */
export const APPLICATIONS = [
  {
    id:            'APP25060500024',
    customerName:  'Ramesh Kumar',
    customerPhone: '98765 43210',
    agentName:     'Thiru (AGT0001)',
    rmName:        'Kumar',
    loanAmount:    '₹ 2,00,000',
    submittedDate: '05 Jun 2025',
    submittedTime: '10:25 AM',
    status:        'new',
  },
  {
    id:            'APP25060500023',
    customerName:  'Priya Sharma',
    customerPhone: '98765 43211',
    agentName:     'Arun (AGT0002)',
    rmName:        'Kumar',
    loanAmount:    '₹ 1,50,000',
    submittedDate: '05 Jun 2025',
    submittedTime: '09:50 AM',
    status:        'inReview',
  },
  {
    id:            'APP25060500022',
    customerName:  'Suresh Babu',
    customerPhone: '98765 43212',
    agentName:     'Karthik (AGT0003)',
    rmName:        'Kumar',
    loanAmount:    '₹ 1,00,000',
    submittedDate: '05 Jun 2025',
    submittedTime: '09:15 AM',
    status:        'inReview',
  },
  {
    id:            'APP25060500021',
    customerName:  'Meena Devi',
    customerPhone: '98765 43213',
    agentName:     'Thiru (AGT0001)',
    rmName:        'Kumar',
    loanAmount:    '₹ 2,50,000',
    submittedDate: '04 Jun 2025',
    submittedTime: '04:40 PM',
    status:        'returned',
  },
  {
    id:            'APP25060500020',
    customerName:  'Vignesh Raj',
    customerPhone: '98765 43214',
    agentName:     'Arun (AGT0002)',
    rmName:        'Kumar',
    loanAmount:    '₹ 80,000',
    submittedDate: '04 Jun 2025',
    submittedTime: '03:20 PM',
    status:        'new',
  },
  {
    id:            'APP25060500019',
    customerName:  'Lakshmi Priya',
    customerPhone: '98765 43215',
    agentName:     'Karthik (AGT0003)',
    rmName:        'Kumar',
    loanAmount:    '₹ 1,20,000',
    submittedDate: '04 Jun 2025',
    submittedTime: '02:10 PM',
    status:        'approved',
  },
  {
    id:            'APP25060500018',
    customerName:  'Gokul V',
    customerPhone: '98765 43216',
    agentName:     'Thiru (AGT0001)',
    rmName:        'Kumar',
    loanAmount:    '₹ 2,00,000',
    submittedDate: '04 Jun 2025',
    submittedTime: '01:05 PM',
    status:        'disbursed',
  },
  {
    id:            'APP25060500017',
    customerName:  'Kavitha S',
    customerPhone: '98765 43217',
    agentName:     'Arun (AGT0002)',
    rmName:        'Kumar',
    loanAmount:    '₹ 1,80,000',
    submittedDate: '04 Jun 2025',
    submittedTime: '11:45 AM',
    status:        'approved',
  },
  {
    id:            'APP25060500016',
    customerName:  'Anitha R',
    customerPhone: '98765 43218',
    agentName:     'Karthik (AGT0003)',
    rmName:        'Kumar',
    loanAmount:    '₹ 95,000',
    submittedDate: '03 Jun 2025',
    submittedTime: '03:30 PM',
    status:        'new',
  },
  {
    id:            'APP25060500015',
    customerName:  'Senthil Kumar',
    customerPhone: '98765 43219',
    agentName:     'Thiru (AGT0001)',
    rmName:        'Kumar',
    loanAmount:    '₹ 3,00,000',
    submittedDate: '03 Jun 2025',
    submittedTime: '11:00 AM',
    status:        'inReview',
  },
  {
    id:            'APP25060500014',
    customerName:  'Deepa M',
    customerPhone: '98765 43220',
    agentName:     'Arun (AGT0002)',
    rmName:        'Kumar',
    loanAmount:    '₹ 1,75,000',
    submittedDate: '03 Jun 2025',
    submittedTime: '09:45 AM',
    status:        'approved',
  },
  {
    id:            'APP25060500013',
    customerName:  'Balamurugan P',
    customerPhone: '98765 43221',
    agentName:     'Karthik (AGT0003)',
    rmName:        'Kumar',
    loanAmount:    '₹ 2,25,000',
    submittedDate: '02 Jun 2025',
    submittedTime: '04:15 PM',
    status:        'disbursed',
  },
];

/* ==========================================
   DONUT CHART DATA
   Colors are hex values matching --color-chart-* tokens in variables.css.
   Recharts Cell.fill requires resolved hex — CSS custom properties
   are not supported in SVG fill attributes.
========================================== */
export const CHART_DATA = [
  { label: 'New',       value: 24, percentage: '25.26%', color: '#0284C7' },
  { label: 'In Review', value: 18, percentage: '18.95%', color: '#F59E0B' },
  { label: 'Returned',  value:  6, percentage:  '6.32%', color: '#EF4444' },
  { label: 'Approved',  value: 32, percentage: '33.68%', color: '#22C55E' },
  { label: 'Disbursed', value: 15, percentage: '15.79%', color: '#A855F7' },
];

export const CHART_TOTAL = CHART_DATA.reduce((sum, d) => sum + d.value, 0);

/* ==========================================
   TASKS
   icon field must match a key in iconMap.js
========================================== */
export const TASKS = [
  {
    id:    'doc-verify',
    icon:  'FileCheck',
    label: 'Document Verification Pending',
    count: 18,
  },
  {
    id:    'pan-verify',
    icon:  'CreditCard',
    label: 'PAN Verification Pending',
    count: 24,
  },
  {
    id:    'cibil-fetch',
    icon:  'ShieldCheck',
    label: 'CIBIL Fetch Pending',
    count: 18,
  },
  {
    id:    'bank-verify',
    icon:  'Landmark',
    label: 'Bank Verification Pending',
    count: 14,
  },
  {
    id:    'disbursement',
    icon:  'BadgeIndianRupee',
    label: 'Disbursement Pending',
    count: 15,
  },
];

/* ==========================================
   IMPORTANT ALERTS
   severity: 'warning' | 'danger' | 'info'
   icon field must match a key in iconMap.js
========================================== */
export const ALERTS = [
  {
    id:       'alert-overdue',
    icon:     'AlertTriangle',
    severity: 'warning',
    message:  '8 applications pending for more than 2 days',
  },
  {
    id:       'alert-bank',
    icon:     'AlertTriangle',
    severity: 'warning',
    message:  '3 bank verifications are pending',
  },
  {
    id:       'alert-cibil',
    icon:     'Info',
    severity: 'info',
    message:  'CIBIL service update: All systems normal',
  },
];
