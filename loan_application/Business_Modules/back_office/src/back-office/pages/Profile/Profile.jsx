import React from 'react';
import iconMap from '../../config/iconMap';
import './Profile.css';

export default function Profile() {
  const UserIcon = iconMap['UserCircle'] || iconMap['User'];
  const MailIcon = iconMap['Mail'];
  const PhoneIcon = iconMap['Phone'] || iconMap['Contact'];
  const BuildingIcon = iconMap['Building2'] || iconMap['Landmark'];
  const ShieldIcon = iconMap['ShieldCheck'] || iconMap['Shield'];
  const CheckIcon = iconMap['CheckCircle2'] || iconMap['Check'];

  const currentUser = (() => {
    try {
      const raw = localStorage.getItem('backOfficeAuth');
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    return {
      fullName: 'Back Office Executive',
      role: 'Operations Team',
      employeeCode: 'BO-EXEC-01',
      branch: 'Head Office - Operations',
      email: 'operations@sivelsfinance.com',
      mobileNumber: '+91 12345 67890',
    };
  })();

  const permissions = [
    'District Operations & Territory Surveillance',
    'Relationship Manager (RM) Activity Monitoring',
    'Field Agent Network Performance Tracking',
    'Customer Loan Applications Queue Visibility',
    'Portfolio & Disbursement Metric Aggregation',
  ];

  return (
    <div className="bo-profile-container">
      <div className="bo-profile-card">
        <div className="bo-profile-header">
          <div className="bo-profile-avatar">
            {UserIcon && <UserIcon size={44} strokeWidth={1.5} />}
          </div>
          <div className="bo-profile-identity">
            <h2>{currentUser.fullName || currentUser.name || 'Back Office Executive'}</h2>
            <p className="bo-profile-role">{currentUser.role || 'Operations Team'}</p>
            <span className="bo-profile-emp-code">
              Employee ID: {currentUser.employeeCode || 'BO-EXEC-01'}
            </span>
          </div>
        </div>

        <div className="bo-profile-body">
          <h3 className="bo-profile-section-title">Operations &amp; Contact Details</h3>
          <div className="bo-profile-grid">
            <div className="bo-profile-item">
              <div className="bo-item-icon">
                {BuildingIcon && <BuildingIcon size={16} />}
              </div>
              <div>
                <label>Operational Branch</label>
                <strong>{currentUser.branch || 'Head Office - Operations'}</strong>
              </div>
            </div>

            <div className="bo-profile-item">
              <div className="bo-item-icon">
                {MailIcon && <MailIcon size={16} />}
              </div>
              <div>
                <label>Official Email</label>
                <strong>{currentUser.email || 'backoffice@sivelsfinance.com'}</strong>
              </div>
            </div>

            <div className="bo-profile-item">
              <div className="bo-item-icon">
                {PhoneIcon && <PhoneIcon size={16} />}
              </div>
              <div>
                <label>Contact Phone</label>
                <strong>{currentUser.mobileNumber || '+91 12345 67890'}</strong>
              </div>
            </div>

            <div className="bo-profile-item">
              <div className="bo-item-icon">
                {ShieldIcon && <ShieldIcon size={16} />}
              </div>
              <div>
                <label>Access Level</label>
                <strong>View &amp; Operations Surveillance</strong>
              </div>
            </div>
          </div>

          <h3 className="bo-profile-section-title" style={{ marginTop: '24px' }}>
            Assigned Operational Scope
          </h3>
          <ul className="bo-permissions-list">
            {permissions.map((perm, idx) => (
              <li key={idx} className="bo-permission-item">
                {CheckIcon && <CheckIcon size={16} className="bo-check-icon" />}
                <span>{perm}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
