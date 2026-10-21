import { beforeEach, describe, expect, it } from 'vitest';
import {
  SESSION_KEYS,
  clearSession,
  getAccessToken,
  getRefreshToken,
  hasSession,
  isAccessTokenExpiringSoon,
  saveTokens,
} from './tokenStore';

const staffResponse = {
  token: 'access-1',
  expiresAt: '2026-10-20T10:30:00Z',
  refreshToken: 'refresh-1',
  refreshTokenExpiresAt: '2026-10-27T10:00:00Z',
};

describe('tokenStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves all four token keys from a staff login response', () => {
    expect(saveTokens(staffResponse)).toBe(true);

    expect(localStorage.getItem('authToken')).toBe('access-1');
    expect(localStorage.getItem('authTokenExpiresAt')).toBe('2026-10-20T10:30:00Z');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-1');
    expect(localStorage.getItem('refreshTokenExpiresAt')).toBe('2026-10-27T10:00:00Z');
    expect(getAccessToken()).toBe('access-1');
    expect(getRefreshToken()).toBe('refresh-1');
  });

  it('ignores responses without a token', () => {
    expect(saveTokens({ success: false, message: 'Invalid OTP' })).toBe(false);
    expect(saveTokens(null)).toBe(false);
    expect(getAccessToken()).toBeNull();
  });

  it('drops a stale refresh token when the response has none (customer login)', () => {
    saveTokens(staffResponse);
    saveTokens({ token: 'customer-token', expiresAt: '2026-10-20T22:00:00Z', refreshToken: null });

    expect(getAccessToken()).toBe('customer-token');
    expect(getRefreshToken()).toBeNull();
    expect(localStorage.getItem('refreshTokenExpiresAt')).toBeNull();
  });

  it('stores the rotated pair after a refresh', () => {
    saveTokens(staffResponse);
    saveTokens({ ...staffResponse, token: 'access-2', refreshToken: 'refresh-2' });

    expect(getAccessToken()).toBe('access-2');
    expect(getRefreshToken()).toBe('refresh-2');
  });

  it('clearSession removes tokens and login keys but keeps drafts and other data', () => {
    saveTokens(staffResponse);
    SESSION_KEYS.forEach((key) => localStorage.setItem(key, 'x'));
    localStorage.setItem('sivels-rm-onboarding-drafts-v9', '{"draft":1}');
    localStorage.setItem('someOtherSetting', 'keep');

    clearSession();

    expect(hasSession()).toBe(false);
    ['authToken', 'authTokenExpiresAt', 'refreshToken', 'refreshTokenExpiresAt', ...SESSION_KEYS].forEach((key) => {
      expect(localStorage.getItem(key)).toBeNull();
    });
    expect(localStorage.getItem('sivels-rm-onboarding-drafts-v9')).toBe('{"draft":1}');
    expect(localStorage.getItem('someOtherSetting')).toBe('keep');
  });

  it('reports when the access token is about to expire', () => {
    const now = Date.parse('2026-10-20T10:00:00Z');
    saveTokens({ ...staffResponse, expiresAt: '2026-10-20T10:00:30Z' });
    expect(isAccessTokenExpiringSoon(60_000, now)).toBe(true);

    saveTokens({ ...staffResponse, expiresAt: '2026-10-20T10:10:00Z' });
    expect(isAccessTokenExpiringSoon(60_000, now)).toBe(false);
  });
});
