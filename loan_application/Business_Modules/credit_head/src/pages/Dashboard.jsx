import React from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../../back_office/src/back-office/config/iconMap';
import { useCreditHeadProfile } from '../hooks/useCreditHeadProfile';
import { ROUTES } from '../config/routeConfig';
import { formatDate } from '../../../../Core/src/utils/dateHelper';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, loading, error, refetch } = useCreditHeadProfile();

  const LandmarkIcon = iconMap.Building2 || iconMap.Building;
  const ShieldIcon = iconMap.ShieldCheck || iconMap.Shield;
  const UserIcon = iconMap.UserCircle || iconMap.User;
  const ArrowRightIcon = iconMap.ArrowRight;
  const AlertCircleIcon = iconMap.AlertCircle || iconMap.AlertTriangle;
  const RefreshCwIcon = iconMap.RefreshCw || iconMap.RotateCcw;
  const BuildingIcon = iconMap.Building2;
  const PhoneIcon = iconMap.Phone;
  const MailIcon = iconMap.Mail;
  const CalendarIcon = iconMap.Calendar;
  const BadgeIcon = iconMap.BadgeIndianRupee || iconMap.ShieldCheck;

  const formattedDateJoined = formatDate(profile?.dateJoined, '—');

  return (
    <div className="ch-dashboard">
      {error && (
        <div className="bo-table-error-container" role="alert" style={{ marginBottom: 16 }}>
          <div className="bo-error-flex" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {AlertCircleIcon && <AlertCircleIcon size={24} className="bo-error-icon" />}
            <div className="bo-error-content">
              <h4>Unable to Load Credit Head Data</h4>
              <p>{error}</p>
            </div>
          </div>
          <button type="button" className="bo-btn-retry" onClick={refetch}>
            {RefreshCwIcon && <RefreshCwIcon size={13} />}
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Hero Executive Card */}
      <section className="ch-hero-card" aria-label="Credit Head Executive Suite">
        <div className="ch-hero-content">
          <div className="ch-hero-icon-wrap">
            {LandmarkIcon && <LandmarkIcon size={30} />}
          </div>
          <div>
            <span className="ch-hero-eyebrow">Sivels Finance • Executive Suite</span>
            <h1 className="ch-hero-title">
              {loading ? 'Welcome, Credit Head' : `Welcome, ${profile?.fullName || 'Credit Head'}`}
            </h1>
            <p className="ch-hero-subtitle">
              Executive Credit Administration &amp; Risk Oversight Portal
            </p>
          </div>
        </div>

        <div className="ch-hero-badge">
          <span className="ch-status-dot" />
          <span>Active Leadership Session</span>
        </div>
      </section>

      {/* Main Dashboard Grid */}
      <div className="ch-dashboard-grid">
        {/* Left Column: Officer Identity Overview */}
        <section className="ch-card" aria-label="Officer Profile Overview">
          <div className="ch-card-header">
            <div className="ch-card-title-group">
              <span className="ch-card-icon">{UserIcon && <UserIcon size={20} />}</span>
              <h2>Authenticated Officer Identity</h2>
            </div>
          </div>

          <div className="ch-identity-grid">
            <div className="ch-identity-item">
              <span className="ch-identity-label">Full Name</span>
              <span className="ch-identity-val">{loading ? 'Loading...' : profile?.fullName || '—'}</span>
            </div>

            <div className="ch-identity-item">
              <span className="ch-identity-label">Employee Code</span>
              <span className="ch-identity-val">{loading ? 'Loading...' : profile?.creditHeadCode || '—'}</span>
            </div>

            <div className="ch-identity-item">
              <span className="ch-identity-label">Executive Role</span>
              <span className="ch-identity-val">{profile?.role || 'Credit Head'}</span>
            </div>

            <div className="ch-identity-item">
              <span className="ch-identity-label">Department</span>
              <span className="ch-identity-val">{profile?.department || 'Credit & Risk Leadership'}</span>
            </div>

            <div className="ch-identity-item">
              <span className="ch-identity-label">Assigned Branch</span>
              <span className="ch-identity-val">{loading ? 'Loading...' : profile?.branch || '—'}</span>
            </div>

            <div className="ch-identity-item">
              <span className="ch-identity-label">Member Since</span>
              <span className="ch-identity-val">{loading ? 'Loading...' : formattedDateJoined}</span>
            </div>

            <div className="ch-identity-item">
              <span className="ch-identity-label">Registered Mobile</span>
              <span className="ch-identity-val">{loading ? 'Loading...' : profile?.mobileNumber || '—'}</span>
            </div>

            <div className="ch-identity-item">
              <span className="ch-identity-label">Corporate Email</span>
              <span className="ch-identity-val">{loading ? 'Loading...' : profile?.emailAddress || '—'}</span>
            </div>
          </div>
        </section>

        {/* Right Column: Quick Links & Session Info */}
        <aside className="ch-side-col">
          <div className="ch-card ch-quick-action-card">
            <div className="ch-card-header" style={{ marginBottom: 12 }}>
              <div className="ch-card-title-group">
                <span className="ch-card-icon">{ShieldIcon && <ShieldIcon size={18} />}</span>
                <h2>Executive Navigation</h2>
              </div>
            </div>

            <button
              type="button"
              className="ch-action-btn"
              onClick={() => navigate(ROUTES.PROFILE)}
            >
              <div className="ch-action-btn-left">
                {UserIcon && <UserIcon size={18} />}
                <span>View My Profile</span>
              </div>
              {ArrowRightIcon && <ArrowRightIcon size={16} />}
            </button>
          </div>

          <div className="ch-card">
            <div className="ch-card-header" style={{ marginBottom: 14 }}>
              <div className="ch-card-title-group">
                <span className="ch-card-icon">{ShieldIcon && <ShieldIcon size={18} />}</span>
                <h2>Session Verification</h2>
              </div>
            </div>

            <div className="ch-info-box">
              <div className="ch-info-row">
                <span className="ch-info-label">Authentication Method</span>
                <span className="ch-info-value">Mobile OTP Verified</span>
              </div>
              <div className="ch-info-row">
                <span className="ch-info-label">Account Status</span>
                <span className="ch-info-value" style={{ color: '#16a34a' }}>
                  {profile?.status || 'Active'}
                </span>
              </div>
              <div className="ch-info-row">
                <span className="ch-info-label">Role Clearance</span>
                <span className="ch-info-value">Level 1 Credit Authority</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
