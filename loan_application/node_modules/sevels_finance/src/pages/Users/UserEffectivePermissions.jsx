import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout/DashboardLayout';
import { Star, Check, X } from 'lucide-react';
import { userRoleService } from '../../services/userRoleService';
import { userService } from '../../services/userService';
import { permissionService } from '../../services/permissionService';

const FIXED_COLUMNS = ['View', 'Create', 'Edit', 'Delete', 'Print'];

const UserEffectivePermissions = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [username, setUsername] = useState('User');
  const [groupedPermissions, setGroupedPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        // Fetch user details for the name
        const userList = await userService.getUsers();
        const users = Array.isArray(userList) ? userList : (userList.users || []);
        const user = users.find(u => u.id === parseInt(id) || u.userId === parseInt(id));
        if (user) setUsername(user.firstName || user.username || 'User');

        const [allPermsData, effectivePermsData] = await Promise.all([
          permissionService.getPermissions(),
          userRoleService.getUserEffectivePermissions(id)
        ]);
        
        const allPermissions = Array.isArray(allPermsData) ? allPermsData : (allPermsData.permissions || []);
        
        const assignedPerms = new Set();
        if (effectivePermsData && Array.isArray(effectivePermsData.menus)) {
          effectivePermsData.menus.forEach(menu => {
            if (Array.isArray(menu.permissions)) {
              menu.permissions.forEach(perm => {
                if (menu.menuName && perm.actionType) {
                  assignedPerms.add(`${menu.menuName}_${perm.actionType}`);
                }
              });
            }
          });
        }
        
        const grouped = {};
        allPermissions.forEach(p => {
          const mName = p.menuName;
          const aType = p.actionType;
          
          if (!mName || !aType) return;
          
          if (!grouped[mName]) {
            grouped[mName] = {};
          }
          
          grouped[mName][aType] = {
            isAssigned: assignedPerms.has(`${mName}_${aType}`)
          };
        });
        
        setGroupedPermissions(grouped);
      } catch (err) {
        setError(err.message || 'Failed to load effective permissions');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  return (
    <DashboardLayout title="Effective Permissions" hideSidebar={true}>
      <div className="std-page">
        <div className="std-container">
          
          <div className="std-header">
            <div className="std-header-left">
              <Star size={24} fill="currentColor" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h2>Effective Permissions for user: {username}</h2>
                <span style={{ fontSize: '0.8rem', color: '#e2e8f0', marginTop: '2px' }}>
                  Combined permissions from all assigned groups (READ ONLY)
                </span>
              </div>
            </div>
            <div className="std-header-actions">
              <button type="button" className="std-btn std-btn-header-secondary" onClick={() => navigate('/users')} disabled={loading}>
                Back to Users
              </button>
            </div>
          </div>
          
            {error && (
              <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#ef4444', borderBottom: '1px solid #f87171' }}>
                {error}
              </div>
            )}

            <div className="std-table-wrapper" style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto', borderBottomLeftRadius: 'var(--radius-xl)', borderBottomRightRadius: 'var(--radius-xl)' }}>
              <table className="std-table">
                <thead>
                  <tr>
                    <th>Module</th>
                    {FIXED_COLUMNS.map(col => (
                      <th key={col} style={{ textAlign: 'center' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
              <tbody>
                {loading && Object.keys(groupedPermissions).length === 0 ? (
                  <tr>
                    <td colSpan={FIXED_COLUMNS.length + 1} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Loading permissions...
                    </td>
                  </tr>
                ) : Object.keys(groupedPermissions).length === 0 ? (
                  <tr>
                    <td colSpan={FIXED_COLUMNS.length + 1} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No permissions available.
                    </td>
                  </tr>
                ) : (
                  Object.keys(groupedPermissions).map((menuName) => (
                    <tr key={menuName}>
                      <td>{menuName}</td>
                      {FIXED_COLUMNS.map(col => {
                        const perm = groupedPermissions[menuName][col];
                        return (
                          <td key={col} style={{ textAlign: 'center' }}>
                            {perm ? (
                              perm.isAssigned ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 12px', borderRadius: '12px', backgroundColor: '#e6f4ea', color: '#1e8e3e', fontSize: '0.75rem', fontWeight: '600', minWidth: '60px' }}>
                                  <Check size={14} style={{ marginRight: '4px' }} /> Yes
                                </div>
                              ) : (
                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 12px', borderRadius: '12px', backgroundColor: '#fef2f2', color: '#ef4444', fontSize: '0.75rem', fontWeight: '600', minWidth: '60px' }}>
                                  <X size={14} style={{ marginRight: '4px' }} /> No
                                </div>
                              )
                            ) : (
                              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 12px', borderRadius: '12px', backgroundColor: '#fef2f2', color: '#ef4444', fontSize: '0.75rem', fontWeight: '600', minWidth: '60px' }}>
                                <X size={14} style={{ marginRight: '4px' }} /> No
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserEffectivePermissions;
