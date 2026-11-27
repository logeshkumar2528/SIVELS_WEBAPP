export function formatCurrency(amount) {
  const isEmpty = amount === null || amount === undefined || (typeof amount === 'string' && amount.trim() === '');
  const num = Number(amount);
  if (isEmpty || !Number.isFinite(num)) return '—';
  if (num === 0) return '₹0';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function summarizeAmount(list, field) {
  const values = list.map((item) => {
    const value = item?.[field];
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  });
  const complete = values.every((value) => value !== null);
  return {
    total: complete ? values.reduce((total, value) => total + value, 0) : null,
    complete,
  };
}

export function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

export function formatDate(value) {
  const date = parseDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function daysSince(value) {
  const date = parseDate(value);
  if (!date) return null;
  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function getApplicationNo(app) {
  if (app?.appId) return app.appId;
  if (app?.customerCode && app.customerCode !== 'N/A') return app.customerCode;
  return `#${app?.agentCustomerId ?? app?.id ?? ''}`;
}
