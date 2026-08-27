import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createRelationship, updateRelationship, getRelationshipById } from '../../../api/masters/relationshipApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './Relationship.css'; // Shared CSS

export function RelationshipForm({ isOpen, onClose, onSuccess, initialData }) {
  const [relationshipName, setRelationshipName] = useState('');
  const [relationshipCode, setRelationshipCode] = useState('');
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
          if (!initialData.relationshipId) {
            throw new Error('Missing relationshipId on selected record');
          }
          // Fetch latest record before editing
          const response = await getRelationshipById(initialData.relationshipId);
          const record = response.data || response;
          if (isMounted) {
            setRelationshipName(record.relationshipName || '');
            setRelationshipCode(record.relationshipCode || '');
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
        setRelationshipName('');
        setRelationshipCode('');
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
    
    const trimmedName = relationshipName.trim();
    const trimmedCode = relationshipCode.trim();

    if (!trimmedName) {
      setError('Relationship Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Relationship Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          relationshipId: initialData.relationshipId,
          relationshipName: trimmedName,
          relationshipCode: trimmedCode,
          modifiedBy: getCurrentUserId(),
          isActive
        };
        await updateRelationship(initialData.relationshipId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          relationshipName: trimmedName,
          relationshipCode: trimmedCode,
          createdBy: getCurrentUserId(),
          isActive
        };
        await createRelationship(payload);
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
      title={isEdit ? 'Edit Relationship' : 'Add Relationship'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="relationshipName" className="form-label">
            Relationship Name <span className="text-danger">*</span>
          </label>
          <input
            id="relationshipName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={relationshipName}
            onChange={(e) => {
              setRelationshipName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Self"
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="relationshipCode" className="form-label">
            Relationship Code <span className="text-danger">*</span>
          </label>
          <input
            id="relationshipCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={relationshipCode}
            onChange={(e) => {
              setRelationshipCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. SELF"
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
