import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createDayBasis, updateDayBasis, getDayBasisById } from '../../../api/masters/dayBasisApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './DayBasis.css';

const getId = (row) => row?.dayBasisId ?? row?.DayBasisId ?? row?.id;
const getCode = (row) => String(row?.dayBasisCode ?? row?.DayBasisCode ?? '').trim().toLowerCase();
const getName = (row) => String(row?.dayBasisName ?? row?.DayBasisName ?? '').trim().toLowerCase();

const resolveApiError = (err, fallback) => {
  const status = err?.response?.status;
  if (status === 401) return getErrorMessage(err, 'Session expired or missing token. Please sign in again.');
  if (status === 403) return getErrorMessage(err, 'You are not authorized to perform this action.');
  if (status === 404) return getErrorMessage(err, 'Record not found.');
  if (status === 409) return getErrorMessage(err, 'A day basis with this code or name already exists.');
  if (status === 400) return getErrorMessage(err, 'Validation failed. Please check your input.');
  if (status === 500) return getErrorMessage(err, 'Server error. Please try again later.');
  return getErrorMessage(err, fallback);
};

export function DayBasisForm({ isOpen, onClose, onSuccess, initialData, existingRecords = [] }) {
  const [dayBasisCode, setDayBasisCode] = useState('');
  const [dayBasisName, setDayBasisName] = useState('');
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
          if (!id) throw new Error('Missing dayBasisId on selected record');
          const response = await getDayBasisById(id);
          const record = response?.data || response?.value || response;
          if (isMounted) {
            setDayBasisCode(record.dayBasisCode || record.DayBasisCode || '');
            setDayBasisName(record.dayBasisName || record.DayBasisName || '');
            setIsActive(record.isActive !== false && record.IsActive !== false);
          }
        } catch (err) {
          if (isMounted) {
            toast.error(resolveApiError(err, 'Failed to load latest record data.'));
            onClose();
          }
        } finally {
          if (isMounted) setIsLoading(false);
        }
      } else {
        setDayBasisCode('');
        setDayBasisName('');
        setIsActive(true);
      }
      setError(null);
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, initialData, onClose]);

  const findDuplicate = (trimmedCode, trimmedName) => {
    const currentId = isEdit ? Number(getId(initialData)) : null;
    const codeKey = trimmedCode.toLowerCase();
    const nameKey = trimmedName.toLowerCase();

    return (existingRecords || []).find((row) => {
      const rowId = Number(getId(row));
      if (currentId && rowId === currentId) return false;
      return getCode(row) === codeKey || getName(row) === nameKey;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedCode = dayBasisCode.trim();
    const trimmedName = dayBasisName.trim();

    if (!trimmedCode) {
      setError('Day Basis Code is required');
      return;
    }
    if (!trimmedName) {
      setError('Day Basis Name is required');
      return;
    }

    const duplicate = findDuplicate(trimmedCode, trimmedName);
    if (duplicate) {
      const dupCode = getCode(duplicate) === trimmedCode.toLowerCase();
      setError(
        dupCode
          ? 'Day Basis Code already exists. Please use a unique code.'
          : 'Day Basis Name already exists. Please use a unique name.'
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const id = getId(initialData);
        await updateDayBasis(id, {
          dayBasisId: Number(id),
          dayBasisCode: trimmedCode,
          dayBasisName: trimmedName,
          isActive,
          modifiedBy: getCurrentUserId(),
        });
        toast.success('Day Basis updated successfully');
      } else {
        await createDayBasis({
          dayBasisCode: trimmedCode,
          dayBasisName: trimmedName,
          isActive,
          createdBy: getCurrentUserId(),
        });
        toast.success('Day Basis created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Day Basis form submission failed:', err);
      const message = resolveApiError(err, 'Request failed');
      if (err.response?.status === 400 || err.response?.status === 409) {
        setError(message);
      }
      toast.error(message);
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
    <MasterModal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Day Basis' : 'Add Day Basis'}>
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="dayBasisCode" className="form-label">
            Day Basis Code <span className="text-danger">*</span>
          </label>
          <input
            id="dayBasisCode"
            type="text"
            className={`form-input ${error && error.toLowerCase().includes('code') ? 'form-input-error' : ''}`}
            value={dayBasisCode}
            onChange={(e) => {
              setDayBasisCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. ACTUAL_365"
            maxLength={50}
            disabled={isSubmitting}
          />
          {error && error.toLowerCase().includes('code') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="dayBasisName" className="form-label">
            Day Basis Name <span className="text-danger">*</span>
          </label>
          <input
            id="dayBasisName"
            type="text"
            className={`form-input ${error && error.toLowerCase().includes('name') ? 'form-input-error' : ''}`}
            value={dayBasisName}
            onChange={(e) => {
              setDayBasisName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Actual / 365 Days"
            maxLength={100}
            disabled={isSubmitting}
          />
          {error && error.toLowerCase().includes('name') && <span className="form-error-msg">{error}</span>}
        </div>

        {error && !error.toLowerCase().includes('code') && !error.toLowerCase().includes('name') && (
          <span className="form-error-msg">{error}</span>
        )}

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
