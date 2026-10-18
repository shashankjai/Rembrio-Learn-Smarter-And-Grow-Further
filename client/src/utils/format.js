export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, options);
}

export function formatShortDate(value) {
  return formatDate(value, { day: 'numeric', month: 'short' });
}

export const firstName = (name = '') => name.trim().split(/\s+/)[0] || 'there';

export function isOverdue(dueDate, completed) {
  if (!dueDate || completed) return false;
  const end = new Date(dueDate);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
}

/** <input type="date"> value (YYYY-MM-DD) -> ISO string at end of that local day, or undefined. */
export function dateInputToIso(value) {
  if (!value) return undefined;
  const d = new Date(`${value}T23:59:59`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export const todayInputValue = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
