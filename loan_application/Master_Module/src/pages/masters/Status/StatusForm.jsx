import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createStatus, updateStatus, getStatusById } from '../../../api/masters/statusApi';
import { getStatusRoles } from '../../../api/masters/statusRoleApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './Status.css'; // Shared CSS

export function StatusForm({ isOpen, onClose, onSuccess, initialData }) {
  const [statusName, setStatusName] = useState('');
  const [statusCode, setStatusCode] = useState('');
  const [displayOrder, setDisplayOrder] = useState(''); // Will store statusRoleId
  const [isActive, setIsActive] = useState(true);
  
  const [statusRoles, setStatusRoles] = useState([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Fetch dependent data
        const rolesResponse = await getStatusRoles().catch(() => []);
        const allRoles = Array.isArray(rolesResponse) ? rolesResponse : (rolesResponse.data || []);

        if (isMounted) {
          setStatusRoles(allRoles);
        }
        
        if (initialData) {
          if (!initialData.statusId) {
            throw new Error('Missing statusId on selected record');
          }
          const response = await getStatusById(initialData.statusId);
          const record = response.data || response;
          if (isMounted) {
            setStatusName(record.statusName || '');
            setStatusCode(record.statusCode || '');
            setDisplayOrder(record.displayOrder != null ? record.displayOrder.toString() : '');
            setIsActive(record.isActive !== false);
          }
        } else {
          if (isMounted) {
            setStatusName('');
            setStatusCode('');
            setDisplayOrder('');
            setIsActive(true);
          }
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = getErrorMessage(err, 'Failed to load data.');
          toast.error(errorMessage);
          onClose();
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
      
      if (isMounted) setError(null);
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialData, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedName = statusName.trim();
    const trimmedCode = statusCode.trim();
    const orderNum = parseInt(displayOrder, 10);

    if (!trimmedName) {
      setError('Status Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Status Code is required');
      return;
    }
    if (!displayOrder || isNaN(orderNum)) {
      setError('Display Order is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          statusId: initialData.statusId,
          statusName: trimmedName,
          statusCode: trimmedCode,
          displayOrder: orderNum,
          modifiedBy: getCurrentUserId(),
          isActive
        };
        await updateStatus(initialData.statusId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          statusName: trimmedName,
          statusCode: trimmedCode,
          displayOrder: orderNum,
          createdBy: getCurrentUserId(),
          isActive
        };
        await createStatus(payload);
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
      title={isEdit ? 'Edit Status' : 'Add Status'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="statusName" className="form-label">
            Status Name <span className="text-danger">*</span>
          </label>
          <input
            id="statusName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={statusName}
            onChange={(e) => {
              setStatusName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. New"
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="statusCode" className="form-label">
            Status Code <span className="text-danger">*</span>
          </label>
          <input
            id="statusCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={statusCode}
            onChange={(e) => {
              setStatusCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. NEW"
            disabled={isSubmitting}
          />
          {error && error.includes('Code') && <span className="form-error-msg">{error}</span>}
        </div>
        
        <div className="form-group">
          <label htmlFor="displayOrder" className="form-label">
            Display Order <span className="text-danger">*</span>
          </label>
          <select
            id="displayOrder"
            className={`form-input ${error && error.includes('Display') ? 'form-input-error' : ''}`}
            value={displayOrder}
            onChange={(e) => {
              setDisplayOrder(e.target.value);
              if (error) setError(null);
            }}
            disabled={isSubmitting}
          >
            <option value="">Select Role</option>
            {statusRoles.map((role) => (
              <option key={role.statusRoleId} value={role.statusRoleId}>
                {role.roleName}
              </option>
            ))}
          </select>
          {error && error.includes('Display') && <span className="form-error-msg">{error}</span>}
          {statusRoles.length === 0 && !isLoading && (
            <span className="form-error-msg" style={{ color: 'var(--color-warning)' }}>
              No roles available
            </span>
          )}
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
