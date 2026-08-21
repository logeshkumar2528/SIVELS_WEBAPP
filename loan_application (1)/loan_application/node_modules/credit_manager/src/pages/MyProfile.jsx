import React from 'react';
import './MyProfile.css';

const MyProfile = () => {
  return (
    <div className="profile-container">
      {/* Left Column: Profile Summary */}
      <div className="profile-summary-card">
        <div className="avatar-large">
          <span>CM</span>
        </div>
        <h2 className="profile-name">Credit Manager</h2>
        <p className="profile-role">Credit Manager</p>
        
        <div className="profile-contact-info">
          <div className="contact-item">
            <span className="contact-label">Email ID</span>
            <span className="contact-value">manager@sivelsfinance.com</span>
          </div>
          <div className="contact-item">
            <span className="contact-label">Mobile Number</span>
            <span className="contact-value">+91 90000 12345</span>
          </div>
        </div>
      </div>

      {/* Right Column: Profile Information Form */}
      <div className="profile-details-card">
        <h3 className="details-title">Profile Information</h3>
        
        <div className="form-group-row">
          <label className="form-label">Full Name</label>
          <div className="form-input-wrapper">
            <input type="text" className="form-input" defaultValue="Credit Manager" />
          </div>
        </div>
        
        <div className="form-group-row">
          <label className="form-label">Email ID</label>
          <div className="form-input-wrapper">
            <input type="email" className="form-input" defaultValue="manager@sivelsfinance.com" />
          </div>
        </div>
        
        <div className="form-group-row">
          <label className="form-label">Mobile Number</label>
          <div className="form-input-wrapper">
            <input type="text" className="form-input" defaultValue="+91 90000 12345" />
          </div>
        </div>
        
        <div className="form-group-row">
          <label className="form-label">Change Password</label>
          <div className="form-input-wrapper">
            <button className="btn-change-password">Change Password</button>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn-update-profile">Update Profile</button>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
