import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createEmploymentType, updateEmploymentType, getEmploymentTypeById } from '../../../api/masters/employmentTypeApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './EmploymentType.css'; // Shared CSS

export function EmploymentTypeForm({ isOpen, onClose, onSuccess, initialData }) {
  const [employmentTypeName, setEmploymentTypeName] = useState('');
  const [employmentCode, setEmploymentCode] = useState('');
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
          if (!initialData.employmentTypeId) {
            throw new Error('Missing employmentTypeId on selected record');
          }
          // Fetch latest record before editing
          const response = await getEmploymentTypeById(initialData.employmentTypeId);
          const record = response.data || response;
          if (isMounted) {
            setEmploymentTypeName(record.employmentTypeName || '');
            setEmploymentCode(record.employmentCode || '');
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
        setEmploymentTypeName('');
        setEmploymentCode('');
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
    
    const trimmedName = employmentTypeName.trim();
    const trimmedCode = employmentCode.trim();

    if (!trimmedName) {
      setError('Employment Type Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Employment Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          employmentTypeId: initialData.employmentTypeId,
          employmentTypeName: trimmedName,
          employmentCode: trimmedCode,
          modifiedBy: getCurrentUserId(),
          isActive
        };
        await updateEmploymentType(initialData.employmentTypeId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          employmentTypeName: trimmedName,
          employmentCode: trimmedCode,
          createdBy: getCurrentUserId(),
          isActive
        };
        await createEmploymentType(payload);
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
      title={isEdit ? 'Edit Employment Type' : 'Add Employment Type'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="employmentTypeName" className="form-label">
            Employment Type Name <span className="text-danger">*</span>
          </label>
          <input
            id="employmentTypeName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={employmentTypeName}
            onChange={(e) => {
              setEmploymentTypeName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Full Time"
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="employmentCode" className="form-label">
            Employment Code <span className="text-danger">*</span>
          </label>
          <input
            id="employmentCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={employmentCode}
            onChange={(e) => {
              setEmploymentCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. FT"
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
