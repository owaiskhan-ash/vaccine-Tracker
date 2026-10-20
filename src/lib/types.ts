export type Sex = 'girl' | 'boy' | 'unspecified';

export type AccentKey = 'sand' | 'sage' | 'clay' | 'mist' | 'lilac' | 'sun';

export type ChildProfile = {
  id: string;
  name: string;
  /** ISO date, local calendar day (YYYY-MM-DD) */
  dob: string;
  sex: Sex;
  /** accent used for this child across the app */
  accent: AccentKey;
  createdAt: string;
};

/**
 * A parent's own record. Everything here is typed in by them — the app ships
 * with no vaccines pre-filled. A dose is either already given (`givenOn`) or
 * planned for a date (`dueOn`).
 */
export type VaccineEntry = {
  id: string;
  name: string;
  /** optional label, e.g. "Dose 2" or a batch number */
  dose?: string;
  /** YYYY-MM-DD — set when the vaccine has been given */
  givenOn?: string;
  /** YYYY-MM-DD — set when it is planned */
  dueOn?: string;
  place?: string;
  note?: string;
  /** the national-schedule dose this entry answers, so it stops being suggested */
  sourceId?: string;
  createdAt: string;
};

export type EntryStatus = 'given' | 'due' | 'overdue' | 'upcoming';

export type EntryMode = 'given' | 'planned';

/** Everything needed to open the entry sheet with a suggestion already filled in. */
export type EntryPrefill = {
  name: string;
  dose?: string;
  sourceId?: string;
  mode: EntryMode;
  /** YYYY-MM-DD */
  date: string;
};

export type Settings = {
  reminders: boolean;
  /** HH:MM local time */
  time: string;
  leadDays: number;
  installDismissed?: boolean;
};

export type AppState = {
  version: 2;
  children: ChildProfile[];
  activeId: string | null;
  /** entries keyed by childId */
  entries: Record<string, VaccineEntry[]>;
  settings: Settings;
};
