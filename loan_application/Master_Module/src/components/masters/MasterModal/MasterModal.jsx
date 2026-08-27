import { X } from 'lucide-react';
import './MasterModal.css';

export function MasterModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="master-modal-overlay">
      <div className="master-modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="master-modal-header">
          <h2 id="modal-title" className="master-modal-title">{title}</h2>
          <button 
            type="button" 
            className="master-modal-close" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        <div className="master-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
