import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import { useApplicationEditState } from '../../state/ApplicationDraftContext';
import './ApplicationLockBanner.css';

/**
 * Read-only notice for wizard pages. When the server locks the application for this user
 * (and locks are enforced), the page is switched to view mode, which disables the form and
 * turns "Save & Continue" into "Next".
 */
export default function ApplicationLockBanner({ appId }) {
  const { canEdit, reason, enforced } = useApplicationEditState(appId);
  const [searchParams, setSearchParams] = useSearchParams();
  const locked = !canEdit && enforced;
  const isViewMode = searchParams.get('mode') === 'view';
  const LockIcon = iconMap['Lock'] || iconMap['AlertTriangle'];

  useEffect(() => {
    if (!locked || isViewMode) return;
    const next = new URLSearchParams(searchParams);
    next.set('mode', 'view');
    setSearchParams(next, { replace: true });
  }, [locked, isViewMode, searchParams, setSearchParams]);

  if (!locked) return null;

  return (
    <div className="app-lock-banner" role="status">
      {LockIcon && <LockIcon size={16} />}
      <div>
        <strong>This application is read-only.</strong>
        <span>{reason || 'It is locked at its current stage.'}</span>
      </div>
    </div>
  );
}
