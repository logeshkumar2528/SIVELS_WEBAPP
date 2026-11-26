import { useState } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { deleteScheduleMethod } from '../../../api/masters/scheduleMethodApi';
import { getErrorMessage } from '../../../utils/errorHelper';

const getId = (row) => row?.scheduleMethodId ?? row?.ScheduleMethodId ?? row?.id;
const getName = (row) => row?.scheduleMethodName ?? row?.ScheduleMethodName ?? '';

const resolveApiError = (err, fallback) => {
  const status = err?.response?.status;
  if (status === 401) return getErrorMessage(err, 'Session expired or missing token. Please sign in again.');
  if (status === 403) return getErrorMessage(err, 'You are not authorized to perform this action.');
  if (status === 404) return getErrorMessage(err, 'Record not found.');
  if (status === 409) return getErrorMessage(err, 'This schedule method cannot be deleted because it is in use.');
  if (status === 500) return getErrorMessage(err, 'Server error. Please try again later.');
  return getErrorMessage(err, fallback);
};

export function ScheduleMethodDeleteConfirm({ isOpen, onClose, onSuccess, record }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    const id = getId(record);
    if (!id) return;
    setIsSubmitting(true);
    try {
      await deleteScheduleMethod(id);
      toast.success('Schedule Method deleted successfully');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(resolveApiError(err, 'Request failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!record) return null;

  return (
    <MasterModal isOpen={isOpen} onClose={onClose} title="Delete Schedule Method?">
      <div style={{ padding: 'var(--spacing-md) 0' }}>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          Are you sure you want to delete <br />
          <strong>&quot;{getName(record)}&quot;</strong>?
        </p>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          This action cannot be undone.
        </p>
      </div>
      <div className="form-actions" style={{ marginTop: 'var(--spacing-xl)' }}>
        <button type="button" className="masters-btn-secondary" onClick={onClose} disabled={isSubmitting}>
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
