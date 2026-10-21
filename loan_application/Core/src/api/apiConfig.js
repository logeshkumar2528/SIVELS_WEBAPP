export const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

// Older screens hardcoded the production API host; requests to it are rebased onto API_BASE_URL.
const LEGACY_API_BASE_PATTERN = /^https?:\/\/(?:www\.)?fusiontecsoftware\.com\/sivels\/api(?=\/|$|\?)/i;

const isPassThroughScheme = (url) => /^(blob|data):/i.test(url);

export function resolveApiUrl(url) {
  const value = String(url ?? '');
  if (!value || isPassThroughScheme(value)) return value;
  if (LEGACY_API_BASE_PATTERN.test(value)) {
    return value.replace(LEGACY_API_BASE_PATTERN, API_BASE_URL);
  }
  if (/^https?:\/\//i.test(value)) return value;
  if (API_BASE_URL && value.startsWith(API_BASE_URL)) return value;
  return `${API_BASE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
}

export function isApiUrl(url) {
  const value = String(url ?? '');
  if (!value || isPassThroughScheme(value)) return false;
  if (LEGACY_API_BASE_PATTERN.test(value)) return true;
  if (/^https?:\/\//i.test(value)) {
    return Boolean(API_BASE_URL) && /^https?:\/\//i.test(API_BASE_URL) && value.startsWith(API_BASE_URL);
  }
  return true;
}
