import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/routeConfig';
import { 
  Briefcase, Wallet, Calendar, CalendarDays, CheckCircle2, 
  Activity, ArrowRight, FileText, BarChart3, Clock, Lock, User
} from 'lucide-react';
import StatCard from '../../components/StatCard/StatCard';
import { useCustomerIdentity } from '../../hooks/useCustomerIdentity';
import { useCustomerProfile } from '../../hooks/useCustomerProfile';
import './Dashboard.css';

const display = (value, fallback = '—') => value === null || value === undefined || value === '' ? fallback : value;
const money = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? `₹${amount.toLocaleString('en-IN')}` : '—';
};
const date = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const calculateEmi = (principal, annualRate, months) => {
  const amount = Number(principal);
  const rate = Number(annualRate) / 1200;
  const tenure = Number(months);
  if (!Number.isFinite(amount) || !Number.isFinite(rate) || !Number.isFinite(tenure) || amount <= 0 || tenure <= 0) return null;
  if (rate === 0) return amount / tenure;
  return amount * rate * ((1 + rate) ** tenure) / (((1 + rate) ** tenure) - 1);
};

export default function Dashboard() {
  const { profile, fallbackIdentity } = useCustomerProfile();
  const customerData = profile || fallbackIdentity || {};
  const applications = Array.isArray(customerData.applications) ? customerData.applications : [];
  const applicationData = applications.find((application) => String(application.status || '').toLowerCase() === 'approved') || applications[0] || null;
  const approvedAmount = applicationData?.sanctionedAmount ?? applicationData?.loanAmount;
  const approvedRate = applicationData?.roi;
  const approvedTenure = applicationData?.loanTenure;
  const approvedEmi = calculateEmi(approvedAmount, approvedRate, approvedTenure);
  const applicationLoan = applicationData ? {
    loanAmount: applicationData.loanAmount,
    interestRate: approvedRate,
    emiAmount: approvedEmi,
    totalTenure: approvedTenure,
    emiPaid: applicationData.emiPaid,
    remainingEmi: applicationData.remainingEmi,
    nextEmiDate: applicationData.nextEmiDate,
    status: applicationData.status,
  } : null;
  const loans = Array.isArray(customerData?.loans) ? customerData.loans : [];
  const activeLoan = applicationLoan || customerData?.activeLoan || loans.find((loan) => String(loan.status || '').toLowerCase() === 'active') || customerData || {};
  const payments = applicationData?.paymentHistory || customerData?.paymentHistory || [];
  const paidCount = Number(applicationLoan?.emiPaid ?? customerData?.emiPaid ?? activeLoan.emiPaid);
  const totalTenure = Number(applicationLoan?.totalTenure ?? customerData?.totalTenure ?? activeLoan.totalTenure ?? activeLoan.loanTenure ?? activeLoan.tenure);
  const remainingEmi = Number(applicationLoan?.remainingEmi ?? customerData?.remainingEmi ?? activeLoan.remainingEmi ?? activeLoan.remainingEMI);
  const paid = Number.isFinite(paidCount) ? paidCount : 0;
  const total = Number.isFinite(totalTenure) ? totalTenure : 0;
  const remaining = Number.isFinite(remainingEmi) ? remainingEmi : Math.max(total - paid, 0);
  const progress = total > 0 ? Math.round((paid / total) * 100) : 0;
  const loanAmount = money(activeLoan.loanAmount ?? customerData?.expectedLoanAmount);
  const emiAmount = money(activeLoan.emiAmount ?? activeLoan.emi ?? customerData?.emiAmount);
  const nextEmiDate = date(applicationLoan?.nextEmiDate ?? activeLoan.nextEmiDate ?? customerData?.nextEmiDate);
  const outstanding = '—';
  const interestRate = applicationLoan?.interestRate ?? activeLoan.interestRate ?? activeLoan.roi ?? customerData?.interestRate ?? customerData?.roi;
  const loanRows = useMemo(() => [
    ['Loan Amount', loanAmount],
    ['Interest Rate (ROI)', interestRate == null || interestRate === '' ? '—' : `${interestRate}%`],
    ['Sanctioned Amount', '—'],
    ['EMI Amount', emiAmount],
    ['Disbursed Amount', '—'],
    ['Remaining Tenure', total > 0 ? `${remaining} Months` : '—'],
    ['Outstanding Balance', outstanding],
    ['Total Tenure', Number.isFinite(total) && total > 0 ? `${total} Months` : '—'],
  ], [activeLoan, loanAmount, emiAmount, remaining, outstanding, total]);

  const stats = [
    { title: "Active Loan", value: display(customerData?.activeLoanCount ?? (loans.length ? loans.length : null)), icon: <Briefcase size={22} />, variant: "default" },
    { title: "Outstanding Balance", value: outstanding, icon: <Wallet size={22} />, variant: "danger" },
    { title: "Next EMI Date", value: nextEmiDate, icon: <CalendarDays size={22} />, variant: "success" },
    { title: "EMI Paid", value: display(Number.isFinite(paidCount) ? paidCount : null), icon: <CheckCircle2 size={22} />, variant: "default" },
    { title: "Credit Score", value: display(customerData?.creditScore), icon: <Activity size={22} />, variant: "warning" }
  ];

  return (
    <div className="dashboard-grid">
      
      {/* STATS ROW */}
      <div className="dashboard-stats-row">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      {/* MIDDLE ROW */}
      <div className="dashboard-middle-row">
        
        {/* Loan Summary */}
        <div className="dashboard-card">
          <div className="dashboard-card-title">
            <FileText size={20} color="var(--color-text-secondary)" /> Loan Summary
          </div>
          <div className="inner-border-wrapper loan-summary-wrapper">
            <div className="loan-summary-grid">
              {loanRows.map(([label, value]) => <div className="summary-item" key={label}><span className="summary-label">{label}</span><span className={`summary-value${label === 'Outstanding Balance' ? ' highlight' : ''}`}>{value}</span></div>)}
            </div>
          </div>
          <Link to={ROUTES.MY_LOAN} className="btn-outline-primary">
            View My Loan Details <ArrowRight size={16} />
          </Link>
        </div>

        <div className="dashboard-card emi-progress-card">
          <div className="dashboard-card-title">
            <BarChart3 size={20} color="var(--color-text-secondary)" /> EMI Progress
          </div>
          <div className="emi-progress-overview">
            <div className="emi-progress-visual">
            <svg width="118" height="118" viewBox="0 0 150 150">
              <circle
                cx="75" cy="75" r="58"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="18"
              />
              <circle cx="75" cy="75" r="58" fill="none" stroke="#166534" strokeWidth="18" strokeDasharray="364.42" strokeDashoffset={364.42 - ((364.42 * progress) / 100)} strokeLinecap="round" transform="rotate(-90 75 75)" />
              <text x="75" y="68" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '22px', fontWeight: '700', fill: 'var(--color-text-primary)' }}>{paid} / {total || '—'}</text>
              <text x="75" y="92" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '12px', fontWeight: '500', fill: 'var(--color-text-secondary)' }}>EMI Paid</text>
            </svg>
            </div>
            <div className="emi-progress-copy">
              <span>Repayment progress</span>
              <strong>{total ? `${progress}% complete` : '—'}</strong>
              <p>{total ? `${paid} of ${total} EMIs paid` : 'EMI progress unavailable'}</p>
            </div>
          </div>
          
          <div className="emi-progress-bar"><span style={{ width: `${progress}%` }}></span></div>
          <div className="custom-emi-legend">
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#166534' }}></div>
              <span className="legend-val">{paid}</span>
              <span className="legend-label">Paid</span>
              <span className="legend-pct">({progress}%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#E5E7EB' }}></div>
              <span className="legend-val">{remaining}</span>
              <span className="legend-label">Remaining</span>
              <span className="legend-pct">({Math.max(100 - progress, 0)}%)</span>
            </div>
          </div>
        </div>

        {/* Upcoming EMI */}
        <div className="dashboard-card">
          <div className="dashboard-card-title">
            <CalendarDays size={20} color="var(--color-text-secondary)" /> Upcoming EMI
          </div>
          <div className="upcoming-emi-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingTop: '10px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flex: 1 }}>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>EMI Amount</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: '24px' }}>{emiAmount}</div>
                
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Due Date</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-success)' }}>{nextEmiDate}</div>
              </div>
              
              <div style={{ 
                width: '64px', height: '64px', 
                backgroundColor: 'var(--color-bg)', 
                borderRadius: '16px', border: '1px solid var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Wallet size={32} color="var(--color-primary-muted)" />
              </div>
            </div>

            <button className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: 'auto' }}>
              Pay Now <ArrowRight size={16} />
            </button>

          </div>
        </div>

      </div>

      {/* BOTTOM ROW */}
      <div className="dashboard-bottom-row">
        
        {/* Recent Payment History */}
        <div className="dashboard-card">
          <div className="dashboard-card-title" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="var(--color-text-secondary)" /> Recent Payment History
            </div>
            <a href="#" className="stat-card-link" style={{ fontSize: '14px' }}>View All <ArrowRight size={14} /></a>
          </div>
          <div className="inner-border-wrapper" style={{ overflowX: 'auto', flex: 1 }}>
            <table className="recent-payment-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    <td>{date(row.date || row.paymentDate || row.paidAt)}</td>
                    <td>{money(row.amount || row.amountPaid)}</td>
                    <td>{display(row.mode || row.paymentMode)}</td>
                    <td><span className="status-badge">{display(row.status, '—')}</span></td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td colSpan="4">No payment history available.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Loan Status Timeline */}
        <div className="dashboard-card">
          <div className="dashboard-card-title">
            <Clock size={20} color="var(--color-text-secondary)" /> Loan Status Timeline
          </div>
          
          <div className="timeline-container">
            <div className="timeline-line">
              <div className="timeline-line-fill" style={{ width: customerData?.loanStatusProgress != null ? `${customerData.loanStatusProgress}%` : '0%' }}></div>
            </div>
            
            <div className="timeline-step completed">
              <div className="timeline-icon-wrapper">
                <FileText size={20} />
                <div className="timeline-check"><CheckCircle2 size={12} /></div>
              </div>
              <div className="timeline-label">Approved</div>
              <div className="timeline-date">{date(customerData?.approvedAt)}</div>
            </div>

            <div className="timeline-step completed">
              <div className="timeline-icon-wrapper">
                <Wallet size={20} />
                <div className="timeline-check"><CheckCircle2 size={12} /></div>
              </div>
              <div className="timeline-label">Disbursed</div>
              <div className="timeline-date">{date(customerData?.disbursedAt)}</div>
            </div>

            <div className="timeline-step active">
              <div className="timeline-icon-wrapper">
                <User size={20} />
                <div className="timeline-check"><CheckCircle2 size={12} /></div>
              </div>
              <div className="timeline-label">Active</div>
              <div className="timeline-date">{date(customerData?.activatedAt)}</div>
            </div>

            <div className="timeline-step">
              <div className="timeline-icon-wrapper">
                <Lock size={20} />
              </div>
              <div className="timeline-label">Closed</div>
              <div className="timeline-date">--</div>
            </div>
          </div>

          <div className="timeline-footer">
            <CheckCircle2 size={16} /> {display(customerData?.loanStatusMessage, 'Loan status information unavailable.')}
          </div>

        </div>

      </div>

    </div>
  );
}
