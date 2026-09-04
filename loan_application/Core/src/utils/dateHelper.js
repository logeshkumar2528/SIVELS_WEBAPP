/**
 * Indian Standard Time (Asia/Kolkata) date helpers.
 * Formats API timestamps consistently across Master, RM, and Agent modules.
 */

const IST_TIMEZONE = 'Asia/Kolkata';

const DATE_OPTIONS = {
  timeZone: IST_TIMEZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
};

const TIME_OPTIONS = {
  timeZone: IST_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
};

const DATETIME_OPTIONS = {
  ...DATE_OPTIONS,
  ...TIME_OPTIONS,
};

const DATETIME_SECONDS_OPTIONS = {
  ...DATETIME_OPTIONS,
  second: '2-digit',
};

function toValidDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** DD MMM YYYY — e.g. 04 Sep 2026 */
export function formatDate(value, fallback = '—') {
  const date = toValidDate(value);
  if (!date) return fallback;
  return date.toLocaleDateString('en-IN', DATE_OPTIONS);
}

/** hh:mm am/pm — e.g. 04:15 pm */
export function formatTime(value, fallback = '—') {
  const date = toValidDate(value);
  if (!date) return fallback;
  return date.toLocaleTimeString('en-IN', TIME_OPTIONS);
}

/** DD MMM YYYY, hh:mm am/pm — e.g. 04 Sep 2026, 04:15 pm */
export function formatDateTime(value, fallback = '—') {
  const date = toValidDate(value);
  if (!date) return fallback;
  return date.toLocaleString('en-IN', DATETIME_OPTIONS);
}

/** DD MMM YYYY, hh:mm:ss am/pm */
export function formatDateTimeSeconds(value, fallback = '—') {
  const date = toValidDate(value);
  if (!date) return fallback;
  return date.toLocaleString('en-IN', DATETIME_SECONDS_OPTIONS);
}

/** DD/MM/YYYY hh:mm AM/PM — master-table style */
export function formatDateTimeSlash(value, fallback = '—') {
  const date = toValidDate(value);
  if (!date) return fallback;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  const day = get('day');
  const month = get('month');
  const year = get('year');
  const hour = get('hour');
  const minute = get('minute');
  const dayPeriod = (get('dayPeriod') || '').toUpperCase();

  return `${day}/${month}/${year} ${hour}:${minute} ${dayPeriod}`.trim();
}

/** Calendar date in IST as YYYY-MM-DD (avoids UTC day shift) */
export function toIstDateInput(value) {
  const date = toValidDate(value) || new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function getDateTimestamp(value) {
  const date = toValidDate(value);
  return date ? date.getTime() : 0;
}

export { IST_TIMEZONE };
