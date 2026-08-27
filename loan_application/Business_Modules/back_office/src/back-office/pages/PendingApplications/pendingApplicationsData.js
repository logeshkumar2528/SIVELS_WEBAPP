/**
 * pendingApplicationsData.js
 * --------------------
 * Static data for Pending Applications Queue page.
 */

export { CURRENT_USER, BADGE_COUNTS } from '../Dashboard/dashboardData';

export const STEPPER_CARDS = [
  { id: 'new', title: 'New', count: '24', subtext: 'Newly Assigned', icon: 'FilePlus', color: 'success' },
  { id: 'pending-review', title: 'Pending Review', count: '58', subtext: 'Awaiting Review', icon: 'Clock', color: 'primary' },
  { id: 'under-verification', title: 'Under Verification', count: '36', subtext: 'In Process', icon: 'ShieldCheck', color: 'orange' },
  { id: 'completed', title: 'Completed', count: '120', subtext: 'This Month', icon: 'CheckCircle2', color: 'success' },
];

export const QUEUE_SUMMARY = {
  newCount: 24,
  pendingReview: 58,
  underVerification: 36,
  completedMonth: 120,
  total: 238
};

export const PENDING_TABLE_DATA = [
  { id: 'APP25060500028', customerName: 'Sathish Kumar', loanType: 'Personal Loan', amount: '₹ 2,00,000', assignedTo: 'Rajesh Kumar', assignedOn: '05 Jun 2025, 12:10 PM', priority: 'High' },
  { id: 'APP25060500021', customerName: 'Revathi S', loanType: 'Business Loan', amount: '₹ 3,50,000', assignedTo: 'Priya N', assignedOn: '05 Jun 2025, 11:55 AM', priority: 'Medium' },
  { id: 'APP25060500030', customerName: 'Bharath R', loanType: 'Personal Loan', amount: '₹ 1,20,000', assignedTo: 'Suresh Babu', assignedOn: '05 Jun 2025, 11:40 AM', priority: 'High' },
  { id: 'APP25060500029', customerName: 'Nandhini K', loanType: 'Education Loan', amount: '₹ 1,80,000', assignedTo: 'Deepa Lakshmi', assignedOn: '05 Jun 2025, 11:20 AM', priority: 'Low' },
  { id: 'APP25060500023', customerName: 'Dinesh M', loanType: 'Vehicle Loan', amount: '₹ 2,75,000', assignedTo: 'Rajesh Kumar', assignedOn: '05 Jun 2025, 11:05 AM', priority: 'Medium' },
  { id: 'APP25060500027', customerName: 'Indhuja R', loanType: 'Personal Loan', amount: '₹ 90,000', assignedTo: 'Priya N', assignedOn: '05 Jun 2025, 10:50 AM', priority: 'High' },
];
