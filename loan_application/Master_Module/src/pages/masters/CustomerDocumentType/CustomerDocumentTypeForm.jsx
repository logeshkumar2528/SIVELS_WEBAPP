import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import {
  createCustomerDocumentType,
  updateCustomerDocumentType,
  getCustomerDocumentTypeById,
} from '../../../api/masters/customerDocumentTypeApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';

const DEFAULT_FORM_STATE = {
  documentTypeName: '',
  documentTypeCode: '',
  isActive: true,
};

export function CustomerDocumentTypeForm({ isOpen, onClose, onSuccess, initialData }) {
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
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
          const response = await getCustomerDocumentTypeById(initialData.customerDocumentTypeId);
          const record = response?.data || response || {};
          if (isMounted) {
            setFormData({
              documentTypeName: record.documentTypeName ?? record.DocumentTypeName ?? '',
              documentTypeCode: record.documentTypeCode ?? record.DocumentTypeCode ?? '',
              isActive: (record.isActive ?? record.IsActive) !== false,
            });
          }
        } catch (err) {
          if (isMounted) {
            toast.error(getErrorMessage(err, 'Failed to load latest record data.'));
            onClose();
          }
        } finally {
          if (isMounted) setIsLoading(false);
        }
      } else {
        setFormData(DEFAULT_FORM_STATE);
      }
      setError(null);
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialData, onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = formData.documentTypeName.trim();
    const trimmedCode = formData.documentTypeCode.trim().toUpperCase();

    if (!trimmedName) {
      setError('Category Name is required');
      toast.error('Category Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Category Code is required');
      toast.error('Category Code is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const userId = Number(getCurrentUserId()) || 1;

    try {
      if (isEdit) {
        await updateCustomerDocumentType(initialData.customerDocumentTypeId, {
          customerDocumentTypeId: initialData.customerDocumentTypeId,
          documentTypeCode: trimmedCode,
          documentTypeName: trimmedName,
          isActive: Boolean(formData.isActive),
          modifiedBy: userId,
        });
        toast.success('Updated successfully');
      } else {
        await createCustomerDocumentType({
          documentTypeCode: trimmedCode,
          documentTypeName: trimmedName,
          isActive: Boolean(formData.isActive),
          createdBy: userId,
        });
        toast.success('Created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      const backendMessage = data?.message || data?.Message || data?.title || (typeof data === 'string' ? data : null);
      const message = backendMessage || getErrorMessage(err, 'Request failed');
      setError(message);
      toast.error(message);
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
      title={isEdit ? 'Edit Customer Document Category' : 'Add Customer Document Category'}
    >
      <form onSubmit={handleSubmit} className="masters-form">
        <div className="form-group">
          <label htmlFor="documentTypeName" className="form-label">
            Category Name <span className="text-danger">*</span>
          </label>
          <input
            id="documentTypeName"
            name="documentTypeName"
            type="text"
            className={`form-input ${error && error.includes('Name') ? 'form-input-error' : ''}`}
            value={formData.documentTypeName}
            onChange={handleChange}
            placeholder="e.g. Address Proof"
            disabled={isSubmitting}
            required
            autoComplete="off"
          />
          {error && error.includes('Name') && <span className="form-error-msg">{error}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="documentTypeCode" className="form-label">
            Category Code <span className="text-danger">*</span>
          </label>
          <input
            id="documentTypeCode"
            name="documentTypeCode"
            type="text"
            className={`form-input ${error && error.includes('Code') ? 'form-input-error' : ''}`}
            value={formData.documentTypeCode}
            onChange={handleChange}
            placeholder="e.g. ADDRESS_PROOF"
            disabled={isSubmitting}
            required
            autoComplete="off"
          />
          {error && error.includes('Code') && <span className="form-error-msg">{error}</span>}
        </div>

        {error && !error.includes('Name') && !error.includes('Code') && (
          <div className="form-error-msg" style={{ marginBottom: '1rem' }}>{error}</div>
        )}

        <MasterStatusCheckbox
          isActive={formData.isActive}
          onChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
          disabled={isSubmitting}
        />

        <div className="form-actions">
          <button type="button" className="masters-btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="masters-btn-primary" disabled={isSubmitting}>
            {isSubmitting ? (isEdit ? 'Updating...' : 'Saving...') : (isEdit ? 'Update' : 'Save')}
          </button>
        </div>
      </form>
    </MasterModal>
  );
}
