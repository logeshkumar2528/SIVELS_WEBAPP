import { memo, useEffect, useId } from 'react';
import iconMap from '../../config/iconMap';
import './Modal.css';

const Modal = memo(function Modal({ show, onHide, title, children, footer, size = 'md', className = '' }) {
  const XIcon = iconMap['X'];
  const titleId = useId();

  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="modal-backdrop" onClick={onHide}>
      <div
        className={`modal-container modal-container--${size} ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        {title && (
          <div className="modal-header">
            <h3 id={titleId} className="modal-title">{title}</h3>
            <button type="button" className="modal-close-btn" onClick={onHide} aria-label="Close modal">
              {XIcon && <XIcon size={18} />}
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
});

export default Modal;
