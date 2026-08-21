import { ShieldCheck } from 'lucide-react';
import Button from '../../../components/common/Button/Button';
import VerificationStep from './VerificationStep';
import AadhaarDetailsCard from './AadhaarDetailsCard';

const AadhaarVerificationCard = ({ status, data, onVerify }) => (
  <VerificationStep index={1} title="Aadhaar Verification" status={status}>
    {status === 'verified' && data ? (
      <AadhaarDetailsCard data={data} />
    ) : (
      <div className="kyc-cta">
        <div className="kyc-cta-copy">
          <p className="kyc-cta-title">Verify your Aadhaar via DigiLocker</p>
          <p className="kyc-cta-text">
            We securely fetch your Aadhaar details directly from DigiLocker — no manual upload required.
          </p>
        </div>
        <Button
          variant="primary"
          icon={ShieldCheck}
          loading={status === 'verifying'}
          onClick={onVerify}
        >
          Verify using DigiLocker
        </Button>
      </div>
    )}
  </VerificationStep>
);

export default AadhaarVerificationCard;
