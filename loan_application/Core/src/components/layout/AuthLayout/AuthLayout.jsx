import React from 'react';
import { Outlet } from 'react-router-dom';
import { Headset } from 'lucide-react';
import './AuthLayout.css';
import logo from '../../../assets/Logo_img/Logo.png';

export default function AuthLayout() {
  return (
    <div className="auth-layout">
      {/* Left Column */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-logo-container">
            <img src={logo} alt="Sivels Finance Logo" className="auth-logo" />
          </div>
          
          <div className="auth-welcome">
            <h1>Welcome to <span className="auth-brand-text">Sivels Finance</span></h1>
            <p>Your trusted partner in achieving<br />your financial goals.</p>
          </div>
        </div>
        <div className="auth-city-bg"></div>
      </div>
      
      {/* Right Column */}
      <div className="auth-right">
        <div className="auth-top-nav">
          <div className="support-link">
            <Headset size={18} className="support-icon" />
            <span>Need help? <a href="#">Contact Support</a></span>
          </div>
        </div>
        
        <div className="auth-form-container">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
