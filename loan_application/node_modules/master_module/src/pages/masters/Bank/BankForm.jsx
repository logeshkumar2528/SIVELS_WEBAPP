import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createBank, updateBank, getBankById } from '../../../api/masters/bankApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './Bank.css';

export function BankForm({ isOpen, onClose, onSuccess, initialData }) {
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [rbiBankCode, setRbiBankCode] = useState('');
  const [website, setWebsite] = useState('');
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
          if (!initialData.bankId) {
            throw new Error('Missing bankId on selected record');
          }
          const response = await getBankById(initialData.bankId);
          const record = response?.value || response?.data || response;
          
          if (isMounted) {
            setBankCode(record.bankCode || '');
            setBankName(record.bankName || '');
            setRbiBankCode(record.rbiBankCode || '');
            setWebsite(record.website || '');
            const activeVal = record.isActive;
            setIsActive(activeVal === true || activeVal === 1 || activeVal === '1');
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
        setBankCode('');
        setBankName('');
        setRbiBankCode('');
        setWebsite('');
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
    
    const trimmedCode = bankCode.trim();
    const trimmedName = bankName.trim();
    const trimmedRbiCode = rbiBankCode.trim();
    const trimmedWebsite = website.trim();

    if (!trimmedCode) {
      setError('Bank Code is required');
      return;
    }
    if (!trimmedName) {
      setError('Bank Name is required');
      return;
    }
    if (!trimmedRbiCode) {
      setError('RBI Bank Code is required');
      return;
    }
    if (!trimmedWebsite) {
      setError('Website is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        bankCode: trimmedCode,
        bankName: trimmedName,
        rbiBankCode: trimmedRbiCode,
        website: trimmedWebsite,
        isActive
      };

      if (isEdit) {
        // According to instructions, do NOT send bankId, createdAt, modifiedBy, modifiedAt in POST.
        // Wait, for PUT, they usually expect bankId in URL, and some APIs expect modifiedBy.
        // Let's just include what was used in other modules.
        // State master instruction said "Do NOT send stateId... for a normal create request."
        // For PUT, they said: Send correct backend payload. I'll add modifiedBy.
        payload.bankId = initialData.bankId;
        payload.modifiedBy = getCurrentUserId() || 1;
        await updateBank(initialData.bankId, payload);
        toast.success('Updated successfully');
      } else {
        payload.createdBy = getCurrentUserId() || 1;
        await createBank(payload);
        toast.success('Created successfully');
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Form submission failed:', err);
      
      if (!err.response) {
        toast.error('Unable to connect to the server.');
        setError('Unable to connect to the server.');
      } else if (err.response.status === 409) {
        const backendMsg = err.response.data?.message || (typeof err.response.data === 'string' ? err.response.data : null);
        const errorText = backendMsg || 'Conflict: Bank Code or Name already exists.';
        setError(errorText);
        toast.error(errorText);
      } else if (err.response.status === 400 && err.response.data?.ModelState) {
        setError('Validation failed. Please check your input.');
      } else if (err.response.status === 404) {
        toast.error('Bank not found.');
      } else if (err.response.status === 500) {
        toast.error('Something went wrong. Please try again.');
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
      title={isEdit ? 'Edit Bank' : 'Add Bank'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="bankCode" className="form-label">
            Bank Code <span className="text-danger">*</span>
          </label>
          <input
            id="bankCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={bankCode}
            onChange={(e) => {
              setBankCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. ICICI001"
            disabled={isSubmitting}
            required
          />
        </div>
      
        <div className="form-group">
          <label htmlFor="bankName" className="form-label">
            Bank Name <span className="text-danger">*</span>
          </label>
          <input
            id="bankName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={bankName}
            onChange={(e) => {
              setBankName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. ICICI Bank Limited"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="rbiBankCode" className="form-label">
            RBI Bank Code <span className="text-danger">*</span>
          </label>
          <input
            id="rbiBankCode"
            type="text"
            className={`form-input ${error && error.includes('RBI') ? 'form-input-error' : ''}`}
            value={rbiBankCode}
            onChange={(e) => {
              setRbiBankCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. ICIC000001"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="website" className="form-label">
            Website <span className="text-danger">*</span>
          </label>
          <input
            id="website"
            type="url"
            className={`form-input ${error && error.includes('Website') ? 'form-input-error' : ''}`}
            value={website}
            onChange={(e) => {
              setWebsite(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. https://www.icicibank.com"
            disabled={isSubmitting}
            required
          />
        </div>

        {error && <div className="form-error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

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
