import { computeAwards, podium } from '../../shared/awards';
import { displayName } from '../../shared/rules';
import type { GameState } from '../../shared/types';
import { Avatar } from './Avatar';
import { GameIcon } from './GameIcon';

const STEP = [
  { place: '1°', h: 'h-28 sm:h-36', bg: 'from-[#f6b64a] to-[#c9800f] text-[#2a1606]', size: 'lg' as const },
  { place: '2°', h: 'h-20 sm:h-24', bg: 'from-[#d9d4cc] to-[#9d968c] text-[#221a14]', size: 'md' as const },
  { place: '3°', h: 'h-14 sm:h-16', bg: 'from-[#d08a52] to-[#8f5427] text-[#24140a]', size: 'md' as const },
];

/** Podio (ganador al centro) y premios en joda. Solo lee el estado. */
export function FinalResults({ state, big = false }: { state: GameState; big?: boolean }) {
  const order = podium(state);
  const top = order.slice(0, 3);
  // Disposición clásica: 2° a la izquierda, 1° al centro, 3° a la derecha.
  const layout = [top[1], top[0], top[2]].map((id) => (id ? { id, rank: top.indexOf(id) } : null));
  const awards = computeAwards(state);
  const rest = order.slice(3);

  return (
    <div className={`space-y-5 ${big ? 'w-full max-w-5xl' : ''}`} data-testid="final-results">
      <ol className="flex items-end justify-center gap-2 px-1 pt-6 sm:gap-4" aria-label="Podio">
        {layout.map((slot, i) => {
          if (!slot) return <li key={`empty-${i}`} className="w-[30%] max-w-44" aria-hidden />;
          const c = state.characters[slot.id];
          const st = STEP[slot.rank];
          return (
            <li key={slot.id} className="podium-step flex w-[30%] max-w-44 flex-col items-center" style={{ animationDelay: `${(2 - slot.rank) * 220}ms` }} data-testid={`podium-${slot.rank + 1}`}>
              {slot.rank === 0 && <GameIcon name="victory" className="mb-1 size-8 text-accent-gold" />}
              <Avatar c={c} size={big ? (slot.rank === 0 ? 'xl' : 'lg') : st.size} />
              <p className={`mt-2 w-full truncate text-center font-display font-extrabold ${big ? 'text-2xl' : 'text-base sm:text-lg'}`}>{c.name}</p>
              <p className="text-xs font-semibold text-ui-muted">Nivel {c.level}</p>
              <div className={`mt-2 grid w-full place-items-center rounded-t-2xl bg-gradient-to-b font-display text-3xl font-black shadow-[inset_0_1px_0_rgba(255,255,255,.35)] ${st.h} ${st.bg}`}>{st.place}</div>
            </li>
          );
        })}
      </ol>
      {rest.length > 0 && (
        <ol className="card divide-y divide-ui-line/[.07] p-0" start={4}>
          {rest.map((id, i) => {
            const c = state.characters[id];
            return (
              <li key={id} className="flex items-center gap-3 px-3 py-2">
                <span className="w-6 text-center font-black text-ui-muted">{i + 4}°</span>
                <Avatar c={c} size="xs" />
                <span className="flex-1 truncate font-bold">{c.name}</span>
                <span className="text-sm">Nivel <b>{c.level}</b></span>
              </li>
            );
          })}
        </ol>
      )}
      {awards.length > 0 && (
        <section aria-labelledby="awards-title">
          <h2 id="awards-title" className={`mb-3 text-center font-display font-extrabold ${big ? 'text-3xl' : 'text-xl'}`}>Premios de la noche</h2>
          <ul className={`grid gap-2 text-left ${big ? 'grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'}`} data-testid="awards">
            {awards.map((a, i) => {
              const c = state.characters[a.winnerId];
              return (
                <li key={a.id} className="award-card flex items-center gap-3 rounded-2xl border border-ui-line/[.08] bg-surface-raised p-3" style={{ animationDelay: `${700 + i * 120}ms` }} data-award={a.id}>
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-brand/15 text-accent-brand"><GameIcon name={a.icon} className="size-6" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-black uppercase tracking-[.14em] text-accent-brand">{a.title}</span>
                    <span className="block truncate font-display text-lg font-extrabold leading-tight">{displayName(state, a.winnerId)}</span>
                    <span className="block text-sm text-ui-muted">{a.detail}</span>
                  </span>
                  {c && <Avatar c={c} size="xs" />}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
