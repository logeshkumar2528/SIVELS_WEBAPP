import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { Navbar } from './Navbar';

function renderAs(user) {
  localStorage.setItem('sivels_currentUser', JSON.stringify(user));
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Navbar />
    </MemoryRouter>
  );
}

describe('Navbar', () => {
  beforeEach(() => localStorage.clear());

  it('shows the role screens to admins with ROLES.VIEW', () => {
    renderAs({ role: 'Master', roleCode: 'MASTER_ADMIN', permissions: ['ROLES.VIEW', 'ROLES.EDIT'] });
    expect(screen.getByText('Roles')).toBeTruthy();
    expect(screen.getByText('Staff Roles')).toBeTruthy();
  });

  it('hides them from roles without ROLES.VIEW', () => {
    renderAs({ role: 'Master', roleCode: 'MASTER_ADMIN', roleName: 'Auditor', permissions: ['APPLICATIONS.VIEW'] });
    expect(screen.queryByText('Roles')).toBeNull();
    expect(screen.queryByText('Staff Roles')).toBeNull();
    expect(screen.queryByText('Masters')).toBeNull();
    expect(screen.getByText('Application 360')).toBeTruthy();
  });

  it('lists Company Configuration under Masters for roles with MASTERS.VIEW', () => {
    renderAs({ role: 'Master', roleCode: 'MASTER_ADMIN', permissions: ['MASTERS.VIEW', 'MASTERS.EDIT'] });
    fireEvent.click(screen.getByText('Masters'));
    expect(screen.getByText('COMPANY CONFIGURATION')).toBeTruthy();
  });

  it('keeps every link for sessions issued before permissions existed', () => {
    renderAs({ role: 'Master', roleCode: 'MASTER_ADMIN' });
    expect(screen.getByText('Roles')).toBeTruthy();
    expect(screen.getByText('Masters')).toBeTruthy();
  });
});
