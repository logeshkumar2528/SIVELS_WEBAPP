import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, ShieldCheck, ArrowRight, ChevronDown } from 'lucide-react';
import { detectAccountModule, normalizeMobileNumber } from '../../services/moduleDetectionService';
import { authService } from '../../services/authService';
import './Login.css';

export default function Login() {
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanMobile = normalizeMobileNumber(mobileNumber);
    if (cleanMobile.length === 10) {
      setLoading(true);
      setError('');
      try {
        // Special isolated condition ONLY for Master Mobile: 9345638126
        if (cleanMobile === '9345638126') {
          navigate('/verify', {
            state: {
              mobileNumber: cleanMobile,
              module: 'Master',
              destination: '/master/dashboard',
              accountData: {
                mobileNumber: cleanMobile,
                fullName: 'Master Admin',
                role: 'Master',
              },
              otpResponse: { success: true, message: 'OTP sent successfully' },
            }
          });
          return;
        }

        const otpResponse = await authService.sendOtp(cleanMobile);
        const detection = await detectAccountModule(cleanMobile);

        if (detection.status === 'DUPLICATE') {
          setError(detection.error || 'Multiple accounts found with this mobile number. Please contact support.');
          return;
        }

        if (detection.status === 'NOT_FOUND') {
          setError(detection.error || 'No account found with this mobile number');
          return;
        }

        if (detection.status === 'ERROR') {
          setError(detection.error || 'Failed to verify account. Please check your connection and try again.');
          return;
        }

        if (detection.destination) {
          navigate('/verify', {
            state: {
              mobileNumber: cleanMobile,
              module: detection.module,
              destination: detection.destination,
              accountData: detection.accountData,
              otpResponse,
            }
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to send OTP. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="icon-circle">
            <Smartphone size={24} className="primary-icon" />
          </div>
          <h2>Login / Get Started</h2>
          <p>Enter your mobile number to receive OTP</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <label>Mobile Number</label>
            <div className="mobile-input-wrapper" style={{ borderColor: error ? 'red' : undefined }}>
              <div className="country-code">
                <span>+91</span>
                <ChevronDown size={16} />
              </div>
              <input
                type="tel"
                placeholder="Enter your mobile number"
                value={mobileNumber}
                onChange={(e) => {
                  setMobileNumber(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData('text');
                  const normalized = normalizeMobileNumber(pasted);
                  setMobileNumber(normalized);
                  setError('');
                }}
                maxLength={10}
                required
              />
            </div>
            {error && <span style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{error}</span>}
          </div>

          <div className="info-box">
            <ShieldCheck size={18} className="success-icon" />
            <span>We will send a 6-digit OTP to verify your mobile number</span>
          </div>

          <button type="submit" className="btn-primary" disabled={mobileNumber.length < 10 || loading}>
            {loading ? <span>Sending OTP...</span> : (
              <>
                <span>Send OTP</span>
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
