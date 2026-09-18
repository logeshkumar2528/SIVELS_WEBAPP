import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FileSpreadsheet } from 'lucide-react';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import {
  createRTRNormMaster,
  getRTRNormMasterById,
  updateRTRNormMaster,
} from '../../../api/masters/rtrNormMasterApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import './RTRNormMaster.css';

const getId = (row) =>
  row?.rtrNormMasterId ??
  row?.RTRNormMasterId ??
  row?.RtrNormMasterId ??
  row?.id ??
  row?.Id;

const getMinMOB = (row) =>
  row?.minMOB ??
  row?.MinMOB ??
  row?.minMob ??
  row?.MinMob;

const getMaxMOB = (row) =>
  row?.maxMOB ??
  row?.MaxMOB ??
  row?.maxMob ??
  row?.MaxMob;

const getMaxODCount = (row) =>
  row?.maxODCount ??
  row?.MaxODCount ??
  row?.maxOdCount ??
  row?.MaxOdCount;

const getMaxBounceCount = (row) =>
  row?.maxBounceCount ??
  row?.MaxBounceCount;

const getEMIMultiplier = (row) =>
  row?.emiMultiplier ??
  row?.EMIMultiplier ??
  row?.EmiMultiplier;

const getMaxTopUpPercentage = (row) =>
  row?.maxTopUpPercentage ??
  row?.MaxTopUpPercentage;

