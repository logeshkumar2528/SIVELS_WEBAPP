import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createDivision, updateDivision, getDivisionById } from '../../../api/masters/divisionApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './Division.css';

const getId = (row) => row?.divisionId ?? row?.DivisionId ?? row?.id;

export function DivisionForm({ isOpen, onClose, onSuccess, initialData }) {
  const [divisionName, setDivisionName] = useState('');
  const [divisionCode, setDivisionCode] = useState('');
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
          if (!id) throw new Error('Missing divisionId on selected record');
          const response = await getDivisionById(id);
          const record = response?.data || response?.value || response;
          if (isMounted) {
            setDivisionName(record.divisionName || record.DivisionName || '');
            setDivisionCode(record.divisionCode || record.DivisionCode || '');
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
        setDivisionName('');
        setDivisionCode('');
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
    const trimmedName = divisionName.trim();
    const trimmedCode = divisionCode.trim();
    if (!trimmedName) {
      setError('Division Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Division Code is required');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      if (isEdit) {
        const id = getId(initialData);
        await updateDivision(id, {
          divisionId: Number(id),
          divisionName: trimmedName,
          divisionCode: trimmedCode,
          modifiedBy: getCurrentUserId(),
          isActive,
        });
        toast.success('Updated successfully');
      } else {
        await createDivision({
          divisionName: trimmedName,
          divisionCode: trimmedCode,
          createdBy: getCurrentUserId(),
          isActive,
        });
        toast.success('Created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
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
    <MasterModal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Division' : 'Add Division'}>
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="divisionName" className="form-label">
            Division Name <span className="text-danger">*</span>
          </label>
          <input
            id="divisionName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={divisionName}
            onChange={(e) => {
              setDivisionName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Retail Division"
            maxLength={100}
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="divisionCode" className="form-label">
            Division Code <span className="text-danger">*</span>
          </label>
          <input
            id="divisionCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={divisionCode}
            onChange={(e) => {
              setDivisionCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. DIV001"
            maxLength={30}
            disabled={isSubmitting}
          />
          {error && error.includes('Code') && <span className="form-error-msg">{error}</span>}
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
