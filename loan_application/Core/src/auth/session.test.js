import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { navigation, resetAuthEventsForTests } from './authEvents';
import { buildLoginUser, logout, normalizeRoleCode, persistRoleSession, resolveLandingPath } from './session';
import { getAccessToken, saveTokens } from './tokenStore';

const rmResponse = {
  message: 'Login successful',
  mobileNumber: '9876543210',
  role: 'RM',
  roleCode: 'RM',
  staffId: 41,
  landingPath: '/rm/dashboard',
  userId: 7,
  rm: { rmId: 12, fullName: 'Ravi', mobileNumber: '9876543210' },
  token: 't',
  refreshToken: 'r',
};

describe('session', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAuthEventsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('maps backend role names to role codes', () => {
    expect(normalizeRoleCode('MASTER_ADMIN')).toBe('MASTER_ADMIN');
    expect(normalizeRoleCode(undefined, 'MasterAdmin')).toBe('MASTER_ADMIN');
    expect(normalizeRoleCode(undefined, 'BackOffice')).toBe('BACK_OFFICE');
    expect(normalizeRoleCode(undefined, 'Customer')).toBe('CUSTOMER');
    expect(normalizeRoleCode('UNKNOWN', 'Other')).toBeNull();
  });

  it('falls back to the role map when landingPath is missing or not served', () => {
    expect(resolveLandingPath('AGENT', '/Agent/dashboard')).toBe('/Agent/dashboard');
    expect(resolveLandingPath('AGENT', undefined)).toBe('/Agent/dashboard');
    expect(resolveLandingPath('CREDIT_HEAD', '/credit-head/home')).toBe('/credit');
    expect(resolveLandingPath('RM', 'https://evil.example/rm')).toBe('/rm/dashboard');
  });

  it('writes the legacy RM keys plus roleCode and staffId', () => {
    const user = buildLoginUser(rmResponse, '9876543210');
    const destination = persistRoleSession(rmResponse, user);

    expect(destination).toBe('/rm/dashboard');
    expect(localStorage.getItem('rmId')).toBe('12');
    expect(JSON.parse(localStorage.getItem('rmData')).fullName).toBe('Ravi');
    const current = JSON.parse(localStorage.getItem('sivels_currentUser'));
    expect(current).toMatchObject({ role: 'RM', roleCode: 'RM', staffId: 41, userId: 7, rmId: 12 });
  });

  it('stores the Credit Manager session the credit module expects', () => {
    const response = {
      role: 'CreditManager',
      roleCode: 'CREDIT_MANAGER',
      staffId: 3,
      userId: 9,
      creditManager: { creditManagerId: 5, fullName: 'Kumar' },
    };
    const user = buildLoginUser(response, '9000000000');
    expect(persistRoleSession(response, user)).toBe('/credit');

    expect(localStorage.getItem('creditManagerId')).toBe('5');
    expect(JSON.parse(localStorage.getItem('creditManagerAuth'))).toMatchObject({
      isAuthenticated: true,
      creditManagerId: 5,
      userId: 9,
      role: 'CreditManager',
    });
    expect(JSON.parse(localStorage.getItem('sivels_currentUser'))).toMatchObject({
      role: 'CreditManager',
      roleCode: 'CREDIT_MANAGER',
      staffId: 3,
    });
  });

  it('sends customers to the customer dashboard', () => {
    const response = {
      role: 'Customer',
      customer: { agentCustomerId: 77, fullName: 'Anu' },
      token: 'c',
      refreshToken: null,
    };
    const user = buildLoginUser(response, '9111111111');
    expect(persistRoleSession(response, user)).toBe('/dashboard');
    expect(localStorage.getItem('customerId')).toBe('77');
    expect(user.roleCode).toBe('CUSTOMER');
  });

  it('logout revokes the refresh token, clears the session and goes to /login', async () => {
    saveTokens({ token: 'a', refreshToken: 'r' });
    localStorage.setItem('agentId', '4');
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const replaceSpy = vi.spyOn(navigation, 'replace').mockImplementation(() => {});

    await logout();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/logout$/);
    expect(JSON.parse(init.body)).toEqual({ refreshToken: 'r' });
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem('agentId')).toBeNull();
    expect(replaceSpy).toHaveBeenCalledWith('/login');
  });

  it('logout still completes when the API call fails', async () => {
    saveTokens({ token: 'a', refreshToken: 'r' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    const replaceSpy = vi.spyOn(navigation, 'replace').mockImplementation(() => {});

    await logout();

    expect(getAccessToken()).toBeNull();
    expect(replaceSpy).toHaveBeenCalledWith('/login');
  });
});
