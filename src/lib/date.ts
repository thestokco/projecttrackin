export function parseDate(value: string | Date | null | undefined): Date {
  if (!value) return new Date(NaN);
  if (value instanceof Date) return value;
  // Handles 'YYYY-MM-DD' as local-time, avoiding UTC shift to previous day.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}
