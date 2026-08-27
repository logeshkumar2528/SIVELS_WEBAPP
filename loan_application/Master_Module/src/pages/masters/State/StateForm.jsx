import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createState, updateState, getStateById } from '../../../api/masters/stateApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './State.css';

export function StateForm({ isOpen, onClose, onSuccess, initialData }) {
  const [countryId, setCountryId] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [stateName, setStateName] = useState('');
  const [gstStateCode, setGstStateCode] = useState('');
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
          if (!initialData.stateId) {
            throw new Error('Missing stateId on selected record');
          }
          const response = await getStateById(initialData.stateId);
          const record = response?.value || response?.data || response;
          
          if (isMounted) {
            setCountryId(record.countryId || '');
            setStateCode(record.stateCode || '');
            setStateName(record.stateName || '');
            setGstStateCode(record.gstStateCode || '');
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
        setCountryId('');
        setStateCode('');
        setStateName('');
        setGstStateCode('');
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
    
    const trimmedCode = stateCode.trim();
    const trimmedName = stateName.trim();
    const trimmedGst = gstStateCode.trim();

    if (!countryId) {
      setError('Country ID is required');
      return;
    }
    if (!trimmedCode) {
      setError('State Code is required');
      return;
    }
    if (!trimmedName) {
      setError('State Name is required');
      return;
    }
    if (!trimmedGst) {
      setError('GST State Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        countryId: parseInt(countryId, 10),
        stateCode: trimmedCode,
        stateName: trimmedName,
        gstStateCode: trimmedGst,
        isActive
      };

      if (isEdit) {
        payload.stateId = initialData.stateId;
        payload.modifiedBy = getCurrentUserId() || 1;
        await updateState(initialData.stateId, payload);
        toast.success('Updated successfully');
      } else {
        payload.createdBy = getCurrentUserId() || 1;
        await createState(payload);
        toast.success('Created successfully');
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Form submission failed:', err);
      
      if (!err.response) {
        toast.error('Unable to connect to the server.');
        setError('Unable to connect to the server.');
      } else if (err.response.status === 409) {
        const backendMsg = err.response.data?.message || (typeof err.response.data === 'string' ? err.response.data : null);
        const errorText = backendMsg || 'State Code or Name already exists.';
        setError(errorText);
        toast.error(errorText);
      } else if (err.response.status === 400 && err.response.data?.ModelState) {
        setError('Validation failed. Please check your input.');
      } else if (err.response.status === 404) {
        toast.error('State not found.');
      } else if (err.response.status === 500) {
        toast.error('Something went wrong. Please try again.');
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
      title={isEdit ? 'Edit State' : 'Add State'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="countryId" className="form-label">
            Country ID <span className="text-danger">*</span>
          </label>
          <input
            id="countryId"
            type="number"
            className={`form-input ${error && error.includes('Country') ? 'form-input-error' : ''}`}
            value={countryId}
            onChange={(e) => {
              setCountryId(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. 1"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="stateCode" className="form-label">
            State Code <span className="text-danger">*</span>
          </label>
          <input
            id="stateCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={stateCode}
            onChange={(e) => {
              setStateCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. TN"
            disabled={isSubmitting}
            required
          />
        </div>
      
        <div className="form-group">
          <label htmlFor="stateName" className="form-label">
            State Name <span className="text-danger">*</span>
          </label>
          <input
            id="stateName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={stateName}
            onChange={(e) => {
              setStateName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Tamil Nadu"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="gstStateCode" className="form-label">
            GST State Code <span className="text-danger">*</span>
          </label>
          <input
            id="gstStateCode"
            type="text"
            className={`form-input ${error && error.includes('GST') ? 'form-input-error' : ''}`}
            value={gstStateCode}
            onChange={(e) => {
              setGstStateCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. 33"
            disabled={isSubmitting}
            required
          />
        </div>

        {error && <div className="form-error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

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
