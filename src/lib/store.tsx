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
import { DOSES } from '../data/schedule';
import { buildDoseViews } from './engine';
import { addDays, toISODate } from './date';
import {
  clearState,
  emptyState,
  loadState,
  normalizeState,
  requestPersistentStorage,
  saveState,
} from './storage';
import type { AppState, ChildProfile, DoseRecord, Settings } from './types';

type Action =
  | { type: 'add-child'; child: ChildProfile }
  | { type: 'update-child'; id: string; patch: Partial<ChildProfile> }
  | { type: 'remove-child'; id: string }
  | { type: 'set-active'; id: string }
  | { type: 'mark-done'; childId: string; doseId: string; record: DoseRecord }
  | { type: 'undo'; childId: string; doseId: string }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'dismiss'; key: string }
  | { type: 'import'; state: AppState }
  | { type: 'reset' };

function markDone(state: AppState, childId: string, doseId: string, record: DoseRecord): AppState {
  return {
    ...state,
    records: {
      ...state.records,
      [childId]: { ...(state.records[childId] ?? {}), [doseId]: record },
    },
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'add-child': {
      const children = [...state.children, action.child];
      return { ...state, children, activeId: action.child.id };
    }
    case 'update-child':
      return {
        ...state,
        children: state.children.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)),
      };
    case 'remove-child': {
      const children = state.children.filter((c) => c.id !== action.id);
      const records = { ...state.records };
      delete records[action.id];
      return {
        ...state,
        children,
        records,
        activeId: state.activeId === action.id ? children[0]?.id ?? null : state.activeId,
      };
    }
    case 'set-active':
      return { ...state, activeId: action.id };
    case 'mark-done':
      return markDone(state, action.childId, action.doseId, action.record);
    case 'undo': {
      const childRecords = { ...(state.records[action.childId] ?? {}) };
      delete childRecords[action.doseId];
      return { ...state, records: { ...state.records, [action.childId]: childRecords } };
    }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'dismiss':
      return state.dismissed.includes(action.key)
        ? state
        : { ...state, dismissed: [...state.dismissed, action.key] };
    case 'import':
      return action.state;
    case 'reset':
      return emptyState();
    default:
      return state;
  }
}

function initialState(): AppState {
  return loadState() ?? emptyState();
}

type AppContextValue = {
  state: AppState;
  child: ChildProfile | null;
  dispatch: React.Dispatch<Action>;
  addChild: (input: Omit<ChildProfile, 'id' | 'createdAt'>) => ChildProfile;
  updateChild: (id: string, patch: Partial<ChildProfile>) => void;
  removeChild: (id: string) => void;
  setActive: (id: string) => void;
  markDoseDone: (doseId: string, record?: Partial<DoseRecord>) => void;
  undoDose: (doseId: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  dismiss: (key: string) => void;
  importState: (state: AppState) => void;
  resetAll: () => void;
  samples: AppState | null;
  seedSample: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [, forceSave] = useState(0);

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

  const addChild = useCallback((input: Omit<ChildProfile, 'id' | 'createdAt'>) => {
    const child: ChildProfile = { ...input, id: uid(), createdAt: new Date().toISOString() };
    dispatch({ type: 'add-child', child });
    return child;
  }, []);

  const value = useMemo<AppContextValue>(() => {
    const child = state.children.find((c) => c.id === state.activeId) ?? state.children[0] ?? null;
    return {
      state,
      child,
      dispatch,
      addChild,
      updateChild: (id, patch) => dispatch({ type: 'update-child', id, patch }),
      removeChild: (id) => dispatch({ type: 'remove-child', id }),
      setActive: (id) => dispatch({ type: 'set-active', id }),
      markDoseDone: (doseId, record = {}) => {
        if (!child) return;
        const now = new Date();
        dispatch({
          type: 'mark-done',
          childId: child.id,
          doseId,
          record: { at: now.toISOString(), on: record.on ?? toISODate(now), ...record },
        });
      },
      undoDose: (doseId) => {
        if (!child) return;
        dispatch({ type: 'undo', childId: child.id, doseId });
      },
      setSettings: (patch) => dispatch({ type: 'settings', patch }),
      dismiss: (key) => dispatch({ type: 'dismiss', key }),
      importState: (next) => dispatch({ type: 'import', state: next }),
      resetAll: () => {
        clearState();
        dispatch({ type: 'reset' });
      },
      samples: null,
      seedSample: () => {
        const sample = buildSample();
        dispatch({ type: 'import', state: sample });
        forceSave((n) => n + 1);
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

/** Doses for the active child, recalculated when anything relevant changes. */
export function useDoses() {
  const { state, child } = useApp();
  return useMemo(() => {
    if (!child) return [];
    return buildDoseViews(child, state.records[child.id]);
  }, [child, state.records]);
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

export function buildSample(): AppState {
  const dob = addDays(new Date(), -5 * 30 - 12);
  const id = 'sample-aarav';
  const state = normalizeState({
    version: 1,
    children: [
      {
        id,
        name: 'Aarav',
        dob: toISODate(dob),
        sex: 'boy',
        accent: 'sun',
        jeEnabled: false,
        createdAt: new Date().toISOString(),
      },
    ],
    activeId: id,
    records: {},
    dismissed: [],
    settings: { reminders: false, time: '09:00', leadDays: 3 },
  });
  const child = state.children[0];
  const records: Record<string, DoseRecord> = {};
  for (const dose of DOSES) {
    if (dose.optional) continue;
    const view = buildDoseViews(child, {}, new Date()).find((d) => d.doseId === dose.id);
    if (!view) continue;
    if (view.dueDate.getTime() < addDays(new Date(), -7).getTime()) {
      records[dose.id] = { at: view.dueDate.toISOString(), on: toISODate(view.dueDate) };
    }
  }
  return { ...state, records: { [id]: records } };
}
