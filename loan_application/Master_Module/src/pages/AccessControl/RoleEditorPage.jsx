import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePermissions } from '../../../../Core/src/auth/permissions';
import {
  createRole,
  getDepartments,
  getPermissionCatalog,
  getRole,
  getRoles,
  resetRoleDefaults,
  updateRole,
} from '../../api/accessControlApi';
import { getErrorMessage } from '../../utils/errorHelper';
import {
  LEVELS,
  LEVEL_LABELS,
  alwaysGrantedCodes,
  buildGrid,
  diffPermissions,
  setModule,
  togglePermission,
} from './permissionGrid';
import {
  amountToText,
  formatApprovalRange,
  isCreditRole,
  parseAmount,
  validateApprovalLimits,
} from './approvalLimits';
import '../masters/StatusRole/StatusRole.css';
import './AccessControl.css';

export function RoleEditorPage() {
  const { roleId } = useParams();
  const isNew = !roleId;
  const navigate = useNavigate();
  const { can } = usePermissions();

  const [catalog, setCatalog] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [systemRoles, setSystemRoles] = useState([]);
  const [role, setRole] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [baseRoleId, setBaseRoleId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [departmentPicked, setDepartmentPicked] = useState(false);
  const [minimumAmount, setMinimumAmount] = useState('');
  const [maximumAmount, setMaximumAmount] = useState('');
  const [escalationRoleId, setEscalationRoleId] = useState('');
  const [available, setAvailable] = useState([]);
  const [selected, setSelected] = useState([]);
  const [saved, setSaved] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const [catalogData, rolesData, roleData, departmentData] = await Promise.all([
          getPermissionCatalog(),
          getRoles(),
          isNew ? Promise.resolve(null) : getRole(roleId),
          getDepartments(),
        ]);
        if (cancelled) return;
        setCatalog(catalogData);
        setAllRoles(rolesData);
        setSystemRoles(rolesData.filter((r) => r.isSystemRole && r.isActive));
        setDepartments(departmentData);
        if (roleData) {
          setRole(roleData.role);
          setRoleName(roleData.role.roleName);
          setDescription(roleData.role.description || '');
          setBaseRoleId(String(roleData.role.baseRoleId ?? ''));
          setDepartmentId(String(roleData.role.departmentId ?? ''));
          setMinimumAmount(amountToText(roleData.role.minimumApprovalAmount));
          setMaximumAmount(amountToText(roleData.role.maximumApprovalAmount));
          setEscalationRoleId(String(roleData.role.escalationRoleId ?? ''));
          setAvailable(roleData.availablePermissions);
          setSelected(roleData.permissions);
          setSaved(roleData.permissions);
        }
      } catch (err) {
        if (!cancelled) toast.error(getErrorMessage(err, 'Could not load the role.'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roleId, isNew]);

  const chooseBaseRole = async (value) => {
    setBaseRoleId(value);
    // A new role sits in its base role's department until the admin picks another one.
    if (isNew && !departmentPicked) {
      const base = systemRoles.find((r) => String(r.roleId) === value);
      setDepartmentId(base ? String(base.departmentId) : '');
    }
    if (!value) {
      setAvailable([]);
      setSelected([]);
      return;
    }
    try {
      const base = await getRole(value);
      setAvailable(base.availablePermissions);
      // A new role starts as a copy of the base role; untick what it shouldn't have.
      setSelected(isNew ? base.permissions.filter((c) => base.availablePermissions.includes(c)) : (prev) => prev.filter((c) => base.availablePermissions.includes(c)));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load the base role.'));
    }
  };

  const isLocked = Boolean(role?.isLocked);
  const isSystem = Boolean(role?.isSystemRole);
  const readOnly = isLocked || !can('ROLES.EDIT') || (role && !role.isActive);
  const baseLocked = !isNew && (isSystem || (role?.staffCount ?? 0) > 0);
  const grid = useMemo(() => buildGrid(catalog, selected, available), [catalog, selected, available]);
  const locked = useMemo(() => alwaysGrantedCodes(catalog), [catalog]);
  const changes = diffPermissions(saved, selected);
  const departmentOptions = useMemo(() => {
    if (!role?.departmentId || departments.some((d) => d.departmentId === role.departmentId)) return departments;
    return [...departments, { departmentId: role.departmentId, departmentName: `${role.departmentName} (inactive)` }];
  }, [departments, role]);

  const baseRole = allRoles.find((r) => String(r.roleId) === baseRoleId) || null;
  const baseRoleCode = isNew ? baseRole?.roleCode : role?.baseRoleCode;
  const showLimits = !isLocked && isCreditRole(baseRoleCode);
  const escalationOptions = useMemo(() => {
    const options = allRoles.filter(
      (r) => r.isActive && isCreditRole(r.baseRoleCode) && r.roleId !== role?.roleId
    );
    if (role?.escalationRoleId && !options.some((r) => r.roleId === role.escalationRoleId)) {
      options.push({ roleId: role.escalationRoleId, roleName: `${role.escalationRoleName || 'Role'} (inactive)` });
    }
    return options;
  }, [allRoles, role]);
  const minimumValue = parseAmount(minimumAmount);
  const maximumValue = parseAmount(maximumAmount);
  const escalationName = escalationOptions.find((r) => String(r.roleId) === escalationRoleId)?.roleName || null;
  const limitsEmpty = minimumValue === null && maximumValue === null && !escalationRoleId;
  const inheritsBase = !isSystem && Boolean(baseRole) && limitsEmpty;
  const rangePreview = Number.isNaN(minimumValue) || Number.isNaN(maximumValue)
    ? null
    : formatApprovalRange(minimumValue, maximumValue, escalationName);
  const baseRangeText = baseRole
    ? formatApprovalRange(baseRole.minimumApprovalAmount, baseRole.maximumApprovalAmount, baseRole.escalationRoleName)
    : null;

  const save = async () => {
    const name = roleName.trim();
    if (!name) {
      setError('Role name is required.');
      return;
    }
    if (isNew && !baseRoleId) {
      setError('Choose the system role this role is based on.');
      return;
    }
    if (!departmentId) {
      setError('Choose the department this role belongs to.');
      return;
    }
    const limitsError = showLimits ? validateApprovalLimits({ minimum: minimumValue, maximum: maximumValue }) : null;
    if (limitsError) {
      setError(limitsError);
      return;
    }
    setError(null);
    setIsSaving(true);
    const payload = {
      roleName: name,
      description: description.trim() || null,
      baseRoleId: baseRoleId ? Number(baseRoleId) : null,
      departmentId: Number(departmentId),
      permissions: selected,
      // Left out for other roles so the backend keeps their stored values.
      ...(showLimits
        ? {
            minimumApprovalAmount: minimumValue,
            maximumApprovalAmount: maximumValue,
            escalationRoleId: escalationRoleId ? Number(escalationRoleId) : null,
          }
        : {}),
    };
    try {
      if (isNew) {
        const created = await createRole(payload);
        toast.success(`${created.role.roleName} created`);
      } else {
        await updateRole(role.roleId, payload);
        toast.success(`${name} saved`);
      }
      navigate('/roles');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the role.'));
    } finally {
      setIsSaving(false);
    }
  };

  const reset = async () => {
    setIsSaving(true);
    try {
      const result = await resetRoleDefaults(role.roleId);
      setSelected(result.permissions);
      setSaved(result.permissions);
      toast.success('Default permissions restored');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not reset the role.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="masters-page">
        <p className="access-muted">Loading role...</p>
      </div>
    );
  }

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <h1 className="masters-page-title">
          {isNew ? 'New role' : role?.roleName}
          {isSystem && <span className="access-badge">System</span>}
          {isLocked && <span className="access-badge access-badge--locked">Locked</span>}
        </h1>
        <p className="masters-page-description">
          {isLocked
            ? 'The Master Admin role always has every permission.'
            : 'Ticked boxes are what this role can do. Greyed boxes are outside its base role and cannot be given. Viewing the dashboard and master data is always on, because every screen needs it.'}
        </p>
      </header>

      <div className="access-editor">
        <section className="access-card">
          <h2>Details</h2>
          <div className="access-fields">
            <div className="form-group">
              <label htmlFor="roleName" className="form-label">
                Role name <span className="text-danger">*</span>
              </label>
              <input
                id="roleName"
                className="form-input"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                disabled={readOnly || isSystem || isSaving}
                placeholder="e.g. RM Trainee"
                maxLength={100}
              />
            </div>
            <div className="form-group">
              <label htmlFor="baseRole" className="form-label">
                Based on <span className="text-danger">*</span>
              </label>
              {isSystem ? (
                <input id="baseRole" className="form-input" value="System role" disabled />
              ) : (
                <select
                  id="baseRole"
                  className="form-input access-select"
                  value={baseRoleId}
                  onChange={(e) => chooseBaseRole(e.target.value)}
                  disabled={readOnly || baseLocked || isSaving}
                >
                  <option value="">Choose a system role</option>
                  {systemRoles.map((r) => (
                    <option key={r.roleId} value={r.roleId}>
                      {r.roleName}
                    </option>
                  ))}
                </select>
              )}
              {baseLocked && !isSystem && (
                <span className="access-muted">Fixed while staff members have this role.</span>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="roleDepartment" className="form-label">
                Department <span className="text-danger">*</span>
              </label>
              {isSystem ? (
                <input id="roleDepartment" className="form-input" value={role?.departmentName || ''} disabled />
              ) : (
                <select
                  id="roleDepartment"
                  className="form-input access-select"
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    setDepartmentPicked(true);
                  }}
                  disabled={readOnly || isSaving}
                >
                  <option value="">Choose a department</option>
                  {departmentOptions.map((d) => (
                    <option key={d.departmentId} value={d.departmentId}>
                      {d.departmentName}
                    </option>
                  ))}
                </select>
              )}
              {isSystem && <span className="access-muted">System roles stay in their own department.</span>}
            </div>
            <div className="form-group">
              <label htmlFor="roleDescription" className="form-label">
                Description
              </label>
              <input
                id="roleDescription"
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={readOnly || isSaving}
                maxLength={300}
              />
            </div>
          </div>
          {error && <span className="form-error-msg">{error}</span>}
        </section>

        {showLimits && (
          <section className="access-card" aria-labelledby="approvalLimitsTitle">
            <h2 id="approvalLimitsTitle">Approval limits</h2>
            <p className="access-muted access-limits-intro">
              The loan amounts this role can approve. Approvals above the maximum go to the escalation role.
            </p>
            <div className="access-fields">
              <div className="form-group">
                <label htmlFor="minimumApprovalAmount" className="form-label">
                  Minimum approval amount (₹)
                </label>
                <input
                  id="minimumApprovalAmount"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  className="form-input"
                  value={minimumAmount}
                  onChange={(e) => setMinimumAmount(e.target.value)}
                  disabled={readOnly || isSaving}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label htmlFor="maximumApprovalAmount" className="form-label">
                  Maximum approval amount (₹)
                </label>
                <input
                  id="maximumApprovalAmount"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  className="form-input"
                  value={maximumAmount}
                  onChange={(e) => setMaximumAmount(e.target.value)}
                  disabled={readOnly || isSaving}
                  placeholder="No upper limit"
                />
              </div>
              <div className="form-group">
                <label htmlFor="escalationRole" className="form-label">
                  Escalation role
                </label>
                <select
                  id="escalationRole"
                  className="form-input access-select"
                  value={escalationRoleId}
                  onChange={(e) => setEscalationRoleId(e.target.value)}
                  disabled={readOnly || isSaving}
                >
                  <option value="">No escalation</option>
                  {escalationOptions.map((r) => (
                    <option key={r.roleId} value={r.roleId}>
                      {r.roleName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="access-limits-summary">
              {inheritsBase ? (
                <span className="access-muted">
                  Uses the {baseRole.roleName} range: {baseRangeText || 'no limit and no escalation'}. Fill in any field
                  to give this role its own range.
                </span>
              ) : (
                rangePreview && <span className="access-limits-preview">{rangePreview}</span>
              )}
              {!inheritsBase && maximumValue !== null && !Number.isNaN(maximumValue) && !escalationRoleId && (
                <span className="access-warning">
                  No escalation role: amounts above the maximum will be blocked.
                </span>
              )}
            </div>
          </section>
        )}

        <section className="access-card">
          <h2>Permissions</h2>
          {!isNew || baseRoleId ? (
            <table className="access-grid">
              <thead>
                <tr>
                  <th>Module</th>
                  {LEVELS.map((level) => (
                    <th key={level} className="access-grid-level">
                      {LEVEL_LABELS[level]}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {grid.map((row) => {
                  const rowAllowed = row.cells.some((c) => c.allowed);
                  return (
                    <tr key={row.code}>
                      <td>
                        <div className="access-grid-module-name">{row.name}</div>
                        <div className="access-muted">{row.description}</div>
                      </td>
                      {row.cells.map((cell) => (
                        <td key={cell.level} className="access-grid-level">
                          {cell.code ? (
                            <input
                              type="checkbox"
                              aria-label={`${LEVEL_LABELS[cell.level]} ${row.name}`}
                              checked={cell.checked}
                              disabled={readOnly || !cell.allowed || cell.locked || isSaving}
                              title={cell.locked ? 'Every role needs this' : undefined}
                              onChange={() => setSelected((prev) => togglePermission(prev, cell.code, available, locked))}
                            />
                          ) : (
                            <span className="access-grid-none">—</span>
                          )}
                        </td>
                      ))}
                      <td>
                        {!readOnly && rowAllowed && (
                          <>
                            <button
                              type="button"
                              className="access-link-btn"
                              onClick={() => setSelected((prev) => setModule(prev, row.code, true, available, locked))}
                            >
                              All
                            </button>
                            <button
                              type="button"
                              className="access-link-btn"
                              onClick={() => setSelected((prev) => setModule(prev, row.code, false, available, locked))}
                            >
                              None
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="access-muted">Choose the base role first.</p>
          )}
        </section>

        <div className="access-footer">
          <span className="access-muted">
            {selected.length} permission{selected.length === 1 ? '' : 's'}
            {!isNew && (changes.added.length > 0 || changes.removed.length > 0)
              ? ` · ${changes.added.length} added, ${changes.removed.length} removed (not saved yet)`
              : ''}
          </span>
          <div className="access-footer-actions">
            {isSystem && !isLocked && !readOnly && (
              <button type="button" className="masters-btn-secondary" onClick={reset} disabled={isSaving}>
                Reset to defaults
              </button>
            )}
            <button type="button" className="masters-btn-secondary" onClick={() => navigate('/roles')} disabled={isSaving}>
              {readOnly ? 'Back' : 'Cancel'}
            </button>
            {!readOnly && (
              <button type="button" className="masters-btn-primary" onClick={save} disabled={isSaving}>
                {isSaving ? 'Saving...' : isNew ? 'Create role' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
