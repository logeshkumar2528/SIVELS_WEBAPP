import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createCaste, updateCaste, getCasteById } from '../../../api/masters/casteApi';
import { getReligions } from '../../../api/masters/religionApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './Caste.css';

export function CasteForm({ isOpen, onClose, onSuccess, initialData }) {
  const [religionId, setReligionId] = useState('');
  const [casteCategory, setCasteCategory] = useState('');
  const [casteName, setCasteName] = useState('');
  const [reservationCategory, setReservationCategory] = useState('');
  const [casteCode, setCasteCode] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [religions, setReligions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(initialData);

  // Fetch Religions for Dropdown
  useEffect(() => {
    if (isOpen) {
      getReligions()
        .then((response) => {
          const data = Array.isArray(response)
            ? response
            : response?.value ?? response?.data ?? response?.result ?? [];
          // Only show active religions in dropdown for new records, but keep all for editing if needed
          setReligions(data.filter(r => r.isActive));
        })
        .catch(err => {
          console.error('Failed to fetch religions for dropdown:', err);
          toast.error('Failed to load religions');
        });
    }
  }, [isOpen]);

  // Load Data
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const loadData = async () => {
      if (initialData) {
        setIsLoading(true);
        try {
          if (!initialData.casteId) {
            throw new Error('Missing casteId on selected record');
          }
          const response = await getCasteById(initialData.casteId);
          const record = response.value || response.data || response;
          if (isMounted) {
            setReligionId(record.religionId != null ? record.religionId.toString() : '');
            setCasteCategory(record.casteCategory || '');
            setCasteName(record.casteName || '');
            setReservationCategory(record.reservationCategory || '');
            setCasteCode(record.casteCode || '');
            const activeVal = record.isActive;
            setIsActive(activeVal === true || activeVal === 1 || activeVal === '1');
          }
        } catch (err) {
          if (isMounted) {
            const errorMessage = getErrorMessage(err, 'Failed to load latest record data.');
            toast.error(errorMessage);
            onClose();
          }
        } finally {
          if (isMounted) setIsLoading(false);
        }
      } else {
        setReligionId('');
        setCasteCategory('');
        setCasteName('');
        setReservationCategory('');
        setCasteCode('');
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

    const trimmedCategory = casteCategory.trim();
    const trimmedName = casteName.trim();
    const trimmedReservation = reservationCategory.trim();
    const trimmedCode = casteCode.trim();
    const selectedReligionId = parseInt(religionId, 10);

    if (!religionId || isNaN(selectedReligionId)) {
      setError('Religion is required');
      return;
    }
    if (!trimmedCategory) {
      setError('Caste Category is required');
      return;
    }
    if (!trimmedName) {
      setError('Caste Name is required');
      return;
    }
    if (!trimmedReservation) {
      setError('Reservation Category is required');
      return;
    }
    if (!trimmedCode) {
      setError('Caste Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          casteId: initialData.casteId,
          religionId: selectedReligionId,
          casteCategory: trimmedCategory,
          casteName: trimmedName,
          reservationCategory: trimmedReservation,
          casteCode: trimmedCode,
          modifiedBy: getCurrentUserId(),
          isActive,
        };
        await updateCaste(initialData.casteId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          religionId: selectedReligionId,
          casteCategory: trimmedCategory,
          casteName: trimmedName,
          reservationCategory: trimmedReservation,
          casteCode: trimmedCode,
          createdBy: getCurrentUserId(),
          isActive,
        };
        await createCaste(payload);
        toast.success('Created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Form submission failed:', err);

      if (err.response?.status === 409) {
        const backendMsg = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null);
        const errorText = backendMsg || 'Caste code or name already exists.';
        setError(errorText);
        toast.error(errorText);
      } else if (err.response?.status === 400 && err.response?.data?.ModelState) {
        setError('Validation failed. Please check your input.');
      } else {
        const errorMessage = getErrorMessage(err, 'Request failed');
        toast.error(errorMessage);
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
    <MasterModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Caste' : 'Add Caste'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="religionId" className="form-label">
            Religion <span className="text-danger">*</span>
          </label>
          <select
            id="religionId"
            className={`form-input ${error && error.includes('Religion') ? 'form-input-error' : ''}`}
            value={religionId}
            onChange={(e) => {
              setReligionId(e.target.value);
              if (error) setError(null);
            }}
            disabled={isSubmitting}
          >
            <option value="">Select Religion</option>
            {religions.map(r => (
              <option key={r.religionId} value={r.religionId}>
                {r.religionName}
              </option>
            ))}
          </select>
          {error && error.includes('Religion') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="casteCategory" className="form-label">
            Caste Category <span className="text-danger">*</span>
          </label>
          <input
            id="casteCategory"
            type="text"
            className={`form-input ${error && error.includes('Category') && !error.includes('Reservation') ? 'form-input-error' : ''}`}
            value={casteCategory}
            onChange={(e) => {
              setCasteCategory(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. General"
            disabled={isSubmitting}
          />
          {error && error.includes('Category') && !error.includes('Reservation') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="casteName" className="form-label">
            Caste Name <span className="text-danger">*</span>
          </label>
          <input
            id="casteName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={casteName}
            onChange={(e) => {
              setCasteName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Brahmin"
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="reservationCategory" className="form-label">
            Reservation Category <span className="text-danger">*</span>
          </label>
          <input
            id="reservationCategory"
            type="text"
            className={`form-input ${error && error.includes('Reservation') ? 'form-input-error' : ''}`}
            value={reservationCategory}
            onChange={(e) => {
              setReservationCategory(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. General"
            disabled={isSubmitting}
          />
          {error && error.includes('Reservation') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="casteCode" className="form-label">
            Caste Code <span className="text-danger">*</span>
          </label>
          <input
            id="casteCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={casteCode}
            onChange={(e) => {
              setCasteCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. HINDU_BRAHMIN"
            disabled={isSubmitting}
          />
          {error && error.includes('Code') && <span className="form-error-msg">{error}</span>}
        </div>

        <MasterStatusCheckbox
          isActive={isActive}
          onChange={setIsActive}
          disabled={isSubmitting}
        />

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
            {isSubmitting ? (isEdit ? 'Updating...' : 'Saving...') : (isEdit ? 'Update' : 'Save')}
          </button>
        </div>
      </form>
    </MasterModal>
  );
}
