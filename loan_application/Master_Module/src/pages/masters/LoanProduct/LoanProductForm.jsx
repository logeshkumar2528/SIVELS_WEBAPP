import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createLoanProduct, updateLoanProduct, getLoanProductById } from '../../../api/masters/loanProductApi';
import { getLoanTypes } from '../../../api/masters/loanTypeApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './LoanProduct.css'; // Shared CSS

export function LoanProductForm({ isOpen, onClose, onSuccess, initialData }) {
  const [loanTypeId, setLoanTypeId] = useState('');
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const [loanTypes, setLoanTypes] = useState([]);
  
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
        const typesResponse = await getLoanTypes().catch(() => []);
        const allTypes = Array.isArray(typesResponse) ? typesResponse : (typesResponse.data || []);
        
        if (isMounted) {
          setLoanTypes(allTypes);
        }

        if (initialData) {
          if (!initialData.loanProductId) {
            throw new Error('Missing loanProductId on selected record');
          }
          const response = await getLoanProductById(initialData.loanProductId);
          const record = response.data || response;
          if (isMounted) {
            setLoanTypeId(record.loanTypeId ? record.loanTypeId.toString() : '');
            setProductName(record.productName || '');
            setProductCode(record.productCode || '');
            setIsActive(record.isActive !== false);
          }
        } else {
          if (isMounted) {
            setLoanTypeId('');
            setProductName('');
            setProductCode('');
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
    
    const trimmedName = productName.trim();
    const trimmedCode = productCode.trim();
    const typeIdNum = parseInt(loanTypeId, 10);

    if (!loanTypeId || isNaN(typeIdNum)) {
      setError('Loan Type is required');
      return;
    }
    if (!trimmedName) {
      setError('Product Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Product Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          loanProductId: initialData.loanProductId,
          loanTypeId: typeIdNum,
          productName: trimmedName,
          productCode: trimmedCode,
          modifiedBy: getCurrentUserId(),
          isActive
        };
        await updateLoanProduct(initialData.loanProductId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          loanTypeId: typeIdNum,
          productName: trimmedName,
          productCode: trimmedCode,
          createdBy: getCurrentUserId(),
          isActive
        };
        await createLoanProduct(payload);
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
      title={isEdit ? 'Edit Loan Product' : 'Add Loan Product'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        
        <div className="form-group">
          <label htmlFor="loanTypeId" className="form-label">
            Loan Type <span className="text-danger">*</span>
          </label>
          <select
            id="loanTypeId"
            className={`form-input ${error && error.includes('Loan Type') ? 'form-input-error' : ''}`}
            value={loanTypeId}
            onChange={(e) => {
              setLoanTypeId(e.target.value);
              if (error) setError(null);
            }}
            disabled={isSubmitting}
          >
            <option value="">Select Loan Type</option>
            {loanTypes.map((lt) => (
              <option key={lt.loanTypeId} value={lt.loanTypeId}>
                {lt.typeName}
              </option>
            ))}
          </select>
          {error && error.includes('Loan Type') && <span className="form-error-msg">{error}</span>}
          {loanTypes.length === 0 && !isLoading && (
            <span className="form-error-msg" style={{ color: 'var(--color-warning)' }}>
              No loan types available. Please create one first.
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="productName" className="form-label">
            Product Name <span className="text-danger">*</span>
          </label>
          <input
            id="productName"
            type="text"
            className={`form-input ${error && error.includes('Product Name') ? 'form-input-error' : ''}`}
            value={productName}
            onChange={(e) => {
              setProductName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Personal Loan Premium"
            disabled={isSubmitting}
          />
          {error && error.includes('Product Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="productCode" className="form-label">
            Product Code <span className="text-danger">*</span>
          </label>
          <input
            id="productCode"
            type="text"
            className={`form-input ${error && error.includes('Product Code') ? 'form-input-error' : ''}`}
            value={productCode}
            onChange={(e) => {
              setProductCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. PL001"
            disabled={isSubmitting}
          />
          {error && error.includes('Product Code') && <span className="form-error-msg">{error}</span>}
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
