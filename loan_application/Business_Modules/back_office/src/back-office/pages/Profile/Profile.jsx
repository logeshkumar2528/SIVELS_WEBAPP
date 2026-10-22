import { useMemo, useState, useEffect } from 'react';
import iconMap from '../../config/iconMap';
import { useBackOfficeProfile } from '../../hooks/useBackOfficeProfile';
import { getProfileImageUrl, getInitials } from '../../utils/profileImageHelper';
import { formatDate } from '../../../../../../Core/src/utils/dateHelper';
import './Profile.css';
import AuthImage from '../../../../../../Core/src/auth/AuthImage';

function ProfileSkeleton() {
  return (
    <div className="bo-profile-page bo-profile-skeleton" aria-label="Loading profile">
      <div className="bo-profile-skeleton-hero"><span /><div><i /><i /><i /></div></div>
      <div className="bo-profile-skeleton-grid"><span /><span /><span /><span /></div>
    </div>
  );
}

export default function Profile() {
  const { profile, loading, error, refetch } = useBackOfficeProfile();
  const [imageFailed, setImageFailed] = useState(false);

  const UserIcon = iconMap.UserCircle || iconMap.User;
  const MailIcon = iconMap.Mail;
  const PhoneIcon = iconMap.Phone;
  const BuildingIcon = iconMap.Building2;
  const BadgeIcon = iconMap.BadgeIndianRupee || iconMap.ShieldCheck;
  const ShieldIcon = iconMap.ShieldCheck;
  const RefreshIcon = iconMap.RefreshCw;
  const CheckIcon = iconMap.CheckCircle2 || iconMap.Check;
  const CalendarIcon = iconMap.Calendar;
  const MapPinIcon = iconMap.MapPin;

  const targetId =
    profile?.backOfficeId ||
    profile?.id ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('backOfficeId') : null);

  const imageUrl = useMemo(() => {
    return targetId ? getProfileImageUrl('BackOffice', targetId) : null;
  }, [targetId]);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const showImage = Boolean(imageUrl && !imageFailed);
  const statusClass = profile?.isActive ? 'is-active' : 'is-inactive';
  const statusLabel = profile?.status || (profile?.isActive ? 'Active' : 'Inactive');

  const formattedDob = formatDate(profile?.dateOfBirth, '—');
  const formattedDateJoined = formatDate(profile?.dateJoined, '—');
  const fullAddress = [
    profile?.address,
    profile?.cityName,
    profile?.districtName,
    profile?.stateName,
    profile?.pincode,
  ].filter(Boolean).join(', ') || '—';

  if (loading) return <ProfileSkeleton />;

  if (error) {
    return (
      <section className="bo-profile-page bo-profile-error-state" role="alert">
        <div className="bo-profile-error-icon"><ShieldIcon size={24} /></div>
        <div>
          <span className="bo-profile-eyebrow">Profile unavailable</span>
          <h2>We couldn’t load your profile</h2>
          <p>{error}</p>
        </div>
        <button type="button" className="bo-profile-retry" onClick={refetch}>
          {RefreshIcon && <RefreshIcon size={15} />} Try again
        </button>
      </section>
    );
  }

  return (
    <div className="bo-profile-dashboard">
      <div className="bo-profile-grid-layout">
        {/* LEFT — Dark-green employee identity panel */}
        <aside className="bo-identity-panel">
          <div className="bo-identity-avatar-wrap">
            {showImage ? (
              <AuthImage
                src={imageUrl}
                alt={profile.fullName || 'Back Office User'}
                className="bo-profile-avatar-image"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <span className="bo-identity-initials">
                {getInitials(profile?.fullName, 'BO')}
              </span>
            )}
          </div>

          <h2 className="bo-identity-name">{profile?.fullName || '—'}</h2>

          <div className="bo-identity-code-badge">
            <BadgeIcon size={13} />
            <span>{profile?.employeeCode || profile?.backOfficeCode || '—'}</span>
          </div>

          <p className="bo-identity-role">{profile?.role || 'Operations Team'}</p>

          <div className={`bo-identity-status-pill ${statusClass}`}>
            <span className="bo-identity-status-dot" />
            <span>{statusLabel}</span>
          </div>

          <div className="bo-identity-divider" />

          <div className="bo-identity-meta-list">
            <div className="bo-identity-meta-item">
              <BuildingIcon size={14} className="bo-identity-meta-icon" />
              <div className="bo-identity-meta-content">
                <span className="bo-identity-meta-label">Branch</span>
                <span className="bo-identity-meta-value">{profile?.branch || '—'}</span>
              </div>
            </div>

            <div className="bo-identity-meta-item">
              <ShieldIcon size={14} className="bo-identity-meta-icon" />
              <div className="bo-identity-meta-content">
                <span className="bo-identity-meta-label">Department</span>
                <span className="bo-identity-meta-value">{profile?.department || 'Operations'}</span>
              </div>
            </div>

            <div className="bo-identity-meta-item">
              <CalendarIcon size={14} className="bo-identity-meta-icon" />
              <div className="bo-identity-meta-content">
                <span className="bo-identity-meta-label">Member Since</span>
                <span className="bo-identity-meta-value">{formattedDateJoined}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT — One unified sage-green information panel */}
        <main className="bo-sage-panel">
          {/* Section 1: Personal Information */}
          <section className="bo-sage-section">
            <div className="bo-sage-section-header">
              <UserIcon size={14} className="bo-sage-section-icon" />
              <h3>Personal Information</h3>
            </div>
            <div className="bo-sage-row bo-sage-row-alt-1">
              <div className="bo-sage-field-item">
                <span className="bo-sage-label">Full Name</span>
                <span className="bo-sage-value">{profile?.fullName || '—'}</span>
              </div>
              <div className="bo-sage-field-item">
                <span className="bo-sage-label">Date of Birth</span>
                <span className="bo-sage-value">{formattedDob}</span>
              </div>
            </div>
            <div className="bo-sage-row bo-sage-row-alt-2">
              <div className="bo-sage-field-item">
                <span className="bo-sage-label">Gender</span>
                <span className="bo-sage-value">{profile?.gender || '—'}</span>
              </div>
              <div className="bo-sage-field-item">
                <span className="bo-sage-label">Joining Date</span>
                <span className="bo-sage-value">{formattedDateJoined}</span>
              </div>
            </div>
          </section>

          {/* Section 2: Contact & Location */}
          <section className="bo-sage-section">
            <div className="bo-sage-section-header">
              <MapPinIcon size={14} className="bo-sage-section-icon" />
              <h3>Contact &amp; Location</h3>
            </div>
            <div className="bo-sage-row bo-sage-row-alt-1">
              <div className="bo-sage-field-item">
                <span className="bo-sage-label">Mobile Number</span>
                <span className="bo-sage-value">{profile?.mobileNumber || profile?.mobile || '—'}</span>
              </div>
              <div className="bo-sage-field-item">
                <span className="bo-sage-label">Email Address</span>
                <span className="bo-sage-value">{profile?.emailAddress || profile?.email || '—'}</span>
              </div>
            </div>
            <div className="bo-sage-row bo-sage-row-alt-2">
              <div className="bo-sage-field-item">
                <span className="bo-sage-label">Residential Address</span>
                <span className="bo-sage-value">{profile?.address || '—'}</span>
              </div>
              <div className="bo-sage-field-item">
                <span className="bo-sage-label">Location</span>
                <span className="bo-sage-value">{[profile?.cityName, profile?.districtName, profile?.stateName, profile?.pincode].filter(Boolean).join(', ') || '—'}</span>
              </div>
            </div>
          </section>

          {/* Section 3: Work Information */}
          <section className="bo-sage-section">
            <div className="bo-sage-section-header">
              <ShieldIcon size={14} className="bo-sage-section-icon" />
              <h3>Work Information</h3>
            </div>
            <div className="bo-sage-row bo-sage-row-alt-1">
              <div className="bo-sage-field-item">
                <span className="bo-sage-label">Employee Code</span>
                <span className="bo-sage-value">{profile?.employeeCode || profile?.backOfficeCode || '—'}</span>
              </div>
              <div className="bo-sage-field-item">
                <span className="bo-sage-label">Role / Designation</span>
                <span className="bo-sage-value">{profile?.role || 'Operations Team'}</span>
              </div>
            </div>
            <div className="bo-sage-row bo-sage-row-alt-2">
              <div className="bo-sage-field-item">
                <span className="bo-sage-label">Assigned Branch</span>
                <span className="bo-sage-value">{profile?.branch || '—'}</span>
              </div>
              <div className="bo-sage-field-item">
                <span className="bo-sage-label">Department</span>
                <span className="bo-sage-value">{profile?.department || 'Operations'}</span>
              </div>
            </div>
            <div className="bo-sage-row bo-sage-row-alt-1">
              <div className="bo-sage-field-item bo-sage-col-full">
                <span className="bo-sage-label">Access Scope &amp; Permissions</span>
                <div className="bo-sage-permissions-wrap">
                  {profile?.permissions?.length ? (
                    profile.permissions.map((perm, idx) => (
                      <span key={idx} className="bo-sage-perm-tag">
                        <CheckIcon size={12} /> {perm}
                      </span>
                    ))
                  ) : (
                    <span className="bo-sage-perm-tag is-role">
                      <ShieldIcon size={12} /> Role-based operational access &amp; verification
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
