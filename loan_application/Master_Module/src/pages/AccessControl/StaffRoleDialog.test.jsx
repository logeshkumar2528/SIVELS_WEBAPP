import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../api/accessControlApi', () => ({
  changeStaffRole: vi.fn(async (staffId, roleId) => ({ staffId, roleId, fullName: 'Test RM', roleName: 'RM Trainee' })),
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import { changeStaffRole } from '../../api/accessControlApi';
import { StaffRoleDialog } from './StaffRoleDialog';

const roles = [
  { roleId: 3, roleName: 'Relationship Manager', baseRoleCode: 'RM', baseRoleName: 'Relationship Manager', isSystemRole: true, isActive: true, permissionCount: 13 },
  { roleId: 50, roleName: 'RM Trainee', baseRoleCode: 'RM', baseRoleName: 'Relationship Manager', isSystemRole: false, isActive: true, permissionCount: 2 },
  { roleId: 4, roleName: 'Agent', baseRoleCode: 'AGENT', baseRoleName: 'Agent', isSystemRole: true, isActive: true, permissionCount: 12 },
];
const staff = { staffId: 900, fullName: 'Test RM', legacyType: 'RM', roleId: 3, roleName: 'Relationship Manager' };

describe('StaffRoleDialog', () => {
  it('offers matching roles and confirms before changing', async () => {
    const onChanged = vi.fn();
    render(<StaffRoleDialog staff={staff} roles={roles} onClose={() => {}} onChanged={onChanged} />);

    const select = screen.getByLabelText('Role');
    expect([...select.options].map((o) => o.value)).toEqual(['3', '50']);
    expect(screen.getByText('Continue').disabled).toBe(true);

    fireEvent.change(select, { target: { value: '50' } });
    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('RM Trainee')).toBeTruthy();
    expect(changeStaffRole).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Change role', { selector: 'button' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(changeStaffRole).toHaveBeenCalledWith(900, 50);
  });

  it('renders nothing without a staff member', () => {
    const { container } = render(<StaffRoleDialog staff={null} roles={roles} onClose={() => {}} onChanged={() => {}} />);
    expect(container.innerHTML).toBe('');
  });
});
