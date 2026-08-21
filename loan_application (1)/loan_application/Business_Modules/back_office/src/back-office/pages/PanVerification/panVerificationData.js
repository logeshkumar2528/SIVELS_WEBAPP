/**
 * panVerificationData.js
 * --------------------
 * Static data for PAN Verification & CIBIL Score page.
 */

export { CURRENT_USER, BADGE_COUNTS } from '../Dashboard/dashboardData';

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
    { label: 'Mobile Number', value: '98765 43210', icon: 'Headphones' }, // Close enough icon
    { label: 'Date of Birth', value: '12/05/1993', icon: 'Calendar' },
    { label: 'Loan Amount Requested', value: '₹ 2,00,000', icon: 'BadgeIndianRupee' },
    { label: 'Submitted By (Agent)', value: 'Thiru (AGT0001)', icon: 'UserCircle' },
    { label: 'Verified By (RM)', value: 'Kumar', icon: 'ShieldCheck' },
    { label: 'Branch', value: 'KK Nagar', icon: 'Building2' },
    { label: 'Application Type', value: 'Personal Loan', icon: 'FileText' },
    { label: 'Submitted On', value: '05 Jun 2025, 10:25 AM', icon: 'Clock' },
  ]
};

export const CIBIL_DATA = {
  score: 742,
  status: 'Excellent',
  stats: [
    { label: 'Credit Status', value: 'Excellent', isSuccess: true },
    { label: 'Active Loans', value: '2' },
    { label: 'Closed Loans', value: '5' },
    { label: 'Outstanding Amount', value: '₹ 85,000' },
    { label: 'Missed EMI', value: '0' },
    { label: 'Credit Age', value: '6 Years' },
    { label: 'Recent Enquiries', value: '1' },
    { label: 'Payment Behaviour', value: 'Good', isSuccess: true },
    { label: 'Utilization Ratio', value: '28%' },
  ],
  summaryList: [
    'No recent defaults',
    'Payments are made on time',
    'Low credit utilization',
    'Good credit history'
  ]
};

export const ELIGIBILITY_FACTORS = [
  { label: 'CIBIL Score (742)', status: 'Excellent', isSuccess: true },
  { label: 'Monthly Income (₹ 28,000)', status: 'Verified', isSuccess: true },
  { label: 'Existing Loan & EMI Obligations', status: 'Good', isSuccess: true },
  { label: 'Age & Employment Stability', status: 'Stable', isSuccess: true },
  { label: 'Risk Assessment', status: 'Low Risk', isSuccess: true },
];

export const LOAN_OFFER = {
  eligibleAmount: '₹ 1,50,000',
  roi: '12.00% p.a.',
  tenure: '36 Months',
  processingFee: '₹ 1,500',
  emi: '₹ 4,980'
};

export const DECISION_SUMMARY = [
  { label: 'Document Verification', value: 'Passed', isSuccess: true },
  { label: 'PAN Verification', value: 'Verified', isSuccess: true },
  { label: 'CIBIL Score', value: '742', isSuccess: true },
  { label: 'Risk Level', value: 'Low', isSuccess: true },
];

export const ACTION_HISTORY = [
  { action: 'Application received from RM', date: '05 Jun 2025, 10:25 AM' },
  { action: 'Document verification completed', date: '05 Jun 2025, 10:45 AM' },
  { action: 'PAN verified & CIBIL fetched', date: '05 Jun 2025, 11:05 AM' },
];
