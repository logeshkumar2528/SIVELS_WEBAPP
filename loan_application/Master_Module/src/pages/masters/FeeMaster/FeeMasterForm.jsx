import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createFee, updateFee, getFeeById } from '../../../api/masters/feeMasterApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './FeeMaster.css';

const getId = (row) => row?.feeId ?? row?.FeeId ?? row?.id;
const getCode = (row) => String(row?.feeCode ?? row?.FeeCode ?? '').trim().toLowerCase();
const getName = (row) => String(row?.feeName ?? row?.FeeName ?? '').trim().toLowerCase();

const resolveApiError = (err, fallback) => {
  const status = err?.response?.status;
  if (status === 401) return getErrorMessage(err, 'Session expired or missing token. Please sign in again.');
  if (status === 403) return getErrorMessage(err, 'You are not authorized to perform this action.');
  if (status === 404) return getErrorMessage(err, 'Record not found.');
  if (status === 409) return getErrorMessage(err, 'A fee with this code or name already exists.');
  if (status === 400) return getErrorMessage(err, 'Validation failed. Please check your input.');
  return getErrorMessage(err, fallback);
};

export function FeeMasterForm({ isOpen, onClose, onSuccess, initialData, existingRecords = [] }) {
  const [feeCode, setFeeCode] = useState('');
  const [feeName, setFeeName] = useState('');
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
          if (!id) throw new Error('Missing feeId on selected record');
          const response = await getFeeById(id);
          const record = response?.data || response?.value || response;
          if (isMounted) {
            setFeeCode(record.feeCode || record.FeeCode || '');
            setFeeName(record.feeName || record.FeeName || '');
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
        setFeeCode('');
        setFeeName('');
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
    const trimmedCode = feeCode.trim();
    const trimmedName = feeName.trim();

    if (!trimmedCode) {
      setError('Fee Code is required');
      return;
    }
    if (!trimmedName) {
      setError('Fee Name is required');
      return;
    }

    const duplicate = findDuplicate(trimmedCode, trimmedName);
    if (duplicate) {
      const dupCode = getCode(duplicate) === trimmedCode.toLowerCase();
      setError(
        dupCode
          ? 'Fee Code already exists. Please use a unique code.'
          : 'Fee Name already exists. Please use a unique name.'
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const id = getId(initialData);
        await updateFee(id, {
          feeId: Number(id),
          feeCode: trimmedCode,
          feeName: trimmedName,
          isActive,
          modifiedBy: getCurrentUserId(),
        });
        toast.success('Fee updated successfully');
      } else {
        await createFee({
          feeCode: trimmedCode,
          feeName: trimmedName,
          isActive,
          createdBy: getCurrentUserId(),
        });
        toast.success('Fee created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Fee form submission failed:', err);
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
    <MasterModal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Fee' : 'Add Fee'}>
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="feeCode" className="form-label">
            Fee Code <span className="text-danger">*</span>
          </label>
          <input
            id="feeCode"
            type="text"
            className={`form-input ${error && error.toLowerCase().includes('code') ? 'form-input-error' : ''}`}
            value={feeCode}
            onChange={(e) => {
              setFeeCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. PROCESSING_FEE"
            maxLength={50}
            disabled={isSubmitting}
          />
          {error && error.toLowerCase().includes('code') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="feeName" className="form-label">
            Fee Name <span className="text-danger">*</span>
          </label>
          <input
            id="feeName"
            type="text"
            className={`form-input ${error && error.toLowerCase().includes('name') ? 'form-input-error' : ''}`}
            value={feeName}
            onChange={(e) => {
              setFeeName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Processing Fee"
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
