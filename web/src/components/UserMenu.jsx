import { useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';

// Avatar da conta com menu (e-mail e sair)
export default function UserMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const initial = (user.displayName || user.email || '?').trim()[0]?.toUpperCase();

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Conta"
        className="grid size-9 place-items-center overflow-hidden rounded-[10px] bg-white/10 text-sm font-bold text-sky-ink ring-1 ring-white/10 transition hover:bg-white/15"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-line bg-surface p-1.5 text-ink shadow-xl"
        >
          <div className="px-3 py-2.5">
            {user.displayName && <p className="truncate text-sm font-semibold">{user.displayName}</p>}
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
          <div className="my-1 border-t border-line" />
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-raised"
          >
            <LogOut className="size-4 text-muted" aria-hidden="true" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
