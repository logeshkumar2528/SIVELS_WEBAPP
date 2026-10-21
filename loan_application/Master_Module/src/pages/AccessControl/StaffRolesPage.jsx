import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, UserCog } from 'lucide-react';
import { MasterTable } from '../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../components/masters/MasterSearch/MasterSearch';
import { MasterStatusBadge } from '../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { usePermissions } from '../../../../Core/src/auth/permissions';
import { getRoles, getStaffRoles } from '../../api/accessControlApi';
import { StaffRoleDialog } from './StaffRoleDialog';
import '../masters/StatusRole/StatusRole.css';
import './AccessControl.css';

const TYPE_LABELS = {
  Agent: 'Agent',
  RM: 'Relationship Manager',
  AMS: 'AMS',
  BackOffice: 'Back Office',
  CreditManager: 'Credit Manager',
  CreditHead: 'Credit Head',
};

const COLUMNS = [
  {
    key: 'fullName',
    label: 'Staff',
    render: (row) => (
      <div>
        <div>{row.fullName}</div>
        <div className="access-muted">{[row.staffCode, row.mobileNumber].filter(Boolean).join(' · ')}</div>
      </div>
    ),
  },
  { key: 'legacyType', label: 'Type', render: (row) => TYPE_LABELS[row.legacyType] || 'Master Admin' },
  {
    key: 'roleName',
    label: 'Role',
    render: (row) => (
      <span>
        {row.roleName}
        {row.roleCode !== row.baseRoleCode && <span className="access-badge">Custom</span>}
      </span>
    ),
  },
  { key: 'isActive', label: 'Status', render: (row) => <MasterStatusBadge status={row.isActive} /> },
];

export function StaffRolesPage() {
  const { can } = usePermissions();
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [staffData, roleData] = await Promise.all([getStaffRoles({ roleId: roleFilter || undefined }), getRoles()]);
      setStaff(staffData);
      setRoles(roleData);
    } catch (error) {
      console.error('Failed to load staff roles:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return staff;
    return staff.filter((s) =>
      [s.fullName, s.staffCode, s.mobileNumber, s.roleName].some((v) => v?.toLowerCase().includes(term))
    );
  }, [staff, search]);

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <h1 className="masters-page-title">Staff roles</h1>
        <p className="masters-page-description">
          Each person can only get roles based on their staff type. A change applies at their next login.
        </p>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch value={search} onChange={setSearch} placeholder="Search by name, code, mobile or role..." />
        </div>
        <div className="masters-page-actions-area">
          <select
            className="form-input access-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r.roleId} value={r.roleId}>
                {r.roleName}
              </option>
            ))}
          </select>
          <button type="button" className="masters-btn-secondary" onClick={load} disabled={isLoading} title="Refresh">
            <RefreshCw size={18} className={isLoading ? 'master-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="masters-page-content">
        <MasterTable
          columns={COLUMNS}
          data={filtered.map((s) => ({ ...s, id: s.staffId }))}
          isLoading={isLoading}
          isError={isError}
          onEdit={can('ROLES.EDIT') ? (row) => setEditing(row) : undefined}
        />
      </div>

      <StaffRoleDialog
        staff={editing}
        roles={roles}
        onClose={() => setEditing(null)}
        onChanged={(updated) => {
          toast.success(`${updated.fullName} is now ${updated.roleName}`);
          setEditing(null);
          load();
        }}
        icon={<UserCog size={20} />}
      />
    </div>
  );
}
