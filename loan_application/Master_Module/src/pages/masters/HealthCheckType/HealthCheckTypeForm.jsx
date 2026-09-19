import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Activity } from 'lucide-react';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import {
  createHealthCheckType,
  getHealthCheckTypeById,
  updateHealthCheckType,
} from '../../../api/masters/healthCheckTypeApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import './HealthCheckType.css';

const getId = (row) =>
  row?.healthCheckTypeId ??
  row?.HealthCheckTypeId ??
  row?.id ??
  row?.Id;

export function HealthCheckTypeForm({
  isOpen,
  onClose,
  onSuccess,
  editingRecord,
}) {
  const [formData, setFormData] = useState({
    checkName: '',
    isActive: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(editingRecord);

  useEffect(() => {
    if (!isOpen) return undefined;
    let mounted = true;

    const load = async () => {
      setError('');
      if (!editingRecord) {
        setFormData({
          checkName: '',
          isActive: true,
        });
        return;
      }

      setIsLoading(true);
      try {
        const recordId = getId(editingRecord);
        const response = await getHealthCheckTypeById(recordId);
        const record = response?.data || response?.value || response;
        if (mounted) {
          const rawIsActive =
            record?.isActive ??
            record?.IsActive ??
            record?.active ??
            record?.Active;
          const normalizedIsActive =
            rawIsActive === true || rawIsActive === 1 || rawIsActive === '1';

          setFormData({
            checkName: record?.checkName || record?.CheckName || '',
            isActive: normalizedIsActive,
          });
        }
      } catch (err) {
        // Fallback to record in props if getById fails
        if (mounted) {
          setFormData({
            checkName: editingRecord?.checkName || editingRecord?.CheckName || '',
            isActive: editingRecord?.isActive !== false,
          });
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [editingRecord, isOpen]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const trimmedName = formData.checkName.trim();
    if (!trimmedName) {
      setError('Health Check Type Name is required.');
      return;
    }

    setIsSubmitting(true);
    const currentUserId = getCurrentUserId() || 1;
    const recordId = getId(editingRecord);

    try {
      if (isEdit) {
        const payload = {
          checkName: trimmedName,
          isActive: formData.isActive === true,
          createdBy: editingRecord?.createdBy || currentUserId,
          modifiedBy: currentUserId,
        };
        await updateHealthCheckType(recordId, payload);
        toast.success('Health Check Type updated successfully');
      } else {
        const payload = {
          checkName: trimmedName,
          isActive: formData.isActive === true,
          createdBy: currentUserId,
        };
        await createHealthCheckType(payload);
        toast.success('Health Check Type created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      const message = getErrorMessage(err, 'Unable to save Health Check Type record.');
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const update = (name, value) =>
    setFormData((current) => ({ ...current, [name]: value }));

  if (isLoading) {
    return (
      <MasterModal isOpen={isOpen} onClose={onClose} title="Loading...">
        <div style={{ padding: 'var(--spacing-xl, 24px)', textAlign: 'center' }}>
          Loading Health Check Type record...
        </div>
      </MasterModal>
    );
  }

  return (
    <MasterModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Health Check Type' : 'Add Health Check Type'}
      icon={<Activity size={24} />}
      subtitle={
        isEdit
          ? 'Update health check type details'
          : 'Configure a new health check type'
      }
    >
      <form onSubmit={handleSubmit} className="health-check-type-form" noValidate>
        {error && <div className="form-error-msg" style={{ fontSize: '0.875rem' }}>{error}</div>}

        <div className="form-group">
          <label htmlFor="hct-check-name" className="form-label">
            Health Check Type Name <span className="text-danger">*</span>
          </label>
          <input
            id="hct-check-name"
            type="text"
            className={`form-input ${error ? 'form-input-error' : ''}`}
            placeholder="e.g. Google, CIBIL, Crime Check"
            value={formData.checkName}
            onChange={(e) => update('checkName', e.target.value)}
            disabled={isSubmitting}
            autoFocus
            required
          />
        </div>

        <div className="form-group">
          <MasterStatusCheckbox
            isActive={formData.isActive === true}
            onChange={(checked) => update('isActive', checked)}
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
              ? 'Update Health Check Type'
              : 'Add Health Check Type'}
          </button>
        </div>
      </form>
    </MasterModal>
  );
}

export default HealthCheckTypeForm;
