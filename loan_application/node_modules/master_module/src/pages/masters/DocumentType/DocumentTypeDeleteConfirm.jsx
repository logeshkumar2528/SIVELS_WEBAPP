import { useState } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { deleteDocumentType } from '../../../api/masters/documentTypeApi';
import { getErrorMessage } from '../../../utils/errorHelper';

export function DocumentTypeDeleteConfirm({
  isOpen,
  onClose,
  onSuccess,
  record,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    if (!record?.documentTypeId) {
      console.error('Missing documentTypeId for deletion.');
      toast.error('Unable to delete: document type ID is missing.');
      return;
    }

    setIsSubmitting(true);

    try {
      await deleteDocumentType(record.documentTypeId);

      toast.success('Document type deleted successfully.');

      onClose();

      await onSuccess();
    } catch (err) {
      console.error('Delete document type failed:', err);

      const status = err?.response?.status;
      const responseData = err?.response?.data;

      // Document type is already mapped to an employment type.
      if (status === 409) {
        const message =
          responseData?.message ||
          responseData?.Message ||
          'This document type cannot be deleted because it is currently mapped to an employment type.';

        toast.error(message);
        return;
      }

      // Document type was not found.
      if (status === 404) {
        const message =
          responseData?.message ||
          responseData?.Message ||
          'Document type not found.';

        toast.error(message);
        return;
      }

      // Validation error.
      if (status === 400) {
        const message =
          responseData?.message ||
          responseData?.Message ||
          'Invalid delete request.';

        toast.error(message);
        return;
      }

      // Any unexpected server/network error.
      const errorMessage = getErrorMessage(
        err,
        'Failed to delete document type.'
      );

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!record) {
    return null;
  }

  return (
    <MasterModal
      isOpen={isOpen}
      onClose={isSubmitting ? undefined : onClose}
      title="Delete Document Type?"
    >
      <div style={{ padding: 'var(--spacing-md) 0' }}>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          Are you sure you want to delete <br />
          <strong>"{record.documentTypeName}"</strong>?
        </p>

        <p
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          This action cannot be undone.
        </p>
      </div>

      <div
        className="form-actions"
        style={{ marginTop: 'var(--spacing-xl)' }}
      >
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
          style={{
            backgroundColor: 'var(--color-danger)',
            borderColor: 'var(--color-danger)',
          }}
          onClick={handleDelete}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </MasterModal>
  );
}