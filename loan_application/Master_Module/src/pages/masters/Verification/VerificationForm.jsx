import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createVerification, updateVerification, getVerificationById } from '../../../api/masters/verificationApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import './Verification.css'; // Shared CSS

export function VerificationForm({ isOpen, onClose, onSuccess, initialData }) {
  const [verificationName, setVerificationName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

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
          if (!initialData.verificationId) {
            throw new Error('Missing verificationId on selected record');
          }
          // Fetch latest record before editing
          const response = await getVerificationById(initialData.verificationId);
          const record = response.value || response.data || response;
          if (isMounted) {
            setVerificationName(record.verificationName || '');
            setVerificationCode(record.verificationCode || '');
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
        setVerificationName('');
        setVerificationCode('');
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

    const trimmedName = verificationName.trim();
    const trimmedCode = verificationCode.trim();

    if (!trimmedName) {
      setError('Verification Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Verification Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          verificationId: initialData.verificationId,
          verificationName: trimmedName,
          verificationCode: trimmedCode,
          modifiedBy: getCurrentUserId(),
        };
        await updateVerification(initialData.verificationId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          verificationName: trimmedName,
          verificationCode: trimmedCode,
          createdBy: getCurrentUserId(),
        };
        await createVerification(payload);
        toast.success('Created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Form submission failed:', err);

      if (err.response?.status === 409) {
        const backendMsg = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null);
        const errorText = backendMsg || 'Verification code or verification name already exists.';
        setError(errorText);
        toast.error(errorText);
      } else if (err.response?.status === 400 && err.response?.data?.ModelState) {
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
      title={isEdit ? 'Edit Verification' : 'Add Verification'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="verificationName" className="form-label">
            Verification Name <span className="text-danger">*</span>
          </label>
          <input
            id="verificationName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={verificationName}
            onChange={(e) => {
              setVerificationName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Pending"
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="verificationCode" className="form-label">
            Verification Code <span className="text-danger">*</span>
          </label>
          <input
            id="verificationCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={verificationCode}
            onChange={(e) => {
              setVerificationCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. PENDING"
            disabled={isSubmitting}
          />
          {error && error.includes('Code') && <span className="form-error-msg">{error}</span>}
        </div>

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
