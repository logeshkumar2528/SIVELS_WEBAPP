import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Percent } from 'lucide-react';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import { createFOIR, getFOIRById, updateFOIR } from '../../../api/masters/foirApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import './FOIR.css';

const getId = (row) => row?.foirId ?? row?.FoirId ?? row?.id;
const getValue = (row, key, fallback = '') => row?.[key] ?? row?.[key.charAt(0).toUpperCase() + key.slice(1)] ?? fallback;
const asDateInput = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';

export function FOIRForm({ isOpen, onClose, onSuccess, editingRecord, employmentTypes = [] }) {
  const [formData, setFormData] = useState({ employmentTypeId: '', foirPercent: '', effectiveFrom: '', effectiveTo: '', isActive: true });
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
        setFormData({ employmentTypeId: '', foirPercent: '', effectiveFrom: '', effectiveTo: '', isActive: true });
        return;
      }
      setIsLoading(true);
      try {
        const response = await getFOIRById(getId(editingRecord));
        const record = response?.data || response;
        if (mounted) {
          setFormData({
            employmentTypeId: getValue(record, 'employmentTypeId'),
            foirPercent: getValue(record, 'foirPercent'),
            effectiveFrom: asDateInput(getValue(record, 'effectiveFrom')),
            effectiveTo: asDateInput(getValue(record, 'effectiveTo')),
            isActive: getValue(record, 'isActive', true) !== false,
          });
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to load FOIR record.'));
        onClose();
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [editingRecord, isOpen, onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const percent = Number(formData.foirPercent);
    if (!formData.employmentTypeId || formData.foirPercent === '' || Number.isNaN(percent) || percent < 0 || percent > 100) {
      setError('Select an employment type and enter a FOIR percentage between 0 and 100.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    const payload = {
      employmentTypeId: Number(formData.employmentTypeId),
      foirPercent: percent,
      effectiveFrom: formData.effectiveFrom || null,
      effectiveTo: formData.effectiveTo || null,
      isActive: formData.isActive,
      ...(isEdit
        ? { foirId: getId(editingRecord), modifiedBy: getCurrentUserId() }
        : { createdBy: getCurrentUserId() }),
    };

    try {
      if (isEdit) await updateFOIR(getId(editingRecord), payload);
      else await createFOIR(payload);
      toast.success(isEdit ? 'FOIR updated successfully' : 'FOIR created successfully');
      onSuccess();
      onClose();
    } catch (err) {
      const message = getErrorMessage(err, 'Unable to save FOIR record.');
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const update = (name, value) => setFormData((current) => ({ ...current, [name]: value }));

  if (isLoading) {
    return <MasterModal isOpen={isOpen} onClose={onClose} title="Loading..."><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading FOIR record...</div></MasterModal>;
  }

  return (
    <MasterModal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit FOIR' : 'Add FOIR'} icon={<Percent size={24} />} subtitle={isEdit ? 'Update FOIR details' : 'Add a new FOIR configuration'}>
      <form onSubmit={handleSubmit} className="masters-form">
        {error && <div className="form-error-msg">{error}</div>}
        <div className="form-group">
          <label htmlFor="employmentTypeId" className="form-label">Employment Type <span className="text-danger">*</span></label>
          <select id="employmentTypeId" className="form-input" value={formData.employmentTypeId} onChange={(event) => update('employmentTypeId', event.target.value)} disabled={isSubmitting}>
            <option value="">Select Employment Type</option>
            {employmentTypes.map((item) => {
              const id = item.employmentTypeId ?? item.EmploymentTypeId ?? item.id;
              const name = item.employmentTypeName ?? item.EmploymentTypeName ?? item.name ?? `Type ${id}`;
              return <option key={id} value={id}>{name}</option>;
            })}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="foirPercent" className="form-label">FOIR Percentage <span className="text-danger">*</span></label>
          <input id="foirPercent" type="number" min="0" max="100" step="0.01" className="form-input" value={formData.foirPercent} onChange={(event) => update('foirPercent', event.target.value)} placeholder="e.g. 55" disabled={isSubmitting} />
        </div>
        <div className="foir-date-grid">
          <div className="form-group">
            <label htmlFor="effectiveFrom" className="form-label">Effective From</label>
            <input id="effectiveFrom" type="date" className="form-input" value={formData.effectiveFrom} onChange={(event) => update('effectiveFrom', event.target.value)} disabled={isSubmitting} />
          </div>
          <div className="form-group">
            <label htmlFor="effectiveTo" className="form-label">Effective To</label>
            <input id="effectiveTo" type="date" className="form-input" value={formData.effectiveTo} onChange={(event) => update('effectiveTo', event.target.value)} disabled={isSubmitting} />
          </div>
        </div>
        <MasterStatusCheckbox isActive={formData.isActive} onChange={(value) => update('isActive', value)} disabled={isSubmitting} />
        <div className="form-actions">
          <button type="button" className="masters-btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="submit" className="masters-btn-primary" disabled={isSubmitting}>{isSubmitting ? (isEdit ? 'Updating...' : 'Saving...') : (isEdit ? 'Update FOIR' : 'Save FOIR')}</button>
        </div>
      </form>
    </MasterModal>
  );
}
