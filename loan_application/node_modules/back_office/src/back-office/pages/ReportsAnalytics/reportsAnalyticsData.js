/**
 * reportsAnalyticsData.js
 * --------------------
 * Static data for Reports & Analytics page.
 */

export { CURRENT_USER, BADGE_COUNTS } from '../Dashboard/dashboardData';

export const METRIC_CARDS = [
  {
    id: 'total-apps',
    title: 'Total Applications',
    value: '158',
    trend: '↑ 18.4% vs 25 May - 31 May',
    icon: 'FileText',
    color: 'success',
  },
  {
    id: 'in-review',
    title: 'In Review',
    value: '42',
    trend: '↑ 11.2% vs 25 May - 31 May',
    icon: 'Clock',
    color: 'primary',
  },
  {
    id: 'approved',
    title: 'Approved',
    value: '32',
    trend: '↑ 23.1% vs 25 May - 31 May',
    icon: 'ShieldCheck',
    color: 'purple',
  },
  {
    id: 'disbursed',
    title: 'Disbursed',
    value: '28',
    trend: '↑ 16.7% vs 25 May - 31 May',
    icon: 'BadgeIndianRupee',
    color: 'orange',
  },
  {
    id: 'total-disbursed-amount',
    title: 'Total Disbursed Amount',
    value: '₹ 2,34,85,000',
    trend: '↑ 21.6% vs 25 May - 31 May',
    icon: 'Wallet',
    color: 'teal',
  },
];

export const FUNNEL_DATA = [
  { label: 'Total Applications', count: 158, percent: '100%', color: '#1e3a8a' },
  { label: 'In Review', count: 42, percent: '26.58%', color: '#3b82f6' },
  { label: 'Approved', count: 32, percent: '20.25%', color: '#10b981' },
  { label: 'Disbursed', count: 28, percent: '17.72%', color: '#f59e0b' },
  { label: 'Rejected / Cancelled', count: 8, percent: '5.06%', color: '#8b5cf6' },
];

export const LOAN_DISTRIBUTION_DATA = [
  { label: '₹ 0 - ₹ 50,000', count: 45, percent: '28.48%', color: '#3b82f6' },
  { label: '₹ 50,001 - ₹ 1,00,000', count: 38, percent: '24.05%', color: '#10b981' },
  { label: '₹ 1,00,001 - ₹ 2,00,000', count: 42, percent: '26.58%', color: '#f59e0b' },
  { label: '₹ 2,00,001 & Above', count: 33, percent: '20.89%', color: '#8b5cf6' },
];

export const BRANCH_PERFORMANCE = [
  { branch: 'KK Nagar, Chennai', apps: 45, approved: 12, disbursed: 10, amount: '75,20,000' },
  { branch: 'Vadapalani, Chennai', apps: 32, approved: 8, disbursed: 6, amount: '45,60,000' },
  { branch: 'Tambaram, Chennai', apps: 28, approved: 5, disbursed: 5, amount: '38,30,000' },
  { branch: 'Tiruvallur', apps: 20, approved: 4, disbursed: 3, amount: '20,75,000' },
  { branch: 'Poonamallee', apps: 18, approved: 3, disbursed: 2, amount: '14,20,000' },
  { branch: 'Others', apps: 15, approved: '--', disbursed: 2, amount: '10,80,000' },
];

export const BRANCH_TOTAL = { branch: 'Total', apps: 158, approved: 32, disbursed: 28, amount: '2,34,85,000' };

export const RM_PERFORMANCE = [
  { name: 'Kumar', apps: 42, approved: 10, disbursed: 9, conversion: '21.43%' },
  { name: 'Suresh Babu', apps: 36, approved: 8, disbursed: 7, conversion: '22.22%' },
  { name: 'Priya N', apps: 28, approved: 6, disbursed: 5, conversion: '21.43%' },
  { name: 'Manoj Kumar', apps: 22, approved: 4, disbursed: 3, conversion: '18.18%' },
  { name: 'Deepa Lakshmi', apps: 18, approved: 2, disbursed: 2, conversion: '11.11%' },
];

export const PRODUCT_PERFORMANCE = [
  { name: 'Personal Loan', apps: 62, disbursed: 14, amount: '1,15,20,000' },
  { name: 'Business Loan', apps: 38, disbursed: 8, amount: '72,40,000' },
  { name: 'Gold Loan', apps: 26, disbursed: 5, amount: '28,35,000' },
  { name: 'Two Wheeler Loan', apps: 20, disbursed: 1, amount: '6,90,000' },
  { name: 'Other Loans', apps: 12, disbursed: 0, amount: '2,00,000' },
];

export const INSIGHTS = [
  {
    id: 1,
    text: 'Applications increased by 18.4% compared to last week.',
    icon: 'TrendingUp',
    color: 'success',
  },
  {
    id: 2,
    text: 'Approval rate is 20.25% this week.',
    icon: 'CheckCircle2',
    color: 'primary',
  },
  {
    id: 3,
    text: 'Disbursement amount increased by 21.6% compared to last week.',
    icon: 'BadgeIndianRupee',
    color: 'orange',
  },
  {
    id: 4,
    text: 'KK Nagar Branch has the highest disbursement this week.',
    icon: 'Landmark',
    color: 'purple',
  },
];
