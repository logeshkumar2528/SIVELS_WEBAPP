export function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function normalizeDateKey(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

export function dateFromKey(key) {
  const normalized = normalizeDateKey(key);
  if (!normalized) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function usageByDate(rows = []) {
  const byDate = new Map();
  (Array.isArray(rows) ? rows : []).forEach((item) => {
    const key = normalizeDateKey(item?.date);
    if (!key) return;
    const existing = byDate.get(key);
    const calls = Number(item?.calls || 0);
    const cost = Number(item?.cost || 0);
    if (existing) {
      byDate.set(key, {
        ...existing,
        calls: existing.calls + calls,
        cost: existing.cost + cost,
      });
      return;
    }
    const date = dateFromKey(key);
    if (!date) return;
    byDate.set(key, { key, date, calls, cost });
  });
  return byDate;
}

export function buildDailyUsageAxis(rows = [], today = new Date()) {
  const byDate = usageByDate(rows);
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 13 + index);
    const key = localDateKey(date);
    const item = byDate.get(key);
    return { key, date, calls: Number(item?.calls || 0), cost: Number(item?.cost || 0) };
  });
}

/** Default 14-day view, or a single date / full month when filters are set. */
export function filterDailyUsage(rows = [], { dateFilter = '', monthFilter = '', today = new Date() } = {}) {
  const byDate = usageByDate(rows);
  const dateKey = normalizeDateKey(dateFilter);
  const monthKey = String(monthFilter || '').trim().slice(0, 7);

  if (dateKey) {
    const existing = byDate.get(dateKey);
    if (existing) return [existing];
    const date = dateFromKey(dateKey);
    return date ? [{ key: dateKey, date, calls: 0, cost: 0 }] : [];
  }

  if (monthKey && /^\d{4}-\d{2}$/.test(monthKey)) {
    const [year, month] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = new Date(year, month - 1, day);
      const key = localDateKey(date);
      const item = byDate.get(key);
      return { key, date, calls: Number(item?.calls || 0), cost: Number(item?.cost || 0) };
    });
  }

  return buildDailyUsageAxis(rows, today);
}
