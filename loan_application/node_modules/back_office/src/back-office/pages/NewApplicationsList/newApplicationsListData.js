/**
 * newApplicationsListData.js
 * --------------------
 * Purpose:
 *   Static data for the New Applications Listing page.
 */

/* ==========================================
   SHARED DATA
========================================== */
export { CURRENT_USER, BADGE_COUNTS } from '../Dashboard/dashboardData';

/* ==========================================
   TOP STAT CARDS
========================================== */
export const LISTING_STATS = [
  {
    id:       'total-new',
    title:    'Total New Applications',
    value:    24,
    subtitle: 'All time pending',
    icon:     'FileText',
    color:    'success'
  },
  {
    id:       'todays',
    title:    'Today\'s Applications',
    value:    12,
    subtitle: 'Submitted today',
    icon:     'Calendar',
    color:    'primary'
  },
  {
    id:       'high-priority',
    title:    'High Priority',
    value:    6,
    subtitle: 'Requires attention',
    icon:     'AlertTriangle',
    color:    'warning'
  },
  {
    id:       'avg-loan',
    title:    'Average Loan Amount',
    value:    '₹ 2,15,000',
    subtitle: 'Across all applications',
    icon:     'BadgeIndianRupee',
    color:    'success'
  }
];

/* ==========================================
   SIDEBAR STATS
========================================== */
export const APP_SUMMARY = [
  { label: 'Total Applications', value: 24, isTotal: true },
  { label: 'High Priority',      value: 6,  isDanger: true },
  { label: 'Personal Loans',     value: 9 },
  { label: 'Business Loans',     value: 5 },
  { label: 'Housing Loans',      value: 6 },
  { label: 'Property Loans',     value: 4 },
];

export const TODAYS_STATS = [
  { label: 'New Applications Today', value: 12 },
  { label: 'Average Loan Amount',    value: '₹ 2,35,000' },
  { label: 'Average Processing Time',value: '—' },
  { label: 'High Priority Today',    value: 3 },
];

/* ==========================================
   TABLE DATA
========================================== */
export const NEW_APPLICATIONS_LIST = [
  {
    id:            'APP25060500024',
    customerName:  'Ramesh Kumar',
    mobileNumber:  '98765 43210',
    loanType:      'Personal Loan',
    requestedAmount: '₹ 2,00,000',
    agentName:     'Thiru (AGT0001)',
    rmName:        'Kumar',
    submittedDate: '05 Jun 2025',
    submittedTime: '10:25 AM',
    priority:      'High',
    status:        'New'
  },
  {
    id:            'APP25060500023',
    customerName:  'Kavitha R',
    mobileNumber:  '98765 43211',
    loanType:      'Business Loan',
    requestedAmount: '₹ 3,50,000',
    agentName:     'Arun (AGT0002)',
    rmName:        'Priya',
    submittedDate: '05 Jun 2025',
    submittedTime: '10:10 AM',
    priority:      'Medium',
    status:        'New'
  },
  {
    id:            'APP25060500022',
    customerName:  'Suresh Babu',
    mobileNumber:  '98765 43212',
    loanType:      'Housing Loan',
    requestedAmount: '₹ 18,00,000',
    agentName:     'Manoj (AGT0003)',
    rmName:        'Kumar',
    submittedDate: '05 Jun 2025',
    submittedTime: '09:45 AM',
    priority:      'High',
    status:        'New'
  },
  {
    id:            'APP25060500021',
    customerName:  'Priya Sharma',
    mobileNumber:  '98765 43213',
    loanType:      'Property Loan',
    requestedAmount: '₹ 35,00,000',
    agentName:     'Deepa (AGT004)',
    rmName:        'Priya',
    submittedDate: '05 Jun 2025',
    submittedTime: '09:30 AM',
    priority:      'High',
    status:        'New'
  },
  {
    id:            'APP25060500020',
    customerName:  'Manoj Kumar',
    mobileNumber:  '98765 43214',
    loanType:      'Personal Loan',
    requestedAmount: '₹ 1,25,000',
    agentName:     'Ragul (AGT005)',
    rmName:        'Kumar',
    submittedDate: '05 Jun 2025',
    submittedTime: '09:20 AM',
    priority:      'Low',
    status:        'New'
  },
  {
    id:            'APP25060500019',
    customerName:  'Lakshmi Priya',
    mobileNumber:  '98765 43215',
    loanType:      'Business Loan',
    requestedAmount: '₹ 5,00,000',
    agentName:     'Arun (AGT002)',
    rmName:        'Priya',
    submittedDate: '05 Jun 2025',
    submittedTime: '09:15 AM',
    priority:      'Medium',
    status:        'New'
  },
  {
    id:            'APP25060500018',
    customerName:  'Arun Prakash',
    mobileNumber:  '98765 43216',
    loanType:      'Personal Loan',
    requestedAmount: '₹ 1,80,000',
    agentName:     'Thiru (AGT001)',
    rmName:        'Kumar',
    submittedDate: '05 Jun 2025',
    submittedTime: '09:05 AM',
    priority:      'Low',
    status:        'New'
  },
  {
    id:            'APP25060500017',
    customerName:  'Deepa Lakshmi',
    mobileNumber:  '98765 43217',
    loanType:      'Housing Loan',
    requestedAmount: '₹ 22,00,000',
    agentName:     'Manoj (AGT003)',
    rmName:        'Priya',
    submittedDate: '05 Jun 2025',
    submittedTime: '08:55 AM',
    priority:      'High',
    status:        'New'
  },
  {
    id:            'APP25060500016',
    customerName:  'Naveen Kumar',
    mobileNumber:  '98765 43218',
    loanType:      'Business Loan',
    requestedAmount: '₹ 2,75,000',
    agentName:     'Ragul (AGT005)',
    rmName:        'Kumar',
    submittedDate: '05 Jun 2025',
    submittedTime: '08:40 AM',
    priority:      'Medium',
    status:        'New'
  },
  {
    id:            'APP25060500015',
    customerName:  'Vijayalakshmi',
    mobileNumber:  '98765 43219',
    loanType:      'Property Loan',
    requestedAmount: '₹ 40,00,000',
    agentName:     'Deepa (AGT004)',
    rmName:        'Priya',
    submittedDate: '05 Jun 2025',
    submittedTime: '08:30 AM',
    priority:      'High',
    status:        'New'
  }
];
