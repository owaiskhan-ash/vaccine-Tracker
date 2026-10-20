import { useEffect, useRef, type ReactNode } from 'react';

type SheetProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  labelledBy?: string;
  tall?: boolean;
};

export function Sheet({ open, onClose, children, title, tall }: SheetProps) {
  const startY = useRef<number | null>(null);
  const dragged = useRef(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => sheetRef.current?.focus({ preventScroll: true }), 120);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div className="sheet-wrap" role="presentation">
        <div
          className={`sheet${tall ? ' tall' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === 'string' ? title : undefined}
          tabIndex={-1}
          ref={sheetRef}
          onTouchStart={(e) => {
            startY.current = e.touches[0]?.clientY ?? null;
            dragged.current = false;
          }}
          onTouchMove={(e) => {
            if (startY.current == null) return;
            const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
            if (dy > 10) dragged.current = true;
            if (dy > 0 && sheetRef.current) {
              sheetRef.current.style.transform = `translateY(${dy}px)`;
              sheetRef.current.style.transition = 'none';
            }
          }}
          onTouchEnd={(e) => {
            const el = sheetRef.current;
            if (!el) return;
            const dy = (e.changedTouches[0]?.clientY ?? 0) - (startY.current ?? 0);
            el.style.transform = '';
            el.style.transition = '';
            startY.current = null;
            if (dy > 96) onClose();
          }}
        >
          <div className="sheet-grab" aria-hidden="true" />
          {title ? (
            <div className="sheet-head">
              <div>{title}</div>
              <button className="icon-btn" onClick={onClose} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                  <path d="M6.6 6.6l10.8 10.8M17.4 6.6L6.6 17.4" />
                </svg>
              </button>
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </>
  );
}
