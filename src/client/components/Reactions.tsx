import { SmilePlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { REACTIONS, displayName } from '../../shared/rules';
import type { GameState } from '../../shared/types';
import { play } from '../sound';
import { useRoom, type ReactionEvent } from '../useRoom';

interface Floating extends ReactionEvent {
  left: number;
  sway: number;
}

/** Capa que muestra las reacciones de todos flotando hacia arriba. */
export function ReactionLayer({ state, big = false }: { state: GameState; big?: boolean }) {
  const { onReaction } = useRoom();
  const [items, setItems] = useState<Floating[]>([]);
  useEffect(
    () =>
      onReaction((r) => {
        const item = { ...r, left: 8 + Math.random() * 78, sway: Math.round(Math.random() * 80 - 40) };
        setItems((xs) => [...xs.slice(-20), item]);
        play('pop');
        window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== r.id)), 2700);
      }),
    [onReaction],
  );
  if (!items.length) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-24 top-0 z-[55] overflow-hidden" data-testid="reaction-layer">
      {items.map((r) => (
        <span key={r.id} className="reaction-float" style={{ left: `${r.left}%`, ['--sway' as string]: `${r.sway}px` }}>
          <span className={`${big ? 'text-8xl' : 'text-5xl'} drop-shadow-[0_6px_14px_rgba(0,0,0,.35)]`}>{r.emoji}</span>
          <span className={`mt-1 max-w-32 truncate rounded-full bg-black/60 px-2 py-0.5 font-bold text-white ${big ? 'text-lg' : 'text-[11px]'}`}>{displayName(state, r.fromId)}</span>
        </span>
      ))}
    </div>
  );
}

/** Botonera de reacciones rápidas. */
export function ReactionBar() {
  const { react } = useRoom();
  const [cool, setCool] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const send = (e: string) => {
    if (cool) return;
    react(e);
    setCool(true);
    timer.current = window.setTimeout(() => setCool(false), 650);
  };
  return (
    <div className="flex items-center gap-1 rounded-2xl border border-ui-line/10 bg-surface-raised p-1" role="group" aria-label="Reacciones rápidas" data-testid="reaction-bar">
      {REACTIONS.map((e) => (
        <button key={e} type="button" className="grid size-11 place-items-center rounded-xl text-2xl transition hover:bg-surface-muted active:scale-90 disabled:opacity-60" aria-label={`Reaccionar con ${e}`} disabled={cool} onClick={() => send(e)}>
          {e}
        </button>
      ))}
    </div>
  );
}

/** Botón flotante que abre la botonera de reacciones. No ocupa lugar en la pantalla. */
export function ReactionFab({ raised = false }: { raised?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div ref={ref} className={`reaction-fab fixed right-3 z-30 flex items-center gap-2 sm:right-5 ${raised ? 'reaction-fab-raised' : ''}`}>
      {open && <div className="phase-transition rounded-2xl shadow-xl"><ReactionBar /></div>}
      <button
        type="button"
        className="grid size-12 shrink-0 place-items-center rounded-full border border-ui-line/10 bg-surface-raised text-ui-fg shadow-[0_10px_24px_-8px_rgba(0,0,0,.6)] transition active:scale-95"
        aria-label={open ? 'Cerrar reacciones' : 'Reaccionar'}
        aria-expanded={open}
        data-testid="reaction-fab"
        onClick={() => setOpen(!open)}
      >
        {open ? <X aria-hidden className="size-5" /> : <SmilePlus aria-hidden className="size-6" />}
      </button>
    </div>
  );
}
