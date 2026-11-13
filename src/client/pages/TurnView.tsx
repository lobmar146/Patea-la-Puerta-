import { useState } from 'react';
import { PHASE_GUIDE } from '../../shared/phases';
import { activeParticipantId, displayName, upcoming } from '../../shared/rules';
import { Illustration } from '../components/Illustration';
import { MonsterForm } from '../components/MonsterForm';
import { EventList } from '../components/ui';
import { useRoom } from '../useRoom';
import { CombatView } from './CombatView';

export function TurnView() {
  const { snap, me, send, pending } = useRoom();
  const [door, setDoor] = useState<'monster' | null>(null);
  const [trouble, setTrouble] = useState(false);
  const [confirmTrouble, setConfirmTrouble] = useState(false);
  if (!snap || !me) return null;
  const { state } = snap;
  const phase = state.turn.phase;
  const guide = PHASE_GUIDE[phase];
  const activeId = activeParticipantId(state);
  const mine = activeId === me.id;
  const canAct = (mine || me.isDm) && state.status === 'active';
  const next = upcoming(state, 1)[0];

  return (
    <div className="space-y-4">
      <section className="card p-4" data-testid="turn-panel" data-phase={phase}>
        <p className="text-sm font-bold uppercase">Turno {state.turn.turnNumber} · {mine ? 'es tu turno' : `turno de ${displayName(state, activeId)}`}</p>
        <div className="mt-2 flex gap-4">
          <Illustration name={guide.illustration} className="w-24 shrink-0 sm:w-32" />
          <div className="flex-1">
            <h2 className="text-2xl font-black" data-testid="phase-title">{guide.title}</h2>
            <p className="mt-1 text-lg">{guide.reminder}</p>
            <details className="mt-2">
              <summary className="cursor-pointer font-bold underline">Explicación ampliada</summary>
              <ul className="mt-1 list-inside list-disc text-sm">{guide.details.map((d) => <li key={d}>{d}</li>)}</ul>
            </details>
          </div>
        </div>

        {!canAct && phase !== 'combat' && (
          <p className="mt-4 rounded-lg bg-parchment-200 p-3 font-bold">
            {state.status === 'paused' ? 'Partida en pausa.' : `Esperando a ${displayName(state, activeId)}. Mientras tanto podés editar tus estadísticas.`}
          </p>
        )}
        {canAct && !mine && phase !== 'combat' && <p className="mt-3 text-sm font-bold text-royal">Sos DM: podés avanzar este turno como corrección.</p>}

        {canAct && (
          <div className="mt-4 space-y-3">
            {phase === 'setup' && <button className="btn-primary w-full text-xl" disabled={pending} onClick={() => send({ type: 'turn.kickDoor' })}>🚪 Patear la puerta</button>}
            {phase === 'kickDoor' && (
              <>
                <p className="font-bold">¿Qué salió detrás de la puerta?</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <button className="btn-primary" aria-pressed={door === 'monster'} disabled={pending} onClick={() => setDoor('monster')}>👹 Monstruo</button>
                  <button className="btn-secondary" disabled={pending} onClick={() => send({ type: 'turn.doorResult', result: 'curse' })}>🦆 Maldición</button>
                  <button className="btn-secondary" disabled={pending} onClick={() => send({ type: 'turn.doorResult', result: 'other' })}>🃏 Otra carta</button>
                </div>
                {door === 'monster' && (
                  <div className="rounded-lg border-2 border-ink bg-white p-3">
                    <MonsterForm submitLabel="Entrar en combate" disabled={pending} onSubmit={(m) => { void send({ type: 'turn.doorResult', result: 'monster', monster: m }); setDoor(null); }} />
                  </div>
                )}
              </>
            )}
            {phase === 'curse' && <button className="btn-go w-full" disabled={pending} onClick={() => send({ type: 'turn.curseResolved' })}>Maldición resuelta, seguir</button>}
            {phase === 'noMonster' && (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button className="btn-primary" aria-pressed={trouble} disabled={pending} onClick={() => setTrouble(true)}>⚔ Buscar problemas</button>
                  <button className="btn-secondary" disabled={pending} onClick={() => send({ type: 'turn.lootRoom' })}>🎒 Saquear la habitación</button>
                </div>
                {trouble && (
                  <div className="rounded-lg border-2 border-ink bg-white p-3">
                    <MonsterForm
                      submitLabel="Pelear contra este monstruo"
                      disabled={pending || !confirmTrouble}
                      onSubmit={(m) => { void send({ type: 'turn.lookForTrouble', confirmed: true, monster: m }); setTrouble(false); setConfirmTrouble(false); }}
                      extra={
                        <label className="flex items-center gap-2 font-bold">
                          <input type="checkbox" className="h-5 w-5" checked={confirmTrouble} onChange={(e) => setConfirmTrouble(e.target.checked)} />
                          Confirmo que juego un monstruo de mi mano
                        </label>
                      }
                    />
                  </div>
                )}
              </>
            )}
            {phase === 'lootRoom' && <button className="btn-go w-full" disabled={pending} onClick={() => send({ type: 'turn.lootDone' })}>Listo: robé una Puerta boca abajo</button>}
            {phase === 'charity' && <button className="btn-go w-full" disabled={pending} onClick={() => send({ type: 'turn.charityDone' })}>Caridad resuelta</button>}
            {phase === 'endTurn' && (
              <button className="btn-go w-full text-xl" disabled={pending} onClick={() => send({ type: 'turn.end' })}>
                Pasar el turno{next ? ` a ${displayName(state, next)}` : ''} ➜
              </button>
            )}
          </div>
        )}
      </section>

      {phase === 'combat' && state.combat && <CombatView />}

      <section className="card p-4">
        <h2 className="mb-2 text-lg font-bold">Últimos eventos</h2>
        <EventList events={snap.events} limit={8} />
      </section>
    </div>
  );
}
