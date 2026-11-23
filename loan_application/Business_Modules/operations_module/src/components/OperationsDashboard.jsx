import { ShieldCheck } from 'lucide-react';
import { getStoredRoleCode, getStoredUser } from '../../../../Core/src/auth/session';
import useOperationsProfile from '../hooks/useOperationsProfile';
import OperationsLayout from '../layouts/OperationsLayout';

function getDisplayName(profile, storedUser) {
  return profile?.fullName || profile?.name || profile?.displayName
    || storedUser?.fullName || storedUser?.name || 'Operations User';
}

export default function OperationsDashboard({ roleCode }) {
  const { profile, loading, error } = useOperationsProfile();
  const activeRole = roleCode || getStoredRoleCode(['MAKER', 'CHECKER']);
  const storedUser = getStoredUser([activeRole]);
  const roleLabel = activeRole === 'MAKER' ? 'Operations Maker' : 'Operations Checker';
  const profileErrorStatus = error?.response?.status;
  const profileMessage = profileErrorStatus === 403
    ? 'Your account does not have permission to view the Operations profile.'
    : profileErrorStatus === 404
      ? 'The Operations profile is not available.'
      : 'The Operations profile could not be loaded right now.';

  return (
    <OperationsLayout
      title={`${roleLabel} Dashboard`}
      subtitle="Operations workspace"
      profile={profile}
    >
      <section className="operations-page-heading" aria-labelledby="operations-dashboard-title">
        <div>
          <p className="operations-eyebrow">OPERATIONS</p>
          <h2 id="operations-dashboard-title">Welcome, {getDisplayName(profile, storedUser)}</h2>
          <p className="operations-muted">You are signed in as {roleLabel}.</p>
        </div>
        <div className="operations-role-chip" aria-label={`Current role: ${roleLabel}`}>
          <ShieldCheck size={18} aria-hidden="true" />
          {roleLabel}
        </div>
      </section>

      {loading && (
        <div className="operations-state-card" role="status">
          Loading your Operations profile…
        </div>
      )}

      {!loading && error && (
        <div className="operations-state-card operations-state-card--error" role="alert">
          {profileMessage}
        </div>
      )}

      <section className="operations-neutral-card" aria-labelledby="operations-workspace-title">
        <div className="operations-neutral-card__icon" aria-hidden="true">
          <ShieldCheck size={22} />
        </div>
        <div>
          <h3 id="operations-workspace-title">Application workspace</h3>
          <p>
            Operations application APIs are not available in this scope yet. No application counts,
            statuses, or records are displayed until the backend queue contract is provided.
          </p>
        </div>
      </section>
    </OperationsLayout>
  );
}
