import { NotebookPen } from 'lucide-react';
import { activeParticipantId, basePower, identityLine } from '../../shared/rules';

import { PlayerTime } from '../components/Stopwatch';
import { useRoom } from '../useRoom';
import { GameIcon } from '../components/GameIcon';
import { Avatar } from '../components/Avatar';
import { EventList } from '../components/ui';

export function TableView() {
  const { snap, online } = useRoom();
  if (!snap) return null;
  const { state } = snap;
  const active = activeParticipantId(state);
  const players = state.turn.order.map((id) => state.characters[id]).filter(Boolean);
  const spectators = Object.values(state.participants).filter((p) => !p.removed && p.role === 'spectator');
  return (
    <div className="space-y-4" data-testid="table-screen">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <h1 className="font-display text-3xl font-extrabold">La mesa</h1>
          <p className="text-sm text-ui-muted">Tocá a alguien para ver el detalle.</p>
        </div>
        <span className="chip border-transparent bg-surface-raised font-bold">{players.length} {players.length === 1 ? 'jugador' : 'jugadores'}</span>
      </div>
      <ul className="card divide-y divide-ui-line/[.07] overflow-hidden p-0" data-testid="table">
        {players.map((c, i) => {
          const p = state.participants[c.id];
          const isActive = active === c.id;
          return (
            <li key={c.id} className={isActive ? 'bg-accent-brand/[.08]' : ''} data-testid={`table-${c.name}`}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 sm:px-4 [&::-webkit-details-marker]:hidden">
                  <span className="relative shrink-0">
                    <Avatar c={c} size="sm" />
                    <span className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full ring-2 ring-surface ${online.has(c.id) ? 'bg-[#7ed38a]' : 'bg-ui-muted/50'}`} title={online.has(c.id) ? 'En línea' : 'Desconectado'} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-base font-bold">{c.name}</span>
                      {p.isDm && <GameIcon name="dm" className="size-4 text-accent-gold" title="DM" />}
                      {c.notes && <NotebookPen aria-label="Tiene notas" className="size-3.5 shrink-0 text-ui-muted" />}
                    </span>
                    <span className="block truncate text-xs text-ui-muted">
                      {isActive ? <b className="text-accent-brand">▶ Su turno · </b> : <span className="tabular-nums">#{i + 1} · </span>}
                      {identityLine(c)}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-xl bg-accent-wine/10 px-2 py-1 text-center">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-accent-wine">Poder</span>
                    <b className="font-display text-lg font-extrabold leading-none text-accent-wine tabular-nums" data-testid={`power-${c.name}`}>{basePower(c)}</b>
                  </span>
                  <span className="w-12 shrink-0 text-center">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-ui-muted">Nivel</span>
                    <span className="font-display text-3xl font-extrabold leading-none tabular-nums" data-testid={`level-${c.name}`}>{c.level}</span>
                  </span>
                </summary>
                <div className="space-y-2 px-3 pb-3 pl-[4.25rem] text-sm sm:px-4 sm:pl-[4.75rem]">
                  <p className="text-ui-muted">Equipo <b className="text-ui-fg">{c.gear >= 0 ? '+' : ''}{c.gear}</b> · Otros <b className="text-ui-fg">{c.otherMods >= 0 ? '+' : ''}{c.otherMods}</b></p>
                  <PlayerTime state={state} participantId={c.id} />
                  {c.notes && <p className="rounded-xl bg-surface-muted p-2 italic"><NotebookPen aria-hidden className="mr-1 inline size-4" />{c.notes}</p>}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
      {spectators.length > 0 && (
        <p className="px-1 text-sm text-ui-muted">
          Espectadores: {spectators.map((s) => `${s.name}${online.has(s.id) ? ' (en línea)' : ''}`).join(', ')}
        </p>
      )}
      <section className="card p-4">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-[.14em] text-ui-muted">Últimos eventos</h2>
        <EventList events={snap.events} limit={2} />
        {snap.events.length > 2 && (
          <details className="group mt-1">
            <summary className="min-h-10 cursor-pointer list-none py-2 text-sm font-semibold text-accent-brand [&::-webkit-details-marker]:hidden"><span className="group-open:hidden">Ver más</span><span className="hidden group-open:inline">Ver menos</span></summary>
            <EventList events={snap.events.slice(2)} limit={8} />
          </details>
        )}
      </section>
    </div>
  );
}
