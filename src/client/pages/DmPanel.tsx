import { Pause, Play } from 'lucide-react';
import { useState } from 'react';
import { PHASE_LABEL } from '../../shared/engine';
import { activeParticipantId, displayName } from '../../shared/rules';
import { PHASES, type Phase } from '../../shared/types';
import { PresenceDot, Section } from '../components/ui';
import { useRoom } from '../useRoom';
import { CharacterEditor } from './CharacterEditor';
import { GameIcon } from '../components/GameIcon';

export function DmPanel() {
  const { snap, me, online, send, pending } = useRoom();
  const [editId, setEditId] = useState<string>('');
  const [turnId, setTurnId] = useState<string>('');
  const [phase, setPhase] = useState<Phase | ''>('');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [winner, setWinner] = useState('');
  if (!snap || !me?.isDm) return null;
  const { state } = snap;
  const players = state.turn.order;
  const active = activeParticipantId(state);
  const others = Object.values(state.participants).filter((p) => !p.removed && p.id !== me.id);

  return (
    <div className="space-y-4" data-testid="dm-panel">
      <header className="inverse-surface relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-[#38271c] to-royal/80 p-5 text-parchment-50 shadow-[0_18px_45px_rgba(43,29,18,.18)] sm:p-7">
        <div aria-hidden className="absolute -right-12 -top-20 -z-10 h-64 w-64 rounded-full border-[26px] border-white/[.04]" />
        <p className="text-[10px] font-black uppercase tracking-[.24em] text-parchment-200 sm:text-xs">Herramientas de mesa</p>
        <div className="mt-2 flex items-end justify-between gap-3"><div><h1 className="font-display text-3xl font-black sm:text-4xl">Panel del DM</h1><p className="mt-1 text-sm text-parchment-100 sm:text-base">Controlá la partida y ayudá a que siga el ritmo.</p></div><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10 text-2xl"><GameIcon name="dm" className="size-6 shrink-0" /></span></div>
      </header>
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

      <Section title="Editar cualquier personaje">
        <select className="input" aria-label="Personaje a editar" value={editId} onChange={(e) => setEditId(e.target.value)} data-testid="dm-edit-select">
          <option value="">Elegí un personaje…</option>
          {players.map((id) => <option key={id} value={id}>{displayName(state, id)}</option>)}
        </select>
        {editId && state.characters[editId] && <div className="mt-3"><CharacterEditor targetId={editId} /></div>}
      </Section>

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
