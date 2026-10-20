import { DOSES, STAGE_BY_ID } from '../data/schedule';
import type { DoseDef, StageId } from '../data/schedule';
import { addDays, addMonths, diffDays, parseISODate, startOfDay, toISODate } from './date';
import type { ChildProfile, EntryPrefill, EntryStatus, VaccineEntry } from './types';

/* ------------------------------------------------------------------ *
 * Ages
 * ------------------------------------------------------------------ */

export type AgeParts = { years: number; months: number; weeks: number; days: number; totalDays: number };

export function ageParts(dobISO: string, now = new Date()): AgeParts {
  const dob = parseISODate(dobISO);
  const today = startOfDay(now);
  const totalDays = diffDays(dob, today);
  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  if (today.getDate() < dob.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return { years: 0, months: 0, weeks: 0, days: 0, totalDays: Math.max(totalDays, 0) };
  const anchor = addMonths(dob, years * 12 + months);
  const days = Math.max(diffDays(anchor, today), 0);
  return {
    years: Math.max(years, 0),
    months: Math.max(months, 0),
    weeks: Math.floor(days / 7),
    days,
    totalDays,
  };
}

export function ageLabel(dobISO: string, now = new Date()): string {
  const p = ageParts(dobISO, now);
  if (p.totalDays < 0) return 'Not born yet';
  if (p.totalDays === 0) return 'Born today';
  if (p.years > 0) {
    const rest = p.months ? ` ${p.months}m` : '';
    return `${p.years} yr${p.years === 1 ? '' : 's'}${rest}`;
  }
  if (p.months > 0) {
    const weeks = Math.floor(p.days / 7);
    return weeks ? `${p.months} mo ${weeks} wk` : `${p.months} month${p.months === 1 ? '' : 's'}`;
  }
  if (p.totalDays >= 14) return `${Math.floor(p.totalDays / 7)} weeks`;
  return `${p.totalDays} day${p.totalDays === 1 ? '' : 's'}`;
}

/* ------------------------------------------------------------------ *
 * National schedule, used only for suggestions
 * ------------------------------------------------------------------ */

export function doseDueDate(dobISO: string, dose: DoseDef): Date {
  const dob = parseISODate(dobISO);
  const stage = STAGE_BY_ID[dose.stage];
  if (dose.monthOffset != null) return startOfDay(addMonths(dob, dose.monthOffset));
  if (stage.dayOffset != null) return startOfDay(addDays(dob, stage.dayOffset));
  return startOfDay(addMonths(dob, stage.monthOffset));
}

function formatMonths(months: number): string {
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} year${years === 1 ? '' : 's'}`;
  }
  if (months < 24) return `${months} months`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y} yr ${m} mo` : `${y} years`;
}

/** "6 weeks", "9 months", "16 years": the age the schedule recommends a dose. */
export function recommendedLabel(dose: DoseDef): string {
  if (dose.monthOffset != null) return formatMonths(dose.monthOffset);
  return STAGE_BY_ID[dose.stage].label;
}

export function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Has this parent already recorded this schedule dose? Entries linked by id win;
 * otherwise we compare the names so hand-typed records ("Penta 2") count too.
 */
export function entryMatchesDose(entry: VaccineEntry, dose: DoseDef): boolean {
  if (entry.sourceId === dose.id) return true;
  const text = normalizeText(`${entry.name} ${entry.dose ?? ''}`);
  if (!text) return false;
  return [dose.name, dose.short].some((label) => {
    const needle = normalizeText(label);
    return needle.length > 1 && text.includes(needle);
  });
}

/** Exact name match against the national list, so typing it yourself links the dose. */
export function doseForName(name: string): DoseDef | undefined {
  const needle = normalizeText(name);
  if (!needle) return undefined;
  return DOSES.find((dose) => normalizeText(dose.name) === needle || normalizeText(dose.short) === needle);
}

export type Suggestion = {
  dose: DoseDef;
  dueDate: Date;
  /** dueDate − today, in days (negative means the age has passed) */
  daysFromToday: number;
  state: 'due' | 'ahead';
};

/**
 * Every national-schedule dose that is not in this child's record, ordered by
 * how close it sits to the child's current age: the next thing first, then the
 * most recently passed age, then the rest.
 */
export function suggestionsFor(child: ChildProfile, entries: VaccineEntry[], now = new Date()): Suggestion[] {
  const today = startOfDay(now);
  return DOSES.filter((dose) => !entries.some((entry) => entryMatchesDose(entry, dose)))
    .map<Suggestion>((dose) => {
      const dueDate = doseDueDate(child.dob, dose);
      const daysFromToday = diffDays(today, dueDate);
      return { dose, dueDate, daysFromToday, state: daysFromToday <= 0 ? 'due' : 'ahead' };
    })
    .sort((a, b) => relevance(a.daysFromToday) - relevance(b.daysFromToday) || a.daysFromToday - b.daysFromToday);
}

function relevance(days: number): number {
  // upcoming doses sit slightly ahead of overdue ones, and very old ones drift
  // to the bottom so a five-year-old is not shown birth doses at the top.
  return days >= 0 ? days + 30 : Math.min(-days, 120);
}

/** Open the entry sheet with this suggestion filled in, never auto-added. */
export function suggestionPrefill(item: Suggestion, now = new Date()): EntryPrefill {
  return {
    name: item.dose.name,
    sourceId: item.dose.id,
    mode: 'planned',
    date: item.daysFromToday < 0 ? toISODate(now) : toISODate(item.dueDate),
  };
}

