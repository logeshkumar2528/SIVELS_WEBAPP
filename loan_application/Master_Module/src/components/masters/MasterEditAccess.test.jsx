import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { MasterEditAccess } from './MasterEditAccess';
import { MasterTable } from './MasterTable/MasterTable';

const columns = [{ key: 'name', label: 'Name' }];
const data = [{ id: 1, name: 'Chennai' }];

function renderMasters(permissions) {
  localStorage.setItem('sivels_currentUser', JSON.stringify({ roleCode: 'MASTER_ADMIN', permissions }));
  return render(
    <MemoryRouter initialEntries={['/masters/city']}>
      <Routes>
        <Route path="masters" element={<MasterEditAccess />}>
          <Route path="city" element={<MasterTable columns={columns} data={data} onEdit={() => {}} onDelete={() => {}} />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('MasterEditAccess', () => {
  beforeEach(() => localStorage.clear());

  it('keeps edit and delete for roles with MASTERS.EDIT', () => {
    renderMasters(['MASTERS.VIEW', 'MASTERS.EDIT']);
    expect(screen.getByLabelText('Edit record')).toBeTruthy();
    expect(screen.getByLabelText('Delete record')).toBeTruthy();
  });

  it('makes master tables read-only without MASTERS.EDIT', () => {
    renderMasters(['MASTERS.VIEW']);
    expect(screen.getByText('Chennai')).toBeTruthy();
    expect(screen.queryByLabelText('Edit record')).toBeNull();
    expect(screen.queryByText('Actions')).toBeNull();
  });
});
