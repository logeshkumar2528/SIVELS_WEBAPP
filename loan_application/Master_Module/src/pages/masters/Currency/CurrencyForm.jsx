import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createCurrency, updateCurrency, getCurrencyById } from '../../../api/masters/currencyApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './Currency.css';

const getId = (row) => row?.currencyId ?? row?.CurrencyId ?? row?.id;
const getCode = (row) => String(row?.currencyCode ?? row?.CurrencyCode ?? '').trim().toLowerCase();
const getName = (row) => String(row?.currencyName ?? row?.CurrencyName ?? '').trim().toLowerCase();

const resolveApiError = (err, fallback) => {
  const status = err?.response?.status;
  if (status === 401) return getErrorMessage(err, 'Session expired or missing token. Please sign in again.');
  if (status === 403) return getErrorMessage(err, 'You are not authorized to perform this action.');
  if (status === 404) return getErrorMessage(err, 'Record not found.');
  if (status === 409) return getErrorMessage(err, 'A currency with this code or name already exists.');
  if (status === 400) return getErrorMessage(err, 'Validation failed. Please check your input.');
  if (status === 500) return getErrorMessage(err, 'Server error. Please try again later.');
  return getErrorMessage(err, fallback);
};

export function CurrencyForm({ isOpen, onClose, onSuccess, initialData, existingRecords = [] }) {
  const [currencyCode, setCurrencyCode] = useState('');
  const [currencyName, setCurrencyName] = useState('');
  const [symbol, setSymbol] = useState('');
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
          if (!id) throw new Error('Missing currencyId on selected record');
          const response = await getCurrencyById(id);
          const record = response?.data || response?.value || response;
          if (isMounted) {
            setCurrencyCode(record.currencyCode || record.CurrencyCode || '');
            setCurrencyName(record.currencyName || record.CurrencyName || '');
            setSymbol(record.symbol || record.Symbol || '');
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
        setCurrencyCode('');
        setCurrencyName('');
        setSymbol('');
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
    const trimmedCode = currencyCode.trim();
    const trimmedName = currencyName.trim();
    const trimmedSymbol = symbol.trim();

    if (!trimmedCode) {
      setError('Currency Code is required');
      return;
    }
    if (!trimmedName) {
      setError('Currency Name is required');
      return;
    }

    const duplicate = findDuplicate(trimmedCode, trimmedName);
    if (duplicate) {
      const dupCode = getCode(duplicate) === trimmedCode.toLowerCase();
      setError(
        dupCode
          ? 'Currency Code already exists. Please use a unique code.'
          : 'Currency Name already exists. Please use a unique name.'
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const id = getId(initialData);
        await updateCurrency(id, {
          currencyId: Number(id),
          currencyCode: trimmedCode,
          currencyName: trimmedName,
          symbol: trimmedSymbol || null,
          isActive,
          modifiedBy: getCurrentUserId(),
        });
        toast.success('Currency updated successfully');
      } else {
        await createCurrency({
          currencyCode: trimmedCode,
          currencyName: trimmedName,
          symbol: trimmedSymbol || null,
          isActive,
          createdBy: getCurrentUserId(),
        });
        toast.success('Currency created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Currency form submission failed:', err);
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
    <MasterModal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Currency' : 'Add Currency'}>
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="currencyCode" className="form-label">
            Currency Code <span className="text-danger">*</span>
          </label>
          <input
            id="currencyCode"
            type="text"
            className={`form-input ${error && error.toLowerCase().includes('code') ? 'form-input-error' : ''}`}
            value={currencyCode}
            onChange={(e) => {
              setCurrencyCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. INR"
            maxLength={10}
            disabled={isSubmitting}
          />
          {error && error.toLowerCase().includes('code') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="currencyName" className="form-label">
            Currency Name <span className="text-danger">*</span>
          </label>
          <input
            id="currencyName"
            type="text"
            className={`form-input ${error && error.toLowerCase().includes('name') ? 'form-input-error' : ''}`}
            value={currencyName}
            onChange={(e) => {
              setCurrencyName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Indian Rupee"
            maxLength={100}
            disabled={isSubmitting}
          />
          {error && error.toLowerCase().includes('name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="currencySymbol" className="form-label">
            Symbol
          </label>
          <input
            id="currencySymbol"
            type="text"
            className="form-input"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="e.g. ₹"
            maxLength={10}
            disabled={isSubmitting}
          />
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
