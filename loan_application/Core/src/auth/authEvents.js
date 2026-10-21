import { clearSession } from './tokenStore';

export const LOGIN_PATH = '/login';
export const FORBIDDEN_EVENT = 'sivels:forbidden';
export const FORBIDDEN_MESSAGE = "You don't have permission to perform this action.";

const PUBLIC_PATH_PATTERN = /^\/(login|verify|otp|signup)(\/|$)/i;

// Indirection so tests can observe redirects (jsdom does not allow stubbing window.location).
export const navigation = {
  replace(url) {
    window.location.replace(url);
  },
};

let redirecting = false;

export function isPublicAuthPath(pathname = window.location.pathname) {
  return PUBLIC_PATH_PATTERN.test(pathname || '');
}

export function redirectToLogin() {
  if (redirecting || isPublicAuthPath()) return;
  redirecting = true;
  navigation.replace(LOGIN_PATH);
}

export function handleSessionExpired() {
  clearSession();
  redirectToLogin();
}

export const APPLICATION_LOCKED_CODE = 'APPLICATION_LOCKED';
export const LOCKED_MESSAGE = 'This application is locked at its current stage.';
export const RATE_LIMITED_MESSAGE = 'Too many requests. Please wait a moment and try again.';

function notify(serverMessage, fallback) {
  const message = typeof serverMessage === 'string' && serverMessage.trim() ? serverMessage : fallback;
  window.dispatchEvent(new CustomEvent(FORBIDDEN_EVENT, { detail: { message } }));
}

export function notifyForbidden(serverMessage) {
  notify(serverMessage, FORBIDDEN_MESSAGE);
}

/**
 * Shows the server's message for responses the user cannot fix by retrying immediately:
 * 409 with code APPLICATION_LOCKED (wrong stage for this role) and 429 (rate limited).
 * Other 409s are left to the calling screen.
 */
export function notifyBlockedResponse(status, body) {
  if (status === 409 && body?.code === APPLICATION_LOCKED_CODE) {
    notify(body?.message, LOCKED_MESSAGE);
  } else if (status === 429) {
    notify(body?.message, RATE_LIMITED_MESSAGE);
  }
}

export function resetAuthEventsForTests() {
  redirecting = false;
}
