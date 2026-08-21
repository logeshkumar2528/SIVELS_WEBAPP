import { ShieldCheck } from 'lucide-react';
import Modal from './Modal';
import Button from '../../../components/common/Button/Button';

const SHARED_DETAILS = ['Full Name', 'Date of Birth', 'Gender', 'Address', 'Masked Aadhaar Number'];

const ConsentModal = ({ onAllow, onCancel }) => (
  <Modal
    title="Consent Required"
    onClose={onCancel}
    footer={
      <>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={onAllow}>Allow</Button>
      </>
    }
  >
    <div className="kyc-consent">
      <span className="kyc-consent-icon"><ShieldCheck size={22} /></span>
      <p className="kyc-consent-text">
        <strong>SIVELS FINANCE</strong> is requesting permission to access your Aadhaar details from DigiLocker.
      </p>
    </div>
    <ul className="kyc-consent-list">
      {SHARED_DETAILS.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  </Modal>
);

export default ConsentModal;
