/**
 * disbursementData.js
 * --------------------
 * Static data for Disbursement & Loan Release page.
 */

export { CURRENT_USER, BADGE_COUNTS } from '../Dashboard/dashboardData';

export const INFO_BAR_FIELDS = [
  { label: 'Application ID', value: 'APP25060500024' },
  { label: 'Customer Name', value: 'Ramesh Kumar' },
  { label: 'Sanctioned Amount', value: '₹ 1,50,000' },
  { label: 'Interest Rate (ROI)', value: '12.00% p.a.' },
  { label: 'Tenure', value: '36 Months' },
  { label: 'Monthly EMI', value: '₹ 4,980' },
  { label: 'Disbursement Account', value: '5010 1234 5678 90' },
  { label: 'Approved On', value: '05 Jun 2025, 11:35 AM' },
];

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
    { label: 'PAN Number', value: 'ABCDE1234F' },
    { label: 'Occupation', value: 'Private Employee' },
    { label: 'Monthly Income', value: '₹ 28,000' },
    { label: 'Loan Account No.', value: 'SFL25060500024' },
  ]
};

export const DISBURSEMENT_ACCOUNT_DETAILS = {
  bankName: 'HDFC BANK LTD',
  accountHolder: 'Ramesh Kumar',
  accountNumber: '5010 1234 5678 90',
  ifscCode: 'HDFC0001234',
  accountType: 'Savings Account',
  branch: 'KK Nagar, Chennai'
};

export const DISBURSEMENT_INFO = {
  sanctionedAmount: '₹ 1,50,000',
  processingFee: '- ₹ 1,500',
  stampDuty: '- ₹ 500',
  otherCharges: '- ₹ 0',
  netDisbursementAmount: '₹ 1,48,000',
  amountInWords: 'One Lakh Forty Eight Thousand Only'
};

export const EMI_SCHEDULE_SUMMARY = {
  tenure: '36 Months',
  roi: '12.00% p.a.',
  monthlyEmi: '₹ 4,980',
  firstEmiDate: '05 Jul 2025'
};

export const EMI_SCHEDULE_ROWS = [
  { emiNo: 1, dueDate: '05 Jul 2025', principal: '2,980', interest: '2,000', emi: '4,980', outstanding: '1,47,020' },
  { emiNo: 2, dueDate: '05 Aug 2025', principal: '3,020', interest: '1,960', emi: '4,980', outstanding: '1,44,000' },
  { emiNo: 3, dueDate: '05 Sep 2025', principal: '3,060', interest: '1,920', emi: '4,980', outstanding: '1,40,940' },
  { emiNo: '...', dueDate: '...', principal: '...', interest: '...', emi: '...', outstanding: '...' },
  { emiNo: 36, dueDate: '05 Jun 2028', principal: '4,900', interest: '80', emi: '4,980', outstanding: '0' },
];

export const DISBURSEMENT_CHECKLIST = [
  { label: 'Document Verification', status: 'Completed', isCompleted: true },
  { label: 'PAN Verification', status: 'Completed', isCompleted: true },
  { label: 'CIBIL & Eligibility', status: 'Completed', isCompleted: true },
  { label: 'Bank Verification', status: 'Completed', isCompleted: true },
  { label: 'Loan Documents & Agreement', status: 'Completed', isCompleted: true },
  { label: 'Final Approval', status: 'Completed', isCompleted: true },
  { label: 'Disbursement Ready', status: 'In Progress', isInProgress: true },
];

export const DISBURSEMENT_STATUS_STEPS = [
  { id: 1, title: 'Initiated', date: '05 Jun 2025', time: '12:05 PM', status: 'completed' },
  { id: 2, title: 'Processing', date: '05 Jun 2025', time: '12:07 PM', status: 'completed' },
  { id: 3, title: 'Amount Transfer', date: 'In Progress', status: 'in-progress' },
  { id: 4, title: 'Completed', date: 'Pending', status: 'pending' },
];
