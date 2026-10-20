import type { ReminderMoment } from './engine';
import { parseISODate } from './date';
import type { ChildProfile } from './types';

/**
 * Calendar export: hands the dates a parent has planned to their own calendar,
 * so a reminder can arrive even if the app has not been opened for weeks. The
 * file is built on the phone; nothing is uploaded.
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

export function buildCalendar(profile: ChildProfile, moments: ReminderMoment[], time = '09:00'): string {
  const hour = Number(time.split(':')[0]) || 9;
  const now = new Date();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vaccine Routine//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escape(`${profile.name} · vaccinations`)}`,
  ];

  for (const moment of moments) {
    if (!moment.titles.length) continue;
    const date = parseISODate(moment.date);
    const names = moment.titles.join(', ');
    lines.push(
      'BEGIN:VEVENT',
      `UID:vr-${profile.id}-${moment.date}@vaccine-routine`,
      `DTSTAMP:${stampUTC(now)}`,
      `DTSTART:${stamp(date, hour)}`,
      `DTEND:${stamp(date, hour + 1)}`,
      fold(`SUMMARY:${escape(`${profile.name} · ${names}`)}`),
      fold(
        `DESCRIPTION:${escape(
          `${moment.titles.join('\n')}\n\nPlanned in Vaccine Routine. Stored on this phone.`,
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

export function downloadCalendar(profile: ChildProfile, moments: ReminderMoment[], time?: string): number {
  const content = buildCalendar(profile, moments, time);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vaccine-routine-${profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  return moments.length;
}
