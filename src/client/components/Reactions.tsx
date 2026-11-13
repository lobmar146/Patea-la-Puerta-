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
    <div className="flex items-center gap-1.5 rounded-2xl bg-surface-raised/70 p-1.5" role="group" aria-label="Reacciones rápidas" data-testid="reaction-bar">
      {REACTIONS.map((e) => (
        <button key={e} type="button" className="grid min-h-11 flex-1 place-items-center rounded-xl text-2xl transition hover:bg-surface-muted active:scale-90 disabled:opacity-60" aria-label={`Reaccionar con ${e}`} disabled={cool} onClick={() => send(e)}>
          {e}
        </button>
      ))}
    </div>
  );
}
