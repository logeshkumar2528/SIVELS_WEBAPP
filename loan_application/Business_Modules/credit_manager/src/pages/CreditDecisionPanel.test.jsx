import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../back_office/src/back-office/pages/CustomerVerification/CustomerVerification', () => ({
  default: () => null,
  CREDIT_REVIEW_SECTIONS: [],
  getApplicableCreditSections: () => [],
  resolveReviewSectionId: (id) => id,
}));
vi.mock('../../../back_office/src/back-office/components/VerificationReportPdf/VerificationReportPdf', () => ({
  default: () => null,
}));
vi.mock('../../../back_office/src/back-office/hooks/useVerificationWorkspace', () => ({
  useVerificationWorkspace: () => ({ verificationData: null }),
}));
vi.mock('../../../../Core/src/features/approval-documents/components/ApprovedDocumentsViewer', () => ({
  default: () => null,
  DOC_TYPES: { SANCTION_LETTER: 'SANCTION_LETTER', KFS: 'KFS' },
}));
vi.mock('../../../../Core/src/features/approval-documents/services/approvalDocumentService', () => ({
  default: {},
  resolveApplicationProductDetailsId: () => null,
}));
vi.mock('../api/creditManagerService', () => ({ default: {} }));

const { CreditDecisionPanel } = await import('./ApplicationReview');

const review = { approvedCount: 2, totalSections: 2, applicableSections: [], getStatus: () => 'APPROVED' };
const waitingEscalation = {
  escalationId: 11,
  fromRoleName: 'Credit Manager',
  toRoleName: 'Credit Head',
  loanAmount: 900000,
  approvalLimit: 750000,
  escalatedAt: '2026-11-07T10:00:00',
  canCurrentUserApprove: false,
  isWaitingForAnotherRole: true,
};
const limit = {
  roleName: 'Credit Manager',
  minimumApprovalAmount: 0,
  maximumApprovalAmount: 750000,
  escalationRoleName: 'Credit Head',
};

function renderPanel(props = {}) {
  return render(
    <CreditDecisionPanel
      isPending
      review={review}
      onOpenSection={vi.fn()}
      pendingFlags={[]}
      onRemoveFlag={vi.fn()}
      latestDecision={null}
      latestReturn={null}
      latestReturnItems={[]}
      awaitingReviewSections={[]}
      loading={false}
      error=""
      successMessage=""
      onDismissSuccess={vi.fn()}
      onAction={vi.fn()}
      onViewDocument={vi.fn()}
      onDownloadDocument={vi.fn()}
      identifierWarning=""
      approvalLimit={limit}
      {...props}
    />
  );
}

function grant(permissions) {
  localStorage.setItem('sivels_currentUser', JSON.stringify({ roleCode: 'CREDIT_MANAGER', permissions }));
}

describe('CreditDecisionPanel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the approval range and lets the approver approve or forward', () => {
    grant(['CREDIT.VIEW', 'CREDIT.EDIT', 'CREDIT.APPROVE']);
    renderPanel({ approvalCheck: { loading: false, amount: 500000, outcome: 'WithinLimit', maximumApprovalAmount: 750000 } });
    expect(screen.getByTestId('approval-range')).toHaveTextContent(
      'Your approval range (Credit Manager): ₹0 – ₹7,50,000; above that, forward it to an approving authority.'
    );
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Forward' })).toBeEnabled();
  });

  it('disables Approve above the limit and points to Forward', () => {
    grant(['CREDIT.VIEW', 'CREDIT.EDIT', 'CREDIT.APPROVE']);
    const onAction = vi.fn();
    renderPanel({
      onAction,
      approvalCheck: { loading: false, amount: 1000000, outcome: 'Escalate', maximumApprovalAmount: 750000 },
    });
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(
      screen.getByText('₹10,00,000 exceeds your approval limit of ₹7,50,000. Forward it to an approving authority.')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ key: 'FORWARD' }));
  });

  it('makes the application read-only for the sender after forwarding', () => {
    grant(['CREDIT.VIEW', 'CREDIT.EDIT', 'CREDIT.APPROVE']);
    renderPanel({
      pendingEscalation: waitingEscalation,
      escalations: [
        {
          id: 11,
          fromRoleName: 'Credit Manager',
          fromStaffName: 'Meena',
          toRoleName: 'Credit Head',
          loanAmount: 900000,
          approvalLimit: 750000,
          remarks: 'Strong income, above my limit',
          createdAt: '2026-11-07T10:00:00',
          isPending: true,
        },
      ],
    });
    expect(screen.getByText(/Forwarded to Credit Head on/)).toBeInTheDocument();
    expect(screen.getByTestId('forwarded-read-only')).toHaveTextContent('forwarded to Credit Head and is read-only');
    ['Approve', 'Reject', 'Return to Back Office', 'Forward'].forEach((name) => {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId('approval-range')).not.toBeInTheDocument();
    expect(screen.getByText('Forward History')).toBeInTheDocument();
    expect(screen.getAllByText(/Strong income, above my limit/).length).toBeGreaterThan(0);
  });

  it('lets the target role approve, forward, reject or return', () => {
    grant(['CREDIT.VIEW', 'CREDIT.EDIT', 'CREDIT.APPROVE']);
    renderPanel({
      pendingEscalation: { ...waitingEscalation, canCurrentUserApprove: true, isWaitingForAnotherRole: false },
    });
    expect(screen.getByText(/Forwarded to you by Credit Manager on/)).toBeInTheDocument();
    ['Approve', 'Reject', 'Return to Back Office', 'Forward'].forEach((name) => {
      expect(screen.getByRole('button', { name })).toBeEnabled();
    });
  });

  it('hides the decision buttons without CREDIT.APPROVE', () => {
    grant(['CREDIT.VIEW', 'CREDIT.EDIT']);
    renderPanel();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(screen.getByText(/can't record a credit decision/)).toBeInTheDocument();
    expect(screen.queryByTestId('approval-range')).not.toBeInTheDocument();
  });
});
