import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createInterestType, updateInterestType, getInterestTypeById } from '../../../api/masters/interestTypeApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './InterestTypeForm.css';

export function InterestTypeForm({ isOpen, onClose, onSuccess, initialData }) {
  const [interestTypeName, setInterestTypeName] = useState('');
  const [interestTypeCode, setInterestTypeCode] = useState('');
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
          if (!initialData.interestTypeId) {
            throw new Error('Missing interestTypeId on selected record');
          }
          // Fetch latest record before editing
          const response = await getInterestTypeById(initialData.interestTypeId);
          const record = response.data || response;
          if (isMounted) {
            setInterestTypeName(record.interestTypeName || '');
            setInterestTypeCode(record.interestTypeCode || '');
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
        setInterestTypeName('');
        setInterestTypeCode('');
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
    
    const trimmedName = interestTypeName.trim();
    const trimmedCode = interestTypeCode.trim();

    if (!trimmedName) {
      setError('Interest Type Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Interest Type Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          interestTypeId: initialData.interestTypeId, // Must match URL ID
          interestTypeName: trimmedName,
          interestTypeCode: trimmedCode,
          modifiedBy: getCurrentUserId(),
          isActive
        };
        await updateInterestType(initialData.interestTypeId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          interestTypeName: trimmedName,
          interestTypeCode: trimmedCode,
          createdBy: getCurrentUserId(),
          isActive
        };
        await createInterestType(payload);
        toast.success('Created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Form submission failed:', err);
      
      if (err.response?.status === 400 && err.response?.data?.ModelState) {
        // Special case for .NET ModelState validation errors
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
      title={isEdit ? 'Edit Interest Type' : 'Add Interest Type'}
    >
      <form onSubmit={handleSubmit} className="interest-type-form">
        <div className="form-group">
          <label htmlFor="interestTypeName" className="form-label">
            Interest Type Name <span className="text-danger">*</span>
          </label>
          <input
            id="interestTypeName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={interestTypeName}
            onChange={(e) => {
              setInterestTypeName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Fixed Rate"
            disabled={isSubmitting}
          />
          {error && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="interestTypeCode" className="form-label">
            Interest Type Code <span className="text-danger">*</span>
          </label>
          <input
            id="interestTypeCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={interestTypeCode}
            onChange={(e) => {
              setInterestTypeCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. FI"
            disabled={isSubmitting}
          />
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
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </MasterModal>
  );
}
