import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout/DashboardLayout';
import { Shield, Save, X } from 'lucide-react';
import '../../styles/StandardUI.css';
import { roleService } from '../../services/roleService';
import { permissionService } from '../../services/permissionService';

const FIXED_COLUMNS = ['View', 'Create', 'Edit', 'Delete', 'Print'];

const GroupPermissions = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  

  // Structure: { [menuName]: { [actionType]: { id, isAssigned } } }
  const [groupedPermissions, setGroupedPermissions] = useState({});

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setLoading(true);
        setError('');
        
        const [allPermsData, assignedPermsData] = await Promise.all([
          permissionService.getPermissions(),
          roleService.getRolePermissions(id)
        ]);
        
        const allPermissions = Array.isArray(allPermsData) ? allPermsData : (allPermsData.permissions || []);
        const assignedIds = new Set(Array.isArray(assignedPermsData) ? assignedPermsData : []);
        
        const grouped = {};
        
        allPermissions.forEach(p => {
          const mName = p.menuName;
          const aType = p.actionType;
          
          if (!mName || !aType) return;
          
          if (!grouped[mName]) {
            grouped[mName] = {};
          }
          
          grouped[mName][aType] = {
            permissionId: p.permissionId || p.id,
            isAssigned: assignedIds.has(p.permissionId || p.id)
          };
        });
        
        setGroupedPermissions(grouped);
      } catch (err) {
        setError(err.message || 'Failed to fetch permissions');
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [id]);

  const handleCheckboxChange = (menuName, actionType) => {
    setGroupedPermissions(prev => {
      const updated = { ...prev };
      const current = updated[menuName][actionType];
      updated[menuName] = {
        ...updated[menuName],
        [actionType]: {
          ...current,
          isAssigned: !current.isAssigned
        }
      };
      return updated;
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const payload = [];
      
      Object.values(groupedPermissions).forEach(actions => {
        Object.values(actions).forEach(item => {
          if (item && item.isAssigned) {
            payload.push(item.permissionId);
          }
        });
      });
      
      await roleService.updateRolePermissions(id, payload);


      navigate('/roles');
    } catch (err) {
      setError(err.message || 'Failed to save permissions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Group Permissions" hideSidebar={true}>
      <div className="std-page">
        <div className="std-container">
          
          <div className="std-header">
            <div className="std-header-left">
              <Shield size={20} />
              <div>
                <h2>Manage Role Permissions</h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', margin: 0, marginTop: '2px' }}>Select Role Permissions</p>
              </div>
            </div>
            
            <div className="std-header-actions">
              <button type="button" className="std-btn std-btn-header-secondary" onClick={() => navigate('/roles')} disabled={loading}>
                <X size={16} />
                Cancel
              </button>
              <button type="button" className="std-btn std-btn-header-action" onClick={handleSave} disabled={loading}>
                <Save size={16} />
                {loading ? 'Saving...' : 'Save Changes'}
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
                        No permissions available to map.
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
                                <input 
                                  type="checkbox" 
                                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#335b7a' }}
                                  checked={perm.isAssigned} 
                                  onChange={() => handleCheckboxChange(menuName, col)} 
                                />
                              ) : (
                                <span style={{ color: '#d1d5db' }}>-</span>
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

export default GroupPermissions;
