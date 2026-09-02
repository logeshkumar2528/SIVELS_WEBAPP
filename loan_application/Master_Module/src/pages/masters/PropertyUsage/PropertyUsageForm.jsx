import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createPropertyUsage, updatePropertyUsage, getPropertyUsageById } from '../../../api/masters/propertyUsageApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './PropertyUsage.css'; // Shared CSS

export function PropertyUsageForm({ isOpen, onClose, onSuccess, initialData }) {
  const [propertyUsageName, setPropertyUsageName] = useState('');
  const [propertyUsageCode, setPropertyUsageCode] = useState('');
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
          if (!initialData.propertyUsageId) {
            throw new Error('Missing propertyUsageId on selected record');
          }
          // Fetch latest record before editing
          const response = await getPropertyUsageById(initialData.propertyUsageId);
          const record = response.value || response.data || response;
          if (isMounted) {
            setPropertyUsageName(record.propertyUsageName || '');
            setPropertyUsageCode(record.propertyUsageCode || '');
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
        setPropertyUsageName('');
        setPropertyUsageCode('');
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

    const trimmedName = propertyUsageName.trim();
    const trimmedCode = propertyUsageCode.trim();

    if (!trimmedName) {
      setError('Property Usage Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Property Usage Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          propertyUsageId: initialData.propertyUsageId,
          propertyUsageName: trimmedName,
          propertyUsageCode: trimmedCode,
          modifiedBy: getCurrentUserId(),
          isActive,
        };
        await updatePropertyUsage(initialData.propertyUsageId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          propertyUsageName: trimmedName,
          propertyUsageCode: trimmedCode,
          createdBy: getCurrentUserId(),
          isActive,
        };
        await createPropertyUsage(payload);
        toast.success('Created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Form submission failed:', err);

      if (err.response?.status === 409) {
        const backendMsg = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null);
        const errorText = backendMsg || 'Property usage code or name already exists.';
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
      title={isEdit ? 'Edit Property Usage' : 'Add Property Usage'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="propertyUsageName" className="form-label">
            Property Usage Name <span className="text-danger">*</span>
          </label>
          <input
            id="propertyUsageName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={propertyUsageName}
            onChange={(e) => {
              setPropertyUsageName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Self Occupied"
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="propertyUsageCode" className="form-label">
            Property Usage Code <span className="text-danger">*</span>
          </label>
          <input
            id="propertyUsageCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={propertyUsageCode}
            onChange={(e) => {
              setPropertyUsageCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. SELF_OCCUPIED"
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
