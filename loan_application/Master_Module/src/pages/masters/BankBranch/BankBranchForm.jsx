import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createBankBranch, updateBankBranch, getBankBranchById } from '../../../api/masters/bankBranchApi';
import { getBanks } from '../../../api/masters/bankApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './BankBranch.css';

export function BankBranchForm({ isOpen, onClose, onSuccess, initialData }) {
  const [bankId, setBankId] = useState('');
  const [originalBankId, setOriginalBankId] = useState(null);
  const [banks, setBanks] = useState([]);
  const [isBanksLoading, setIsBanksLoading] = useState(false);
  
  const [branchCode, setBranchCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [cityId, setCityId] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    const loadData = async () => {
      setIsBanksLoading(true);
      try {
        const banksResponse = await getBanks();
        const banksData = Array.isArray(banksResponse) ? banksResponse : (banksResponse?.value || banksResponse?.data || banksResponse?.result || []);
        if (isMounted) {
          setBanks(banksData);
        }
      } catch (err) {
        console.error('Failed to load banks:', err);
        if (isMounted) toast.error('Failed to fetch Bank Master data.');
      } finally {
        if (isMounted) setIsBanksLoading(false);
      }

      if (initialData) {
        setIsLoading(true);
        try {
          if (!initialData.bankBranchId) {
            throw new Error('Missing bankBranchId on selected record');
          }
          const response = await getBankBranchById(initialData.bankBranchId);
          const record = response?.value || response?.data || response;
          
          if (isMounted) {
            setBankId(record.bankId || '');
            setOriginalBankId(record.bankId || null);
            setBranchCode(record.branchCode || '');
            setBranchName(record.branchName || '');
            setCityId(record.cityId || '');
            setPhoneNo(record.phoneNo || '');
            setEmail(record.email || '');
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
        setBankId('');
        setOriginalBankId(null);
        setBranchCode('');
        setBranchName('');
        setCityId('');
        setPhoneNo('');
        setEmail('');
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
    
    const trimmedCode = branchCode.trim();
    const trimmedName = branchName.trim();
    const trimmedPhone = phoneNo.trim();
    const trimmedEmail = email.trim();

    if (!bankId) {
      setError('Bank is required');
      return;
    }
    if (!trimmedCode) {
      setError('Branch Code is required');
      return;
    }
    if (!trimmedName) {
      setError('Branch Name is required');
      return;
    }
    if (!cityId) {
      setError('City ID is required');
      return;
    }
    if (!trimmedPhone) {
      setError('Phone Number is required');
      return;
    }
    if (!trimmedEmail) {
      setError('Email is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        bankId: parseInt(bankId, 10),
        branchCode: trimmedCode,
        branchName: trimmedName,
        cityId: parseInt(cityId, 10),
        phoneNo: trimmedPhone,
        email: trimmedEmail,
        isActive
      };

      if (isEdit) {
        payload.bankBranchId = initialData.bankBranchId;
        payload.modifiedBy = getCurrentUserId() || 1;
        await updateBankBranch(initialData.bankBranchId, payload);
        toast.success('Updated successfully');
      } else {
        payload.createdBy = getCurrentUserId() || 1;
        await createBankBranch(payload);
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
        const errorText = backendMsg || 'Branch Code or Name already exists.';
        setError(errorText);
        toast.error(errorText);
      } else if (err.response.status === 400 && err.response.data?.ModelState) {
        setError('Validation failed. Please check your input.');
      } else if (err.response.status === 404) {
        toast.error('Bank branch not found.');
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
      title={isEdit ? 'Edit Bank Branch' : 'Add Bank Branch'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="bankId" className="form-label">
            Bank <span className="text-danger">*</span>
          </label>
          <select
            id="bankId"
            className={`form-input ${error && error.includes('Bank') ? 'form-input-error' : ''}`}
            value={bankId}
            onChange={(e) => {
              setBankId(e.target.value);
              if (error) setError(null);
            }}
            disabled={isSubmitting || isBanksLoading}
            required
          >
            <option value="">
              {isBanksLoading ? 'Loading banks...' : (banks.length === 0 ? 'No banks available' : 'Select a bank')}
            </option>
            {banks
              .filter(bank => {
                const isBankActive = bank.isActive === true || bank.isActive === 1 || bank.isActive === '1';
                return isBankActive || (isEdit && originalBankId !== null && String(bank.bankId) === String(originalBankId));
              })
              .map((bank) => (
              <option key={bank.bankId} value={bank.bankId}>
                {bank.bankName}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="branchCode" className="form-label">
            Branch Code <span className="text-danger">*</span>
          </label>
          <input
            id="branchCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={branchCode}
            onChange={(e) => {
              setBranchCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. BR001"
            disabled={isSubmitting}
            required
          />
        </div>
      
        <div className="form-group">
          <label htmlFor="branchName" className="form-label">
            Branch Name <span className="text-danger">*</span>
          </label>
          <input
            id="branchName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={branchName}
            onChange={(e) => {
              setBranchName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Chennai Main Branch"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="cityId" className="form-label">
            City ID <span className="text-danger">*</span>
          </label>
          <input
            id="cityId"
            type="number"
            className={`form-input ${error && error.includes('City') ? 'form-input-error' : ''}`}
            value={cityId}
            onChange={(e) => {
              setCityId(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. 5"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="phoneNo" className="form-label">
            Phone Number <span className="text-danger">*</span>
          </label>
          <input
            id="phoneNo"
            type="tel"
            pattern="[0-9]{10,15}"
            className={`form-input ${error && error.includes('Phone') ? 'form-input-error' : ''}`}
            value={phoneNo}
            onChange={(e) => {
              setPhoneNo(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. 9876543210"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email <span className="text-danger">*</span>
          </label>
          <input
            id="email"
            type="email"
            className={`form-input ${error && error.includes('Email') ? 'form-input-error' : ''}`}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. branch@bank.com"
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
