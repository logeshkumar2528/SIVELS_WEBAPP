import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createScheduleMethod, updateScheduleMethod, getScheduleMethodById } from '../../../api/masters/scheduleMethodApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './ScheduleMethod.css';

const getId = (row) => row?.scheduleMethodId ?? row?.ScheduleMethodId ?? row?.id;
const getCode = (row) => String(row?.scheduleMethodCode ?? row?.ScheduleMethodCode ?? '').trim().toLowerCase();
const getName = (row) => String(row?.scheduleMethodName ?? row?.ScheduleMethodName ?? '').trim().toLowerCase();

const resolveApiError = (err, fallback) => {
  const status = err?.response?.status;
  if (status === 401) return getErrorMessage(err, 'Session expired or missing token. Please sign in again.');
  if (status === 403) return getErrorMessage(err, 'You are not authorized to perform this action.');
  if (status === 404) return getErrorMessage(err, 'Record not found.');
  if (status === 409) return getErrorMessage(err, 'A schedule method with this code or name already exists.');
  if (status === 400) return getErrorMessage(err, 'Validation failed. Please check your input.');
  if (status === 500) return getErrorMessage(err, 'Server error. Please try again later.');
  return getErrorMessage(err, fallback);
};

export function ScheduleMethodForm({ isOpen, onClose, onSuccess, initialData, existingRecords = [] }) {
  const [scheduleMethodCode, setScheduleMethodCode] = useState('');
  const [scheduleMethodName, setScheduleMethodName] = useState('');
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
          if (!id) throw new Error('Missing scheduleMethodId on selected record');
          const response = await getScheduleMethodById(id);
          const record = response?.data || response?.value || response;
          if (isMounted) {
            setScheduleMethodCode(record.scheduleMethodCode || record.ScheduleMethodCode || '');
            setScheduleMethodName(record.scheduleMethodName || record.ScheduleMethodName || '');
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
        setScheduleMethodCode('');
        setScheduleMethodName('');
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
    const trimmedCode = scheduleMethodCode.trim();
    const trimmedName = scheduleMethodName.trim();

    if (!trimmedCode) {
      setError('Schedule Method Code is required');
      return;
    }
    if (!trimmedName) {
      setError('Schedule Method Name is required');
      return;
    }

    const duplicate = findDuplicate(trimmedCode, trimmedName);
    if (duplicate) {
      const dupCode = getCode(duplicate) === trimmedCode.toLowerCase();
      setError(
        dupCode
          ? 'Schedule Method Code already exists. Please use a unique code.'
          : 'Schedule Method Name already exists. Please use a unique name.'
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const id = getId(initialData);
        await updateScheduleMethod(id, {
          scheduleMethodId: Number(id),
          scheduleMethodCode: trimmedCode,
          scheduleMethodName: trimmedName,
          isActive,
          modifiedBy: getCurrentUserId(),
        });
        toast.success('Schedule Method updated successfully');
      } else {
        await createScheduleMethod({
          scheduleMethodCode: trimmedCode,
          scheduleMethodName: trimmedName,
          isActive,
          createdBy: getCurrentUserId(),
        });
        toast.success('Schedule Method created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Schedule Method form submission failed:', err);
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
    <MasterModal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Schedule Method' : 'Add Schedule Method'}>
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="scheduleMethodCode" className="form-label">
            Schedule Method Code <span className="text-danger">*</span>
          </label>
          <input
            id="scheduleMethodCode"
            type="text"
            className={`form-input ${error && error.toLowerCase().includes('code') ? 'form-input-error' : ''}`}
            value={scheduleMethodCode}
            onChange={(e) => {
              setScheduleMethodCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. REDUCING"
            maxLength={50}
            disabled={isSubmitting}
          />
          {error && error.toLowerCase().includes('code') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="scheduleMethodName" className="form-label">
            Schedule Method Name <span className="text-danger">*</span>
          </label>
          <input
            id="scheduleMethodName"
            type="text"
            className={`form-input ${error && error.toLowerCase().includes('name') ? 'form-input-error' : ''}`}
            value={scheduleMethodName}
            onChange={(e) => {
              setScheduleMethodName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Reducing Balance"
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
