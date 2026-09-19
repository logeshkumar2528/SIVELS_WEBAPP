import { useState } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { deleteHealthCheckType } from '../../../api/masters/healthCheckTypeApi';
import { getErrorMessage } from '../../../utils/errorHelper';

const getId = (row) =>
  row?.healthCheckTypeId ??
  row?.HealthCheckTypeId ??
  row?.id ??
  row?.Id;

export function HealthCheckTypeDeleteConfirm({ isOpen, onClose, onSuccess, record }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    const recordId = getId(record);
    if (!recordId) {
      console.error('Missing healthCheckTypeId for deletion');
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteHealthCheckType(recordId);
      toast.success('Health Check Type deleted successfully');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);

      if (err.response?.status === 404 && !err.response?.data?.message) {
        toast.error('Record not found.');
      } else {
        const errorMessage = getErrorMessage(err, 'Failed to delete Health Check Type record.');
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!record) return null;

  const checkName = record?.checkName || record?.CheckName || `ID #${getId(record)}`;

  return (
    <MasterModal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Health Check Type?"
    >
      <div style={{ marginBottom: 'var(--spacing-xl, 20px)' }}>
        <p style={{ fontSize: 'var(--font-size-sm, 14px)', color: 'var(--color-text-secondary, #64748b)' }}>
          Are you sure you want to delete <strong>"{checkName}"</strong>?
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-danger, #ef4444)', marginTop: 'var(--spacing-xs, 4px)' }}>
          This will mark the record as inactive.
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
          className="masters-btn-danger masters-btn-primary"
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

export default HealthCheckTypeDeleteConfirm;
