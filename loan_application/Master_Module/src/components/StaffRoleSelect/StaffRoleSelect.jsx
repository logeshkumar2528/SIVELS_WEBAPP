import { useEffect, useMemo, useRef, useState } from 'react';
import { usePermissions } from '../../../../Core/src/auth/permissions';
import { getRoles, getStaffRoles } from '../../api/accessControlApi';
import { rolesForStaff } from '../../pages/AccessControl/permissionGrid';
import './StaffRoleSelect.css';

/** Turns the select value into the payload's roleId: null keeps the current role (standard role for new staff). */
export const toRoleId = (value) => (value ? Number(value) : null);

/**
 * Role for the staff login behind a master record. Only admins who can edit roles see it.
 * value '' means "not chosen": new staff get the standard role, existing staff keep theirs.
 * With legacyId (edit mode) the staff member's current role is loaded into value.
 */
export function StaffRoleSelect({
  legacyType,
  legacyId,
  value,
  onChange,
  disabled = false,
  id = 'staffRoleId',
  groupClassName = 'form-group',
  labelClassName = 'form-label',
  selectClassName = 'form-input',
}) {
  const { can } = usePermissions();
  const canAssign = can('ROLES.EDIT');
  const [roles, setRoles] = useState([]);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (!canAssign) return undefined;
    let cancelled = false;
    getRoles()
      .then((data) => {
        if (!cancelled) setRoles(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [canAssign]);

  useEffect(() => {
    if (!canAssign || !legacyId) return undefined;
    let cancelled = false;
    getStaffRoles({ legacyType, legacyId })
      .then((rows) => {
        if (!cancelled && rows?.[0]?.roleId) onChangeRef.current(String(rows[0].roleId));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [canAssign, legacyType, legacyId]);

  const options = useMemo(() => rolesForStaff({ legacyType }, roles), [legacyType, roles]);
  const standard = options.find((r) => r.isSystemRole);

  if (!canAssign || !standard) return null;

  const shown = value || String(standard.roleId);
  const selectedRole = options.find((r) => String(r.roleId) === shown);

  return (
    <div className={groupClassName}>
      <label htmlFor={id} className={labelClassName}>
        Access role
      </label>
      <select
        id={id}
        className={selectClassName}
        value={shown}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {options.map((r) => (
          <option key={r.roleId} value={r.roleId}>
            {r.isSystemRole ? `${r.roleName} (standard)` : r.roleName}
          </option>
        ))}
      </select>
      {selectedRole?.departmentName && (
        <span className="staff-role-select-hint">Department: {selectedRole.departmentName}</span>
      )}
    </div>
  );
}
