import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RequireAuth from './RequireAuth';
import axiosInstance from '../api/axiosInstance';
import { navigation, resetAuthEventsForTests } from './authEvents';
import { resetRefreshStateForTests } from './refreshSession';
import { saveTokens } from './tokenStore';

const future = (ms) => new Date(Date.now() + ms).toISOString();

function signInAs(user) {
  saveTokens({ token: 'access-1', expiresAt: future(30 * 60_000), refreshToken: 'refresh-1' });
  localStorage.setItem('sivels_currentUser', JSON.stringify(user));
}

function meResponse(body) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('RequireAuth', () => {
  let replaceSpy;
  let fetchMock;

  beforeEach(() => {
    localStorage.clear();
    resetAuthEventsForTests();
    resetRefreshStateForTests();
    replaceSpy = vi.spyOn(navigation, 'replace').mockImplementation(() => {});
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('XMLHttpRequest', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends users without a session to /login', async () => {
    render(
      <RequireAuth allowedRoles={['RM']}>
        <p>RM dashboard</p>
      </RequireAuth>
    );

    expect(screen.queryByText('RM dashboard')).toBeNull();
    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith('/login'));
  });

  it('sends a user with another role to their own landing page', async () => {
    signInAs({ role: 'Agent', roleCode: 'AGENT', landingPath: '/Agent/dashboard' });
    // The guard now confirms the role with GET /auth/me before redirecting.
    vi.spyOn(axiosInstance, 'get').mockResolvedValue({ data: { roleCode: 'AGENT', role: 'Agent', staffId: 9 } });

    render(
      <RequireAuth allowedRoles={['RM']}>
        <p>RM dashboard</p>
      </RequireAuth>
    );

    expect(screen.queryByText('RM dashboard')).toBeNull();
    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith('/Agent/dashboard'));
  });

  it('renders the module for an allowed role', () => {
    signInAs({ role: 'RM', roleCode: 'RM' });
    fetchMock.mockResolvedValue(meResponse({ roleCode: 'RM', role: 'RM', staffId: 3 }));

    render(
      <RequireAuth allowedRoles={['RM']}>
        <p>RM dashboard</p>
      </RequireAuth>
    );

    expect(screen.getByText('RM dashboard')).toBeInTheDocument();
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('lets AMS into the Master module only on the AMS dashboard', async () => {
    signInAs({ role: 'AMS', roleCode: 'AMS', landingPath: '/master/ams-dashboard' });
    const isAllowed = (roleCode, pathname) =>
      roleCode === 'MASTER_ADMIN' || (roleCode === 'AMS' && /(^|\/)ams-dashboard\/?$/.test(pathname));

    const { rerender } = render(
      <RequireAuth isAllowed={isAllowed} pathname="/ams-dashboard">
        <p>AMS dashboard</p>
      </RequireAuth>
    );
    expect(screen.getByText('AMS dashboard')).toBeInTheDocument();

    rerender(
      <RequireAuth isAllowed={isAllowed} pathname="/masters/title">
        <p>AMS dashboard</p>
      </RequireAuth>
    );
    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith('/master/ams-dashboard'));
  });
});
