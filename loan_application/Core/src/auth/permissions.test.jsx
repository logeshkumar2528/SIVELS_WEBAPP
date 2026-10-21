import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FORBIDDEN_EVENT, notifyForbiddenResponse } from './authEvents';
import {
  Can,
  describePermission,
  filterNavItems,
  getPermissions,
  hasAnyPermission,
  hasPermission,
  storeRoleDetails,
  usePermissions,
} from './permissions';
import { buildLoginUser } from './session';

function setUser(user) {
  localStorage.setItem('sivels_currentUser', JSON.stringify(user));
}

describe('permissions', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('checks codes against the stored user', () => {
    setUser({ roleCode: 'RM', permissions: ['APPLICATIONS.VIEW', 'DOCUMENTS.EDIT'] });
    expect(hasPermission('APPLICATIONS.VIEW')).toBe(true);
    expect(hasPermission('applications.view')).toBe(true);
    expect(hasPermission('APPLICATIONS.EDIT')).toBe(false);
    expect(hasAnyPermission(['CREDIT.APPROVE', 'DOCUMENTS.EDIT'])).toBe(true);
    expect(hasAnyPermission(['CREDIT.APPROVE'])).toBe(false);
  });

  it('hides nothing for sessions without a permission list', () => {
    setUser({ roleCode: 'RM' });
    expect(getPermissions()).toBeNull();
    expect(hasPermission('CREDIT.APPROVE')).toBe(true);
  });

  it('filters menu items by their permission', () => {
    const items = [
      { id: 'dashboard' },
      { id: 'add-customer', permission: 'APPLICATIONS.EDIT' },
      { id: 'pending', permission: 'APPLICATIONS.VIEW' },
    ];
    setUser({ roleCode: 'RM', permissions: ['APPLICATIONS.VIEW'] });
    expect(filterNavItems(items).map((i) => i.id)).toEqual(['dashboard', 'pending']);
    setUser({ roleCode: 'RM' });
    expect(filterNavItems(items)).toHaveLength(3);
  });

  it('describes codes in plain words', () => {
    expect(describePermission('CREDIT.APPROVE')).toBe('approve credit review');
    expect(describePermission('APPLICATIONS.EDIT')).toBe('edit applications');
    expect(describePermission('ODD')).toBe('ODD');
  });

  it('keeps roleId, roleName and permissions from the login response', () => {
    const user = buildLoginUser(
      { roleCode: 'RM', roleId: 50, roleName: 'RM Trainee', permissions: ['APPLICATIONS.VIEW'], rm: { rmId: 1 } },
      '9000000001'
    );
    expect(user).toMatchObject({ roleCode: 'RM', roleId: 50, roleName: 'RM Trainee', permissions: ['APPLICATIONS.VIEW'] });
  });

  it('updates the stored user from a refresh response and notifies hooks', () => {
    setUser({ roleCode: 'RM', permissions: ['APPLICATIONS.VIEW'] });
    function Probe() {
      const { can, roleName } = usePermissions();
      return <span>{`${roleName}:${can('APPLICATIONS.EDIT')}`}</span>;
    }
    render(<Probe />);
    expect(screen.getByText('null:false')).toBeTruthy();

    act(() => {
      storeRoleDetails({ roleId: 3, roleName: 'Relationship Manager', permissions: ['APPLICATIONS.EDIT'] });
    });

    expect(screen.getByText('Relationship Manager:true')).toBeTruthy();
    expect(storeRoleDetails({ token: 'x' })).toBe(false);
  });

  it('renders Can children only with the permission', () => {
    setUser({ roleCode: 'BACK_OFFICE', permissions: ['VERIFICATION.VIEW'] });
    render(
      <>
        <Can permission="VERIFICATION.APPROVE" fallback={<span>hidden</span>}>
          <button type="button">Send</button>
        </Can>
        <Can anyOf={['CREDIT.VIEW', 'VERIFICATION.VIEW']}>
          <span>visible</span>
        </Can>
      </>
    );
    expect(screen.queryByText('Send')).toBeNull();
    expect(screen.getByText('hidden')).toBeTruthy();
    expect(screen.getByText('visible')).toBeTruthy();
  });

  it('names the missing permission on PERMISSION_DENIED', () => {
    const seen = [];
    const listener = (event) => seen.push(event.detail.message);
    window.addEventListener(FORBIDDEN_EVENT, listener);
    notifyForbiddenResponse({ code: 'PERMISSION_DENIED', permission: 'CREDIT.APPROVE' });
    notifyForbiddenResponse({ code: 'PERMISSION_DENIED', permission: 'CREDIT.APPROVE', message: 'Server says no.' });
    notifyForbiddenResponse(null);
    window.removeEventListener(FORBIDDEN_EVENT, listener);
    expect(seen).toEqual([
      "Your role can't approve credit review.",
      'Server says no.',
      "You don't have permission to perform this action.",
    ]);
  });
});