export function groupSuggestions(list: Suggestion[]): Array<{ stage: StageId; label: string; items: Suggestion[] }> {
  const order: StageId[] = ['birth', 'w6', 'w10', 'w14', 'm9', 'm16', 'y2to5', 'y5', 'y10'];
  const groups = new Map<StageId, Suggestion[]>();
  for (const item of list) {
    const list2 = groups.get(item.dose.stage) ?? [];
    list2.push(item);
    groups.set(item.dose.stage, list2);
  }
  return order
    .filter((stage) => groups.has(stage))
    .map((stage) => ({
      stage,
      label: STAGE_BY_ID[stage].label,
      items: (groups.get(stage) ?? []).sort((a, b) => a.daysFromToday - b.daysFromToday),
    }));
}

/* ------------------------------------------------------------------ *
 * The parent's own entries
 * ------------------------------------------------------------------ */

export function entryStatus(entry: VaccineEntry, now = new Date()): EntryStatus {
  if (entry.givenOn) return 'given';
  if (!entry.dueOn) return 'upcoming';
  const days = diffDays(now, parseISODate(entry.dueOn));
  if (days < 0) return 'overdue';
  if (days === 0) return 'due';
  return 'upcoming';
}

export function entryDays(entry: VaccineEntry, now = new Date()): number | null {
  if (!entry.dueOn || entry.givenOn) return null;
  return diffDays(now, parseISODate(entry.dueOn));
}

/** Planned entries first (soonest at the top), then given ones (newest first). */
export function splitEntries(entries: VaccineEntry[]) {
  const planned = entries
    .filter((e) => !e.givenOn && e.dueOn)
    .sort((a, b) => (a.dueOn ?? '').localeCompare(b.dueOn ?? ''));
  const given = entries
    .filter((e) => e.givenOn)
    .sort((a, b) => (b.givenOn ?? '').localeCompare(a.givenOn ?? '') || b.createdAt.localeCompare(a.createdAt));
  return { planned, given };
}

export function summarize(entries: VaccineEntry[], now = new Date()) {
  const given = entries.filter((e) => Boolean(e.givenOn)).length;
  const planned = entries.filter((e) => !e.givenOn).length;
  const due = entries.filter((e) => {
    const s = entryStatus(e, now);
    return s === 'due' || s === 'overdue';
  }).length;
  return { total: entries.length, given, planned, due };
}

/* ------------------------------------------------------------------ *
 * Reminders & calendar: only dates the parent has planned
 * ------------------------------------------------------------------ */

export type ReminderMoment = {
  /** YYYY-MM-DD */
  date: string;
  titles: string[];
};

function momentLabel(entry: VaccineEntry): string {
  return entry.dose ? `${entry.name} ${entry.dose}` : entry.name;
}

/**
 * Dates worth nudging about: the parent's own planned entries, and nothing
 * else. Suggested doses are never put on someone's calendar behind their back.
 */
export function reminderMoments(entries: VaccineEntry[], leadDays: number, now = new Date()): ReminderMoment[] {
  const today = startOfDay(now);
  const buckets = new Map<string, string[]>();

  for (const entry of entries) {
    if (entry.givenOn || !entry.dueOn) continue;
    const days = diffDays(today, parseISODate(entry.dueOn));
    if (days < -30 || days > leadDays) continue;
    const titles = buckets.get(entry.dueOn) ?? [];
    const label = momentLabel(entry);
    if (!titles.includes(label)) titles.push(label);
    buckets.set(entry.dueOn, titles);
  }

  return [...buckets.entries()]
    .map(([date, titles]) => ({ date, titles }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** All planned dates, overdue ones included, for the reminders timeline. */
export function plannedMoments(entries: VaccineEntry[]): ReminderMoment[] {
  const buckets = new Map<string, string[]>();
  for (const entry of entries) {
    if (entry.givenOn || !entry.dueOn) continue;
    const titles = buckets.get(entry.dueOn) ?? [];
    const label = momentLabel(entry);
    if (!titles.includes(label)) titles.push(label);
    buckets.set(entry.dueOn, titles);
  }
  return [...buckets.entries()]
    .map(([date, titles]) => ({ date, titles }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Every planned date still ahead, for the calendar file. */
export function calendarMoments(entries: VaccineEntry[], now = new Date()): ReminderMoment[] {
  const today = startOfDay(now);
  const buckets = new Map<string, string[]>();
  for (const entry of entries) {
    if (entry.givenOn || !entry.dueOn) continue;
    if (parseISODate(entry.dueOn).getTime() < today.getTime()) continue;
    const titles = buckets.get(entry.dueOn) ?? [];
    const label = momentLabel(entry);
    if (!titles.includes(label)) titles.push(label);
    buckets.set(entry.dueOn, titles);
  }
  return [...buckets.entries()]
    .map(([date, titles]) => ({ date, titles }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const CARE_TIPS = [
  'Hold your baby close during the injection. Skin-to-skin contact calms them faster.',
  'A mild fever or soreness for a day or two is common. Ask your health worker what to give.',
  'Bring the immunisation card, even if you are visiting a different centre.',
  'Feed your baby before the visit. It helps with comfort and with oral vaccines.',
  'Write the date and place down right after the visit. Future you will thank you.',
  'If a dose is missed, it is almost never too late. Go as soon as you can; do not restart the series.',
];
