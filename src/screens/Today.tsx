import { useMemo, useState } from 'react';
import { CARE_TIPS, ageLabel, groupByStage, progressFor } from '../lib/engine';
import { formatDay, formatDayMonth, formatLongDay, greeting, humanGap, parseISODate, toISODate } from '../lib/date';
import { useApp, useDoses, useNow } from '../lib/store';
import { ACCENTS } from '../lib/storage';
import { useInstall } from '../lib/install';
import { DoseRow, JourneyCard, VisitCard } from '../components/Bits';
import { IconBell, IconChevron, IconClock, IconClose, IconSparkle } from '../components/Icon';
import type { DoseView } from '../lib/types';

type Props = {
  onOpenDose: (id: string) => void;
  onGoNudges: () => void;
  onGoSchedule: () => void;
  onOpenProfile: () => void;
};

export function TodayScreen({ onOpenDose, onGoNudges, onGoSchedule, onOpenProfile }: Props) {
  const { state, child, setSettings, markDoseDone } = useApp();
  const doses = useDoses();
  const install = useInstall();
  const [loggedAll, setLoggedAll] = useState(0);
  const now = useNow(60_000);
  const todayKey = toISODate(now);
  const stages = useMemo(() => groupByStage(doses), [doses, todayKey]);
  const progress = useMemo(() => progressFor(doses), [doses, todayKey]);

  if (!child || !progress) return null;

  const accent = ACCENTS[child.accent] ?? ACCENTS.sand;
  const initial = child.name.trim().slice(0, 1).toUpperCase() || 'B';
  const dob = parseISODate(child.dob);

  const overdue = doses
    .filter((d) => d.status === 'overdue')
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const pending = doses
    .filter((d) => d.status !== 'done' && d.status !== 'overdue')
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const next = pending[0];
  const sameVisit: DoseView[] = next
    ? doses
        .filter((d) => d.status !== 'done' && d.dueDate.getTime() === next.dueDate.getTime())
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const tip = CARE_TIPS[Math.floor(parseISODate(child.dob).getDate() % CARE_TIPS.length)];
  const allDone = progress.done === progress.total;
  const remindersOff = !state.settings.reminders;

  return (
    <main className="screen today" style={{ ['--accent' as string]: accent.tint, ['--accent-deep' as string]: accent.ring, ['--accent-soft' as string]: accent.soft }}>
      <header className="topline">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">VR</span>
          <span className="brand-word">Vaccine Routine</span>
        </div>
        <button className="avatar" onClick={onOpenProfile} aria-label="Baby profile">
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
          <span className="sep" aria-hidden="true">·</span>
          <span className="muted">born {formatDay(dob)}</span>
        </p>
      </section>

      <JourneyCard
        stages={stages}
        done={progress.done}
        total={progress.total}
        percent={progress.percent}
        started={formatDayMonth(dob)}
        next={
          allDone ? (
            'Complete'
          ) : progress.next ? (
            <span className="next-inline">
              {formatDayMonth(progress.next.dueDate)}
              <span className={`next-gap${progress.next.status === 'overdue' ? ' late' : ''}`}>
                {progress.next.status === 'overdue'
                  ? 'overdue'
                  : progress.next.daysUntil === 0
                    ? 'today'
                    : progress.next.daysUntil > 0
                      ? humanGap(progress.next.daysUntil)
                      : 'now'}
              </span>
            </span>
          ) : (
            '—'
          )
        }
      />

      {overdue.length > 0 ? (
        <VisitCard
          tone="late"
          date={formatDay(overdue[0].dueDate)}
          weekday={new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(overdue[0].dueDate)}
          label={
            <span className="flag late">
              <IconClock size={14} /> {Math.abs(overdue[0].daysUntil)}d late
            </span>
          }
          doses={overdue}
          onOpenDose={onOpenDose}
        />
      ) : null}

      {allDone && overdue.length === 0 ? (
        <section className="complete-card card">
          <span className="complete-badge">
            <IconSparkle size={20} />
          </span>
          <h2 className="serif">Everything is up to date.</h2>
          <p>Every scheduled dose on this phone has been recorded. New doses will appear as the schedule grows.</p>
          <button className="btn ghost wide sm" onClick={onGoSchedule}>
            See the full schedule
          </button>
        </section>
      ) : sameVisit.length ? (
        <VisitCard
          date={formatLongDay(next.dueDate).split(' ').slice(0, 2).join(' ')}
          weekday={new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(next.dueDate)}
          label={
            <span className={`flag${next.status === 'due' ? ' now' : ''}`}>
              {next.status === 'due'
                ? next.daysUntil < 0
                  ? 'Due now'
                  : 'Due today'
                : next.daysUntil <= 1
                  ? 'Tomorrow'
                  : `In ${humanGap(next.daysUntil)}`}
            </span>
          }
          doses={sameVisit}
          onOpenDose={onOpenDose}
          onLogAll={() => {
            sameVisit.forEach((d) => markDoseDone(d.doseId));
            setLoggedAll(sameVisit.length);
          }}
        />
      ) : null}

      {loggedAll ? (
        <p className="logged-all">
          <IconSparkle size={14} /> {loggedAll} doses logged for today. Well done, both of you.
        </p>
      ) : null}

      {remindersOff ? (
        <button className="nudge-line" onClick={onGoNudges}>
          <span className="nudge-icon">
            <IconBell size={17} />
          </span>
          <span className="nudge-copy">
            <strong>Turn on gentle reminders</strong>
            <span>A quiet nudge before each visit. Nothing leaves the phone.</span>
          </span>
          <IconChevron size={16} />
        </button>
      ) : null}

      {pending.length > 1 ? (
        <section className="later">
          <div className="between">
            <span className="eyebrow">Later on</span>
            <button className="link-btn" onClick={onGoSchedule}>
              Full schedule <IconChevron size={13} />
            </button>
          </div>
          <div className="later-list">
            {pending
              .filter(
                (d) =>
                  d.status !== 'overdue' &&
                  !sameVisit.some((s) => s.key === d.key) &&
                  !overdue.some((o) => o.key === d.key),
              )
              .slice(0, 3)
              .map((dose) => (
                <DoseRow key={dose.key} dose={dose} onOpen={() => onOpenDose(dose.doseId)} />
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
