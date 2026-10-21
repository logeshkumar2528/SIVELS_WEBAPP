import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import { useApplicationEditState } from '../../state/ApplicationDraftContext';
import { markLockForcedView, wasLockForcedView } from '../../utils/lockForcedView';
import './ApplicationLockBanner.css';

/**
 * Read-only notice for wizard pages. When the server locks the application for this user
 * (and locks are enforced), the page is switched to view mode, which disables the form and
 * turns "Save & Continue" into "Next".
 *
 * With area="documents" the page follows the server's documents rule instead. If view mode was
 * only carried over from a locked step and the server says documents are editable, it is lifted.
 */
export default function ApplicationLockBanner({ appId, area }) {
  const { canEdit, reason, enforced, loading } = useApplicationEditState(appId, area);
  const [searchParams, setSearchParams] = useSearchParams();
  const locked = !canEdit && enforced;
  const serverAllowsEdit = canEdit && enforced && !loading;
  const isViewMode = searchParams.get('mode') === 'view';
  const LockIcon = iconMap['Lock'] || iconMap['AlertTriangle'];

  useEffect(() => {
    if (locked && !isViewMode) {
      markLockForcedView(appId);
      const next = new URLSearchParams(searchParams);
      next.set('mode', 'view');
      setSearchParams(next, { replace: true });
      return;
    }

    if (area === 'documents' && serverAllowsEdit && isViewMode && wasLockForcedView(appId)) {
      const next = new URLSearchParams(searchParams);
      next.delete('mode');
      setSearchParams(next, { replace: true });
    }
  }, [locked, serverAllowsEdit, area, appId, isViewMode, searchParams, setSearchParams]);

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
