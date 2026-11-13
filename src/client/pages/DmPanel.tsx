import { useState } from 'react';
import { PHASE_LABEL } from '../../shared/engine';
import { activeParticipantId, displayName } from '../../shared/rules';
import { PHASES, type Phase } from '../../shared/types';
import { PresenceDot, Section } from '../components/ui';
import { useRoom } from '../useRoom';
import { CharacterEditor } from './CharacterEditor';

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
      <Section title="Partida">
        <div className="flex flex-wrap gap-2">
          {state.status === 'active' && <button className="btn-secondary" disabled={pending} onClick={() => send({ type: 'game.pause' })}>⏸ Pausar</button>}
          {state.status === 'paused' && <button className="btn-go" disabled={pending} onClick={() => send({ type: 'game.resume' })}>▶ Reanudar</button>}
          {state.status !== 'lobby' && !confirmEnd && <button className="btn-primary" onClick={() => setConfirmEnd(true)}>Terminar partida</button>}
          {state.status === 'lobby' && <p>La partida se inicia desde la pestaña Sala.</p>}
        </div>
        {confirmEnd && (
          <div className="mt-3 space-y-2 rounded-lg border-2 border-blood bg-white p-3">
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
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-ink bg-white p-2">
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
