import { useState } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { deleteLoanProductTenure } from '../../../api/masters/loanProductTenureApi';
import { getErrorMessage } from '../../../utils/errorHelper';

export function LoanProductTenureDeleteConfirm({ isOpen, onClose, onSuccess, record }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    const id = record?.loanProductTenureId ?? record?.LoanProductTenureId ?? record?.productTenureId ?? record?.id;
    if (!id) {
      console.error('Missing loanProductTenureId for deletion');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await deleteLoanProductTenure(id);
      toast.success('Deleted successfully');
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
      setIsSubmitting(false);
    }
  };

  if (!record) return null;

  return (
    <MasterModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Delete Loan Product Tenure?"
    >
      <div style={{ padding: 'var(--spacing-md) 0' }}>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          Are you sure you want to delete tenure <br />
          <strong>"{record.tenureCode || record.TenureCode} ({record.tenureValue || record.TenureValue} {record.tenureUnit || record.TenureUnit || 'Months'})"</strong>?
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
          disabled={isSubmitting}
        >
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
