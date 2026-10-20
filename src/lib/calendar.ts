import type { ChildProfile, DoseView } from './types';

/**
 * Calendar export — the one thing a web app can do that a closed tab cannot:
 * hand the visit dates to the phone's own calendar, so a reminder arrives even
 * if the app has not been opened for weeks.
 */

function pad(n: number): string {
  return `${n}`.padStart(2, '0');
}

/** Local-time stamp, RFC 5545 floating time (no Z) so the hour stays local. */
function stamp(d: Date, hours = 9): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(hours)}0000`;
}

/** UTC stamp, for DTSTAMP. */
function stampUTC(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function fold(line: string): string {
  // RFC 5545: keep lines under 75 octets.
  if (line.length <= 73) return line;
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    chunks.push(rest.slice(0, 73));
    rest = rest.slice(73);
  }
  chunks.push(rest);
  return chunks.join('\r\n ');
}

function escape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function startOfToday(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function buildCalendar(profile: ChildProfile, doses: DoseView[], time = '09:00'): string {
  const hour = Number(time.split(':')[0]) || 9;
  const today = startOfToday();
  // Alarms in the past would never fire, so only hand over today onwards.
  const pending = doses.filter((d) => d.status !== 'done' && d.dueDate.getTime() >= today);
  const groups = new Map<string, DoseView[]>();
  for (const dose of pending) {
    const key = `${dose.dueDate.getFullYear()}-${dose.dueDate.getMonth()}-${dose.dueDate.getDate()}`;
    const list = groups.get(key) ?? [];
    list.push(dose);
    groups.set(key, list);
  }

  const now = new Date();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vaccine Routine//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escape(`${profile.name} · vaccinations`)}`,
  ];

  for (const [, list] of groups) {
    const date = list[0].dueDate;
    const names = list.map((d) => d.name).join(', ');
    const details = list.map((d) => `${d.name} — ${d.protects} (${d.route})`).join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:vr-${profile.id}-${date.getTime()}@vaccine-routine`,
      `DTSTAMP:${stampUTC(now)}`,
      `DTSTART:${stamp(date, hour)}`,
      `DTEND:${stamp(date, hour + 1)}`,
      fold(`SUMMARY:${escape(`${profile.name} · ${list.length === 1 ? list[0].name : names}`)}`),
      fold(
        `DESCRIPTION:${escape(
          `${details}\n\nFrom Vaccine Routine, India's National Immunization Schedule.`,
        )}`,
      ),
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      fold(`DESCRIPTION:${escape(`Tomorrow: ${names} for ${profile.name}`)}`),
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      fold(`DESCRIPTION:${escape(`Today: ${names} for ${profile.name}`)}`),
      'END:VALARM',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadCalendar(profile: ChildProfile, doses: DoseView[], time?: string): number {
  const content = buildCalendar(profile, doses, time);
  const today = startOfToday();
  const count = new Set(
    doses
      .filter((d) => d.status !== 'done' && d.dueDate.getTime() >= today)
      .map((d) => d.dueDate.toDateString()),
  ).size;
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vaccine-routine-${profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  return count;
}
