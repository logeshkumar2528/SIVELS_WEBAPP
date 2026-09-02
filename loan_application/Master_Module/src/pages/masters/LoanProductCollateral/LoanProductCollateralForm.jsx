import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import {
  createLoanProductCollateral,
  updateLoanProductCollateral,
  getLoanProductCollateralById,
} from '../../../api/masters/loanProductCollateralApi';
import { getLoanProducts } from '../../../api/masters/loanProductApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import './LoanProductCollateral.css';

export function LoanProductCollateralForm({ isOpen, onClose, onSuccess, initialData }) {
  const [loanProductId, setLoanProductId] = useState('');
  const [isCollateralRequired, setIsCollateralRequired] = useState('');

  const [loanProducts, setLoanProducts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(initialData);

  // Fetch Loan Products for Dropdown
  useEffect(() => {
    if (isOpen) {
      getLoanProducts()
        .then((response) => {
          const data = Array.isArray(response)
            ? response
            : response?.value ?? response?.data ?? response?.result ?? [];
          setLoanProducts(data.filter((p) => p.isActive));
        })
        .catch((err) => {
          console.error('Failed to fetch loan products for dropdown:', err);
          toast.error('Failed to load loan products');
        });
    }
  }, [isOpen]);

  // Load Record Data for Edit
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const loadData = async () => {
      if (initialData) {
        setIsLoading(true);
        try {
          if (!initialData.loanProductCollateralId) {
            throw new Error('Missing loanProductCollateralId on selected record');
          }
          const response = await getLoanProductCollateralById(initialData.loanProductCollateralId);
          const record = response.value || response.data || response;
          if (isMounted) {
            setLoanProductId(
              record.loanProductId != null ? record.loanProductId.toString() : ''
            );
            // isCollateralRequired comes as boolean from API
            setIsCollateralRequired(
              record.isCollateralRequired === true ? 'true' : 'false'
            );
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
        setLoanProductId('');
        setIsCollateralRequired('');
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

    const selectedLoanProductId = parseInt(loanProductId, 10);

    if (!loanProductId || isNaN(selectedLoanProductId)) {
      setError('Loan Product is required');
      return;
    }
    if (isCollateralRequired === '') {
      setError('Collateral requirement selection is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    // Send boolean to backend (API returns boolean, so it accepts boolean)
    const collateralBool = isCollateralRequired === 'true';

    try {
      if (isEdit) {
        const payload = {
          loanProductCollateralId: initialData.loanProductCollateralId,
          loanProductId: selectedLoanProductId,
          isCollateralRequired: collateralBool,
          modifiedBy: getCurrentUserId(),
        };
        await updateLoanProductCollateral(initialData.loanProductCollateralId, payload);
        toast.success('Updated successfully');
      } else {
        const payload = {
          loanProductId: selectedLoanProductId,
          isCollateralRequired: collateralBool,
          createdBy: getCurrentUserId(),
        };
        await createLoanProductCollateral(payload);
        toast.success('Created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Form submission failed:', err);
      if (err.response?.status === 409) {
        const backendMsg =
          err.response?.data?.message ||
          (typeof err.response?.data === 'string' ? err.response.data : null);
        const errorText = backendMsg || 'A record for this loan product already exists.';
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
        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
          Loading record...
        </div>
      </MasterModal>
    );
  }

  return (
    <MasterModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Loan Product Collateral' : 'Add Loan Product Collateral'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        {/* Loan Product Dropdown */}
        <div className="form-group">
          <label htmlFor="loanProductId" className="form-label">
            Loan Product <span className="text-danger">*</span>
          </label>
          <select
            id="loanProductId"
            className={`form-input ${error && error.includes('Loan Product') ? 'form-input-error' : ''}`}
            value={loanProductId}
            onChange={(e) => {
              setLoanProductId(e.target.value);
              if (error) setError(null);
            }}
            disabled={isSubmitting}
          >
            <option value="">Select Loan Product</option>
            {loanProducts.map((p) => (
              <option key={p.loanProductId} value={p.loanProductId}>
                {p.productName}
              </option>
            ))}
          </select>
          {error && error.includes('Loan Product') && (
            <span className="form-error-msg">{error}</span>
          )}
        </div>

        {/* Is Collateral Required Dropdown */}
        <div className="form-group">
          <label htmlFor="isCollateralRequired" className="form-label">
            Is Collateral Required <span className="text-danger">*</span>
          </label>
          <select
            id="isCollateralRequired"
            className={`form-input ${error && error.includes('Collateral requirement') ? 'form-input-error' : ''}`}
            value={isCollateralRequired}
            onChange={(e) => {
              setIsCollateralRequired(e.target.value);
              if (error) setError(null);
            }}
            disabled={isSubmitting}
          >
            <option value="">Select Option</option>
            <option value="true">Collateral Required</option>
            <option value="false">Collateral Not Required</option>
          </select>
          {error && error.includes('Collateral requirement') && (
            <span className="form-error-msg">{error}</span>
          )}
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="masters-btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button type="submit" className="masters-btn-primary" disabled={isSubmitting}>
            {isSubmitting
              ? isEdit
                ? 'Updating...'
                : 'Saving...'
              : isEdit
              ? 'Update'
              : 'Save'}
          </button>
        </div>
      </form>
    </MasterModal>
  );
}
