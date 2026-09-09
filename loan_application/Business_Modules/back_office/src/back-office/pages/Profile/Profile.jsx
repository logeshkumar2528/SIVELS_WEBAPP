import { useMemo, useState, useEffect } from 'react';
import iconMap from '../../config/iconMap';
import { useBackOfficeProfile } from '../../hooks/useBackOfficeProfile';
import { getProfileImageUrl, getInitials } from '../../utils/profileImageHelper';
import './Profile.css';

function ProfileField({ icon: Icon, label, value }) {
  return (
    <div className="bo-profile-field">
      <span className="bo-profile-field-icon"><Icon size={17} /></span>
      <div>
        <span className="bo-profile-field-label">{label}</span>
        <strong>{value || 'Not Available'}</strong>
      </div>
    </div>
  );
}

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
    <div className="bo-profile-page">
      <section className="bo-profile-hero">
        <div className="bo-profile-hero-glow" aria-hidden="true" />
        <div className="bo-profile-hero-content">
          <div className="bo-profile-avatar-wrap">
            {showImage ? (
              <img
                src={imageUrl}
                alt={profile.fullName || 'Back Office User'}
                className="bo-profile-avatar-image"
                onError={() => setImageFailed(true)}
              />
            ) : null}
            <div className={`bo-profile-avatar ${showImage ? 'is-hidden' : ''}`}>
              {getInitials(profile.fullName, 'BO')}
            </div>
            <span className="bo-profile-avatar-check"><CheckIcon size={13} /></span>
          </div>
          <div className="bo-profile-identity">
            <span className="bo-profile-eyebrow">Back office account</span>
            <h2>{profile.fullName}</h2>
            <p>{profile.role}</p>
            <div className="bo-profile-hero-meta">
              <span>{profile.backOfficeCode || profile.employeeCode}</span>
              <span className={`bo-profile-status ${statusClass}`}><i /> {profile.status}</span>
            </div>
          </div>
        </div>
        <div className="bo-profile-hero-note">
          <ShieldIcon size={18} />
          <span>Secure operational access</span>
        </div>
      </section>

      <div className="bo-profile-layout">
        <main className="bo-profile-main-card">
          <div className="bo-profile-card-heading">
            <div>
              <span className="bo-profile-eyebrow">Account details</span>
              <h3>Personal &amp; work information</h3>
            </div>
            <span className="bo-profile-live-pill"><i /> Live from API</span>
          </div>
          <div className="bo-profile-fields-grid">
            <ProfileField icon={UserIcon} label="Full name" value={profile.fullName} />
            <ProfileField icon={BadgeIcon} label="Employee code" value={profile.employeeCode || profile.backOfficeCode} />
            <ProfileField icon={MailIcon} label="Email address" value={profile.emailAddress || profile.email} />
            <ProfileField icon={PhoneIcon} label="Mobile number" value={profile.mobileNumber || profile.mobile} />
            <ProfileField icon={BuildingIcon} label="Branch" value={profile.branch} />
            <ProfileField icon={ShieldIcon} label="Access role" value={profile.role} />
          </div>
        </main>

        <aside className="bo-profile-access-card">
          <div className="bo-profile-card-heading">
            <div>
              <span className="bo-profile-eyebrow">Permissions</span>
              <h3>Access scope</h3>
            </div>
            <span className="bo-profile-access-icon"><ShieldIcon size={17} /></span>
          </div>
          {profile.permissions?.length ? (
            <ul className="bo-profile-permissions">
              {profile.permissions.map((permission) => (
                <li key={permission}><CheckIcon size={15} /><span>{permission}</span></li>
              ))}
            </ul>
          ) : (
            <div className="bo-profile-no-permissions">
              <ShieldIcon size={20} />
              <strong>Role-based access enabled</strong>
              <span>No individual permissions were returned by the API.</span>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
