import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createFrequency, updateFrequency, getFrequencyById } from '../../../api/masters/frequencyApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './Frequency.css';

const getId = (row) => row?.frequencyId ?? row?.FrequencyId ?? row?.id;

export function FrequencyForm({ isOpen, onClose, onSuccess, initialData }) {
  const [frequencyName, setFrequencyName] = useState('');
  const [frequencyCode, setFrequencyCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (!isOpen) return undefined;
    let isMounted = true;

    const loadData = async () => {
      if (initialData) {
        setIsLoading(true);
        try {
          const id = getId(initialData);
          if (!id) throw new Error('Missing frequencyId on selected record');
          const response = await getFrequencyById(id);
          const record = response?.data || response?.value || response;
          if (isMounted) {
            setFrequencyName(record.frequencyName || record.FrequencyName || '');
            setFrequencyCode(record.frequencyCode || record.FrequencyCode || '');
            setIsActive(record.isActive !== false && record.IsActive !== false);
          }
        } catch (err) {
          if (isMounted) {
            toast.error(getErrorMessage(err, 'Failed to load latest record data.'));
            onClose();
          }
        } finally {
          if (isMounted) setIsLoading(false);
        }
      } else {
        setFrequencyName('');
        setFrequencyCode('');
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
    const trimmedName = frequencyName.trim();
    const trimmedCode = frequencyCode.trim();
    if (!trimmedName) {
      setError('Frequency Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Frequency Code is required');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      if (isEdit) {
        const id = getId(initialData);
        await updateFrequency(id, {
          frequencyId: Number(id),
          frequencyName: trimmedName,
          frequencyCode: trimmedCode,
          modifiedBy: getCurrentUserId(),
          isActive,
        });
        toast.success('Updated successfully');
      } else {
        await createFrequency({
          frequencyName: trimmedName,
          frequencyCode: trimmedCode,
          createdBy: getCurrentUserId(),
          isActive,
        });
        toast.success('Created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.ModelState) {
        setError('Validation failed. Please check your input.');
      } else {
        toast.error(getErrorMessage(err, 'Request failed'));
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
    <MasterModal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Frequency' : 'Add Frequency'}>
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="frequencyName" className="form-label">
            Frequency Name <span className="text-danger">*</span>
          </label>
          <input
            id="frequencyName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={frequencyName}
            onChange={(e) => {
              setFrequencyName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Monthly"
            maxLength={100}
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="frequencyCode" className="form-label">
            Frequency Code <span className="text-danger">*</span>
          </label>
          <input
            id="frequencyCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={frequencyCode}
            onChange={(e) => {
              setFrequencyCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. MONTHLY"
            maxLength={30}
            disabled={isSubmitting}
          />
          {error && error.includes('Code') && <span className="form-error-msg">{error}</span>}
        </div>
        <MasterStatusCheckbox isActive={isActive} onChange={setIsActive} disabled={isSubmitting} />
        <div className="form-actions">
          <button type="button" className="masters-btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="masters-btn-primary" disabled={isSubmitting}>
            {isSubmitting ? (isEdit ? 'Updating...' : 'Saving...') : isEdit ? 'Update' : 'Save'}
          </button>
        </div>
      </form>
    </MasterModal>
  );
}
