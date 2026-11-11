// Only credit roles record credit decisions, so only they have an approval range or escalation role.
export const CREDIT_ROLE_CODES = ['CREDIT_MANAGER', 'CREDIT_HEAD'];

export const isCreditRole = (baseRoleCode) => CREDIT_ROLE_CODES.includes(String(baseRoleCode || '').toUpperCase());

export const formatRupees = (amount) =>
  `₹${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const hasValue = (value) => value !== null && value !== undefined && value !== '';

/** "₹0 – ₹7,50,000 → Credit Head", or null when the role has no range and no escalation. */
export function formatApprovalRange(minimum, maximum, escalationRoleName) {
  if (!hasValue(minimum) && !hasValue(maximum) && !escalationRoleName) return null;
  const range = `${formatRupees(hasValue(minimum) ? minimum : 0)} – ${hasValue(maximum) ? formatRupees(maximum) : 'no limit'}`;
  return escalationRoleName ? `${range} → ${escalationRoleName}` : range;
}

/** '' -> null, otherwise the number (NaN when it isn't one). */
export const parseAmount = (text) => (String(text ?? '').trim() === '' ? null : Number(text));

export const amountToText = (value) => (hasValue(value) ? String(value) : '');

/** The same rules the backend applies; returns an error message or null. */
export function validateApprovalLimits({ minimum, maximum }) {
  if (Number.isNaN(minimum) || Number.isNaN(maximum)) return 'Approval amounts must be numbers.';
  if ((minimum !== null && minimum < 0) || (maximum !== null && maximum < 0)) return "Approval amounts can't be negative.";
  if (minimum !== null && maximum !== null && minimum > maximum) return "The minimum approval amount can't be above the maximum.";
  return null;
}
