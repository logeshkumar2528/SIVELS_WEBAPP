import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { TrendingUp } from 'lucide-react';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import { createRateOfInterest, updateRateOfInterest, getRateOfInterestById } from '../../../api/masters/rateOfInterestApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';

const getRateOfInterestId = (record) => record?.rateOfInterestId ?? record?.RateOfInterestId;
const getLoanProductId = (record) => record?.loanProductId ?? record?.LoanProductId ?? '';
const getInterestCode = (record) => record?.interestCode ?? record?.InterestCode ?? '';
const getInterestRate = (record) => record?.interestRate ?? record?.InterestRate ?? '';
const getEffectiveFrom = (record) => record?.effectiveFrom ?? record?.EffectiveFrom ?? '';
const getEffectiveTo = (record) => record?.effectiveTo ?? record?.EffectiveTo ?? '';
const getIsActive = (record) => record?.isActive ?? record?.IsActive;

export function RateOfInterestForm({ isOpen, onClose, onSuccess, editingRecord, loanProducts = [] }) {
  const [formData, setFormData] = useState({
    loanProductId: '',
    interestCode: '',
    interestRate: '',
    effectiveFrom: '',
    effectiveTo: '',
    isActive: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper to format date for input[type="date"] (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (editingRecord) {
      const loadRecord = async () => {
        setIsLoading(true);
        try {
          const id = getRateOfInterestId(editingRecord);
          if (id == null) {
            throw new Error('Missing rateOfInterestId on selected record');
          }

          const response = await getRateOfInterestById(id);
          const record = response?.data || response;

          if (!isMounted) return;

          setFormData({
            loanProductId: getLoanProductId(record),
            interestCode: getInterestCode(record),
            interestRate: getInterestRate(record),
            effectiveFrom: formatDateForInput(getEffectiveFrom(record)),
            effectiveTo: formatDateForInput(getEffectiveTo(record)),
            isActive: getIsActive(record) === true || getIsActive(record) === 1 || getIsActive(record) === '1'
          });
        } catch (err) {
          if (!isMounted) return;
          toast.error(getErrorMessage(err, 'Failed to load record data.'));
          onClose();
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };

      loadRecord();
    } else {
      setIsLoading(false);
      setFormData({
        loanProductId: '',
        interestCode: '',
        interestRate: '',
        effectiveFrom: '',
        effectiveTo: '',
        isActive: true
      });
    }
    setError('');
    return () => {
      isMounted = false;
    };
  }, [editingRecord, isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.interestCode.trim() || !formData.interestRate || !formData.loanProductId) {
      setError('Please fill in all required fields (Product, Code, Rate).');
      return;
    }

    setIsSubmitting(true);

    // Prepare payload
    const payload = {
      ...formData,
      rateOfInterestId: editingRecord ? getRateOfInterestId(editingRecord) : undefined,
      loanProductId: Number(formData.loanProductId),
      interestRate: Number(formData.interestRate),
      isActive: formData.isActive,
      modifiedBy: getCurrentUserId()
    };

    if (!payload.effectiveFrom) payload.effectiveFrom = null;
    if (!payload.effectiveTo) payload.effectiveTo = null;

    try {
      if (editingRecord) {
        await updateRateOfInterest(getRateOfInterestId(editingRecord), payload);
        toast.success('Updated successfully');
      } else {
        delete payload.modifiedBy;
        payload.createdBy = getCurrentUserId();
        await createRateOfInterest(payload);
        toast.success('Created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = getErrorMessage(err, 'An error occurred while saving.');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (isLoading) {
    return (
      <MasterModal isOpen={isOpen} onClose={onClose} title="Loading...">
        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
          Loading rate of interest...
        </div>
      </MasterModal>
    );
  }

  return (
    <MasterModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingRecord ? 'Edit Rate Of Interest' : 'Add Rate Of Interest'}
      icon={<TrendingUp size={24} />}
      subtitle={editingRecord ? 'Update rate of interest details' : 'Add a new rate of interest to the system'}
    >
      <form onSubmit={handleSubmit} className="masters-form rate-of-interest-form">
        {error && <div className="form-error-msg">{error}</div>}
        
        <div className="form-group">
          <label htmlFor="loanProductId" className="form-label">
            Loan Product <span className="text-danger">*</span>
          </label>
          <select
            id="loanProductId"
            name="loanProductId"
            className="form-input"
            value={formData.loanProductId}
            onChange={handleChange}
            disabled={isSubmitting || isLoading}
          >
            <option value="">Select Loan Product</option>
            {loanProducts.map(p => (
              <option key={p.loanProductId ?? p.LoanProductId} value={p.loanProductId ?? p.LoanProductId}>
                {p.productName || p.ProductName || p.loanProductName || p.LoanProductName || `Product ${p.loanProductId ?? p.LoanProductId}`}
              </option>
            ))}
          </select>
        </div>

        <div className="rate-of-interest-grid">
          <div className="form-group">
          <label htmlFor="interestCode" className="form-label">
            Interest Code <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            id="interestCode"
            name="interestCode"
            className="form-input"
            value={formData.interestCode}
            onChange={handleChange}
            placeholder="e.g., ROI-STD-01"
            maxLength={50}
            disabled={isSubmitting || isLoading}
          />
        </div>
        <div className="form-group">
            <label htmlFor="interestRate" className="form-label">
              Interest Rate (%) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              id="interestRate"
              name="interestRate"
              className="form-input"
              value={formData.interestRate}
              onChange={handleChange}
              placeholder="e.g., 13.00"
              disabled={isSubmitting || isLoading}
            />
          </div>
        </div>

        <div className="rate-of-interest-grid">
          <div className="form-group">
            <label htmlFor="effectiveFrom" className="form-label">
              Effective From
            </label>
            <input
              type="date"
              id="effectiveFrom"
              name="effectiveFrom"
              className="form-input"
              value={formData.effectiveFrom}
              onChange={handleChange}
              disabled={isSubmitting || isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="effectiveTo" className="form-label">
              Effective To
            </label>
            <input
              type="date"
              id="effectiveTo"
              name="effectiveTo"
              className="form-input"
              value={formData.effectiveTo}
              onChange={handleChange}
              disabled={isSubmitting || isLoading}
            />
          </div>
        </div>

        <div className="form-group">
          <MasterStatusCheckbox 
            isActive={formData.isActive}
            onChange={(isActive) => setFormData(prev => ({ ...prev, isActive }))}
            disabled={isSubmitting || isLoading}
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="masters-btn-secondary"
            onClick={onClose}
            disabled={isSubmitting || isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="masters-btn-primary"
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? (editingRecord ? 'Updating...' : 'Saving...') : (editingRecord ? 'Update Rate Of Interest' : 'Save Rate Of Interest')}
          </button>
        </div>
      </form>
    </MasterModal>
  );
}
