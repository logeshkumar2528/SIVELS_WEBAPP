import { useState } from 'react';
import { Smartphone } from 'lucide-react';
import Modal from './Modal';
import Input from '../../../components/common/Input/Input';
import Button from '../../../components/common/Button/Button';

const MOBILE_LENGTH = 10;

const DigiLockerModal = ({ onSendOtp, onClose }) => {
  const [mobileNumber, setMobileNumber] = useState('');
  const isValid = mobileNumber.length === MOBILE_LENGTH;

  const handleChange = (event) => {
    setMobileNumber(event.target.value.replace(/\D/g, '').slice(0, MOBILE_LENGTH));
  };

  return (
    <Modal
      title="Connect DigiLocker"
      subtitle="Login using your mobile number to securely fetch your Aadhaar details."
      onClose={onClose}
      footer={
        <Button variant="primary" disabled={!isValid} onClick={() => onSendOtp(mobileNumber)}>
          Send OTP
        </Button>
      }
    >
      <Input
        label="Mobile Number"
        required
        type="tel"
        inputMode="numeric"
        icon={Smartphone}
        placeholder="Enter 10 digit mobile number"
        value={mobileNumber}
        onChange={handleChange}
      />
      <p className="kyc-dialog-note">A one-time password will be sent to this number.</p>
    </Modal>
  );
};

export default DigiLockerModal;
