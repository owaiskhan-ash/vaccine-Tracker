import { useEffect, useState } from 'react';
import { Sheet } from './Sheet';
import { useApp, useDoses } from '../lib/store';
import { STAGE_BY_ID } from '../data/schedule';
import { formatLongDay, parseISODate, toISODate } from '../lib/date';
import { IconCheck, IconInfo, IconPin } from './Icon';
import type { DoseView } from '../lib/types';

type Props = {
  doseId: string | null;
  onClose: () => void;
  onToast: (message: string, action?: { label: string; run: () => void }) => void;
};

const PLACE_SUGGESTIONS = ['PHC', 'Sub-centre', 'Government hospital', 'Private clinic'];

export function DoseSheet({ doseId, onClose, onToast }: Props) {
  const { child, markDoseDone, undoDose } = useApp();
  const doses = useDoses();
  const dose: DoseView | undefined = doses.find((d) => d.doseId === doseId);
  const [givenOn, setGivenOn] = useState(toISODate(new Date()));
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!doseId) return;
    setGivenOn(toISODate(new Date()));
    setPlace('');
    setNote('');
    setSaved(false);
  }, [doseId]);

  if (!dose || !child) return null;
  const stage = STAGE_BY_ID[dose.stage as keyof typeof STAGE_BY_ID];
  const done = Boolean(dose.record);
  const record = dose.record;
  const isFuture = dose.daysUntil > 7 && !done;

  function save() {
    if (!dose) return;
    markDoseDone(dose.doseId, {
      on: givenOn,
      ...(place.trim() ? { place: place.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    setSaved(true);
    onToast(`${dose.short} recorded`, {
      label: 'Undo',
      run: () => {
        if (doseId) undoDose(doseId);
      },
    });
    window.setTimeout(onClose, 520);
  }

  return (
    <Sheet
      open={Boolean(doseId)}
      onClose={onClose}
      title={
        <div>
          <p className="eyebrow">
            {stage.label} · {dose.optional ? 'Optional in your district' : 'National schedule'}
          </p>
          <h2>{dose.name}</h2>
        </div>
      }
    >
      <p className="dose-lede">{dose.protects}</p>

      <div className="meta-grid">
        <div>
          <span className="eyebrow">Recommended</span>
          <span className="meta-val">{formatLongDay(dose.dueDate)}</span>
        </div>
        <div>
          <span className="eyebrow">Window closes</span>
          <span className="meta-val">{formatLongDay(dose.windowEnd)}</span>
        </div>
      </div>

      <div className="meta-line">
        <IconPin size={15} />
        <span>{dose.route}</span>
      </div>

      <p className="dose-detail">{dose.detail}</p>

      {done && record ? (
        <div className="done-panel">
          <span className="done-seal">
            <IconCheck size={18} />
          </span>
          <div className="done-copy">
            <span className="done-title">Recorded</span>
            <span className="done-when">
              {formatLongDay(record.on ? parseISODate(record.on) : new Date(record.at))}
              {record.place ? ` · ${record.place}` : ''}
            </span>
            {record.note ? <span className="done-note">“{record.note}”</span> : null}
          </div>
          <button
            className="link-btn"
            onClick={() => {
              undoDose(dose.doseId);
              onToast('Marked as not given', {
                label: 'Undo',
                run: () => markDoseDone(dose.doseId, record),
              });
            }}
          >
            Undo
          </button>
        </div>
      ) : (
        <div className="log-panel">
          <div className="between">
            <span className="eyebrow">Log this dose</span>
            <span className="tiny">Optional details</span>
          </div>
          <label className="field tight">
            <span className="label">Date given</span>
            <input
              className="input"
              type="date"
              value={givenOn}
              max={toISODate(new Date())}
              onChange={(e) => setGivenOn(e.target.value)}
            />
          </label>
          <label className="field tight">
            <span className="label">Where</span>
            <input
              className="input"
              placeholder="Clinic, hospital, or health worker"
              value={place}
              list="vr-places"
              onChange={(e) => setPlace(e.target.value)}
            />
            <datalist id="vr-places">
              {PLACE_SUGGESTIONS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
          <label className="field tight">
            <span className="label">Note</span>
            <input
              className="input"
              placeholder="Mild fever after, batch number…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <button className={`btn primary wide${saved ? ' saved' : ''}`} onClick={save}>
            {saved ? (
              <>
                <IconCheck size={17} /> Recorded
              </>
            ) : (
              'Mark as given'
            )}
          </button>
          {isFuture ? (
            <p className="future-note">
              <IconInfo size={14} />
              This dose is recommended from {formatLongDay(dose.dueDate)}. Record it only if it was given
              early.
            </p>
          ) : null}
        </div>
      )}

      <p className="sheet-foot">
        Every child’s timing can differ slightly. When in doubt, follow the health worker who sees{' '}
        {child.name}.
      </p>
    </Sheet>
  );
}
