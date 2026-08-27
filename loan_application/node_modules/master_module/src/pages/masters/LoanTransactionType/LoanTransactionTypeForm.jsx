import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createLoanTransactionType, updateLoanTransactionType, getLoanTransactionTypeById } from '../../../api/masters/loanTransactionTypeApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './LoanTransactionType.css'; // Shared CSS

export function LoanTransactionTypeForm({ isOpen, onClose, onSuccess, initialData }) {
  const [transactionTypeCode, setTransactionTypeCode] = useState('');
  const [transactionTypeName, setTransactionTypeName] = useState('');
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
          if (!initialData.loanTransactionTypeId) {
            throw new Error('Missing loanTransactionTypeId on selected record');
          }
          // Fetch latest record before editing
          const response = await getLoanTransactionTypeById(initialData.loanTransactionTypeId);
          const record = response.data || response;
          if (isMounted) {
            setTransactionTypeCode(record.transactionTypeCode || '');
            setTransactionTypeName(record.transactionTypeName || '');
            setIsActive(record.isActive !== false);
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
        setTransactionTypeCode('');
        setTransactionTypeName('');
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
    
    const trimmedCode = transactionTypeCode.trim();
    const trimmedName = transactionTypeName.trim();

    if (!trimmedCode) {
      setError('Transaction Type Code is required');
      return;
    }
    if (!trimmedName) {
      setError('Transaction Type Name is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          loanTransactionTypeId: initialData.loanTransactionTypeId,
          transactionTypeCode: trimmedCode,
          transactionTypeName: trimmedName,
          modifiedBy: getCurrentUserId(),
          isActive
        };
        await updateLoanTransactionType(initialData.loanTransactionTypeId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          transactionTypeCode: trimmedCode,
          transactionTypeName: trimmedName,
          createdBy: getCurrentUserId(),
          isActive
        };
        await createLoanTransactionType(payload);
        toast.success('Created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Form submission failed:', err);
      
      if (err.response?.status === 400 && err.response?.data?.ModelState) {
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
      title={isEdit ? 'Edit Loan Transaction Type' : 'Add Loan Transaction Type'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="transactionTypeName" className="form-label">
            Transaction Type Name <span className="text-danger">*</span>
          </label>
          <input
            id="transactionTypeName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={transactionTypeName}
            onChange={(e) => {
              setTransactionTypeName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Repayment"
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="transactionTypeCode" className="form-label">
            Transaction Type Code <span className="text-danger">*</span>
          </label>
          <input
            id="transactionTypeCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={transactionTypeCode}
            onChange={(e) => {
              setTransactionTypeCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. REPAY"
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
