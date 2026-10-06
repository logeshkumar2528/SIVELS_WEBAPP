import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createMortgageStatus, updateMortgageStatus, getMortgageStatusById } from '../../../api/masters/mortgageStatusApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './MortgageStatus.css';

export function MortgageStatusForm({ isOpen, onClose, onSuccess, initialData }) {
  const [mortgageStatusCode, setMortgageStatusCode] = useState('');
  const [mortgageStatusName, setMortgageStatusName] = useState('');
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
          if (!initialData.mortgageStatusId) {
            throw new Error('Missing mortgageStatusId on selected record');
          }
          const response = await getMortgageStatusById(initialData.mortgageStatusId);
          const record = response?.value ?? response?.data ?? response;
          if (isMounted) {
            setMortgageStatusCode(record.mortgageStatusCode || '');
            setMortgageStatusName(record.mortgageStatusName || '');
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
        setMortgageStatusCode('');
        setMortgageStatusName('');
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

    const trimmedCode = mortgageStatusCode.trim();
    const trimmedName = mortgageStatusName.trim();

    if (!trimmedCode) {
      setError('Mortgage Status Code is required');
      return;
    }

    if (!trimmedName) {
      setError('Mortgage Status Name is required');
      return;
    }

    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      toast.error('Unable to identify the current user.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          mortgageStatusCode: trimmedCode,
          mortgageStatusName: trimmedName,
          isActive: Boolean(isActive),
          modifiedBy: currentUserId
        };
        await updateMortgageStatus(initialData.mortgageStatusId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          mortgageStatusCode: trimmedCode,
          mortgageStatusName: trimmedName,
          createdBy: currentUserId
        };
        await createMortgageStatus(payload);
        toast.success('Created successfully');
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Form submission failed:', err);

      if (err.response?.status === 409) {
        const backendMsg = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null);
        const errorText = backendMsg || 'Mortgage Status Code or Name already exists.';
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
      title={isEdit ? 'Edit Mortgage Status' : 'Add Mortgage Status'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="mortgageStatusCode" className="form-label">
            Mortgage Status Code <span className="text-danger">*</span>
          </label>
          <input
            id="mortgageStatusCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={mortgageStatusCode}
            onChange={(e) => {
              setMortgageStatusCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. MORTGAGED"
            disabled={isSubmitting}
          />
          {error && error.includes('Code') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="mortgageStatusName" className="form-label">
            Mortgage Status Name <span className="text-danger">*</span>
          </label>
          <input
            id="mortgageStatusName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={mortgageStatusName}
            onChange={(e) => {
              setMortgageStatusName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Mortgaged"
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        {isEdit && (
          <MasterStatusCheckbox
            isActive={isActive}
            onChange={setIsActive}
            disabled={isSubmitting}
          />
        )}

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
