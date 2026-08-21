import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle2, ArrowLeft } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout/AuthLayout';
import ProgressStepper from '../../components/common/ProgressStepper/ProgressStepper';
import OTPInput from '../../components/common/OTPInput/OTPInput';
import { CONSTANTS } from '../../utils/constants';
import { userRoleService } from '../../services/userRoleService';
import { useAuth } from '../../context/AuthContext';
import './OTPVerification.css';

const STEPS = [
  { label: 'Mobile Verification' },
  { label: 'OTP Verification' }
];

const OTPVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const mobile = location.state?.mobile || '9876543210';
  
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(CONSTANTS.RESEND_TIMER_SECONDS);

  useEffect(() => {
    if (!location.state?.mobile) {
      // In a real app we might redirect back if no mobile is found, 
      // but for this demo it's fine.
    }
  }, [location]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    
    return () => clearInterval(timerId);
  }, [timeLeft]);

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (otp.length !== CONSTANTS.OTP_LENGTH) {
      setError(`Please enter a valid ${CONSTANTS.OTP_LENGTH}-digit OTP`);
      return;
    }
    
    setLoading(true);
    
    try {
      if (otp === CONSTANTS.OTP) {
        const loginData = location.state?.loginData;
        
        if (loginData && (loginData.userId || loginData.id)) {
          const userId = loginData.userId || loginData.id;
          const userPermissionsResponse = await userRoleService.getUserEffectivePermissions(userId);
          login(loginData, userPermissionsResponse);
          
          // TODO: The backend login API does NOT return the user's role yet.
          // Later, when the backend returns 'role' or 'roleName', restore proper role-based routing.
          // if (userRole === 'CUSTOMER') { navigate('/customer/dashboard') } else { navigate('/dashboard') }
          navigate('/customer/dashboard', { state: { showLoginSuccess: true } });
        } else {
          login({ mobile, role: 'CUSTOMER' }, []);
          navigate('/customer/dashboard', { state: { showLoginSuccess: true } });
        }
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch {
      setError('Failed to verify and fetch permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (timeLeft > 0) return;
    
    // Reset timer
    setTimeLeft(CONSTANTS.RESEND_TIMER_SECONDS);
    setOtp('');
    setError('');
    // Simulate resend
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AuthLayout showTopRightSign={true}>
      <div className="signup-card-wrapper otp-card-wrapper">
        <div className="signup-header otp-header">
          <div className="user-icon-circle">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2>Secure Verification</h2>
          <p>Please enter the 6-digit verification code<br/>sent to your registered mobile number.</p>
        </div>

        <ProgressStepper steps={STEPS} currentStep={2} />

        <div className="success-banner">
          <div className="success-banner-content">
            <CheckCircle2 size={20} className="success-icon" />
            <div className="success-text">
              <span className="success-title">OTP has been sent to</span>
              <span className="success-email">+91 {mobile}</span>
            </div>
          </div>
          <Link to="/" className="edit-email-link">Edit Number</Link>
        </div>

        <form onSubmit={handleVerify} className="otp-form">
          <div className="form-group">
            <OTPInput 
              label={`Enter ${CONSTANTS.OTP_LENGTH}-digit OTP`}
              required
              length={CONSTANTS.OTP_LENGTH} 
              value={otp} 
              onChange={(val) => {
                setOtp(val);
                if (error) setError('');
              }} 
              error={error} 
            />
          </div>

          <div className="resend-section">
            <span className="resend-text">Didn't receive the code?</span>
            <button 
              type="button" 
              className={`resend-btn ${timeLeft > 0 ? 'disabled' : ''}`}
              onClick={handleResend}
              disabled={timeLeft > 0}
            >
              Resend OTP {timeLeft > 0 && `in ${formatTime(timeLeft)}`}
            </button>
          </div>

          <div className="auth-actions-group" style={{ marginTop: '1rem' }}>
            <button type="submit" className="premium-btn-primary" disabled={loading}>
              {loading ? (
                <div className="loading-dots"><span>.</span><span>.</span><span>.</span></div>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Verify & Authenticate</span>
                </>
              )}
            </button>
          </div>
          
          <div className="change-email-container">
            <Link to="/" className="change-email-link">
              <ArrowLeft size={16} />
              Change Mobile Number
            </Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
};

export default OTPVerification;
