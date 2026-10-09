import { useEffect, useMemo, useState } from 'react';
import iconMap from '../../../back_office/src/back-office/config/iconMap';
import '../../../back_office/src/back-office/pages/Profile/Profile.css';
import { getProfileImageUrl, getInitials } from '../../../../Core/src/utils/profileImageHelper';
import { useCreditManagerProfile } from '../hooks/useCreditManagerProfile';

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

  const imageUrl = useMemo(
    () => (profile?.creditManagerId ? getProfileImageUrl('CreditManager', profile.creditManagerId) : null),
    [profile?.creditManagerId]
  );

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

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

  const showImage = Boolean(imageUrl && !imageFailed);
  const statusClass = profile.isActive ? 'is-active' : 'is-inactive';

  return (
    <div className="bo-profile-page">
      <section className="bo-profile-hero">
        <div className="bo-profile-hero-glow" aria-hidden="true" />
        <div className="bo-profile-hero-content">
          <div className="bo-profile-avatar-wrap">
            {showImage ? (
              <img
                src={imageUrl}
                alt={profile.fullName || 'Credit Manager'}
                className="bo-profile-avatar-image"
                onError={() => setImageFailed(true)}
              />
            ) : null}
            <div className={`bo-profile-avatar ${showImage ? 'is-hidden' : ''}`}>
              {getInitials(profile.fullName, 'CM')}
            </div>
            <span className="bo-profile-avatar-check"><CheckIcon size={13} /></span>
          </div>
          <div className="bo-profile-identity">
            <span className="bo-profile-eyebrow">Credit manager account</span>
            <h2>{profile.fullName}</h2>
            <p>{profile.role}</p>
            <div className="bo-profile-hero-meta">
              <span>{profile.creditManagerCode}</span>
              <span className={`bo-profile-status ${statusClass}`}><i /> {profile.status}</span>
            </div>
          </div>
        </div>
        <div className="bo-profile-hero-note">
          <ShieldIcon size={18} />
          <span>Secure credit review access</span>
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
            <ProfileField icon={BadgeIcon} label="Credit manager code" value={profile.creditManagerCode} />
            <ProfileField icon={MailIcon} label="Email address" value={profile.emailAddress} />
            <ProfileField icon={PhoneIcon} label="Mobile number" value={profile.mobileNumber} />
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
          <ul className="bo-profile-permissions">
            <li><CheckIcon size={15} /><span>Review applications sent by Back Office</span></li>
            <li><CheckIcon size={15} /><span>View approved and rejected applications</span></li>
            <li><CheckIcon size={15} /><span>Access credit review reports</span></li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
