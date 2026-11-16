import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const roles = [
  {
    roleId: 3, roleCode: 'RM', roleName: 'Relationship Manager', baseRoleCode: 'RM', baseRoleId: null,
    departmentId: 1, isSystemRole: true, isActive: true,
  },
  {
    roleId: 6, roleCode: 'CREDIT_HEAD', roleName: 'Credit Head', baseRoleCode: 'CREDIT_HEAD', baseRoleId: null,
    departmentId: 2, isSystemRole: true, isActive: true, minimumApprovalAmount: 0, maximumApprovalAmount: null,
  },
  {
    roleId: 7, roleCode: 'CREDIT_MANAGER', roleName: 'Credit Manager', baseRoleCode: 'CREDIT_MANAGER', baseRoleId: null,
    departmentId: 2, isSystemRole: true, isActive: true, minimumApprovalAmount: 0, maximumApprovalAmount: 750000,
    escalationRoleId: 6, escalationRoleName: 'Credit Head',
  },
  {
    roleId: 60, roleCode: 'CM_SENIOR', roleName: 'Senior Credit Manager', baseRoleCode: 'CREDIT_MANAGER', baseRoleId: 7,
    departmentId: 2, isSystemRole: false, isActive: true,
  },
  {
    roleId: 61, roleCode: 'CM_INACTIVE', roleName: 'Inactive Credit Manager', baseRoleCode: 'CREDIT_MANAGER', baseRoleId: 7,
    departmentId: 2, isSystemRole: false, isActive: false,
  },
  {
    roleId: 62, roleCode: 'MASTER_ADMIN', roleName: 'Master Admin', baseRoleCode: 'MASTER_ADMIN', baseRoleId: null,
    departmentId: 1, isSystemRole: true, isActive: true, isLocked: true,
  },
];

const roleDetail = (roleId) => {
  const role = roles.find((r) => r.roleId === Number(roleId));
  return { role, permissions: ['CREDIT.VIEW'], availablePermissions: ['CREDIT.VIEW', 'CREDIT.APPROVE'], defaultPermissions: [] };
};

