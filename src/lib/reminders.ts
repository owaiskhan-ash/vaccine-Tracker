import { plannedMoments, reminderMoments } from './engine';
import { formatDay, parseISODate, startOfDay, toISODate } from './date';
import type { AppState } from './types';

const SENT_KEY = 'vaccine-routine:sent';

export function notificationsSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function permissionState(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return (await navigator.serviceWorker.ready) ?? null;
  } catch {
    return null;
  }
}

export async function showNotification(title: string, body: string, tag = 'vr-reminder'): Promise<void> {
  const reg = await registration();
  if (!reg) return;
  const options = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag,
    renotify: true,
    data: { url: '/?tab=today' },
  } as NotificationOptions;
  try {
    await reg.showNotification(title, options);
  } catch {
    try {
      new Notification(title, options);
    } catch {
      /* noop */
    }
  }
}

function reminderDateFor(state: AppState, dateISO: string): Date {
  const d = parseISODate(dateISO);
  const [h, m] = state.settings.time.split(':').map(Number);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h || 9, m || 0, 0, 0);
}

function activeChild(state: AppState) {
  return state.children.find((c) => c.id === state.activeId) ?? state.children[0] ?? null;
}

function activeEntries(state: AppState) {
  const child = activeChild(state);
  return child ? state.entries[child.id] ?? [] : [];
}

/** Everything worth reminding about for the active child, soonest first. */
export function upcomingReminders(state: AppState, now = new Date()) {
  return reminderMoments(activeEntries(state), state.settings.leadDays, now);
}

function bodyFor(state: AppState, moment: { date: string; titles: string[] }): string {
  const child = activeChild(state);
  return `${child?.name ?? 'Baby'}: ${moment.titles.join(' · ')} on ${formatDay(parseISODate(moment.date))}.`;
}

/* ---- remembering what has already been shown, so nothing repeats ---- */

function sentToday(): Set<string> {
  try {
    const raw = localStorage.getItem(SENT_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { day?: string; keys?: string[] };
    if (parsed.day !== toISODate(new Date())) return new Set();
    return new Set(parsed.keys ?? []);
  } catch {
    return new Set();
  }
}

function rememberSent(key: string): void {
  try {
    const keys = sentToday();
    keys.add(key);
    localStorage.setItem(SENT_KEY, JSON.stringify({ day: toISODate(new Date()), keys: [...keys] }));
  } catch {
    /* noop */
  }
}

/** True the first time this reminder fires today; false after that. */
function claim(key: string): boolean {
  const keys = sentToday();
  if (keys.has(key)) return false;
  rememberSent(key);
  return true;
}

export async function sendTestNotification(state: AppState): Promise<boolean> {
  if (!(await requestPermission())) return false;
  const child = activeChild(state);
  await showNotification(
    'Vaccine Routine',
    child ? `Reminders are on for ${child.name}. This is what a nudge looks like.` : 'This is what a nudge looks like.',
    'vr-test',
  );
  return true;
}

let timers: number[] = [];

export function clearScheduled(): void {
  for (const t of timers) window.clearTimeout(t);
  timers = [];
}

/**
 * Schedules the next few reminders while the app is alive. Because a web app
 * cannot run a background alarm, it also shows a catch-up nudge when the app is
 * opened after a planned date has arrived.
 */
export async function syncReminders(state: AppState, now = new Date()): Promise<void> {
  clearScheduled();
  if (!state.settings.reminders || !notificationsSupported() || Notification.permission !== 'granted') return;
  const child = activeChild(state);
  if (!child) return;

  const moments = reminderMoments(state.entries[child.id] ?? [], state.settings.leadDays, now);
  const todayKey = toISODate(now);

  for (const moment of moments.slice(0, 8)) {
    const due = parseISODate(moment.date);
    const lead = new Date(due);
    lead.setDate(lead.getDate() - state.settings.leadDays);

    for (const [key, at] of [
      [`upcoming-${moment.date}`, reminderDateFor(state, toISODate(lead))],
      [`due-${moment.date}`, reminderDateFor(state, moment.date)],
    ] as const) {
      const delay = at.getTime() - now.getTime();
      if (delay <= 0 || delay > 14 * 86_400_000) continue;
      timers.push(
        window.setTimeout(() => {
          if (!claim(key)) return;
          void showNotification(
            key.startsWith('due') ? 'Vaccination due today' : 'Vaccination coming up',
            bodyFor(state, moment),
            `vr-${moment.date}`,
          );
        }, delay),
      );
    }

    // A quiet catch-up if the moment has already passed today.
    if (moment.date === todayKey) {
      const at = reminderDateFor(state, moment.date);
      if (at.getTime() < now.getTime() && claim(`today-${moment.date}`)) {
        void showNotification('Due today', bodyFor(state, moment), `vr-${moment.date}`);
      }
    }
  }

  // One catch-up a day for anything already late.
  const late = moments.filter((moment) => moment.date < todayKey);
  if (late.length) {
    const at = reminderDateFor(state, todayKey);
    if (at.getTime() < now.getTime() && claim(`late-${todayKey}`)) {
      const titles = late.flatMap((m) => m.titles).slice(0, 3).join(' · ');
      void showNotification(
        late.length === 1 ? 'One vaccination is waiting' : 'Vaccinations are waiting',
        `${child.name}: ${titles}. Open the app to catch up.`,
        `vr-late-${todayKey}`,
      );
    }
  }
}

/** Next moment a reminder should fire, for the small "queued" line in settings. */
export function nextReminderAt(state: AppState, now = new Date()): Date | null {
  for (const moment of plannedMoments(activeEntries(state))) {
    const due = parseISODate(moment.date);
    const lead = new Date(due);
    lead.setDate(lead.getDate() - state.settings.leadDays);
    for (const at of [reminderDateFor(state, toISODate(lead)), reminderDateFor(state, moment.date)]) {
      if (at.getTime() > now.getTime()) return at;
    }
  }
  return null;
}

export function nextReminderLabel(state: AppState): string | null {
  const next = nextReminderAt(state);
  if (!next) return null;
  const days = Math.round((startOfDay(next).getTime() - startOfDay(new Date()).getTime()) / 86_400_000);
  if (days <= 0) return 'later today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}
