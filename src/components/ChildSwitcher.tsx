import { Sheet } from './Sheet';
import { useApp } from '../lib/store';
import { ACCENTS } from '../lib/storage';
import { ageLabel } from '../lib/engine';
import { IconCheck, IconPlus } from './Icon';

type Props = {
  open: boolean;
  onClose: () => void;
  onAddChild: () => void;
  onToast: (message: string) => void;
};

export function ChildSwitcher({ open, onClose, onAddChild, onToast }: Props) {
  const { state, child, children, setActive } = useApp();
  if (!child) return null;

  function pick(id: string, name: string) {
    if (id !== child?.id) {
      setActive(id);
      onToast(`Now tracking ${name}`);
    }
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        <div>
          <p className="eyebrow">Switch child</p>
          <h2>Your children</h2>
        </div>
      }
    >
      <p className="sheet-lede">
        Each child has their own record. Switching never mixes their entries or their suggestions.
      </p>

      <div className="switch-list">
        {children.map((c) => {
          const entries = state.entries[c.id]?.length ?? 0;
          const active = c.id === child.id;
          return (
            <button
              key={c.id}
              className={`switch-row${active ? ' active' : ''}`}
              onClick={() => pick(c.id, c.name)}
              aria-current={active ? 'true' : undefined}
            >
              <span className="switch-avatar" style={{ color: ACCENTS[c.accent]?.tint }} aria-hidden="true">
                {c.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="switch-main">
                <span className="switch-name">{c.name}</span>
                <span className="switch-meta">
                  {ageLabel(c.dob)} · {entries} {entries === 1 ? 'entry' : 'entries'}
                </span>
              </span>
              {active ? (
                <span className="switch-now">
                  <IconCheck size={12} /> Tracking
                </span>
              ) : (
                <span className="switch-go">Switch</span>
              )}
            </button>
          );
        })}
      </div>

      <button
        className="add-child switch-add"
        onClick={() => {
          onClose();
          onAddChild();
        }}
      >
        <span className="add-child-plus" aria-hidden="true">
          <IconPlus size={16} />
        </span>
        <span>
          <strong>Add a child</strong>
          <span>A separate record for each</span>
        </span>
      </button>

      <p className="sheet-foot">All records stay in this browser, on this phone.</p>
    </Sheet>
  );
}
