/**
 * rejectedApplicationsData.js
 * --------------------
 * Static data for Rejected Applications page.
 */

export { CURRENT_USER, BADGE_COUNTS } from '../Dashboard/dashboardData';

export const REJECTED_METRICS = [
  { id: 'total-rejected', title: 'Total Rejected', value: '12', subtext: 'This Month', icon: 'XCircle', color: 'danger' },
  { id: 'cibil-rejections', title: 'CIBIL Rejections', value: '5', subtext: 'Low Score (< 650)', icon: 'ShieldAlert', color: 'orange' },
  { id: 'doc-rejections', title: 'Document Issues', value: '4', subtext: 'Fake / Fraud Docs', icon: 'FileCheck', color: 'purple' },
  { id: 'income-rejections', title: 'Income Ineligible', value: '3', subtext: 'FOIR > 65%', icon: 'BadgeIndianRupee', color: 'primary' },
];

export const REJECTED_TABLE_DATA = [
  { id: 'APP25060500021', customerName: 'Kavitha R', loanType: 'Personal Loan', amount: '₹ 1,25,000', rejectedBy: 'Rajesh Kumar', rejectedOn: '04 Jun 2025, 10:20 AM', reason: 'Aadhaar mismatch', subReason: 'Name mismatch', remarks: 'Name on Aadhaar does not match PAN details.' },
  { id: 'APP25060500015', customerName: 'Venkatesh K', loanType: 'Business Loan', amount: '₹ 4,50,000', rejectedBy: 'Priya N', rejectedOn: '03 Jun 2025, 03:15 PM', reason: 'Low CIBIL score', subReason: 'Score < 600', remarks: 'CIBIL score is 580 with 2 active defaults.' },
  { id: 'APP25060500012', customerName: 'Subash Chandra', loanType: 'Personal Loan', amount: '₹ 2,00,000', rejectedBy: 'Suresh Babu', rejectedOn: '02 Jun 2025, 11:40 AM', reason: 'Income not eligible', subReason: 'High FOIR', remarks: 'Existing EMI obligations exceed 70% of salary.' },
  { id: 'APP25060500009', customerName: 'Gayathri M', loanType: 'Personal Loan', amount: '₹ 1,50,000', rejectedBy: 'Rajesh Kumar', rejectedOn: '01 Jun 2025, 04:50 PM', reason: 'Duplicate application', subReason: 'Active App Exists', remarks: 'Customer already has an active loan application.' },
  { id: 'APP25060500004', customerName: 'Karthikeyan P', loanType: 'Vehicle Loan', amount: '₹ 3,00,000', rejectedBy: 'Priya N', rejectedOn: '31 May 2025, 02:10 PM', reason: 'Bank account issue', subReason: 'Statement fake', remarks: 'Bank statement salary credits do not match IT returns.' },
];
