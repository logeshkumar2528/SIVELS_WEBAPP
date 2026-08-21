/**
 * profileData.js
 * --------------------
 * Static data for My Profile page.
 */

export { CURRENT_USER, BADGE_COUNTS } from '../Dashboard/dashboardData';

export const USER_INFO = {
  name: 'Rajesh Kumar',
  role: 'Back Office Officer',
  email: 'rajesh.kumar@sivelsfinance.com',
  phone: '+91 98765 43210',
  empId: 'BOO-2025-0012',
  doj: '02 Jan 2025',
  status: 'Active'
};

export const WORK_SUMMARY_CARDS = [
  { id: 'role', label: 'Role', value: 'Back Office Officer', icon: 'Shield' },
  { id: 'dept', label: 'Department', value: 'Loan Operations', icon: 'Laptop' },
  { id: 'rep', label: 'Reporting To', value: 'Operations Manager', icon: 'Users' },
  { id: 'branch', label: 'Branch', value: 'KK Nagar, Chennai', icon: 'Landmark' },
];

export const WORK_METRIC_CARDS = [
  { id: 'handled', label: 'Applications Handled', value: '158', icon: 'FileText', color: 'success' },
  { id: 'approved', label: 'Approved', value: '32', icon: 'CheckCircle2', color: 'primary' },
  { id: 'disbursed', label: 'Disbursed Amount', value: '₹ 2,34,85,000', icon: 'BadgeIndianRupee', color: 'orange' },
  { id: 'score', label: 'Performance Score', value: '4.8 / 5', icon: 'Star', color: 'purple' },
];

export const PERSONAL_INFO_FIELDS = [
  { label: 'Full Name', value: 'Rajesh Kumar' },
  { label: 'Date of Birth', value: '12 May 1993' },
  { label: 'Gender', value: 'Male' },
  { label: 'Mobile Number', value: '+91 98765 43210' },
  { label: 'Email Address', value: 'rajesh.kumar@sivelsfinance.com' },
  { label: 'Alternate Email', value: 'rajesh.kumar12@gmail.com' },
  { label: 'Address', value: '12/5, 1st Main Road, KK Nagar, Chennai - 600078, Tamil Nadu' },
  { label: 'PAN Number', value: 'ABCDE1234F' },
  { label: 'Aadhaar Number', value: 'XXXX XXXX 1234' },
  { label: 'Blood Group', value: 'B+' },
];

export const WORK_INFO_FIELDS = [
  { label: 'Employee ID', value: 'BOO-2025-0012' },
  { label: 'Role', value: 'Back Office Officer' },
  { label: 'Department', value: 'Loan Operations' },
  { label: 'Branch', value: 'KK Nagar, Chennai' },
  { label: 'Reporting Manager', value: 'Operations Manager' },
  { label: 'Date of Joining', value: '02 Jan 2025' },
  { label: 'Work Email', value: 'rajesh.kumar@sivelsfinance.com' },
  { label: 'Work Phone', value: '044 4567 8901' },
  { label: 'Employment Type', value: 'Full Time' },
  { label: 'Status', value: 'Active', isBadge: true },
];

export const RECENT_ACTIVITIES = [
  { id: 1, activity: 'Application Approved', appId: 'APP25060500024', date: '05 Jun 2025, 11:35 AM', details: 'Application approved and moved to disbursement', type: 'primary' },
  { id: 2, activity: 'Bank Verified', appId: 'APP25060500023', date: '05 Jun 2025, 10:48 AM', details: 'Bank account verified successfully', type: 'primary' },
  { id: 3, activity: 'CIBIL Checked', appId: 'APP25060500022', date: '05 Jun 2025, 09:52 AM', details: 'CIBIL score 742, eligible ₹ 1,50,000', type: 'success' },
  { id: 4, activity: 'Documents Verified', appId: 'APP25060500021', date: '05 Jun 2025, 09:15 AM', details: 'All documents verified successfully', type: 'success' },
  { id: 5, activity: 'New Application Assigned', appId: 'APP25060500020', date: '05 Jun 2025, 09:10 AM', details: 'Application assigned by RM', type: 'primary' },
];
