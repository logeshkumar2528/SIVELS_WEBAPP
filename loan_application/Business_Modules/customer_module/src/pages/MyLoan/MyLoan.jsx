import React from 'react';
import { Building2, Download, FileText, Landmark } from 'lucide-react';
import { useCustomerProfile } from '../../hooks/useCustomerProfile';
import './MyLoan.css';

const show = (value, fallback = '—') => value === null || value === undefined || value === '' ? fallback : value;
const money = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? `₹${amount.toLocaleString('en-IN')}` : '—';
};
const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function MyLoan() {
  const { profile, fallbackIdentity } = useCustomerProfile();
  const customerData = profile || fallbackIdentity || {};
  const applications = Array.isArray(customerData.applications) ? customerData.applications : [];
  const application = applications.find((item) => String(item.status || '').toLowerCase() === 'approved') || applications[0] || {};
  const officialLoanAccountNumber = show(application.loanAccountNumber);
  const hasApprovedLoan = String(application.status || '').toLowerCase() === 'approved' || Boolean(application.loanAccountNumber);
  const loanType = show(application.loanProductName || customerData.loanProductName);
  const loanAmount = money(application.loanAmount ?? customerData.expectedLoanAmount);
  const sanctionedAmount = money(application.sanctionedAmount);
  const disbursedAmount = money(application.disbursedAmount);
  const outstandingAmount = money(application.outstandingAmount ?? application.outstandingBalance);
  const interestRate = application.roi == null ? '—' : `${application.roi}%`;
  const tenure = application.loanTenure == null ? '—' : `${application.loanTenure} Months`;
  const repaymentDetails = [
    ['Loan Tenure', tenure],
    ['EMI Amount', money(application.emi ?? application.monthlyEmi)],
    ['EMI Day', show(application.emiDay)],
    ['Outstanding Amount', outstandingAmount, outstandingAmount === '—' ? '' : 'danger'],
    ['Interest Paid', money(application.interestPaid)],
    ['Principal Paid', money(application.principalPaid)],
    ['Remaining Tenure', application.remainingTenure == null ? '—' : `${application.remainingTenure} Months`],
    ['Remaining EMI', show(application.remainingEmi)],
  ];

  const loanDetails = [
    ['Loan Account Number', officialLoanAccountNumber],
    ['Loan Type', loanType],
    ['Sanctioned Amount', sanctionedAmount],
    ['Disbursed Amount', disbursedAmount],
    ['Disbursement Date', formatDate(application.disbursementDate)],
    ['Interest Rate (ROI)', interestRate],
  ];

  return (
    <div className="my-loan-page">
      <header className="my-loan-heading">
        <h1>My Loan</h1>
        <p>View and manage your loan details</p>
      </header>

      <section className="loan-overview-card">
        <div className="loan-identity">
          <div className="loan-identity-icon"><Building2 size={26} /></div>
          <div>
            <span>Loan Account Number</span>
            <strong>{officialLoanAccountNumber}</strong>
            <small>Loan Type <b>{loanType}</b></small>
          </div>
          <span className="loan-active-badge">
            {hasApprovedLoan ? 'Active' : 'No Active Loan'}
          </span>
        </div>
        <div className="loan-overview-metrics">
          <Metric label="Sanctioned Amount" value={sanctionedAmount} />
          <Metric label="Disbursed Amount" value={disbursedAmount} />
          <Metric label="Outstanding Amount" value={outstandingAmount} danger={outstandingAmount !== '—'} />
          <Metric label="Interest Rate (ROI)" value={interestRate} />
          <Metric label="Loan Tenure" value={tenure} />
        </div>
      </section>

      <section className="loan-details-card">
        <h2><FileText size={18} /> Loan Details</h2>
        <div className="loan-details-layout">
          <DetailList items={loanDetails} />
          <DetailList items={repaymentDetails} bordered />
          <aside className="loan-active-panel">
            <div className="loan-active-icon"><Landmark size={24} /></div>
            <strong>{hasApprovedLoan ? 'Your loan is active' : 'Loan status unavailable'}</strong>
            <p>{hasApprovedLoan ? 'Loan details are shown from your account.' : 'No approved loan details are available.'}</p>
            <button type="button"><Download size={17} /> Download Loan Summary</button>
          </aside>
        </div>
      </section>

    </div>
  );
}

function Metric({ label, value, danger = false }) {
  return <div className="loan-overview-metric"><span>{label}</span><strong className={danger ? 'danger' : ''}>{value}</strong></div>;
}

function DetailList({ items, bordered = false }) {
  return <div className={`loan-detail-list ${bordered ? 'bordered' : ''}`}>
    {items.map(([label, value, tone]) => <div key={label}><span>{label}</span><strong className={tone || ''}>{value}</strong></div>)}
  </div>;
}
