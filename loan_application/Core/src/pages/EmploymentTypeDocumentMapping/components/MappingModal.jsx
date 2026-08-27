import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './MappingModal.css';

const MappingModal = ({ isOpen, onClose, onSave, mapping, employmentTypes, documentTypes }) => {
  const [formData, setFormData] = useState({
    employmentTypeId: '',
    documentTypeName: '',
    documentTypeCode: '',
    isActive: true,
  });

  useEffect(() => {
    if (mapping) {
      const doc = documentTypes.find(d => (d.id || d.documentTypeId) == mapping.documentTypeId);
      setFormData({
        employmentTypeDocumentMappingId: mapping.employmentTypeDocumentMappingId,
        employmentTypeId: mapping.employmentTypeId,
        documentTypeId: mapping.documentTypeId,
        documentTypeName: doc ? (doc.name || doc.documentTypeName || doc.type || doc.description) : '',
        documentTypeCode: doc ? (doc.code || doc.documentTypeCode || '') : '',
        isActive: doc ? (doc.isActive !== undefined ? doc.isActive : true) : true, // Or mapping.isActive? User said Active/Inactive.
        mappingIsActive: mapping.isActive !== undefined ? mapping.isActive : true,
      });
    } else {
      setFormData({
        employmentTypeId: '',
        documentTypeName: '',
        documentTypeCode: '',
        isActive: true,
      });
    }
  }, [mapping, isOpen, documentTypes]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employmentTypeId || !formData.documentTypeName || !formData.documentTypeCode) {
      alert("Please fill all required fields.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // We pass the full formData up to the parent component, which will handle the dual API calls
      await onSave({
        ...formData,
        employmentTypeId: Number(formData.employmentTypeId),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = mapping ? "Edit Document Type" : "Add Document Type";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content mapping-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <h3>{title}</h3>
          </div>
          <button className="modal-close" onClick={onClose} disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Employment Type <span style={{ color: 'red' }}>*</span></label>
              <select
                name="employmentTypeId"
                value={formData.employmentTypeId}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              >
                <option value="">Select Employment Type</option>
                {employmentTypes.map((type) => (
                  <option key={type.id || type.employmentTypeId} value={type.id || type.employmentTypeId}>
                    {type.name || type.employmentTypeName || type.type || type.description}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Document Type Name <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                name="documentTypeName"
                value={formData.documentTypeName}
                onChange={handleChange}
                placeholder="Enter document type name"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label>Document Type Code <span style={{ color: 'red' }}>*</span></label>
              <input
                type="text"
                name="documentTypeCode"
                value={formData.documentTypeCode}
                onChange={handleChange}
                placeholder="Enter document type code"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="checkbox-group">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              <label htmlFor="isActive" style={{ margin: 0, fontWeight: 500, color: '#334155' }}>
                Is Active
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="std-btn std-btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="std-btn std-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : mapping ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MappingModal;
