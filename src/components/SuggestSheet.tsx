import { useMemo } from 'react';
import { Sheet } from './Sheet';
import { useApp, useNow } from '../lib/store';
import { DOSES, SCHEDULE_SOURCE } from '../data/schedule';
import { groupSuggestions, recommendedLabel, suggestionPrefill, suggestionsFor } from '../lib/engine';
import type { Suggestion } from '../lib/engine';
import { formatDayMonth, toISODate } from '../lib/date';
import { IconPlus, IconSparkle } from './Icon';
import type { EntryPrefill } from '../lib/types';

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (prefill: EntryPrefill) => void;
};

export function SuggestSheet({ open, onClose, onPick }: Props) {
  const { child, entries } = useApp();
  const now = useNow(60_000);
  const todayKey = toISODate(now);
  const suggestions = useMemo(
    () => (child ? suggestionsFor(child, entries, new Date(`${todayKey}T12:00:00`)) : []),
    [child, entries, todayKey],
  );
  const groups = useMemo(() => groupSuggestions(suggestions), [suggestions]);

  if (!child) return null;
  const recorded = DOSES.length - suggestions.length;

  function pick(suggestion: Suggestion) {
    onPick(suggestionPrefill(suggestion));
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      tall
      title={
        <div>
          <p className="eyebrow">{SCHEDULE_SOURCE}</p>
          <h2>Suggested next</h2>
        </div>
      }
    >
      <p className="sheet-lede">
        Only doses that are <em>not</em> in {child.name}’s record yet. Tap one to add it yourself.{' '}
        <strong>Nothing is filled in automatically.</strong>
      </p>

      <div className="sug-meter">
        <span className="sug-meter-num num">{suggestions.length}</span>
        <span className="sug-meter-copy">
          still unrecorded
          <span>
            {recorded} of {DOSES.length} listed doses already in the record
          </span>
        </span>
        <IconSparkle size={18} />
      </div>

      {groups.length ? (
        <div className="sst-list">
          {groups.map((group) => (
            <section className="sst-group" key={group.stage}>
              <div className="sst-head">
                <span className="eyebrow">{group.label}</span>
                <span className="sst-count">{group.items.length}</span>
              </div>
              {group.items.map((item) => (
                <button key={item.dose.id} className="sst-row" onClick={() => pick(item)}>
                  <span className="sst-main">
                    <span className="sst-name">{item.dose.name}</span>
                    <span className="sst-meta">
                      {item.dose.protects} · {recommendedLabel(item.dose)}
                    </span>
                  </span>
                  <span className="sst-side">
                    <span className={`sst-date num${item.daysFromToday < 0 ? ' late' : ''}`}>
                      {formatDayMonth(item.dueDate)}
                    </span>
                    <span className="sst-state">
                      {item.daysFromToday < 0
                        ? `${Math.abs(item.daysFromToday)} days past`
                        : item.daysFromToday === 0
                          ? 'due today'
                          : `in ${item.daysFromToday} days`}
                    </span>
                  </span>
                  <span className="sug-add" aria-hidden="true">
                    <IconPlus size={15} />
                  </span>
                </button>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="sst-empty">
          <span className="empty-seal">
            <IconSparkle size={18} />
          </span>
          <h3 className="serif">Nothing left on the national list.</h3>
          <p>Every dose this app knows about is already somewhere in {child.name}’s record.</p>
        </div>
      )}

      <p className="sheet-foot">
        Suggested dates are worked out from {child.name}’s date of birth. This is guidance from India’s
        National Immunization Schedule (Ministry of Health &amp; Family Welfare), not a prescription.
        Your health worker decides what is due.
      </p>
    </Sheet>
  );
}
