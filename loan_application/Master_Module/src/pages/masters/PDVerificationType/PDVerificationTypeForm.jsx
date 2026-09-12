import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { UserCheck, Save } from 'lucide-react';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createPDVerificationType, updatePDVerificationType, getPDVerificationTypeById } from '../../../api/masters/pdVerificationTypeApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';

export function PDVerificationTypeForm({ isOpen, onClose, onSuccess, initialData }) {
  const [pdVerificationTypeName, setPdVerificationTypeName] = useState('');
  const [pdVerificationTypeCode, setPdVerificationTypeCode] = useState('');
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
          if (!initialData.pdVerificationTypeId) {
            throw new Error('Missing pdVerificationTypeId on selected record');
          }
          // Fetch latest record before editing
          const response = await getPDVerificationTypeById(initialData.pdVerificationTypeId);
          const record = response.data || response;
          if (isMounted) {
            setPdVerificationTypeName(record.pdVerificationTypeName || '');
            setPdVerificationTypeCode(record.pdVerificationTypeCode || '');
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
        setPdVerificationTypeName('');
        setPdVerificationTypeCode('');
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
    
    const trimmedName = pdVerificationTypeName.trim();
    const trimmedCode = pdVerificationTypeCode.trim();

    if (!trimmedName) {
      setError('PD Verification Type Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('PD Verification Type Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          pdVerificationTypeId: initialData.pdVerificationTypeId,
          pdVerificationTypeName: trimmedName,
          pdVerificationTypeCode: trimmedCode,
          modifiedBy: getCurrentUserId(),
          isActive
        };
        await updatePDVerificationType(initialData.pdVerificationTypeId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          pdVerificationTypeName: trimmedName,
          pdVerificationTypeCode: trimmedCode,
          createdBy: getCurrentUserId(),
          isActive
        };
        await createPDVerificationType(payload);
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
      title={isEdit ? 'Edit PD Verification Type' : 'Add PD Verification Type'}
      subtitle="Enter the PD verification type details below."
      icon={<UserCheck size={24} />}
    >
      <form onSubmit={handleSubmit} className="pd-verification-type-form">
        <div className="form-group">
          <label htmlFor="pdVerificationTypeName" className="form-label">
            PD Verification Type Name <span className="text-danger">*</span>
          </label>
          <input
            id="pdVerificationTypeName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={pdVerificationTypeName}
            onChange={(e) => {
              setPdVerificationTypeName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Residence Verification"
            disabled={isSubmitting}
          />
          {!error && <span className="form-helper-text">Enter a descriptive name for the personal discussion verification type.</span>}
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="pdVerificationTypeCode" className="form-label">
            PD Verification Type Code <span className="text-danger">*</span>
          </label>
          <input
            id="pdVerificationTypeCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={pdVerificationTypeCode}
            onChange={(e) => {
              setPdVerificationTypeCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. RESIDENCE"
            disabled={isSubmitting}
          />
          {!error && <span className="form-helper-text">Enter a unique uppercase code for the verification type.</span>}
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
            style={{ padding: '0.625rem 1.5rem' }}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="masters-btn-primary"
            disabled={isSubmitting}
            style={{ padding: '0.625rem 1.5rem' }}
          >
            <Save size={18} />
            {isSubmitting ? (isEdit ? 'Updating...' : 'Saving...') : (isEdit ? 'Update' : 'Save')}
          </button>
        </div>
      </form>
    </MasterModal>
  );
}
