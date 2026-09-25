import { useState } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { deleteProofMaster } from '../../../api/masters/proofMasterApi';
import { getErrorMessage } from '../../../utils/errorHelper';

export function ProofMasterDeleteConfirm({
  isOpen,
  onClose,
  onSuccess,
  record,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    if (!record?.proofId) {
      console.error('Missing proofId for deletion.');
      toast.error('Unable to delete: proof ID is missing.');
      return;
    }

    setIsSubmitting(true);

    try {
      await deleteProofMaster(record.proofId);
      toast.success('Proof deleted successfully.');
      onClose();
      await onSuccess();
    } catch (err) {
      console.error('Delete proof failed:', err);

      const status = err?.response?.status;
      const responseData = err?.response?.data;

      if (status === 404) {
        const message =
          responseData?.message ||
          responseData?.Message ||
          'Proof not found.';
        toast.error(message);
        return;
      }

      if (status === 400) {
        const message =
          responseData?.message ||
          responseData?.Message ||
          'Invalid delete request.';
        toast.error(message);
        return;
      }

      const errorMessage = getErrorMessage(err, 'Failed to delete proof.');
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
      title="Delete Proof?"
    >
      <div style={{ padding: 'var(--spacing-md) 0' }}>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          Are you sure you want to delete <br />
          <strong>"{record.proofName || record.proofCode}"</strong>?
        </p>

        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          This action will deactivate this proof master record.
        </p>
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
          type="button"
          className="masters-btn-danger"
          onClick={handleDelete}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </MasterModal>
  );
}
