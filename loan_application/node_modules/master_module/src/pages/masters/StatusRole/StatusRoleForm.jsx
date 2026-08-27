import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createStatusRole, updateStatusRole, getStatusRoleById } from '../../../api/masters/statusRoleApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './StatusRole.css'; // Shared CSS

export function StatusRoleForm({ isOpen, onClose, onSuccess, initialData }) {
  const [roleName, setRoleName] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const loadData = async () => {
      if (initialData) {
        setIsLoading(true);
        try {
          if (!initialData.statusRoleId) {
            throw new Error('Missing statusRoleId on selected record');
          }
          // Fetch latest record before editing
          const response = await getStatusRoleById(initialData.statusRoleId);
          const record = response.data || response;
          if (isMounted) {
            setRoleName(record.roleName || '');
            setRoleCode(record.roleCode || '');
            setIsActive(record.isActive !== false);
          }
        } catch (err) {
          if (isMounted) {
            const errorMessage = getErrorMessage(err, 'Failed to load latest record data.');
            toast.error(errorMessage);
            onClose();
          }
        } finally {
          if (isMounted) setIsLoading(false);
        }
      } else {
        setRoleName('');
        setRoleCode('');
        setIsActive(true);
      }
      setError(null);
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialData, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedName = roleName.trim();
    const trimmedCode = roleCode.trim();

    if (!trimmedName) {
      setError('Role Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Role Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          statusRoleId: initialData.statusRoleId,
          roleName: trimmedName,
          roleCode: trimmedCode,
          modifiedBy: getCurrentUserId(),
          isActive
        };
        await updateStatusRole(initialData.statusRoleId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          roleName: trimmedName,
          roleCode: trimmedCode,
          createdBy: getCurrentUserId(),
          isActive
        };
        await createStatusRole(payload);
        toast.success('Created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Form submission failed:', err);
      
      if (err.response?.status === 400 && err.response?.data?.ModelState) {
        setError('Validation failed. Please check your input.');
      } else {
        const errorMessage = getErrorMessage(err, 'Request failed');
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <MasterModal isOpen={isOpen} onClose={onClose} title="Loading...">
        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading record...</div>
      </MasterModal>
    );
  }

  return (
    <MasterModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEdit ? 'Edit Status Role' : 'Add Status Role'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="roleName" className="form-label">
            Role Name <span className="text-danger">*</span>
          </label>
          <input
            id="roleName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={roleName}
            onChange={(e) => {
              setRoleName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Credit Manager"
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="roleCode" className="form-label">
            Role Code <span className="text-danger">*</span>
          </label>
          <input
            id="roleCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={roleCode}
            onChange={(e) => {
              setRoleCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. CM"
            disabled={isSubmitting}
          />
          {error && error.includes('Code') && <span className="form-error-msg">{error}</span>}
        </div>

        <MasterStatusCheckbox 
          isActive={isActive} 
          onChange={setIsActive} 
          disabled={isSubmitting} 
        />

        <div className="form-actions">
          <button 
            type="button" 
            className="masters-btn-secondary" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="masters-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (isEdit ? 'Updating...' : 'Saving...') : (isEdit ? 'Update' : 'Save')}
          </button>
        </div>
      </form>
    </MasterModal>
  );
}
