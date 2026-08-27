import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createLoanType, updateLoanType, getLoanTypeById } from '../../../api/masters/loanTypeApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './LoanType.css'; // Shared CSS

export function LoanTypeForm({ isOpen, onClose, onSuccess, initialData }) {
  const [typeName, setTypeName] = useState('');
  const [typeCode, setTypeCode] = useState('');
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
          if (!initialData.loanTypeId) {
            throw new Error('Missing loanTypeId on selected record');
          }
          // Fetch latest record before editing
          const response = await getLoanTypeById(initialData.loanTypeId);
          const record = response.data || response;
          if (isMounted) {
            setTypeName(record.typeName || '');
            setTypeCode(record.typeCode || '');
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
        setTypeName('');
        setTypeCode('');
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
    
    const trimmedName = typeName.trim();
    const trimmedCode = typeCode.trim();

    if (!trimmedName) {
      setError('Type Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Type Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          loanTypeId: initialData.loanTypeId,
          typeName: trimmedName,
          typeCode: trimmedCode,
          modifiedBy: getCurrentUserId(),
          isActive
        };
        await updateLoanType(initialData.loanTypeId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          typeName: trimmedName,
          typeCode: trimmedCode,
          createdBy: getCurrentUserId(),
          isActive
        };
        await createLoanType(payload);
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
      title={isEdit ? 'Edit Loan Type' : 'Add Loan Type'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="typeName" className="form-label">
            Type Name <span className="text-danger">*</span>
          </label>
          <input
            id="typeName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={typeName}
            onChange={(e) => {
              setTypeName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Personal Loan"
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="typeCode" className="form-label">
            Type Code <span className="text-danger">*</span>
          </label>
          <input
            id="typeCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={typeCode}
            onChange={(e) => {
              setTypeCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. PL"
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
