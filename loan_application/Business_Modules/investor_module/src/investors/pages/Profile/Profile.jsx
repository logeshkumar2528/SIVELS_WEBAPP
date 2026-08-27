import { useState } from 'react';
import iconMap from '../../config/iconMap';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';
import { ROUTES } from '../../config/routeConfig';
import {
  investorData,
  personalInfoData,
  securityInfoData,
  recentActivityData,
  TABS,
} from './profileData';
import './Profile.css';

export default function Profile() {
  const [activeTab, setActiveTab] = useState('Personal Information');
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(true);
  const [theme, setTheme] = useState('Light Mode');
  const [language, setLanguage] = useState('English');

  const MailIcon = iconMap['Mail'];
  const PhoneIcon = iconMap['Phone'];
  const MapPinIcon = iconMap['MapPin'];
  const CalendarIcon = iconMap['Calendar'];
  const ShieldIcon = iconMap['Shield'];
  const UserIcon = iconMap['User'];
  const UserCheckIcon = iconMap['UserCheck'];
  const BuildingIcon = iconMap['Building2'];
  const EditIcon = iconMap['Edit2'];
  const LockIcon = iconMap['Lock'];
  const SmartphoneIcon = iconMap['Smartphone'];
  const HomeIcon = iconMap['Home'];
  const CreditCardIcon = iconMap['CreditCard'];
  const GlobeIcon = iconMap['Globe'];
  const MoonIcon = iconMap['Moon'];
  const BellIcon = iconMap['Bell'];
  const ChevronRightIcon = iconMap['ChevronRight'];
  const DownloadIcon = iconMap['Download'];
  const CameraIcon = iconMap['Camera'];
  const KeyRoundIcon = iconMap['KeyRound'];
  const UserXIcon = iconMap['UserX'] || iconMap['Trash2'];
  const InfoIcon = iconMap['Info'];
  const MonitorIcon = iconMap['Monitor'] || iconMap['LayoutDashboard'];

  const breadcrumbItems = [
    { label: 'Dashboard', route: ROUTES.DASHBOARD },
    { label: 'My Profile', route: '' },
    { label: 'Profile', route: '' },
  ];

  return (
    <div className="profile-page-container">
      <Breadcrumb items={breadcrumbItems} />

      {/* TOP HERO PROFILE BANNER CARD */}
      <div className="profile-card profile-hero-card">
        {/* Left Column: Avatar & Main Bio */}
        <div className="hero-bio-col">
          <div className="hero-avatar-wrap">
            <img
              src="https://i.pravatar.cc/150?img=68"
              alt={investorData.name}
              className="hero-avatar-img"
            />
          </div>
          <div className="hero-bio-info">
            <div className="hero-name-row">
              <h2 className="hero-name">{investorData.name}</h2>
              <span className="hero-role-pill">{investorData.role}</span>
            </div>

            <div className="hero-contact-list">
              <div className="hero-contact-item">
                {MailIcon && <MailIcon size={14} className="hero-icon" />}
                <span>{investorData.email}</span>
              </div>
              <div className="hero-contact-item">
                {PhoneIcon && <PhoneIcon size={14} className="hero-icon" />}
                <span>{investorData.phone}</span>
              </div>
              <div className="hero-contact-item">
                {MapPinIcon && <MapPinIcon size={14} className="hero-icon" />}
                <span>{investorData.location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Org & Employee Grid */}
        <div className="hero-details-grid">
          <div className="hero-grid-item">
            {CalendarIcon && <CalendarIcon size={16} className="grid-icon" />}
            <div>
              <span className="grid-label">Employee ID</span>
              <span className="grid-val">{investorData.employeeId}</span>
            </div>
          </div>

          <div className="hero-grid-item">
            {ShieldIcon && <ShieldIcon size={16} className="grid-icon" />}
            <div>
              <span className="grid-label">Role</span>
              <span className="grid-val">{investorData.role}</span>
            </div>
          </div>

          <div className="hero-grid-item">
            {UserIcon && <UserIcon size={16} className="grid-icon" />}
            <div>
              <span className="grid-label">Department</span>
              <span className="grid-val">{investorData.department}</span>
            </div>
          </div>

          <div className="hero-grid-item">
            {UserCheckIcon && <UserCheckIcon size={16} className="grid-icon" />}
            <div>
              <span className="grid-label">Reporting Manager</span>
              <span className="grid-val">{investorData.reportingManager}</span>
            </div>
          </div>

          <div className="hero-grid-item">
            {CalendarIcon && <CalendarIcon size={16} className="grid-icon" />}
            <div>
              <span className="grid-label">Date of Joining</span>
              <span className="grid-val">{investorData.dateOfJoining}</span>
            </div>
          </div>

          <div className="hero-grid-item">
            {BuildingIcon && <BuildingIcon size={16} className="grid-icon" />}
            <div>
              <span className="grid-label">Branch</span>
              <span className="grid-val">{investorData.branch}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Profile Completion Box */}
        <div className="hero-completion-card">
          <span className="completion-title">Profile Completion</span>
          <div className="completion-radial-wrap">
            <div className="completion-donut">
              <span className="donut-text">90%</span>
            </div>
            <p className="completion-hint">
              Keep your profile updated to get the best experience.
            </p>
          </div>
          <button type="button" className="btn-update-profile">
            Update Profile
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="profile-tabs-bar">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`profile-tab-item ${
              activeTab === tab ? 'profile-tab-item--active' : ''
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'Personal Information' && UserIcon && <UserIcon size={16} />}
            {tab === 'Security' && ShieldIcon && <ShieldIcon size={16} />}
            {tab === 'Preferences' && GlobeIcon && <GlobeIcon size={16} />}
            {tab === 'Activity Log' && CalendarIcon && <CalendarIcon size={16} />}
            <span>{tab}</span>
          </button>
        ))}
      </div>

      {/* MIDDLE ROW CARDS: Personal Info & Security */}
      <div className="profile-middle-grid">
        {/* Personal Information Card */}
        <div className="profile-card">
          <div className="card-header-row">
            <h3 className="card-title">Personal Information</h3>
            <button type="button" className="btn-edit-info">
              {EditIcon && <EditIcon size={14} />} Edit Information
            </button>
          </div>

          <div className="personal-fields-grid">
            <div className="field-item">
              <div className="field-icon-wrap">
                {UserIcon && <UserIcon size={16} />}
              </div>
              <div className="field-content">
                <span className="field-label">Full Name</span>
                <span className="field-val">{personalInfoData.fullName}</span>
              </div>
            </div>

            <div className="field-item">
              <div className="field-icon-wrap">
                {MailIcon && <MailIcon size={16} />}
              </div>
              <div className="field-content">
                <span className="field-label">Email Address</span>
                <span className="field-val">{personalInfoData.email}</span>
              </div>
            </div>

            <div className="field-item">
              <div className="field-icon-wrap">
                {CalendarIcon && <CalendarIcon size={16} />}
              </div>
              <div className="field-content">
                <span className="field-label">Date of Birth</span>
                <span className="field-val">{personalInfoData.dob}</span>
              </div>
            </div>

            <div className="field-item">
              <div className="field-icon-wrap">
                {PhoneIcon && <PhoneIcon size={16} />}
              </div>
              <div className="field-content">
                <span className="field-label">Mobile Number</span>
                <span className="field-val">{personalInfoData.mobile}</span>
              </div>
            </div>

            <div className="field-item">
              <div className="field-icon-wrap">
                {UserIcon && <UserIcon size={16} />}
              </div>
              <div className="field-content">
                <span className="field-label">Gender</span>
                <span className="field-val">{personalInfoData.gender}</span>
              </div>
            </div>

            <div className="field-item">
              <div className="field-icon-wrap">
                {SmartphoneIcon && <SmartphoneIcon size={16} />}
              </div>
              <div className="field-content">
                <span className="field-label">Alternate Number</span>
                <span className="field-val">{personalInfoData.alternateNumber}</span>
              </div>
            </div>

            <div className="field-item field-item--full">
              <div className="field-icon-wrap">
                {HomeIcon && <HomeIcon size={16} />}
              </div>
              <div className="field-content">
                <span className="field-label">Address</span>
                <span className="field-val">{personalInfoData.address}</span>
              </div>
            </div>

            <div className="field-item">
              <div className="field-icon-wrap">
                {CreditCardIcon && <CreditCardIcon size={16} />}
              </div>
              <div className="field-content">
                <span className="field-label">PAN Number</span>
                <span className="field-val">{personalInfoData.pan}</span>
              </div>
            </div>

            <div className="field-item">
              <div className="field-icon-wrap">
                {CreditCardIcon && <CreditCardIcon size={16} />}
              </div>
              <div className="field-content">
                <span className="field-label">Aadhaar Number</span>
                <span className="field-val">{personalInfoData.aadhaar}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Information Card */}
        <div className="profile-card">
          <div className="card-header-row">
            <h3 className="card-title">Security Information</h3>
          </div>

          <div className="security-items-list">
            <div className="sec-item">
              <div className="sec-icon-wrap">
                {LockIcon && <LockIcon size={16} />}
              </div>
              <div className="sec-content">
                <span className="sec-label">Password</span>
                <span className="sec-val">••••••••</span>
              </div>
              <button type="button" className="sec-link-btn">Change</button>
            </div>

            <div className="sec-item">
              <div className="sec-icon-wrap">
                {ShieldIcon && <ShieldIcon size={16} />}
              </div>
              <div className="sec-content">
                <span className="sec-label">Two-Factor Authentication</span>
                <span className="sec-badge-enabled">Enabled</span>
              </div>
              <button type="button" className="sec-link-btn">Manage</button>
            </div>

            <div className="sec-item">
              <div className="sec-icon-wrap">
                {MailIcon && <MailIcon size={16} />}
              </div>
              <div className="sec-content">
                <span className="sec-label">Backup Email</span>
                <span className="sec-val">rajesh.kumar@gmail.com</span>
              </div>
              <button type="button" className="sec-link-btn">Change</button>
            </div>

            <div className="sec-item">
              <div className="sec-icon-wrap">
                {SmartphoneIcon && <SmartphoneIcon size={16} />}
              </div>
              <div className="sec-content">
                <span className="sec-label">Backup Mobile</span>
                <span className="sec-val">+91 91234 56789</span>
              </div>
              <button type="button" className="sec-link-btn">Change</button>
            </div>

            <div className="sec-item">
              <div className="sec-icon-wrap">
                {KeyRoundIcon && <KeyRoundIcon size={16} />}
              </div>
              <div className="sec-content">
                <span className="sec-label">Last Password Change</span>
                <span className="sec-val">05 Jun 2025, 10:30 AM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW CARDS: Preferences, Recent Activity, Quick Actions */}
      <div className="profile-bottom-grid">
        {/* Preferences Card */}
        <div className="profile-card">
          <h3 className="card-title mb-3">Preferences</h3>

          <div className="pref-items-list">
            <div className="pref-item">
              <div className="pref-left">
                {MoonIcon && <MoonIcon size={16} className="pref-icon" />}
                <span className="pref-label">Theme</span>
              </div>
              <select
                className="pref-select"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="Light Mode">Light Mode</option>
                <option value="Dark Mode">Dark Mode</option>
                <option value="System">System Default</option>
              </select>
            </div>

            <div className="pref-item">
              <div className="pref-left">
                {GlobeIcon && <GlobeIcon size={16} className="pref-icon" />}
                <span className="pref-label">Language</span>
              </div>
              <select
                className="pref-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="English">English</option>
                <option value="Tamil">Tamil</option>
                <option value="Hindi">Hindi</option>
              </select>
            </div>

            <div className="pref-item">
              <div className="pref-left">
                {BellIcon && <BellIcon size={16} className="pref-icon" />}
                <span className="pref-label">Email Notifications</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={emailNotif}
                  onChange={(e) => setEmailNotif(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="pref-item">
              <div className="pref-left">
                {SmartphoneIcon && <SmartphoneIcon size={16} className="pref-icon" />}
                <span className="pref-label">SMS Notifications</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={smsNotif}
                  onChange={(e) => setSmsNotif(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="profile-card">
          <div className="card-header-row mb-3">
            <h3 className="card-title">Recent Activity</h3>
            <a href="#view-all" className="link-view-all">View All</a>
          </div>

          <div className="act-items-list">
            <div className="act-item">
              <div className="act-icon-wrap">
                {MonitorIcon && <MonitorIcon size={14} />}
              </div>
              <div className="act-content">
                <div className="act-title">Logged in from Windows · Chennai, India</div>
                <div className="act-time">05 Jun 2025, 10:30 AM</div>
              </div>
              <span className="badge-current">Current</span>
            </div>

            <div className="act-item">
              <div className="act-icon-wrap">
                {LockIcon && <LockIcon size={14} />}
              </div>
              <div className="act-content">
                <div className="act-title">Password changed successfully</div>
                <div className="act-time">31 May 2025, 04:15 PM</div>
              </div>
              {ChevronRightIcon && <ChevronRightIcon size={14} className="act-arrow" />}
            </div>

            <div className="act-item">
              <div className="act-icon-wrap">
                {UserIcon && <UserIcon size={14} />}
              </div>
              <div className="act-content">
                <div className="act-title">Profile information updated</div>
                <div className="act-time">28 May 2025, 02:40 PM</div>
              </div>
              {ChevronRightIcon && <ChevronRightIcon size={14} className="act-arrow" />}
            </div>

            <div className="act-item">
              <div className="act-icon-wrap">
                {SmartphoneIcon && <SmartphoneIcon size={14} />}
              </div>
              <div className="act-content">
                <div className="act-title">Logged in from Android · Chennai, India</div>
                <div className="act-time">25 May 2025, 11:22 AM</div>
              </div>
              {ChevronRightIcon && <ChevronRightIcon size={14} className="act-arrow" />}
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="profile-card">
          <h3 className="card-title mb-3">Quick Actions</h3>

          <div className="quick-actions-list">
            <button type="button" className="quick-action-item">
              <div className="quick-left">
                {CameraIcon && <CameraIcon size={16} />}
                <span>Update Profile Picture</span>
              </div>
              {ChevronRightIcon && <ChevronRightIcon size={16} />}
            </button>

            <button type="button" className="quick-action-item">
              <div className="quick-left">
                {DownloadIcon && <DownloadIcon size={16} />}
                <span>Download Profile Summary</span>
              </div>
              {ChevronRightIcon && <ChevronRightIcon size={16} />}
            </button>

            <button type="button" className="quick-action-item">
              <div className="quick-left">
                {KeyRoundIcon && <KeyRoundIcon size={16} />}
                <span>Change Password</span>
              </div>
              {ChevronRightIcon && <ChevronRightIcon size={16} />}
            </button>

            <button type="button" className="quick-action-item action-danger">
              <div className="quick-left">
                {UserXIcon && <UserXIcon size={16} />}
                <span>Deactivate Account</span>
              </div>
              {ChevronRightIcon && <ChevronRightIcon size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM NOTICE BANNER */}
      <div className="profile-notice-banner">
        {InfoIcon && <InfoIcon size={16} color="#15803d" className="notice-icon" />}
        <span>
          Keeping your profile information updated helps us serve you better and ensures account security.
        </span>
      </div>
    </div>
  );
}
