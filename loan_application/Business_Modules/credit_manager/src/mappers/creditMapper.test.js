import { describe, expect, it } from 'vitest';
import {
  isCreditManagerApprovedWorkflow,
  isCreditManagerIncomingWorkflow,
  isCreditManagerReviewWorkflow,
  mapApprovalEscalation,
  mapApprovalLimit,
  mapCreditApplication,
  mapCreditManagerProfile,
} from './creditMapper';

const escalation = {
  escalationId: 11,
  fromRoleId: 7,
  fromRoleName: 'Credit Manager',
  toRoleId: 6,
  toRoleName: 'Credit Head',
  loanAmount: 900000,
  approvalLimit: 750000,
  escalatedAt: '2026-11-07T10:00:00',
  canCurrentUserApprove: false,
  isWaitingForAnotherRole: true,
};

describe('creditMapper approval limits', () => {
  it('maps requested and sanctioned amounts independently', () => {
    expect(
      mapCreditApplication({
        agentCustomerId: 10,
        fullName: 'Asha',
        expectedLoanAmount: '700000',
        sanctionedLoanAmount: '500000',
        status: 4,
      })
    ).toMatchObject({ expectedLoanAmount: 700000, sanctionedLoanAmount: 500000 });
    expect(
      mapCreditApplication({
        agentCustomerId: 11,
        fullName: 'Ravi',
        expectedLoanAmount: 100000,
        sanctionedLoanAmount: null,
        status: 3,
      })
    ).toMatchObject({ expectedLoanAmount: 100000, sanctionedLoanAmount: null });
  });

  it('preserves zero and rejects invalid sanctioned amounts without fallback', () => {
    expect(mapCreditApplication({ agentCustomerId: 12, sanctionedLoanAmount: 0, status: 4 }).sanctionedLoanAmount).toBe(0);
    expect(mapCreditApplication({ agentCustomerId: 13, expectedLoanAmount: 700000, sanctionedLoanAmount: 'invalid', status: 4 }).sanctionedLoanAmount).toBeNull();
  });

  it('keeps the pending escalation on queue rows', () => {
    const app = mapCreditApplication({ agentCustomerId: 5, fullName: 'Asha', status: 3, pendingEscalation: escalation });
    expect(app.pendingEscalation).toMatchObject({
      escalationId: 11,
      toRoleName: 'Credit Head',
      loanAmount: 900000,
      approvalLimit: 750000,
      isWaitingForAnotherRole: true,
      canCurrentUserApprove: false,
    });
    expect(mapCreditApplication({ agentCustomerId: 6, fullName: 'Ravi', status: 3 }).pendingEscalation).toBeNull();
  });

  it('maps the approval limit answer, with no maximum meaning no upper limit', () => {
    const limit = mapApprovalLimit({
      roleId: 6,
      roleName: 'Credit Head',
      canApprove: true,
      minimumApprovalAmount: 0,
      maximumApprovalAmount: null,
      amount: 900000,
      outcome: 'WithinLimit',
      pendingEscalation: { ...escalation, canCurrentUserApprove: true, isWaitingForAnotherRole: false },
    });
    expect(limit.maximumApprovalAmount).toBeNull();
    expect(limit.outcome).toBe('WithinLimit');
    expect(limit.pendingEscalation.canCurrentUserApprove).toBe(true);
  });

  it('maps escalation history rows', () => {
    expect(
      mapApprovalEscalation({
        escalationId: 11,
        fromRoleName: 'Credit Manager',
        fromStaffName: 'Meena',
        toRoleName: 'Credit Head',
        loanAmount: 900000,
        approvalLimit: 750000,
        escalationRemarks: 'Strong income',
        createdAt: '2026-11-07T10:00:00',
        isPending: true,
      })
    ).toMatchObject({ id: 11, fromStaffName: 'Meena', remarks: 'Strong income', isPending: true });
  });
});

describe('credit manager workflow classification', () => {
  it('keeps maker-stage applications approved and out of active review queues', () => {
    expect(isCreditManagerApprovedWorkflow('CREDIT_APPROVED_MAKER_PENDING')).toBe(true);
    expect(isCreditManagerApprovedWorkflow('MAKER_VERIFICATION_IN_PROGRESS')).toBe(true);
    expect(isCreditManagerIncomingWorkflow('CM_APPROVAL_PENDING')).toBe(true);
    expect(isCreditManagerReviewWorkflow('CM_REVIEW_IN_PROGRESS')).toBe(true);
    expect(isCreditManagerReviewWorkflow('MAKER_VERIFICATION_IN_PROGRESS')).toBe(false);
  });

  it('keeps the backend profile role name instead of forcing Credit Manager', () => {
    expect(mapCreditManagerProfile({ creditManagerId: 9, roleName: 'ABH' }).role).toBe('ABH');
  });
});
