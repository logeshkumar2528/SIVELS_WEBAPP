import { useEffect } from 'react';
import iconMap from '../../config/iconMap';
import './Modal.css';

export default function Modal({ isOpen, onClose, title, children }) {
  const CloseIcon = iconMap['X'];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose && onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            {CloseIcon && <CloseIcon size={18} />}
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
