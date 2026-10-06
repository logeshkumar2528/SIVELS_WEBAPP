import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { updateMapping, createMapping } from '../../../api/masters/employmentTypeDocumentMappingApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './EmploymentTypeDocumentMapping.css';

const hasValue = (value) => value !== undefined && value !== null && value !== '';

export function EmploymentTypeDocumentMappingForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialData, 
  existingMappings, 
  selectedEmploymentTypeId,
  employmentTypes,
  customerDocumentTypes = []
}) {
  const [customerDocumentTypeId, setCustomerDocumentTypeId] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);
  const [isActive, setIsActive] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(initialData);
  const hasSavedCategory = isEdit && hasValue(initialData.customerDocumentTypeId);
  const activeCategories = customerDocumentTypes.filter((c) => c.isActive);

  useEffect(() => {
    if (!isOpen) return;

    if (isEdit) {
      setIsMandatory(initialData.isMandatory !== false);
      setIsActive(initialData.isActive !== false);
      setCustomerDocumentTypeId(hasValue(initialData.customerDocumentTypeId) ? String(initialData.customerDocumentTypeId) : '');
    } else {
      setIsMandatory(false); // Optional by default
      setIsActive(true); // Active by default
      setCustomerDocumentTypeId('');
    }
    setError(null);
  }, [isOpen, initialData, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError(null);

    if (!isEdit && !selectedEmploymentTypeId) {
      setError('Employment Type is required.');
      return;
    }
    if (!customerDocumentTypeId) {
      setError('Customer Document Category is required.');
      return;
    }

    const isDuplicate = existingMappings?.some(
      mapping => String(mapping.customerDocumentTypeId) === String(customerDocumentTypeId)
        && mapping.isActive
        && String(mapping.employmentTypeDocumentMappingId) !== String(initialData?.employmentTypeDocumentMappingId)
    );
    if (isDuplicate) {
      const msg = 'This customer document category is already mapped to this employment type.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          employmentTypeDocumentMappingId: initialData.employmentTypeDocumentMappingId,
          employmentTypeId: initialData.employmentTypeId,
          customerDocumentTypeId: Number(customerDocumentTypeId),
          documentTypeId: hasValue(initialData.documentTypeId) ? Number(initialData.documentTypeId) : null,
          isMandatory,
          isActive,
          modifiedBy: Number(getCurrentUserId()) || 1
        };
        
        await updateMapping(initialData.employmentTypeDocumentMappingId, payload);
        toast.success('Mapping updated successfully');
      } else {
        const payload = {
          employmentTypeId: Number(selectedEmploymentTypeId),
          customerDocumentTypeId: Number(customerDocumentTypeId),
          isMandatory,
          isActive,
          createdBy: Number(getCurrentUserId()) || 1
        };
        
        await createMapping(payload);
        toast.success('Document mapping created successfully.');
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save mapping:', err);
      const errorMessage = getErrorMessage(err, 'Failed to save mapping');
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Resolve employment type name
  const empName = isEdit 
    ? initialData.employmentTypeName 
    : employmentTypes?.find(e => String(e.employmentTypeId) === String(selectedEmploymentTypeId))?.employmentTypeName || '';

  const savedCategoryName = hasSavedCategory
    ? customerDocumentTypes.find(c => String(c.customerDocumentTypeId) === String(initialData.customerDocumentTypeId))?.documentTypeName
      || initialData.customerDocumentTypeName
      || `Category #${initialData.customerDocumentTypeId}`
    : '';

  return (
    <MasterModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEdit ? 'Edit Document Mapping' : 'Assign Document to Employment Type'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        
        <div className="form-group">
          <label className="form-label">Employment Type <span className="text-danger">*</span></label>
          <input
            type="text"
            className="form-input"
            value={empName}
            disabled
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="customerDocumentTypeId" className="form-label">
            Customer Document Category <span className="text-danger">*</span>
          </label>
          {hasSavedCategory ? (
            <input
              type="text"
              className="form-input"
              value={savedCategoryName}
              disabled
            />
          ) : (
            <select
              id="customerDocumentTypeId"
              name="customerDocumentTypeId"
              className={`form-input ${error && error.includes('Category') ? 'form-input-error' : ''}`}
              value={customerDocumentTypeId}
              onChange={(e) => {
                setCustomerDocumentTypeId(e.target.value);
                if (error) setError(null);
              }}
              disabled={isSubmitting}
              required
            >
              <option value="">
                {activeCategories.length === 0 ? 'No active categories configured' : 'Select Customer Document Category'}
              </option>
              {activeCategories.map((category) => (
                <option key={category.customerDocumentTypeId} value={category.customerDocumentTypeId}>
                  {category.documentTypeName}{category.documentTypeCode ? ` (${category.documentTypeCode})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
          <label htmlFor="isMandatory" className="form-label" style={{ marginBottom: 0 }}>
            Mandatory Requirement
          </label>
          <input
            id="isMandatory"
            type="checkbox"
            checked={isMandatory}
            onChange={(e) => setIsMandatory(e.target.checked)}
            disabled={isSubmitting}
            style={{ width: '16px', height: '16px' }}
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
