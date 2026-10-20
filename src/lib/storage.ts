import type { AccentKey, AppState, ChildProfile, Settings } from './types';

const KEY = 'vaccine-routine:state:v1';
const BACKUP_KEY = 'vaccine-routine:state:v1:backup';
const NOTIFIED_KEY = 'vaccine-routine:notified';

export const ACCENTS: Record<AccentKey, { label: string; tint: string; ring: string; soft: string }> = {
  sand: { label: 'Sand', tint: '#D9C3A5', ring: '#8C7457', soft: '#2A241C' },
  sage: { label: 'Sage', tint: '#B7C6AE', ring: '#6F8265', soft: '#20241D' },
  clay: { label: 'Clay', tint: '#D7A38E', ring: '#8C5B44', soft: '#2B211C' },
  mist: { label: 'Mist', tint: '#AFC0CB', ring: '#61798A', soft: '#1D2327' },
  lilac: { label: 'Lilac', tint: '#C4B8D2', ring: '#76688A', soft: '#242028' },
  sun: { label: 'Sun', tint: '#E0C68A', ring: '#8F7638', soft: '#2A2519' },
};

export const ACCENT_KEYS = Object.keys(ACCENTS) as AccentKey[];

export const DEFAULT_SETTINGS: Settings = {
  reminders: false,
  time: '09:00',
  leadDays: 3,
  installDismissed: false,
};

export function emptyState(): AppState {
  return {
    version: 1,
    children: [],
    activeId: null,
    records: {},
    dismissed: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

function isChild(value: unknown): value is ChildProfile {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return typeof c.id === 'string' && typeof c.name === 'string' && typeof c.dob === 'string';
}

/** Merge whatever is on disk with defaults, dropping anything malformed. */
export function normalizeState(raw: unknown): AppState {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Partial<AppState>;
  const children = Array.isArray(data.children) ? data.children.filter(isChild) : [];
  const records: AppState['records'] = {};
  if (data.records && typeof data.records === 'object') {
    for (const [childId, doseMap] of Object.entries(data.records)) {
      if (!doseMap || typeof doseMap !== 'object') continue;
      const clean: Record<string, { at: string; on?: string; place?: string; note?: string }> = {};
      for (const [doseId, rec] of Object.entries(doseMap)) {
        if (rec && typeof rec === 'object' && typeof (rec as { at?: unknown }).at === 'string') {
          clean[doseId] = rec as { at: string };
        }
      }
      records[childId] = clean;
    }
  }
  const activeId =
    typeof data.activeId === 'string' && children.some((c) => c.id === data.activeId)
      ? data.activeId
      : children.find((c) => !c.archived)?.id ?? null;
  return {
    version: 1,
    children,
    activeId,
    records,
    dismissed: Array.isArray(data.dismissed) ? data.dismissed.filter((d): d is string => typeof d === 'string') : [],
    settings: {
      ...DEFAULT_SETTINGS,
      ...(data.settings && typeof data.settings === 'object' ? data.settings : {}),
    },
  };
}

export function loadState(): AppState | null {
  for (const key of [KEY, BACKUP_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = normalizeState(JSON.parse(raw));
      if (parsed.children.length) return parsed;
    } catch {
      // fall through to the backup copy
    }
  }
  return null;
}

export function saveState(state: AppState): void {
  const json = JSON.stringify(state);
  try {
    // Keep yesterday's copy in a second slot so a corrupt write can never
    // wipe a family's vaccination record.
    const current = localStorage.getItem(KEY);
    if (current && current !== json) localStorage.setItem(BACKUP_KEY, current);
    localStorage.setItem(KEY, json);
  } catch {
    // Storage can be full or blocked; the app keeps working in memory.
  }
}

export function hasStoredState(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(BACKUP_KEY);
    localStorage.removeItem(NOTIFIED_KEY);
  } catch {
    /* noop */
  }
}

export function exportState(state: AppState): string {
  return JSON.stringify({ app: 'vaccine-routine', exportedAt: new Date().toISOString(), state }, null, 2);
}

export function importState(text: string): AppState {
  const parsed = JSON.parse(text) as unknown;
  const candidate =
    parsed && typeof parsed === 'object' && 'state' in parsed
      ? (parsed as { state: unknown }).state
      : parsed;
  const state = normalizeState(candidate);
  if (!state.children.length) throw new Error('No children found in this backup.');
  return state;
}

export function wasNotifiedToday(dateKey: string): boolean {
  try {
    return localStorage.getItem(NOTIFIED_KEY) === dateKey;
  } catch {
    return false;
  }
}

export function markNotifiedToday(dateKey: string): void {
  try {
    localStorage.setItem(NOTIFIED_KEY, dateKey);
  } catch {
    /* noop */
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* noop */
  }
  return false;
}
