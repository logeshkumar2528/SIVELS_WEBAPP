import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout/DashboardLayout';
import { Users, Save, X } from 'lucide-react';
import { roleService } from '../../services/roleService';
import { userRoleService } from '../../services/userRoleService';
import { userService } from '../../services/userService';

const UserGroupAssignments = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [username, setUsername] = useState('User');
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch user details for the name
        const userList = await userService.getUsers();
        const users = Array.isArray(userList) ? userList : (userList.users || []);
        const user = users.find(u => u.id === parseInt(id) || u.userId === parseInt(id));
        if (user) setUsername(user.firstName || user.username || 'User');

        // Fetch all roles (groups)
        const rolesData = await roleService.getRoles();
        const allRoles = Array.isArray(rolesData) ? rolesData : (rolesData.roles || []);

        // Fetch assigned roles for user
        const assignedData = await userRoleService.getUserRoles(id);
        const assignedRoles = Array.isArray(assignedData) ? assignedData : (assignedData.roles || []);
        
        const assignedIds = new Set(assignedRoles.map(r => {
          if (r && typeof r === 'object') {
            return String(r.id || r.roleId);
          }
          return String(r);
        }));

        let hasSelected = false;
        const mappedGroups = allRoles.map(r => {
          const isSelected = assignedIds.has(String(r.id || r.roleId));
          if (isSelected && !hasSelected) {
            hasSelected = true;
            return { ...r, selected: true };
          }
          return { ...r, selected: false };
        });

        setGroups(mappedGroups);
      } catch (err) {
        setError(err.message || 'Failed to fetch assignments');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSelectionChange = (groupId) => {
    setGroups(groups.map(g => ({
      ...g,
      selected: String(g.id || g.roleId) === String(groupId)
    })));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      // Keep original type (likely number) to avoid breaking backend expectations
      const selectedIds = groups.filter(g => g.selected).map(g => g.id || g.roleId);
      await userRoleService.updateUserRoles(id, selectedIds);



      navigate('/users');
    } catch (err) {
      setError(err.message || 'Failed to save assignments');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="User Groups" hideSidebar={true}>
      <div className="std-page">
        <div className="std-container">
          
          <div className="std-header">
            <div className="std-header-left">
              <Users size={20} />
              <div>
                <h2>User Group Assignments</h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', margin: 0, marginTop: '2px' }}>Manage memberships for user: {username}</p>
              </div>
            </div>
            
            <div className="std-header-actions">
              <button type="button" className="std-btn std-btn-header-secondary" onClick={() => navigate('/users')} disabled={loading}>
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
            <div style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto', borderBottomLeftRadius: 'var(--radius-xl)', borderBottomRightRadius: 'var(--radius-xl)' }} className="std-table-wrapper">
                <table className="std-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>SELECT</th>
                      <th>GROUP NAME</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && groups.length === 0 ? (
                      <tr>
                        <td colSpan="2" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          Loading groups...
                        </td>
                      </tr>
                    ) : groups.length === 0 ? (
                      <tr>
                        <td colSpan="2" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No groups available.
                        </td>
                      </tr>
                    ) : (
                      groups.map((group) => (
                        <tr key={group.id || group.roleId}>
                          <td>
                            <input 
                              type="checkbox" 
                              name="userGroup"
                              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#335b7a' }}
                              checked={group.selected} 
                              onChange={() => handleSelectionChange(group.id || group.roleId)} 
                            />
                          </td>
                          <td>{group.name || group.roleName}</td>
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

export default UserGroupAssignments;
