import { useCallback, useEffect, useRef, useState } from 'react';
import { AppProvider, useApp } from './lib/store';
import { Onboarding } from './screens/Onboarding';
import { TodayScreen } from './screens/Today';
import { ScheduleScreen } from './screens/Schedule';
import { RemindersScreen } from './screens/Reminders';
import { SettingsScreen } from './screens/Settings';
import { EntrySheet } from './components/EntrySheet';
import { SuggestSheet } from './components/SuggestSheet';
import { ChildSheet } from './components/ChildSheet';
import { ChildSwitcher } from './components/ChildSwitcher';
import { TabBar, type TabKey } from './components/TabBar';
import { syncReminders } from './lib/reminders';
import { IconCheck } from './components/Icon';
import type { EntryPrefill } from './lib/types';

type Toast = { id: number; message: string; action?: { label: string; run: () => void } };

const TABS: TabKey[] = ['today', 'schedule', 'nudges', 'you'];

function readTab(): TabKey {
  const hash = window.location.hash.replace('#', '');
  if (TABS.includes(hash as TabKey)) return hash as TabKey;
  const param = new URLSearchParams(window.location.search).get('tab');
  if (param && TABS.includes(param as TabKey)) return param as TabKey;
  return 'today';
}

type EntrySheetState = { open: boolean; entryId: string | null; prefill: EntryPrefill | null };

const CLOSED_ENTRY: EntrySheetState = { open: false, entryId: null, prefill: null };

function Shell() {
  const { state, child } = useApp();
  const [tab, setTab] = useState<TabKey>(readTab);
  const [entrySheet, setEntrySheet] = useState<EntrySheetState>(CLOSED_ENTRY);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [childSheet, setChildSheet] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((message: string, action?: Toast['action']) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, action });
    toastTimer.current = window.setTimeout(() => setToast(null), 5200);
  }, []);

  const go = useCallback((next: TabKey) => {
    setTab(next);
    window.location.hash = next === 'today' ? '' : next;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openNewEntry = useCallback(() => {
    setEntrySheet({ open: true, entryId: null, prefill: null });
  }, []);

  const openEntry = useCallback((id: string) => {
    setEntrySheet({ open: true, entryId: id, prefill: null });
  }, []);

  const openPrefilled = useCallback((prefill: EntryPrefill) => {
    setSuggestOpen(false);
    setEntrySheet({ open: true, entryId: null, prefill });
  }, []);

  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const openSettings = () => go('you');
    const openToday = () => go('today');
    window.addEventListener('vr:open-settings', openSettings);
    window.addEventListener('vr:open-today', openToday);
    return () => {
      window.removeEventListener('vr:open-settings', openSettings);
      window.removeEventListener('vr:open-today', openToday);
    };
  }, [go]);

  // keep scheduled nudges in sync with any change
  useEffect(() => {
    if (!state.settings.reminders) return;
    void syncReminders(state);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncReminders(state);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [state]);

  if (!child) {
    return (
      <div className="shell">
        <Onboarding />
      </div>
    );
  }

  return (
    <div className="shell">
      {tab === 'today' ? (
        <TodayScreen
          onAddEntry={openNewEntry}
          onOpenEntry={openEntry}
          onOpenSuggestions={() => setSuggestOpen(true)}
          onPickSuggestion={openPrefilled}
          onGoNudges={() => go('nudges')}
          onGoSchedule={() => go('schedule')}
          onSwitchChild={() => setSwitchOpen(true)}
        />
      ) : null}
      {tab === 'schedule' ? (
        <ScheduleScreen
          onAddEntry={openNewEntry}
          onOpenEntry={openEntry}
          onOpenSuggestions={() => setSuggestOpen(true)}
        />
      ) : null}
      {tab === 'nudges' ? <RemindersScreen onAddEntry={openNewEntry} /> : null}
      {tab === 'you' ? (
        <SettingsScreen
          onEditChild={(id) => setChildSheet({ open: true, id })}
          onAddChild={() => setChildSheet({ open: true, id: null })}
          onToast={showToast}
        />
      ) : null}

      <TabBar active={tab} onChange={go} />

      <EntrySheet
        open={entrySheet.open}
        entryId={entrySheet.entryId}
        prefill={entrySheet.prefill}
        onClose={() => setEntrySheet(CLOSED_ENTRY)}
        onToast={showToast}
      />

      <SuggestSheet open={suggestOpen} onClose={() => setSuggestOpen(false)} onPick={openPrefilled} />

      <ChildSwitcher
        open={switchOpen}
        onClose={() => setSwitchOpen(false)}
        onAddChild={() => setChildSheet({ open: true, id: null })}
        onToast={showToast}
      />

      <ChildSheet
        open={childSheet.open}
        childId={childSheet.id}
        onClose={() => setChildSheet((s) => ({ ...s, open: false }))}
        onSaved={(name) => showToast(childSheet.id ? 'Profile updated' : `${name} added`)}
      />

      {toast ? (
        <div className="toast" role="status" key={toast.id}>
          <span className="toast-check">
            <IconCheck size={14} />
          </span>
          <span className="toast-text">{toast.message}</span>
          {toast.action ? (
            <button
              className="toast-action"
              onClick={() => {
                toast.action?.run();
                setToast(null);
              }}
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
