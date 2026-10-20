import { useCallback, useEffect, useRef, useState } from 'react';
import { AppProvider, useApp } from './lib/store';
import { Onboarding } from './screens/Onboarding';
import { TodayScreen } from './screens/Today';
import { ScheduleScreen } from './screens/Schedule';
import { RemindersScreen } from './screens/Reminders';
import { SettingsScreen } from './screens/Settings';
import { DoseSheet } from './components/DoseSheet';
import { ChildSheet } from './components/ChildSheet';
import { TabBar, type TabKey } from './components/TabBar';
import { syncReminders } from './lib/reminders';
import { IconCheck } from './components/Icon';

type Toast = { id: number; message: string; action?: { label: string; run: () => void } };

const TABS: TabKey[] = ['today', 'schedule', 'nudges', 'you'];

function readTab(): TabKey {
  const hash = window.location.hash.replace('#', '');
  if (TABS.includes(hash as TabKey)) return hash as TabKey;
  const param = new URLSearchParams(window.location.search).get('tab');
  if (param && TABS.includes(param as TabKey)) return param as TabKey;
  return 'today';
}

function Shell() {
  const { state, child } = useApp();
  const [tab, setTab] = useState<TabKey>(readTab);
  const [doseId, setDoseId] = useState<string | null>(null);
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
          onOpenDose={setDoseId}
          onGoNudges={() => go('nudges')}
          onGoSchedule={() => go('schedule')}
          onOpenProfile={() => setChildSheet({ open: true, id: child.id })}
        />
      ) : null}
      {tab === 'schedule' ? <ScheduleScreen onOpenDose={setDoseId} /> : null}
      {tab === 'nudges' ? <RemindersScreen /> : null}
      {tab === 'you' ? (
        <SettingsScreen
          onEditChild={(id) => setChildSheet({ open: true, id })}
          onAddChild={() => setChildSheet({ open: true, id: null })}
          onToast={showToast}
        />
      ) : null}

      <TabBar active={tab} onChange={go} />

      <DoseSheet doseId={doseId} onClose={() => setDoseId(null)} onToast={showToast} />

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
