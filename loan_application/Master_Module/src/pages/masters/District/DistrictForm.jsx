import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createDistrict, updateDistrict, getDistrictById } from '../../../api/masters/districtApi';
import { getStates } from '../../../api/masters/stateApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './District.css';

export function DistrictForm({ isOpen, onClose, onSuccess, initialData }) {
  const [stateId, setStateId] = useState('');
  const [originalStateId, setOriginalStateId] = useState(null);
  const [states, setStates] = useState([]);
  const [isStatesLoading, setIsStatesLoading] = useState(false);

  const [districtCode, setDistrictCode] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    const loadData = async () => {
      setIsStatesLoading(true);
      try {
        const statesResponse = await getStates();
        const statesData = Array.isArray(statesResponse) ? statesResponse : (statesResponse?.value || statesResponse?.data || statesResponse?.result || []);
        if (isMounted) {
          setStates(statesData);
        }
      } catch (err) {
        console.error('Failed to load states:', err);
        if (isMounted) toast.error('Failed to fetch State Master data.');
      } finally {
        if (isMounted) setIsStatesLoading(false);
      }

      if (initialData) {
        setIsLoading(true);
        try {
          if (!initialData.districtId) {
            throw new Error('Missing districtId on selected record');
          }
          const response = await getDistrictById(initialData.districtId);
          const record = response?.value || response?.data || response;
          
          if (isMounted) {
            setStateId(record.stateId || '');
            setOriginalStateId(record.stateId || null);
            setDistrictCode(record.districtCode || '');
            setDistrictName(record.districtName || '');
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
        setStateId('');
        setOriginalStateId(null);
        setDistrictCode('');
        setDistrictName('');
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
    
    const trimmedCode = districtCode.trim();
    const trimmedName = districtName.trim();

    if (!stateId) {
      setError('State is required');
      return;
    }
    if (!trimmedCode) {
      setError('District Code is required');
      return;
    }
    if (!trimmedName) {
      setError('District Name is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        stateId: parseInt(stateId, 10),
        districtCode: trimmedCode,
        districtName: trimmedName,
        isActive
      };

      if (isEdit) {
        payload.districtId = initialData.districtId;
        payload.modifiedBy = getCurrentUserId() || 1;
        await updateDistrict(initialData.districtId, payload);
        toast.success('Updated successfully');
      } else {
        payload.createdBy = getCurrentUserId() || 1;
        await createDistrict(payload);
        toast.success('Created successfully');
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Form submission failed:', err);
      
      if (!err?.response) {
        toast.error('Unable to connect to the server.');
        setError('Unable to connect to the server.');
      } else if (err.response.status === 409) {
        const backendMsg = err.response.data?.message || (typeof err.response.data === 'string' ? err.response.data : null);
        const errorText = backendMsg || 'Conflict: District Code or Name already exists.';
        setError(errorText);
        toast.error(errorText);
      } else if (err.response.status === 400 && err.response.data?.ModelState) {
        setError('Validation failed. Please check your input.');
      } else if (err.response.status === 404) {
        toast.error('District not found.');
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
      title={isEdit ? 'Edit District' : 'Add District'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="stateId" className="form-label">
            State <span className="text-danger">*</span>
          </label>
          <select
            id="stateId"
            className={`form-input ${error && error.includes('State') ? 'form-input-error' : ''}`}
            value={stateId}
            onChange={(e) => {
              setStateId(e.target.value);
              if (error) setError(null);
            }}
            disabled={isSubmitting || isStatesLoading}
            required
          >
            <option value="">
              {isStatesLoading ? 'Loading states...' : (states.length === 0 ? 'No states available' : 'Select a state')}
            </option>
            {states
              .filter(state => {
                const isStateActive = state.isActive === true || state.isActive === 1 || state.isActive === '1';
                return isStateActive || (isEdit && originalStateId !== null && String(state.stateId) === String(originalStateId));
              })
              .map((state) => (
              <option key={state.stateId} value={state.stateId}>
                {state.stateName}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="districtCode" className="form-label">
            District Code <span className="text-danger">*</span>
          </label>
          <input
            id="districtCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={districtCode}
            onChange={(e) => {
              setDistrictCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. CBE"
            disabled={isSubmitting}
            required
          />
        </div>
      
        <div className="form-group">
          <label htmlFor="districtName" className="form-label">
            District Name <span className="text-danger">*</span>
          </label>
          <input
            id="districtName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={districtName}
            onChange={(e) => {
              setDistrictName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Coimbatore"
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
