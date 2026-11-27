import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const escalation = (canCurrentUserApprove) => ({
  escalationId: 1,
  toRoleName: 'Credit Head',
  loanAmount: 900000,
  approvalLimit: 750000,
  canCurrentUserApprove,
  isWaitingForAnotherRole: !canCurrentUserApprove,
});

vi.mock('../api/creditManagerService', () => ({
  default: {
    getAllApplications: vi.fn(async () => [
      { agentCustomerId: 1, fullName: 'Plain', status: 3, workflowStatusCode: 'CM_REVIEW_IN_PROGRESS' },
      { agentCustomerId: 2, fullName: 'To me', status: 3, workflowStatusCode: 'CM_REVIEW_IN_PROGRESS', pendingEscalation: escalation(true) },
      { agentCustomerId: 3, fullName: 'Waiting', status: 3, workflowStatusCode: 'CM_REVIEW_IN_PROGRESS', pendingEscalation: escalation(false) },
      { agentCustomerId: 4, fullName: 'Approved', status: 4, workflowStatusCode: 'CREDIT_APPROVED_MAKER_PENDING' },
      { agentCustomerId: 5, fullName: 'Incoming', status: 1, workflowStatusCode: 'CM_APPROVAL_PENDING' },
      { agentCustomerId: 6, fullName: 'Maker', status: 4, workflowStatusCode: 'MAKER_VERIFICATION_IN_PROGRESS' },
    ]),
  },
}));
vi.mock('../../../back_office/src/back-office/api/backOfficeService', () => ({
  default: { getAllRMs: vi.fn(async () => []), getAllAgents: vi.fn(async () => []) },
}));
vi.mock('../auth/authStorage', () => ({
  getCreditManagerSessionKey: () => 'test-session',
  isCreditManagerAuthenticated: () => true,
}));

const { CreditApplicationsProvider, useCreditApplications } = await import('./CreditApplicationsContext');

function Probe() {
  const { loading, counts, escalated, waiting } = useCreditApplications();
  if (loading) return <p>loading</p>;
  return (
    <p>
      {`pending:${counts.pending} escalated:${counts.escalated}=${escalated.map((a) => a.agentCustomerId)} waiting:${counts.waiting}=${waiting.map((a) => a.agentCustomerId)}`}
    </p>
  );
}

function QueueProbe() {
  const { loading, counts } = useCreditApplications();
  if (loading) return <p>loading</p>;
  return <p>{`received:${counts.received} pending:${counts.pending} approved:${counts.approved} rejected:${counts.rejected}`}</p>;
}

describe('CreditApplicationsContext escalation queues', () => {
  it('splits pending applications into escalated-to-me and waiting', async () => {
    render(
      <CreditApplicationsProvider>
        <Probe />
      </CreditApplicationsProvider>
    );
    await waitFor(() =>
      expect(screen.getByText('pending:1 escalated:1=2 waiting:1=3')).toBeInTheDocument()
    );
  });

  it('separates incoming, active review and approved maker-stage queues', async () => {
    render(
      <CreditApplicationsProvider>
        <QueueProbe />
      </CreditApplicationsProvider>
    );
    await waitFor(() =>
      expect(screen.getByText('received:1 pending:1 approved:2 rejected:0')).toBeInTheDocument()
    );
  });
});
