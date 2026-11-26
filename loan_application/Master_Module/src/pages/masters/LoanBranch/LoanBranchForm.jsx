import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createLoanBranch, updateLoanBranch, getLoanBranchById } from '../../../api/masters/loanBranchApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './LoanBranch.css';

const getId = (row) => row?.loanBranchId ?? row?.LoanBranchId ?? row?.id;
const getCode = (row) => String(row?.loanBranchCode ?? row?.LoanBranchCode ?? '').trim().toLowerCase();
const getName = (row) => String(row?.loanBranchName ?? row?.LoanBranchName ?? '').trim().toLowerCase();

const resolveApiError = (err, fallback) => {
  const status = err?.response?.status;
  if (status === 401) return getErrorMessage(err, 'Session expired or missing token. Please sign in again.');
  if (status === 403) return getErrorMessage(err, 'You are not authorized to perform this action.');
  if (status === 404) return getErrorMessage(err, 'Record not found.');
  if (status === 409) return getErrorMessage(err, 'A loan branch with this code or name already exists.');
  if (status === 400) return getErrorMessage(err, 'Validation failed. Please check your input.');
  if (status === 500) return getErrorMessage(err, 'Server error. Please try again later.');
  return getErrorMessage(err, fallback);
};

export function LoanBranchForm({ isOpen, onClose, onSuccess, initialData, existingRecords = [] }) {
  const [loanBranchCode, setLoanBranchCode] = useState('');
  const [loanBranchName, setLoanBranchName] = useState('');
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
          if (!id) throw new Error('Missing loanBranchId on selected record');
          const response = await getLoanBranchById(id);
          const record = response?.data || response?.value || response;
          if (isMounted) {
            setLoanBranchCode(record.loanBranchCode || record.LoanBranchCode || '');
            setLoanBranchName(record.loanBranchName || record.LoanBranchName || '');
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
        setLoanBranchCode('');
        setLoanBranchName('');
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
    const trimmedCode = loanBranchCode.trim();
    const trimmedName = loanBranchName.trim();

    if (!trimmedCode) {
      setError('Loan Branch Code is required');
      return;
    }
    if (!trimmedName) {
      setError('Loan Branch Name is required');
      return;
    }

    const duplicate = findDuplicate(trimmedCode, trimmedName);
    if (duplicate) {
      const dupCode = getCode(duplicate) === trimmedCode.toLowerCase();
      setError(
        dupCode
          ? 'Loan Branch Code already exists. Please use a unique code.'
          : 'Loan Branch Name already exists. Please use a unique name.'
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const id = getId(initialData);
        await updateLoanBranch(id, {
          loanBranchId: Number(id),
          loanBranchCode: trimmedCode,
          loanBranchName: trimmedName,
          isActive,
          modifiedBy: getCurrentUserId(),
        });
        toast.success('Loan Branch updated successfully');
      } else {
        await createLoanBranch({
          loanBranchCode: trimmedCode,
          loanBranchName: trimmedName,
          isActive,
          createdBy: getCurrentUserId(),
        });
        toast.success('Loan Branch created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Loan Branch form submission failed:', err);
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
    <MasterModal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Loan Branch' : 'Add Loan Branch'}>
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="loanBranchCode" className="form-label">
            Loan Branch Code <span className="text-danger">*</span>
          </label>
          <input
            id="loanBranchCode"
            type="text"
            className={`form-input ${error && error.toLowerCase().includes('code') ? 'form-input-error' : ''}`}
            value={loanBranchCode}
            onChange={(e) => {
              setLoanBranchCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. CHN_MAIN"
            maxLength={50}
            disabled={isSubmitting}
          />
          {error && error.toLowerCase().includes('code') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="loanBranchName" className="form-label">
            Loan Branch Name <span className="text-danger">*</span>
          </label>
          <input
            id="loanBranchName"
            type="text"
            className={`form-input ${error && error.toLowerCase().includes('name') ? 'form-input-error' : ''}`}
            value={loanBranchName}
            onChange={(e) => {
              setLoanBranchName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Chennai Main Branch"
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
