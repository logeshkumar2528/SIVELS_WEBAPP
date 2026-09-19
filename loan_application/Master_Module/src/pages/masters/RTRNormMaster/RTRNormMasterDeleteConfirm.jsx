import { useState } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { deleteRTRNormMaster } from '../../../api/masters/rtrNormMasterApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';

const getId = (row) =>
  row?.rtrNormMasterId ??
  row?.RTRNormMasterId ??
  row?.RtrNormMasterId ??
  row?.id ??
  row?.Id;

const getMinMOB = (row) => row?.minMOB ?? row?.MinMOB ?? row?.minMob ?? row?.MinMob;
const getMaxMOB = (row) => row?.maxMOB ?? row?.MaxMOB ?? row?.maxMob ?? row?.MaxMob;

export function RTRNormMasterDeleteConfirm({ isOpen, onClose, onSuccess, record }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    const recordId = getId(record);
    if (!recordId) {
      console.error('Missing rtrNormMasterId for deletion');
      return;
    }

    setIsSubmitting(true);
    try {
      const userId = getCurrentUserId() || 1;
      await deleteRTRNormMaster(recordId, userId);
      toast.success('RTR Norm deleted successfully');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);

      if (err.response?.status === 404 && !err.response?.data?.message) {
        toast.error('Record not found.');
      } else {
        const errorMessage = getErrorMessage(err, 'Failed to delete RTR Norm record.');
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!record) return null;

  const minMob = getMinMOB(record);
  const maxMob = getMaxMOB(record);
  const mobLabel = minMob != null
    ? `${minMob}${maxMob != null ? ` - ${maxMob}` : '+'} MOB`
    : `ID #${getId(record)}`;

  return (
    <MasterModal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete RTR Norm?"
    >
      <div style={{ marginBottom: 'var(--spacing-xl, 20px)' }}>
        <p style={{ fontSize: 'var(--font-size-sm, 14px)', color: 'var(--color-text-secondary, #64748b)' }}>
          Are you sure you want to delete this RTR Norm ({mobLabel})?
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

export default RTRNormMasterDeleteConfirm;
