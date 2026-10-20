const MS_DAY = 86_400_000;

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD string as a local calendar day (not UTC). */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Add months while keeping the calendar day stable (clamped to month length). */
export function addMonths(d: Date, months: number): Date {
  const whole = Math.floor(months);
  const fraction = months - whole;
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + whole, 1);
  const daysInMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, daysInMonth));
  if (fraction) {
    const daysInTarget = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    return addDays(target, Math.round(fraction * daysInTarget));
  }
  return target;
}

export function diffDays(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_DAY);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatDay(d: Date, now = new Date()): string {
  const sameYear = d.getFullYear() === now.getFullYear();
  return sameYear
    ? `${d.getDate()} ${MONTHS[d.getMonth()]}`
    : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatLongDay(d: Date): string {
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDayMonth(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatMonthYear(d: Date): string {
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatWeekday(d: Date): string {
  return WEEKDAYS[d.getDay()];
}

export function formatTime(hm: string): string {
  const [hRaw, mRaw] = hm.split(':').map(Number);
  const h = Number.isFinite(hRaw) ? hRaw : 9;
  const m = Number.isFinite(mRaw) ? mRaw : 0;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${`${m}`.padStart(2, '0')} ${suffix}`;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "2 days", "3 weeks", "5 months", for ages. */
export function humanGap(days: number): string {
  const abs = Math.abs(days);
  if (abs === 0) return 'today';
  if (abs === 1) return '1 day';
  if (abs < 14) return `${abs} days`;
  if (abs < 60) {
    const weeks = Math.round(abs / 7);
    return `${weeks} weeks`;
  }
  if (abs < 730) {
    const months = Math.round(abs / 30.44);
    return `${months} month${months === 1 ? '' : 's'}`;
  }
  const years = Math.round(abs / 365.25);
  return `${years} year${years === 1 ? '' : 's'}`;
}

