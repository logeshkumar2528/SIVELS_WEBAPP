import { useState } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { deleteCustomerDocumentType } from '../../../api/masters/customerDocumentTypeApi';
import { getErrorMessage } from '../../../utils/errorHelper';

export function CustomerDocumentTypeDeleteConfirm({ isOpen, onClose, onSuccess, record }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    if (!record?.customerDocumentTypeId) {
      toast.error('Unable to delete: customer document type ID is missing.');
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteCustomerDocumentType(record.customerDocumentTypeId);
      toast.success('Customer document category deleted successfully.');
      onClose();
      await onSuccess();
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      const serverMessage = data?.message || data?.Message;

      if (status === 409) {
        toast.error(serverMessage || 'This category cannot be deleted because it is mapped to an employment type or used by customer documents.');
      } else if (status === 404) {
        toast.error(serverMessage || 'Customer document category not found.');
      } else if (status === 400) {
        toast.error(serverMessage || 'Invalid delete request.');
      } else {
        toast.error(getErrorMessage(err, 'Failed to delete customer document category.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!record) return null;

  return (
    <MasterModal
      isOpen={isOpen}
      onClose={isSubmitting ? undefined : onClose}
      title="Delete Customer Document Category?"
    >
      <div style={{ padding: 'var(--spacing-md) 0' }}>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          Are you sure you want to delete <br />
          <strong>"{record.documentTypeName}"</strong>?
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
