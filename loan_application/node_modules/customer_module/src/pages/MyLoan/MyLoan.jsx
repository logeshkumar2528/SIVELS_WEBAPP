import React from 'react';
import { Building2, Download, FileText, Landmark } from 'lucide-react';
import { useCustomerIdentity } from '../../hooks/useCustomerIdentity';
import './MyLoan.css';

const repaymentDetails = [
  ['Loan Tenure', '36 Months'],
  ['EMI Amount', '₹4,980'],
  ['EMI Day', '5th of every month'],
  ['Outstanding Amount', '₹1,24,560', 'danger'],
  ['Interest Paid', '₹18,720'],
  ['Principal Paid', '₹56,720'],
  ['Remaining Tenure', '18 Months'],
  ['Remaining EMI', '18'],
];

export default function MyLoan() {
  const { customerData } = useCustomerIdentity();

  const loanId = customerData?.agentCustomerId
    ? `LN${String(customerData.agentCustomerId).padStart(6, '0')}`
    : 'LN2025001234';

  const loanType = customerData?.loanPurposeName
    ? `${customerData.loanPurposeName} Loan`
    : 'Personal Loan';

  const loanAmount = customerData?.expectedLoanAmount != null && !isNaN(Number(customerData.expectedLoanAmount))
    ? `₹${Number(customerData.expectedLoanAmount).toLocaleString('en-IN')}`
    : '₹2,00,000';

  const loanDetails = [
    ['Loan ID', loanId],
    ['Loan Type', loanType],
    ['Sanctioned Amount', loanAmount],
    ['Disbursed Amount', loanAmount],
    ['Disbursement Date', '15 May 2025'],
    ['Interest Rate (ROI)', '11.50%'],
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
            <span>Loan ID</span>
            <strong>{loanId}</strong>
            <small>Loan Type <b>{loanType}</b></small>
          </div>
          <span className="loan-active-badge">Active</span>
        </div>
        <div className="loan-overview-metrics">
          <Metric label="Sanctioned Amount" value={loanAmount} />
          <Metric label="Disbursed Amount" value={loanAmount} />
          <Metric label="Outstanding Amount" value="₹1,24,560" danger />
          <Metric label="Interest Rate (ROI)" value="11.50%" />
          <Metric label="Loan Tenure" value="36 Months" />
        </div>
      </section>

      <section className="loan-details-card">
        <h2><FileText size={18} /> Loan Details</h2>
        <div className="loan-details-layout">
          <DetailList items={loanDetails} />
          <DetailList items={repaymentDetails} bordered />
          <aside className="loan-active-panel">
            <div className="loan-active-icon"><Landmark size={24} /></div>
            <strong>Your loan is active</strong>
            <p>Keep up the good work! You are on track with your payments.</p>
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