vi.mock('../../api/accessControlApi', () => ({
  getPermissionCatalog: vi.fn(async () => []),
  getRoles: vi.fn(async () => roles),
  getRole: vi.fn(async (roleId) => roleDetail(roleId)),
  getDepartments: vi.fn(async () => [
    { departmentId: 1, departmentName: 'Sales' },
    { departmentId: 2, departmentName: 'Credit' },
  ]),
  createRole: vi.fn(async (data) => ({ role: { ...data, roleId: 99 } })),
  updateRole: vi.fn(async (roleId, data) => ({ role: { ...data, roleId } })),
  resetRoleDefaults: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const { createRole, updateRole } = await import('../../api/accessControlApi');
const { default: toast } = await import('react-hot-toast');
const { RoleEditorPage } = await import('./RoleEditorPage');

function renderEditor(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/roles/new" element={<RoleEditorPage />} />
        <Route path="/roles/:roleId" element={<RoleEditorPage />} />
        <Route path="/roles" element={<p>Roles list</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RoleEditorPage approval limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows the limits card for a credit role and saves the three fields', async () => {
    renderEditor('/roles/7');
    expect(await screen.findByText('Approval limits')).toBeInTheDocument();
    expect(screen.getByLabelText('Minimum approval amount (₹)')).toHaveValue(0);
    expect(screen.getByLabelText('Maximum approval amount (₹)')).toHaveValue(750000);

    const escalation = screen.getByLabelText('Escalation role');
    expect([...escalation.options].map((o) => o.value)).toEqual(['', '6', '60']);
    expect(escalation).toHaveValue('6');

    fireEvent.change(screen.getByLabelText('Maximum approval amount (₹)'), { target: { value: '900000' } });
    fireEvent.change(screen.getByLabelText('Minimum approval amount (₹)'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save' }));

    await waitFor(() => expect(updateRole).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Roles list')).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('Credit Manager saved');
    expect(updateRole.mock.calls[0][1]).toMatchObject({
      minimumApprovalAmount: null,
      maximumApprovalAmount: 900000,
      escalationRoleId: 6,
    });
  });

  it('blocks a minimum above the maximum', async () => {
    renderEditor('/roles/7');
    await screen.findByText('Approval limits');
    fireEvent.change(screen.getByLabelText('Minimum approval amount (₹)'), { target: { value: '800000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save' }));
    expect(await screen.findByText("The minimum approval amount can't be above the maximum.")).toBeInTheDocument();
    expect(updateRole).not.toHaveBeenCalled();
  });

  it('warns when amounts above the maximum have nowhere to escalate', async () => {
    renderEditor('/roles/7');
    await screen.findByText('Approval limits');
    fireEvent.change(screen.getByLabelText('Escalation role'), { target: { value: '' } });
    expect(screen.getByText(/amounts above the maximum will be blocked/)).toBeInTheDocument();
  });

  it('hides the card for non-credit roles and leaves the fields out of the payload', async () => {
    renderEditor('/roles/3');
    await screen.findByRole('button', { name: 'Save' });
    expect(screen.queryByText('Approval limits')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save' }));
    await waitFor(() => expect(updateRole).toHaveBeenCalledTimes(1));
    expect(updateRole.mock.calls[0][1]).not.toHaveProperty('maximumApprovalAmount');
  });

  it('opens confirmation and preserves unsaved changes when cancelled', async () => {
    renderEditor('/roles/60');
    const description = await screen.findByLabelText('Description');
    fireEvent.change(description, { target: { value: 'Updated description' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('heading', { name: 'Confirm Changes' })).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to save these changes?')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('heading', { name: 'Confirm Changes' })).not.toBeInTheDocument();
    expect(description).toHaveValue('Updated description');
    expect(updateRole).not.toHaveBeenCalled();
  });

  it('does not submit more than once when confirmation is clicked rapidly', async () => {
    renderEditor('/roles/60');
    await screen.findByRole('button', { name: 'Save' });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const confirmButton = screen.getByRole('button', { name: 'Yes, Save' });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    await waitFor(() => expect(updateRole).toHaveBeenCalledTimes(1));
  });

  it('preserves existing API error handling after confirmation', async () => {
    updateRole.mockRejectedValueOnce(new Error('Save failed'));
    renderEditor('/roles/60');
    await screen.findByRole('button', { name: 'Save' });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not save the role.'));
    expect(screen.queryByText('Roles list')).not.toBeInTheDocument();
  });

  it.each(['/roles/61', '/roles/62'])('keeps %s read-only', async (path) => {
    renderEditor(path);
    expect(await screen.findByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('keeps the editor read-only without the role edit permission', async () => {
    localStorage.setItem('sivels_currentUser', JSON.stringify({ permissions: ['ROLES.VIEW'] }));
    renderEditor('/roles/60');
    expect(await screen.findByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('shows the inherited base range for a new role based on Credit Manager', async () => {
    renderEditor('/roles/new');
    const baseRole = await screen.findByLabelText(/Based on/);
    fireEvent.change(baseRole, { target: { value: '7' } });
    expect(await screen.findByText('Approval limits')).toBeInTheDocument();
    expect(screen.getByText(/Uses the Credit Manager range: ₹0 – ₹7,50,000 → Credit Head/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Role name/), { target: { value: 'Junior Credit Manager' } });
    fireEvent.change(screen.getByLabelText('Maximum approval amount (₹)'), { target: { value: '300000' } });
    fireEvent.change(screen.getByLabelText('Escalation role'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create role' }));

    await waitFor(() => expect(createRole).toHaveBeenCalledTimes(1));
    expect(createRole.mock.calls[0][0]).toMatchObject({
      baseRoleId: 7,
      minimumApprovalAmount: null,
      maximumApprovalAmount: 300000,
      escalationRoleId: 7,
    });
  });
});
