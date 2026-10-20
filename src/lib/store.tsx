import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import { toISODate } from './date';
import {
  clearState,
  emptyState,
  loadState,
  requestPersistentStorage,
  saveState,
} from './storage';
import type { AppState, ChildProfile, Settings, VaccineEntry } from './types';

export type NewChild = Omit<ChildProfile, 'id' | 'createdAt'>;
export type NewEntry = Omit<VaccineEntry, 'id' | 'createdAt'>;

type Action =
  | { type: 'add-child'; child: ChildProfile }
  | { type: 'update-child'; id: string; patch: Partial<ChildProfile> }
  | { type: 'remove-child'; id: string }
  | { type: 'set-active'; id: string }
  | { type: 'add-entry'; childId: string; entry: VaccineEntry }
  | { type: 'update-entry'; childId: string; entryId: string; patch: Partial<VaccineEntry> }
  | { type: 'remove-entry'; childId: string; entryId: string }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'reset' };

function withEntries(state: AppState, childId: string, list: VaccineEntry[]): AppState {
  return { ...state, entries: { ...state.entries, [childId]: list } };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'add-child': {
      const children = [...state.children, action.child];
      return {
        ...state,
        children,
        activeId: action.child.id,
        entries: { ...state.entries, [action.child.id]: [] },
      };
    }
    case 'update-child':
      return {
        ...state,
        children: state.children.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)),
      };
    case 'remove-child': {
      const children = state.children.filter((c) => c.id !== action.id);
      const entries = { ...state.entries };
      delete entries[action.id];
      return {
        ...state,
        children,
        entries,
        activeId: state.activeId === action.id ? children[0]?.id ?? null : state.activeId,
      };
    }
    case 'set-active':
      return { ...state, activeId: action.id };
    case 'add-entry': {
      const list = state.entries[action.childId] ?? [];
      return withEntries(state, action.childId, [action.entry, ...list]);
    }
    case 'update-entry': {
      const list = state.entries[action.childId] ?? [];
      return withEntries(
        state,
        action.childId,
        list.map((entry) => (entry.id === action.entryId ? { ...entry, ...action.patch } : entry)),
      );
    }
    case 'remove-entry': {
      const list = state.entries[action.childId] ?? [];
      return withEntries(
        state,
        action.childId,
        list.filter((entry) => entry.id !== action.entryId),
      );
    }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'reset':
      return emptyState();
    default:
      return state;
  }
}

function initialState(): AppState {
  return loadState() ?? emptyState();
}

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

type AppContextValue = {
  state: AppState;
  child: ChildProfile | null;
  children: ChildProfile[];
  entries: VaccineEntry[];
  addChild: (input: NewChild) => ChildProfile;
  updateChild: (id: string, patch: Partial<ChildProfile>) => void;
  removeChild: (id: string) => void;
  setActive: (id: string) => void;
  addEntry: (input: NewEntry) => VaccineEntry | null;
  updateEntry: (id: string, patch: Partial<NewEntry>) => void;
  removeEntry: (id: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    void requestPersistentStorage();
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if ((event.data as { type?: string })?.type === 'notification-click') {
          window.dispatchEvent(new CustomEvent('vr:open-today'));
        }
      });
    }
  }, []);

  const addChild = useCallback((input: NewChild) => {
    const child: ChildProfile = { ...input, id: uid(), createdAt: new Date().toISOString() };
    dispatch({ type: 'add-child', child });
    return child;
  }, []);

  const value = useMemo<AppContextValue>(() => {
    const child = state.children.find((c) => c.id === state.activeId) ?? state.children[0] ?? null;
    const entries = child ? state.entries[child.id] ?? [] : [];

    return {
      state,
      child,
      children: state.children,
      entries,
      addChild,
      updateChild: (id, patch) => dispatch({ type: 'update-child', id, patch }),
      removeChild: (id) => dispatch({ type: 'remove-child', id }),
      setActive: (id) => dispatch({ type: 'set-active', id }),
      addEntry: (input) => {
        if (!child) return null;
        const now = new Date();
        const entry: VaccineEntry = {
          ...input,
          id: uid(),
          createdAt: now.toISOString(),
        };
        if (!entry.givenOn && !entry.dueOn) entry.dueOn = toISODate(now);
        dispatch({ type: 'add-entry', childId: child.id, entry });
        return entry;
      },
      updateEntry: (id, patch) => {
        if (!child) return;
        dispatch({ type: 'update-entry', childId: child.id, entryId: id, patch });
      },
      removeEntry: (id) => {
        if (!child) return;
        dispatch({ type: 'remove-entry', childId: child.id, entryId: id });
      },
      setSettings: (patch) => dispatch({ type: 'settings', patch }),
      resetAll: () => {
        clearState();
        dispatch({ type: 'reset' });
      },
    };
  }, [state, addChild]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

/** A ticking clock so "today" stays fresh without a reload. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(new Date());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
  return now;
}

/** Today as a stable key, so memos refresh at midnight. */
export function useTodayKey(): string {
  return toISODate(useNow(60_000));
}
