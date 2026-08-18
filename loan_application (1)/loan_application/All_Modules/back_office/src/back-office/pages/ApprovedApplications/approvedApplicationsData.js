/**
 * approvedApplicationsData.js
 * --------------------
 * Static data for Approved Applications page.
 */

export { CURRENT_USER, BADGE_COUNTS } from '../Dashboard/dashboardData';

export const APPROVED_METRICS = [
  { id: 'total-approved', title: 'Total Approved', value: '32', subtext: 'This Month', icon: 'CheckCircle2', color: 'success' },
  { id: 'pending-disbursement', title: 'Pending Disbursement', value: '17', subtext: 'Ready for Payout', icon: 'Wallet', color: 'orange' },
  { id: 'sanctioned-amount', title: 'Sanctioned Amount', value: '₹ 1,84,50,000', subtext: 'Total Value', icon: 'BadgeIndianRupee', color: 'purple' },
  { id: 'avg-time', title: 'Avg Approval Time', value: '2.4 Days', subtext: 'Fast track SLA', icon: 'Clock', color: 'primary' },
];

export const APPROVED_TABLE_DATA = [
  {
    id: 'APP25060500022',
    customerName: 'Suresh Babu',
    loanType: 'Personal Loan',
    interestRate: '11.5% p.a.',
    amount: '₹ 1,50,000',
    tenure: '36 Months',
    emi: '₹ 4,948 / mo',
    approvedBy: 'Branch Manager',
    approvedOn: '05 Jun 2025, 09:52 AM',
    disbursalStatus: 'Ready for Disbursement',
    statusBadge: 'success',
    sanctionLetter: 'Generated & Verified',
    bankAccount: 'HDFC Bank - A/C 9876XXXX4321'
  },
  {
    id: 'APP25060500019',
    customerName: 'Lakshmi Priya',
    loanType: 'Business Loan',
    interestRate: '13.0% p.a.',
    amount: '₹ 3,20,000',
    tenure: '48 Months',
    emi: '₹ 8,570 / mo',
    approvedBy: 'Credit Committee',
    approvedOn: '05 Jun 2025, 09:10 AM',
    disbursalStatus: 'Pending Document Sign',
    statusBadge: 'orange',
    sanctionLetter: 'Pending Customer Sign',
    bankAccount: 'ICICI Bank - A/C 5432XXXX8765'
  },
  {
    id: 'APP25060500017',
    customerName: 'Kavitha S',
    loanType: 'Personal Loan',
    interestRate: '12.0% p.a.',
    amount: '₹ 1,80,000',
    tenure: '36 Months',
    emi: '₹ 5,978 / mo',
    approvedBy: 'Branch Manager',
    approvedOn: '04 Jun 2025, 04:30 PM',
    disbursalStatus: 'Ready for Disbursement',
    statusBadge: 'success',
    sanctionLetter: 'Generated & Verified',
    bankAccount: 'State Bank of India - A/C 1122XXXX9900'
  },
  {
    id: 'APP25060500014',
    customerName: 'Deepa M',
    loanType: 'Gold Loan',
    interestRate: '9.5% p.a.',
    amount: '₹ 1,75,000',
    tenure: '24 Months',
    emi: '₹ 8,040 / mo',
    approvedBy: 'Credit Committee',
    approvedOn: '04 Jun 2025, 02:15 PM',
    disbursalStatus: 'Processing Disbursal',
    statusBadge: 'primary',
    sanctionLetter: 'Generated & Verified',
    bankAccount: 'Axis Bank - A/C 3344XXXX7788'
  },
  {
    id: 'APP25060500010',
    customerName: 'Rajesh V',
    loanType: 'Two Wheeler Loan',
    interestRate: '10.5% p.a.',
    amount: '₹ 95,000',
    tenure: '24 Months',
    emi: '₹ 4,410 / mo',
    approvedBy: 'Branch Manager',
    approvedOn: '04 Jun 2025, 11:20 AM',
    disbursalStatus: 'Ready for Disbursement',
    statusBadge: 'success',
    sanctionLetter: 'Generated & Verified',
    bankAccount: 'Canara Bank - A/C 6677XXXX2233'
  },
  {
    id: 'APP25060500006',
    customerName: 'Meenakshi N',
    loanType: 'Personal Loan',
    interestRate: '11.8% p.a.',
    amount: '₹ 2,50,000',
    tenure: '60 Months',
    emi: '₹ 5,536 / mo',
    approvedBy: 'Credit Committee',
    approvedOn: '03 Jun 2025, 04:00 PM',
    disbursalStatus: 'Disbursed',
    statusBadge: 'primary',
    sanctionLetter: 'Disbursement Complete',
    bankAccount: 'Indian Overseas Bank - A/C 8899XXXX1122'
  },
];
