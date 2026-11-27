import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('../api/axiosInstance', () => ({
  default: { get: mocks.get },
}));

import { restoreSession } from './session';

describe('session restoration', () => {
  beforeEach(() => {
    localStorage.removeItem('sivels_currentUser');
    localStorage.removeItem('sivels_session_CREDIT_MANAGER');
    sessionStorage.removeItem('sivels_tabUser');
    sessionStorage.removeItem('sivels_tabRole');
    mocks.get.mockReset();
  });

  it('replaces stale Credit Manager display identity with authenticated /auth/me fields', async () => {
    sessionStorage.setItem('sivels_tabUser', JSON.stringify({
      role: 'CreditManager',
      roleCode: 'CREDIT_MANAGER',
      roleName: 'Credit Manager',
      staffId: 22,
      staffCode: 'STALE',
      creditManagerId: 4,
    }));
    mocks.get.mockResolvedValue({
      data: {
        staffId: 23,
        staffCode: 'CM00003',
        role: 'CreditManager',
        roleCode: 'CREDIT_MANAGER',
        roleName: 'ABH',
        roleId: 11,
        departmentCode: 'CREDIT',
        legacyId: 9,
        permissions: ['CREDIT.VIEW'],
      },
    });

    await restoreSession(['CREDIT_MANAGER']);

    expect(JSON.parse(sessionStorage.getItem('sivels_tabUser'))).toMatchObject({
      staffId: 23,
      staffCode: 'CM00003',
      creditManagerId: 9,
      roleName: 'ABH',
      roleId: 11,
      legacyId: 9,
      permissions: ['CREDIT.VIEW'],
    });
    expect(JSON.parse(localStorage.getItem('sivels_currentUser')).roleName).toBe('ABH');
  });
});
