import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/* First field / interactive control to receive focus when a modal opens
   (the close button is skipped so focus lands on the real input). */
const FOCUSABLE_SELECTOR =
  'input:not([type="hidden"]):not([disabled]), textarea, select, button:not(.kyc-dialog-close)';

/* Base modal shell reused by every KYC dialog (DigiLocker, OTP, Consent, Camera). */
const Modal = ({ title, subtitle, size = 'md', onClose, children, footer }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.querySelector(FOCUSABLE_SELECTOR)?.focus();
  }, []);

  useEffect(() => {
    if (!onClose) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div className="kyc-overlay" role="presentation" onClick={handleOverlayClick}>
      <div ref={dialogRef} className={`kyc-dialog kyc-dialog--${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="kyc-dialog-head">
          <div className="kyc-dialog-heading">
            <h3 className="kyc-dialog-title">{title}</h3>
            {subtitle && <p className="kyc-dialog-subtitle">{subtitle}</p>}
          </div>
          {onClose && (
            <button type="button" className="kyc-dialog-close" aria-label="Close" onClick={onClose}>
              <X size={18} />
            </button>
          )}
        </header>

        <div className="kyc-dialog-body">{children}</div>

        {footer && <footer className="kyc-dialog-foot">{footer}</footer>}
      </div>
    </div>
  );
};

export default Modal;
