import { useRef, useState } from 'react';
import { ageLabel } from '../lib/engine';
import { formatLongDay, parseISODate, toISODate } from '../lib/date';
import { useApp } from '../lib/store';
import { ACCENTS, ACCENT_KEYS, exportState, importState as restoreBackup } from '../lib/storage';
import { SCHEDULE_NOTE, SCHEDULE_SOURCE } from '../data/schedule';
import { IconDownload, IconEdit, IconPlus, IconShield, IconTrash, IconUpload } from '../components/Icon';

export function SettingsScreen({
  onEditChild,
  onAddChild,
  onToast,
}: {
  onEditChild: (id: string) => void;
  onAddChild: () => void;
  onToast: (message: string, action?: { label: string; run: () => void }) => void;
}) {
  const { state, child, setActive, updateChild, removeChild, importState, resetAll } = useApp();
  const children = state.children;
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (!child) return null;
  const accent = ACCENTS[child.accent] ?? ACCENTS.sand;
  const recordCount = Object.values(state.records).reduce((n, map) => n + Object.keys(map).length, 0);

  function download() {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaccine-routine-${toISODate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('Backup saved');
  }

  async function onFile(file: File) {
    try {
      const next = restoreBackup(await file.text());
      importState(next);
      onToast('Backup restored');
    } catch {
      onToast('That file could not be read');
    }
  }

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

        <div className="prof-row">
          <div>
            <span className="title">Japanese encephalitis doses</span>
            <span className="sub">Only in districts where JE is endemic. Adds two doses at 9 and 16 months.</span>
          </div>
          <button
            className="switch"
            role="switch"
            aria-checked={child.jeEnabled}
            aria-label="Japanese encephalitis doses"
            onClick={() => updateChild(child.id, { jeEnabled: !child.jeEnabled })}
          />
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
          {recordCount} dose{recordCount === 1 ? '' : 's'} recorded, stored only in this browser. Nothing
          is uploaded — not even a name.
        </p>
        <div className="data-actions">
          <button className="btn ghost sm" onClick={download}>
            <IconDownload size={15} /> Export
          </button>
          <button className="btn ghost sm" onClick={() => fileRef.current?.click()}>
            <IconUpload size={15} /> Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
              e.target.value = '';
            }}
          />
        </div>
        <p className="data-hint">
          Keep a backup before switching phones. The export is a plain file you can store anywhere.
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

      <section className="about">
        <span className="eyebrow">About</span>
        <p className="about-body">{SCHEDULE_NOTE}</p>
        <dl className="about-grid">
          <div>
            <dt>Schedule</dt>
            <dd>{SCHEDULE_SOURCE}</dd>
          </div>
          <div>
            <dt>App</dt>
            <dd>Vaccine Routine 1.0</dd>
          </div>
        </dl>
        <p className="source">
          Built as a quiet, offline-first tracker. If this app ever disagrees with your paediatrician or
          your immunisation card, they are right.
        </p>
      </section>

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
