import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, Send, CheckCircle2, X } from 'lucide-react';
import AuthLayout from '../../components/layout/AuthLayout/AuthLayout';
import Input from '../../components/common/Input/Input';
import ProgressStepper from '../../components/common/ProgressStepper/ProgressStepper';
import { validateMobile } from '../../utils/validation';
import { authService } from '../../services/authService';
import './SignUp.css';

const STEPS = [
  { label: 'Mobile Verification' },
  { label: 'OTP Verification' }
];

const SignUp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (location.state?.showRegistrationSuccess) {
      setShowToast(true);
      window.history.replaceState({}, document.title);
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    // Validate
    const validationError = validateMobile(mobile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await authService.login(mobile);
      navigate('/otp', { state: { mobile, loginData: response } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout theme="signup">
      {showToast && (
        <div className="registration-success-toast">
          <CheckCircle2 size={20} className="toast-icon" />
          <div className="toast-content">
            <span className="toast-title">Registered Successfully</span>
            <span className="toast-desc">You can now login with your mobile number.</span>
          </div>
          <button type="button" className="toast-close" onClick={() => setShowToast(false)}>
            <X size={16} />
          </button>
        </div>
      )}
      <div className="signup-card-wrapper">
        <div className="signup-header">
          <div className="user-icon-circle">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <h2>Welcome Back</h2>
          <p>Enter your registered mobile number to<br/>access your financial dashboard.</p>
        </div>

        <ProgressStepper steps={STEPS} currentStep={1} />

        <form onSubmit={handleSendOTP} className="signup-form">
          <div className="form-group auth-field">
            <Input 
              variant="auth"
              label="Mobile Number"
              placeholder="Enter your mobile number"
              icon={Phone}
              type="tel"
              value={mobile}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setMobile(val);
                if (error) setError('');
              }}
              error={error}
            />
          </div>

          <div className="info-text">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>We'll send a 6-digit OTP to this mobile number</span>
          </div>

          <div className="auth-actions-group">
            <button type="submit" className="premium-btn-primary" disabled={loading}>
              {loading ? (
                <div className="loading-dots"><span>.</span><span>.</span><span>.</span></div>
              ) : (
                <>
                  <span>Continue Securely</span>
                  <Send size={16} />
                </>
              )}
            </button>
            
            <button type="button" className="premium-btn-outline" onClick={() => navigate('/customer-registration')}>
              Register New Account
            </button>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
};

export default SignUp;