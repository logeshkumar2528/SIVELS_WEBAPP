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

export function notifyForbidden(serverMessage) {
  const message = typeof serverMessage === 'string' && serverMessage.trim() ? serverMessage : FORBIDDEN_MESSAGE;
  window.dispatchEvent(new CustomEvent(FORBIDDEN_EVENT, { detail: { message } }));
}

export function resetAuthEventsForTests() {
  redirecting = false;
}
