import { AlertCircle, AlertTriangle } from 'lucide-react';
import Button from '../Button/Button';
import Modal from '../Modal/Modal';
import { extractErrorItems } from '../../utils/formatUserFacingError';

export default function ErrorPopup({
  show,
  title = 'Something went wrong',
  message,
  details,
  variant,
  onClose,
}) {
  const items = extractErrorItems(details);
  const isValidation = variant === 'validation' || (items.length > 0 && variant !== 'error');
  const Icon = isValidation ? AlertCircle : AlertTriangle;
  const resolvedTitle = title || (isValidation ? 'Please check the form' : 'Something went wrong');

  return (
    <Modal
      show={show}
      onHide={onClose}
      title={resolvedTitle}
      size="sm"
      footer={<Button variant="primary" onClick={onClose}>OK</Button>}
    >
      <div className={`error-popup-content ${isValidation ? 'error-popup-content--validation' : 'error-popup-content--error'}`}>
        <div className={`error-popup-icon-wrap ${isValidation ? 'is-validation' : 'is-error'}`} aria-hidden="true">
          <Icon size={22} className="error-popup-icon" />
        </div>
        <div className="error-popup-message">
          {message ? <p className="error-popup-summary">{message}</p> : null}
          {items.length > 0 ? (
            <ul className="error-popup-list">
              {items.map((item, index) => (
                <li key={`${item.label}-${item.message}-${index}`}>
                  {item.label ? (
                    <>
                      <span className="error-popup-field">{item.label}</span>
                      <span className="error-popup-sep">—</span>
                    </>
                  ) : null}
                  <span className="error-popup-item-text">{item.message}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
