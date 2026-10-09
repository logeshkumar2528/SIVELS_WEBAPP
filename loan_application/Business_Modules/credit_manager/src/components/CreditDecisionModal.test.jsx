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
