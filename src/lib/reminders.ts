import { buildDoseViews, reminderPlan } from './engine';
import { formatDay, parseISODate, startOfDay, toISODate } from './date';
import type { AppState } from './types';

const SENT_KEY = 'vaccine-routine:sent';

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
    const result = await Notification.requestPermission();
    return result === 'granted';
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

function reminderDateFor(state: AppState, dateISO: string): Date {
  const d = parseISODate(dateISO);
  const [h, m] = state.settings.time.split(':').map(Number);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h || 9, m || 0, 0, 0);
}

/** The next moment a reminder should fire, if any. */
export function nextReminderAt(state: AppState, now = new Date()): Date | null {
  const child = state.children.find((c) => c.id === state.activeId);
  if (!child) return null;
  const doses = buildDoseViews(child, state.records[child.id], now);
  const plan = reminderPlan(doses, state.settings.leadDays, now);
  for (const item of plan) {
    const due = parseISODate(item.date);
    const lead = new Date(due);
    lead.setDate(lead.getDate() - state.settings.leadDays);
    const leadAt = reminderDateFor(state, toISODate(lead));
    const dueAt = reminderDateFor(state, item.date);
    for (const at of [leadAt, dueAt]) {
      if (at.getTime() > now.getTime()) return at;
    }
  }
  return null;
}

function bodyForDate(state: AppState, item: { date: string; doses: { short: string; name: string }[] }): string {
  const child = state.children.find((c) => c.id === state.activeId);
  const names = item.doses.map((d) => d.short || d.name).join(' · ');
  return `${child?.name ?? 'Baby'} — ${names} on ${formatDay(parseISODate(item.date))}.`;
}

export async function showNotification(title: string, body: string, tag = 'vr-reminder'): Promise<void> {
  const reg = await registration();
  if (!reg) return;
  const options: NotificationOptions = {
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

export async function sendTestNotification(state: AppState): Promise<boolean> {
  if (!(await requestPermission())) return false;
  const child = state.children.find((c) => c.id === state.activeId);
  await showNotification(
    'Vaccine Routine',
    child ? `Reminders are on for ${child.name}. This is what a nudge looks like.` : 'Reminders are on. This is what a nudge looks like.',
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
 * Schedules the next few reminders while the app is alive, and — because a web
 * app cannot run a background alarm — shows a catch-up nudge when the app is
 * opened after a reminder moment was missed.
 */
export async function syncReminders(state: AppState, now = new Date()): Promise<void> {
  clearScheduled();
  if (!state.settings.reminders || !notificationsSupported() || Notification.permission !== 'granted') return;
  const child = state.children.find((c) => c.id === state.activeId);
  if (!child) return;
  const doses = buildDoseViews(child, state.records[child.id], now);
  const plan = reminderPlan(doses, state.settings.leadDays, now);
  const todayKey = toISODate(now);
  for (const item of plan.slice(0, 6)) {
    const due = parseISODate(item.date);
    const lead = new Date(due);
    lead.setDate(lead.getDate() - state.settings.leadDays);
    for (const at of [reminderDateFor(state, toISODate(lead)), reminderDateFor(state, item.date)]) {
      const delay = at.getTime() - now.getTime();
      if (delay <= 0 || delay > 14 * 86_400_000) continue;
      const timer = window.setTimeout(() => {
        if (!claim(`upcoming-${item.date}`)) return;
        void showNotification('Vaccination coming up', bodyForDate(state, item), `vr-${item.date}`);
      }, delay);
      timers.push(timer);
    }
    // A quiet catch-up if the reminder moment has already passed today.
    if (item.date === todayKey) {
      const moment = reminderDateFor(state, item.date);
      if (moment.getTime() < now.getTime() && claim(`today-${item.date}`)) {
        void showNotification('Due today', bodyForDate(state, item), `vr-${item.date}`);
      }
    }
  }
  // Overdue catch-up, once per day at most.
  const overdue = doses.filter((d) => d.status === 'overdue');
  if (overdue.length) {
    const moment = reminderDateFor(state, todayKey);
    if (moment.getTime() < now.getTime() && claim(`overdue-${todayKey}`)) {
      void showNotification(
        overdue.length === 1 ? 'One vaccination is overdue' : `${overdue.length} vaccinations are overdue`,
        `${child.name} has a dose past its window. Open the app to see what is next.`,
        `vr-overdue-${todayKey}`,
      );
    }
  }
}

export function minutesUntilNext(state: AppState): string | null {
  const next = nextReminderAt(state);
  if (!next) return null;
  const days = Math.round((startOfDay(next).getTime() - startOfDay(new Date()).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}
