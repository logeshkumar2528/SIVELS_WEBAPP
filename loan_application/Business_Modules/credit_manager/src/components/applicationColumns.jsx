import React from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../../back_office/src/back-office/config/iconMap';
import { StatusPill } from './ApplicationQueue';
import { CM_STATUS } from '../mappers/creditMapper';
import { buildApplicationReviewRoute } from '../config/routeConfig';
import { formatCurrency, formatDate, getApplicationNo } from '../utils/formatters';

function ReviewButton({ app }) {
  const navigate = useNavigate();
  const isPending = app.status === CM_STATUS.PENDING;
  const Icon = iconMap[isPending ? 'FileCheck' : 'Eye'];

  return (
    <button
      type="button"
      className="stc-btn-review"
      onClick={() => navigate(buildApplicationReviewRoute(app.agentCustomerId))}
      aria-label={`${isPending ? 'Review' : 'View'} application ${getApplicationNo(app)}`}
    >
      {Icon && <Icon size={14} />}
      <span>{isPending ? 'Review' : 'View'}</span>
    </button>
  );
}

export const actionColumn = {
  key: 'action',
  header: 'Action',
  render: (app) => <ReviewButton app={app} />,
};

export const applicationNoColumn = {
  key: 'applicationNo',
  header: 'Application No & Date',
  render: (app) => (
    <>
      <strong>{getApplicationNo(app)}</strong>
      <div className="stc-customer-sub">{formatDate(app.createdAt)}</div>
    </>
  ),
};

export const customerColumn = {
  key: 'customer',
  header: 'Customer Name',
  render: (app) => (
    <div className="stc-customer-cell">
      <span className="stc-customer-name">{app.customerName || 'Customer'}</span>
      <span className="stc-customer-sub">{app.mobile || ''}</span>
    </div>
  ),
};

export const productColumn = {
  key: 'product',
  header: 'Loan Product',
  render: (app) => app.loanType || '—',
};

export const amountColumn = {
  key: 'amount',
  header: 'Amount',
  render: (app) => <span className="stc-amount-cell">{formatCurrency(app.expectedLoanAmount)}</span>,
};

export const rmAgentColumn = {
  key: 'rmAgent',
  header: 'Assigned RM & Agent',
  render: (app) => (
    <>
      <div><strong>RM:</strong> {app.rmName || '—'}</div>
      <div className="stc-customer-sub"><strong>Agent:</strong> {app.agentName || '—'}</div>
    </>
  ),
};

export const statusColumn = {
  key: 'status',
  header: 'Status',
  render: (app) => <StatusPill status={app.status} />,
};
