import { useState } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { deleteCountry } from '../../../api/masters/countryApi';
import { getErrorMessage } from '../../../utils/errorHelper';

export function CountryDeleteConfirm({ isOpen, onClose, onSuccess, record }) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!record) return null;

  const handleDelete = async () => {
    if (!record || !record.countryId) {
      console.error('Missing countryId for deletion');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await deleteCountry(record.countryId);
      const msg = response?.message || 'Deactivated successfully';
      toast.success(msg);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
      
      if (!err?.response) {
        toast.error('Unable to connect to the server.');
      } else if (err.response.status === 404) {
        toast.error('Country not found.');
      } else if (err.response.status === 500) {
        toast.error('Something went wrong. Please try again.');
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
      title="Delete Country?"
    >
      <div style={{ padding: 'var(--spacing-md) 0' }}>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          Are you sure you want to deactivate <br />
          <strong>"{record.countryName}"</strong>?
        </p>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          This action will mark the record as inactive.
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
          {isDeleting ? 'Deactivating...' : 'Delete'}
        </button>
      </div>
    </MasterModal>
  );
}
