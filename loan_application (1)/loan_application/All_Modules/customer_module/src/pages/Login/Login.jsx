import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Smartphone, ShieldCheck, Lock, ArrowRight, ChevronDown } from 'lucide-react';
import './Login.css';

export default function Login() {
  const [mobileNumber, setMobileNumber] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mobileNumber.length >= 10) {
      navigate('/verify', { state: { mobileNumber } });
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
            <div className="mobile-input-wrapper">
              <div className="country-code">
                <span>+91</span>
                <ChevronDown size={16} />
              </div>
              <input
                type="tel"
                placeholder="Enter your mobile number"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                maxLength={10}
                required
              />
            </div>
          </div>

          <div className="info-box">
            <ShieldCheck size={18} className="success-icon" />
            <span>We will send a 6-digit OTP to verify your mobile number</span>
          </div>

          <button type="submit" className="btn-primary" disabled={mobileNumber.length < 10}>
            <span>Send OTP</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="register-prompt">
          Don't have an account? <Link to="/register" className="register-link">Register here</Link>
        </div>
        
        <div className="secure-footer">
          <ShieldCheck size={14} className="secure-icon" />
          <span>Secure verification helps us keep your account safe and secure.</span>
        </div>
      </div>
    </div>
  );
}
