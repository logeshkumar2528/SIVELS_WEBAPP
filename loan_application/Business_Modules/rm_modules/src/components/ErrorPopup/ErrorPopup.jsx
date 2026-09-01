import { AlertTriangle } from 'lucide-react';
import Button from '../Button/Button';
import Modal from '../Modal/Modal';

export default function ErrorPopup({ show, title = 'Something went wrong', message, details, onClose }) {
  const formattedDetails = details && typeof details === 'object'
    ? JSON.stringify(details, null, 2)
    : details;

  return (
    <Modal
      show={show}
      onHide={onClose}
      title={title}
      size="sm"
      footer={<Button variant="primary" onClick={onClose}>Close</Button>}
    >
      <div className="error-popup-content">
        <AlertTriangle size={28} className="error-popup-icon" aria-hidden="true" />
        <div className="error-popup-message">
          <p>{message}</p>
          {formattedDetails && <pre className="error-popup-details">{formattedDetails}</pre>}
        </div>
      </div>
    </Modal>
  );
}
