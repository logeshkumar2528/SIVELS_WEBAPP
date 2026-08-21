/**
 * disbursementHistoryData.js
 * --------------------
 * Static data for Disbursement History page.
 */

export { CURRENT_USER, BADGE_COUNTS } from '../Dashboard/dashboardData';

export const METRIC_CARDS = [
  {
    id: 'total-apps',
    title: 'Total Disbursed Applications',
    value: '158',
    subtext: 'View all disbursed loans',
    icon: 'FileText',
    color: 'success',
  },
  {
    id: 'total-amount',
    title: 'Total Disbursed Amount',
    value: '₹ 2,34,85,000',
    subtext: 'Across all branches',
    icon: 'CheckCircle2',
    color: 'success',
  },
  {
    id: 'month-disbursed',
    title: 'This Month Disbursed',
    value: '₹ 32,45,000',
    subtext: '12 Applications',
    icon: 'Wallet',
    color: 'purple',
  },
  {
    id: 'pending-disb',
    title: 'Pending Disbursement',
    value: '8',
    subtext: 'Ready for disbursement',
    icon: 'Clock',
    color: 'warning',
  },
  {
    id: 'rejected-cancelled',
    title: 'Rejected / Cancelled',
    value: '14',
    subtext: 'View details',
    icon: 'XCircle',
    color: 'danger',
  },
];

export const DISBURSEMENT_TABLE_DATA = [
  {
    id: 'APP25060500018',
    customerName: 'Arun Prakash',
    amount: '₹ 1,80,000',
    disbursedOn: '05 Jun 2025',
    disbursedTo: 'HDFC Bank',
    status: 'Success',
    accountNo: '5010 1234 5678 90',
    utr: 'HDFCB250605113245',
    mode: 'NEFT',
    processingFee: '₹ 1,500',
    actualDisbursed: '₹ 1,78,200',
    remarks: 'Loan amount transferred successfully.',
    bankTime: '05 Jun 2025, 11:34 AM'
  },
  {
    id: 'APP25060500017',
    customerName: 'Kavitha R',
    amount: '₹ 1,25,000',
    disbursedOn: '05 Jun 2025',
    disbursedTo: 'ICICI Bank',
    status: 'Success',
    accountNo: '6234 9876 1234 00',
    utr: 'ICICB250605104812',
    mode: 'NEFT',
    processingFee: '₹ 1,250',
    actualDisbursed: '₹ 1,23,750',
    remarks: 'Transfer completed.',
    bankTime: '05 Jun 2025, 10:50 AM'
  },
  {
    id: 'APP25060500016',
    customerName: 'Manoj Kumar',
    amount: '₹ 2,00,000',
    disbursedOn: '04 Jun 2025',
    disbursedTo: 'HDFC Bank',
    status: 'Success',
    accountNo: '5010 8888 7777 11',
    utr: 'HDFCB250604162010',
    mode: 'RTGS',
    processingFee: '₹ 2,000',
    actualDisbursed: '₹ 1,98,000',
    remarks: 'RTGS transfer successful.',
    bankTime: '04 Jun 2025, 04:22 PM'
  },
  {
    id: 'APP25060500015',
    customerName: 'Priya N',
    amount: '₹ 75,000',
    disbursedOn: '04 Jun 2025',
    disbursedTo: 'Indian Bank',
    status: 'Success',
    accountNo: '8834 1122 3344 55',
    utr: 'IDIB250604141005',
    mode: 'IMPS',
    processingFee: '₹ 750',
    actualDisbursed: '₹ 74,250',
    remarks: 'Instant transfer complete.',
    bankTime: '04 Jun 2025, 02:11 PM'
  },
  {
    id: 'APP25050400062',
    customerName: 'Suresh Babu',
    amount: '₹ 1,50,000',
    disbursedOn: '04 Jun 2025',
    disbursedTo: 'Axis Bank',
    status: 'Success',
    accountNo: '9180 5544 3322 11',
    utr: 'UTIB250604113000',
    mode: 'NEFT',
    processingFee: '₹ 1,500',
    actualDisbursed: '₹ 1,48,500',
    remarks: 'Disbursed cleanly.',
    bankTime: '04 Jun 2025, 11:32 AM'
  },
  {
    id: 'APP25050400061',
    customerName: 'Deepa Lakshmi',
    amount: '₹ 1,00,000',
    disbursedOn: '03 Jun 2025',
    disbursedTo: 'SBI Bank',
    status: 'Success',
    accountNo: '3044 1122 9988 77',
    utr: 'SBIN250603154520',
    mode: 'NEFT',
    processingFee: '₹ 1,000',
    actualDisbursed: '₹ 99,000',
    remarks: 'Completed.',
    bankTime: '03 Jun 2025, 03:48 PM'
  },
  {
    id: 'APP25060300040',
    customerName: 'Ragul M',
    amount: '₹ 2,50,000',
    disbursedOn: '03 Jun 2025',
    disbursedTo: 'HDFC Bank',
    status: 'Success',
    accountNo: '5010 3344 5566 77',
    utr: 'HDFCB250603120011',
    mode: 'RTGS',
    processingFee: '₹ 2,500',
    actualDisbursed: '₹ 2,47,500',
    remarks: 'Transfer completed via RTGS.',
    bankTime: '03 Jun 2025, 12:05 PM'
  },
  {
    id: 'APP25060300039',
    customerName: 'Vijayalakshmi',
    amount: '₹ 1,20,000',
    disbursedOn: '02 Jun 2025',
    disbursedTo: 'ICICI Bank',
    status: 'Success',
    accountNo: '0011 2233 4455 66',
    utr: 'ICICB250602161044',
    mode: 'NEFT',
    processingFee: '₹ 1,200',
    actualDisbursed: '₹ 1,18,800',
    remarks: 'Disbursement done.',
    bankTime: '02 Jun 2025, 04:12 PM'
  },
  {
    id: 'APP25060200028',
    customerName: 'Naveen Kumar',
    amount: '₹ 1,10,000',
    disbursedOn: '02 Jun 2025',
    disbursedTo: 'Indian Bank',
    status: 'Success',
    accountNo: '7766 5544 3322 11',
    utr: 'IDIB250602110022',
    mode: 'NEFT',
    processingFee: '₹ 1,100',
    actualDisbursed: '₹ 1,08,900',
    remarks: 'Processed.',
    bankTime: '02 Jun 2025, 11:05 AM'
  },
  {
    id: 'APP25060100015',
    customerName: 'Dinesh K',
    amount: '₹ 90,000',
    disbursedOn: '01 Jun 2025',
    disbursedTo: 'Axis Bank',
    status: 'Success',
    accountNo: '9120 4455 6677 88',
    utr: 'UTIB250601093012',
    mode: 'IMPS',
    processingFee: '₹ 900',
    actualDisbursed: '₹ 89,100',
    remarks: 'Success.',
    bankTime: '01 Jun 2025, 09:35 AM'
  },
];

