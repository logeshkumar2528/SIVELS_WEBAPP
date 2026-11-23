import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import {
  createPaymentMethod,
  updatePaymentMethod,
  getPaymentMethodById,
} from '../../../api/masters/paymentMethodApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './PaymentMethod.css';

const getId = (row) => row?.paymentMethodId ?? row?.PaymentMethodId ?? row?.id;

export function PaymentMethodForm({ isOpen, onClose, onSuccess, initialData }) {
  const [paymentMethodName, setPaymentMethodName] = useState('');
  const [paymentMethodCode, setPaymentMethodCode] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (!isOpen) return undefined;
    let isMounted = true;

    const loadData = async () => {
      if (initialData) {
        setIsLoading(true);
        try {
          const id = getId(initialData);
          if (!id) throw new Error('Missing paymentMethodId on selected record');
          const response = await getPaymentMethodById(id);
          const record = response?.data || response?.value || response;
          if (isMounted) {
            setPaymentMethodName(record.paymentMethodName || record.PaymentMethodName || '');
            setPaymentMethodCode(record.paymentMethodCode || record.PaymentMethodCode || '');
            setDescription(record.description || record.Description || '');
            setIsActive(record.isActive !== false && record.IsActive !== false);
          }
        } catch (err) {
          if (isMounted) {
            toast.error(getErrorMessage(err, 'Failed to load latest record data.'));
            onClose();
          }
        } finally {
          if (isMounted) setIsLoading(false);
        }
      } else {
        setPaymentMethodName('');
        setPaymentMethodCode('');
        setDescription('');
        setIsActive(true);
      }
      setError(null);
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, initialData, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = paymentMethodName.trim();
    const trimmedCode = paymentMethodCode.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setError('Payment Method Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Payment Method Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const id = getId(initialData);
        await updatePaymentMethod(id, {
          paymentMethodId: Number(id),
          paymentMethodName: trimmedName,
          paymentMethodCode: trimmedCode,
          description: trimmedDescription || null,
          modifiedBy: getCurrentUserId(),
          isActive,
        });
        toast.success('Updated successfully');
      } else {
        await createPaymentMethod({
          paymentMethodName: trimmedName,
          paymentMethodCode: trimmedCode,
          description: trimmedDescription || null,
          createdBy: getCurrentUserId(),
          isActive,
        });
        toast.success('Created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Form submission failed:', err);
      if (err.response?.status === 400 && err.response?.data?.ModelState) {
        setError('Validation failed. Please check your input.');
      } else {
        toast.error(getErrorMessage(err, 'Request failed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <MasterModal isOpen={isOpen} onClose={onClose} title="Loading...">
        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading record...</div>
      </MasterModal>
    );
  }

  return (
    <MasterModal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Payment Method' : 'Add Payment Method'}>
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="paymentMethodName" className="form-label">
            Payment Method Name <span className="text-danger">*</span>
          </label>
          <input
            id="paymentMethodName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={paymentMethodName}
            onChange={(e) => {
              setPaymentMethodName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. UPI Payment"
            maxLength={100}
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="paymentMethodCode" className="form-label">
            Payment Method Code <span className="text-danger">*</span>
          </label>
          <input
            id="paymentMethodCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={paymentMethodCode}
            onChange={(e) => {
              setPaymentMethodCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. UPI"
            maxLength={30}
            disabled={isSubmitting}
          />
          {error && error.includes('Code') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="paymentMethodDescription" className="form-label">
            Description
          </label>
          <textarea
            id="paymentMethodDescription"
            className="form-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            maxLength={300}
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        <MasterStatusCheckbox isActive={isActive} onChange={setIsActive} disabled={isSubmitting} />

        <div className="form-actions">
          <button type="button" className="masters-btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="masters-btn-primary" disabled={isSubmitting}>
            {isSubmitting ? (isEdit ? 'Updating...' : 'Saving...') : isEdit ? 'Update' : 'Save'}
          </button>
        </div>
      </form>
    </MasterModal>
  );
}
