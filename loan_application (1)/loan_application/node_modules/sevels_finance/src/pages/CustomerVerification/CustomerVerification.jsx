import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import './CustomerVerification.css';
import LoadingOverlay from '../../components/common/Loading';
import { useKycFlow } from './useKycFlow';
import AadhaarVerificationCard from './components/AadhaarVerificationCard';
import PANVerificationCard from './components/PANVerificationCard';
import CreditScoreCard from './components/CreditScoreCard';
import DigiLockerModal from './components/DigiLockerModal';
import OTPVerificationModal from './components/OTPVerificationModal';
import ConsentModal from './components/ConsentModal';
import CameraModal from './components/CameraModal';
import VerificationSuccess from './components/VerificationSuccess';

const CustomerVerification = () => {
  const navigate = useNavigate();
  const kyc = useKycFlow();

  const handleContinue = () => navigate('/customer/dashboard');

  return (
    <div className="kyc-verification-container">

      {/* Sticky Header Section - Reused Stepper UI */}
      <div className="kyc-header-sticky">
        <div className="kyc-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', width: '100%', maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#16a34a' }}>
              <CheckCircle2 size={18} />
              <span>Register</span>
            </div>
            <div style={{ flex: 1, height: '2px', backgroundColor: '#16a34a', margin: '0 1rem', maxWidth: '100px' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#16a34a' }}>
              <CheckCircle2 size={18} />
              <span>Profile</span>
            </div>
            <div style={{ flex: 1, height: '2px', backgroundColor: '#16a34a', margin: '0 1rem', maxWidth: '100px' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#2563eb' }}>
              <div style={{ width: '1.25rem', height: '1.25rem', borderRadius: '9999px', border: '2px solid #2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>3</div>
              <span>KYC</span>
            </div>
          </div>
        </div>
      </div>

      {/* KYC Workflow */}
      <div className="kyc-content">
        <div className="kyc-intro">
          <h2 className="kyc-intro-title">KYC Verification</h2>
          <p className="kyc-intro-subtitle">
            Complete the mandatory verification below to proceed with your loan application.
          </p>
        </div>

        <AadhaarVerificationCard
          status={kyc.aadhaarStatus}
          data={kyc.aadhaarData}
          onVerify={kyc.openDigiLocker}
        />
        <PANVerificationCard
          status={kyc.panStatus}
          data={kyc.panData}
          onVerify={kyc.verifyPan}
        />
        <CreditScoreCard
          status={kyc.creditScoreStatus}
          data={kyc.creditScoreData}
        />

        {kyc.isKycComplete && <VerificationSuccess onContinue={handleContinue} />}
      </div>

      {/* Flow modals */}
      {kyc.activeModal === 'digilocker' && (
        <DigiLockerModal onSendOtp={kyc.submitMobileNumber} onClose={kyc.closeModal} />
      )}
      {kyc.activeModal === 'otp' && (
        <OTPVerificationModal
          mobileNumber={kyc.mobileNumber}
          onVerify={kyc.verifyOtp}
          onClose={kyc.closeModal}
        />
      )}
      {kyc.activeModal === 'consent' && (
        <ConsentModal onAllow={kyc.allowConsent} onCancel={kyc.closeModal} />
      )}

      {/* Shared loading overlay: conic ring while loading, shield check on success */}
      <LoadingOverlay
        isOpen={Boolean(kyc.loadingPhase)}
        variant={kyc.loadingPhase || 'loading'}
        message={kyc.loadingMessage}
      />

    </div>
  );
};

export default CustomerVerification;
