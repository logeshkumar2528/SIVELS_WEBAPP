import { UserCircle } from 'lucide-react';
import AuthImage from '../../../../../Core/src/auth/AuthImage';
import useOperationsProfile from '../../hooks/useOperationsProfile';
import OperationsLayout from '../../layouts/OperationsLayout';

function firstValue(profile, ...keys) {
  for (const key of keys) {
    const value = profile?.[key];
    if (value !== undefined && value !== null && String(value).trim()) return value;
  }
  return 'Not provided';
}

function errorMessage(error) {
  const status = error?.response?.status;
  if (status === 403) return 'You do not have permission to view this profile.';
  if (status === 404) return 'The Operations profile is not available.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  return 'The Operations profile could not be loaded right now.';
}

export default function Profile() {
  const { profile, loading, error, reload } = useOperationsProfile();
  const name = firstValue(profile, 'fullName', 'name', 'displayName');
  const role = firstValue(profile, 'roleName', 'role');
  const image = profile?.profileImage || profile?.profileImageUrl || profile?.avatarUrl || null;
  const initials = name === 'Not provided' ? 'OU' : String(name).split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <OperationsLayout title="Profile" subtitle="Your Operations account" profile={profile}>
      <section className="operations-page-heading" aria-labelledby="operations-profile-title">
        <div>
          <p className="operations-eyebrow">ACCOUNT</p>
          <h2 id="operations-profile-title">Operations profile</h2>
          <p className="operations-muted">Profile information is supplied by the backend.</p>
        </div>
      </section>

      {loading && (
        <div className="operations-state-card" role="status">Loading your profile…</div>
      )}

      {!loading && error && (
        <div className="operations-state-card operations-state-card--error" role="alert">
          <p>{errorMessage(error)}</p>
          <button type="button" className="operations-secondary-button" onClick={reload}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <section className="operations-profile-card" aria-label="Operations profile details">
          <div className="operations-profile-card__hero">
            {image ? (
              <AuthImage src={image} alt={`${name} profile`} className="operations-profile-avatar" />
            ) : (
              <div className="operations-profile-avatar operations-profile-avatar--initials" aria-hidden="true">
                {initials}
              </div>
            )}
            <div>
              <h3>{name}</h3>
              <p>{role}</p>
            </div>
          </div>

          <dl className="operations-profile-grid">
            <div><dt>Employee code</dt><dd>{firstValue(profile, 'employeeCode', 'staffCode')}</dd></div>
            <div><dt>Full name</dt><dd>{name}</dd></div>
            <div><dt>Mobile number</dt><dd>{firstValue(profile, 'mobileNumber', 'phoneNumber', 'mobile')}</dd></div>
            <div><dt>Email address</dt><dd>{firstValue(profile, 'emailAddress', 'email')}</dd></div>
            <div><dt>Role name</dt><dd>{role}</dd></div>
            <div><dt>Branch</dt><dd>{firstValue(profile, 'branch', 'branchName')}</dd></div>
            <div><dt>Active status</dt><dd>{firstValue(profile, 'activeStatus', 'isActive', 'status')}</dd></div>
          </dl>

          <div className="operations-profile-note">
            <UserCircle size={17} aria-hidden="true" />
            <span>Document upload and replacement controls are not shown until their Operations endpoint contracts are confirmed.</span>
          </div>
        </section>
      )}
    </OperationsLayout>
  );
}
