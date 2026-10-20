import { useMemo, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { ACCENT_KEYS, ACCENTS, importState } from '../lib/storage';
import { addDays, parseISODate, toISODate } from '../lib/date';
import type { ChildProfile } from '../lib/types';
import { IconChevron, IconShield } from '../components/Icon';

export function Onboarding() {
  const { addChild, seedSample, state, importStore } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [accent, setAccent] = useState<ChildProfile['accent']>(
    ACCENT_KEYS[state.children.length % ACCENT_KEYS.length],
  );
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => toISODate(new Date()), []);
  const earliest = useMemo(() => toISODate(addDays(new Date(), -365 * 12)), []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('A name, a nickname — whatever you call them.');
      return;
    }
    if (!dob) {
      setError('Add a date of birth so the dates can be worked out.');
      return;
    }
    const parsed = parseISODate(dob);
    if (Number.isNaN(parsed.getTime()) || dob > today) {
      setError('That date is in the future. Check the date of birth.');
      return;
    }
    if (dob < earliest) {
      setError('This tracker is designed for children up to twelve years old.');
      return;
    }
    addChild({
      name: trimmed,
      dob,
      sex: 'unspecified',
      accent,
      jeEnabled: false,
    });
  }

  return (
    <main className="onboarding">
      <div className="onboard-top">
        <div className="brand">
          <span className="brand-mark large" aria-hidden="true">VR</span>
          <span className="brand-word">Vaccine Routine</span>
        </div>

        <h1 className="display onboard-title">
          Every dose,
          <br />
          in its <em>place.</em>
        </h1>
        <p className="onboard-lede">
          A calm record of your baby’s vaccinations — and a quiet reminder before each visit. Built for
          India’s national schedule.
        </p>

        <div className="onboard-art" aria-hidden="true">
          <svg viewBox="0 0 300 74" className="onboard-svg">
            <path d="M 14 46 C 48 46, 48 20, 84 20 S 120 46, 152 46 S 188 20, 220 20 S 256 40, 286 34" className="route-base" />
            <circle cx="14" cy="46" r="4" className="route-node done" />
            <circle cx="84" cy="20" r="4" className="route-node done" />
            <circle cx="152" cy="46" r="4" className="route-marker" />
            <circle cx="220" cy="20" r="2.6" className="route-node" />
            <circle cx="286" cy="34" r="2.6" className="route-node" />
          </svg>
          <div className="onboard-art-labels">
            <span>Birth</span>
            <span>6 weeks</span>
            <span className="now">9 months</span>
            <span>16 months</span>
            <span>5 years</span>
          </div>
        </div>
      </div>

      <form className="onboard-form" onSubmit={submit} noValidate>
        <label className="field">
          <span className="label">Baby’s name</span>
          <input
            className="input"
            placeholder="Aarav, Zoya, or a nickname"
            value={name}
            autoComplete="off"
            autoCapitalize="words"
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
        </label>

        <label className="field">
          <span className="label">
            Date of birth <span className="tiny">{today}</span>
          </span>
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
          <span className="label">A colour for them</span>
          <div className="swatches">
            {ACCENT_KEYS.map((key) => (
              <button
                key={key}
                type="button"
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

        <button className="btn primary wide onboard-cta" type="submit">
          Start the routine <IconChevron size={16} />
        </button>

        <button type="button" className="sample-link" onClick={seedSample}>
          Just looking? Open a sample baby
        </button>

        <button type="button" className="restore-link" onClick={() => fileRef.current?.click()}>
          Restoring a backup? Import it here
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            try {
              importStore(importState(await file.text()));
            } catch {
              setError('That backup file could not be read.');
            }
          }}
        />

        <p className="onboard-privacy">
          <IconShield size={13} /> Stored on this phone only. Works without a signal.
        </p>
      </form>
    </main>
  );
}
