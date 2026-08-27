/**
 * rejectApplicationData.js
 * --------------------
 * Static data for Reject Application page.
 */

export { CURRENT_USER, BADGE_COUNTS } from '../Dashboard/dashboardData';

export const REJECT_APPLICATION_DETAILS = {
  id: 'APP25060500021',
  customerName: 'Kavitha R',
  loanType: 'Personal Loan',
  loanAmount: '₹ 1,25,000',
  appliedOn: '04 Jun 2025, 10:20 AM',
  rmName: 'Priya N',
  currentStage: 'Under Verification',
  assignedTo: 'Rajesh Kumar'
};

export const REJECTION_REASONS = [
  'Aadhaar mismatch',
  'PAN mismatch',
  'Low CIBIL score',
  'Income not eligible',
  'Insufficient documents',
  'Bank account issue',
  'High existing liabilities',
  'Duplicate application',
  'Other (Please specify)'
];

export const APPLICATION_HISTORY = [
  { step: 'Application Submitted', date: '04 Jun 2025, 09:45 AM', status: 'completed' },
  { step: 'Document Verification', date: '04 Jun 2025, 10:00 AM', status: 'completed' },
  { step: 'Under Verification', date: '04 Jun 2025, 10:20 AM', status: 'active' },
  { step: 'Reject Application', date: '-', status: 'pending' },
];
