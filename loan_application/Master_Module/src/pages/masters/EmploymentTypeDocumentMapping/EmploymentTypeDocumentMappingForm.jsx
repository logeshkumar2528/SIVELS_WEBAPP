import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { updateMapping, createMapping } from '../../../api/masters/employmentTypeDocumentMappingApi';
import { getDocumentTypes } from '../../../api/masters/documentTypeApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './EmploymentTypeDocumentMapping.css';

export function EmploymentTypeDocumentMappingForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialData, 
  existingMappings, 
  selectedEmploymentTypeId,
  employmentTypes
}) {
  const [documentTypeId, setDocumentTypeId] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);
  const [isActive, setIsActive] = useState(true);
  
  const [documentTypes, setDocumentTypes] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (!isOpen) return;

    if (isEdit) {
      setIsMandatory(initialData.isMandatory !== false);
      setIsActive(initialData.isActive !== false);
      setDocumentTypeId(initialData.documentTypeId);
    } else {
      setIsMandatory(false); // Optional by default
      setIsActive(true); // Active by default
      setDocumentTypeId('');
      
      // Fetch document types for creation
      const fetchDocs = async () => {
        setIsLoadingDocs(true);
        try {
          const response = await getDocumentTypes();
          const docs = Array.isArray(response) ? response : (response.data || response.value || []);
          setDocumentTypes(docs.filter(d => d.isActive !== false));
        } catch (err) {
          console.error('Failed to load document types:', err);
          toast.error('Failed to load document types');
        } finally {
          setIsLoadingDocs(false);
        }
      };
      
      fetchDocs();
    }
    setError(null);
  }, [isOpen, initialData, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError(null);

    // Validation
    if (!isEdit) {
      if (!selectedEmploymentTypeId) {
        setError('Employment Type is required.');
        return;
      }
      if (!documentTypeId) {
        setError('Document Type is required.');
        return;
      }
      
      // Check duplicate
      const isDuplicate = existingMappings?.some(
        mapping => String(mapping.documentTypeId) === String(documentTypeId) && mapping.isActive
      );
      
      if (isDuplicate) {
        const msg = 'This document is already mapped to this employment type.';
        setError(msg);
        toast.error(msg);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          employmentTypeDocumentMappingId: initialData.employmentTypeDocumentMappingId,
          employmentTypeId: initialData.employmentTypeId,
          documentTypeId: initialData.documentTypeId,
          isMandatory,
          isActive,
          modifiedBy: Number(getCurrentUserId()) || 1
        };
        
        await updateMapping(initialData.employmentTypeDocumentMappingId, payload);
        toast.success('Mapping updated successfully');
      } else {
        const payload = {
          employmentTypeId: Number(selectedEmploymentTypeId),
          documentTypeId: Number(documentTypeId),
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
          <label htmlFor="documentTypeId" className="form-label">
            Document Type <span className="text-danger">*</span>
          </label>
          {isEdit ? (
            <input
              type="text"
              className="form-input"
              value={initialData.documentTypeName || ''}
              disabled
            />
          ) : (
            <select
              id="documentTypeId"
              name="documentTypeId"
              className={`form-input ${error && error.includes('Document') ? 'form-input-error' : ''}`}
              value={documentTypeId}
              onChange={(e) => {
                setDocumentTypeId(e.target.value);
                if (error) setError(null);
              }}
              disabled={isSubmitting || isLoadingDocs}
              required
            >
              <option value="">
                {isLoadingDocs ? 'Loading documents...' : 'Select Document Type'}
              </option>
              {documentTypes.map((doc) => (
                <option key={doc.documentTypeId} value={doc.documentTypeId}>
                  {doc.documentTypeName} ({doc.documentTypeCode})
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
