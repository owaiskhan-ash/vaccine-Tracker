export type Sex = 'girl' | 'boy' | 'unspecified';

export type ChildProfile = {
  id: string;
  name: string;
  /** ISO date, local calendar day (YYYY-MM-DD) */
  dob: string;
  sex: Sex;
  /** accent used for this child across the app */
  accent: AccentKey;
  /** optional: shown in the child card if set */
  bornAt?: string;
  notes?: string;
  createdAt: string;
  archived?: boolean;
};

export type AccentKey = 'sand' | 'sage' | 'clay' | 'mist' | 'lilac' | 'sun';

export type DoseRecord = {
  /** ISO timestamp of when it was marked done */
  at: string;
  /** date the vaccine was actually given (YYYY-MM-DD), defaults to at */
  on?: string;
  place?: string;
  note?: string;
};

export type Settings = {
  reminders: boolean;
  /** HH:MM local time */
  time: string;
  leadDays: number;
  installDismissed?: boolean;
};

export type AppState = {
  version: 1;
  children: ChildProfile[];
  activeId: string | null;
  /** records keyed by childId → doseId → record */
  records: Record<string, Record<string, DoseRecord>>;
  dismissed: string[];
  settings: Settings;
};

export type DoseStatus = 'done' | 'upcoming' | 'due' | 'overdue';

export type DoseView = {
  key: string;
  doseId: string;
  stage: string;
  name: string;
  short: string;
  protects: string;
  route: string;
  detail: string;
  dueDate: Date;
  windowEnd: Date;
  status: DoseStatus;
  record?: DoseRecord;
  daysUntil: number;
};
