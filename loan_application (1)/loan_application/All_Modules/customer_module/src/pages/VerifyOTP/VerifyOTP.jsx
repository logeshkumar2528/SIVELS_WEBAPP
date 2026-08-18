import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ArrowRight, Edit2, AlertCircle } from 'lucide-react';
import './VerifyOTP.css';

export default function VerifyOTP() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(45);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const mobileNumber = location.state?.mobileNumber || '9876543210';

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (errorMessage) setErrorMessage('');

    // Auto focus next
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (otp.join('') === '123456') {
      if (mobileNumber === '8668168680') {
        navigate('/pending-approval');
      } else {
        navigate('/dashboard');
      }
    } else {
      setErrorMessage("Invalid OTP! Please enter 123456.");
    }
  };

  const isComplete = otp.every(digit => digit !== '');

  return (
    <div className="login-container">
      <div className="verify-main-card login-card">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <div className="verify-header login-header">
          <div className="icon-circle">
            <ShieldCheck size={28} className="primary-icon" />
          </div>
          <h2>Verify OTP</h2>
          <p>
            We have sent a 6-digit OTP to<br />
            <span className="bold-number">+91 {mobileNumber}</span>
            <button className="edit-btn" onClick={() => navigate(-1)}>
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
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                ref={(el) => (inputRefs.current[index] = el)}
                className={`otp-digit ${digit ? 'filled' : ''}`}
              />
            ))}
          </div>

          <div className="resend-container">
            <span className="resend-text">Didn't receive OTP?</span>
            <button
              type="button"
              className={`resend-btn ${timer > 0 ? 'disabled' : ''}`}
              disabled={timer > 0}
              onClick={() => setTimer(45)}
            >
              Resend OTP
            </button>
            {timer > 0 && <span className="timer">00:{timer.toString().padStart(2, '0')}</span>}
          </div>

          <button type="submit" className="btn-primary" disabled={!isComplete}>
            <span>Verify & Login</span>
            <ArrowRight size={18} />
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
