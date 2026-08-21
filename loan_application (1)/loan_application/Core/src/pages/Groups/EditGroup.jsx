import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout/DashboardLayout';
import { Save, Users, X } from 'lucide-react';
import '../../styles/StandardUI.css';
import { roleService } from '../../services/roleService';

const EditGroup = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');



  useEffect(() => {
    const loadGroup = async () => {
      try {
        setLoading(true);
        const data = await roleService.getRoles();
        const roles = Array.isArray(data) ? data : (data.roles || []);
        const group = roles.find(g => g.id === parseInt(id) || g.roleId === parseInt(id) || g.id === id); // Handle string or int, id or roleId
        if (group) setGroupName(group.name || group.roleName);
      } catch {
        setError('Failed to load group details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadGroup();
    }
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = { name: groupName, roleName: groupName }; 
      if (id) {
        await roleService.updateRole(id, payload);
      } else {
        await roleService.createRole(payload);
      }
      navigate('/groups');
    } catch (err) {
      setError(err.message || 'Failed to save group.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title={id ? "Edit Group" : "Create Group"} hideSidebar={true}>
      <div className="std-page">
        <div className="std-container">
          
          <div className="std-header">
            <div className="std-header-left">
              <Users size={20} />
              <h2>{id ? "Edit Group" : "Create Group"}</h2>
            </div>
            
            <div className="std-header-actions">
              <button type="button" className="std-btn std-btn-header-secondary" onClick={() => navigate('/groups')} disabled={loading}>
                <X size={16} />
                Cancel
              </button>
              <button type="submit" form="groupForm" className="std-btn std-btn-header-action" disabled={loading}>
                <Save size={16} />
                {loading ? 'Saving...' : (id ? 'Save Changes' : 'Save')}
              </button>
            </div>
          </div>
          
          <div className="std-content">
            {error && (
              <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '4px', marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            <form id="groupForm" onSubmit={handleSave}>
                <div className="std-form-group">
                  <label htmlFor="groupName" className="std-form-label">Group Name</label>
                  <input 
                    type="text" 
                    id="groupName" 
                    className="std-form-input" 
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                    placeholder="Enter group name"
                    disabled={loading}
                    required
                    maxLength={50}
                    pattern="^[a-zA-Z\s]+$"
                    title="Only letters and spaces are allowed"
                  />
                </div>
                
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EditGroup;
