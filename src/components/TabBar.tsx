import { IconBell, IconCalendar, IconSun, IconUser } from './Icon';
import { useApp } from '../lib/store';
import { entryStatus } from '../lib/engine';

export type TabKey = 'today' | 'schedule' | 'nudges' | 'you';

const ITEMS: Array<{ key: TabKey; label: string; icon: typeof IconSun }> = [
  { key: 'today', label: 'Today', icon: IconSun },
  { key: 'schedule', label: 'Record', icon: IconCalendar },
  { key: 'nudges', label: 'Reminders', icon: IconBell },
  { key: 'you', label: 'You', icon: IconUser },
];

export function TabBar({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  const { entries } = useApp();
  const needsAttention = entries.some((entry) => entryStatus(entry) === 'overdue');

  return (
    <nav className="nav" aria-label="Main">
      <div className="nav-inner">
        {ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`nav-btn${active === key ? ' active' : ''}`}
            aria-current={active === key ? 'page' : undefined}
            onClick={() => onChange(key)}
          >
            <Icon size={20} />
            <span>{label}</span>
            {key === 'today' && needsAttention ? <i className="badge-dot" aria-label="dose overdue" /> : null}
          </button>
        ))}
      </div>
    </nav>
  );
}
