import { CheckCircle2 } from 'lucide-react';
import VerificationStep from './VerificationStep';

const CreditScoreCard = ({ status, data }) => {
  if (status === 'locked' || status === 'pending' || status === 'verifying') {
    return null;
  }
  
  if (status !== 'verified' || !data) return null;

  return (
    <div style={{ marginTop: '1.5rem', animation: 'fadeIn 0.5s ease-out' }}>
      <VerificationStep index="" title="Credit Profile" status="verified" locked={false}>
        <div className="kyc-details">
          <div className="kyc-details-head">
            <span className="kyc-details-check"><CheckCircle2 size={20} /></span>
            <span className="kyc-details-title">Credit Profile Verified</span>
          </div>
          
          <dl className="kyc-details-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="kyc-details-item">
              <dt className="kyc-details-label">CIBIL Score</dt>
              <dd className="kyc-details-value">
                {data.score} 
                <span style={{ fontSize: '0.875rem', color: '#16a34a', fontWeight: '600', marginLeft: '8px' }}>
                  ({data.category})
                </span>
              </dd>
            </div>
            <div className="kyc-details-item">
              <dt className="kyc-details-label">Risk Profile</dt>
              <dd className="kyc-details-value">Low Risk</dd>
            </div>
          </dl>
        </div>
      </VerificationStep>
    </div>
  );
};

export default CreditScoreCard;
