import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { KeyRound, Plus, RefreshCw } from 'lucide-react';
import { MasterTable } from '../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../components/masters/MasterSearch/MasterSearch';
import { MasterModal } from '../../components/masters/MasterModal/MasterModal';
import { MasterStatusBadge } from '../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { Can, usePermissions } from '../../../../Core/src/auth/permissions';
import { deactivateRole, getRoles } from '../../api/accessControlApi';
import { getErrorMessage } from '../../utils/errorHelper';
import '../masters/StatusRole/StatusRole.css';
import './AccessControl.css';

const COLUMNS = [
  {
    key: 'roleName',
    label: 'Role',
    render: (row) => (
      <span>
        {row.roleName}
        {row.isSystemRole && <span className="access-badge">System</span>}
        {row.isLocked && <span className="access-badge access-badge--locked">Locked</span>}
      </span>
    ),
  },
  {
    key: 'baseRoleName',
    label: 'Based on',
    render: (row) => (row.isSystemRole ? <span className="access-muted">—</span> : row.baseRoleName),
  },
  { key: 'staffCount', label: 'Staff' },
  { key: 'permissionCount', label: 'Permissions' },
  { key: 'isActive', label: 'Status', render: (row) => <MasterStatusBadge status={row.isActive} /> },
];

export function RolesPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [isDeletingBusy, setIsDeletingBusy] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      setRoles(await getRoles());
    } catch (error) {
      console.error('Failed to load roles:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return roles;
    return roles.filter(
      (r) => r.roleName?.toLowerCase().includes(term) || r.baseRoleName?.toLowerCase().includes(term)
    );
  }, [roles, search]);

  const confirmDeactivate = async () => {
    if (!deleting) return;
    setIsDeletingBusy(true);
    try {
      await deactivateRole(deleting.roleId);
      toast.success(`${deleting.roleName} deactivated`);
      setDeleting(null);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not deactivate the role.'));
    } finally {
      setIsDeletingBusy(false);
    }
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <h1 className="masters-page-title">Roles and permissions</h1>
        <p className="masters-page-description">
          System roles match today&apos;s access. New roles are based on a system role and can only have
          fewer permissions than it.
        </p>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch value={search} onChange={setSearch} placeholder="Search roles..." />
        </div>
        <div className="masters-page-actions-area">
          <button type="button" className="masters-btn-secondary" onClick={load} disabled={isLoading} title="Refresh">
            <RefreshCw size={18} className={isLoading ? 'master-spin' : ''} />
          </button>
          <Can permission="ROLES.EDIT">
            <button type="button" className="masters-btn-primary" onClick={() => navigate('/roles/new')}>
              <Plus size={18} />
              <span>New role</span>
            </button>
          </Can>
        </div>
      </div>

      <div className="masters-page-content">
        <MasterTable
          columns={COLUMNS}
          data={filtered.map((r) => ({ ...r, id: r.roleId }))}
          isLoading={isLoading}
          isError={isError}
          onEdit={(row) => navigate(`/roles/${row.roleId}`)}
          onDelete={can('ROLES.EDIT') ? (row) => setDeleting(row) : undefined}
          canDelete={(row) => !row.isSystemRole && row.isActive}
        />
      </div>

      <MasterModal
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Deactivate role"
        icon={<KeyRound size={20} />}
      >
        <p>
          Deactivate <strong>{deleting?.roleName}</strong>? Staff must be moved to another role first; the role can&apos;t
          be assigned afterwards.
        </p>
        <div className="form-actions">
          <button type="button" className="masters-btn-secondary" onClick={() => setDeleting(null)} disabled={isDeletingBusy}>
            Cancel
          </button>
          <button type="button" className="masters-btn-danger" onClick={confirmDeactivate} disabled={isDeletingBusy}>
            {isDeletingBusy ? 'Deactivating...' : 'Deactivate'}
          </button>
        </div>
      </MasterModal>
    </div>
  );
}
