import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ArrowRight, Edit2, AlertCircle } from 'lucide-react';
import { CONSTANTS } from '../../utils/constants';
import { detectAccountModule, normalizeMobileNumber } from '../../services/moduleDetectionService';
import { useAuth } from '../../context/AuthContext';
import './VerifyOTP.css';

export default function VerifyOTP() {
  // OTP_LENGTH from constants (currently 4)
  const OTP_LENGTH = CONSTANTS.OTP_LENGTH;

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(CONSTANTS.RESEND_TIMER_SECONDS);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const mobileNumber = location.state?.mobileNumber || '';
  const moduleName = location.state?.module;
  const destination = location.state?.destination;
  const accountData = location.state?.accountData;

  useEffect(() => {
    if (!mobileNumber) {
      navigate('/login', { replace: true });
    }
  }, [mobileNumber, navigate]);

  // ── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // ── OTP input handlers ───────────────────────────────────────────────────
  const handleChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (errorMessage) setErrorMessage('');

    // Auto-advance to next box
    if (value !== '' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const enteredOtp = otp.join('');

    // Validate OTP (Master requires '1234'; other accounts follow CONSTANTS.OTP)
    const isMaster = normalizeMobileNumber(mobileNumber) === '9841446699' || moduleName === 'Master';
    const expectedOtp = isMaster ? '1234' : CONSTANTS.OTP;

    if (enteredOtp !== expectedOtp) {
      setErrorMessage('Invalid OTP. Please try again.');
      return;
    }

    setLoading(true);
    try {
      let resolvedModule = moduleName;
      let resolvedDestination = destination;
      let resolvedAccount = accountData;

      // If missing from location.state (e.g. direct access or refresh), detect dynamically
      if (!resolvedModule || !resolvedDestination || !resolvedAccount) {
        const detection = await detectAccountModule(mobileNumber);
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

      // Construct dynamic user profile for AuthContext & localStorage
      const userData = {
        ...resolvedAccount,
        mobileNumber: normalizeMobileNumber(mobileNumber),
        role: resolvedModule,
      };

      // Set user session in AuthContext
      login(userData, {});

      // Persist detected account information dynamically for standalone Vite modules
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

      // Navigate across module boundaries using window.location.href
      // so Vite serves the standalone module (Agent, RM, Customer, or Master)
      window.location.href = resolvedDestination;

    } catch (err) {
      setErrorMessage('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Submit button is enabled only when all OTP_LENGTH boxes are filled
  const isComplete = otp.every((digit) => digit !== '');

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = () => {
    // No OTP API — just reset timer and clear boxes
    setTimer(CONSTANTS.RESEND_TIMER_SECONDS);
    setOtp(Array(OTP_LENGTH).fill(''));
    setErrorMessage('');
    // Focus first box
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  };

  return (
    <div className="login-container">
      <div className="verify-main-card login-card">
        <button type="button" className="back-btn" onClick={() => navigate('/login')}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <div className="verify-header login-header">
          <div className="icon-circle">
            <ShieldCheck size={28} className="primary-icon" />
          </div>
          <h2>Verify OTP</h2>
          <p>
            We have sent a {OTP_LENGTH}-digit OTP to<br />
            <span className="bold-number">+91 {mobileNumber}</span>
            <button type="button" className="edit-btn" onClick={() => navigate('/login')}>
              <Edit2 size={12} />
              <span>Edit</span>
            </button>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="verify-form">
          <div className="otp-error-wrapper">
            {errorMessage && (
              <div className="otp-error-banner">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <div className="otp-inputs">
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
