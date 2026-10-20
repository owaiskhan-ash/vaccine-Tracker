import { useMemo, useState } from 'react';
import { groupByStage, progressFor } from '../lib/engine';
import { SCHEDULE_SOURCE } from '../data/schedule';
import { useApp, useDoses, useNow } from '../lib/store';
import { toISODate } from '../lib/date';
import { ACCENTS } from '../lib/storage';
import { DoseRow, StageRow } from '../components/Bits';
import { IconInfo } from '../components/Icon';

type Filter = 'all' | 'due' | 'done';

export function ScheduleScreen({ onOpenDose }: { onOpenDose: (id: string) => void }) {
  const { child, state } = useApp();
  const doses = useDoses();
  const [filter, setFilter] = useState<Filter>('all');
  const todayKey = toISODate(useNow(60_000));
  const stages = useMemo(() => groupByStage(doses), [doses, todayKey]);
  const progress = useMemo(() => progressFor(doses), [doses, todayKey]);

  if (!child || !progress) return null;
  const accent = ACCENTS[child.accent] ?? ACCENTS.sand;
  const jeHidden = !child.jeEnabled;

  const filtered = doses
    .filter((d) => {
      if (filter === 'all') return true;
      if (filter === 'done') return d.status === 'done';
      return d.status === 'due' || d.status === 'overdue' || d.status === 'upcoming';
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  return (
    <main
      className="screen schedule"
      style={{
        ['--accent' as string]: accent.tint,
        ['--accent-deep' as string]: accent.ring,
        ['--accent-soft' as string]: accent.soft,
      }}
    >
      <header className="screen-head">
        <p className="eyebrow">{SCHEDULE_SOURCE}</p>
        <h1 className="display">
          The whole
          <br />
          <em>schedule.</em>
        </h1>
        <p className="lede">
          {progress.total} doses, from the first hour to the tenth year. Tap any dose to read what it
          protects against, or to log it.
        </p>
      </header>

      <section className="summary card flat">
        <div className="summary-grid">
          <div>
            <span className="summary-num num">{progress.done}</span>
            <span className="summary-lbl">Given</span>
          </div>
          <div>
            <span className="summary-num num accent">
              {progress.dueNow + progress.overdue}
            </span>
            <span className="summary-lbl">To do</span>
          </div>
          <div>
            <span className="summary-num num">{progress.total - progress.done}</span>
            <span className="summary-lbl">Ahead</span>
          </div>
        </div>
        <div className="bar" aria-hidden="true">
          <span style={{ width: `${Math.max(progress.percent, 1.5)}%` }} />
        </div>
        <p className="summary-foot">
          {progress.overdue > 0
            ? `${progress.overdue} dose${progress.overdue === 1 ? ' is' : 's are'} past their recommended window.`
            : progress.dueNow > 0
              ? `${progress.dueNow} dose${progress.dueNow === 1 ? ' is' : 's are'} due now.`
              : progress.next
                ? `Next up: ${progress.next.short} on ${progress.next.dueDate.getDate()} ${progress.next.dueDate.toLocaleString('en-GB', { month: 'short' })}.`
                : 'Every dose is recorded.'}
        </p>
      </section>

      <div className="filters" role="tablist" aria-label="Filter doses">
        {(['all', 'due', 'done'] as Filter[]).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            className={filter === f ? 'on' : ''}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All doses' : f === 'due' ? 'Still to go' : 'Recorded'}
          </button>
        ))}
      </div>

      {filter === 'all' ? (
        <div className="stages">
          {stages.map((stage, i) => (
            <StageRow
              key={stage.stage}
              stage={stage}
              onOpenDose={onOpenDose}
              defaultOpen={i === 0 && stage.current}
            />
          ))}
        </div>
      ) : filtered.length ? (
        <div className="flat-list card">
          {filtered.map((dose, i) => (
            <DoseRow key={dose.key} dose={dose} divider={i > 0} onOpen={() => onOpenDose(dose.doseId)} />
          ))}
        </div>
      ) : (
        <div className="empty-inline">
          <p className="serif">{filter === 'done' ? 'Nothing recorded yet.' : 'Nothing pending. Beautiful.'}</p>
          <p className="muted">
            {filter === 'done'
              ? 'Mark a dose as given and it will collect here.'
              : 'Doses appear here when they come due.'}
          </p>
        </div>
      )}

      {jeHidden ? (
        <div className="note-card">
          <IconInfo size={16} />
          <p>
            Japanese encephalitis doses are hidden. They are only given in endemic districts — you can
            switch them on in <button className="link-btn inline" onClick={() => window.dispatchEvent(new CustomEvent('vr:open-settings'))}>settings</button>.
          </p>
        </div>
      ) : null}

      <p className="source">
        Source: National Immunization Schedule, Ministry of Health &amp; Family Welfare, Government of
        India. {state.children.length > 1 ? 'Each child is tracked separately.' : ''}
      </p>
    </main>
  );
}
