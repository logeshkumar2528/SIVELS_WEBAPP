import { useState } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { deleteAssessmentMethod } from '../../../api/masters/assessmentMethodApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';

export function AssessmentMethodDeleteConfirm({ isOpen, onClose, onSuccess, record }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    if (!record || !record.assessmentMethodId) {
      console.error('Missing assessmentMethodId for deletion');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const userId = getCurrentUserId();
      await deleteAssessmentMethod(record.assessmentMethodId, userId);
      toast.success('Deleted successfully');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
      
      if (err.response?.status === 404 && !err.response?.data?.message) {
        toast.error('Record not found.');
      } else {
        const errorMessage = getErrorMessage(err, 'Request failed');
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!record) return null;

  return (
    <MasterModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Delete Assessment Method?"
    >
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          Are you sure you want to delete <br />
          <strong>"{record.methodName}"</strong>?
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-danger)', marginTop: 'var(--spacing-xs)' }}>
          This action cannot be undone.
        </p>
      </div>
      <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)' }}>
        <button 
          type="button" 
          className="masters-btn-secondary" 
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button 
          type="button" 
          className="masters-btn-danger masters-btn-primary" 
          onClick={handleDelete}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </MasterModal>
  );
}
