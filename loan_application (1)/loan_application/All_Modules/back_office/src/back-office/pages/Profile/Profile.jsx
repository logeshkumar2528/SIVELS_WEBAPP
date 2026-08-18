/**
 * Profile.jsx
 * --------------------
 * My Profile page containing user overview, work metrics summary, personal & work info,
 * change password, recent activities, and account preferences.
 */

import { useState } from 'react';
import MainLayout   from '../../layouts/MainLayout/MainLayout';
import Breadcrumb   from '../../components/Breadcrumb/Breadcrumb';
import Button       from '../../components/Button/Button';
import iconMap      from '../../config/iconMap';
import { ROUTES }   from '../../config/routeConfig';
import {
  CURRENT_USER, BADGE_COUNTS, USER_INFO, WORK_SUMMARY_CARDS, WORK_METRIC_CARDS,
  PERSONAL_INFO_FIELDS, WORK_INFO_FIELDS, RECENT_ACTIVITIES
} from './profileData';
import './Profile.css';

const BREADCRUMB_ITEMS = [
  { label: 'Back Office Dashboard', path: ROUTES.DASHBOARD },
  { label: 'My Profile' }
];

function Profile() {
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(true);

  const EditIcon        = iconMap['Edit3'];
  const CameraIcon      = iconMap['Camera'];
  const MailIcon        = iconMap['Mail'];
  const PhoneIcon       = iconMap['Phone'];
  const LockIcon        = iconMap['Lock'];
  const EyeIcon         = iconMap['Eye'];
  const ShieldIcon      = iconMap['ShieldCheck'];
  const SaveIcon        = iconMap['Save'];
  const ArrowRightIcon  = iconMap['ArrowRight'];
  const CheckCircleIcon = iconMap['CheckCircle2'];

  return (
    <MainLayout
      title="My Profile"
      user={CURRENT_USER}
      badgeCounts={BADGE_COUNTS}
      notificationCount={12}
    >
      <Breadcrumb items={BREADCRUMB_ITEMS} />

      {/* ========== TOP HEADER CARD (USER OVERVIEW & METRICS) ========== */}
      <div className="prf-header-card">
        
        {/* Left User Avatar & Info */}
        <div className="prf-user-section">
          <div className="prf-avatar-wrap">
            <div className="prf-avatar-fallback">RK</div>
            <div className="prf-camera-badge" title="Change Photo">
              {CameraIcon && <CameraIcon size={14} />}
            </div>
          </div>

          <div className="prf-user-info">
            <h2 className="prf-name">{USER_INFO.name}</h2>
            <span className="prf-role-badge">{USER_INFO.role}</span>
            <div className="prf-contact-item">
              {MailIcon && <MailIcon size={12} className="text-muted" />}
              <span>{USER_INFO.email}</span>
            </div>
            <div className="prf-contact-item">
              {PhoneIcon && <PhoneIcon size={12} className="text-muted" />}
              <span>{USER_INFO.phone}</span>
            </div>
            <div className="prf-meta-row">
              Employee ID : <span>{USER_INFO.empId}</span>
            </div>
            <div className="prf-meta-row">
              Date of Joining : <span>{USER_INFO.doj}</span>
            </div>
            <div className="mt-1">
              <span className="badge-completed">Active</span>
            </div>
          </div>
        </div>

        {/* Right Summary & Metrics Cards */}
        <div className="prf-right-grid">
          
          {/* Top 4 Summary Cards */}
          <div className="prf-summary-cards">
            {WORK_SUMMARY_CARDS.map((c) => {
              const IconComp = iconMap[c.icon];
              return (
                <div key={c.id} className="prf-summary-card">
                  <div className="prf-sc-icon">
                    {IconComp && <IconComp size={16} />}
                  </div>
                  <div className="prf-sc-body">
                    <span className="prf-sc-label">{c.label}</span>
                    <span className="prf-sc-val">{c.value}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom 4 Metric Cards */}
          <div className="prf-metrics-cards">
            {WORK_METRIC_CARDS.map((m) => {
              const IconComp = iconMap[m.icon];
              return (
                <div key={m.id} className={`prf-metric-card ${m.color}`}>
                  <div className="prf-mc-icon">
                    {IconComp && <IconComp size={16} />}
                  </div>
                  <div className="prf-mc-body">
                    <span className="prf-mc-label">{m.label}</span>
                    <span className="prf-mc-val">{m.value}</span>
                    <a href="#details" className="prf-mc-link">
                      View details {ArrowRightIcon && <ArrowRightIcon size={10} />}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* ========== MAIN 3-COLUMN SECTION ========== */}
      <div className="prf-main-grid">

        {/* Column 1: Personal Information */}
        <div className="prf-card">
          <div className="prf-card-header">
            <h3 className="prf-card-title">Personal Information</h3>
            <button className="prf-edit-btn">
              {EditIcon && <EditIcon size={12} />} Edit
            </button>
          </div>

          <div className="prf-info-list">
            {PERSONAL_INFO_FIELDS.map((item) => (
              <div key={item.label} className="prf-info-row">
                <span className="pir-label">{item.label}</span>
                <span className="pir-val">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Work Information */}
        <div className="prf-card">
          <div className="prf-card-header">
            <h3 className="prf-card-title">Work Information</h3>
            <button className="prf-edit-btn">
              {EditIcon && <EditIcon size={12} />} Edit
            </button>
          </div>

          <div className="prf-info-list">
            {WORK_INFO_FIELDS.map((item) => (
              <div key={item.label} className="prf-info-row">
                <span className="pir-label">{item.label}</span>
                {item.isBadge ? (
                  <span className="badge-completed">Active</span>
                ) : (
                  <span className="pir-val">{item.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Change Password */}
        <div className="prf-card">
          <div className="prf-card-header">
            <h3 className="prf-card-title">
              {LockIcon && <LockIcon size={16} className="text-primary" />}
              Change Password
            </h3>
          </div>

          <form className="prf-pwd-form" onSubmit={(e) => e.preventDefault()}>
            <div className="prf-field">
              <label className="prf-field-label">Current Password</label>
              <div className="prf-input-wrap">
                <input
                  type="password"
                  className="prf-input"
                  placeholder="Enter current password"
                  value={currPassword}
                  onChange={(e) => setCurrPassword(e.target.value)}
                />
                {EyeIcon && <EyeIcon size={14} className="prf-eye-icon" />}
              </div>
            </div>

            <div className="prf-field">
              <label className="prf-field-label">New Password</label>
              <div className="prf-input-wrap">
                <input
                  type="password"
                  className="prf-input"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                {EyeIcon && <EyeIcon size={14} className="prf-eye-icon" />}
              </div>
            </div>

            <div className="prf-field">
              <label className="prf-field-label">Confirm New Password</label>
              <div className="prf-input-wrap">
                <input
                  type="password"
                  className="prf-input"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {EyeIcon && <EyeIcon size={14} className="prf-eye-icon" />}
              </div>
            </div>

            <Button
              label="Update Password"
              variant="primary"
              size="md"
              icon={ShieldIcon && <ShieldIcon size={14} />}
              className="bg-success border-success w-full mt-2"
            />
          </form>
        </div>

        {/* Account Preferences Card */}
        <div className="prf-card">
          <div className="prf-card-header">
            <h3 className="prf-card-title">Account Preferences</h3>
          </div>

          <div className="prf-pref-form">
            <div className="prf-field">
              <label className="prf-field-label">Language</label>
              <select className="prf-select" defaultValue="English (India)">
                <option value="English (India)">English (India)</option>
                <option value="Tamil">Tamil</option>
              </select>
            </div>

            <div className="prf-field">
              <label className="prf-field-label">Date Format</label>
              <select className="prf-select" defaultValue="DD MMM YYYY">
                <option value="DD MMM YYYY">DD MMM YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div className="prf-field">
              <label className="prf-field-label">Time Zone</label>
              <select className="prf-select" defaultValue="(GMT +05:30) Asia/Kolkata">
                <option value="(GMT +05:30) Asia/Kolkata">(GMT +05:30) Asia/Kolkata</option>
              </select>
            </div>

            <div className="prf-toggle-row">
              <span className="prf-toggle-label">Email Notifications</span>
              <label className="prf-switch">
                <input type="checkbox" checked={emailNotif} onChange={(e) => setEmailNotif(e.target.checked)} />
                <span className="prf-slider" />
              </label>
            </div>

            <div className="prf-toggle-row">
              <span className="prf-toggle-label">SMS Notifications</span>
              <label className="prf-switch">
                <input type="checkbox" checked={smsNotif} onChange={(e) => setSmsNotif(e.target.checked)} />
                <span className="prf-slider" />
              </label>
            </div>

            <Button
              label="Save Preferences"
              variant="outline"
              size="md"
              icon={SaveIcon && <SaveIcon size={14} />}
              className="text-success border-success w-full mt-2"
            />
          </div>
        </div>

      </div>

      {/* ========== FULL WIDTH SECTION: RECENT ACTIVITIES ========== */}
      <div className="prf-full-width-section">
        <div className="prf-card">
          <div className="prf-card-header">
            <h3 className="prf-card-title">Recent Activities</h3>
            <button className="prf-edit-btn">View All</button>
          </div>

          <table className="prf-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Activity</th>
                <th>Application ID</th>
                <th>Date & Time</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_ACTIVITIES.map((act) => (
                <tr key={act.id}>
                  <td>{act.id}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                      {CheckCircleIcon && <CheckCircleIcon size={14} className={`text-${act.type}`} />}
                      {act.activity}
                    </div>
                  </td>
                  <td className="font-semibold text-primary">{act.appId}</td>
                  <td>{act.date}</td>
                  <td className="text-muted">{act.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== FOOTER ========== */}
      <footer className="prf-footer">
        <span>© 2025 Sivels Finance. All rights reserved.</span>
        <span>Version 1.0.0</span>
      </footer>

    </MainLayout>
  );
}

export default Profile;
