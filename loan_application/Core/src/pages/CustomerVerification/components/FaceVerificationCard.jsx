import { Camera, ScanFace, UserCheck, User, CheckCircle2 } from 'lucide-react';
import Button from '../../../components/common/Button/Button';
import VerificationStep from './VerificationStep';
import StatusBadge from './StatusBadge';

const FACE_CHECKS = [
  { icon: ScanFace, title: 'Liveness Detection', description: 'We confirm you are a real, present person.' },
  { icon: UserCheck, title: 'Face Match', description: 'We match your face against your Aadhaar photo.' },
];

const FaceVerifiedSummary = ({ selfie, matchScore }) => (
  <div className="kyc-face-result">
    {selfie ? (
      <span className="kyc-face-selfie">
        <img src={selfie} alt="Captured selfie" />
      </span>
    ) : (
      <span className="kyc-details-check"><CheckCircle2 size={20} /></span>
    )}
    <div className="kyc-face-result-copy">
      <span className="kyc-details-title">Face Verified</span>
      <span className="kyc-face-score">{matchScore}% Match</span>
    </div>
    <StatusBadge status="verified" />
  </div>
);

const FaceVerificationCard = ({ status, data, onCapture }) => (
  <VerificationStep index={3} title="Face Verification" status={status} locked={status === 'locked'}>
    {status === 'verified' && data ? (
      <FaceVerifiedSummary selfie={data.selfie} matchScore={data.matchScore} />
    ) : (
      <div className="kyc-face">
        <div className="kyc-face-avatar"><User size={40} strokeWidth={1.5} /></div>
        <ul className="kyc-face-features">
          {FACE_CHECKS.map(({ icon: Icon, title, description }) => (
            <li className="kyc-face-feature" key={title}>
              <span className="kyc-face-feature-icon"><Icon size={18} /></span>
              <span className="kyc-face-feature-text">
                <span className="kyc-face-feature-title">{title}</span>
                <span className="kyc-face-feature-desc">{description}</span>
              </span>
            </li>
          ))}
        </ul>
        <Button variant="primary" icon={Camera} loading={status === 'verifying'} onClick={onCapture}>
          Capture Selfie
        </Button>
      </div>
    )}
  </VerificationStep>
);

export default FaceVerificationCard;
