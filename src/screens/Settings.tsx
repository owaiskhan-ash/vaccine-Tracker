import { useState } from 'react';
import { ageLabel } from '../lib/engine';
import { formatLongDay, parseISODate } from '../lib/date';
import { useApp } from '../lib/store';
import { ACCENTS, ACCENT_KEYS } from '../lib/storage';
import { IconEdit, IconPlus, IconShield, IconTrash } from '../components/Icon';

export function SettingsScreen({
  onEditChild,
  onAddChild,
  onToast,
}: {
  onEditChild: (id: string) => void;
  onAddChild: () => void;
  onToast: (message: string, action?: { label: string; run: () => void }) => void;
}) {
  const { state, child, setActive, updateChild, removeChild, resetAll } = useApp();
  const children = state.children;
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (!child) return null;
  const accent = ACCENTS[child.accent] ?? ACCENTS.sand;
  const recordCount = Object.values(state.records).reduce((n, map) => n + Object.keys(map).length, 0);

  return (
    <main
      className="screen settings"
      style={{
        ['--accent' as string]: accent.tint,
        ['--accent-deep' as string]: accent.ring,
        ['--accent-soft' as string]: accent.soft,
      }}
    >
      <header className="screen-head">
        <p className="eyebrow">You</p>
        <h1 className="display">
          A small,
          <br />
          <em>private record.</em>
        </h1>
      </header>

      <section className="prof card">
        <div className="prof-top">
          <span className="prof-avatar" aria-hidden="true">
            {child.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="prof-id">
            <h2 className="prof-name">{child.name}</h2>
            <p className="prof-meta">
              {ageLabel(child.dob)}
              <span aria-hidden="true"> · </span>
              <span className="born">{formatLongDay(parseISODate(child.dob))}</span>
            </p>
          </div>
          <button className="icon-btn" onClick={() => onEditChild(child.id)} aria-label="Edit profile">
            <IconEdit size={19} />
          </button>
        </div>

        <div className="prof-swatches">
          <span className="eyebrow">Accent</span>
          <div className="swatches">
            {ACCENT_KEYS.map((key) => (
              <button
                key={key}
                className="swatch"
                style={{ background: ACCENTS[key].tint }}
                aria-label={ACCENTS[key].label}
                aria-pressed={child.accent === key}
                onClick={() => updateChild(child.id, { accent: key })}
              />
            ))}
          </div>
        </div>

      </section>

      <section className="kids">
        <div className="between">
          <span className="eyebrow">{children.length > 1 ? 'Children' : 'Baby'}</span>
          <button className="link-btn" onClick={onAddChild}>
            <IconPlus size={13} /> Add another
          </button>
        </div>
        <div className="kid-list">
          {children.map((c) => (
            <button
              key={c.id}
              className={`kid${c.id === child.id ? ' active' : ''}`}
              onClick={() => setActive(c.id)}
            >
              <span className="kid-avatar" style={{ color: ACCENTS[c.accent]?.tint }}>
                {c.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="kid-main">
                <span className="kid-name">{c.name}</span>
                <span className="kid-meta">{ageLabel(c.dob)}</span>
              </span>
              {c.id === child.id ? <span className="kid-now">Tracking</span> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="data card">
        <div className="data-head">
          <span className="eyebrow">On this phone</span>
          <IconShield size={15} />
        </div>
        <p className="data-lede">
          {recordCount} dose{recordCount === 1 ? '' : 's'} recorded. Everything you enter stays in this
          browser, on this phone.
        </p>
      </section>

      <div className="danger">
        {confirmRemove ? (
          <div className="danger-confirm">
            <p>
              Remove {child.name} and every recorded dose? This cannot be undone.
            </p>
            <div className="row">
              <button className="btn ghost sm" onClick={() => setConfirmRemove(false)}>
                Keep
              </button>
              <button
                className="btn primary sm"
                onClick={() => {
                  const name = child.name;
                  removeChild(child.id);
                  setConfirmRemove(false);
                  onToast(`${name} removed`);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button className="danger-link" onClick={() => setConfirmRemove(true)}>
            <IconTrash size={15} /> Remove this child
          </button>
        )}
      </div>

      <div className="reset-line">
        {confirmReset ? (
          <div className="row">
            <span className="tiny">Erase everything on this phone?</span>
            <button className="btn ghost sm" onClick={() => setConfirmReset(false)}>
              No
            </button>
            <button
              className="btn primary sm"
              onClick={() => {
                resetAll();
                setConfirmReset(false);
              }}
            >
              Erase
            </button>
          </div>
        ) : (
          <button className="link-btn muted" onClick={() => setConfirmReset(true)}>
            Erase all data
          </button>
        )}
      </div>
    </main>
  );
}
