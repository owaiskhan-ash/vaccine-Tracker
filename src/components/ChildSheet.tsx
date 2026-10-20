import { useEffect, useState } from 'react';
import { Sheet } from './Sheet';
import { useApp } from '../lib/store';
import { ACCENTS, ACCENT_KEYS } from '../lib/storage';
import { addDays, toISODate } from '../lib/date';
import type { AccentKey, Sex } from '../lib/types';

type Props = {
  open: boolean;
  onClose: () => void;
  /** child being edited; null means "add a child" */
  childId: string | null;
  onSaved?: (name: string) => void;
};

const SEXES: Array<{ key: Sex; label: string }> = [
  { key: 'girl', label: 'Girl' },
  { key: 'boy', label: 'Boy' },
  { key: 'unspecified', label: 'Rather not say' },
];

export function ChildSheet({ open, onClose, childId, onSaved }: Props) {
  const { state, addChild, updateChild } = useApp();
  const existing = state.children.find((c) => c.id === childId) ?? null;
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<Sex>('unspecified');
  const [accent, setAccent] = useState<AccentKey>('sand');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setName(existing.name);
      setDob(existing.dob);
      setSex(existing.sex);
      setAccent(existing.accent);
    } else {
      setName('');
      setDob('');
      setSex('unspecified');
      setAccent(ACCENT_KEYS[state.children.length % ACCENT_KEYS.length]);
    }
    setError(null);
  }, [open, existing, state.children.length]);

  const today = toISODate(new Date());
  const earliest = toISODate(addDays(new Date(), -365 * 12));

  function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give this little one a name.');
      return;
    }
    if (!dob || dob > today) {
      setError('Add a valid date of birth.');
      return;
    }
    if (dob < earliest) {
      setError('This tracker is designed for children up to twelve.');
      return;
    }
    if (existing) {
      updateChild(existing.id, { name: trimmed, dob, sex, accent });
      onSaved?.(trimmed);
    } else {
      const created = addChild({ name: trimmed, dob, sex, accent });
      onSaved?.(created.name);
    }
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        <div>
          <p className="eyebrow">{existing ? 'Profile' : 'New child'}</p>
          <h2>{existing ? existing.name : 'Who are we tracking?'}</h2>
        </div>
      }
    >
      <label className="field">
        <span className="label">Name</span>
        <input
          className="input"
          value={name}
          placeholder="Baby’s name"
          autoComplete="off"
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
      </label>

      <label className="field">
        <span className="label">Date of birth</span>
        <input
          className="input"
          type="date"
          value={dob}
          max={today}
          min={earliest}
          onChange={(e) => {
            setDob(e.target.value);
            setError(null);
          }}
        />
      </label>

      <div className="field">
        <span className="label">Sex</span>
        <div className="seg">
          {SEXES.map((s) => (
            <button key={s.key} aria-pressed={sex === s.key} onClick={() => setSex(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label">Accent</span>
        <div className="swatches">
          {ACCENT_KEYS.map((key) => (
            <button
              key={key}
              className="swatch"
              style={{ background: ACCENTS[key].tint }}
              aria-label={ACCENTS[key].label}
              aria-pressed={accent === key}
              onClick={() => setAccent(key)}
            />
          ))}
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="sheet-actions">
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" onClick={save}>
          {existing ? 'Save changes' : 'Add child'}
        </button>
      </div>
      <p className="sheet-foot">Kept in this browser, on this phone. Each child has their own separate record.</p>
    </Sheet>
  );
}