export function RTRNormMasterForm({
  isOpen,
  onClose,
  onSuccess,
  editingRecord,
}) {
  const [formData, setFormData] = useState({
    minMOB: '',
    maxMOB: '',
    maxODCount: '0',
    maxBounceCount: '0',
    emiMultiplier: '',
    maxTopUpPercentage: '',
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
          minMOB: '',
          maxMOB: '',
          maxODCount: '0',
          maxBounceCount: '0',
          emiMultiplier: '',
          maxTopUpPercentage: '',
          isActive: true,
        });
        return;
      }

      setIsLoading(true);
      try {
        const recordId = getId(editingRecord);
        const response = await getRTRNormMasterById(recordId);
        const record = response?.data || response?.value || response;
        if (mounted) {
          const rawMaxMob = getMaxMOB(record);
          const rawIsActive =
            record?.isActive ??
            record?.IsActive ??
            record?.active ??
            record?.Active;
          const normalizedIsActive =
            rawIsActive === true || rawIsActive === 1 || rawIsActive === '1';

          setFormData({
            minMOB: getMinMOB(record) != null ? String(getMinMOB(record)) : '',
            maxMOB: rawMaxMob != null ? String(rawMaxMob) : '',
            maxODCount: getMaxODCount(record) != null ? String(getMaxODCount(record)) : '0',
            maxBounceCount: getMaxBounceCount(record) != null ? String(getMaxBounceCount(record)) : '0',
            emiMultiplier: getEMIMultiplier(record) != null ? String(getEMIMultiplier(record)) : '',
            maxTopUpPercentage: getMaxTopUpPercentage(record) != null ? String(getMaxTopUpPercentage(record)) : '',
            isActive: normalizedIsActive,
          });
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to load RTR Norm Master record.'));
        onClose();
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [editingRecord, isOpen, onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    // Min MOB validation (required, integer, >= 0)
    const minMobNum = Number(formData.minMOB);
    if (formData.minMOB === '' || isNaN(minMobNum) || !Number.isInteger(minMobNum) || minMobNum < 0) {
      setError('Min MOB is required and must be an integer greater than or equal to 0.');
      return;
    }

    // Max MOB validation (optional, integer when entered, >= Min MOB)
    let serializedMaxMOB = null;
    if (formData.maxMOB !== '' && formData.maxMOB != null) {
      const maxMobNum = Number(formData.maxMOB);
      if (isNaN(maxMobNum) || !Number.isInteger(maxMobNum)) {
        setError('Max MOB must be an integer when entered.');
        return;
      }
      if (maxMobNum < minMobNum) {
        setError('Max MOB must be greater than or equal to Min MOB.');
        return;
      }
      serializedMaxMOB = parseInt(formData.maxMOB, 10);
    }

    // Max OD Count validation (required, integer, >= 0)
    const maxOdNum = Number(formData.maxODCount);
    if (formData.maxODCount === '' || isNaN(maxOdNum) || !Number.isInteger(maxOdNum) || maxOdNum < 0) {
      setError('Max OD Count is required and must be an integer greater than or equal to 0.');
      return;
    }

    // Max Bounce Count validation (required, integer, >= 0)
    const maxBounceNum = Number(formData.maxBounceCount);
    if (formData.maxBounceCount === '' || isNaN(maxBounceNum) || !Number.isInteger(maxBounceNum) || maxBounceNum < 0) {
      setError('Max Bounce Count is required and must be an integer greater than or equal to 0.');
      return;
    }

    // EMI Multiplier validation (required, numeric, > 0)
    const emiMultNum = Number(formData.emiMultiplier);
    if (formData.emiMultiplier === '' || isNaN(emiMultNum) || emiMultNum <= 0) {
      setError('EMI Multiplier is required and must be greater than 0.');
      return;
    }

    // Max Top-Up Percentage validation (required, numeric, >= 0)
    const maxTopUpNum = Number(formData.maxTopUpPercentage);
    if (formData.maxTopUpPercentage === '' || isNaN(maxTopUpNum) || maxTopUpNum < 0) {
      setError('Max Top-Up Percentage is required and must be greater than or equal to 0.');
      return;
    }

    setIsSubmitting(true);
    const currentUserId = getCurrentUserId() || 1;
    const recordId = getId(editingRecord);

    const payload = {
      minMOB: minMobNum,
      maxMOB: serializedMaxMOB,
      maxODCount: maxOdNum,
      maxBounceCount: maxBounceNum,
      emiMultiplier: emiMultNum,
      maxTopUpPercentage: maxTopUpNum,
      isActive: formData.isActive === true,
      ...(isEdit
        ? { rtrNormMasterId: recordId, modifiedBy: currentUserId }
        : { createdBy: currentUserId }),
    };

    try {
      if (isEdit) {
        await updateRTRNormMaster(recordId, payload);
        toast.success('RTR Norm Master updated successfully');
      } else {
        await createRTRNormMaster(payload);
        toast.success('RTR Norm Master created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      const message = getErrorMessage(err, 'Unable to save RTR Norm Master record.');
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
        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
          Loading RTR Norm record...
        </div>
      </MasterModal>
    );
  }

  return (
    <MasterModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit RTR Norm' : 'Add RTR Norm'}
      icon={<FileSpreadsheet size={24} />}
      subtitle={
        isEdit
          ? 'Update Repayment Track Record norm parameters'
          : 'Configure a new Repayment Track Record norm'
      }
    >
      <form onSubmit={handleSubmit} className="masters-form" noValidate>
        {error && <div className="form-error-banner">{error}</div>}

        {/* Row 1: Min MOB & Max MOB */}
        <div className="rtr-form-grid-2">
          <div className="form-group">
            <label htmlFor="rtr-min-mob" className="form-label required">
              Min MOB (Months)
            </label>
            <input
              id="rtr-min-mob"
              type="number"
              min="0"
              step="1"
              className="form-input"
              placeholder="e.g. 12"
              value={formData.minMOB}
              onChange={(e) => update('minMOB', e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="rtr-max-mob" className="form-label">
              Max MOB (Months)
            </label>
            <input
              id="rtr-max-mob"
              type="number"
              min="0"
              step="1"
              className="form-input"
              placeholder="Leave blank for open-ended"
              value={formData.maxMOB}
              onChange={(e) => update('maxMOB', e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Row 2: Max OD Count & Max Bounce Count */}
        <div className="rtr-form-grid-2">
          <div className="form-group">
            <label htmlFor="rtr-max-od" className="form-label required">
              Max OD Count
            </label>
            <input
              id="rtr-max-od"
              type="number"
              min="0"
              step="1"
              className="form-input"
              placeholder="e.g. 0"
              value={formData.maxODCount}
              onChange={(e) => update('maxODCount', e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="rtr-max-bounce" className="form-label required">
              Max Bounce Count
            </label>
            <input
              id="rtr-max-bounce"
              type="number"
              min="0"
              step="1"
              className="form-input"
              placeholder="e.g. 2"
              value={formData.maxBounceCount}
              onChange={(e) => update('maxBounceCount', e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        {/* Row 3: EMI Multiplier & Max Top-Up % */}
        <div className="rtr-form-grid-2">
          <div className="form-group">
            <label htmlFor="rtr-multiplier" className="form-label required">
              EMI Multiplier (x)
            </label>
            <input
              id="rtr-multiplier"
              type="number"
              min="0.01"
              step="0.05"
              className="form-input"
              placeholder="e.g. 1.50"
              value={formData.emiMultiplier}
              onChange={(e) => update('emiMultiplier', e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="rtr-max-topup" className="form-label required">
              Max Top-Up Percentage (%)
            </label>
            <input
              id="rtr-max-topup"
              type="number"
              min="0"
              step="0.5"
              className="form-input"
              placeholder="e.g. 50.00"
              value={formData.maxTopUpPercentage}
              onChange={(e) => update('maxTopUpPercentage', e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        {/* Row 4: Status Checkbox */}
        <div className="form-group">
          <MasterStatusCheckbox
            isActive={formData.isActive === true}
            onChange={(checked) => update('isActive', checked)}
            disabled={isSubmitting}
          />
        </div>

        {/* Actions */}
        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm, 8px)', marginTop: 'var(--spacing-lg, 16px)' }}>
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
              ? 'Update RTR Norm'
              : 'Add RTR Norm'}
          </button>
        </div>
      </form>
    </MasterModal>
  );
}
