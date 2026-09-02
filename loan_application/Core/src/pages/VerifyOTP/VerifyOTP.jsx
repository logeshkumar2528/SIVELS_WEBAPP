import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ArrowRight, Edit2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { CONSTANTS } from '../../utils/constants';
import { detectAccountModule, normalizeMobileNumber } from '../../services/moduleDetectionService';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import './VerifyOTP.css';

const MASTER_MOBILE = '9345638126';
const MASTER_OTP = '123456';

export default function VerifyOTP() {
  const OTP_LENGTH = CONSTANTS.OTP_LENGTH || 6;

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(CONSTANTS.RESEND_TIMER_SECONDS || 45);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const inputRefs = useRef([]);
  const toastTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const mobileNumber = location.state?.mobileNumber || '';
  const moduleName = location.state?.module;
  const destination = location.state?.destination;
  const accountData = location.state?.accountData;
  const initialOtpResponse = location.state?.otpResponse;

  const showToast = (type, title, message) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ type, title, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!mobileNumber) {
      navigate('/login', { replace: true });
    }
  }, [mobileNumber, navigate]);

  useEffect(() => {
    if (initialOtpResponse) {
      showToast(
        'success',
        'OTP sent successfully',
        'A new OTP has been sent to your registered mobile number.'
      );
    }
  }, [initialOtpResponse]);

  // ── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // ── OTP input handlers ───────────────────────────────────────────────────
  const handleChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned && value !== '') return;

    const char = cleaned.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);
    if (errorMessage) setErrorMessage('');

    // Auto-advance to next box
    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otp[index] === '' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newOtp = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((char, idx) => {
      newOtp[idx] = char;
    });
    setOtp(newOtp);
    if (errorMessage) setErrorMessage('');

    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  // ── Submit & Verify OTP ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const enteredOtp = otp.join('');

    if (enteredOtp.length !== OTP_LENGTH) {
      setErrorMessage('Please enter all 6 digits.');
      showToast('error', 'Invalid OTP', 'Please enter all 6 digits.');
      return;
    }

    const cleanMobile = normalizeMobileNumber(mobileNumber);

    // Special isolated condition ONLY for Master Mobile: 9345638126
    if (cleanMobile === MASTER_MOBILE) {
      if (enteredOtp === MASTER_OTP) {
        setLoading(true);
        setErrorMessage('');
        showToast('success', 'OTP Verified', 'Verification successful. Redirecting...');

        const masterAccount = accountData || {
          mobileNumber: cleanMobile,
          fullName: 'Master Admin',
          role: 'Master',
        };

        const userData = {
          ...masterAccount,
          mobileNumber: cleanMobile,
          role: 'Master',
        };

        login(userData, {});
        localStorage.setItem('sivels_currentUser', JSON.stringify(userData));
        localStorage.setItem('masterData', JSON.stringify(masterAccount));

        setTimeout(() => {
          window.location.href = destination || '/master/dashboard';
        }, 500);
      } else {
        setErrorMessage('Invalid OTP. Please check the code and try again.');
        showToast('error', 'Invalid OTP', 'Invalid OTP. Please check the code and try again.');
      }
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {

      // 1. Verify OTP solely through the Backend API (POST /MobileOtp/verify-mobile-otp)
      let result;
      try {
        result = await authService.verifyMobileOtp(cleanMobile, enteredOtp);
      } catch (apiErr) {
        setLoading(false);
        const errMsg = apiErr.message || 'Invalid OTP. Please check the code and try again.';
        setErrorMessage(errMsg);
        showToast('error', 'Invalid OTP', errMsg);
        return;
      }

      // Explicitly inspect API response body - verify success condition
      const isLoginSuccessfulMessage =
        typeof result?.message === 'string' &&
        result.message.trim().toLowerCase() === 'login successful';

      const isSuccess =
        result?.success === true ||
        result?.isSuccess === true ||
        result?.data?.success === true ||
        isLoginSuccessfulMessage;

      if (!isSuccess) {
        setLoading(false);
        const errMsg = result?.message || result?.error || 'Invalid OTP. Please check the code and try again.';
        setErrorMessage(errMsg);
        showToast('error', 'Invalid OTP', errMsg);
        return;
      }

      // 2. Clear any error banner and show brief success notification
      setErrorMessage('');
      showToast('success', 'OTP Verified', 'Verification successful. Redirecting...');

      // 3. Resolve destination module & account
      let resolvedModule = moduleName;
      let resolvedDestination = destination;
      let resolvedAccount = accountData;

      if (!resolvedModule || !resolvedDestination || !resolvedAccount) {
        const detection = await detectAccountModule(cleanMobile);
        if (detection.destination) {
          resolvedModule = detection.module;
          resolvedDestination = detection.destination;
          resolvedAccount = detection.accountData;
        } else {
          setErrorMessage(detection.error || 'Account could not be verified. Please log in again.');
          setLoading(false);
          return;
        }
      }

      // 4. Construct user profile & set auth session
      const userData = {
        ...resolvedAccount,
        mobileNumber: cleanMobile,
        role: resolvedModule,
      };

      login(userData, {});

      // 5. Persist account information for standalone Vite modules
      localStorage.setItem('sivels_currentUser', JSON.stringify(userData));
      if (resolvedModule === 'Agent') {
        localStorage.setItem('agentData', JSON.stringify(resolvedAccount));
        if (resolvedAccount.agentId) {
          localStorage.setItem('agentId', String(resolvedAccount.agentId));
        }
      } else if (resolvedModule === 'RM') {
        localStorage.setItem('rmData', JSON.stringify(resolvedAccount));
        if (resolvedAccount.rmId) {
          localStorage.setItem('rmId', String(resolvedAccount.rmId));
        }
      } else if (resolvedModule === 'Customer') {
        localStorage.setItem('customerData', JSON.stringify(resolvedAccount));
        if (resolvedAccount.agentCustomerId || resolvedAccount.customerId) {
          localStorage.setItem('customerId', String(resolvedAccount.agentCustomerId || resolvedAccount.customerId));
        }
      } else if (resolvedModule === 'Master') {
        localStorage.setItem('masterData', JSON.stringify(resolvedAccount));
      }

      // 6. Brief pause to allow success toast to show before page transition
      setTimeout(() => {
        window.location.href = resolvedDestination;
      }, 500);

    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please try again.');
      showToast('error', 'Authentication failed', err.message || 'Please try again.');
      setLoading(false);
    }
  };

  const isComplete = otp.every((digit) => digit !== '');

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    const cleanMobile = normalizeMobileNumber(mobileNumber);
    if (!cleanMobile) return;

    setTimer(CONSTANTS.RESEND_TIMER_SECONDS || 45);
    setOtp(Array(OTP_LENGTH).fill(''));
    setErrorMessage('');
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
    if (cleanMobile === MASTER_MOBILE) {
      showToast(
        'success',
        'OTP sent successfully',
        'A new OTP has been sent to your registered mobile number.'
      );
      return;
    }

    try {
      await authService.sendOtp(cleanMobile);
      showToast(
        'success',
        'OTP sent successfully',
        'A new OTP has been sent to your registered mobile number.'
      );
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend OTP. Please try again.');
      showToast('error', 'Failed to send OTP', err.message || 'Please check your connection and try again.');
    }
  };

  return (
    <div className="login-container">
      {/* Non-blocking Professional Toast Notification */}
      {toast && (
        <div className={`otp-toast ${toast.type}`} role="status" aria-live="polite">
          <div className="otp-toast-icon">
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
          </div>
          <div className="otp-toast-content">
            <span className="otp-toast-title">{toast.title}</span>
            {toast.message && <span className="otp-toast-message">{toast.message}</span>}
          </div>
          <button
            type="button"
            className="otp-toast-close"
            onClick={() => setToast(null)}
            aria-label="Close notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="verify-main-card">
        <button type="button" className="back-btn" onClick={() => navigate('/login')}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div className="verify-header">
          <div className="icon-circle">
            <ShieldCheck size={28} className="primary-icon" />
          </div>
          <h2>Verify OTP</h2>
          <p>
            <span>We have sent a {OTP_LENGTH}-digit OTP to</span>
            <span className="bold-number">
              +91 {mobileNumber}
              <button type="button" className="edit-btn" onClick={() => navigate('/login')}>
                <Edit2 size={12} />
                <span>Edit</span>
              </button>
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="verify-form">
          <div className="otp-error-wrapper">
            {errorMessage && (
              <div className="otp-error-banner">
                <AlertCircle size={15} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <div className="otp-inputs" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                ref={(el) => (inputRefs.current[index] = el)}
                className={`otp-digit ${digit ? 'filled' : ''}`}
                disabled={loading}
                autoFocus={index === 0}
              />
            ))}
          </div>

          <div className="resend-container">
            <span className="resend-text">Didn't receive OTP?</span>
            <button
              type="button"
              className={`resend-btn ${timer > 0 ? 'disabled' : ''}`}
              disabled={timer > 0 || loading}
              onClick={handleResend}
            >
              Resend OTP
            </button>
            {timer > 0 && (
              <span className="timer">00:{timer.toString().padStart(2, '0')}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={!isComplete || loading}
          >
            {loading ? (
              <span>Verifying...</span>
            ) : (
              <>
                <span>Verify &amp; Login</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="secure-footer">
          <ShieldCheck size={14} className="secure-icon" />
          <span>Secure verification helps us keep your account safe and secure.</span>
        </div>
      </div>
    </div>
  );
}
