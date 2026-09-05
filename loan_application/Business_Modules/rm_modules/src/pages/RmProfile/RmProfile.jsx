import { useEffect, useMemo, useState } from 'react';
import iconMap from '../../config/iconMap';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';
import Button from '../../components/Button/Button';
import { formatDateTime } from '../../utils/dateHelper';
import './RmProfile.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

function getInitials(name = '') {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function normalizePhone(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone || '';
}

function buildFallbackProfile(currentUser = {}) {
  return {
    employeeId: currentUser.rmCode || currentUser.employeeId || 'RM0001',
    name: currentUser.fullName || currentUser.name || 'Relationship Manager',
    role: currentUser.role || 'Relationship Manager',
    email: currentUser.emailAddress || currentUser.email || '',
    phone: normalizePhone(currentUser.mobileNumber || currentUser.phone || ''),
    location: [currentUser.cityName, currentUser.stateName].filter(Boolean).join(', ') || currentUser.address || '',
    dob: currentUser.dateOfBirth ? formatDateTime(currentUser.dateOfBirth).split(',')[0] : '',
    gender: currentUser.genderName || '',
    language: currentUser.language || 'English',
    address: [currentUser.address, currentUser.cityName, currentUser.stateName, currentUser.pincode]
      .filter(Boolean)
      .join(', '),
    accessLevel: 'Full Access',
    lastLogin: '',
    accountCreated: formatDateTime(currentUser.createdAt || currentUser.dateJoined),
    stats: {
      total: 0,
      approved: 0,
      approvedPct: '0%',
      pending: 0,
      pendingPct: '0%',
      rejected: 0,
      rejectedPct: '0%',
    },
    activities: [],
  };
}

export default function RmProfile() {
  const getCurrentUser = () => {
    try {
      const raw = localStorage.getItem('sivels_currentUser');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [profile, setProfile] = useState(() => buildFallbackProfile(getCurrentUser()));
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const BriefcaseIcon = iconMap['Briefcase'];
  const MailIcon = iconMap['Mail'];
  const PhoneIcon = iconMap['Phone'];
  const MapPinIcon = iconMap['MapPin'];
  const CheckCircle2Icon = iconMap['CheckCircle2'];
  const ClockIcon = iconMap['Clock'];
  const UserIcon = iconMap['User'];
  const ShieldIcon = iconMap['Shield'];
  const FileTextIcon = iconMap['FileText'];

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setIsLoading(true);
      setLoadError('');

      try {
        const response = await fetch(`${API_BASE}/RMMaster`);
        if (!response.ok) {
          throw new Error(`Failed to load RM profile (${response.status})`);
        }

        const data = await response.json();
        const rows = Array.isArray(data) ? data : (Array.isArray(data?.value) ? data.value : []);
        const currentMobile = String(currentUser?.mobileNumber || currentUser?.phone || '').replace(/\D/g, '');
        const currentRmId = Number(currentUser?.rmId || currentUser?.RMId || 0);

        const match =
          rows.find((row) => Number(row.rmId || row.RMId) === currentRmId) ||
          rows.find((row) => String(row.mobileNumber || '').replace(/\D/g, '') === currentMobile) ||
          rows[0];

        if (active && match) {
          const name = match.fullName || currentUser?.fullName || currentUser?.name || 'Relationship Manager';
          const employeeId = match.rmCode || `RM${String(match.rmId || currentRmId || 1).padStart(4, '0')}`;
          const location = [match.branch, match.cityName, match.stateName].filter(Boolean).join(', ');

          setProfile({
            employeeId,
            name,
            role: 'Relationship Manager',
            email: match.emailAddress || currentUser?.email || '',
            phone: normalizePhone(match.mobileNumber || currentUser?.mobileNumber || ''),
            location: location || currentUser?.address || '',
            dob: match.dateOfBirth ? formatDateTime(match.dateOfBirth).split(',')[0] : '',
            gender: match.genderName || '',
            language: currentUser?.language || 'English',
            address: [match.address, match.cityName, match.stateName, match.pincode].filter(Boolean).join(', '),
            accessLevel: 'Full Access',
            lastLogin: formatDateTime(match.modifiedAt || match.createdAt || ''),
            accountCreated: formatDateTime(match.createdAt || match.dateJoined || ''),
            stats: {
              total: 0,
              approved: 0,
              approvedPct: '0%',
              pending: 0,
              pendingPct: '0%',
              rejected: 0,
              rejectedPct: '0%',
            },
            activities: [],
          });
        }
      } catch (error) {
        console.error('Failed to load RM profile:', error);
        if (active) {
          setLoadError('Unable to load live RM profile. Showing session values.');
          setProfile(buildFallbackProfile(currentUser || {}));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [currentUser]);

  useEffect(() => {
    const handleStorage = () => setCurrentUser(getCurrentUser());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const displayAddress = useMemo(() => String(profile.address || '').replace('\n', ', '), [profile.address]);

  return (
    <div className="page-container" style={{ gap: '16px', overflowY: 'auto', paddingBottom: '32px' }}>
      <Breadcrumb items={['Dashboard', 'Profile']} />

      {loadError && (
        <div className="alert alert-warning" style={{ marginBottom: '12px' }}>
          {loadError}
        </div>
      )}

      <div className="rm-banner">
        <div className="rm-banner-left">
          <div className="rm-avatar-wrapper">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt={profile.name} className="rm-avatar-img" />
            <div className="rm-avatar-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            </div>
          </div>
          <div className="rm-banner-details">
            <div className="rm-name-row">
              <h2 className="rm-name">{isLoading ? 'Loading...' : profile.name}</h2>
              <span className="rm-role-badge">{profile.role}</span>
            </div>
            <div className="rm-contact-grid">
              <div className="rm-contact-item">
                {BriefcaseIcon && <BriefcaseIcon size={14} className="text-muted" />}
                <span>RM ID : {isLoading ? 'Loading...' : profile.employeeId}</span>
              </div>
              <div className="rm-contact-item">
                {MailIcon && <MailIcon size={14} className="text-muted" />}
                <span>{isLoading ? 'Loading...' : profile.email}</span>
              </div>
              <div className="rm-contact-item">
                {PhoneIcon && <PhoneIcon size={14} className="text-muted" />}
                <span>{isLoading ? 'Loading...' : profile.phone}</span>
              </div>
              <div className="rm-contact-item">
                {MapPinIcon && <MapPinIcon size={14} className="text-muted" />}
                <span>{isLoading ? 'Loading...' : profile.location}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rm-banner-right">
          <div className="rm-kpi-card" style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}>
            <div className="rm-kpi-icon text-success" style={{ background: '#dcfce7' }}>
              {BriefcaseIcon && <BriefcaseIcon size={20} />}
            </div>
            <div className="rm-kpi-value">{profile.stats.total}</div>
            <div className="rm-kpi-label">Total Applications</div>
            <div className="rm-kpi-sub">All Time</div>
          </div>

          <div className="rm-kpi-card" style={{ borderColor: '#bfdbfe', background: '#eff6ff' }}>
            <div className="rm-kpi-icon text-primary" style={{ background: '#dbeafe' }}>
              {CheckCircle2Icon && <CheckCircle2Icon size={20} />}
            </div>
            <div className="rm-kpi-value">{profile.stats.approved}</div>
            <div className="rm-kpi-label">Logged to HO</div>
            <div className="rm-kpi-sub text-primary">{profile.stats.approvedPct}</div>
          </div>

          <div className="rm-kpi-card" style={{ borderColor: '#fed7aa', background: '#fff7ed' }}>
            <div className="rm-kpi-icon text-warning" style={{ background: '#ffedd5' }}>
              {ClockIcon && <ClockIcon size={20} />}
            </div>
            <div className="rm-kpi-value">{profile.stats.pending}</div>
            <div className="rm-kpi-label">Pending</div>
            <div className="rm-kpi-sub text-warning">{profile.stats.pendingPct}</div>
          </div>
        </div>
      </div>

      <div className="rm-tabs">
        <button className="rm-tab active">Profile Information</button>
        <button className="rm-tab">Change Password</button>
        <button className="rm-tab">Notification Preferences</button>
        <button className="rm-tab">Activity Log</button>
      </div>

      <div className="rm-content-scrollable">
        <div className="rm-ribbons-container">
          <div className="rm-ribbon panel">
            <div className="rm-watermark">
              <svg width="200" height="200" viewBox="0 0 100 100" opacity="0.03">
                <path d="M50 10 L85 25 L85 50 C85 70 50 90 50 90 C50 90 15 70 15 50 L15 25 Z" fill="#166534" />
                <path d="M40 55 L48 63 L65 40" stroke="#166534" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>

            <div className="rm-ribbon-split">
              <div className="rm-r-left">
                <div className="rm-r-header text-success">
                  {UserIcon && <UserIcon size={14} />} Personal Identity
                </div>
                <div className="rm-r-grid">
                  <div className="rm-r-item"><span className="rm-r-label">Name</span><span className="rm-r-val">{profile.name}</span></div>
                  <div className="rm-r-item"><span className="rm-r-label">Phone</span><span className="rm-r-val">{profile.phone}</span></div>
                  <div className="rm-r-item"><span className="rm-r-label">Email</span><span className="rm-r-val">{profile.email}</span></div>
                  <div className="rm-r-item"><span className="rm-r-label">DOB</span><span className="rm-r-val">{profile.dob}</span></div>
                  <div className="rm-r-item"><span className="rm-r-label">Gender</span><span className="rm-r-val">{profile.gender}</span></div>
                  <div className="rm-r-item"><span className="rm-r-label">Language</span><span className="rm-r-val">{profile.language}</span></div>
                </div>
                <div className="rm-r-item" style={{ marginTop: '12px' }}>
                  <span className="rm-r-label">Address</span>
                  <span className="rm-r-val">{displayAddress}</span>
                </div>
              </div>

              <div className="rm-divider-vertical"></div>

              <div className="rm-r-right">
                <div className="rm-r-header text-primary">
                  {ShieldIcon && <ShieldIcon size={14} />} Account Security
                </div>
                <div className="rm-r-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="rm-r-item"><span className="rm-r-label">System Role</span><span className="rm-r-val">{profile.role}</span></div>
                  <div className="rm-r-item"><span className="rm-r-label">Access Level</span><span className="rm-r-val">{profile.accessLevel}</span></div>
                  <div className="rm-r-item"><span className="rm-r-label">Last Login</span><span className="rm-r-val text-muted">{profile.lastLogin}</span></div>
                  <div className="rm-r-item"><span className="rm-r-label">Account Created</span><span className="rm-r-val text-muted">{profile.accountCreated}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="rm-ribbon panel">
            <div className="rm-ribbon-split">
              <div className="rm-r-left">
                <div className="rm-r-header text-warning">
                  {FileTextIcon && <FileTextIcon size={14} />} Application Performance
                </div>
                <div className="rm-pill-container">
                  <div className="rm-stat-pill" style={{ background: '#f0fdf4' }}>
                    <span className="rm-pill-val text-success">{profile.stats.total}</span>
                    <span className="rm-pill-label">Total Submitted</span>
                  </div>
                  <div className="rm-stat-pill" style={{ background: '#eff6ff' }}>
                    <span className="rm-pill-val text-primary">{profile.stats.approved}</span>
                    <span className="rm-pill-label">Logged to HO ({profile.stats.approvedPct})</span>
                  </div>
                  <div className="rm-stat-pill" style={{ background: '#fff7ed' }}>
                    <span className="rm-pill-val text-warning">{profile.stats.pending}</span>
                    <span className="rm-pill-label">Pending ({profile.stats.pendingPct})</span>
                  </div>
                  <div className="rm-stat-pill" style={{ background: '#fef2f2' }}>
                    <span className="rm-pill-val text-danger">{profile.stats.rejected}</span>
                    <span className="rm-pill-label">Rejected ({profile.stats.rejectedPct})</span>
                  </div>
                </div>
              </div>

              <div className="rm-divider-vertical"></div>

              <div className="rm-r-right">
                <div className="rm-r-header" style={{ color: '#8b5cf6' }}>
                  {ClockIcon && <ClockIcon size={14} />} Recent Activity Feed
                </div>
                <div className="rm-horizontal-activity">
                  {profile.activities.slice(0, 2).map((act) => (
                    <div key={act.id} className="rm-h-act-item">
                      <div className={`rm-h-act-dot type-${act.type}`}></div>
                      <div className="rm-h-act-content">
                        <div className="rm-h-act-text">{act.action}</div>
                        <div className="rm-h-act-time">{act.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rm-footer-copyright">
          © 2025 Sivels Finance. All rights reserved.
        </div>
      </div>
    </div>
  );
}
