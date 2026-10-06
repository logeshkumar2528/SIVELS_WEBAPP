import { useState } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { deleteMortgageStatus } from '../../../api/masters/mortgageStatusApi';
import { getErrorMessage } from '../../../utils/errorHelper';

export function MortgageStatusDeleteConfirm({ isOpen, onClose, onSuccess, record }) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!record) return null;

  const handleDelete = async () => {
    if (!record || !record.mortgageStatusId) {
      console.error('Missing mortgageStatusId for deletion');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await deleteMortgageStatus(record.mortgageStatusId);
      const msg = response?.message || 'Deleted successfully';
      toast.success(msg);
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
      setIsDeleting(false);
    }
  };

  return (
    <MasterModal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Mortgage Status?"
    >
      <div style={{ padding: 'var(--spacing-md) 0' }}>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          Are you sure you want to delete <br />
          <strong>"{record.mortgageStatusName}"</strong>?
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
          disabled={isDeleting}
        >
          Cancel
        </button>
        <button
          type="button"
          className="masters-btn-primary"
          style={{ backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </MasterModal>
  );
}
