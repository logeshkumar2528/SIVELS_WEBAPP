import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createLoanFlag, updateLoanFlag, getLoanFlagById } from '../../../api/masters/loanFlagApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './LoanFlag.css';

const getId = (row) => row?.loanFlagId ?? row?.LoanFlagId ?? row?.id;

export function LoanFlagForm({ isOpen, onClose, onSuccess, initialData }) {
  const [loanFlagName, setLoanFlagName] = useState('');
  const [loanFlagCode, setLoanFlagCode] = useState('');
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
          if (!id) throw new Error('Missing loanFlagId on selected record');
          const response = await getLoanFlagById(id);
          const record = response?.data || response?.value || response;
          if (isMounted) {
            setLoanFlagName(record.loanFlagName || record.LoanFlagName || '');
            setLoanFlagCode(record.loanFlagCode || record.LoanFlagCode || '');
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
        setLoanFlagName('');
        setLoanFlagCode('');
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
    const trimmedName = loanFlagName.trim();
    const trimmedCode = loanFlagCode.trim();
    if (!trimmedName) {
      setError('Loan Flag Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Loan Flag Code is required');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      if (isEdit) {
        const id = getId(initialData);
        await updateLoanFlag(id, {
          loanFlagId: Number(id),
          loanFlagName: trimmedName,
          loanFlagCode: trimmedCode,
          modifiedBy: getCurrentUserId(),
          isActive,
        });
        toast.success('Updated successfully');
      } else {
        await createLoanFlag({
          loanFlagName: trimmedName,
          loanFlagCode: trimmedCode,
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
    <MasterModal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Loan Flag' : 'Add Loan Flag'}>
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="loanFlagName" className="form-label">
            Loan Flag Name <span className="text-danger">*</span>
          </label>
          <input
            id="loanFlagName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={loanFlagName}
            onChange={(e) => {
              setLoanFlagName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. High Risk"
            maxLength={100}
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="loanFlagCode" className="form-label">
            Loan Flag Code <span className="text-danger">*</span>
          </label>
          <input
            id="loanFlagCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={loanFlagCode}
            onChange={(e) => {
              setLoanFlagCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. HIGH_RISK"
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
