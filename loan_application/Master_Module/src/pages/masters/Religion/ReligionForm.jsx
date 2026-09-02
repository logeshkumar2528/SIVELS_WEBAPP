import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createReligion, updateReligion, getReligionById } from '../../../api/masters/religionApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './Religion.css'; // Shared CSS

export function ReligionForm({ isOpen, onClose, onSuccess, initialData }) {
  const [religionName, setReligionName] = useState('');
  const [religionCode, setReligionCode] = useState('');
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
          if (!initialData.religionId) {
            throw new Error('Missing religionId on selected record');
          }
          // Fetch latest record before editing
          const response = await getReligionById(initialData.religionId);
          const record = response.value || response.data || response;
          if (isMounted) {
            setReligionName(record.religionName || '');
            setReligionCode(record.religionCode || '');
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
        setReligionName('');
        setReligionCode('');
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

    const trimmedName = religionName.trim();
    const trimmedCode = religionCode.trim();

    if (!trimmedName) {
      setError('Religion Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Religion Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          religionId: initialData.religionId,
          religionName: trimmedName,
          religionCode: trimmedCode,
          modifiedBy: getCurrentUserId(),
          isActive,
        };
        await updateReligion(initialData.religionId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          religionName: trimmedName,
          religionCode: trimmedCode,
          createdBy: getCurrentUserId(),
          isActive,
        };
        await createReligion(payload);
        toast.success('Created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Form submission failed:', err);

      if (err.response?.status === 409) {
        const backendMsg = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null);
        const errorText = backendMsg || 'Religion code or name already exists.';
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
      title={isEdit ? 'Edit Religion' : 'Add Religion'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="religionName" className="form-label">
            Religion Name <span className="text-danger">*</span>
          </label>
          <input
            id="religionName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={religionName}
            onChange={(e) => {
              setReligionName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Hindu"
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="religionCode" className="form-label">
            Religion Code <span className="text-danger">*</span>
          </label>
          <input
            id="religionCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={religionCode}
            onChange={(e) => {
              setReligionCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. HINDU"
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
