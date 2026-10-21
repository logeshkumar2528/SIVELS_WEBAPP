import { useEffect, useState } from 'react';
import { apiFetch } from '../api/apiFetch';
import { API_BASE_URL, isApiUrl, resolveApiUrl } from '../api/apiConfig';

// Bundled assets are relative paths, so only absolute URLs under the API base are fetched with the token.
export function needsAuthedFetch(url) {
  if (!url || typeof url !== 'string' || !API_BASE_URL || !isApiUrl(url)) return false;
  if (!/^https?:\/\//i.test(url) && !url.startsWith(API_BASE_URL)) return false;
  return resolveApiUrl(url).startsWith(`${API_BASE_URL}/`);
}

/**
 * Resolves an API resource URL (profile image, document download) to a same-origin object URL
 * fetched with the Bearer token, because <img>/<iframe>/<a> cannot send Authorization headers.
 * Returns the URL unchanged when no token is needed, null while loading, and the original URL
 * if the fetch fails so the element's own onError/fallback behaviour still applies.
 */
export function useAuthedObjectUrl(url) {
  const needsFetch = needsAuthedFetch(url);
  const [resolved, setResolved] = useState({ key: null, value: null });

  useEffect(() => {
    if (!needsFetch) return undefined;

    const controller = new AbortController();
    let objectUrl = null;

    apiFetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        return response.blob();
      })
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setResolved({ key: url, value: objectUrl });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResolved({ key: url, value: url });
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, needsFetch]);

  if (!needsFetch) return url;
  return resolved.key === url ? resolved.value : null;
}

export default useAuthedObjectUrl;
