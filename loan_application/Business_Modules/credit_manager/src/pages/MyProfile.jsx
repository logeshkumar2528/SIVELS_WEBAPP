import React, { useMemo } from 'react';
import { getCreditManagerAuth } from '../auth/authStorage';
import './MyProfile.css';

function getInitials(name) {
  if (!name) return 'CM';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const MyProfile = () => {
  const auth = useMemo(() => getCreditManagerAuth(), []);

  const fullName = auth?.fullName || 'Credit Manager';
  const email = auth?.emailAddress || 'manager@sivelsfinance.com';
  const mobile = auth?.mobileNumber
    ? (String(auth.mobileNumber).startsWith('+91') ? auth.mobileNumber : `+91 ${auth.mobileNumber}`)
    : '+91 90000 12345';
  const branch = auth?.branch || 'Main Branch';
  const code = auth?.creditManagerCode || 'CM001';
  const initials = getInitials(fullName);

  return (
    <div className="profile-container">
      {/* Left Column: Profile Summary */}
      <div className="profile-summary-card">
        <div className="avatar-large">
          <span>{initials}</span>
        </div>
        <h2 className="profile-name">{fullName}</h2>
        <p className="profile-role">{code ? `${code} • ` : ''}Credit Manager</p>
        
        <div className="profile-contact-info">
          <div className="contact-item">
            <span className="contact-label">Email ID</span>
            <span className="contact-value">{email}</span>
          </div>
          <div className="contact-item">
            <span className="contact-label">Mobile Number</span>
            <span className="contact-value">{mobile}</span>
          </div>
          <div className="contact-item">
            <span className="contact-label">Branch</span>
            <span className="contact-value">{branch}</span>
          </div>
        </div>
      </div>

      {/* Right Column: Profile Information Form */}
      <div className="profile-details-card">
        <h3 className="details-title">Profile Information</h3>
        
        <div className="form-group-row">
          <label className="form-label">Full Name</label>
          <div className="form-input-wrapper">
            <input type="text" className="form-input" defaultValue={fullName} readOnly />
          </div>
        </div>
        
        <div className="form-group-row">
          <label className="form-label">Email ID</label>
          <div className="form-input-wrapper">
            <input type="email" className="form-input" defaultValue={email} readOnly />
          </div>
        </div>
        
        <div className="form-group-row">
          <label className="form-label">Mobile Number</label>
          <div className="form-input-wrapper">
            <input type="text" className="form-input" defaultValue={mobile} readOnly />
          </div>
        </div>

        <div className="form-group-row">
          <label className="form-label">Branch</label>
          <div className="form-input-wrapper">
            <input type="text" className="form-input" defaultValue={branch} readOnly />
          </div>
        </div>
        
        <div className="form-group-row">
          <label className="form-label">Change Password</label>
          <div className="form-input-wrapper">
            <button className="btn-change-password">Change Password</button>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn-update-profile" onClick={(e) => e.preventDefault()}>Update Profile</button>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
