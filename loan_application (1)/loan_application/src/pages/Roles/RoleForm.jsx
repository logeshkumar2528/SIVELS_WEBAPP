import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout/DashboardLayout';
import { Save, X, Shield, ChevronDown } from 'lucide-react';
import '../../styles/StandardUI.css';
import { permissionService } from '../../services/permissionService';

const RoleForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    roleName: '',
    desc: '',
    menuName: '',
    controllerName: '',
    menuIndex: ''
  });



  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsActionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadPermission = async () => {
      try {
        setLoading(true);
        const data = await permissionService.getPermissions();
        const permissions = Array.isArray(data) ? data : (data.permissions || []);
        const roleToEdit = permissions.find(r => r.id === parseInt(id) || r.permissionId === parseInt(id) || r.id === id);
        if (roleToEdit) {
          setFormData({
            roleName: roleToEdit.name || '',
            desc: roleToEdit.description || '',
            menuName: roleToEdit.menuName || '',
            controllerName: roleToEdit.controllerName || '',
            menuIndex: roleToEdit.actionType || ''
          });
        } else {
          navigate('/roles');
        }
      } catch {
        setError('Failed to load role details.');
      } finally {
        setLoading(false);
      }
    };

    if (isEditMode) {
      loadPermission();
    }
  }, [isEditMode, id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = typeof value === 'string' ? value.replace(/[^a-zA-Z\s]/g, '') : value;
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);

      const payload = {
        name: formData.roleName,
        description: formData.desc,
        menuName: formData.menuName,
        controllerName: formData.controllerName,
        actionType: formData.menuIndex
      };

      if (isEditMode) {
        await permissionService.updatePermission(id, payload);
      } else {
        await permissionService.createPermission(payload);
      }
      navigate('/roles');
    } catch (err) {
      setError(err.message || 'Failed to save role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title={isEditMode ? "Edit Role" : "Create New Role"} hideSidebar={true}>
      <div className="std-page">
        <div className="std-container">
          <div className="std-header">
            <div className="std-header-left">
              <Shield size={20} />
              <h2>{isEditMode ? "Edit Application Role" : "Create Application Role"}</h2>
            </div>
            
            <div className="std-header-actions">
              <button className="std-btn std-btn-header-secondary" onClick={() => navigate('/roles')} disabled={loading}>
                <X size={16} />
                Cancel
              </button>
              <button type="submit" form="roleForm" className="std-btn std-btn-header-action" disabled={loading}>
                <Save size={16} />
                {loading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Save')}
              </button>
            </div>
          </div>
          
          <div className="std-content">
            {error && (
              <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '4px', marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            <form id="roleForm" onSubmit={handleSave}>
              <div className="std-form-grid" style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
                
                <div className="std-form-group">
                  <label className="std-form-label">Role Name *</label>
                  <input 
                    type="text" 
                    className="std-form-input" 
                    name="roleName"
                    value={formData.roleName}
                    onChange={handleChange}
                    placeholder="Enter role name"
                    required
                    maxLength={50}
                    pattern="^[a-zA-Z\s]+$"
                    title="Only letters and spaces are allowed"
                  />
                </div>

                <div className="std-form-group">
                  <label className="std-form-label">Description</label>
                  <input 
                    type="text" 
                    className="std-form-input" 
                    name="desc"
                    value={formData.desc}
                    onChange={handleChange}
                    placeholder="Enter description"
                  />
                </div>
                
                <div className="std-form-group">
                  <label className="std-form-label">Menu Name</label>
                  <input 
                    type="text" 
                    className="std-form-input" 
                    name="menuName"
                    value={formData.menuName}
                    onChange={handleChange}
                    placeholder="Enter menu name"
                  />
                </div>

                <div className="std-form-group">
                  <label className="std-form-label">Controller Name</label>
                  <input 
                    type="text" 
                    className="std-form-input" 
                    name="controllerName"
                    value={formData.controllerName}
                    onChange={handleChange}
                    placeholder="Enter controller name"
                  />
                </div>

                <div className="std-form-group" ref={dropdownRef}>
                  <label className="std-form-label">Menu Index</label>
                  <div 
                    className="std-form-input" 
                    style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white' }}
                    onClick={() => setIsActionOpen(!isActionOpen)}
                  >
                    <span style={{ color: formData.menuIndex ? 'inherit' : '#9CA3AF' }}>
                      {formData.menuIndex || 'Select Action'}
                    </span>
                    <ChevronDown size={16} style={{ color: '#9CA3AF', transform: isActionOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    
                    {isActionOpen && (
                      <div style={{ 
                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, 
                        backgroundColor: 'white', border: '1px solid #CBD5E1', borderRadius: '12px', 
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', zIndex: 50, overflow: 'hidden'
                      }}>
                      {['Create', 'Edit', 'View', 'Delete', 'Print'].map((action, index, arr) => (
                        <div 
                          key={action}
                          style={{ 
                            padding: '0.6rem 0.75rem', 
                            backgroundColor: formData.menuIndex === action ? '#F1F5F9' : 'transparent',
                            color: formData.menuIndex === action ? '#335b7a' : 'inherit',
                            fontWeight: formData.menuIndex === action ? '500' : 'normal',
                            borderBottom: index !== arr.length - 1 ? '1px solid #E2E8F0' : 'none',
                            cursor: 'pointer',
                            transition: 'background-color 0.1s'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChange({ target: { name: 'menuIndex', value: action } });
                            setIsActionOpen(false);
                          }}
                          onMouseEnter={(e) => {
                            if (formData.menuIndex !== action) {
                              e.currentTarget.style.backgroundColor = '#F8FAFC';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = formData.menuIndex === action ? '#F1F5F9' : 'transparent';
                          }}
                        >
                          {action}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RoleForm;
