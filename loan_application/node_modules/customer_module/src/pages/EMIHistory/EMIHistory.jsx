import React, { useMemo, useState } from 'react';
import { Building2, CalendarDays, ChevronDown, Download } from 'lucide-react';
import { useCustomerIdentity } from '../../hooks/useCustomerIdentity';
import Pagination from '../../components/Pagination/Pagination';
import './EMIHistory.css';

const payments = [
  ['05 Mar 2025', '₹2,980', '₹2,000', '₹0', '₹4,980', '₹4,980', '03 Mar 2025', 'Paid'],
  ['05 Apr 2025', '₹3,010', '₹1,970', '₹0', '₹4,980', '₹4,980', '02 Apr 2025', 'Paid'],
  ['05 May 2025', '₹3,040', '₹1,940', '₹0', '₹4,980', '₹4,980', '04 May 2025', 'Paid'],
  ['05 Jun 2025', '₹3,070', '₹1,910', '₹0', '₹4,980', '₹4,980', '04 Jun 2025', 'Paid'],
  ['05 Jul 2025', '₹3,100', '₹1,880', '₹0', '₹4,980', '-', '-', 'Upcoming'],
  ['05 Aug 2025', '₹3,130', '₹1,850', '₹0', '₹4,980', '-', '-', 'Upcoming'],
  ['05 Sep 2025', '₹3,160', '₹1,820', '₹0', '₹4,980', '-', '-', 'Upcoming'],
  ['05 Oct 2025', '₹3,190', '₹1,790', '₹100', '₹5,080', '-', '-', 'Overdue'],
  ['05 Nov 2025', '₹3,220', '₹1,760', '₹0', '₹4,980', '-', '-', 'Upcoming'],
  ['05 Dec 2025', '₹3,250', '₹1,730', '₹0', '₹4,980', '-', '-', 'Upcoming'],
].map(([due, principal, interest, penalty, total, paid, date, status], index) => ({ number: index + 1, due, principal, interest, penalty, total, paid, date, status }));

export default function EMIHistory() {
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

  const [status, setStatus] = useState('All');
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const rows = useMemo(() => status === 'All' ? payments : payments.filter((payment) => payment.status === status), [status]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const changeStatus = (event) => { setStatus(event.target.value); setPage(1); };
  const changePageSize = (size) => { setPageSize(size); setPage(1); };

  return <div className="emi-history-page">
    <header className="emi-page-heading"><h1>EMI History</h1><p>View your all EMI payments in one place</p></header>
    <section className="emi-loan-banner"><div className="emi-loan-id"><span className="emi-building"><Building2 size={25} /></span><div><small>Loan ID</small><strong>{loanId}</strong><b>{loanType}</b></div><span className="emi-active-badge">Active</span></div><div className="emi-loan-metrics"><BannerMetric label="Loan Amount" value={loanAmount} /><BannerMetric label="EMI Amount" value="₹4,980" /><BannerMetric label="Tenure" value="36 Months" /><BannerMetric label="EMI Paid" value="18" /><BannerMetric label="EMI Remaining" value="18" /></div></section>
    <section className="emi-filter-bar"><label>Filter by Status<select value={status} onChange={changeStatus}><option>All</option><option>Paid</option><option>Upcoming</option><option>Overdue</option></select><ChevronDown size={16} /></label><label>From Date<span className="date-input">Select date <CalendarDays size={16} /></span></label><label>To Date<span className="date-input">Select date <CalendarDays size={16} /></span></label><button type="button" className="export-csv"><Download size={17} /> Export CSV</button></section>
    <section className="emi-table-card"><div className="emi-table-scroll emi-table-scrollable"><table><thead><tr><th>EMI No.</th><th>Due Date</th><th>Principal (₹)</th><th>Interest (₹)</th><th>Penalty (₹)</th><th>Total Amount (₹)</th><th>Amount Paid (₹)</th><th>Payment Date</th><th>Status</th></tr></thead><tbody>{visibleRows.map((payment) => <tr key={payment.number}><td>{payment.number}</td><td>{payment.due}</td><td>{payment.principal}</td><td>{payment.interest}</td><td className={payment.status === 'Overdue' ? 'overdue-value' : ''}>{payment.penalty}</td><td className={payment.status === 'Overdue' ? 'overdue-value' : ''}>{payment.total}</td><td>{payment.paid}</td><td>{payment.date}</td><td><span className={`emi-status ${payment.status.toLowerCase()}`}>{payment.status}</span></td></tr>)}</tbody></table></div><Pagination currentPage={currentPage} totalItems={rows.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={changePageSize} pageSizeOptions={[5, 10, 25, 50]} /></section>
  </div>;
}

function BannerMetric({ label, value }) { return <div className="emi-banner-metric"><small>{label}</small><strong>{value}</strong></div>; }
