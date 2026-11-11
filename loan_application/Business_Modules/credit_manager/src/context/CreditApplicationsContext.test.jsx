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
      { agentCustomerId: 1, fullName: 'Plain', status: 3 },
      { agentCustomerId: 2, fullName: 'To me', status: 3, pendingEscalation: escalation(true) },
      { agentCustomerId: 3, fullName: 'Waiting', status: 3, pendingEscalation: escalation(false) },
      { agentCustomerId: 4, fullName: 'Approved', status: 4 },
    ]),
  },
}));
vi.mock('../../../back_office/src/back-office/api/backOfficeService', () => ({
  default: { getAllRMs: vi.fn(async () => []), getAllAgents: vi.fn(async () => []) },
}));
vi.mock('../auth/authStorage', () => ({ isCreditManagerAuthenticated: () => true }));

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

describe('CreditApplicationsContext escalation queues', () => {
  it('splits pending applications into escalated-to-me and waiting', async () => {
    render(
      <CreditApplicationsProvider>
        <Probe />
      </CreditApplicationsProvider>
    );
    await waitFor(() =>
      expect(screen.getByText('pending:3 escalated:1=2 waiting:1=3')).toBeInTheDocument()
    );
  });
});
