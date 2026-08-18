import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Briefcase, Wallet, Calendar, CalendarDays, CheckCircle2, 
  Activity, ArrowRight, FileText, BarChart3, Clock, Lock, User
} from 'lucide-react';
import StatCard from '../../components/StatCard/StatCard';
import DonutChart from '../../components/DonutChart/DonutChart';
import './Dashboard.css';

export default function Dashboard() {
  const stats = [
    { title: "Active Loan", value: "1", icon: <Briefcase size={22} />, variant: "default" },
    { title: "Outstanding Balance", value: "₹1,24,560", icon: <Wallet size={22} />, variant: "danger" },
    { title: "Next EMI Date", value: "05 Aug 2025", icon: <CalendarDays size={22} />, variant: "success" },
    { title: "EMI Paid", value: "18", icon: <CheckCircle2 size={22} />, variant: "default" },
    { title: "Credit Score", value: "750", icon: <Activity size={22} />, variant: "warning" }
  ];

  const donutData = [
    { label: "Paid", value: 18, percentage: "50%", color: "#166534" },
    { label: "Remaining", value: 18, percentage: "50%", color: "#E5E7EB" }
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
              <div className="summary-item"><span className="summary-label">Loan Amount</span><span className="summary-value">₹2,00,000</span></div>
              <div className="summary-item"><span className="summary-label">Interest Rate (ROI)</span><span className="summary-value">11.50%</span></div>
              <div className="summary-item"><span className="summary-label">Sanctioned Amount</span><span className="summary-value">₹2,00,000</span></div>
              <div className="summary-item"><span className="summary-label">EMI Amount</span><span className="summary-value">₹4,980</span></div>
              <div className="summary-item"><span className="summary-label">Disbursed Amount</span><span className="summary-value">₹2,00,000</span></div>
              <div className="summary-item"><span className="summary-label">Remaining Tenure</span><span className="summary-value">18 Months</span></div>
              <div className="summary-item"><span className="summary-label">Outstanding Balance</span><span className="summary-value highlight">₹1,24,560</span></div>
              <div className="summary-item"><span className="summary-label">Total Tenure</span><span className="summary-value">36 Months</span></div>
            </div>
          </div>
          <Link to="/my-loan" className="btn-outline-primary">
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
              <circle
                cx="75" cy="75" r="58"
                fill="none"
                stroke="#166534"
                strokeWidth="18"
                strokeDasharray="364.42"
                strokeDashoffset="182.21"
                strokeLinecap="round"
                transform="rotate(-90 75 75)"
              />
              <text x="75" y="68" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '22px', fontWeight: '700', fill: 'var(--color-text-primary)' }}>18 / 36</text>
              <text x="75" y="92" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '12px', fontWeight: '500', fill: 'var(--color-text-secondary)' }}>EMI Paid</text>
            </svg>
            </div>
            <div className="emi-progress-copy">
              <span>Repayment progress</span>
              <strong>50% complete</strong>
              <p>18 of 36 EMIs paid</p>
            </div>
          </div>
          
          <div className="emi-progress-bar"><span></span></div>
          <div className="custom-emi-legend">
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#166534' }}></div>
              <span className="legend-val">18</span>
              <span className="legend-label">Paid</span>
              <span className="legend-pct">(50%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#E5E7EB' }}></div>
              <span className="legend-val">18</span>
              <span className="legend-label">Remaining</span>
              <span className="legend-pct">(50%)</span>
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
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: '24px' }}>₹4,980</div>
                
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Due Date</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-success)' }}>05 Aug 2025</div>
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
                {[
                  { date: '05 Jul 2025', amount: '₹4,980', mode: 'UPI' },
                  { date: '05 Jun 2025', amount: '₹4,980', mode: 'Net Banking' },
                  { date: '05 May 2025', amount: '₹4,980', mode: 'UPI' },
                  { date: '05 Apr 2025', amount: '₹4,980', mode: 'Debit Card' },
                  { date: '05 Mar 2025', amount: '₹4,980', mode: 'UPI' }
                ].map((row, i) => (
                  <tr key={i}>
                    <td>{row.date}</td>
                    <td>{row.amount}</td>
                    <td>{row.mode}</td>
                    <td><span className="status-badge">Paid</span></td>
                  </tr>
                ))}
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
              <div className="timeline-line-fill"></div>
            </div>
            
            <div className="timeline-step completed">
              <div className="timeline-icon-wrapper">
                <FileText size={20} />
                <div className="timeline-check"><CheckCircle2 size={12} /></div>
              </div>
              <div className="timeline-label">Approved</div>
              <div className="timeline-date">12 May 2025</div>
            </div>

            <div className="timeline-step completed">
              <div className="timeline-icon-wrapper">
                <Wallet size={20} />
                <div className="timeline-check"><CheckCircle2 size={12} /></div>
              </div>
              <div className="timeline-label">Disbursed</div>
              <div className="timeline-date">15 May 2025</div>
            </div>

            <div className="timeline-step active">
              <div className="timeline-icon-wrapper">
                <User size={20} />
                <div className="timeline-check"><CheckCircle2 size={12} /></div>
              </div>
              <div className="timeline-label">Active</div>
              <div className="timeline-date">15 May 2025</div>
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
            <CheckCircle2 size={16} /> Your loan is active. Keep up the good work!
          </div>

        </div>

      </div>

    </div>
  );
}
