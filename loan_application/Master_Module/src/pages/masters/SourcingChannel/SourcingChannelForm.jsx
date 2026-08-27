import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createSourcingChannel, updateSourcingChannel, getSourcingChannelById } from '../../../api/masters/sourcingChannelApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './SourcingChannel.css'; // Shared CSS

export function SourcingChannelForm({ isOpen, onClose, onSuccess, initialData }) {
  const [sourcingChannelName, setSourcingChannelName] = useState('');
  const [sourcingChannelCode, setSourcingChannelCode] = useState('');
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
          if (!initialData.sourcingChannelId) {
            throw new Error('Missing sourcingChannelId on selected record');
          }
          // Fetch latest record before editing
          const response = await getSourcingChannelById(initialData.sourcingChannelId);
          const record = response.data || response;
          if (isMounted) {
            setSourcingChannelName(record.sourcingChannelName || '');
            setSourcingChannelCode(record.sourcingChannelCode || '');
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
        setSourcingChannelName('');
        setSourcingChannelCode('');
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
    
    const trimmedName = sourcingChannelName.trim();
    const trimmedCode = sourcingChannelCode.trim();

    if (!trimmedName) {
      setError('Sourcing Channel Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Sourcing Channel Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          sourcingChannelId: initialData.sourcingChannelId,
          sourcingChannelName: trimmedName,
          sourcingChannelCode: trimmedCode,
          modifiedBy: getCurrentUserId(),
          isActive
        };
        await updateSourcingChannel(initialData.sourcingChannelId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          sourcingChannelName: trimmedName,
          sourcingChannelCode: trimmedCode,
          createdBy: getCurrentUserId(),
          isActive
        };
        await createSourcingChannel(payload);
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
      title={isEdit ? 'Edit Sourcing Channel' : 'Add Sourcing Channel'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="sourcingChannelName" className="form-label">
            Sourcing Channel Name <span className="text-danger">*</span>
          </label>
          <input
            id="sourcingChannelName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={sourcingChannelName}
            onChange={(e) => {
              setSourcingChannelName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Direct Selling Agent"
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="sourcingChannelCode" className="form-label">
            Sourcing Channel Code <span className="text-danger">*</span>
          </label>
          <input
            id="sourcingChannelCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={sourcingChannelCode}
            onChange={(e) => {
              setSourcingChannelCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. DSA"
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
