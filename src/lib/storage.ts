import { DOSE_BY_ID } from '../data/schedule';
import { parseISODate, toISODate } from './date';
import type { AccentKey, AppState, ChildProfile, Settings, Sex, VaccineEntry } from './types';

const KEY = 'vaccine-routine:state:v2';
const BACKUP_KEY = 'vaccine-routine:state:v2:backup';
const LEGACY_KEY = 'vaccine-routine:state:v1';
const LEGACY_SENT = 'vaccine-routine:sent';

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
    version: 2,
    children: [],
    activeId: null,
    entries: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseISODate(value);
  return !Number.isNaN(date.getTime()) && toISODate(date) === value;
}

function optText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 500) : undefined;
}

function cleanChild(value: unknown): ChildProfile | null {
  if (!isObject(value)) return null;
  const id = typeof value.id === 'string' ? value.id : '';
  const name = optText(value.name);
  const dob = isISODate(value.dob) ? value.dob : '';
  if (!id || !name || !dob) return null;
  const accent = ACCENT_KEYS.includes(value.accent as AccentKey) ? (value.accent as AccentKey) : 'sand';
  const sex: Sex =
    value.sex === 'girl' || value.sex === 'boy' || value.sex === 'unspecified' ? value.sex : 'unspecified';
  return {
    id,
    name,
    dob,
    sex,
    accent,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
  };
}

function cleanEntry(value: unknown): VaccineEntry | null {
  if (!isObject(value)) return null;
  const name = optText(value.name);
  if (!name || typeof value.id !== 'string' || !value.id) return null;
  // An entry with no date at all cannot be shown or acted on; drop it rather
  // than let it sit invisibly in the record.
  const givenOn = isISODate(value.givenOn) ? value.givenOn : undefined;
  const dueOn = isISODate(value.dueOn) ? value.dueOn : undefined;
  if (!givenOn && !dueOn) return null;
  return {
    id: value.id,
    name,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    ...(optText(value.dose) ? { dose: optText(value.dose) } : {}),
    ...(givenOn ? { givenOn } : {}),
    ...(dueOn ? { dueOn } : {}),
    ...(optText(value.place) ? { place: optText(value.place) } : {}),
    ...(optText(value.note) ? { note: optText(value.note) } : {}),
    ...(optText(value.sourceId) ? { sourceId: optText(value.sourceId) } : {}),
  };
}

function cleanSettings(value: unknown): Settings {
  const raw = isObject(value) ? value : {};
  const time = typeof raw.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.time) ? raw.time : DEFAULT_SETTINGS.time;
  const lead = Number(raw.leadDays);
  return {
    reminders: raw.reminders === true,
    time,
    leadDays: lead === 1 || lead === 3 || lead === 7 ? lead : DEFAULT_SETTINGS.leadDays,
    installDismissed: raw.installDismissed === true,
  };
}

/* ------------------------------------------------------------------ *
 * v1 → v2
 * ------------------------------------------------------------------ */

type LegacyRecord = { at?: string; on?: string; place?: string; note?: string };
type LegacyState = {
  children?: unknown;
  activeId?: unknown;
  records?: Record<string, Record<string, LegacyRecord>>;
  settings?: unknown;
};

/** v1 stored one record per national-schedule dose; turn each into a real entry. */
function migrateLegacy(raw: LegacyState): AppState {
  const children = Array.isArray(raw.children)
    ? raw.children
        .map(cleanChild)
        .filter((c): c is ChildProfile => Boolean(c))
        .filter((c) => !c.id.startsWith('sample-'))
    : [];

  const entries: Record<string, VaccineEntry[]> = {};
  if (isObject(raw.records)) {
    for (const [childId, map] of Object.entries(raw.records)) {
      if (!isObject(map)) continue;
      const list: VaccineEntry[] = [];
      for (const [doseId, rec] of Object.entries(map)) {
        if (!isObject(rec)) continue;
        const dose = DOSE_BY_ID[doseId];
        const givenOn = isISODate(rec.on) ? rec.on : typeof rec.at === 'string' ? toISODate(new Date(rec.at)) : undefined;
        list.push(
          cleanEntry({
            id: `migrated-${childId}-${doseId}`,
            name: dose?.name ?? doseId.replace(/[-_]/g, ' '),
            sourceId: dose ? doseId : undefined,
            givenOn,
            place: rec.place,
            note: rec.note,
            createdAt: typeof rec.at === 'string' ? rec.at : new Date().toISOString(),
          }) as VaccineEntry,
        );
      }
      if (list.length && children.some((c) => c.id === childId)) entries[childId] = list;
    }
  }

  const activeId =
    typeof raw.activeId === 'string' && children.some((c) => c.id === raw.activeId)
      ? raw.activeId
      : children[0]?.id ?? null;

  return {
    version: 2,
    children,
    activeId,
    entries,
    settings: cleanSettings(raw.settings),
  };
}

