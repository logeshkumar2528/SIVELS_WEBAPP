import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FileSpreadsheet } from 'lucide-react';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import {
  createRtrLoanStatus,
  getRtrLoanStatusById,
  updateRtrLoanStatus,
} from '../../../api/masters/rtrLoanStatusApi';
import { getErrorMessage } from '../../../utils/errorHelper';
import './RTRLoanStatus.css';

const getId = (row) =>
  row?.rtrLoanStatusId ??
  row?.RtrLoanStatusId ??
  row?.id ??
  row?.Id;

export function RTRLoanStatusForm({
  isOpen,
  onClose,
  onSuccess,
  editingRecord,
}) {
  const [statusCode, setStatusCode] = useState('');
  const [statusName, setStatusName] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(editingRecord);

  useEffect(() => {
    if (!isOpen) return undefined;
    let mounted = true;

    const loadData = async () => {
      setError('');
      if (!editingRecord) {
        setStatusCode('');
        setStatusName('');
        setIsActive(true);
        return;
      }

      setIsLoading(true);
      try {
        const recordId = getId(editingRecord);
        if (!recordId) {
          throw new Error('Missing rtrLoanStatusId on selected record');
        }
        const response = await getRtrLoanStatusById(recordId);
        const record = response?.data || response?.value || response;
        if (mounted) {
          const rawIsActive =
            record?.isActive ??
            record?.IsActive ??
            record?.active ??
            record?.Active;
          const normalizedIsActive =
            rawIsActive === true || rawIsActive === 1 || rawIsActive === '1';

          setStatusCode(record?.statusCode || record?.StatusCode || '');
          setStatusName(record?.statusName || record?.StatusName || '');
          setIsActive(normalizedIsActive);
        }
      } catch (err) {
        // Fallback to record in props if getById fails
        if (mounted) {
          const rawIsActive =
            editingRecord?.isActive ??
            editingRecord?.IsActive ??
            editingRecord?.active ??
            editingRecord?.Active;
          setStatusCode(editingRecord?.statusCode || editingRecord?.StatusCode || '');
          setStatusName(editingRecord?.statusName || editingRecord?.StatusName || '');
          setIsActive(rawIsActive !== false);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, [editingRecord, isOpen]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const trimmedCode = statusCode.trim();
    const trimmedName = statusName.trim();

    if (!trimmedCode) {
      setError('Status Code is required.');
      return;
    }
    if (!trimmedName) {
      setError('Status Name is required.');
      return;
    }

    setIsSubmitting(true);
    const recordId = getId(editingRecord);

    try {
      if (isEdit) {
        const payload = {
          rtrLoanStatusId: recordId,
          statusCode: trimmedCode,
          statusName: trimmedName,
          isActive: Boolean(isActive),
        };
        await updateRtrLoanStatus(recordId, payload);
        toast.success('RTR Loan Status updated successfully');
      } else {
        const payload = {
          statusCode: trimmedCode,
          statusName: trimmedName,
          isActive: Boolean(isActive),
        };
        await createRtrLoanStatus(payload);
        toast.success('RTR Loan Status created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      const message = getErrorMessage(
        err,
        isEdit ? 'Unable to update RTR Loan Status record.' : 'Unable to create RTR Loan Status record.'
      );
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <MasterModal isOpen={isOpen} onClose={onClose} title="Loading...">
        <div style={{ padding: 'var(--spacing-xl, 24px)', textAlign: 'center' }}>
          Loading RTR Loan Status record...
        </div>
      </MasterModal>
    );
  }

  return (
    <MasterModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit RTR Loan Status' : 'Add RTR Loan Status'}
      icon={<FileSpreadsheet size={24} />}
      subtitle={
        isEdit
          ? 'Update RTR loan status details'
          : 'Configure a new RTR loan status'
      }
    >
      <form onSubmit={handleSubmit} className="rtr-loan-status-form" noValidate>
        {error && <div className="form-error-msg" style={{ fontSize: '0.875rem' }}>{error}</div>}

        <div className="form-group">
          <label htmlFor="rtr-status-code" className="form-label">
            Status Code <span className="text-danger">*</span>
          </label>
          <input
            id="rtr-status-code"
            type="text"
            className={`form-input ${error && !statusCode.trim() ? 'form-input-error' : ''}`}
            placeholder="e.g. LIVE"
            value={statusCode}
            onChange={(e) => setStatusCode(e.target.value)}
            disabled={isSubmitting}
            autoFocus
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="rtr-status-name" className="form-label">
            Status Name <span className="text-danger">*</span>
          </label>
          <input
            id="rtr-status-name"
            type="text"
            className={`form-input ${error && !statusName.trim() ? 'form-input-error' : ''}`}
            placeholder="e.g. Live"
            value={statusName}
            onChange={(e) => setStatusName(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <MasterStatusCheckbox
            isActive={isActive === true}
            onChange={(checked) => setIsActive(checked)}
            disabled={isSubmitting}
          />
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
            type="submit"
            className="masters-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? isEdit
                ? 'Updating...'
                : 'Creating...'
              : isEdit
              ? 'Update RTR Loan Status'
              : 'Add RTR Loan Status'}
          </button>
        </div>
      </form>
    </MasterModal>
  );
}

export default RTRLoanStatusForm;
