import { useState } from 'react';
import Modal from './Modal';
import OTPInput from '../../../components/common/OTPInput/OTPInput';
import Button from '../../../components/common/Button/Button';

const OTP_LENGTH = 6;

const OTPVerificationModal = ({ mobileNumber, onVerify, onClose }) => {
  const [otp, setOtp] = useState('');
  const isValid = otp.length === OTP_LENGTH;

  return (
    <Modal
      title="Verify OTP"
      subtitle={`Enter the ${OTP_LENGTH}-digit OTP sent to +91 ${mobileNumber}.`}
      onClose={onClose}
      footer={
        <Button variant="primary" disabled={!isValid} onClick={onVerify}>
          Verify
        </Button>
      }
    >
      <OTPInput label="One-Time Password" required length={OTP_LENGTH} value={otp} onChange={setOtp} />
      <p className="kyc-dialog-note">Didn’t receive the code? Resend OTP</p>
    </Modal>
  );
};

export default OTPVerificationModal;
