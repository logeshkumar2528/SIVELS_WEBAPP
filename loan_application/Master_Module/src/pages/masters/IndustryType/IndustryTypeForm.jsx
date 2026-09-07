import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createIndustryType, updateIndustryType, getIndustryTypeById } from '../../../api/masters/industryTypeApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './IndustryType.css';

export function IndustryTypeForm({ isOpen, onClose, onSuccess, initialData }) {
  const [industryTypeName, setIndustryTypeName] = useState('');
  const [industryTypeCode, setIndustryTypeCode] = useState('');
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
          const id = initialData.industryTypeId ?? initialData.IndustryTypeId ?? initialData.id;
          if (!id) {
            throw new Error('Missing industryTypeId on selected record');
          }
          const response = await getIndustryTypeById(id);
          const record = response?.data || response?.value || response;
          if (isMounted) {
            setIndustryTypeName(record.industryTypeName || record.IndustryTypeName || '');
            setIndustryTypeCode(record.industryTypeCode || record.IndustryTypeCode || '');
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
        setIndustryTypeName('');
        setIndustryTypeCode('');
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
    
    const trimmedName = industryTypeName.trim();
    const trimmedCode = industryTypeCode.trim();

    if (!trimmedName) {
      setError('Industry Type Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Industry Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const recordId = initialData?.industryTypeId ?? initialData?.IndustryTypeId ?? initialData?.id;

    try {
      if (isEdit) {
        const payload = {
          industryTypeId: recordId,
          industryTypeName: trimmedName,
          industryTypeCode: trimmedCode,
          modifiedBy: getCurrentUserId(),
          isActive
        };
        await updateIndustryType(recordId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          industryTypeName: trimmedName,
          industryTypeCode: trimmedCode,
          createdBy: getCurrentUserId(),
          isActive
        };
        await createIndustryType(payload);
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
      title={isEdit ? 'Edit Industry Type' : 'Add Industry Type'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="industryTypeName" className="form-label">
            Industry Type Name <span className="text-danger">*</span>
          </label>
          <input
            id="industryTypeName"
            type="text"
            className={"form-input " + (error && error.includes('Name') ? "form-input-error" : "")}
            value={industryTypeName}
            onChange={(e) => {
              setIndustryTypeName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Information Technology"
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="industryTypeCode" className="form-label">
            Industry Code <span className="text-danger">*</span>
          </label>
          <input
            id="industryTypeCode"
            type="text"
            className={"form-input " + (error && error.includes('Code') ? "form-input-error" : "")}
            value={industryTypeCode}
            onChange={(e) => {
              setIndustryTypeCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. IT"
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
