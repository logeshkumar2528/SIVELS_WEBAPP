import React from 'react';
import iconMap from '../../config/iconMap';
import { useBackOfficeProfile } from '../../hooks/useBackOfficeProfile';
import './Profile.css';

export default function Profile() {
  const UserIcon = iconMap['UserCircle'] || iconMap['User'];
  const MailIcon = iconMap['Mail'];
  const PhoneIcon = iconMap['Phone'] || iconMap['Contact'];
  const BuildingIcon = iconMap['Building2'] || iconMap['Landmark'];
  const ShieldIcon = iconMap['ShieldCheck'] || iconMap['Shield'];
  const CheckIcon = iconMap['CheckCircle2'] || iconMap['Check'];
  const AlertCircleIcon = iconMap['AlertCircle'] || iconMap['AlertTriangle'];
  const RefreshCwIcon = iconMap['RefreshCw'] || iconMap['RotateCcw'];

  // 1. Live Authenticated Profile Data
  const { profile, loading, error, refetch } = useBackOfficeProfile();

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
        {/* Error State Banner */}
        {error && (
          <div className="bo-table-error-container" role="alert" style={{ margin: '16px 24px 0' }}>
            <div className="bo-error-flex">
              {AlertCircleIcon && <AlertCircleIcon size={24} className="bo-error-icon" />}
              <div className="bo-error-content">
                <h4>Unable to Load Profile Details</h4>
                <p>{error}</p>
              </div>
            </div>
            <button type="button" className="bo-btn-retry" onClick={refetch}>
              {RefreshCwIcon && <RefreshCwIcon size={13} />}
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Loading Spinner State */}
        {loading && !profile.id && !profile.fullName ? (
          <div className="bo-table-loading-container" aria-live="polite">
            <div className="bo-loading-spinner" aria-hidden="true" />
            <p className="bo-loading-text">Loading authenticated user profile...</p>
          </div>
        ) : (
          <>
            <div className="bo-profile-header">
              <div className="bo-profile-avatar">
                {UserIcon && <UserIcon size={44} strokeWidth={1.5} />}
              </div>
              <div className="bo-profile-identity">
                <h2>{profile.fullName || 'Not Available'}</h2>
                <p className="bo-profile-role">{profile.role || 'Operations Team'}</p>
                <span className="bo-profile-emp-code">
                  Employee ID: {profile.employeeCode || profile.backOfficeCode || 'Not Available'}
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
                    <strong>{profile.branch || 'Not Available'}</strong>
                  </div>
                </div>

                <div className="bo-profile-item">
                  <div className="bo-item-icon">
                    {MailIcon && <MailIcon size={16} />}
                  </div>
                  <div>
                    <label>Official Email</label>
                    <strong>{profile.email || profile.emailAddress || 'Not Available'}</strong>
                  </div>
                </div>

                <div className="bo-profile-item">
                  <div className="bo-item-icon">
                    {PhoneIcon && <PhoneIcon size={16} />}
                  </div>
                  <div>
                    <label>Contact Phone</label>
                    <strong>{profile.mobile || profile.mobileNumber || 'Not Available'}</strong>
                  </div>
                </div>

                <div className="bo-profile-item">
                  <div className="bo-item-icon">
                    {ShieldIcon && <ShieldIcon size={16} />}
                  </div>
                  <div>
                    <label>Account Status</label>
                    <strong>{profile.status || (profile.isActive ? 'Active' : 'Inactive')}</strong>
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
          </>
        )}
      </div>
    </div>
  );
}

