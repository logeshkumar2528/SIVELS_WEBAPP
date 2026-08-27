import { useState } from 'react';
import { CreditCard, Info, CheckCircle2 } from 'lucide-react';
import Input from '../../../components/common/Input/Input';
import Button from '../../../components/common/Button/Button';
import VerificationStep from './VerificationStep';

const PAN_LENGTH = 10;

const PanVerifiedSummary = ({ data }) => (
  <div className="kyc-details">
    <div className="kyc-details-head">
      <span className="kyc-details-check"><CheckCircle2 size={20} /></span>
      <span className="kyc-details-title">PAN Verified</span>
    </div>
    <dl className="kyc-details-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
      <div className="kyc-details-item">
        <dt className="kyc-details-label">PAN Number</dt>
        <dd className="kyc-details-value">{data.number}</dd>
      </div>
      <div className="kyc-details-item">
        <dt className="kyc-details-label">Name</dt>
        <dd className="kyc-details-value">{data.name}</dd>
      </div>
      <div className="kyc-details-item">
        <dt className="kyc-details-label">Card Type</dt>
        <dd className="kyc-details-value">{data.type}</dd>
      </div>
    </dl>
  </div>
);

const PANVerificationCard = ({ status, data, onVerify }) => {
  const [panNumber, setPanNumber] = useState('');
  const isValid = panNumber.length === PAN_LENGTH;

  const handleChange = (event) => {
    const value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, PAN_LENGTH);
    setPanNumber(value);
  };

  const renderBody = () => {
    if (status === 'verified' && data) {
      return <PanVerifiedSummary data={data} />;
    }
    return (
      <div className="kyc-form">
        <div className="kyc-form-field">
          <Input
            label="PAN Number"
            required
            icon={CreditCard}
            placeholder="Enter 10 digit PAN number"
            value={panNumber}
            onChange={handleChange}
          />
          <p className="kyc-field-helper"><Info size={14} /> Enter your PAN as per Income Tax records.</p>
        </div>
        <Button variant="primary" disabled={!isValid} onClick={() => onVerify(panNumber)}>
          Verify PAN
        </Button>
      </div>
    );
  };

  return (
    <VerificationStep index={2} title="PAN Verification" status={status} locked={status === 'locked'}>
      {renderBody()}
    </VerificationStep>
  );
};

export default PANVerificationCard;
