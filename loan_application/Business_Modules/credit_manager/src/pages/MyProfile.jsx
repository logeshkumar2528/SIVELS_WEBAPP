import { useMemo, useState, useEffect } from 'react';
import iconMap from '../../../back_office/src/back-office/config/iconMap';
import { getProfileImageUrl, getInitials } from '../../../../Core/src/utils/profileImageHelper';
import { formatDate } from '../../../../Core/src/utils/dateHelper';
import { useCreditManagerProfile } from '../hooks/useCreditManagerProfile';
import './MyProfile.css';

function ProfileSkeleton() {
  return (
    <div className="cm-profile-dashboard cm-profile-skeleton" aria-label="Loading profile">
      <div className="cm-profile-skeleton-hero" />
      <div className="cm-profile-skeleton-grid" />
    </div>
  );
}

export default function MyProfile() {
  const { profile, loading, error, refetch } = useCreditManagerProfile();
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
    profile?.creditManagerId ||
    profile?.id ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('creditManagerId') : null);

  const imageUrl = useMemo(
    () => (targetId ? getProfileImageUrl('CreditManager', targetId) : null),
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
  const fullLocation = [
    profile?.cityName,
    profile?.districtName,
    profile?.stateName,
    profile?.pincode,
  ].filter(Boolean).join(', ') || '—';

  if (loading) return <ProfileSkeleton />;

  if (error) {
    return (
      <section className="cm-profile-dashboard cm-profile-error-state" role="alert">
        <div className="cm-profile-error-icon"><ShieldIcon size={24} /></div>
        <div>
          <span className="cm-profile-eyebrow">Profile unavailable</span>
          <h2>We couldn’t load your profile</h2>
          <p>{error}</p>
        </div>
        <button type="button" className="cm-profile-retry" onClick={refetch}>
          {RefreshIcon && <RefreshIcon size={15} />} Try again
        </button>
      </section>
    );
  }

  return (
    <div className="cm-profile-dashboard">
      <div className="cm-profile-grid-layout">
        {/* LEFT — Dark-green employee identity panel */}
        <aside className="cm-identity-panel">
          <div className="cm-identity-avatar-wrap">
            {showImage ? (
              <img
                src={imageUrl}
                alt={profile?.fullName || 'Credit Manager'}
                className="cm-identity-avatar-img"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <span className="cm-identity-initials">
                {getInitials(profile?.fullName, 'CM')}
              </span>
            )}
          </div>

          <h2 className="cm-identity-name">{profile?.fullName || '—'}</h2>

          <div className="cm-identity-code-badge">
            <BadgeIcon size={13} />
            <span>{profile?.creditManagerCode || profile?.employeeCode || '—'}</span>
          </div>

          <p className="cm-identity-role">{profile?.role || 'Credit Underwriting & Approvals'}</p>

          <div className={`cm-identity-status-pill ${statusClass}`}>
            <span className="cm-identity-status-dot" />
            <span>{statusLabel}</span>
          </div>

          <div className="cm-identity-divider" />

          <div className="cm-identity-meta-list">
            <div className="cm-identity-meta-item">
              <BuildingIcon size={14} className="cm-identity-meta-icon" />
              <div className="cm-identity-meta-content">
                <span className="cm-identity-meta-label">Branch</span>
                <span className="cm-identity-meta-value">{profile?.branch || '—'}</span>
              </div>
            </div>

            <div className="cm-identity-meta-item">
              <ShieldIcon size={14} className="cm-identity-meta-icon" />
              <div className="cm-identity-meta-content">
                <span className="cm-identity-meta-label">Department</span>
                <span className="cm-identity-meta-value">{profile?.department || 'Credit Assessment'}</span>
              </div>
            </div>

            <div className="cm-identity-meta-item">
              <CalendarIcon size={14} className="cm-identity-meta-icon" />
              <div className="cm-identity-meta-content">
                <span className="cm-identity-meta-label">Member Since</span>
                <span className="cm-identity-meta-value">{formattedDateJoined}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT — One unified sage-green information panel */}
        <main className="cm-sage-panel">
          {/* Section 1: Personal Information */}
          <section className="cm-sage-section">
            <div className="cm-sage-section-header">
              <UserIcon size={14} className="cm-sage-section-icon" />
              <h3>Personal Information</h3>
            </div>
            <div className="cm-sage-row cm-sage-row-alt-1">
              <div className="cm-sage-field-item">
                <span className="cm-sage-label">Full Name</span>
                <span className="cm-sage-value">{profile?.fullName || '—'}</span>
              </div>
              <div className="cm-sage-field-item">
                <span className="cm-sage-label">Date of Birth</span>
                <span className="cm-sage-value">{formattedDob}</span>
              </div>
            </div>
            <div className="cm-sage-row cm-sage-row-alt-2">
              <div className="cm-sage-field-item">
                <span className="cm-sage-label">Gender</span>
                <span className="cm-sage-value">{profile?.gender || '—'}</span>
              </div>
              <div className="cm-sage-field-item">
                <span className="cm-sage-label">Joining Date</span>
                <span className="cm-sage-value">{formattedDateJoined}</span>
              </div>
            </div>
          </section>

          {/* Section 2: Contact & Location */}
          <section className="cm-sage-section">
            <div className="cm-sage-section-header">
              <MapPinIcon size={14} className="cm-sage-section-icon" />
              <h3>Contact &amp; Location</h3>
            </div>
            <div className="cm-sage-row cm-sage-row-alt-1">
              <div className="cm-sage-field-item">
                <span className="cm-sage-label">Mobile Number</span>
                <span className="cm-sage-value">{profile?.mobileNumber || '—'}</span>
              </div>
              <div className="cm-sage-field-item">
                <span className="cm-sage-label">Email Address</span>
                <span className="cm-sage-value">{profile?.emailAddress || '—'}</span>
              </div>
            </div>
            <div className="cm-sage-row cm-sage-row-alt-2">
              <div className="cm-sage-field-item">
                <span className="cm-sage-label">Residential Address</span>
                <span className="cm-sage-value">{profile?.address || '—'}</span>
              </div>
              <div className="cm-sage-field-item">
                <span className="cm-sage-label">Location</span>
                <span className="cm-sage-value">{fullLocation}</span>
              </div>
            </div>
          </section>

          {/* Section 3: Work Information */}
          <section className="cm-sage-section">
            <div className="cm-sage-section-header">
              <ShieldIcon size={14} className="cm-sage-section-icon" />
              <h3>Work Information</h3>
            </div>
            <div className="cm-sage-row cm-sage-row-alt-1">
              <div className="cm-sage-field-item">
                <span className="cm-sage-label">Credit Manager Code</span>
                <span className="cm-sage-value">{profile?.creditManagerCode || profile?.employeeCode || '—'}</span>
              </div>
              <div className="cm-sage-field-item">
                <span className="cm-sage-label">Role / Designation</span>
                <span className="cm-sage-value">{profile?.role || 'Credit Underwriting & Approvals'}</span>
              </div>
            </div>
            <div className="cm-sage-row cm-sage-row-alt-2">
              <div className="cm-sage-field-item">
                <span className="cm-sage-label">Assigned Branch</span>
                <span className="cm-sage-value">{profile?.branch || '—'}</span>
              </div>
              <div className="cm-sage-field-item">
                <span className="cm-sage-label">Department</span>
                <span className="cm-sage-value">{profile?.department || 'Credit Assessment'}</span>
              </div>
            </div>
            <div className="cm-sage-row cm-sage-row-alt-1">
              <div className="cm-sage-field-item cm-sage-col-full">
                <span className="cm-sage-label">Access Scope &amp; Permissions</span>
                <div className="cm-sage-permissions-wrap">
                  {profile?.permissions?.length ? (
                    profile.permissions.map((perm, idx) => (
                      <span key={idx} className="cm-sage-perm-tag">
                        <CheckIcon size={12} /> {perm}
                      </span>
                    ))
                  ) : (
                    <>
                      <span className="cm-sage-perm-tag">
                        <CheckIcon size={12} /> Review applications forwarded by Back Office
                      </span>
                      <span className="cm-sage-perm-tag">
                        <CheckIcon size={12} /> Approve, reject, or return applications with remarks
                      </span>
                      <span className="cm-sage-perm-tag">
                        <CheckIcon size={12} /> Access credit assessment reports &amp; history
                      </span>
                    </>
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

