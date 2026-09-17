import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './ConfirmModal.css';

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Deletion",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  details = null,
  confirmText = "Yes, Delete",
  cancelText = "Cancel",
  isLoading = false,
  variant = "danger"
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className={`warning-icon-wrapper ${variant === 'danger' ? 'is-danger' : ''}`}>
              <AlertTriangle size={20} className="warning-icon" />
            </div>
            <h3 id="confirm-modal-title">{title}</h3>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
          {details && (
            <div className="confirm-modal-details-box">
              {typeof details === 'string' ? <span>{details}</span> : details}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="std-btn std-btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`std-btn ${variant === 'danger' ? 'std-btn-danger' : 'std-btn-primary'}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
