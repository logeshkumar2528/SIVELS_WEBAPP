import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createCity, updateCity, getCityById } from '../../../api/masters/cityApi';
import { getStates } from '../../../api/masters/stateApi';
import { getDistricts } from '../../../api/masters/districtApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './City.css';

export function CityForm({ isOpen, onClose, onSuccess, initialData }) {
  const [stateId, setStateId] = useState('');
  const [originalStateId, setOriginalStateId] = useState(null);
  
  const [districtId, setDistrictId] = useState('');
  const [originalDistrictId, setOriginalDistrictId] = useState(null);

  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [isDependentDataLoading, setIsDependentDataLoading] = useState(false);

  const [cityCode, setCityCode] = useState('');
  const [cityName, setCityName] = useState('');
  const [pincode, setPincode] = useState('');
  const [isMetro, setIsMetro] = useState(false);
  const [isActive, setIsActive] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    const loadData = async () => {
      setIsDependentDataLoading(true);
      try {
        const [statesRes, distRes] = await Promise.all([
          getStates(),
          getDistricts()
        ]);
        const statesData = Array.isArray(statesRes) ? statesRes : (statesRes?.value || statesRes?.data || statesRes?.result || []);
        const distData = Array.isArray(distRes) ? distRes : (distRes?.value || distRes?.data || distRes?.result || []);
        
        if (isMounted) {
          setStates(statesData);
          setDistricts(distData);
        }
      } catch (err) {
        console.error('Failed to load dependent data:', err);
        if (isMounted) toast.error('Failed to fetch State/District Master data.');
      } finally {
        if (isMounted) setIsDependentDataLoading(false);
      }

      if (initialData) {
        setIsLoading(true);
        try {
          if (!initialData.cityId) {
            throw new Error('Missing cityId on selected record');
          }
          const response = await getCityById(initialData.cityId);
          const record = response?.value || response?.data || response;
          
          if (isMounted) {
            setStateId(record.stateId || '');
            setOriginalStateId(record.stateId || null);
            setDistrictId(record.districtId || '');
            setOriginalDistrictId(record.districtId || null);
            setCityCode(record.cityCode || '');
            setCityName(record.cityName || '');
            setPincode(record.pincode || '');
            
            const metroVal = record.isMetro;
            setIsMetro(metroVal === true || metroVal === 1 || metroVal === '1');
            
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
        setDistrictId('');
        setOriginalDistrictId(null);
        setCityCode('');
        setCityName('');
        setPincode('');
        setIsMetro(false);
        setIsActive(true);
      }
      setError(null);
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialData, onClose]);

  const handleStateChange = (e) => {
    setStateId(e.target.value);
    setDistrictId(''); // Clear district when state changes
    if (error) setError(null);
  };

  const filteredDistricts = useMemo(() => {
    if (!stateId) return [];
    return districts.filter(d => String(d.stateId) === String(stateId));
  }, [districts, stateId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedCode = cityCode.trim();
    const trimmedName = cityName.trim();
    const trimmedPincode = pincode.trim();

    if (!stateId) {
      setError('State is required');
      return;
    }
    if (!districtId) {
      setError('District is required');
      return;
    }
    if (!trimmedCode) {
      setError('City Code is required');
      return;
    }
    if (!trimmedName) {
      setError('City Name is required');
      return;
    }
    if (!trimmedPincode) {
      setError('Pincode is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        districtId: parseInt(districtId, 10),
        stateId: parseInt(stateId, 10),
        cityCode: trimmedCode,
        cityName: trimmedName,
        pincode: trimmedPincode,
        isMetro,
        isActive
      };

      if (isEdit) {
        payload.cityId = initialData.cityId;
        payload.modifiedBy = getCurrentUserId() || 1;
        await updateCity(initialData.cityId, payload);
        toast.success('Updated successfully');
      } else {
        payload.createdBy = getCurrentUserId() || 1;
        await createCity(payload);
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
        const errorText = backendMsg || 'Conflict: City Code or Name already exists.';
        setError(errorText);
        toast.error(errorText);
      } else if (err.response.status === 400 && err.response.data?.ModelState) {
        setError('Validation failed. Please check your input.');
      } else if (err.response.status === 404) {
        toast.error('City not found.');
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
      title={isEdit ? 'Edit City' : 'Add City'}
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
            onChange={handleStateChange}
            disabled={isSubmitting || isDependentDataLoading}
            required
          >
            <option value="">
              {isDependentDataLoading ? 'Loading states...' : (states.length === 0 ? 'No states available' : 'Select a state')}
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
          <label htmlFor="districtId" className="form-label">
            District <span className="text-danger">*</span>
          </label>
          <select
            id="districtId"
            className={`form-input ${error && error.includes('District') ? 'form-input-error' : ''}`}
            value={districtId}
            onChange={(e) => {
              setDistrictId(e.target.value);
              if (error) setError(null);
            }}
            disabled={isSubmitting || isDependentDataLoading || !stateId}
            required
          >
            <option value="">
              {!stateId ? 'Select a state first' : (filteredDistricts.length === 0 ? 'No districts available' : 'Select a district')}
            </option>
            {filteredDistricts
              .filter(dist => {
                const isDistActive = dist.isActive === true || dist.isActive === 1 || dist.isActive === '1';
                return isDistActive || (isEdit && originalDistrictId !== null && String(dist.districtId) === String(originalDistrictId));
              })
              .map((dist) => (
              <option key={dist.districtId} value={dist.districtId}>
                {dist.districtName}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="cityCode" className="form-label">
            City Code <span className="text-danger">*</span>
          </label>
          <input
            id="cityCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={cityCode}
            onChange={(e) => {
              setCityCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. CHE"
            disabled={isSubmitting}
            required
          />
        </div>
      
        <div className="form-group">
          <label htmlFor="cityName" className="form-label">
            City Name <span className="text-danger">*</span>
          </label>
          <input
            id="cityName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={cityName}
            onChange={(e) => {
              setCityName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Chennai"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="pincode" className="form-label">
            Pincode <span className="text-danger">*</span>
          </label>
          <input
            id="pincode"
            type="text"
            className={`form-input ${error && error.includes('Pincode') ? 'form-input-error' : ''}`}
            value={pincode}
            onChange={(e) => {
              setPincode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. 600001"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
          <label htmlFor="isMetro" className="form-label" style={{ marginBottom: 0 }}>
            Metro City
          </label>
          <input
            id="isMetro"
            type="checkbox"
            checked={isMetro}
            onChange={(e) => setIsMetro(e.target.checked)}
            disabled={isSubmitting}
            style={{ width: '16px', height: '16px' }}
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
