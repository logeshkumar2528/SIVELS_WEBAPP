import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../components/masters/MasterModal/MasterModal';
import { changeStaffRole } from '../../api/accessControlApi';
import { getErrorMessage } from '../../utils/errorHelper';
import { rolesForStaff } from './permissionGrid';

/** Two steps: pick a role allowed for the person's staff type, then confirm the change. */
export function StaffRoleDialog({ staff, roles, onClose, onChanged, icon }) {
  const [roleId, setRoleId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setRoleId(staff ? String(staff.roleId) : '');
    setConfirming(false);
  }, [staff]);

  if (!staff) return null;

  const options = rolesForStaff(staff, roles);
  const target = options.find((r) => String(r.roleId) === roleId);
  const unchanged = !target || target.roleId === staff.roleId;

  const save = async () => {
    setIsSaving(true);
    try {
      onChanged(await changeStaffRole(staff.staffId, target.roleId));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not change the role.'));
      setConfirming(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MasterModal isOpen onClose={onClose} title="Change role" subtitle={staff.fullName} icon={icon}>
      {!confirming ? (
        <>
          <div className="form-group">
            <label htmlFor="staffRole" className="form-label">
              Role
            </label>
            <select
              id="staffRole"
              className="form-input"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              disabled={isSaving}
            >
              {options.map((r) => (
                <option key={r.roleId} value={r.roleId}>
                  {r.roleName}
                  {r.isSystemRole ? '' : ` (based on ${r.baseRoleName})`}
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="masters-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="masters-btn-primary" disabled={unchanged} onClick={() => setConfirming(true)}>
              Continue
            </button>
          </div>
        </>
      ) : (
        <>
          <p>Change {staff.fullName}&apos;s role?</p>
          <ul className="access-confirm-list">
            <li>
              From <strong>{staff.roleName}</strong> to <strong>{target.roleName}</strong>
            </li>
            <li>{target.permissionCount} permissions</li>
            <li>The new permissions apply straight away; they will be asked to sign in again so their menus match.</li>
          </ul>
          <div className="form-actions">
            <button type="button" className="masters-btn-secondary" onClick={() => setConfirming(false)} disabled={isSaving}>
              Back
            </button>
            <button type="button" className="masters-btn-primary" onClick={save} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Change role'}
            </button>
          </div>
        </>
      )}
    </MasterModal>
  );
}
