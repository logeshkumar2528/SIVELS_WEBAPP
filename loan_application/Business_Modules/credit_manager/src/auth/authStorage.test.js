import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TAB_ROLE_KEY, TAB_USER_KEY } from '../../../../Core/src/auth/tokenStore';
import {
  CREDIT_MANAGER_AUTH_KEY,
  CREDIT_MANAGER_DATA_KEY,
  CREDIT_MANAGER_ID_KEY,
  getCreditManagerAuth,
  getCreditManagerSessionKey,
  setCreditManagerAuth,
} from './authStorage';

const localKeys = [CREDIT_MANAGER_AUTH_KEY, CREDIT_MANAGER_DATA_KEY, CREDIT_MANAGER_ID_KEY, 'sivels_currentUser'];

describe('Credit Manager auth storage', () => {
  beforeEach(() => {
    localKeys.forEach((key) => localStorage.removeItem(key));
    sessionStorage.removeItem(TAB_ROLE_KEY);
    sessionStorage.removeItem(TAB_USER_KEY);
  });

  afterEach(() => {
    localKeys.forEach((key) => localStorage.removeItem(key));
    sessionStorage.removeItem(TAB_ROLE_KEY);
    sessionStorage.removeItem(TAB_USER_KEY);
  });

  it('prefers the current tab identity over stale global Credit Manager data', () => {
    localStorage.setItem(CREDIT_MANAGER_DATA_KEY, JSON.stringify({
      creditManagerId: 4,
      fullName: 'Stale User',
      role: 'CreditManager',
      roleCode: 'CREDIT_MANAGER',
      roleName: 'Credit Manager',
    }));
    sessionStorage.setItem(TAB_ROLE_KEY, 'CREDIT_MANAGER');
    sessionStorage.setItem(TAB_USER_KEY, JSON.stringify({
      creditManagerId: 9,
      staffId: 23,
      staffCode: 'CM00003',
      role: 'CreditManager',
      roleCode: 'CREDIT_MANAGER',
      roleId: 11,
      roleName: 'ABH',
      legacyId: 9,
      fullName: 'Current User',
    }));

    expect(getCreditManagerAuth()).toMatchObject({
      creditManagerId: 9,
      staffId: 23,
      staffCode: 'CM00003',
      roleName: 'ABH',
      fullName: 'Current User',
    });
    expect(getCreditManagerSessionKey()).toBe('23:9:CREDIT_MANAGER:11');
  });

  it('persists dynamic role fields without replacing backend role classification', () => {
    setCreditManagerAuth({
      creditManagerId: 9,
      staffId: 23,
      staffCode: 'CM00003',
      role: 'CreditManager',
      roleCode: 'CREDIT_MANAGER',
      roleId: 11,
      roleName: 'ABH',
      permissions: ['CREDIT.VIEW'],
    });

    expect(getCreditManagerAuth()).toMatchObject({
      role: 'CreditManager',
      roleCode: 'CREDIT_MANAGER',
      roleName: 'ABH',
      permissions: ['CREDIT.VIEW'],
    });
  });

  it('does not fall back to stale Credit Manager data for another tab role', () => {
    localStorage.setItem(CREDIT_MANAGER_AUTH_KEY, JSON.stringify({
      isAuthenticated: true,
      creditManagerId: 4,
      role: 'CreditManager',
      roleCode: 'CREDIT_MANAGER',
    }));
    localStorage.setItem('sivels_currentUser', JSON.stringify({ role: 'RM', roleCode: 'RM' }));
    sessionStorage.setItem(TAB_ROLE_KEY, 'RM');

    expect(getCreditManagerAuth()).toBeNull();
  });
});
