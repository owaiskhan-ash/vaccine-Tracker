import { DOSES, DOSE_BY_ID, STAGES, STAGE_BY_ID, graceDaysFor } from '../data/schedule';
import type { DoseDef, StageId } from '../data/schedule';
import { addDays, addMonths, diffDays, parseISODate, startOfDay, toISODate } from './date';
import type { ChildProfile, DoseRecord, DoseStatus, DoseView } from './types';

export function doseOffset(dose: DoseDef): number {
  return dose.monthOffset ?? STAGE_BY_ID[dose.stage].monthOffset;
}

export function dueDateFor(profile: ChildProfile, dose: DoseDef): Date {
  const dob = parseISODate(profile.dob);
  const dayOffset = dose.monthOffset == null ? STAGE_BY_ID[dose.stage].dayOffset : undefined;
  if (dayOffset != null) return startOfDay(addDays(dob, dayOffset));
  return startOfDay(addMonths(dob, doseOffset(dose)));
}

export function windowEndFor(profile: ChildProfile, dose: DoseDef): Date {
  return addDays(dueDateFor(profile, dose), graceDaysFor(dose.stage));
}

export function statusFor(
  profile: ChildProfile,
  dose: DoseDef,
  record: DoseRecord | undefined,
  now = new Date(),
): DoseStatus {
  if (record) return 'done';
  const due = dueDateFor(profile, dose);
  const end = windowEndFor(profile, dose);
  const t = startOfDay(now).getTime();
  if (t > startOfDay(end).getTime()) return 'overdue';
  if (t >= due.getTime()) return 'due';
  return 'upcoming';
}

export function buildDoseViews(
  profile: ChildProfile,
  records: Record<string, DoseRecord> | undefined,
  now = new Date(),
): DoseView[] {
  return DOSES.map((dose) => {
    const record = records?.[dose.id];
    const due = dueDateFor(profile, dose);
    const windowEnd = windowEndFor(profile, dose);
    return {
      key: `${profile.id}:${dose.id}`,
      doseId: dose.id,
      stage: dose.stage,
      name: dose.name,
      short: dose.short,
      protects: dose.protects,
      route: dose.route,
      detail: dose.detail,
      dueDate: due,
      windowEnd,
      status: statusFor(profile, dose, record, now),
      record,
      daysUntil: diffDays(now, due),
    };
  });
}

export type StageSummary = {
  stage: StageId;
  label: string;
  short: string;
  eyebrow: string;
  note: string;
  dueDate: Date;
  total: number;
  done: number;
  overdue: number;
  current: boolean;
  complete: boolean;
  doses: DoseView[];
};

const STAGE_ORDER = STAGES.map((s) => s.id);

export function groupByStage(doses: DoseView[]): StageSummary[] {
  const today = startOfDay(new Date());
  return STAGES.map((stage) => {
    const stageDoses = doses
      .filter((d) => d.stage === stage.id)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    const done = stageDoses.filter((d) => d.status === 'done').length;
    const firstDue = stageDoses[0]?.dueDate ?? today;
    const lastWindow = stageDoses.reduce(
      (acc, d) => (d.windowEnd.getTime() > acc.getTime() ? d.windowEnd : acc),
      firstDue,
    );
    return {
      stage: stage.id,
      label: stage.label,
      short: stage.short,
      eyebrow: stage.eyebrow,
      note: stage.note,
      dueDate: firstDue,
      total: stageDoses.length,
      done,
      overdue: stageDoses.filter((d) => d.status === 'overdue').length,
      current: today >= firstDue && today <= lastWindow,
      complete: stageDoses.length > 0 && done === stageDoses.length,
      doses: stageDoses,
    };
  }).filter((s) => s.total > 0).sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));
}

export type Progress = {
  total: number;
  done: number;
  overdue: number;
  dueNow: number;
  next?: DoseView;
  nextStage?: StageSummary;
  percent: number;
};

export function progressFor(doses: DoseView[]): Progress {
  const total = doses.length;
  const done = doses.filter((d) => d.status === 'done').length;
  const overdue = doses.filter((d) => d.status === 'overdue').length;
  const dueNow = doses.filter((d) => d.status === 'due').length;
  const upcoming = doses
    .filter((d) => d.status !== 'done')
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const next = upcoming[0];
  const stages = groupByStage(doses);
  const nextStage = next ? stages.find((s) => s.stage === next.stage) : undefined;
  return {
    total,
    done,
    overdue,
    dueNow,
    next,
    nextStage,
    percent: total ? Math.round((done / total) * 100) : 0,
  };
}

export function nextVisit(doses: DoseView[]): DoseView[] {
  const pending = doses
    .filter((d) => d.status !== 'done')
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  if (!pending.length) return [];
  const first = pending[0];
  const firstVisitDate = first.dueDate.getTime();
  const firstStage = first.stage;
  // everything overdue from earlier visits + everything sharing the next visit date
  return pending.filter(
    (d) =>
      d.status === 'overdue' ||
      (d.stage === firstStage && d.dueDate.getTime() === firstVisitDate) ||
      d.dueDate.getTime() === firstVisitDate,
  );
}

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
  return { years: Math.max(years, 0), months: Math.max(months, 0), weeks: Math.floor(days / 7), days, totalDays };
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

export type ReminderPlanItem = { date: string; doses: DoseView[] };

/**
 * Everything that should produce a reminder: doses due inside the lead window,
 * plus doses that have slipped past it. One reminder per visit date.
 */
export function reminderPlan(doses: DoseView[], leadDays: number, now = new Date()): ReminderPlanItem[] {
  const horizon = addDays(startOfDay(now), leadDays).getTime();
  const buckets = new Map<string, DoseView[]>();
  for (const dose of doses) {
    if (dose.status === 'done') continue;
    const withinWindow = dose.status === 'due' || dose.status === 'overdue';
    const soon = dose.dueDate.getTime() <= horizon && dose.daysUntil >= -365;
    if (!withinWindow && !soon) continue;
    const key = toISODate(dose.dueDate);
    const list = buckets.get(key) ?? [];
    list.push(dose);
    buckets.set(key, list);
  }
  return [...buckets.entries()]
    .map(([date, list]) => ({ date, doses: list }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** The next few visits, whether or not a reminder is queued for them yet. */
export function upcomingVisits(doses: DoseView[], limit = 4): ReminderPlanItem[] {
  const today = startOfDay(new Date()).getTime();
  const buckets = new Map<string, DoseView[]>();
  for (const dose of doses) {
    if (dose.status === 'done') continue;
    if (dose.status !== 'overdue' && dose.windowEnd.getTime() < today) continue;
    const key = toISODate(dose.dueDate);
    const list = buckets.get(key) ?? [];
    list.push(dose);
    buckets.set(key, list);
  }
  return [...buckets.entries()]
    .map(([date, list]) => ({ date, doses: list }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

export function doseById(id: string): DoseDef | undefined {
  return DOSE_BY_ID[id];
}

/** Gentle, deterministic nudge unrelated to dosage. */
export const CARE_TIPS = [
  'Hold your baby close during the injection. Skin-to-skin contact calms them faster.',
  'A mild fever or soreness for a day or two is common. Ask your health worker what to give.',
  'Bring the immunisation card, even if you are visiting a different centre.',
  'Feed your baby before the visit. It helps with comfort and with oral vaccines.',
  'Write down the date and place in the app right after the visit — future you will thank you.',
  'If a dose is missed, it is almost never too late. Go as soon as you can; do not restart the series.',
];
