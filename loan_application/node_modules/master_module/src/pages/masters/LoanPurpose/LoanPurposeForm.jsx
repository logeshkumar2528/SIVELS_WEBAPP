import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createLoanPurpose, updateLoanPurpose, getLoanPurposeById } from '../../../api/masters/loanPurposeApi';
import { getLoanProducts } from '../../../api/masters/loanProductApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './LoanPurpose.css'; // Shared CSS

export function LoanPurposeForm({ isOpen, onClose, onSuccess, initialData }) {
  const [loanProductId, setLoanProductId] = useState('');
  const [purposeName, setPurposeName] = useState('');
  const [purposeCode, setPurposeCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const [loanProducts, setLoanProducts] = useState([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const productsResponse = await getLoanProducts().catch(() => []);
        const allProducts = Array.isArray(productsResponse) ? productsResponse : (productsResponse.data || []);
        
        // Filter to only active loan products as per requirements
        const activeProducts = allProducts.filter(p => p.isActive === true);
        
        if (isMounted) {
          setLoanProducts(activeProducts);
        }

        if (initialData) {
          if (!initialData.loanPurposeId) {
            throw new Error('Missing loanPurposeId on selected record');
          }
          const response = await getLoanPurposeById(initialData.loanPurposeId);
          const record = response.data || response;
          if (isMounted) {
            setLoanProductId(record.loanProductId ? record.loanProductId.toString() : '');
            setPurposeName(record.purposeName || '');
            setPurposeCode(record.purposeCode || '');
            setIsActive(record.isActive !== false);
          }
        } else {
          if (isMounted) {
            setLoanProductId('');
            setPurposeName('');
            setPurposeCode('');
            setIsActive(true);
          }
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = getErrorMessage(err, 'Failed to load record data.');
          toast.error(errorMessage);
          onClose();
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
      
      if (isMounted) setError(null);
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialData, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedName = purposeName.trim();
    const trimmedCode = purposeCode.trim();
    const productIdNum = parseInt(loanProductId, 10);

    if (!loanProductId || isNaN(productIdNum)) {
      setError('Loan Product is required');
      return;
    }
    if (!trimmedName) {
      setError('Purpose Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Purpose Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          loanPurposeId: initialData.loanPurposeId,
          loanProductId: productIdNum,
          purposeName: trimmedName,
          purposeCode: trimmedCode,
          modifiedBy: getCurrentUserId(),
          isActive
        };
        await updateLoanPurpose(initialData.loanPurposeId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          loanProductId: productIdNum,
          purposeName: trimmedName,
          purposeCode: trimmedCode,
          createdBy: getCurrentUserId(),
          isActive
        };
        await createLoanPurpose(payload);
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
      title={isEdit ? 'Edit Loan Purpose' : 'Add Loan Purpose'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        
        <div className="form-group">
          <label htmlFor="loanProductId" className="form-label">
            Loan Product <span className="text-danger">*</span>
          </label>
          <select
            id="loanProductId"
            className={`form-input ${error && error.includes('Loan Product') ? 'form-input-error' : ''}`}
            value={loanProductId}
            onChange={(e) => {
              setLoanProductId(e.target.value);
              if (error) setError(null);
            }}
            disabled={isSubmitting}
          >
            <option value="">Select Loan Product</option>
            {loanProducts.map((lp) => (
              <option key={lp.loanProductId} value={lp.loanProductId}>
                {lp.productName}
              </option>
            ))}
          </select>
          {error && error.includes('Loan Product') && <span className="form-error-msg">{error}</span>}
          {loanProducts.length === 0 && !isLoading && (
            <span className="form-error-msg" style={{ color: 'var(--color-warning)' }}>
              No active loan products available. Please create one first.
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="purposeName" className="form-label">
            Purpose Name <span className="text-danger">*</span>
          </label>
          <input
            id="purposeName"
            type="text"
            className={`form-input ${error && error.includes('Purpose Name') ? 'form-input-error' : ''}`}
            value={purposeName}
            onChange={(e) => {
              setPurposeName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Education"
            disabled={isSubmitting}
          />
          {error && error.includes('Purpose Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="purposeCode" className="form-label">
            Purpose Code <span className="text-danger">*</span>
          </label>
          <input
            id="purposeCode"
            type="text"
            className={`form-input ${error && error.includes('Purpose Code') ? 'form-input-error' : ''}`}
            value={purposeCode}
            onChange={(e) => {
              setPurposeCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. EDU"
            disabled={isSubmitting}
          />
          {error && error.includes('Purpose Code') && <span className="form-error-msg">{error}</span>}
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
