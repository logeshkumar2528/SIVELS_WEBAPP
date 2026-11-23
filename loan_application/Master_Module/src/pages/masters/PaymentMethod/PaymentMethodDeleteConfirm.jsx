import { useState } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { deletePaymentMethod } from '../../../api/masters/paymentMethodApi';
import { getErrorMessage } from '../../../utils/errorHelper';

const getId = (row) => row?.paymentMethodId ?? row?.PaymentMethodId ?? row?.id;
const getName = (row) => row?.paymentMethodName ?? row?.PaymentMethodName ?? '';

export function PaymentMethodDeleteConfirm({ isOpen, onClose, onSuccess, record }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    const id = getId(record);
    if (!id) return;
    setIsSubmitting(true);
    try {
      await deletePaymentMethod(id);
      toast.success('Deleted successfully');
      onSuccess();
      onClose();
    } catch (err) {
      if (err.response?.status === 404 && !err.response?.data?.message) {
        toast.error('Record not found.');
      } else {
        toast.error(getErrorMessage(err, 'Request failed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!record) return null;

  return (
    <MasterModal isOpen={isOpen} onClose={onClose} title="Delete Payment Method?">
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
