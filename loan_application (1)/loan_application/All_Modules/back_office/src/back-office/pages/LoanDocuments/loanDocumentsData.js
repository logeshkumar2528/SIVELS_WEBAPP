/**
 * loanDocumentsData.js
 * --------------------
 * Static data for Loan Documents & Agreement page.
 */

export { CURRENT_USER, BADGE_COUNTS } from '../Dashboard/dashboardData';

export const INFO_BAR_FIELDS = [
  { label: 'Application ID', value: 'APP25060500024' },
  { label: 'Customer Name', value: 'Ramesh Kumar' },
  { label: 'Loan Amount (Eligible)', value: '₹ 1,50,000' },
  { label: 'Interest Rate (ROI)', value: '12.00% p.a.' },
  { label: 'Tenure', value: '36 Months' },
  { label: 'Monthly EMI', value: '₹ 4,980' },
  { label: 'Processing Fee', value: '₹ 1,500' },
  { label: 'Submitted On', value: '05 Jun 2025, 10:25 AM' },
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
    { label: 'Aadhaar Number', value: 'XXXX XXXX 1234' },
    { label: 'PAN Number', value: 'ABCDE1234F' },
    { label: 'Occupation', value: 'Private Employee' },
    { label: 'Monthly Income', value: '₹ 28,000' },
  ]
};

export const LOAN_DOCUMENTS_LIST = [
  { id: 'doc1', name: 'Loan Agreement', description: 'Loan terms and conditions agreement', status: 'Generated', icon: 'FileText', color: 'danger' },
  { id: 'doc2', name: 'Sanction Letter', description: 'Loan sanction approval letter', status: 'Generated', icon: 'FileCheck', color: 'primary' },
  { id: 'doc3', name: 'EMI Schedule', description: 'Detailed EMI breakdown', status: 'Generated', icon: 'Calendar', color: 'primary' },
  { id: 'doc4', name: 'Key Facts Statement', description: 'Summary of loan key terms', status: 'Generated', icon: 'CheckCircle2', color: 'success' },
  { id: 'doc5', name: 'Terms & Conditions', description: 'General terms and conditions', status: 'Generated', icon: 'ShieldCheck', color: 'primary' },
  { id: 'doc6', name: 'Important Instructions', description: 'Important instructions to customer', status: 'Generated', icon: 'Info', color: 'warning' },
];

export const DOCUMENT_CHECKLIST = [
  { label: 'All Documents Generated', status: 'Verified', isSuccess: true },
  { label: 'Customer Details Verified', status: 'Verified', isSuccess: true },
  { label: 'Loan Eligibility Confirmed', status: 'Verified', isSuccess: true },
  { label: 'Bank Account Verified', status: 'Verified', isSuccess: true },
  { label: 'Ready for e-Sign', status: 'Pending', isSuccess: false },
];
