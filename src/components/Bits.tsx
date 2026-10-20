import type { ReactNode } from 'react';
import type { DoseStatus, DoseView } from '../lib/types';
import type { StageSummary } from '../lib/engine';
import { formatDayMonth, formatWeekday } from '../lib/date';
import { IconCheck } from './Icon';

export function StatusWord({ status, daysUntil }: { status: DoseStatus; daysUntil: number }) {
  if (status === 'done') return <span className="status-word done">Given</span>;
  if (status === 'overdue')
    return <span className="status-word overdue">{Math.abs(daysUntil)} days late</span>;
  if (status === 'due')
    return <span className="status-word due">{daysUntil < 0 ? 'Due now' : 'Due today'}</span>;
  if (daysUntil <= 0) return <span className="status-word soon">Due today</span>;
  if (daysUntil === 1) return <span className="status-word soon">Tomorrow</span>;
  if (daysUntil <= 21) return <span className="status-word soon">In {daysUntil} days</span>;
  return <span className="status-word quiet">Scheduled</span>;
}

export function Monogram({ dose, status }: { dose: DoseView; status: DoseStatus }) {
  const label = dose.short.replace(/\s+/g, ' ').slice(0, 7);
  return (
    <span className={`monogram ${status}`} aria-hidden="true">
      {status === 'done' ? <IconCheck size={17} /> : label}
    </span>
  );
}

export function DoseRow({
  dose,
  onOpen,
  divider,
}: {
  dose: DoseView;
  onOpen: () => void;
  divider?: boolean;
}) {
  return (
    <button className={`dose-row${divider ? ' divided' : ''}`} onClick={onOpen}>
      <Monogram dose={dose} status={dose.status} />
      <span className="dose-main">
        <span className="dose-name">{dose.name}</span>
        <span className="dose-meta">{dose.route}</span>
      </span>
      <span className="dose-side">
        {dose.status === 'done' ? (
          <span className="dose-date num">{formatDayMonth(dose.dueDate)}</span>
        ) : (
          <span className={`dose-date num${dose.status === 'overdue' ? ' late' : ''}`}>
            {formatDayMonth(dose.dueDate)}
          </span>
        )}
        <StatusWord status={dose.status} daysUntil={dose.daysUntil} />
      </span>
    </button>
  );
}

/* ---------- the route card ---------- */

const YS = [30, 18, 27, 15, 25, 17, 28, 20, 26];

function smoothPath(points: Array<[number, number]>): string {
  if (points.length < 2) return '';
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0[0] + p1[0]) / 2;
    d += ` C ${cx} ${p0[1]}, ${cx} ${p1[1]}, ${p1[0]} ${p1[1]}`;
  }
  return d;
}

export function RouteLine({ stages }: { stages: StageSummary[] }) {
  const count = Math.max(stages.length, 2);
  const width = 340;
  const pad = 12;
  const step = (width - pad * 2) / (count - 1);
  const points = stages.map<[number, number]>((_, i) => [pad + i * step, YS[i % YS.length]]);
  const path = smoothPath(points);
  const currentIdx = Math.max(
    0,
    stages.findIndex((s) => !s.complete),
  );
  const doneIdx = stages.every((s) => s.complete) ? count - 1 : currentIdx;
  const donePath = smoothPath(points.slice(0, doneIdx + 1));
  const marker = points[Math.min(doneIdx, points.length - 1)];

  return (
    <div className="route">
      <svg viewBox={`0 0 ${width} 46`} className="route-svg" preserveAspectRatio="none" aria-hidden="true">
        <path d={path} className="route-base" />
        {donePath ? <path d={donePath} className="route-done" /> : null}
        {points.map(([x, y], i) => (
          <g key={stages[i]?.stage ?? i}>
            {i <= doneIdx ? (
              <circle cx={x} cy={y} r={3.4} className="route-node done" />
            ) : (
              <circle cx={x} cy={y} r={2.2} className="route-node" />
            )}
          </g>
        ))}
        <circle cx={marker[0]} cy={marker[1]} r={8} className="route-halo" />
        <circle cx={marker[0]} cy={marker[1]} r={4.4} className="route-marker" />
      </svg>
      <div className="route-labels" style={{ gridTemplateColumns: `repeat(${stages.length}, 1fr)` }}>
        {stages.map((s, i) => (
          <span key={s.stage} className={i === currentIdx ? 'now' : i < currentIdx ? 'past' : ''}>
            {s.short}
          </span>
        ))}
      </div>
    </div>
  );
}

