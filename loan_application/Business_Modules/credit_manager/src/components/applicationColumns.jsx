import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import iconMap from '../../../back_office/src/back-office/config/iconMap';
import { StatusPill } from './ApplicationQueue';
import { useCreditApplications } from '../context/CreditApplicationsContext';
import {
  CM_STATUS,
  isCreditManagerIncomingWorkflow,
  isCreditManagerReviewWorkflow,
} from '../mappers/creditMapper';
import { buildApplicationReviewRoute } from '../config/routeConfig';
import { formatCurrency, formatDate, getApplicationNo } from '../utils/formatters';
import creditManagerService from '../api/creditManagerService';
import { getCreditManagerAuth } from '../auth/authStorage';
import { extractApiErrorMessage } from '../../../../Core/src/utils/apiErrorHandler';
import { extractWorkflowStatus } from '../../../../Core/src/utils/applicationWorkflowStatus';

function ReviewButton({ app }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { refetch } = useCreditApplications();
  const [startingReview, setStartingReview] = React.useState(false);
  const [error, setError] = React.useState('');
  const isIncoming = isCreditManagerIncomingWorkflow(app.workflowStatusCode);
  const isReviewInProgress = isCreditManagerReviewWorkflow(app.workflowStatusCode);
  const isPending = isIncoming || isReviewInProgress || (!app.workflowStatusCode && app.status === CM_STATUS.PENDING);
  const actionLabel = isIncoming ? 'Verify Now' : isReviewInProgress ? 'Continue Review' : isPending ? 'Review' : 'View';
  const Icon = iconMap[isPending ? 'FileCheck' : 'Eye'];

  const openReviewWorkspace = () => {
    navigate(buildApplicationReviewRoute(app.agentCustomerId), {
      state: { from: location.pathname },
    });
  };

  const handleClick = async () => {
    if (!isIncoming) {
      openReviewWorkspace();
      return;
    }
    if (startingReview) return;

    const auth = getCreditManagerAuth();
    const actorId = Number(auth?.creditManagerId);
    if (!actorId) {
      setError('Your Credit Manager session has expired. Please log in again.');
      return;
    }

    setStartingReview(true);
    setError('');
    try {
      const response = await creditManagerService.startCreditReview(app.agentCustomerId, {
        performedByUserId: actorId,
        performedByRole: auth?.role || 'CreditManager',
        remarks: 'Started Credit Manager review',
      });
      const transitionStatus = extractWorkflowStatus(response);
      const refreshedApplications = await refetch();
      const refreshedApplication = Array.isArray(refreshedApplications)
        ? refreshedApplications.find((item) => String(item.agentCustomerId) === String(app.agentCustomerId))
        : null;
      const refreshedStatus = extractWorkflowStatus(refreshedApplication);
      const confirmedStatus = transitionStatus.hasDetailedWorkflowStatus ? transitionStatus : refreshedStatus;
      if (!isCreditManagerReviewWorkflow(confirmedStatus.workflowStatusCode)) {
        throw new Error('The server did not confirm Credit Manager Review In Progress. Please refresh and retry.');
      }
      openReviewWorkspace();
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to start Credit Manager review.'));
    } finally {
      setStartingReview(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        className="stc-btn-review"
        onClick={handleClick}
        disabled={startingReview}
        aria-label={`${actionLabel} application ${getApplicationNo(app)}`}
      >
        {Icon && <Icon size={14} />}
        <span>{startingReview ? 'Starting…' : actionLabel}</span>
      </button>
      {error && <div className="stc-customer-sub" role="alert">{error}</div>}
    </div>
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
  render: (app) => {
    const applicationNo = getApplicationNo(app);
    const customerCode = app?.customerCode && app.customerCode !== 'N/A' && app.customerCode !== applicationNo
      ? app.customerCode
      : null;
    return (
      <>
        <strong>{applicationNo}</strong>
        {customerCode && <div className="stc-customer-sub">Customer Code: {customerCode}</div>}
        <div className="stc-customer-sub">{formatDate(app.createdAt)}</div>
      </>
    );
  },
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

export const sanctionedAmountColumn = {
  key: 'sanctionedAmount',
  header: 'Sanctioned Amount',
  render: (app) => <span className="stc-amount-cell">{formatCurrency(app.sanctionedLoanAmount)}</span>,
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
  render: (app) => (
    <StatusPill
      status={app.status}
      workflowStatusCode={app.workflowStatusCode}
      workflowStatusName={app.workflowStatusName}
      escalation={app.pendingEscalation}
    />
  ),
};

export const escalationColumn = {
  key: 'escalation',
  header: 'Forwarded',
  render: (app) => {
    const escalation = app.pendingEscalation;
    if (!escalation) return <span className="stc-customer-sub">—</span>;
    const overLimit =
      escalation.loanAmount != null && escalation.approvalLimit != null && escalation.loanAmount > escalation.approvalLimit;
    return (
      <div className="cm-escalation-cell">
        <span className="stc-pill stc-pill--progress">
          {escalation.canCurrentUserApprove ? 'Forwarded to you' : `Waiting for ${escalation.toRoleName || 'another role'}`}
        </span>
        <div className="stc-customer-sub">
          {overLimit
            ? `${formatCurrency(escalation.loanAmount)} over ${formatCurrency(escalation.approvalLimit)} limit`
            : formatCurrency(escalation.loanAmount)}
        </div>
        <div className="stc-customer-sub">
          {escalation.fromRoleName ? `From ${escalation.fromRoleName} · ` : ''}
          {formatDate(escalation.escalatedAt)}
        </div>
      </div>
    );
  },
};
