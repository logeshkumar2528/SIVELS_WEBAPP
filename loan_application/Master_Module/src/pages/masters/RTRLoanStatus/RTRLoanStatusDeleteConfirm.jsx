import { useState } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { deleteRtrLoanStatus } from '../../../api/masters/rtrLoanStatusApi';
import { getErrorMessage } from '../../../utils/errorHelper';

const getId = (row) =>
  row?.rtrLoanStatusId ??
  row?.RtrLoanStatusId ??
  row?.id ??
  row?.Id;

export function RTRLoanStatusDeleteConfirm({ isOpen, onClose, onSuccess, record }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    const recordId = getId(record);
    if (!recordId) {
      console.error('Missing rtrLoanStatusId for deletion');
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteRtrLoanStatus(recordId);
      toast.success('RTR Loan Status deleted successfully');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);

      if (err.response?.status === 404 && !err.response?.data?.message) {
        toast.error('Record not found.');
      } else {
        const errorMessage = getErrorMessage(err, 'Failed to delete RTR Loan Status record.');
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!record) return null;

  const displayName = record?.statusName || record?.StatusName || record?.statusCode || record?.StatusCode || `ID #${getId(record)}`;

  return (
    <MasterModal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete RTR Loan Status?"
    >
      <div style={{ marginBottom: 'var(--spacing-xl, 20px)' }}>
        <p style={{ fontSize: 'var(--font-size-sm, 14px)', color: 'var(--color-text-secondary, #64748b)' }}>
          Are you sure you want to delete <strong>"{displayName}"</strong>?
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-danger, #ef4444)', marginTop: 'var(--spacing-xs, 4px)' }}>
          This will permanently delete or inactivate the record.
        </p>
      </div>

      <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm, 8px)' }}>
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
          style={{ backgroundColor: 'var(--color-danger, #ef4444)', borderColor: 'var(--color-danger, #ef4444)' }}
          onClick={handleDelete}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </MasterModal>
  );
}

export default RTRLoanStatusDeleteConfirm;