export function JourneyCard({
  stages,
  done,
  total,
  percent,
  started,
  next,
}: {
  stages: StageSummary[];
  done: number;
  total: number;
  percent: number;
  started: string;
  next: ReactNode;
}) {
  return (
    <section className="journey card" aria-label="Vaccination journey">
      <header className="journey-head">
        <span className="eyebrow">Your route · India UIP</span>
        <span className="journey-pct num">{percent}%</span>
      </header>
      <div className="journey-count">
        <span className="serif big num">{done}</span>
        <span className="of">
          of {total}
          <br />
          doses done
        </span>
      </div>
      <RouteLine stages={stages} />
      <div className="journey-perf" aria-hidden="true" />
      <div className="journey-foot">
        <div>
          <span className="eyebrow">Started</span>
          <div className="val">{started}</div>
        </div>
        <div className="right">
          <span className="eyebrow">Next stop</span>
          <div className="val">{next}</div>
        </div>
      </div>
    </section>
  );
}

export function VisitCard({
  date,
  weekday,
  label,
  doses,
  onOpenDose,
  onLogAll,
  tone = 'default',
}: {
  date: string;
  weekday: string;
  label: ReactNode;
  doses: DoseView[];
  onOpenDose: (id: string) => void;
  onLogAll?: () => void;
  tone?: 'default' | 'late';
}) {
  return (
    <section className={`visit card ${tone === 'late' ? 'late' : ''}`}>
      <div className="visit-head">
        <div>
          <span className="eyebrow">{tone === 'late' ? 'Slipped past its window' : 'Next visit'}</span>
          <div className="visit-date">
            <span className="serif">{date}</span>
            <span className="weekday">{weekday}</span>
          </div>
        </div>
        <div className="visit-flag">{label}</div>
      </div>
      <div className="visit-list">
        {doses.map((dose, i) => (
          <DoseRow
            key={dose.key}
            dose={dose}
            divider={i > 0}
            onOpen={() => onOpenDose(dose.doseId)}
          />
        ))}
      </div>
      {onLogAll && doses.length > 1 ? (
        <button className="visit-all" onClick={onLogAll}>
          <IconCheck size={14} /> Log all {doses.length} doses together
        </button>
      ) : null}
    </section>
  );
}

export function StageRow({
  stage,
  onOpenDose,
  defaultOpen,
}: {
  stage: StageSummary;
  onOpenDose: (id: string) => void;
  defaultOpen?: boolean;
}) {
  const pending = stage.total - stage.done;
  return (
    <details className={`stage${stage.current ? ' current' : ''}`} open={defaultOpen}>
      <summary>
        <span className={`stage-dot${stage.complete ? ' done' : stage.overdue ? ' late' : ''}`} aria-hidden="true" />
        <span className="stage-main">
          <span className="stage-label">{stage.label}</span>
          <span className="stage-sub">
            {stage.complete
              ? 'Complete'
              : stage.overdue
                ? `${stage.overdue} overdue`
                : pending === stage.total
                  ? `${stage.total} dose${stage.total === 1 ? '' : 's'}`
                  : `${stage.done} of ${stage.total} done`}
          </span>
        </span>
        <span className="stage-date num">{formatDayMonth(stage.dueDate)}</span>
        <span className={`stage-chev${stage.current ? ' now' : ''}`} aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M6 9.5l6 6 6-6" />
          </svg>
        </span>
      </summary>
      <div className="stage-body">
        <p className="stage-note">{stage.note}</p>
        {stage.doses.map((dose, i) => (
          <DoseRow key={dose.key} dose={dose} divider={i > 0} onOpen={() => onOpenDose(dose.doseId)} />
        ))}
      </div>
    </details>
  );
}

export function WeekdayChip({ date }: { date: Date }) {
  return <span className="weekday-chip">{formatWeekday(date).slice(0, 3)}</span>;
}
