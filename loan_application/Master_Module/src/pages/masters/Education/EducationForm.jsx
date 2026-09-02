import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createEducation, updateEducation, getEducationById } from '../../../api/masters/educationApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './Education.css'; // Shared CSS

export function EducationForm({ isOpen, onClose, onSuccess, initialData }) {
  const [educationName, setEducationName] = useState('');
  const [educationCode, setEducationCode] = useState('');
  const [qualificationLevel, setQualificationLevel] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const loadData = async () => {
      if (initialData) {
        setIsLoading(true);
        try {
          if (!initialData.educationId) {
            throw new Error('Missing educationId on selected record');
          }
          // Fetch latest record before editing
          const response = await getEducationById(initialData.educationId);
          const record = response.value || response.data || response;
          if (isMounted) {
            setEducationName(record.educationName || '');
            setEducationCode(record.educationCode || '');
            setQualificationLevel(record.qualificationLevel != null ? record.qualificationLevel.toString() : '');
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
        setEducationName('');
        setEducationCode('');
        setQualificationLevel('');
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

    const trimmedName = educationName.trim();
    const trimmedCode = educationCode.trim();
    const levelNumber = parseInt(qualificationLevel, 10);

    if (!trimmedName) {
      setError('Education Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Education Code is required');
      return;
    }
    if (!qualificationLevel || isNaN(levelNumber)) {
      setError('Qualification Level is required and must be a number');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          educationId: initialData.educationId,
          educationName: trimmedName,
          educationCode: trimmedCode,
          qualificationLevel: levelNumber,
          modifiedBy: getCurrentUserId(),
          isActive,
        };
        await updateEducation(initialData.educationId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          educationName: trimmedName,
          educationCode: trimmedCode,
          qualificationLevel: levelNumber,
          createdBy: getCurrentUserId(),
          isActive,
        };
        await createEducation(payload);
        toast.success('Created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Form submission failed:', err);

      if (err.response?.status === 409) {
        const backendMsg = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null);
        const errorText = backendMsg || 'Education code or name already exists.';
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
      title={isEdit ? 'Edit Education' : 'Add Education'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="educationName" className="form-label">
            Education Name <span className="text-danger">*</span>
          </label>
          <input
            id="educationName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={educationName}
            onChange={(e) => {
              setEducationName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. B.Tech"
            disabled={isSubmitting}
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="educationCode" className="form-label">
            Education Code <span className="text-danger">*</span>
          </label>
          <input
            id="educationCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={educationCode}
            onChange={(e) => {
              setEducationCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. BTECH"
            disabled={isSubmitting}
          />
          {error && error.includes('Code') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="qualificationLevel" className="form-label">
            Qualification Level <span className="text-danger">*</span>
          </label>
          <input
            id="qualificationLevel"
            type="number"
            className={`form-input ${error && error.includes('Qualification') ? 'form-input-error' : ''}`}
            value={qualificationLevel}
            onChange={(e) => {
              setQualificationLevel(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. 16"
            disabled={isSubmitting}
          />
          {error && error.includes('Qualification') && <span className="form-error-msg">{error}</span>}
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
