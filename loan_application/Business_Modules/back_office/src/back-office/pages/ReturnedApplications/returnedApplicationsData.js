/**
 * returnedApplicationsData.js
 * --------------------
 * Static data for Returned Applications page.
 */

export { CURRENT_USER, BADGE_COUNTS } from '../Dashboard/dashboardData';

export const METRIC_CARDS = [
  {
    id: 'total-returned',
    title: 'Total Returned',
    value: '34',
    subtext: 'View all',
    icon: 'RotateCcw',
    color: 'purple',
  },
  {
    id: 'pending-action',
    title: 'Pending Action',
    value: '28',
    subtext: 'Needs RM Action',
    icon: 'RefreshCw',
    color: 'danger',
  },
  {
    id: 're-submitted',
    title: 'Re-Submitted',
    value: '6',
    subtext: 'By RM',
    icon: 'User',
    color: 'orange',
  },
  {
    id: 'closed',
    title: 'Closed',
    value: '0',
    subtext: 'No longer active',
    icon: 'CheckCircle2',
    color: 'success',
  },
];

export const RETURNED_TABLE_DATA = [
  {
    id: 'APP25060500024',
    customerName: 'Arun Prakash',
    returnedBy: 'Rajesh Kumar',
    returnedOn: '05 Jun 2025, 11:35 AM',
    reason: 'PAN image blurred',
    priority: 'High',
    status: 'Pending',
    loanType: 'Personal Loan',
    loanAmount: '₹ 1,80,000',
    remarks: 'Please upload clear PAN image.'
  },
  {
    id: 'APP25060500021',
    customerName: 'Kavitha R',
    returnedBy: 'Priya N',
    returnedOn: '05 Jun 2025, 10:48 AM',
    reason: 'Aadhaar mismatch',
    priority: 'High',
    status: 'Pending',
    loanType: 'Personal Loan',
    loanAmount: '₹ 1,25,000',
    remarks: 'Name on Aadhaar does not match application details.'
  },
  {
    id: 'APP25060500019',
    customerName: 'Manoj Kumar',
    returnedBy: 'Suresh Babu',
    returnedOn: '05 Jun 2025, 09:52 AM',
    reason: 'Bank statement unclear',
    priority: 'Medium',
    status: 'Pending',
    loanType: 'Business Loan',
    loanAmount: '₹ 2,00,000',
    remarks: 'Bank statement pages 3 and 4 are missing.'
  },
  {
    id: 'APP25060400017',
    customerName: 'Deepa Lakshmi',
    returnedBy: 'Rajesh Kumar',
    returnedOn: '04 Jun 2025, 04:15 PM',
    reason: 'Income proof invalid',
    priority: 'Medium',
    status: 'Pending',
    loanType: 'Personal Loan',
    loanAmount: '₹ 1,00,000',
    remarks: 'Latest 3 months salary slip required.'
  },
  {
    id: 'APP25060500011',
    customerName: 'Ragul M',
    returnedBy: 'Priya N',
    returnedOn: '04 Jun 2025, 03:22 PM',
    reason: 'CIBIL score not eligible',
    priority: 'High',
    status: 'Pending',
    loanType: 'Personal Loan',
    loanAmount: '₹ 2,50,000',
    remarks: 'CIBIL score is below required threshold.'
  },
  {
    id: 'APP25060500008',
    customerName: 'Vijayalakshmi',
    returnedBy: 'Suresh Babu',
    returnedOn: '04 Jun 2025, 02:05 PM',
    reason: 'Address proof mismatch',
    priority: 'Medium',
    status: 'Pending',
    loanType: 'Personal Loan',
    loanAmount: '₹ 1,20,000',
    remarks: 'Current address differs from utility bill.'
  },
  {
    id: 'APP25060500005',
    customerName: 'Suresh Babu',
    returnedBy: 'Rajesh Kumar',
    returnedOn: '03 Jun 2025, 11:10 AM',
    reason: 'Photo not clear',
    priority: 'Low',
    status: 'Pending',
    loanType: 'Personal Loan',
    loanAmount: '₹ 1,50,000',
    remarks: 'Passport size photo is low resolution.'
  },
  {
    id: 'APP25060500003',
    customerName: 'Naveen Kumar',
    returnedBy: 'Priya N',
    returnedOn: '03 Jun 2025, 10:20 AM',
    reason: 'Signature mismatch',
    priority: 'Low',
    status: 'Pending',
    loanType: 'Personal Loan',
    loanAmount: '₹ 1,10,000',
    remarks: 'Signature on application does not match PAN.'
  },
  {
    id: 'APP25060400002',
    customerName: 'Indhuja R',
    returnedBy: 'Rajesh Kumar',
    returnedOn: '02 Jun 2025, 04:45 PM',
    reason: 'Employment proof invalid',
    priority: 'Medium',
    status: 'Pending',
    loanType: 'Personal Loan',
    loanAmount: '₹ 90,000',
    remarks: 'Company ID card is expired.'
  },
];
