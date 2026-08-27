/**
 * Formats an ISO date string into a localized Date + Time format.
 * Returns '—' if the value is null, undefined, or invalid.
 * Example output: "8/22/2026 1:46:37 PM"
 */
export const formatDateTime = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return '—';
  }

  const pad = (num) => num.toString().padStart(2, '0');
  
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = pad(date.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const strHours = pad(hours);
  
  return `${day}/${month}/${year} ${strHours}:${minutes} ${ampm}`;
};
