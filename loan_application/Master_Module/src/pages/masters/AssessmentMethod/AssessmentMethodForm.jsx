import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Calculator, Save } from 'lucide-react';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createAssessmentMethod, updateAssessmentMethod, getAssessmentMethodById } from '../../../api/masters/assessmentMethodApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';

export function AssessmentMethodForm({ isOpen, onClose, onSuccess, initialData }) {
  const [methodName, setMethodName] = useState('');
  const [methodCode, setMethodCode] = useState('');
  const [description, setDescription] = useState('');
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
          if (!initialData.assessmentMethodId) {
            throw new Error('Missing assessmentMethodId on selected record');
          }
          // Fetch latest record before editing
          const response = await getAssessmentMethodById(initialData.assessmentMethodId);
          const record = response.data || response;
          if (isMounted) {
            setMethodName(record.methodName || '');
            setMethodCode(record.methodCode || '');
            setDescription(record.description || '');
            setIsActive(record.isActive !== false);
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
        setMethodName('');
        setMethodCode('');
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
    
    const trimmedName = methodName.trim();
    const trimmedCode = methodCode.trim();
    const trimmedDesc = description.trim();

    if (!trimmedName) {
      setError('Assessment Method Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Assessment Method Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const payload = {
          assessmentMethodId: initialData.assessmentMethodId,
          methodName: trimmedName,
          methodCode: trimmedCode,
          description: trimmedDesc,
          modifiedBy: getCurrentUserId(),
          isActive
        };
        await updateAssessmentMethod(initialData.assessmentMethodId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          methodName: trimmedName,
          methodCode: trimmedCode,
          description: trimmedDesc,
          createdBy: getCurrentUserId(),
          isActive
        };
        await createAssessmentMethod(payload);
        toast.success('Created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Form submission failed:', err);
      
      if (err.response?.status === 400 && err.response?.data?.ModelState) {
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
      title={isEdit ? 'Edit Assessment Method' : 'Add Assessment Method'}
      subtitle="Enter the assessment method details below."
      icon={<Calculator size={24} />}
    >
      <form onSubmit={handleSubmit} className="assessment-method-form">
        <div className="form-group">
          <label htmlFor="methodName" className="form-label">
            Assessment Method Name <span className="text-danger">*</span>
          </label>
          <input
            id="methodName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={methodName}
            onChange={(e) => {
              setMethodName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Income Method"
            disabled={isSubmitting}
          />
          {!error && <span className="form-helper-text">Enter a descriptive name for the assessment method.</span>}
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="methodCode" className="form-label">
            Assessment Method Code <span className="text-danger">*</span>
          </label>
          <input
            id="methodCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={methodCode}
            onChange={(e) => {
              setMethodCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. INCOME"
            disabled={isSubmitting}
          />
          {!error && <span className="form-helper-text">Enter a unique uppercase code for the method.</span>}
          {error && error.includes('Code') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Description
          </label>
          <textarea
            id="description"
            className="form-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter optional description or notes..."
            disabled={isSubmitting}
            rows={3}
          />
          <span className="form-helper-text">Provide an explanation or context for how this method assesses loan eligibility.</span>
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
            style={{ padding: '0.625rem 1.5rem' }}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="masters-btn-primary"
            disabled={isSubmitting}
            style={{ padding: '0.625rem 1.5rem' }}
          >
            <Save size={18} />
            {isSubmitting ? (isEdit ? 'Updating...' : 'Saving...') : (isEdit ? 'Update' : 'Save')}
          </button>
        </div>
      </form>
    </MasterModal>
  );
}
