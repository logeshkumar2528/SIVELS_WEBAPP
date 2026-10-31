import { useMemo, useState, useEffect } from 'react';
import iconMap from '../../../back_office/src/back-office/config/iconMap';
import { getProfileImageUrl, getInitials } from '../../../../Core/src/utils/profileImageHelper';
import { formatDate } from '../../../../Core/src/utils/dateHelper';
import { useCreditHeadProfile } from '../hooks/useCreditHeadProfile';
import './MyProfile.css';

function ProfileSkeleton() {
  return (
    <div className="ch-profile-dashboard ch-profile-skeleton" aria-label="Loading profile">
      <div className="ch-profile-skeleton-hero" />
      <div className="ch-profile-skeleton-grid" />
    </div>
  );
}

export default function MyProfile() {
  const { profile, loading, error, refetch } = useCreditHeadProfile();
  const [imageFailed, setImageFailed] = useState(false);

  const UserIcon = iconMap.UserCircle || iconMap.User;
  const MailIcon = iconMap.Mail;
  const PhoneIcon = iconMap.Phone;
  const BuildingIcon = iconMap.Building2;
  const BadgeIcon = iconMap.BadgeIndianRupee || iconMap.ShieldCheck;
  const ShieldIcon = iconMap.ShieldCheck;
  const RefreshIcon = iconMap.RefreshCw;
  const CalendarIcon = iconMap.Calendar;
  const MapPinIcon = iconMap.MapPin;
  const LandmarkIcon = iconMap.Building2 || iconMap.Landmark;

  const targetId =
    profile?.creditHeadId ||
    profile?.id ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('creditHeadId') : null);

  const imageUrl = useMemo(
    () => (targetId ? getProfileImageUrl('CreditHead', targetId) : null),
    [targetId]
  );

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const showImage = Boolean(imageUrl && !imageFailed);
  const statusClass = profile?.isActive ? 'is-active' : 'is-inactive';
  const statusLabel = profile?.status || (profile?.isActive ? 'Active' : 'Inactive');

  const formattedDob = formatDate(profile?.dateOfBirth, '—');
  const formattedDateJoined = formatDate(profile?.dateJoined, '—');
  if (loading) return <ProfileSkeleton />;

  if (error) {
    return (
      <section className="ch-profile-dashboard ch-profile-error-state" role="alert">
        <div className="ch-profile-error-icon">{ShieldIcon && <ShieldIcon size={24} />}</div>
        <div>
          <span className="ch-profile-eyebrow">Profile unavailable</span>
          <h2>We couldn’t load your profile</h2>
          <p>{error}</p>
        </div>
        <button type="button" className="ch-profile-retry" onClick={refetch}>
          {RefreshIcon && <RefreshIcon size={15} />} Try again
        </button>
      </section>
    );
  }

  return (
    <div className="ch-profile-dashboard">
      <div className="ch-profile-grid-layout">
        {/* LEFT — Dark-green employee identity panel */}
        <aside className="ch-identity-panel">
          <div className="ch-identity-avatar-wrap">
            {showImage ? (
              <img
                src={imageUrl}
                alt={profile?.fullName || 'Credit Head'}
                className="ch-identity-avatar-img"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <span className="ch-identity-initials">
                {getInitials(profile?.fullName, 'CH')}
              </span>
            )}
          </div>

          <h2 className="ch-identity-name">{profile?.fullName || '—'}</h2>

          <div className="ch-identity-code-badge">
            {BadgeIcon && <BadgeIcon size={13} />}
            <span>{profile?.creditHeadCode || '—'}</span>
          </div>

          <p className="ch-identity-role">{profile?.role || 'Credit Head • Executive Leadership'}</p>

          <div className={`ch-identity-status-pill ${statusClass}`}>
            <span className="ch-identity-status-dot" />
            <span>{statusLabel}</span>
          </div>

          <div className="ch-identity-divider" />

          <div className="ch-identity-meta-list">
            <div className="ch-identity-meta-item">
              {BuildingIcon && <BuildingIcon size={14} className="ch-identity-meta-icon" />}
              <div className="ch-identity-meta-content">
                <span className="ch-identity-meta-label">Branch</span>
                <span className="ch-identity-meta-value">{profile?.branch || '—'}</span>
              </div>
            </div>

            <div className="ch-identity-meta-item">
              {ShieldIcon && <ShieldIcon size={14} className="ch-identity-meta-icon" />}
              <div className="ch-identity-meta-content">
                <span className="ch-identity-meta-label">Department</span>
                <span className="ch-identity-meta-value">{profile?.department || 'Credit & Risk Leadership'}</span>
              </div>
            </div>

            <div className="ch-identity-meta-item">
              {CalendarIcon && <CalendarIcon size={14} className="ch-identity-meta-icon" />}
              <div className="ch-identity-meta-content">
                <span className="ch-identity-meta-label">Member Since</span>
                <span className="ch-identity-meta-value">{formattedDateJoined}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT — One unified sage-green information panel */}
        <main className="ch-sage-panel">
          {/* Section 1: Personal Information */}
          <section className="ch-sage-section">
            <div className="ch-sage-section-header">
              {UserIcon && <UserIcon size={14} className="ch-sage-section-icon" />}
              <h3>Personal Information</h3>
            </div>
            <div className="ch-sage-row ch-sage-row-alt-1">
              <div className="ch-sage-field-item">
                <span className="ch-sage-label">Full Name</span>
                <span className="ch-sage-value">{profile?.fullName || '—'}</span>
              </div>
              <div className="ch-sage-field-item">
                <span className="ch-sage-label">Date of Birth</span>
                <span className="ch-sage-value">{formattedDob}</span>
              </div>
            </div>
            <div className="ch-sage-row ch-sage-row-alt-2">
              <div className="ch-sage-field-item">
                <span className="ch-sage-label">Gender</span>
                <span className="ch-sage-value">{profile?.gender || '—'}</span>
              </div>
              <div className="ch-sage-field-item">
                <span className="ch-sage-label">Joining Date</span>
                <span className="ch-sage-value">{formattedDateJoined}</span>
              </div>
            </div>
          </section>

          {/* Section 2: Contact & Location */}
          <section className="ch-sage-section">
            <div className="ch-sage-section-header">
              {MapPinIcon && <MapPinIcon size={14} className="ch-sage-section-icon" />}
              <h3>Contact &amp; Location</h3>
            </div>
            <div className="ch-sage-row ch-sage-row-alt-1">
              <div className="ch-sage-field-item">
                <span className="ch-sage-label">Mobile Number</span>
                <span className="ch-sage-value">{profile?.mobileNumber || '—'}</span>
              </div>
              <div className="ch-sage-field-item">
                <span className="ch-sage-label">Email Address</span>
                <span className="ch-sage-value">{profile?.emailAddress || '—'}</span>
              </div>
            </div>
            <div className="ch-sage-row ch-sage-row-alt-2">
              <div className="ch-sage-field-item">
                <span className="ch-sage-label">Residential Address</span>
                <span className="ch-sage-value">{profile?.address || '—'}</span>
              </div>
            </div>
            <div className="ch-sage-row ch-sage-row-alt-1">
              <div className="ch-sage-field-item">
                <span className="ch-sage-label">Country</span>
                <span className="ch-sage-value">{profile?.countryName || '—'}</span>
              </div>
              <div className="ch-sage-field-item">
                <span className="ch-sage-label">State</span>
                <span className="ch-sage-value">{profile?.stateName || '—'}</span>
              </div>
            </div>
            <div className="ch-sage-row ch-sage-row-alt-2">
              <div className="ch-sage-field-item">
                <span className="ch-sage-label">District</span>
                <span className="ch-sage-value">{profile?.districtName || '—'}</span>
              </div>
              <div className="ch-sage-field-item">
                <span className="ch-sage-label">City</span>
                <span className="ch-sage-value">{profile?.cityName || '—'}</span>
              </div>
            </div>
            <div className="ch-sage-row ch-sage-row-alt-1">
              <div className="ch-sage-field-item">
                <span className="ch-sage-label">Pincode</span>
                <span className="ch-sage-value">{profile?.pincode || '—'}</span>
              </div>
            </div>
          </section>

          {/* Section 3: Work & Organization */}
          <section className="ch-sage-section">
            <div className="ch-sage-section-header">
              {ShieldIcon && <ShieldIcon size={14} className="ch-sage-section-icon" />}
              <h3>Work &amp; Organization</h3>
            </div>
            <div className="ch-sage-row ch-sage-row-alt-1">
              <div className="ch-sage-field-item">
                <span className="ch-sage-label">Credit Head Code</span>
                <span className="ch-sage-value">{profile?.creditHeadCode || '—'}</span>
              </div>
              <div className="ch-sage-field-item">
                <span className="ch-sage-label">Role / Designation</span>
                <span className="ch-sage-value">{profile?.role || 'Credit Head'}</span>
              </div>
            </div>
            <div className="ch-sage-row ch-sage-row-alt-2">
              <div className="ch-sage-field-item">
                <span className="ch-sage-label">Assigned Branch</span>
                <span className="ch-sage-value">{profile?.branch || '—'}</span>
              </div>
              <div className="ch-sage-field-item">
                <span className="ch-sage-label">Department</span>
                <span className="ch-sage-value">{profile?.department || 'Credit & Risk Leadership'}</span>
              </div>
            </div>
          </section>

          {/* Section 4: Banking Information */}
          <section className="ch-sage-section">
            <div className="ch-sage-section-header">
              {LandmarkIcon && <LandmarkIcon size={14} className="ch-sage-section-icon" />}
              <h3>Banking Information</h3>
            </div>
            <div className="ch-sage-row ch-sage-row-alt-1">
              <div className="ch-sage-field-item">
                <span className="ch-sage-label">Bank Account Number</span>
                <span className="ch-sage-value">{profile?.accountNumber || '—'}</span>
              </div>
              <div className="ch-sage-field-item">
                <span className="ch-sage-label">IFSC Code</span>
                <span className="ch-sage-value">{profile?.ifscCode || '—'}</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
