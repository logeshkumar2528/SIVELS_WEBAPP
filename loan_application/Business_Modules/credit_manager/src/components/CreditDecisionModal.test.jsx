import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../api/creditManagerService', () => ({
  default: {
    creditApprove: vi.fn(),
    creditReject: vi.fn(),
    returnToBackOffice: vi.fn(),
    creditForward: vi.fn(),
    getApprovingAuthorities: vi.fn(),
  },
}));
vi.mock('../auth/authStorage', () => ({ getCreditManagerId: () => 21 }));

const { default: creditManagerService } = await import('../api/creditManagerService');
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

  it('blocks approval above the limit and asks to forward', () => {
    const onSubmitted = vi.fn();
    render(
      <CreditDecisionModal
        action={DECISION_ACTIONS.APPROVE}
        sanctionTerms={{ loading: false, amount: 900000, roi: 12, tenure: 36 }}
        approvalCheck={{ loading: false, amount: 900000, outcome: 'Escalate', maximumApprovalAmount: 750000 }}
        onClose={vi.fn()}
        onSubmitted={onSubmitted}
      />
    );
    expect(
      screen.getByText('₹9,00,000 exceeds your approval limit of ₹7,50,000. Forward it to an approving authority.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve Application' })).toBeDisabled();
    expect(onSubmitted).not.toHaveBeenCalled();
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

  it('lists the approving authorities and forwards to the selected role', async () => {
    creditManagerService.getApprovingAuthorities.mockResolvedValue([
      { roleId: 8, roleName: 'Credit Head', minimumApprovalAmount: 750001, maximumApprovalAmount: null },
      { roleId: 14, roleName: 'ABH', minimumApprovalAmount: 750001, maximumApprovalAmount: 2500000 },
    ]);
    const onSubmitted = vi.fn().mockResolvedValue(undefined);
    render(
      <CreditDecisionModal
        action={DECISION_ACTIONS.FORWARD}
        agentCustomerId="95"
        onClose={vi.fn()}
        onSubmitted={onSubmitted}
      />
    );
    expect(await screen.findByRole('option', { name: 'ABH (₹7,50,001 – ₹25,00,000)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Credit Head (₹7,50,001 – no upper limit)' })).toBeInTheDocument();
    expect(creditManagerService.getApprovingAuthorities).toHaveBeenCalledWith({ agentCustomerId: '95' });

    fireEvent.click(screen.getByRole('button', { name: 'Forward Application' }));
    expect(await screen.findByText('Select the approving authority to forward to.')).toBeInTheDocument();
    expect(screen.getByText('Forward Remarks is required.')).toBeInTheDocument();
    expect(onSubmitted).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '14' } });
    fireEvent.change(screen.getByPlaceholderText('Explain why you are forwarding this application.'), {
      target: { value: 'Above my limit.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Forward Application' }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
    const [action, payload] = onSubmitted.mock.calls[0];
    expect(action.key).toBe('FORWARD');
    expect(payload).toEqual({
      performedByUserId: 21,
      performedByRole: 'CreditManager',
      remarks: 'Above my limit.',
      toRoleId: 14,
    });
  });

  it('blocks forwarding when no approving authority is configured', async () => {
    creditManagerService.getApprovingAuthorities.mockResolvedValue([]);
    render(
      <CreditDecisionModal action={DECISION_ACTIONS.FORWARD} agentCustomerId="95" onClose={vi.fn()} onSubmitted={vi.fn()} />
    );
    expect(await screen.findByText(/No approving authority roles are configured/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Forward Application' })).toBeDisabled();
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
