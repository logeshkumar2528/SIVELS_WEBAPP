import { CheckCircle2, ArrowRight } from 'lucide-react';
import Button from '../../../components/common/Button/Button';

const VerificationSuccess = ({ onContinue }) => (
  <section className="kyc-success" style={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: '1.5rem 2rem', 
    textAlign: 'left', 
    flexDirection: 'row',
    marginTop: '1rem',
    gap: '1rem',
    flexWrap: 'wrap'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <span className="kyc-success-icon" style={{ margin: 0, width: '48px', height: '48px', flexShrink: 0 }}><CheckCircle2 size={24} /></span>
      <div>
        <h2 className="kyc-success-title" style={{ fontSize: '1.25rem', margin: '0 0 0.25rem 0' }}>KYC completed successfully!</h2>
        <p className="kyc-success-text" style={{ margin: 0, fontSize: '0.875rem' }}>
          Your identity has been verified.
        </p>
      </div>
    </div>
    
    <Button variant="primary" icon={ArrowRight} onClick={onContinue} style={{ margin: 0 }}>
      Continue
    </Button>
  </section>
);

export default VerificationSuccess;
