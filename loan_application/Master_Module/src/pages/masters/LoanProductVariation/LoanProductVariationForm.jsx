import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import { getLoanProducts } from '../../../api/masters/loanProductApi';
import { createLoanProductVariation, updateLoanProductVariation } from '../../../api/masters/loanProductVariationApi';
import { getErrorMessage } from '../../../utils/errorHelper';

export function LoanProductVariationForm({ isOpen, onClose, onSuccess, initialData }) {
  const [loanProductId, setLoanProductId] = useState('');
  const [variationCode, setVariationCode] = useState('');
  const [variationName, setVariationName] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Future state for loan products fetched from API
  const [loanProducts, setLoanProducts] = useState([]);

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchLoanProducts = async () => {
      try {
        const response = await getLoanProducts();
        const records = Array.isArray(response) ? response : (response?.data || response?.value || []);
        if (isMounted) {
          // Only show active Loan Products
          setLoanProducts(records.filter(r => r.isActive !== false));
        }
      } catch (err) {
        console.error('Failed to load loan products:', err);
      }
    };
    fetchLoanProducts();

    if (initialData) {
      setLoanProductId(String(initialData.loanProductId || ''));
      setVariationCode(initialData.variationCode || '');
      setVariationName(initialData.variationName || '');
      setIsActive(initialData.isActive !== false);
    } else {
      setLoanProductId('');
      setVariationCode('');
      setVariationName('');
      setIsActive(true);
    }
    setError(null);
    return () => { isMounted = false; };
  }, [isOpen, initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedCode = variationCode.trim();
    const trimmedName = variationName.trim();

    if (!loanProductId) {
      setError('Loan Product is required');
      toast.error('Loan Product is required');
      return;
    }
    if (!trimmedCode) {
      setError('Variation Code is required');
      toast.error('Variation Code is required');
      return;
    }
    if (!trimmedName) {
      setError('Variation Name is required');
      toast.error('Variation Name is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          loanProductVariationId: initialData.loanProductVariationId,
          loanProductId: Number(loanProductId),
          variationCode: trimmedCode,
          variationName: trimmedName,
          isActive,
          modifiedBy: 1
        };
        const response = await updateLoanProductVariation(initialData.loanProductVariationId, payload);
        const msg = response?.message || 'Updated successfully';
        toast.success(msg);
      } else {
        const payload = {
          loanProductId: Number(loanProductId),
          variationCode: trimmedCode,
          variationName: trimmedName,
          isActive,
          createdBy: 1
        };
        const response = await createLoanProductVariation(payload);
        const msg = response?.message || 'Created successfully';
        toast.success(msg);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Form submission failed:', err);
      if (!err?.response) {
        toast.error('Unable to connect to the server.');
      } else if (err.response.status === 400 || err.response.status === 409) {
        const errorMessage = getErrorMessage(err, 'Request failed');
        toast.error(errorMessage);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MasterModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEdit ? 'Edit Loan Product Variation' : 'Add Loan Product Variation'}
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
            required
          >
            <option value="">Select Loan Product ▼</option>
            {loanProducts.map((p) => (
              <option key={p.loanProductId} value={p.loanProductId}>
                {p.productName} - {p.loanType}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="variationCode" className="form-label">
            Variation Code <span className="text-danger">*</span>
          </label>
          <input
            id="variationCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={variationCode}
            onChange={(e) => {
              setVariationCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Enter variation code (e.g. PL_STD)"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="variationName" className="form-label">
            Variation Name <span className="text-danger">*</span>
          </label>
          <input
            id="variationName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={variationName}
            onChange={(e) => {
              setVariationName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Enter variation name (e.g. Personal Loan - Standard)"
            disabled={isSubmitting}
            required
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
            {isSubmitting ? (isEdit ? 'Updating...' : 'Saving...') : (isEdit ? 'Update Variation' : 'Save Variation')}
          </button>
        </div>
      </form>
    </MasterModal>
  );
}
