import React from 'react';
import { render, screen } from '@testing-library/react';
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

  it('shows the approval range and lets the approver decide', () => {
    grant(['CREDIT.VIEW', 'CREDIT.EDIT', 'CREDIT.APPROVE']);
    renderPanel();
    expect(screen.getByTestId('approval-range')).toHaveTextContent(
      'Your approval range (Credit Manager): ₹0 – ₹7,50,000; above that escalates to Credit Head.'
    );
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
  });

  it('disables Approve while the escalation waits for another role, keeping Reject and Return', () => {
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
    expect(screen.getByText(/Escalated to Credit Head on/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Return to Back Office' })).toBeEnabled();
    expect(screen.getByText('Escalation History')).toBeInTheDocument();
    expect(screen.getAllByText(/Strong income, above my limit/).length).toBeGreaterThan(0);
  });

  it('lets the escalation role approve', () => {
    grant(['CREDIT.VIEW', 'CREDIT.EDIT', 'CREDIT.APPROVE']);
    renderPanel({
      pendingEscalation: { ...waitingEscalation, canCurrentUserApprove: true, isWaitingForAnotherRole: false },
    });
    expect(screen.getByText(/Escalated to you on/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
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
