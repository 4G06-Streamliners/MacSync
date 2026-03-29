/**
 * Build a UTC ISO timestamp from separate date (YYYY-MM-DD) and time (HH:mm)
 * in the device's local timezone.
 *
 * Avoids `new Date("YYYY-MM-DDTHH:mm:ss")` which Hermes/V8 may parse as UTC,
 * shifting the displayed time by one calendar day in North American zones.
 */
export function localDateAndTimeToIsoUtc(date: string, time: string): string {
  const [y, mo, d] = date.split('-').map((x) => parseInt(x, 10));
  const parts = time.split(':');
  const h = parseInt(parts[0] ?? '0', 10);
  const mi = parseInt(parts[1] ?? '0', 10);
  const sec = parts[2] != null ? parseInt(parts[2], 10) : 0;
  const local = new Date(y, mo - 1, d, h, mi, sec, 0);
  return local.toISOString();
}

/** Round up: next whole hour from now (for default create-event time). */
export function defaultEventDateTime(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

export function formatPickerDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPickerTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Start of today (local) — use as minimumDate for event date pickers */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function dateToLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function dateToLocalTimeStr(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Same wall time → UTC ISO as separate fields, for API payloads */
export function localDateToIsoUtc(d: Date): string {
  return localDateAndTimeToIsoUtc(dateToLocalDateStr(d), dateToLocalTimeStr(d));
}

/** `datetime-local` string (YYYY-MM-DDTHH:mm) → local Date */
export function parseWebDatetimeLocal(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0, 0);
}
