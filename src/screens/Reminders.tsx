import { useMemo, useState } from 'react';
import { calendarMoments, plannedMoments } from '../lib/engine';
import { formatDayMonth, formatTime, parseISODate, toISODate } from '../lib/date';
import { useApp, useNow } from '../lib/store';
import {
  nextReminderLabel,
  notificationsSupported,
  permissionState,
  requestPermission,
  sendTestNotification,
} from '../lib/reminders';
import { ACCENTS } from '../lib/storage';
import { downloadCalendar } from '../lib/calendar';
import { IconBell, IconCalendar, IconCheck, IconClock, IconInfo, IconPlus, IconShield } from '../components/Icon';

const LEADS = [
  { days: 1, label: '1 day' },
  { days: 3, label: '3 days' },
  { days: 7, label: '1 week' },
];

function gapLabel(dateISO: string, now: Date): string {
  const day = parseISODate(dateISO);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 0) return `in ${days} days`;
  if (days === -1) return 'yesterday';
  return `${Math.abs(days)} days late`;
}

export function RemindersScreen({ onAddEntry }: { onAddEntry: () => void }) {
  const { state, child, entries, setSettings } = useApp();
  const now = useNow(60_000);
  const todayKey = toISODate(now);
  const [permission, setPermission] = useState(() => permissionState());
  const [tested, setTested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [added, setAdded] = useState(0);

  const planned = useMemo(() => plannedMoments(entries), [entries]);
  const future = useMemo(
    () => calendarMoments(entries, new Date(`${todayKey}T12:00:00`)),
    [entries, todayKey],
  );

  if (!child) return null;
  const accent = ACCENTS[child.accent] ?? ACCENTS.sand;
  const supported = notificationsSupported();
  const on = state.settings.reminders;
  const nextLabel = nextReminderLabel(state);

  async function toggle(next: boolean) {
    if (!next) {
      setSettings({ reminders: false });
      setTried(false);
      return;
    }
    setBusy(true);
    setTried(true);
    const granted = await requestPermission();
    setPermission(permissionState());
    setSettings({ reminders: granted });
    setBusy(false);
  }

  async function test() {
    setBusy(true);
    const ok = await sendTestNotification(state);
    setPermission(permissionState());
    setTested(ok);
    setBusy(false);
  }

  return (
    <main
      className="screen reminders"
      style={{
        ['--accent' as string]: accent.tint,
        ['--accent-deep' as string]: accent.ring,
        ['--accent-soft' as string]: accent.soft,
      }}
    >
      <header className="screen-head">
        <p className="eyebrow">Reminders</p>
        <h1 className="display">
          A quiet
          <br />
          <em>nudge.</em>
        </h1>
        <p className="lede">
          One reminder before each date you have planned, and one on the day. Nothing else, and nothing
          leaves the phone.
        </p>
      </header>

      <section className={`rem-card card${on ? ' on' : ''}`}>
        <div className="rem-head">
          <span className={`rem-badge${on ? ' on' : ''}`}>
            <IconBell size={20} />
          </span>
          <div className="rem-copy">
            <span className="rem-title">Reminders for {child.name}</span>
            <span className="rem-sub">
              {on
                ? nextLabel
                  ? `Next nudge ${nextLabel} · ${formatTime(state.settings.time)}`
                  : planned.length
                    ? `On at ${formatTime(state.settings.time)} — the next planned date is further out`
                    : `On at ${formatTime(state.settings.time)} — add a planned date to hear one`
                : 'Currently switched off'}
            </span>
          </div>
          <button
            className="switch"
            role="switch"
            aria-checked={on}
            aria-label="Reminders"
            disabled={busy}
            onClick={() => void toggle(!on)}
          />
        </div>

        <div className={`rem-controls${on ? '' : ' dim'}`}>
          <label className="rem-time">
            <span className="eyebrow">Time of day</span>
            <span className="time-field">
              <IconClock size={16} />
              <input
                type="time"
                value={state.settings.time}
                onChange={(e) => setSettings({ time: e.target.value || '09:00' })}
                disabled={!on}
                aria-label="Reminder time"
              />
            </span>
          </label>

          <div className="rem-lead">
            <span className="eyebrow">Lead time</span>
            <div className="chips">
              {LEADS.map((lead) => (
                <button
                  key={lead.days}
                  className={`chip${state.settings.leadDays === lead.days ? ' on' : ''}`}
                  onClick={() => setSettings({ leadDays: lead.days })}
                  disabled={!on}
                  aria-pressed={state.settings.leadDays === lead.days}
                >
                  {lead.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {on ? (
          <div className="rem-actions">
            {permission !== 'granted' ? (
              <button className="btn primary sm wide" onClick={() => void toggle(true)} disabled={busy}>
                Allow notifications
              </button>
            ) : (
              <button className="btn ghost sm wide" onClick={() => void test()} disabled={busy}>
                {tested ? (
                  <>
                    <IconCheck size={15} /> Sent — check your screen
                  </>
                ) : (
                  'Send a test reminder'
                )}
              </button>
            )}
          </div>
        ) : null}

        {permission === 'denied' && tried ? (
          <p className="rem-warn">
            Notifications are blocked for this site. You can re-enable them in your browser’s site
            settings — every planned date still shows inside the app.
          </p>
        ) : permission === 'default' && on ? (
          <p className="rem-warn">One more step: allow notifications above so the nudge can reach you.</p>
        ) : null}
        {!supported ? (
          <p className="rem-warn">
            This browser doesn’t support notifications. Everything else works exactly the same, and the
            list below always shows what is planned.
          </p>
        ) : null}
      </section>

      <section className="timeline">
        <div className="between">
          <span className="eyebrow">Planned dates</span>
          <span className="tiny">
            {planned.length
              ? `${planned.length} date${planned.length === 1 ? '' : 's'}`
              : 'nothing planned'}
          </span>
        </div>
        <ol className="timeline-list">
          {planned.map((moment) => {
            const late = moment.date < todayKey;
            return (
              <li key={moment.date} className="timeline-item">
                <span className="timeline-dot" aria-hidden="true" />
                <div className="timeline-body">
                  <span className="timeline-date">
                    {formatDayMonth(parseISODate(moment.date))}
                    <span className={`timeline-rel${late ? ' now' : ''}`}>
                      {gapLabel(moment.date, now)}
                    </span>
                  </span>
                  <span className="timeline-names">{moment.titles.join(' · ')}</span>
                </div>
              </li>
            );
          })}
          {planned.length === 0 ? (
            <li className="timeline-empty">
              <span>No dates planned yet. Add a vaccination with a date and it will show up here.</span>
            </li>
          ) : null}
        </ol>
        {planned.length === 0 ? (
          <button className="btn ghost sm wide timeline-add" onClick={onAddEntry}>
            <IconPlus size={15} /> Plan a vaccination
          </button>
        ) : null}
      </section>

      {future.length ? (
        <button
          className="cal-row"
          onClick={() => {
            const count = downloadCalendar(child, future, state.settings.time);
            setAdded(count);
            window.setTimeout(() => setAdded(0), 6000);
          }}
        >
          <span className="cal-icon">
            <IconCalendar size={18} />
          </span>
          <span className="cal-copy">
            <strong>
              {added
                ? `${added} visit${added === 1 ? '' : 's'} added to your calendar`
                : 'Add planned visits to your calendar'}
            </strong>
            <span>
              {added
                ? 'Open the downloaded file to finish — reminders then arrive even when this app is closed.'
                : 'Downloads a calendar file made on this phone, with a reminder the day before.'}
            </span>
          </span>
        </button>
      ) : null}

      <div className="note-card">
        <IconInfo size={16} />
        <p>
          This app has no server and no account. Reminders are scheduled by your phone, so they arrive
          while the app is open — and a catch-up nudge greets you the next time you open it. Add the app
          to your home screen to keep it one tap away.
        </p>
      </div>

      <div className="privacy-line">
        <IconShield size={14} />
        <span>No data leaves this phone. Ever.</span>
      </div>
    </main>
  );
}
