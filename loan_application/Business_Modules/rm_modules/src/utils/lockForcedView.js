/**
 * Remembers, per application and browser tab, that the lock banner (not the user) switched the
 * wizard into view mode. View mode is carried from step to step in the URL, so the documents pages
 * use this to tell a lock-forced view apart from a view the RM chose.
 */
const KEY_PREFIX = 'sivels-rm-lock-forced-view:';

function storageKey(appId) {
  const id = String(appId ?? '').trim();
  return id ? `${KEY_PREFIX}${id}` : null;
}

export function markLockForcedView(appId) {
  const key = storageKey(appId);
  if (!key) return;
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    // sessionStorage unavailable; documents pages then stay in view mode.
  }
}

export function wasLockForcedView(appId) {
  const key = storageKey(appId);
  if (!key) return false;
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function clearLockForcedView(appId) {
  const key = storageKey(appId);
  if (!key) return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}
