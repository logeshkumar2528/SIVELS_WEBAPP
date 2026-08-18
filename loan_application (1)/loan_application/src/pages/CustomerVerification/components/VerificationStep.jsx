import { Lock } from 'lucide-react';
import StatusBadge from './StatusBadge';

/* Numbered white card frame shared by Aadhaar, PAN and Face steps. */
const VerificationStep = ({ index, title, status, locked = false, children }) => (
  <section className={`kyc-step${locked ? ' kyc-step--locked' : ''}`}>
    <header className="kyc-step-head">
      <div className="kyc-step-heading">
        <span className="kyc-step-index">{index}</span>
        <h3 className="kyc-step-title">
          {title}
          <span className="kyc-badge kyc-badge--mandatory">Mandatory</span>
        </h3>
      </div>
      <div className="kyc-step-status">
        <span className="kyc-step-status-label">Verification Status</span>
        <StatusBadge status={status} />
      </div>
    </header>

    {locked ? (
      <div className="kyc-step-locked">
        <Lock size={16} />
        <span>Complete the previous step to unlock this verification.</span>
      </div>
    ) : (
      <div className="kyc-step-body">{children}</div>
    )}
  </section>
);

export default VerificationStep;
