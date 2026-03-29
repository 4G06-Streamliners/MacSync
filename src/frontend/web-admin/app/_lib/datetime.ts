/**
 * `datetime-local` value (YYYY-MM-DDTHH:mm) is wall time in the user's timezone.
 * Parse components and build Date via constructor so it is not treated as UTC.
 */
export function datetimeLocalValueToIsoUtc(value: string): string {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) {
    return new Date(value).toISOString();
  }
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  const h = parseInt(m[4], 10);
  const mi = parseInt(m[5], 10);
  return new Date(y, mo - 1, d, h, mi, 0, 0).toISOString();
}
