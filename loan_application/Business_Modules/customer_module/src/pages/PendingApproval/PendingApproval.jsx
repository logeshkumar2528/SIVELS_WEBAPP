import React from 'react';
import { Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../config/routeConfig';
import './PendingApproval.css';

export default function PendingApproval() {
  const location = useLocation();
  const mobileNumber = location.state?.mobileNumber || '8668168680';

  return (
    <div className="pending-container">
      <div className="pending-card">
        <div className="icon-circle pending-icon-wrapper">
          <Clock size={32} className="primary-icon" />
        </div>
        
        <h2>Waiting for Approval</h2>
        <p className="pending-subtitle">
          Your application for <span className="bold-number">+91 {mobileNumber}</span> is currently under review.
        </p>

        <div className="pending-info-box">
          <ShieldCheck size={20} className="success-icon" />
          <div className="pending-info-text">
            <strong>Back Office Verification</strong>
            <span>Our team is verifying your details. This usually takes a few hours. We will notify you once approved.</span>
          </div>
        </div>

        <Link to={ROUTES.HOME} className="btn-primary back-home-btn">
          <span>Back to Home</span>
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
