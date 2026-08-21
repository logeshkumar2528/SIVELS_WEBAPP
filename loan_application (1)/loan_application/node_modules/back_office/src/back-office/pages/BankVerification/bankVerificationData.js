/**
 * bankVerificationData.js
 * --------------------
 * Static data for Bank Verification page.
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
    { label: 'Mobile Number', value: '98765 43210', icon: 'Headphones' },
    { label: 'Date of Birth', value: '12/05/1993', icon: 'Calendar' },
    { label: 'Requested Amount', value: '₹ 2,00,000', icon: 'BadgeIndianRupee' },
    { label: 'Eligible Amount', value: '₹ 1,50,000', icon: 'CheckCircle2' },
    { label: 'Agent Name', value: 'Thiru (AGT0001)', icon: 'UserCircle' },
    { label: 'RM Name', value: 'Kumar', icon: 'User' },
    { label: 'Branch', value: 'KK Nagar', icon: 'Building2' },
    { label: 'Current Stage', value: 'Bank Verification', icon: 'Clock' },
  ]
};

export const BANK_DETAILS = {
  accountHolder: 'Ramesh Kumar',
  accountNumber: '5010 1234 5678 90',
  ifsc: 'HDFC0001234',
  bankName: 'HDFC Bank',
  branch: 'KK Nagar, Chennai',
  accountType: 'Savings Account'
};

export const PENNY_STEPS = [
  { label: 'Initiated', date: '05 Jun 2025, 11:15 AM', status: 'completed', icon: 'Building2' },
  { label: 'Penny Credited', date: '05 Jun 2025, 11:18 AM', status: 'completed', icon: 'Landmark' },
  { label: 'Customer Confirmed', date: '05 Jun 2025, 11:25 AM', status: 'completed', icon: 'UserCircle' },
  { label: 'Account Verified', date: '05 Jun 2025, 11:30 AM', status: 'completed', icon: 'ShieldCheck' },
];

export const STATEMENT_PREVIEW = [
  { date: '05 Jun 2025, 11:18 AM', description: 'Penny Verification Credit', type: 'Credit', amount: '+ 1.00', balance: '12,548.75' },
  { date: '03 Jun 2025', description: 'UPI / Google Pay', type: 'Debit', amount: '- 500.00', balance: '12,547.75' },
  { date: '01 Jun 2025', description: 'Salary Credit', type: 'Credit', amount: '+ 25,000.00', balance: '13,047.75' },
  { date: '31 May 2025', description: 'ATM Withdrawal', type: 'Debit', amount: '- 2,000.00', balance: '-11,952.25' },
];

export const VERIFICATION_CHECKLIST = [
  { label: 'Account Holder Name Match', status: 'Verified' },
  { label: 'Account Number Valid', status: 'Verified' },
  { label: 'IFSC Code Valid', status: 'Verified' },
  { label: 'Bank Name Valid', status: 'Verified' },
  { label: 'Penny Verification', status: 'Verified' },
  { label: 'Account Active', status: 'Verified' },
  { label: 'No Hold / Lien', status: 'Verified' },
];

export const EMI_CALCULATION = {
  loanAmount: '₹ 1,50,000',
  tenure: '12 Months',
  interestRate: '18% p.a.',
  processingFee: '₹ 2,500',
  netDisbursal: '₹ 1,47,500',
  firstEmiDate: '05 Jul 2025',
  emiAmount: '₹ 13,752'
};

export const INVESTOR_DETAILS = [
  { id: 'INV-8821', name: 'Ravikumar', amount: '₹ 1,00,000' },
  { id: 'INV-9932', name: 'Sanjay', amount: '₹ 50,000' }
];
