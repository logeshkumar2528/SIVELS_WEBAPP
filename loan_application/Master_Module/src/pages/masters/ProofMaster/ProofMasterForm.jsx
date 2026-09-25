import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { createProofMaster, updateProofMaster, getProofMasterById } from '../../../api/masters/proofMasterApi';
import { getDocumentTypes } from '../../../api/masters/documentTypeApi';
import { getErrorMessage } from '../../../utils/errorHelper';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import './ProofMaster.css';

export function ProofMasterForm({ isOpen, onClose, onSuccess, initialData }) {
  const defaultFormState = {
    documentTypeId: '',
    proofCode: '',
    proofName: '',
    isActive: true,
  };

  const [formData, setFormData] = useState(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [documentTypes, setDocumentTypes] = useState([]);

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const loadData = async () => {
      if (initialData) {
        setIsLoading(true);
        try {
          if (!initialData.proofId) {
            throw new Error('Missing proofId on selected record');
          }

          const response = await getProofMasterById(initialData.proofId);
          const record = response?.data || response?.value || response;

          if (isMounted) {
            setFormData({
              documentTypeId: record.documentTypeId ?? initialData.documentTypeId ?? '',
              proofCode: record.proofCode || initialData.proofCode || '',
              proofName: record.proofName || initialData.proofName || '',
              isActive: record.isActive !== false,
            });
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
        setFormData(defaultFormState);
      }
      setError(null);
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialData, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadDocTypes = async () => {
      try {
        const response = await getDocumentTypes();
        const records = Array.isArray(response) ? response : (response?.data || response?.value || []);
        if (isMounted) {
          setDocumentTypes(records);
        }
      } catch (err) {
        if (isMounted) {
          const message = getErrorMessage(err, 'Unable to load document types.');
          setError(message);
          toast.error(message);
        }
      }
    };

    loadDocTypes();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.documentTypeId) {
      setError('Document Type is required.');
      toast.error('Document Type is required.');
      return;
    }

    const trimmedCode = formData.proofCode.trim();
    if (!trimmedCode) {
      setError('Proof Code is required.');
      toast.error('Proof Code is required.');
      return;
    }

    const trimmedName = formData.proofName.trim();
    if (!trimmedName) {
      setError('Proof Name is required.');
      toast.error('Proof Name is required.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        documentTypeId: Number(formData.documentTypeId),
        proofCode: trimmedCode,
        proofName: trimmedName,
        isActive: Boolean(formData.isActive),
      };

      if (isEdit) {
        await updateProofMaster(initialData.proofId, payload);
        toast.success('Proof updated successfully');
      } else {
        await createProofMaster(payload);
        toast.success('Proof created successfully');
      }

      onClose();
      await onSuccess();
    } catch (err) {
      const errorMessage = getErrorMessage(
        err,
        isEdit ? 'Failed to update proof master.' : 'Failed to create proof master.'
      );
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeDocumentTypes = documentTypes.filter(
    (item) => item.isActive !== false || Number(item.documentTypeId) === Number(formData.documentTypeId)
  );

  return (
    <MasterModal
      isOpen={isOpen}
      onClose={isSubmitting ? undefined : onClose}
      title={isEdit ? 'Edit Proof Master' : 'Add Proof Master'}
    >
      {isLoading ? (
        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading record...</div>
      ) : (
        <form className="masters-form" onSubmit={handleSubmit}>
          {error && <div className="form-error-msg">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="documentTypeId">
              Document Type <span className="text-danger">*</span>
            </label>
            <select
              id="documentTypeId"
              name="documentTypeId"
              className={`form-input ${error && !formData.documentTypeId ? 'form-input-error' : ''}`}
              value={formData.documentTypeId}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="">Select Document Type</option>
              {activeDocumentTypes.map((item) => (
                <option key={item.documentTypeId} value={item.documentTypeId}>
                  {item.documentTypeName || item.documentTypeCode || item.documentTypeId}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="proofCode">
              Proof Code <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              id="proofCode"
              name="proofCode"
              className={`form-input ${error && !formData.proofCode.trim() ? 'form-input-error' : ''}`}
              value={formData.proofCode}
              onChange={handleChange}
              placeholder="e.g. SALARY_SLIP"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="proofName">
              Proof Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              id="proofName"
              name="proofName"
              className={`form-input ${error && !formData.proofName.trim() ? 'form-input-error' : ''}`}
              value={formData.proofName}
              onChange={handleChange}
              placeholder="e.g. Latest Salary Slip"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group-checkbox">
            <MasterStatusCheckbox
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              label="Active Status"
              disabled={isSubmitting}
            />
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
            <button
              type="submit"
              className="masters-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      )}
    </MasterModal>
  );
}