/* ------------------------------------------------------------------ *
 * Normalising whatever is on disk
 * ------------------------------------------------------------------ */

export function normalizeState(raw: unknown): AppState {
  if (!isObject(raw)) return emptyState();

  // Anything written by the previous version of the app is upgraded once.
  if (raw.version === 1 || (raw.records && !raw.entries)) return migrateLegacy(raw as LegacyState);

  // The old demo baby lived under an id starting with "sample-". Never keep it.
  const children = Array.isArray(raw.children)
    ? raw.children
        .map(cleanChild)
        .filter((c): c is ChildProfile => Boolean(c))
        .filter((c) => !c.id.startsWith('sample-'))
    : [];

  const entries: Record<string, VaccineEntry[]> = {};
  if (isObject(raw.entries)) {
    for (const [childId, list] of Object.entries(raw.entries)) {
      if (!Array.isArray(list)) continue;
      if (!children.some((c) => c.id === childId)) continue;
      const clean = list
        .map(cleanEntry)
        .filter((e): e is VaccineEntry => Boolean(e));
      if (clean.length) entries[childId] = clean;
    }
  }

  const activeId =
    typeof raw.activeId === 'string' && children.some((c) => c.id === raw.activeId)
      ? raw.activeId
      : children[0]?.id ?? null;

  return {
    version: 2,
    children,
    activeId,
    entries,
    settings: cleanSettings(raw.settings),
  };
}

/* ------------------------------------------------------------------ *
 * Reading & writing
 * ------------------------------------------------------------------ */

type ReadResult = { found: boolean; state: AppState | null };

function readSlot(key: string): ReadResult {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return { found: false, state: null };
  }
  if (!raw) return { found: false, state: null };
  try {
    return { found: true, state: normalizeState(JSON.parse(raw)) };
  } catch {
    return { found: true, state: null };
  }
}

/**
 * The primary slot wins even when it is empty: a parent who deleted their only
 * child must not have them resurrected from the spare copy. The backup is only
 * consulted when the primary is missing or unreadable.
 */
export function loadState(): AppState | null {
  const primary = readSlot(KEY);
  if (primary.state) return primary.state;

  const backup = readSlot(BACKUP_KEY);
  if (backup.state) return backup.state;

  // One-time upgrade from the previous version of the app.
  const legacy = readSlot(LEGACY_KEY);
  if (legacy.state) {
    saveState(legacy.state);
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* noop */
    }
    return legacy.state;
  }

  return null;
}

export function saveState(state: AppState): void {
  const json = JSON.stringify(state);
  try {
    // Keep the previous copy in a second slot so an interrupted write can never
    // wipe a family's record.
    const current = localStorage.getItem(KEY);
    if (current && current !== json) localStorage.setItem(BACKUP_KEY, current);
    localStorage.setItem(KEY, json);
  } catch {
    // Storage can be full or blocked; the app keeps working in memory.
  }
}

export function clearState(): void {
  try {
    for (const key of [KEY, BACKUP_KEY, LEGACY_KEY, LEGACY_SENT]) localStorage.removeItem(key);
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

/** Rough size of everything this app has stored, for the settings card. */
export function storedBytes(): number {
  try {
    let total = 0;
    for (const key of [KEY, BACKUP_KEY]) {
      total += (localStorage.getItem(key) ?? '').length * 2;
    }
    return total;
  } catch {
    return 0;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(Math.round(bytes / 1024), 1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Total entries on the phone, across every child. */
export function totalEntries(state: AppState): number {
  return Object.values(state.entries).reduce((sum, list) => sum + list.length, 0);
}
