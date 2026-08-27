import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createGender, updateGender, getGenderById } from '../../../api/masters/genderApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './Gender.css'; // Shared CSS

export function GenderForm({ isOpen, onClose, onSuccess, initialData }) {
  const [genderName, setGenderName] = useState('');
  const [genderCode, setGenderCode] = useState('');
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
          if (!initialData.genderId) {
            throw new Error('Missing genderId on selected record');
          }
          // Fetch latest record before editing
          const response = await getGenderById(initialData.genderId);
          const record = response.value || response.data || response;
          if (isMounted) {
            setGenderName(record.genderName || '');
            setGenderCode(record.genderCode || '');
            const activeVal = record.isActive;
            setIsActive(activeVal === true || activeVal === 1 || activeVal === '1');
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
        setGenderName('');
        setGenderCode('');
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
    
    const trimmedName = genderName.trim();
    const trimmedCode = genderCode.trim();

    if (!trimmedName) {
      setError('Gender Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Gender Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          genderId: initialData.genderId,
          genderName: trimmedName,
          genderCode: trimmedCode,
          modifiedBy: getCurrentUserId(),
          isActive
        };
        await updateGender(initialData.genderId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          genderName: trimmedName,
          genderCode: trimmedCode,
          createdBy: getCurrentUserId(),
          isActive
        };
        await createGender(payload);
        toast.success('Created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Form submission failed:', err);
      
      if (err.response?.status === 409) {
        const backendMsg = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null);
        const errorText = backendMsg || 'Gender code or gender name already exists.';
        setError(errorText);
        toast.error(errorText);
      } else if (err.response?.status === 400 && err.response?.data?.ModelState) {
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
      title={isEdit ? 'Edit Gender' : 'Add Gender'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="genderName" className="form-label">
            Gender Name <span className="text-danger">*</span>
          </label>
          <input
            id="genderName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={genderName}
            onChange={(e) => {
              setGenderName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Male"
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="genderCode" className="form-label">
            Gender Code <span className="text-danger">*</span>
          </label>
          <input
            id="genderCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={genderCode}
            onChange={(e) => {
              setGenderCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. M"
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
