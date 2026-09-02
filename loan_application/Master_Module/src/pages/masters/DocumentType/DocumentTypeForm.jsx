import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createDocumentType, updateDocumentType, getDocumentTypeById } from '../../../api/masters/documentTypeApi';
import { getEmploymentTypes } from '../../../api/masters/employmentTypeApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './DocumentType.css';

export function DocumentTypeForm({ isOpen, onClose, onSuccess, initialData }) {
  const defaultFormState = {
    documentTypeName: '',
    documentTypeCode: '',
    employmentTypeId: '',
    isActive: true
  };

  const [formData, setFormData] = useState(defaultFormState);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [employmentTypes, setEmploymentTypes] = useState([]);

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const loadData = async () => {
      if (initialData) {
        setIsLoading(true);
        try {
          if (!initialData.documentTypeId) {
            throw new Error('Missing documentTypeId on selected record');
          }
          
          const response = await getDocumentTypeById(initialData.documentTypeId);
          const record = response.data || response;
          
          if (isMounted) {
            setFormData({
              documentTypeName: record.documentTypeName || '',
              documentTypeCode: record.documentTypeCode || '',
              employmentTypeId: record.employmentTypeId || initialData.employmentTypeId || '',
              isActive: record.isActive !== false
            });
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
        setFormData(defaultFormState);
      }
      setError(null);
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialData, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadEmploymentTypes = async () => {
      try {
        const response = await getEmploymentTypes();
        const records = Array.isArray(response) ? response : (response?.data || response?.value || []);
        if (isMounted) setEmploymentTypes(records);
      } catch (err) {
        if (isMounted) {
          const message = getErrorMessage(err, 'Unable to load employment types.');
          setError(message);
          toast.error(message);
        }
      }
    };

    loadEmploymentTypes();
    return () => { isMounted = false; };
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedName = formData.documentTypeName.trim();
    const trimmedCode = formData.documentTypeCode.trim();

    if (!trimmedName) {
      setError('Document Type Name is required');
      toast.error('Document Type Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Document Type Code is required');
      toast.error('Document Type Code is required');
      return;
    }
    if (!formData.employmentTypeId) {
      setError('Employment type is required.');
      toast.error('Employment type is required.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          documentTypeId: initialData.documentTypeId,
          documentTypeName: trimmedName,
          documentTypeCode: trimmedCode,
          employmentTypeId: Number(formData.employmentTypeId),
          isActive: Boolean(formData.isActive),
          modifiedBy: Number(getCurrentUserId()) || 1
        };
        
        await updateDocumentType(initialData.documentTypeId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          documentTypeCode: trimmedCode,
          documentTypeName: trimmedName,
          employmentTypeId: Number(formData.employmentTypeId),
          isActive: Boolean(formData.isActive),
          createdBy: Number(getCurrentUserId()) || 1
        };
        
        await createDocumentType(payload);
        toast.success('Created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error("DOCUMENT TYPE VALIDATION ERROR:", JSON.stringify(err.response?.data, null, 2));
      console.error('Form submission failed:', err);
      
      const backendMessage = err.response?.data?.message || err.response?.data?.title || (typeof err.response?.data === 'string' ? err.response?.data : null);
      
      if (backendMessage) {
        toast.error(backendMessage);
        setError(backendMessage);
      } else if (err.response?.status === 400 && err.response?.data?.ModelState) {
        setError('Validation failed. Please check your input.');
        toast.error('Validation failed. Please check your input.');
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
      title={isEdit ? 'Edit Document Type' : 'Add Document Type'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        
        <div className="form-group">
          <label htmlFor="documentTypeName" className="form-label">
            Document Type Name <span className="text-danger">*</span>
          </label>
          <input
            id="documentTypeName"
            name="documentTypeName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={formData.documentTypeName}
            onChange={handleChange}
            placeholder="e.g. Aadhaar Card"
            disabled={isSubmitting}
            required
            autoComplete="off"
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="employmentTypeId" className="form-label">
            Employment Type <span className="text-danger">*</span>
          </label>
          <select
            id="employmentTypeId"
            name="employmentTypeId"
            className={`form-input ${error && error.toLowerCase().includes('employment') ? 'form-input-error' : ''}`}
            value={formData.employmentTypeId}
            onChange={handleChange}
            disabled={isSubmitting || employmentTypes.length === 0}
            required
          >
            <option value="">Select Employment Type</option>
            {employmentTypes.map((item) => (
              <option key={item.employmentTypeId} value={item.employmentTypeId}>
                {item.employmentTypeName}
              </option>
            ))}
          </select>
          {error && error.toLowerCase().includes('employment') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="documentTypeCode" className="form-label">
            Document Type Code <span className="text-danger">*</span>
          </label>
          <input
            id="documentTypeCode"
            name="documentTypeCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={formData.documentTypeCode}
            onChange={handleChange}
            placeholder="e.g. AADHAAR"
            disabled={isSubmitting}
            required
            autoComplete="off"
          />
          {error && error.includes('Code') && <span className="form-error-msg">{error}</span>}
        </div>

        <MasterStatusCheckbox 
          isActive={formData.isActive} 
          onChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))} 
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
