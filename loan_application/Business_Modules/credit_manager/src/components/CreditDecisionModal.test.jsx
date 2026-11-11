import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../api/creditManagerService', () => ({
  default: { creditApprove: vi.fn(), creditReject: vi.fn(), returnToBackOffice: vi.fn() },
}));
vi.mock('../auth/authStorage', () => ({ getCreditManagerId: () => 21 }));

const { default: CreditDecisionModal, DECISION_ACTIONS } = await import('./CreditDecisionModal');

const legalFlag = {
  sectionCode: 'LEGAL_OPINION',
  sectionName: 'Legal Report',
  fieldKey: 'OTHER',
  fieldLabel: 'Legal Report',
  issue: 'Owner name mismatch.',
  stepId: 11,
};

describe('CreditDecisionModal', () => {
  it('requires a rejection reason', async () => {
    const onSubmitted = vi.fn();
    render(<CreditDecisionModal action={DECISION_ACTIONS.REJECT} onClose={vi.fn()} onSubmitted={onSubmitted} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reject Application' }));
    expect(await screen.findByText('Rejection Reason is required.')).toBeInTheDocument();
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('approves with the RTR proposed terms and a default remark', async () => {
    const onSubmitted = vi.fn().mockResolvedValue(undefined);
    render(
      <CreditDecisionModal
        action={DECISION_ACTIONS.APPROVE}
        sanctionTerms={{ loading: false, amount: 2500000, roi: 9.5, tenure: 240 }}
        onClose={vi.fn()}
        onSubmitted={onSubmitted}
      />
    );
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Approve Application' }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
    expect(onSubmitted.mock.calls[0][1]).toEqual({
      performedByUserId: 21,
      performedByRole: 'CreditManager',
      remarks: 'Approved as per RTR proposed loan terms.',
      sanctionedLoanAmount: 2500000,
      sanctionedROI: 9.5,
      sanctionedTenureMonths: 240,
      conditions: null,
    });
  });

  it('blocks approval when the RTR proposed terms are missing', () => {
    render(
      <CreditDecisionModal
        action={DECISION_ACTIONS.APPROVE}
        sanctionTerms={{ loading: false, amount: null, roi: null, tenure: null }}
        onClose={vi.fn()}
        onSubmitted={vi.fn()}
      />
    );
    expect(screen.getByText(/RTR proposed loan terms are not saved/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve Application' })).toBeDisabled();
  });

  it('says when approving will escalate and relabels the confirm button', async () => {
    const onSubmitted = vi.fn().mockResolvedValue(undefined);
    render(
      <CreditDecisionModal
        action={DECISION_ACTIONS.APPROVE}
        sanctionTerms={{ loading: false, amount: 900000, roi: 12, tenure: 36 }}
        approvalCheck={{
          loading: false,
          outcome: 'Escalate',
          message: '₹9,00,000 is above your approval limit of ₹7,50,000; approving it sends it to Credit Head.',
          escalationRoleName: 'Credit Head',
        }}
        onClose={vi.fn()}
        onSubmitted={onSubmitted}
      />
    );
    expect(screen.getByText(/approving it sends it to Credit Head/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send to Credit Head for Approval' }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
    expect(onSubmitted.mock.calls[0][1].sanctionedLoanAmount).toBe(900000);
  });

  it('blocks approval outside the approval range', () => {
    render(
      <CreditDecisionModal
        action={DECISION_ACTIONS.APPROVE}
        sanctionTerms={{ loading: false, amount: 50000, roi: 12, tenure: 36 }}
        approvalCheck={{
          loading: false,
          outcome: 'Blocked',
          message: '₹50,000 is below the Senior Credit Manager approval range, which starts at ₹1,00,000.',
        }}
        onClose={vi.fn()}
        onSubmitted={vi.fn()}
      />
    );
    expect(screen.getByText(/below the Senior Credit Manager approval range/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve Application' })).toBeDisabled();
  });

  it('waits for the approval-limit check before allowing approval', () => {
    render(
      <CreditDecisionModal
        action={DECISION_ACTIONS.APPROVE}
        sanctionTerms={{ loading: false, amount: 500000, roi: 12, tenure: 36 }}
        approvalCheck={{ loading: true }}
        onClose={vi.fn()}
        onSubmitted={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Checking approval limit…' })).toBeDisabled();
  });

  it('shows the backend message on a 409', async () => {
    const error = Object.assign(new Error('Conflict'), {
      response: { status: 409, data: { message: 'This approval (₹9,00,000) has been escalated and is waiting for Credit Head.' } },
    });
    render(
      <CreditDecisionModal
        action={DECISION_ACTIONS.APPROVE}
        sanctionTerms={{ loading: false, amount: 900000, roi: 12, tenure: 36 }}
        onClose={vi.fn()}
        onSubmitted={vi.fn().mockRejectedValue(error)}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Approve Application' }));
    expect(await screen.findByText(/has been escalated and is waiting for Credit Head/)).toBeInTheDocument();
  });

  it('requires at least one rejected section to return to the Back Office', async () => {
    const onSubmitted = vi.fn();
    render(<CreditDecisionModal action={DECISION_ACTIONS.RETURN} onClose={vi.fn()} onSubmitted={onSubmitted} />);
    fireEvent.click(screen.getByRole('button', { name: 'Return to Back Office' }));
    expect(await screen.findByText('Add at least one field the Back Office must correct.')).toBeInTheDocument();
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('sends the rejected Legal Report section with remarks, user and role', async () => {
    const onSubmitted = vi.fn().mockResolvedValue(undefined);
    render(
      <CreditDecisionModal
        action={DECISION_ACTIONS.RETURN}
        initialIssues={[legalFlag]}
        onClose={vi.fn()}
        onSubmitted={onSubmitted}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Return to Back Office' }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
    const [action, payload] = onSubmitted.mock.calls[0];
    expect(action.key).toBe('RETURN');
    expect(payload).toEqual({
      performedByUserId: 21,
      performedByRole: 'CreditManager',
      remarks: 'Legal Report › Legal Report: Owner name mismatch.',
      returnItems: [
        {
          sectionCode: 'LEGAL_OPINION',
          sectionName: 'Legal Report',
          fieldKey: 'OTHER',
          fieldLabel: 'Legal Report',
          issue: 'Owner name mismatch.',
        },
      ],
    });
  });
});
