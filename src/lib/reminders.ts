import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { plannedMoments, reminderMoments } from './engine';
import { formatDay, parseISODate, startOfDay, toISODate } from './date';
import type { AppState } from './types';

const SENT_KEY = 'vaccine-routine:sent';
const CHANNEL = 'vr-reminders';

/** Inside the Android shell the web Notification API does not exist, so the
 *  same reminders are handed to the phone's own notification scheduler. */
const NATIVE = Capacitor.isNativePlatform();

export function isNativeApp(): boolean {
  return NATIVE;
}

let nativePermission: NotificationPermission = 'default';
let nativeChecked = false;
let channelReady = false;

export function notificationsSupported(): boolean {
  if (NATIVE) return true;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function permissionState(): NotificationPermission | 'unsupported' {
  if (NATIVE) return nativePermission;
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

export async function refreshPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!NATIVE) return permissionState();
  try {
    const status = await LocalNotifications.checkPermissions();
    nativePermission =
      status.display === 'granted' ? 'granted' : status.display === 'denied' ? 'denied' : 'default';
  } catch {
    nativePermission = 'denied';
  }
  nativeChecked = true;
  return nativePermission;
}

export async function requestPermission(): Promise<boolean> {
  if (NATIVE) {
    try {
      const status = await LocalNotifications.requestPermissions();
      nativePermission =
        status.display === 'granted' ? 'granted' : status.display === 'denied' ? 'denied' : 'default';
      nativeChecked = true;
      return nativePermission === 'granted';
    } catch {
      return false;
    }
  }
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

async function ensureChannel(): Promise<void> {
  if (!NATIVE || channelReady) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL,
      name: 'Vaccination reminders',
      description: 'One nudge before each planned date, and one on the day.',
      importance: 4,
      visibility: 1,
      vibration: true,
    });
    channelReady = true;
  } catch {
    /* the default channel still works */
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

let immediateId = 1;

export async function showNotification(title: string, body: string, tag = 'vr-reminder'): Promise<void> {
  if (NATIVE) {
    await ensureChannel();
    if (!nativeChecked) await refreshPermission();
    if (nativePermission !== 'granted') return;
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 900_000_000 + (immediateId++ % 10_000),
            title,
            body,
            channelId: CHANNEL,
            smallIcon: 'ic_stat_vr',
            iconColor: '#E4CBA8',
            schedule: { at: new Date(Date.now() + 800), allowWhileIdle: true },
            extra: { tag },
          },
        ],
      });
    } catch {
      /* never let a missed nudge break the app */
    }
    return;
  }

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

/* ---- native scheduling, handed to the phone ---- */

function momentId(dateISO: string, slot: number): number {
  const digits = Number(dateISO.replace(/-/g, '')) || 1;
  return ((digits % 100_000_000) * 10 + slot) % 2_100_000_000;
}

async function syncNative(state: AppState, now: Date): Promise<void> {
  await ensureChannel();
  if (!nativeChecked) await refreshPermission();

  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }
  } catch {
    /* noop */
  }

  if (!state.settings.reminders || nativePermission !== 'granted') return;
  const child = activeChild(state);
  if (!child) return;

  const horizon = now.getTime() + 120 * 86_400_000;
  const notifications = [];
  for (const moment of plannedMoments(state.entries[child.id] ?? [])) {
    const due = reminderDateFor(state, moment.date);
    const lead = new Date(due);
    lead.setDate(lead.getDate() - state.settings.leadDays);
    const names = `${child.name}: ${moment.titles.join(' · ')}`;
    for (const [slot, at, title] of [
      [0, lead, 'Vaccination coming up'],
      [1, due, 'Vaccination due today'],
    ] as const) {
      const time = at.getTime();
      if (time <= now.getTime() || time > horizon) continue;
      notifications.push({
        id: momentId(moment.date, slot),
        title,
        body: `${names}, ${formatDay(due)}.`,
        channelId: CHANNEL,
        smallIcon: 'ic_stat_vr',
        iconColor: '#E4CBA8',
        schedule: { at, allowWhileIdle: true },
        extra: { date: moment.date },
      });
    }
    if (notifications.length >= 40) break;
  }

  if (notifications.length) {
    try {
      await LocalNotifications.schedule({ notifications });
    } catch {
      /* the dates still live in the app */
    }
  }
}

let nativeTimer: number | null = null;
let nativeState: AppState | null = null;

function queueNative(state: AppState, now: Date): void {
  nativeState = state;
  if (nativeTimer) window.clearTimeout(nativeTimer);
  nativeTimer = window.setTimeout(() => {
    if (nativeState) void syncNative(nativeState, now);
  }, 500);
}

/**
 * Schedules the next few reminders. On the web the app can only keep timers
 * while it is open, plus a catch-up nudge; in the Android shell the dates go
 * to the phone's alarm clock and arrive with the app closed.
 */
export async function syncReminders(state: AppState, now = new Date()): Promise<void> {
  if (NATIVE) {
    queueNative(state, now);
    return;
  }

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
