import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createCountry, updateCountry, getCountryById } from '../../../api/masters/countryApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './Country.css';

export function CountryForm({ isOpen, onClose, onSuccess, initialData }) {
  const [countryCode, setCountryCode] = useState('');
  const [countryName, setCountryName] = useState('');
  const [nationality, setNationality] = useState('');
  const [isdCode, setIsdCode] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [timeZone, setTimeZone] = useState('');
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
          if (!initialData.countryId) {
            throw new Error('Missing countryId on selected record');
          }
          const response = await getCountryById(initialData.countryId);
          const record = response?.value || response?.data || response;
          
          if (isMounted) {
            setCountryCode(record.countryCode || '');
            setCountryName(record.countryName || '');
            setNationality(record.nationality || '');
            setIsdCode(record.isdCode || '');
            setCurrencyCode(record.currencyCode || '');
            setTimeZone(record.timeZone || '');
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
        setCountryCode('');
        setCountryName('');
        setNationality('');
        setIsdCode('');
        setCurrencyCode('');
        setTimeZone('');
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
    
    const trimmedCode = countryCode.trim();
    const trimmedName = countryName.trim();
    const trimmedNationality = nationality.trim();
    const trimmedIsdCode = isdCode.trim();
    const trimmedCurrencyCode = currencyCode.trim();
    const trimmedTimeZone = timeZone.trim();

    if (!trimmedCode) {
      setError('Country Code is required');
      return;
    }
    if (!trimmedName) {
      setError('Country Name is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        countryCode: trimmedCode,
        countryName: trimmedName,
        nationality: trimmedNationality,
        isdCode: trimmedIsdCode,
        currencyCode: trimmedCurrencyCode,
        timeZone: trimmedTimeZone,
        isActive
      };

      if (isEdit) {
        payload.countryId = initialData.countryId;
        payload.modifiedBy = getCurrentUserId() || 1;
        await updateCountry(initialData.countryId, payload);
        toast.success('Updated successfully');
      } else {
        payload.createdBy = getCurrentUserId() || 1;
        await createCountry(payload);
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
        const errorText = backendMsg || 'Conflict: Country Code or Name already exists.';
        setError(errorText);
        toast.error(errorText);
      } else if (err.response.status === 400 && err.response.data?.ModelState) {
        setError('Validation failed. Please check your input.');
      } else if (err.response.status === 404) {
        toast.error('Country not found.');
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
      title={isEdit ? 'Edit Country' : 'Add Country'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="countryCode" className="form-label">
            Country Code <span className="text-danger">*</span>
          </label>
          <input
            id="countryCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={countryCode}
            onChange={(e) => {
              setCountryCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. US"
            disabled={isSubmitting}
            required
          />
        </div>
      
        <div className="form-group">
          <label htmlFor="countryName" className="form-label">
            Country Name <span className="text-danger">*</span>
          </label>
          <input
            id="countryName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={countryName}
            onChange={(e) => {
              setCountryName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. United States"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="nationality" className="form-label">
            Nationality
          </label>
          <input
            id="nationality"
            type="text"
            className="form-input"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            placeholder="e.g. American"
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="isdCode" className="form-label">
            ISD Code
          </label>
          <input
            id="isdCode"
            type="text"
            className="form-input"
            value={isdCode}
            onChange={(e) => setIsdCode(e.target.value)}
            placeholder="e.g. +1"
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="currencyCode" className="form-label">
            Currency Code
          </label>
          <input
            id="currencyCode"
            type="text"
            className="form-input"
            value={currencyCode}
            onChange={(e) => setCurrencyCode(e.target.value)}
            placeholder="e.g. USD"
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="timeZone" className="form-label">
            Time Zone
          </label>
          <input
            id="timeZone"
            type="text"
            className="form-input"
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            placeholder="e.g. America/New_York"
            disabled={isSubmitting}
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
