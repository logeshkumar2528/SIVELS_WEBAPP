import { useState } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { deleteStatusRole } from '../../../api/masters/statusRoleApi';
import { getErrorMessage } from '../../../utils/errorHelper';

export function StatusRoleDeleteConfirm({ isOpen, onClose, onSuccess, record }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    if (!record || !record.statusRoleId) {
      console.error('Missing statusRoleId for deletion');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await deleteStatusRole(record.statusRoleId);
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
      title="Delete Status Role?"
    >
      <div style={{ padding: 'var(--spacing-md) 0' }}>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          Are you sure you want to delete <br />
          <strong>"{record.roleName}"</strong>?
        </p>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          This action cannot be undone.
        </p>
      </div>

      <div className="form-actions" style={{ marginTop: 'var(--spacing-xl)' }}>
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
          className="masters-btn-primary" 
          style={{ backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
          onClick={handleDelete}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </MasterModal>
  );
}
