import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createTitle, updateTitle, getTitleById } from '../../../api/masters/titleApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './Title.css'; // Shared CSS

export function TitleForm({ isOpen, onClose, onSuccess, initialData }) {
  const [titleName, setTitleName] = useState('');
  const [titleCode, setTitleCode] = useState('');
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
          if (!initialData.titleID) {
            throw new Error('Missing titleID on selected record');
          }
          // Fetch latest record before editing
          const response = await getTitleById(initialData.titleID);
          const record = response.data || response;
          if (isMounted) {
            setTitleName(record.titleName || '');
            setTitleCode(record.titleCode || '');
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
        setTitleName('');
        setTitleCode('');
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
    
    const trimmedName = titleName.trim();
    const trimmedCode = titleCode.trim();

    if (!trimmedName) {
      setError('Title Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Title Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          titleID: initialData.titleID,
          titleName: trimmedName,
          titleCode: trimmedCode,
          modifiedBy: getCurrentUserId(),
          isActive
        };
        await updateTitle(initialData.titleID, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          titleName: trimmedName,
          titleCode: trimmedCode,
          createdBy: getCurrentUserId(),
          isActive
        };
        await createTitle(payload);
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
      title={isEdit ? 'Edit Title' : 'Add Title'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="titleName" className="form-label">
            Title Name <span className="text-danger">*</span>
          </label>
          <input
            id="titleName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={titleName}
            onChange={(e) => {
              setTitleName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Mr"
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="titleCode" className="form-label">
            Title Code <span className="text-danger">*</span>
          </label>
          <input
            id="titleCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={titleCode}
            onChange={(e) => {
              setTitleCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. MR"
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
