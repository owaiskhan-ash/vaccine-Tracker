import { useMemo } from 'react';
import { CARE_TIPS, ageLabel, entryStatus, splitEntries, suggestionPrefill, suggestionsFor } from '../lib/engine';
import { formatDay, formatDayMonth, formatLongDay, greeting, humanGap, parseISODate, toISODate } from '../lib/date';
import { useApp, useNow } from '../lib/store';
import { ACCENTS } from '../lib/storage';
import { useInstall } from '../lib/install';
import { EntryRow, SectionHead, SuggestionRow } from '../components/Bits';
import { IconBell, IconChevron, IconClock, IconClose, IconPlus, IconSparkle } from '../components/Icon';
import type { EntryPrefill } from '../lib/types';

type Props = {
  onAddEntry: () => void;
  onOpenEntry: (id: string) => void;
  onOpenSuggestions: () => void;
  onPickSuggestion: (prefill: EntryPrefill) => void;
  onGoNudges: () => void;
  onGoSchedule: () => void;
  onOpenProfile: () => void;
};

function weekdayLong(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(date);
}

export function TodayScreen({
  onAddEntry,
  onOpenEntry,
  onOpenSuggestions,
  onPickSuggestion,
  onGoNudges,
  onGoSchedule,
  onOpenProfile,
}: Props) {
  const { state, child, entries, setSettings } = useApp();
  const install = useInstall();
  const now = useNow(60_000);
  const todayKey = toISODate(now);

  const suggestions = useMemo(
    () => (child ? suggestionsFor(child, entries, new Date(`${todayKey}T12:00:00`)) : []),
    [child, entries, todayKey],
  );

  if (!child) return null;

  const accent = ACCENTS[child.accent] ?? ACCENTS.sand;
  const initial = child.name.trim().slice(0, 1).toUpperCase() || 'B';
  const dob = parseISODate(child.dob);
  const { planned, given } = splitEntries(entries);
  const overdue = planned.filter((entry) => entryStatus(entry, now) === 'overdue');
  const ahead = planned.filter((entry) => entryStatus(entry, now) !== 'overdue');
  const next = ahead[0];
  const sameDay = next ? ahead.filter((entry) => entry.dueOn === next.dueOn) : [];
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextDays = next?.dueOn
    ? Math.round((parseISODate(next.dueOn).getTime() - todayStart.getTime()) / 86_400_000)
    : 0;
  const late = entries.filter((entry) => entryStatus(entry, now) === 'overdue').length;
  const percent = entries.length ? Math.round((given.length / entries.length) * 100) : 0;
  const tip = CARE_TIPS[Math.abs(dob.getDate()) % CARE_TIPS.length];
  const remindersOff = !state.settings.reminders;

  return (
    <main
      className="screen today"
      style={{
        ['--accent' as string]: accent.tint,
        ['--accent-deep' as string]: accent.ring,
        ['--accent-soft' as string]: accent.soft,
      }}
    >
      <header className="topline">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            VR
          </span>
          <span className="brand-word">Vaccine Routine</span>
        </div>
        <button className="avatar" onClick={onOpenProfile} aria-label={`${child.name}'s profile`}>
          <span style={{ color: accent.tint }}>{initial}</span>
        </button>
      </header>

      <section className="hello">
        <p className="hello-date">
          {greeting(now)} · {formatLongDay(now)}
        </p>
        <h1 className="display">
          {child.name}
          <em className="dot">.</em>
        </h1>
        <p className="hello-meta">
          <span>{ageLabel(child.dob, now)}</span>
          <span className="sep" aria-hidden="true">
            ·
          </span>
          <span className="muted">born {formatDay(dob)}</span>
        </p>
      </section>

      {entries.length === 0 ? (
        <section className="record card blank" aria-label="Empty record">
          <span className="blank-seal" aria-hidden="true">
            <IconPlus size={20} />
          </span>
          <h2 className="serif">A blank page.</h2>
          <p>
            Nothing is pre-filled for {child.name}. Add the first vaccination yourself — or start from what
            India’s national schedule suggests.
          </p>
          <div className="record-actions">
            <button className="btn primary sm" onClick={onAddEntry}>
              <IconPlus size={16} /> Add a vaccination
            </button>
            <button className="btn ghost sm" onClick={onOpenSuggestions}>
              {suggestions.length} suggestion{suggestions.length === 1 ? '' : 's'}
            </button>
          </div>
        </section>
      ) : (
        <section className="record card" aria-label={`${child.name}'s record`}>
          <header className="record-head">
            <span className="eyebrow">{child.name}’s record</span>
            <span className={`pill${given.length ? ' done' : ''}`}>
              <span className="dot" /> {given.length} given
            </span>
          </header>
          <div className="record-stats">
            <div>
              <span className="record-num num">{given.length}</span>
              <span className="record-lbl">Given</span>
            </div>
            <div>
              <span className="record-num num">{planned.length}</span>
              <span className="record-lbl">Planned</span>
            </div>
            <div>
              <span className={`record-num num${late ? ' late' : ''}`}>{late}</span>
              <span className="record-lbl">Late</span>
            </div>
          </div>
          <div className="bar" aria-hidden="true">
            <span style={{ width: `${Math.max(percent, entries.length ? 1.5 : 0)}%` }} />
          </div>
          <p className="record-foot">
            Every line here was entered by you. {suggestions.length > 0 ? `${suggestions.length} national-schedule doses are still unrecorded.` : 'The national list is fully covered.'}
          </p>
          <div className="record-actions">
            <button className="btn primary sm" onClick={onAddEntry}>
              <IconPlus size={16} /> Add a vaccination
            </button>
            <button className="btn ghost sm" onClick={onGoSchedule}>
              Full record
            </button>
          </div>
        </section>
      )}

      {overdue.length ? (
        <section className="visit card late">
          <header className="visit-head">
            <div>
              <span className="eyebrow">Past its date</span>
              <div className="visit-date">
                <span className="serif">{formatDay(parseISODate(overdue[0].dueOn ?? todayKey))}</span>
                <span className="weekday">{weekdayLong(parseISODate(overdue[0].dueOn ?? todayKey))}</span>
              </div>
            </div>
            <span className="flag late">
              <IconClock size={14} /> {overdue.length} waiting
            </span>
          </header>
          <div className="visit-list">
            {overdue.map((entry, i) => (
              <EntryRow key={entry.id} entry={entry} divider={i > 0} onOpen={() => onOpenEntry(entry.id)} />
            ))}
          </div>
          <p className="visit-foot">Tap one to record it, move the date, or remove it.</p>
        </section>
      ) : null}

      {next ? (
        <section className="visit card">
          <header className="visit-head">
            <div>
              <span className="eyebrow">Next planned</span>
              <div className="visit-date">
                <span className="serif">{formatDay(parseISODate(next.dueOn ?? todayKey))}</span>
                <span className="weekday">{weekdayLong(parseISODate(next.dueOn ?? todayKey))}</span>
              </div>
            </div>
            <span className="flag now">
              {entryStatus(next, now) === 'due' ? 'Due today' : `In ${humanGap(Math.max(nextDays, 1))}`}
            </span>
          </header>
          <div className="visit-list">
            {sameDay.map((entry, i) => (
              <EntryRow key={entry.id} entry={entry} divider={i > 0} onOpen={() => onOpenEntry(entry.id)} />
            ))}
          </div>
          <p className="visit-foot">You planned this date. Tap an entry to change it or mark it given.</p>
        </section>
      ) : entries.length > 0 ? (
        <section className="settle card">
          <span className="settle-icon" aria-hidden="true">
            <IconSparkle size={17} />
          </span>
          <div>
            <strong>Nothing planned ahead.</strong>
            <span>Add the date of the next visit whenever you know it.</span>
          </div>
          <button className="link-btn" onClick={onAddEntry}>
            Add <IconChevron size={13} />
          </button>
        </section>
      ) : null}

      {suggestions.length ? (
        <section className="suggest card" aria-label="Suggested by India's national schedule">
          <header className="suggest-head">
            <div>
              <span className="eyebrow">Suggested next · India NIS</span>
              <h2 className="serif">What the national schedule would suggest</h2>
            </div>
            <button className="link-btn sug-all" onClick={onOpenSuggestions}>
              All {suggestions.length} <IconChevron size={13} />
            </button>
          </header>
          <p className="suggest-lede">
            Only doses that are not already in {child.name}’s record. Nothing is added until you add it.
          </p>
          <div className="sug-list">
            {suggestions.slice(0, 3).map((suggestion) => (
              <SuggestionRow
                key={suggestion.dose.id}
                suggestion={suggestion}
                onPick={() => onPickSuggestion(suggestionPrefill(suggestion))}
              />
            ))}
          </div>
          <p className="suggest-foot">
            Guidance only — your health worker decides what is due. Dates are counted from {child.name}’s
            birth on {formatDayMonth(dob)}.
          </p>
        </section>
      ) : null}

      {remindersOff ? (
        <button className="nudge-line" onClick={onGoNudges}>
          <span className="nudge-icon">
            <IconBell size={17} />
          </span>
          <span className="nudge-copy">
            <strong>Turn on gentle reminders</strong>
            <span>A quiet nudge before each date you plan. Nothing leaves the phone.</span>
          </span>
          <IconChevron size={16} />
        </button>
      ) : null}

      {given.length ? (
        <section className="recent">
          <SectionHead label="Recently given" action="Full record" onAction={onGoSchedule} />
          <div className="entries card">
            {given.slice(0, 3).map((entry, i) => (
              <EntryRow key={entry.id} entry={entry} divider={i > 0} onOpen={() => onOpenEntry(entry.id)} />
            ))}
          </div>
        </section>
      ) : null}

      {!install.standalone && !state.settings.installDismissed ? (
        <section className="install">
          <span className="install-icon" aria-hidden="true">
            VR
          </span>
          <div className="install-copy">
            <strong>Keep it a tap away</strong>
            <span>
              {install.isIOS
                ? 'Share → Add to Home Screen for full-screen, offline access.'
                : install.canInstall
                  ? 'Install for full-screen access — works with no signal.'
                  : 'Add to your home screen — works with no signal.'}
            </span>
          </div>
          {install.canInstall ? (
            <button className="btn ghost sm install-cta" onClick={() => void install.promptInstall()}>
              Add
            </button>
          ) : null}
          <button
            className="icon-btn install-x"
            aria-label="Dismiss"
            onClick={() => setSettings({ installDismissed: true })}
          >
            <IconClose size={14} />
          </button>
        </section>
      ) : null}

      <figure className="tip">
        <IconSparkle size={15} className="tip-icon" />
        <blockquote className="serif">{tip}</blockquote>
      </figure>
    </main>
  );
}
