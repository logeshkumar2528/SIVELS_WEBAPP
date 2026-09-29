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

/**
 * Converts a date value or ISO string to an IST calendar date string 'YYYY-MM-DD'.
 * Returns null if the value is null, undefined, empty, or invalid.
 */
export function getIstCalendarDateString(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const date = toValidDate(value);
  if (!date) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Returns today's IST calendar date as 'YYYY-MM-DD' */
export function getIstTodayDateString() {
  return getIstCalendarDateString(new Date());
}

/** Returns the IST calendar date string for N days prior to today */
export function getIstNDaysAgoDateString(n = 6) {
  const todayStr = getIstTodayDateString();
  const [y, m, d] = todayStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d - n);
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Evaluates whether an explicit date value falls on today or within the
 * previous 6 calendar days (inclusive 7-day window) in IST.
 * Returns false if dateValue is invalid or missing.
 */
export function isWithinLast7CalendarDays(dateValue) {
  const itemDateStr = getIstCalendarDateString(dateValue);
  if (!itemDateStr) return false;
  const todayStr = getIstTodayDateString();
  const sevenDaysAgoStr = getIstNDaysAgoDateString(6);
  return itemDateStr >= sevenDaysAgoStr && itemDateStr <= todayStr;
}

/**
 * Evaluates whether an explicit date value falls within [fromDate, toDate] inclusive.
 * If neither boundary is provided, returns true.
 * If at least one boundary is set, returns false if dateValue is invalid or missing.
 */
export function isWithinDateRange(dateValue, fromDate, toDate) {
  const hasFrom = Boolean(fromDate && String(fromDate).trim());
  const hasTo = Boolean(toDate && String(toDate).trim());

  if (!hasFrom && !hasTo) return true;

  const itemDateStr = getIstCalendarDateString(dateValue);
  if (!itemDateStr) return false;

  const fromStr = hasFrom ? getIstCalendarDateString(fromDate) : null;
  const toStr = hasTo ? getIstCalendarDateString(toDate) : null;

  if (fromStr && itemDateStr < fromStr) return false;
  if (toStr && itemDateStr > toStr) return false;

  return true;
}

/**
 * Standardized listing date predicate:
 * - When searchActive: searches full dataset (bypasses 7-day default). If custom dates exist, applies custom range.
 * - When !searchActive: applies custom range if custom dates exist; otherwise applies default latest 7 calendar days.
 */
export function matchesListingDateCriteria({
  dateValue,
  searchActive = false,
  fromDate = '',
  toDate = '',
} = {}) {
  const hasCustomDate = Boolean((fromDate && String(fromDate).trim()) || (toDate && String(toDate).trim()));

  if (searchActive) {
    if (hasCustomDate) {
      return isWithinDateRange(dateValue, fromDate, toDate);
    }
    return true;
  }

  if (hasCustomDate) {
    return isWithinDateRange(dateValue, fromDate, toDate);
  }

  return isWithinLast7CalendarDays(dateValue);
}

export { IST_TIMEZONE };
