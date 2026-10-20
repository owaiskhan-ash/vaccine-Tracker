import { useEffect, useState } from 'react';
import { Sheet } from './Sheet';
import { useApp } from '../lib/store';
import { DOSE_BY_ID, DOSE_NAMES } from '../data/schedule';
import { doseForName, normalizeText, recommendedLabel } from '../lib/engine';
import { formatLongDay, parseISODate, toISODate } from '../lib/date';
import { IconCheck, IconSparkle, IconTrash } from './Icon';
import type { EntryMode, EntryPrefill } from '../lib/types';

type Props = {
  open: boolean;
  /** entry being edited, or null when adding */
  entryId: string | null;
  prefill?: EntryPrefill | null;
  onClose: () => void;
  onToast: (message: string, action?: { label: string; run: () => void }) => void;
};

const PLACES = ['PHC', 'Sub-centre', 'Government hospital', 'Private clinic'];

export function EntrySheet({ open, entryId, prefill, onClose, onToast }: Props) {
  const { child, entries, addEntry, updateEntry, removeEntry } = useApp();
  const existing = entryId ? entries.find((entry) => entry.id === entryId) ?? null : null;

  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [mode, setMode] = useState<EntryMode>('given');
  const [date, setDate] = useState(toISODate(new Date()));
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [sourceId, setSourceId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmDelete(false);
    if (existing) {
      setName(existing.name);
      setDose(existing.dose ?? '');
      setMode(existing.givenOn ? 'given' : 'planned');
      setDate(existing.givenOn ?? existing.dueOn ?? toISODate(new Date()));
      setPlace(existing.place ?? '');
      setNote(existing.note ?? '');
      setSourceId(existing.sourceId);
    } else if (prefill) {
      setName(prefill.name);
      setDose(prefill.dose ?? '');
      setMode(prefill.mode);
      setDate(prefill.date);
      setPlace('');
      setNote('');
      setSourceId(prefill.sourceId);
    } else {
      setName('');
      setDose('');
      setMode('given');
      setDate(toISODate(new Date()));
      setPlace('');
      setNote('');
      setSourceId(undefined);
    }
    // `existing` is intentionally read once per open; entries changing in the
    // background should not overwrite what is being typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entryId, prefill]);

  if (!child) return null;
  const today = toISODate(new Date());
  const linkedDose = sourceId ? DOSE_BY_ID[sourceId] : undefined;

  function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the vaccination a name — “BCG”, “Flu shot”, whatever it was called.');
      return;
    }
    if (!date) {
      setError(mode === 'given' ? 'Add the date it was given.' : 'Add the date you have planned.');
      return;
    }
    if (mode === 'given' && date > today) {
      setError('That date is in the future. Switch to “Planned” for a date that has not happened yet.');
      return;
    }

    // Keep the link to the national list only when the typed name still answers
    // that dose; otherwise a renamed entry would hide the wrong suggestion.
    const typed = normalizeText(`${trimmed} ${dose}`);
    const stillMatches = linkedDose
      ? [linkedDose.name, linkedDose.short].some((label) => typed.includes(normalizeText(label)))
      : false;
    const matched = stillMatches ? linkedDose : doseForName(trimmed);
    const nextSource = matched?.id;

    const payload = {
      name: trimmed,
      ...(dose.trim() ? { dose: dose.trim() } : { dose: undefined }),
      ...(mode === 'given' ? { givenOn: date, dueOn: undefined } : { dueOn: date, givenOn: undefined }),
      ...(place.trim() ? { place: place.trim() } : { place: undefined }),
      ...(note.trim() ? { note: note.trim() } : { note: undefined }),
      ...(nextSource ? { sourceId: nextSource } : { sourceId: undefined }),
    };

    if (existing) {
      updateEntry(existing.id, payload);
      onToast('Entry updated');
    } else {
      addEntry(payload);
      onToast(mode === 'given' ? `${trimmed} added to the record` : `${trimmed} planned`);
    }
    onClose();
  }

  function markGivenToday() {
    if (!existing) return;
    setMode('given');
    setDate(today);
    updateEntry(existing.id, { ...payloadFromForm(), givenOn: today, dueOn: undefined });
    onToast(`${existing.name} marked as given`);
    onClose();
  }

  function payloadFromForm() {
    return {
      name: name.trim() || existing?.name || 'Vaccination',
      ...(dose.trim() ? { dose: dose.trim() } : {}),
      ...(place.trim() ? { place: place.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(sourceId ? { sourceId } : {}),
    };
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        <div>
          <p className="eyebrow">{existing ? 'Edit entry' : linkedDose ? 'From India NIS' : 'New entry'}</p>
          <h2>{existing ? existing.name : 'Add a vaccination'}</h2>
        </div>
      }
    >
      {linkedDose ? (
        <div className="src-panel">
          <span className="src-icon" aria-hidden="true">
            <IconSparkle size={16} />
          </span>
          <div>
            <span className="src-title">National schedule · {recommendedLabel(linkedDose)}</span>
            <span className="src-copy">{linkedDose.protects}. {linkedDose.route}.</span>
          </div>
        </div>
      ) : (
        <p className="sheet-lede">
          Type it exactly as it appears on the card, or pick a name from India’s national schedule.
        </p>
      )}

      <label className="field">
        <span className="label">Vaccination</span>
        <input
          className="input"
          value={name}
          placeholder="e.g. BCG, Penta 2, Flu shot"
          list="vr-dose-names"
          autoComplete="off"
          onChange={(e) => {
            setName(e.target.value);
            setSourceId(undefined);
            setError(null);
          }}
        />
        <datalist id="vr-dose-names">
          {DOSE_NAMES.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </label>

      <label className="field">
        <span className="label">
          Dose or label <span className="tiny">optional</span>
        </span>
        <input
          className="input"
          value={dose}
          placeholder="Dose 2 · left arm · batch 41A"
          autoComplete="off"
          onChange={(e) => setDose(e.target.value)}
        />
      </label>

      <div className="field">
        <span className="label">Status</span>
        <div className="seg">
          <button aria-pressed={mode === 'given'} onClick={() => setMode('given')}>
            Already given
          </button>
          <button aria-pressed={mode === 'planned'} onClick={() => setMode('planned')}>
            Planned
          </button>
        </div>
      </div>

      <label className="field">
        <span className="label">{mode === 'given' ? 'Date given' : 'Date planned'}</span>
        <input
          className="input"
          type="date"
          value={date}
          max={mode === 'given' ? today : undefined}
          onChange={(e) => {
            setDate(e.target.value);
            setError(null);
          }}
        />
      </label>

      {mode === 'given' ? (
        <label className="field">
          <span className="label">
            Where <span className="tiny">optional</span>
          </span>
          <input
            className="input"
            value={place}
            placeholder="Clinic, hospital, or health worker"
            list="vr-places"
            onChange={(e) => setPlace(e.target.value)}
          />
          <datalist id="vr-places">
            {PLACES.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
      ) : null}

      <label className="field">
        <span className="label">
          Note <span className="tiny">optional</span>
        </span>
        <textarea
          className="input"
          rows={2}
          value={note}
          placeholder="Mild fever after, next dose due in four weeks…"
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="sheet-actions">
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" onClick={save}>
          <IconCheck size={16} /> {existing ? 'Save changes' : 'Add to record'}
        </button>
      </div>

      {existing && existing.dueOn ? (
        <button className="quick-given" onClick={markGivenToday}>
          <IconCheck size={14} /> Mark as given today
        </button>
      ) : null}

      {existing ? (
        <div className="delete-line">
          {confirmDelete ? (
            <div className="danger-confirm">
              <p>
                Delete this entry? {mode === 'given' ? 'The date and note go with it.' : 'The planned date goes with it.'}
              </p>
              <div className="row">
                <button className="btn ghost sm" onClick={() => setConfirmDelete(false)}>
                  Keep
                </button>
                <button
                  className="btn primary sm"
                  onClick={() => {
                    removeEntry(existing.id);
                    onToast('Entry deleted');
                    onClose();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button className="link-btn muted" onClick={() => setConfirmDelete(true)}>
              <IconTrash size={14} /> Delete entry
            </button>
          )}
        </div>
      ) : null}

      <p className="sheet-foot">
        Saved to {child.name}’s record in this browser, on this phone.
        {mode === 'planned' && date
          ? ` It will show up as planned for ${formatLongDay(parseISODate(date))}.`
          : ''}
      </p>
    </Sheet>
  );
}
