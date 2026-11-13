import { useEffect, useRef, useState } from 'react';
import { displayName } from '../../shared/rules';
import type { GameState } from '../../shared/types';
import { GameIcon } from './GameIcon';

const COLORS = ['#f6b64a', '#c02a24', '#3b8a4a', '#2f63ad', '#f7ecdb'];

interface Burst {
  key: number;
  name: string;
  gained: number;
  level: number;
}

/** Celebra cuando alguien sube de nivel (por combate o a mano). Solo mira el estado: no cambia nada. */
export function Celebration({ state, big = false }: { state: GameState; big?: boolean }) {
  const prev = useRef<Record<string, number> | null>(null);
  const [burst, setBurst] = useState<Burst | null>(null);

  useEffect(() => {
    const levels = Object.fromEntries(Object.values(state.characters).map((c) => [c.id, c.level]));
    const before = prev.current;
    prev.current = levels;
    if (!before || state.status !== 'active') return;
    const up = Object.entries(levels)
      .map(([id, lvl]) => ({ id, lvl, gained: lvl - (before[id] ?? lvl) }))
      .filter((x) => x.gained > 0)
      .sort((a, b) => b.gained - a.gained)[0];
    if (!up) return;
    setBurst({ key: Date.now(), name: displayName(state, up.id), gained: up.gained, level: up.lvl });
    const t = window.setTimeout(() => setBurst(null), 2600);
    return () => window.clearTimeout(t);
  }, [state]);

  if (!burst) return null;
  return (
    <div key={burst.key} className="pointer-events-none fixed inset-0 z-[60] grid place-items-center overflow-hidden" role="status" aria-live="polite" data-testid="celebration">
      <div aria-hidden className="absolute inset-0">
        {Array.from({ length: 36 }, (_, i) => (
          <span
            key={i}
            className="confetti"
            style={{
              left: `${(i * 37) % 100}%`,
              background: COLORS[i % COLORS.length],
              animationDelay: `${(i % 9) * 40}ms`,
              ['--drift' as string]: `${((i * 53) % 120) - 60}px`,
              ['--spin' as string]: `${(i % 2 ? 1 : -1) * (360 + i * 20)}deg`,
            }}
          />
        ))}
      </div>
      <div className={`celebration-card flex items-center gap-3 rounded-3xl bg-gradient-to-b from-[#f6b64a] to-[#d98a16] text-[#2a1606] shadow-[0_24px_60px_-16px_rgba(240,165,49,.8)] ${big ? 'px-10 py-7' : 'px-6 py-4'}`}>
        <GameIcon name="level" className={big ? 'size-16' : 'size-10'} />
        <div>
          <p className={`font-display font-extrabold leading-none ${big ? 'text-6xl' : 'text-4xl'}`}>+{burst.gained} {burst.gained === 1 ? 'NIVEL' : 'NIVELES'}</p>
          <p className={`mt-1 font-bold ${big ? 'text-2xl' : 'text-base'}`}>{burst.name} llega a nivel {burst.level}</p>
        </div>
      </div>
    </div>
  );
}
