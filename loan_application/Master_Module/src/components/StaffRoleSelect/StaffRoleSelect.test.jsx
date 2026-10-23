import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const permissionState = { canEditRoles: true };

vi.mock('../../../../Core/src/auth/permissions', () => ({
  usePermissions: () => ({ can: (code) => code === 'ROLES.EDIT' && permissionState.canEditRoles }),
}));
vi.mock('../../api/accessControlApi', () => ({
  getRoles: vi.fn(async () => [
    { roleId: 3, roleName: 'Relationship Manager', baseRoleCode: 'RM', isSystemRole: true, isActive: true, departmentName: 'Sales' },
    { roleId: 60, roleName: 'Jr. RM', baseRoleCode: 'RM', isSystemRole: false, isActive: true, departmentName: 'Sales' },
    { roleId: 61, roleName: 'RM Archive', baseRoleCode: 'RM', isSystemRole: false, isActive: false, departmentName: 'Sales' },
    { roleId: 70, roleName: 'Collections RM', baseRoleCode: 'RM', isSystemRole: false, isActive: true, departmentName: 'Operations' },
    { roleId: 4, roleName: 'Agent', baseRoleCode: 'AGENT', isSystemRole: true, isActive: true, departmentName: 'Sales' },
  ]),
  getStaffRoles: vi.fn(async () => [{ staffId: 900, roleId: 60 }]),
}));

import { getStaffRoles } from '../../api/accessControlApi';
import { StaffRoleSelect, toRoleId } from './StaffRoleSelect';

function Form({ legacyId, onPayload }) {
  const [roleId, setRoleId] = useState('');
  return (
    <>
      <StaffRoleSelect legacyType="RM" legacyId={legacyId} value={roleId} onChange={setRoleId} />
      <button type="button" onClick={() => onPayload({ roleId: toRoleId(roleId) })}>
        Save
      </button>
    </>
  );
}

describe('StaffRoleSelect', () => {
  beforeEach(() => {
    permissionState.canEditRoles = true;
    vi.clearAllMocks();
  });

  it('offers the standard role and active custom roles of the staff type', async () => {
    const onPayload = vi.fn();
    render(<Form onPayload={onPayload} />);

    const select = await screen.findByLabelText('Access role');
    expect([...select.options].map((o) => o.textContent)).toEqual([
      'Relationship Manager (standard)',
      'Jr. RM',
      'Collections RM',
    ]);
    expect(select.value).toBe('3');
    expect(getStaffRoles).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Save'));
    expect(onPayload).toHaveBeenLastCalledWith({ roleId: null });

    fireEvent.change(select, { target: { value: '70' } });
    expect(screen.getByText('Department: Operations')).toBeTruthy();
    fireEvent.click(screen.getByText('Save'));
    expect(onPayload).toHaveBeenLastCalledWith({ roleId: 70 });
  });

  it('loads the current role when editing', async () => {
    const onPayload = vi.fn();
    render(<Form legacyId="12" onPayload={onPayload} />);

    await waitFor(() => expect(screen.getByLabelText('Access role').value).toBe('60'));
    expect(getStaffRoles).toHaveBeenCalledWith({ legacyType: 'RM', legacyId: '12' });
    fireEvent.click(screen.getByText('Save'));
    expect(onPayload).toHaveBeenLastCalledWith({ roleId: 60 });
  });

  it('is hidden from admins who cannot edit roles', async () => {
    permissionState.canEditRoles = false;
    const onPayload = vi.fn();
    render(<Form onPayload={onPayload} />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByLabelText('Access role')).toBeNull();
    fireEvent.click(screen.getByText('Save'));
    expect(onPayload).toHaveBeenLastCalledWith({ roleId: null });
  });
});
