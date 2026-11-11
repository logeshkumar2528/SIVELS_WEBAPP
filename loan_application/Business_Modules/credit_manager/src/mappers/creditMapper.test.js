import { describe, expect, it } from 'vitest';
import { mapApprovalEscalation, mapApprovalLimit, mapCreditApplication } from './creditMapper';

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
