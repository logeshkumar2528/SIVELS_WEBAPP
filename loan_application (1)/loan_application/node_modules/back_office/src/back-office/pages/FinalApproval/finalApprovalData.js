/**
 * finalApprovalData.js
 * --------------------
 * Static data for Final Approval & Sanction page.
 */

export { CURRENT_USER, BADGE_COUNTS } from '../Dashboard/dashboardData';
export { INFO_BAR_FIELDS } from '../LoanDocuments/loanDocumentsData';

export const VERIFICATION_STEPS = [
  { id: 'doc-verify',    label: 'Document Verification' },
  { id: 'pan-eligibility', label: 'PAN & Eligibility Check' },
  { id: 'bank-verify',   label: 'Bank Verification'     },
  { id: 'loan-docs',     label: 'Loan Documents'        },
  { id: 'final-approval',label: 'Final Approval'        },
  { id: 'disbursement',  label: 'Disbursement'          },
];

export const CUSTOMER_SUMMARY = {
  name: 'Ramesh Kumar',
  id: 'APP25060500024',
  fields: [
    { label: 'Date of Birth', value: '12/05/1993' },
    { label: 'Address', value: '12/5, 1st Main Road, KK Nagar, Chennai - 600078' },
    { label: 'Aadhaar Number', value: 'XXXX XXXX 1234' },
    { label: 'PAN Number', value: 'ABCDE1234F' },
    { label: 'Occupation', value: 'Private Employee' },
    { label: 'Monthly Income', value: '₹ 28,000' },
  ]
};

export const LOAN_SUMMARY = [
  { label: 'Requested Amount', value: '₹ 2,00,000' },
  { label: 'Eligible Amount (Sanctioned)', value: '₹ 1,50,000', highlight: true },
  { label: 'Interest Rate (ROI)', value: '12.00% p.a.' },
  { label: 'Processing Fee', value: '₹ 1,500' },
  { label: 'Tenure', value: '36 Months' },
  { label: 'Monthly EMI', value: '₹ 4,980' },
  { label: 'Total Payable Amount', value: '₹ 1,79,280' },
  { label: 'Disbursement Type', value: 'NEFT' },
  { label: 'Disbursement Account', value: '5010 1234 5678 90 (HDFC Bank)' },
];

export const APPROVAL_CHECKLIST = [
  { label: 'Document Verification', desc: 'All original documents verified', status: 'Passed', isSuccess: true },
  { label: 'PAN Verification', desc: 'PAN validated successfully', status: 'Passed', isSuccess: true },
  { label: 'CIBIL & Eligibility', desc: 'CIBIL Score: 742 | Eligible amount calculated', status: 'Passed', isSuccess: true },
  { label: 'Bank Verification', desc: 'Bank account verified & active', status: 'Passed', isSuccess: true },
  { label: 'Loan Documents', desc: 'Documents generated & reviewed', status: 'Passed', isSuccess: true },
  { label: 'Customer Confirmation', desc: 'Customer accepted terms & consent provided', status: 'Passed', isSuccess: true },
];

export const SANCTION_DETAILS = [
  { label: 'Sanctioned Amount', value: '₹ 1,50,000', highlight: true },
  { label: 'Interest Rate (ROI)', value: '12.00% p.a.' },
  { label: 'Tenure', value: '36 Months' },
  { label: 'Monthly EMI', value: '₹ 4,980' },
  { label: 'First EMI Date', value: '05 Jul 2025' },
  { label: 'EMI Day', value: '05 of every month' },
  { label: 'Total Interest', value: '₹ 29,280' },
  { label: 'Total Payable Amount', value: '₹ 1,79,280' },
  { label: 'Disbursement Date (Est.)', value: '05 Jun 2025' },
  { label: 'Repayment Mode', value: 'EMI' },
  { label: 'Loan Account Number', value: 'SFL25060500024' },
];

export const APPROVAL_HISTORY = [
  { action: 'Application Submitted', by: 'Thiru (AGT0001)', role: 'Agent', remarks: 'Application submitted by agent', date: '05 Jun 2025, 10:25 AM' },
  { action: 'Reviewed By RM', by: 'Kumar', role: 'RM', remarks: 'Application verified and forwarded to BO', date: '05 Jun 2025, 10:40 AM' },
  { action: 'Documents Verified', by: 'Rajesh Kumar', role: 'Back Office', remarks: 'All original documents verified', date: '05 Jun 2025, 11:05 AM' },
  { action: 'CIBIL & Eligibility Completed', by: 'Rajesh Kumar', role: 'Back Office', remarks: 'CIBIL Score 742, Eligible Amount ₹ 1,50,000', date: '05 Jun 2025, 11:20 AM' },
  { action: 'Bank Verified', by: 'Rajesh Kumar', role: 'Back Office', remarks: 'Bank account verified and active', date: '05 Jun 2025, 11:30 AM' },
  { action: 'Ready for Final Approval', by: 'Rajesh Kumar', role: 'Back Office', remarks: 'All checks completed. Pending final approval.', date: '05 Jun 2025, 11:35 AM', isCurrent: true },
];
