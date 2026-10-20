import { useMemo, useState } from 'react';
import { splitEntries, suggestionsFor, summarize } from '../lib/engine';
import { formatMonthYear, parseISODate, toISODate } from '../lib/date';
import { useApp, useNow } from '../lib/store';
import { ACCENTS } from '../lib/storage';
import { EntryRow } from '../components/Bits';
import { IconChevron, IconPlus, IconSparkle } from '../components/Icon';
import type { VaccineEntry } from '../lib/types';

type Filter = 'all' | 'given' | 'planned';

type MonthGroup = { key: string; label: string; entries: VaccineEntry[] };

function byMonth(list: VaccineEntry[], field: 'givenOn' | 'dueOn'): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const entry of list) {
    const iso = entry[field];
    if (!iso) continue;
    const key = iso.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.entries.push(entry);
    else groups.push({ key, label: formatMonthYear(parseISODate(iso)), entries: [entry] });
  }
  return groups;
}

function MonthList({
  groups,
  onOpenEntry,
}: {
  groups: MonthGroup[];
  onOpenEntry: (id: string) => void;
}) {
  return (
    <>
      {groups.map((group) => (
        <section className="month" key={group.key}>
          <div className="month-head">
            <span className="month-label">{group.label}</span>
            <span className="month-count num">{group.entries.length}</span>
          </div>
          <div className="entries card">
            {group.entries.map((entry, i) => (
              <EntryRow key={entry.id} entry={entry} divider={i > 0} onOpen={() => onOpenEntry(entry.id)} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export function ScheduleScreen({
  onAddEntry,
  onOpenEntry,
  onOpenSuggestions,
}: {
  onAddEntry: () => void;
  onOpenEntry: (id: string) => void;
  onOpenSuggestions: () => void;
}) {
  const { child, entries } = useApp();
  const now = useNow(60_000);
  const todayKey = toISODate(now);
  const [filter, setFilter] = useState<Filter>('all');

  const { planned, given } = useMemo(
    () => splitEntries(entries),
    // today changes which entries count as overdue, but the split itself is stable
    [entries, todayKey],
  );
  const stats = useMemo(() => summarize(entries, now), [entries, now, todayKey]);
  const percent = stats.total ? Math.round((stats.given / stats.total) * 100) : 0;
  const missing = useMemo(
    () => (child ? suggestionsFor(child, entries, new Date(`${todayKey}T12:00:00`)).length : 0),
    [child, entries, todayKey],
  );

  if (!child) return null;
  const accent = ACCENTS[child.accent] ?? ACCENTS.sand;

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
        <p className="eyebrow">The record · {child.name}</p>
        <h1 className="display">
          Everything,
          <br />
          <em>in your hand.</em>
        </h1>
        <p className="lede">
          Nothing is pre-filled. Add each vaccination when it happens, or plan one for a date ahead.
        </p>
      </header>

      <button className="add-entry" onClick={onAddEntry}>
        <span className="add-plus" aria-hidden="true">
          <IconPlus size={18} />
        </span>
        <span className="add-copy">
          <strong>Add a vaccination</strong>
          <span>Name, date, a note if you like</span>
        </span>
        <IconChevron size={16} />
      </button>

      <section className="summary card flat" aria-label="Record summary">
        <div className="summary-grid">
          <div>
            <span className="summary-num num">{stats.given}</span>
            <span className="summary-lbl">Given</span>
          </div>
          <div>
            <span className="summary-num num accent">{stats.planned}</span>
            <span className="summary-lbl">Planned</span>
          </div>
          <div>
            <span className={`summary-num num${stats.due ? ' late' : ''}`}>{stats.due}</span>
            <span className="summary-lbl">To do</span>
          </div>
        </div>
        <div className="bar" aria-hidden="true">
          <span style={{ width: `${Math.max(percent, stats.total ? 1.5 : 0)}%` }} />
        </div>
        <p className="summary-foot">
          {stats.total === 0
            ? 'An empty record, ready for its first entry.'
            : stats.due > 0
              ? `${stats.due} planned ${stats.due === 1 ? 'entry is' : 'entries are'} due or past their date.`
              : `${percent}% of the entries you saved are marked given.`}
        </p>
      </section>

      <button className="sched-suggest" onClick={onOpenSuggestions}>
        <span className="sched-suggest-icon" aria-hidden="true">
          <IconSparkle size={15} />
        </span>
        <span className="sched-suggest-copy">
          <strong>National schedule</strong>
          <span>
            {missing
              ? `${missing} dose${missing === 1 ? '' : 's'} not in the record yet`
              : 'Every listed dose is in the record'}
          </span>
        </span>
        <IconChevron size={15} />
      </button>

      {entries.length === 0 ? (
        <div className="empty-block card">
          <span className="empty-seal" aria-hidden="true">
            <IconSparkle size={19} />
          </span>
          <h2 className="serif">A record waiting for its first line.</h2>
          <p>
            There is nothing saved for {child.name} yet. Add what you know, and the national schedule can
            suggest what usually comes next.
          </p>
          <div className="empty-actions">
            <button className="btn primary sm" onClick={onAddEntry}>
              <IconPlus size={15} /> Add a vaccination
            </button>
            <button className="btn ghost sm" onClick={onOpenSuggestions}>
              See suggestions
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="filters" role="tablist" aria-label="Filter entries">
            {(['all', 'planned', 'given'] as Filter[]).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                className={filter === f ? 'on' : ''}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Everything' : f === 'planned' ? `Planned · ${planned.length}` : `Given · ${given.length}`}
              </button>
            ))}
          </div>

          {filter !== 'given' && planned.length ? (
            <>
              {filter === 'all' ? <p className="list-label">Still ahead</p> : null}
              <MonthList groups={byMonth(planned, 'dueOn')} onOpenEntry={onOpenEntry} />
            </>
          ) : null}

          {filter !== 'planned' && given.length ? (
            <>
              {filter === 'all' ? <p className="list-label">Already given</p> : null}
              <MonthList groups={byMonth(given, 'givenOn')} onOpenEntry={onOpenEntry} />
            </>
          ) : null}

          {filter === 'planned' && planned.length === 0 ? (
            <div className="empty-inline">
              <p className="serif">Nothing planned.</p>
              <p className="muted">Add a date when the next visit is booked.</p>
            </div>
          ) : null}

          {filter === 'given' && given.length === 0 ? (
            <div className="empty-inline">
              <p className="serif">Nothing recorded yet.</p>
              <p className="muted">Mark an entry as given and it will collect here.</p>
            </div>
          ) : null}
        </>
      )}

      <p className="source">
        The Indian National Immunization Schedule is used only for suggestions. Every entry above was
        added by you and stored on this phone.
      </p>
    </main>
  );
}
