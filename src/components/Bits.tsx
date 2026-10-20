import { formatDayMonth, parseISODate } from '../lib/date';
import { entryDays, entryStatus, recommendedLabel } from '../lib/engine';
import type { Suggestion } from '../lib/engine';
import type { VaccineEntry } from '../lib/types';
import { IconCheck, IconPlus } from './Icon';


export function StatusWord({ entry }: { entry: VaccineEntry }) {
  const status = entryStatus(entry);
  const days = entryDays(entry);
  if (status === 'given') return <span className="status-word given">Given</span>;
  if (status === 'overdue' && days != null) {
    return (
      <span className="status-word overdue">
        {Math.abs(days)} day{Math.abs(days) === 1 ? '' : 's'} late
      </span>
    );
  }
  if (status === 'due') return <span className="status-word due">Due today</span>;
  if (days != null) {
    if (days === 1) return <span className="status-word soon">Tomorrow</span>;
    if (days <= 21) return <span className="status-word soon">In {days} days</span>;
  }
  return <span className="status-word quiet">Planned</span>;
}

export function EntryRow({
  entry,
  onOpen,
  divider,
}: {
  entry: VaccineEntry;
  onOpen: () => void;
  divider?: boolean;
}) {
  const status = entryStatus(entry);
  const dateISO = entry.givenOn ?? entry.dueOn;
  const date = dateISO ? parseISODate(dateISO) : null;
  const meta =
    status === 'given'
      ? entry.place ?? entry.note ?? 'Recorded'
      : entry.note ?? entry.place ?? 'Planned — tap to change';

  return (
    <button className={`entry-row${divider ? ' divided' : ''}`} onClick={onOpen}>
      <span className={`entry-mark ${status}`} aria-hidden="true">
        {status === 'given' ? <IconCheck size={15} /> : date ? `${date.getDate()}` : '·'}
      </span>
      <span className="entry-main">
        <span className="entry-name">
          {entry.name}
          {entry.dose ? <span className="entry-dose"> · {entry.dose}</span> : null}
        </span>
        <span className="entry-meta">{meta}</span>
      </span>
      <span className="entry-side">
        {date ? <span className="entry-date num">{formatDayMonth(date)}</span> : null}
        <StatusWord entry={entry} />
      </span>
    </button>
  );
}

export function SuggestionRow({
  suggestion,
  onPick,
}: {
  suggestion: Suggestion;
  onPick: () => void;
}) {
  return (
    <button className="sug-row" onClick={onPick}>
      <span className="sug-age">{recommendedLabel(suggestion.dose)}</span>
      <span className="sug-main">
        <span className="sug-name">{suggestion.dose.name}</span>
        <span className="sug-protects">{suggestion.dose.protects}</span>
      </span>
      <span className="sug-add" aria-hidden="true">
        <IconPlus size={15} />
      </span>
    </button>
  );
}

export function SectionHead({
  label,
  action,
  onAction,
}: {
  label: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-head">
      <span className="eyebrow">{label}</span>
      {action && onAction ? (
        <button className="link-btn" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </div>
  );
}