export const RECENT_ACTIVITIES = [
  {
    id: 1,
    title: 'Loan amount of ₹ 1,78,200 disbursed to Arun Prakash (APP25060500018)',
    time: '05 Jun 2025, 11:32 AM',
    by: 'By Rajesh Kumar',
    icon: 'CheckCircle2',
    color: 'success',
  },
  {
    id: 2,
    title: 'Loan amount of ₹ 1,25,000 disbursed to Kavitha R (APP25060500017)',
    time: '05 Jun 2025, 10:48 AM',
    by: 'By Rajesh Kumar',
    icon: 'CheckCircle2',
    color: 'success',
  },
  {
    id: 3,
    title: 'Disbursement pending for 2 applications',
    time: '05 Jun 2025, 09:15 AM',
    by: 'System',
    icon: 'Info',
    color: 'primary',
  },
];

export const OVERVIEW_STATS = {
  totalCount: 158,
  breakdown: [
    { label: 'Success', count: '138', percent: '87.34%', color: '#10b981' },
    { label: 'Pending', count: '8', percent: '5.06%', color: '#f59e0b' },
    { label: 'Failed / Cancelled', count: '14', percent: '8.86%', color: '#ef4444' },
  ],
  trendPoints: [
    { date: '01 Jun', value: '10L' },
    { date: '02 Jun', value: '12L' },
    { date: '03 Jun', value: '18L' },
    { date: '04 Jun', value: '25L' },
    { date: '05 Jun', value: '32.45L', highlight: true },
  ]
};
