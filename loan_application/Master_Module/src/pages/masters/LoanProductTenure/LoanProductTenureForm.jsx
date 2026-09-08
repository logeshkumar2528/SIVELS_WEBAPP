import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createLoanProductTenure, updateLoanProductTenure, getLoanProductTenureById } from '../../../api/masters/loanProductTenureApi';
import { getLoanProducts } from '../../../api/masters/loanProductApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './LoanProductTenure.css';

export function LoanProductTenureForm({ isOpen, onClose, onSuccess, initialData, loanProducts: parentLoanProducts }) {
  const [loanProductId, setLoanProductId] = useState('');
  const [tenureCode, setTenureCode] = useState('');
  const [tenureValue, setTenureValue] = useState('');
  const [tenureUnit, setTenureUnit] = useState('Months');
  const [isActive, setIsActive] = useState(true);
  
  const [loanProducts, setLoanProducts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const loadLookupsAndData = async () => {
      setIsLoading(true);
      try {
        let products = parentLoanProducts || [];
        if (!products.length) {
          const response = await getLoanProducts();
          products = Array.isArray(response) ? response : (response?.data || response?.value || response?.result || []);
        }
        if (isMounted) {
          setLoanProducts(products.filter(p => p.isActive !== false));
        }

        if (initialData) {
          const id = initialData.loanProductTenureId ?? initialData.LoanProductTenureId ?? initialData.productTenureId ?? initialData.id;
          if (!id) {
            throw new Error('Missing loanProductTenureId on selected record');
          }
          const response = await getLoanProductTenureById(id);
          const record = response?.data || response?.value || response?.result || response;
          if (isMounted) {
            setLoanProductId(record.loanProductId ? String(record.loanProductId) : (record.LoanProductId ? String(record.LoanProductId) : ''));
            setTenureCode(record.tenureCode || record.TenureCode || '');
            setTenureValue(record.tenureValue !== undefined && record.tenureValue !== null ? String(record.tenureValue) : (record.TenureValue !== undefined ? String(record.TenureValue) : ''));
            setTenureUnit(record.tenureUnit || record.TenureUnit || 'Months');
            setIsActive(record.isActive !== false);
          }
        } else {
          if (isMounted) {
            setLoanProductId('');
            setTenureCode('');
            setTenureValue('');
            setTenureUnit('Months');
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

    loadLookupsAndData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialData, parentLoanProducts, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const numProductId = Number(loanProductId);
    const trimmedCode = tenureCode.trim();
    const numTenureValue = Number(tenureValue);

    if (!loanProductId || isNaN(numProductId) || numProductId <= 0) {
      setError('Loan Product is required');
      return;
    }
    if (!trimmedCode) {
      setError('Tenure Code is required');
      return;
    }
    if (isNaN(numTenureValue) || numTenureValue <= 0) {
      setError('Tenure Value must be a number greater than 0');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const recordId = initialData?.loanProductTenureId ?? initialData?.LoanProductTenureId ?? initialData?.productTenureId ?? initialData?.id;

    try {
      if (isEdit) {
        const payload = {
          loanProductTenureId: recordId,
          loanProductId: numProductId,
          tenureCode: trimmedCode,
          tenureValue: numTenureValue,
          tenureUnit: tenureUnit.trim() || 'Months',
          modifiedBy: getCurrentUserId(),
          isActive
        };
        await updateLoanProductTenure(recordId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          loanProductId: numProductId,
          tenureCode: trimmedCode,
          tenureValue: numTenureValue,
          tenureUnit: tenureUnit.trim() || 'Months',
          createdBy: getCurrentUserId(),
          isActive
        };
        await createLoanProductTenure(payload);
        toast.success('Created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Form submission failed:', err);
      
      if (err.response?.status === 409) {
        const backendMsg = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null);
        const errorText = backendMsg || 'A tenure record for this loan product and code/value already exists.';
        setError(errorText);
        toast.error(errorText);
      } else if (err.response?.status === 400 && err.response?.data?.ModelState) {
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
      title={isEdit ? 'Edit Loan Product Tenure' : 'Add Loan Product Tenure'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        
        <div className="form-group">
          <label htmlFor="loanProductId" className="form-label">
            Loan Product <span className="text-danger">*</span>
          </label>
          <select
            id="loanProductId"
            className={"form-input " + (error && error.includes('Loan Product') ? "form-input-error" : "")}
            value={loanProductId}
            onChange={(e) => {
              setLoanProductId(e.target.value);
              if (error) setError(null);
            }}
            disabled={isSubmitting}
          >
            <option value="">Select Loan Product</option>
            {loanProducts.map((p) => (
              <option key={p.loanProductId ?? p.LoanProductId} value={p.loanProductId ?? p.LoanProductId}>
                {p.productName || p.ProductName || p.loanProductName || ("Product #" + (p.loanProductId ?? p.LoanProductId))}
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
          <label htmlFor="tenureCode" className="form-label">
            Tenure Code <span className="text-danger">*</span>
          </label>
          <input
            id="tenureCode"
            type="text"
            className={"form-input " + (error && error.includes('Code') ? "form-input-error" : "")}
            value={tenureCode}
            onChange={(e) => {
              setTenureCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. T12M"
            disabled={isSubmitting}
          />
          {error && error.includes('Code') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="tenureValue" className="form-label">
            Tenure Value (Months) <span className="text-danger">*</span>
          </label>
          <input
            id="tenureValue"
            type="number"
            min="1"
            step="1"
            className={"form-input " + (error && error.includes('Value') ? "form-input-error" : "")}
            value={tenureValue}
            onChange={(e) => {
              setTenureValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. 12"
            disabled={isSubmitting}
          />
          {error && error.includes('Value') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="tenureUnit" className="form-label">
            Tenure Unit
          </label>
          <input
            id="tenureUnit"
            type="text"
            className="form-input"
            value={tenureUnit}
            onChange={(e) => setTenureUnit(e.target.value)}
            placeholder="Months"
            disabled={isSubmitting}
          />
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
