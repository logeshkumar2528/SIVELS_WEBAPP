import { describe, expect, it } from 'vitest';
import {
  alwaysGrantedCodes,
  buildGrid,
  diffPermissions,
  rolesForStaff,
  setModule,
  togglePermission,
} from './permissionGrid';

const catalog = [
  {
    code: 'APPLICATIONS',
    name: 'Applications',
    permissions: [
      { code: 'APPLICATIONS.VIEW', level: 'VIEW' },
      { code: 'APPLICATIONS.EDIT', level: 'EDIT' },
    ],
  },
  {
    code: 'CREDIT',
    name: 'Credit review',
    permissions: [
      { code: 'CREDIT.VIEW', level: 'VIEW' },
      { code: 'CREDIT.EDIT', level: 'EDIT' },
      { code: 'CREDIT.APPROVE', level: 'APPROVE' },
    ],
  },
];
const rmAvailable = ['APPLICATIONS.VIEW', 'APPLICATIONS.EDIT'];

describe('permission grid', () => {
  it('builds a row per module with disabled cells outside the base role', () => {
    const grid = buildGrid(catalog, ['APPLICATIONS.VIEW'], rmAvailable);
    expect(grid[0].cells.map((c) => [c.level, c.checked, c.allowed])).toEqual([
      ['VIEW', true, true],
      ['EDIT', false, true],
      ['APPROVE', false, false],
    ]);
    expect(grid[0].cells[2].code).toBeNull();
    expect(grid[1].cells.every((c) => !c.allowed)).toBe(true);
  });

  it('turns View on with Edit and clears the module when View goes off', () => {
    const withEdit = togglePermission([], 'APPLICATIONS.EDIT', rmAvailable);
    expect(withEdit.sort()).toEqual(['APPLICATIONS.EDIT', 'APPLICATIONS.VIEW']);
    expect(togglePermission(withEdit, 'APPLICATIONS.VIEW', rmAvailable)).toEqual([]);
    expect(togglePermission(withEdit, 'APPLICATIONS.EDIT', rmAvailable)).toEqual(['APPLICATIONS.VIEW']);
  });

  it('ignores codes the base role does not allow', () => {
    expect(togglePermission(['APPLICATIONS.VIEW'], 'CREDIT.APPROVE', rmAvailable)).toEqual(['APPLICATIONS.VIEW']);
  });

  it('selects or clears a whole module', () => {
    expect(setModule([], 'APPLICATIONS', true, rmAvailable).sort()).toEqual([...rmAvailable].sort());
    expect(setModule(rmAvailable, 'APPLICATIONS', false, rmAvailable)).toEqual([]);
  });

  it('keeps always-granted codes ticked and locked', () => {
    const withMasters = [
      ...catalog,
      {
        code: 'MASTERS',
        name: 'Masters',
        permissions: [
          { code: 'MASTERS.VIEW', level: 'VIEW', alwaysGranted: true },
          { code: 'MASTERS.EDIT', level: 'EDIT', alwaysGranted: false },
        ],
      },
    ];
    const available = [...rmAvailable, 'MASTERS.VIEW', 'MASTERS.EDIT'];
    const locked = alwaysGrantedCodes(withMasters);
    expect(locked).toEqual(['MASTERS.VIEW']);

    const masters = buildGrid(withMasters, [], available)[2];
    expect(masters.cells.map((c) => [c.level, c.checked, c.locked])).toEqual([
      ['VIEW', true, true],
      ['EDIT', false, false],
      ['APPROVE', false, false],
    ]);

    const selected = ['MASTERS.VIEW', 'MASTERS.EDIT'];
    expect(togglePermission(selected, 'MASTERS.VIEW', available, locked)).toEqual(selected);
    expect(setModule(selected, 'MASTERS', false, available, locked)).toEqual(['MASTERS.VIEW']);
  });

  it('summarises added and removed codes', () => {
    expect(diffPermissions(['A.VIEW', 'B.VIEW'], ['B.VIEW', 'C.EDIT'])).toEqual({ added: ['C.EDIT'], removed: ['A.VIEW'] });
  });

  it('offers only active roles based on the staff type', () => {
    const roles = [
      { roleId: 3, baseRoleCode: 'RM', isActive: true },
      { roleId: 50, baseRoleCode: 'RM', isActive: true },
      { roleId: 51, baseRoleCode: 'RM', isActive: false },
      { roleId: 4, baseRoleCode: 'AGENT', isActive: true },
      { roleId: 1, baseRoleCode: 'MASTER_ADMIN', isActive: true },
    ];
    expect(rolesForStaff({ legacyType: 'RM' }, roles).map((r) => r.roleId)).toEqual([3, 50]);
    expect(rolesForStaff({ legacyType: null }, roles).map((r) => r.roleId)).toEqual([1]);
  });
});
