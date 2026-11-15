import { Pause, Play, Swords } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PHASE_LABEL } from '../../shared/engine';
import { SEX_SYMBOL, WIN_LEVEL, activeParticipantId, basePower, combatTotals, displayName } from '../../shared/rules';
import { PHASES, type Phase } from '../../shared/types';
import { EventList, PresenceDot, Section } from '../components/ui';
import { Avatar } from '../components/Avatar';
import { useRoom } from '../useRoom';
import { QuickCharacterCard } from '../components/QuickCharacterCard';
import { GameIcon } from '../components/GameIcon';

export function DmPanel({ onGoTurn }: { onGoTurn?: () => void }) {
  const { snap, me, online, send, pending } = useRoom();
  const [turnId, setTurnId] = useState<string>('');
  const [phase, setPhase] = useState<Phase | ''>('');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [winner, setWinner] = useState('');
  // Ficha que se ve abajo: la que tocó el DM; si no eligió, la de quien juega. Al cambiar el turno, sigue al nuevo jugador.
  const [pick, setPick] = useState<string | null>(null);
  const turnKey = snap ? `${snap.state.turn.turnNumber}:${activeParticipantId(snap.state)}` : '';
  useEffect(() => setPick(null), [turnKey]);
  if (!snap || !me?.isDm) return null;
  const { state } = snap;
  const players = state.turn.order;
  const active = activeParticipantId(state);
  const shown = pick && state.characters[pick] && players.includes(pick) ? pick : active && players.includes(active) ? active : players[0];
  const others = Object.values(state.participants).filter((p) => !p.removed && p.id !== me.id);

  return (
    <div className="space-y-4" data-testid="dm-panel">
      <header className="inverse-surface flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-ink via-[#38271c] to-royal/80 px-4 py-3 text-parchment-50">
        <h1 className="font-display text-2xl font-black">Panel del DM</h1>
        <GameIcon name="dm" className="size-6 shrink-0" />
      </header>
      {state.combat && (() => {
        const t = combatTotals(state, state.combat);
        const who = [state.combat.fighterId, state.combat.helperId].filter(Boolean).map((id) => displayName(state, id)).join(' + ');
        return (
          <button type="button" onClick={onGoTurn} className="flex w-full items-center gap-3 rounded-2xl border-2 border-accent-wine/40 bg-accent-wine/10 p-3 text-left active:scale-[.98]" data-testid="dm-combat-banner">
            <Swords aria-hidden className="size-7 shrink-0 text-accent-wine" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-black uppercase tracking-[.14em] text-accent-wine">Combate en curso · tocá para ir</span>
              <span className="block truncate font-bold">{who}</span>
            </span>
            <span className="shrink-0 text-center font-display text-2xl font-black tabular-nums"><span className="text-accent-moss">{t.players}</span> <span className="text-base text-ui-muted">vs</span> <span className="text-accent-wine">{t.monsters}</span></span>
          </button>
        );
      })()}

      {players.length > 1 && (
        <nav aria-label="Resumen de jugadores" className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="dm-summary">
          {players.map((id) => {
            const c = state.characters[id];
            if (!c) return null;
            const isActive = state.status !== 'lobby' && id === active;
            const close = c.level >= WIN_LEVEL - 1;
            const selected = id === shown;
            return (
              <button
                key={id}
                type="button"
                className={`flex min-h-14 min-w-0 items-center gap-2 rounded-2xl border-2 p-2 text-left transition active:scale-95 ${selected ? 'border-accent-brand bg-accent-brand/15 shadow-md' : close ? 'border-accent-gold bg-surface-raised' : 'border-ui-line/[.1] bg-surface-raised'}`}
                onClick={() => setPick(id)}
                aria-pressed={selected}
                aria-label={`Ver a ${c.name}: nivel ${c.level}, poder ${basePower(c)}`}
              >
                <Avatar c={c} size="sm" />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-black">{c.sex && <span aria-hidden className="mr-0.5">{SEX_SYMBOL[c.sex]}</span>}{c.name}</span>
                  <span className="block text-xs font-semibold text-ui-muted">{isActive ? 'Le toca' : online.has(id) ? 'En línea' : 'Sin app'}</span>
                </span>
                <span className="shrink-0 text-right leading-none">
                  <b className="block font-display text-2xl font-black tabular-nums">{c.level}</b>
                  <span className="text-[10px] font-bold text-ui-muted">P {basePower(c)}</span>
                </span>
              </button>
            );
          })}
        </nav>
      )}

      <section aria-label="Personajes" data-testid="dm-characters">
        {(() => {
          const c = shown ? state.characters[shown] : undefined;
          if (!c || !shown) return null;
          const badge = state.combat?.fighterId === shown ? 'Pelea' : state.combat?.helperId === shown ? 'Ayuda' : state.status !== 'lobby' && shown === active ? 'Le toca' : undefined;
          return <QuickCharacterCard key={shown} c={c} active={state.status !== 'lobby' && shown === active} badge={badge} />;
        })()}
        {players.length === 0 && <p className="italic">Todavía no hay jugadores.</p>}
      </section>

      {snap.events.length > 0 && (
        <Section title="Últimos cambios">
          <EventList events={snap.events} limit={5} />
        </Section>
      )}

      <Section title="Partida">
        <div className="flex flex-wrap gap-2">
          {state.status === 'active' && <button className="btn-secondary" disabled={pending} onClick={() => send({ type: 'game.pause' })}><Pause aria-hidden className="size-4 shrink-0" /> Pausar</button>}
          {state.status === 'paused' && <button className="btn-go" disabled={pending} onClick={() => send({ type: 'game.resume' })}><Play aria-hidden className="size-4 shrink-0" /> Reanudar</button>}
          {state.status !== 'lobby' && !confirmEnd && <button className="btn-primary" onClick={() => setConfirmEnd(true)}>Terminar partida</button>}
          {state.status === 'lobby' && <p>La partida se inicia desde la pestaña Sala.</p>}
        </div>
        {confirmEnd && (
          <div className="mt-3 space-y-3 rounded-2xl border border-accent-wine/30 bg-blood/[.06] p-4">
            <label className="label" htmlFor="winner">¿Hubo ganador?</label>
            <select id="winner" className="input" value={winner} onChange={(e) => setWinner(e.target.value)}>
              <option value="">Sin ganador declarado</option>
              {players.map((id) => <option key={id} value={id}>{displayName(state, id)}</option>)}
            </select>
            <div className="flex gap-2">
              <button className="btn-primary" disabled={pending} onClick={() => send({ type: 'game.end', winnerId: winner || null })}>Confirmar fin</button>
              <button className="btn-secondary" onClick={() => setConfirmEnd(false)}>Cancelar</button>
            </div>
          </div>
        )}
      </Section>

      {state.status !== 'lobby' && (
        <Section title="Corregir turno y fase">
          <p className="mb-2 text-sm">Ahora: {displayName(state, active)} · {PHASE_LABEL[state.turn.phase]}. Queda registrado como corrección del DM.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <select className="input" aria-label="Jugador activo" value={turnId || active || ''} onChange={(e) => setTurnId(e.target.value)} data-testid="dm-turn-player">
              {players.map((id) => <option key={id} value={id}>{displayName(state, id)}</option>)}
            </select>
            <select className="input" aria-label="Fase" value={phase || state.turn.phase} onChange={(e) => setPhase(e.target.value as Phase)} data-testid="dm-turn-phase">
              {PHASES.map((p) => <option key={p} value={p}>{PHASE_LABEL[p]}</option>)}
            </select>
            <button className="btn-blue" disabled={pending} onClick={() => send({ type: 'dm.setTurn', activeId: turnId || active || players[0], phase: phase || state.turn.phase })} data-testid="dm-turn-apply">Aplicar corrección</button>
          </div>
          {state.combat && <p className="mt-2 text-xs">Si cambiás de fase o jugador, el combate en curso se descarta.</p>}
        </Section>
      )}

      <Section title="Participantes">
        <ul className="space-y-2">
          {others.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ui-line/10 bg-surface-raised p-3 shadow-sm">
              <span>
                <b>{displayName(state, p.id)}</b> · {p.role === 'player' ? 'Jugador' : 'Espectador'} <PresenceDot online={online.has(p.id)} />
              </span>
              <span className="flex gap-1">
                {p.role === 'player' && <button className="btn-secondary btn-small" disabled={pending} onClick={() => send({ type: 'dm.transfer', toId: p.id })}>Pasar DM</button>}
                <button className="btn-secondary btn-small" disabled={pending} onClick={() => send({ type: 'dm.removeParticipant', participantId: p.id })}>Quitar</button>
              </span>
            </li>
          ))}
          {others.length === 0 && <li className="italic">Todavía no se sumó nadie más.</li>}
        </ul>
        <p className="mt-2 text-xs">Una desconexión no quita a nadie ni cambia el orden. Los permisos de DM nunca se transfieren solos.</p>
      </Section>
    </div>
  );
}
