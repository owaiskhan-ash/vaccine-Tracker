import { useMemo, useState } from 'react';
import { reminderPlan, upcomingVisits } from '../lib/engine';
import { formatDayMonth, formatTime, parseISODate, relativeToToday } from '../lib/date';
import { useApp, useDoses } from '../lib/store';
import {
  notificationsSupported,
  permissionState,
  requestPermission,
  sendTestNotification,
} from '../lib/reminders';
import { ACCENTS } from '../lib/storage';
import { downloadCalendar } from '../lib/calendar';
import { IconBell, IconCalendar, IconCheck, IconClock, IconInfo, IconShield } from '../components/Icon';

const LEADS = [
  { days: 1, label: '1 day' },
  { days: 3, label: '3 days' },
  { days: 7, label: '1 week' },
];

export function RemindersScreen() {
  const { state, child, setSettings } = useApp();
  const doses = useDoses();
  const now = useMemo(() => new Date(), []);
  const [permission, setPermission] = useState(() => permissionState());
  const [tested, setTested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [added, setAdded] = useState(0);

  if (!child) return null;
  const accent = ACCENTS[child.accent] ?? ACCENTS.sand;
  const plan = reminderPlan(doses, state.settings.leadDays, now);
  const supported = notificationsSupported();
  const on = state.settings.reminders;

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
          One reminder before each visit, and one on the day. No streaks, no guilt, no noise.
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
              {on ? `Arrive at ${formatTime(state.settings.time)}` : 'Currently switched off'}
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
            settings — the app will still show every due dose inside the app.
          </p>
        ) : permission === 'default' && on ? (
          <p className="rem-warn">
            One more step: allow notifications above so the nudge can reach you.
          </p>
        ) : null}
        {!supported ? (
          <p className="rem-warn">
            This browser doesn’t support notifications. Everything else works exactly the same, and the
            in-app timeline below always shows what is coming.
          </p>
        ) : null}
      </section>

      <section className="timeline">
        <div className="between">
          <span className="eyebrow">What’s coming</span>
          <span className="tiny">
            {plan.length ? `${plan.length} reminder${plan.length === 1 ? '' : 's'} queued` : 'next visits'}
          </span>
        </div>
        <ol className="timeline-list">
          {(plan.length ? plan : upcomingVisits(doses)).map((item) => {
            const days = Math.round(
              (parseISODate(item.date).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
                86400000,
            );
            return (
              <li key={item.date} className="timeline-item">
                <span className="timeline-dot" aria-hidden="true" />
                <div className="timeline-body">
                  <span className="timeline-date">
                    {formatDayMonth(parseISODate(item.date))}
                    <span className={`timeline-rel${days < 0 ? ' now' : ''}`}>
                      {days < 0 ? 'due now' : relativeToToday(days, '')}
                    </span>
                  </span>
                  <span className="timeline-names">
                    {item.doses.map((d) => d.short).join(' · ')}
                  </span>
                </div>
              </li>
            );
          })}
          {plan.length === 0 && upcomingVisits(doses).length === 0 ? (
            <li className="timeline-empty">
              <IconCheck size={16} /> Every dose is recorded.
            </li>
          ) : null}
        </ol>
      </section>

      <button
        className="cal-row"
        onClick={() => {
          const count = downloadCalendar(child, doses, state.settings.time);
          setAdded(count);
          window.setTimeout(() => setAdded(0), 6000);
        }}
      >
        <span className="cal-icon">
          <IconCalendar size={18} />
        </span>
        <span className="cal-copy">
          <strong>{added ? `${added} visit${added === 1 ? '' : 's'} added to your calendar` : 'Add visits to your calendar'}</strong>
          <span>
            {added
              ? 'Open the downloaded file to finish — reminders then arrive even when this app is closed.'
              : 'Downloads a calendar file with a reminder the day before each visit.'}
          </span>
        </span>
      </button>

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
