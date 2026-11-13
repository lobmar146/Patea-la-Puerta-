import { ArrowRight, Backpack, ChevronRight, DoorOpen, Layers, Skull, Swords, Zap } from 'lucide-react';
import { useState } from 'react';
import { PHASE_GUIDE } from '../../shared/phases';
import { activeParticipantId, displayName, upcoming } from '../../shared/rules';
import { Illustration } from '../components/Illustration';
import { Modal } from '../components/Modal';
import { MonsterForm } from '../components/MonsterForm';
import { ActiveStopwatch } from '../components/Stopwatch';
import { EventList } from '../components/ui';
import { useRoom } from '../useRoom';
import { CombatView } from './CombatView';

type TurnModal = 'door' | 'trouble' | 'curse' | 'loot' | 'charity' | 'endTurn' | null;

export function TurnView() {
  const { snap, me, send, pending } = useRoom();
  const [modal, setModal] = useState<TurnModal>(null);
  const [confirmTrouble, setConfirmTrouble] = useState(false);
  if (!snap || !me) return null;
  const { state } = snap;
  const phase = state.turn.phase;
  const guide = PHASE_GUIDE[phase];
  const activeId = activeParticipantId(state);
  const mine = activeId === me.id;
  const canAct = (mine || me.isDm) && state.status === 'active';
  const next = upcoming(state, 1)[0];
  const open = (nextModal: TurnModal) => setModal(nextModal);

  const actionButton = () => {
    if (!canAct) return null;
    if (phase === 'setup') return <button className="btn-primary w-full text-lg sm:text-xl" disabled={pending} onClick={() => send({ type: 'turn.kickDoor' })}><DoorOpen aria-hidden className="size-5 shrink-0" /> Patear la puerta</button>;
    if (phase === 'kickDoor') return <button className="btn-primary w-full text-lg sm:text-xl" onClick={() => open('door')}>¿Qué salió detrás de la puerta? <ChevronRight aria-hidden className="size-4 shrink-0" /></button>;
    if (phase === 'curse') return <button className="btn-go w-full text-lg" onClick={() => open('curse')}>Registrar que resolví la maldición</button>;
    if (phase === 'noMonster') return <button className="btn-primary w-full text-lg sm:text-xl" onClick={() => open('trouble')}>Elegir: buscar problemas o saquear</button>;
    if (phase === 'lootRoom') return <button className="btn-go w-full text-lg" onClick={() => open('loot')}>Confirmar saqueo</button>;
    if (phase === 'charity') return <button className="btn-go w-full text-lg" onClick={() => open('charity')}>Confirmar caridad resuelta</button>;
    if (phase === 'endTurn') return <button className="btn-go w-full text-lg sm:text-xl" onClick={() => open('endTurn')}>Preparar pase de turno{next ? ` a ${displayName(state, next)}` : ''} <ArrowRight aria-hidden className="size-4 shrink-0" /></button>;
    return null;
  };
  const action = actionButton();

  return (
    <div className="space-y-4">
      <section key={phase} className="card phase-transition overflow-hidden" data-testid="turn-panel" data-phase={phase}>
        <div className="bg-gradient-to-br from-surface-inset via-surface-muted to-surface-raised p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[.16em] text-ui-muted sm:text-sm">Turno {state.turn.turnNumber}</p>
            <span className={`chip ${mine ? 'border-moss/15 bg-moss text-white' : 'bg-surface-raised/80'}`}>
              {mine ? 'Tu turno' : `Juega ${displayName(state, activeId)}`}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-4 sm:gap-6">
            <div className="w-[5.5rem] shrink-0 rounded-[1.4rem] border border-ui-line/15 bg-surface-raised/70 p-2 shadow-lg sm:w-32">
              <Illustration name={guide.illustration} className="w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl" data-testid="phase-title">{guide.title}</h2>
              <p className="mt-2 text-base leading-snug text-ui-muted sm:text-lg">{guide.reminder}</p>
            </div>
          </div>
        </div>
        <div className="space-y-4 p-4 sm:p-6">
          <ActiveStopwatch state={state} />
          <details className="rounded-2xl bg-surface-muted/75 px-4">
            <summary className="min-h-12 cursor-pointer py-3 font-bold">Ver ayuda de esta fase</summary>
            <ul className="list-inside list-disc space-y-2 pb-4 text-sm text-ui-muted">{guide.details.map((d) => <li key={d}>{d}</li>)}</ul>
          </details>
          {!canAct && phase !== 'combat' && (
            <p className="rounded-2xl bg-surface-muted p-4 font-semibold" role="status">
              {state.status === 'paused' ? 'Partida en pausa.' : `Esperando a ${displayName(state, activeId)}. Mientras tanto podés editar tus estadísticas.`}
            </p>
          )}
          {canAct && !mine && phase !== 'combat' && <p className="rounded-2xl bg-accent-blue/10 p-3 text-sm font-semibold text-accent-blue">Sos DM: podés avanzar este turno como corrección.</p>}
          {action && <div className="pt-1">{action}</div>}
        </div>
      </section>

      {phase === 'combat' && state.combat && <CombatView />}

      <section className="card p-4">
        <h2 className="mb-2 text-lg font-bold">Últimos eventos</h2>
        <EventList events={snap.events} limit={5} />
      </section>

      <Modal open={modal === 'door'} title="¿Qué carta apareció?" onClose={() => setModal(null)}>
        <div className="space-y-3">
          <p className="text-sm">Elegí el resultado de la carta que robaste en la mesa.</p>
          <button className="btn-primary w-full" disabled={pending} onClick={() => setModal('trouble')}><Skull aria-hidden className="size-5 shrink-0" /> Monstruo: cargarlo y entrar en combate</button>
          <button className="btn-secondary w-full" disabled={pending} onClick={() => { void send({ type: 'turn.doorResult', result: 'curse' }); setModal(null); }}><Zap aria-hidden className="size-5 shrink-0" /> Maldición</button>
          <button className="btn-secondary w-full" disabled={pending} onClick={() => { void send({ type: 'turn.doorResult', result: 'other' }); setModal(null); }}><Layers aria-hidden className="size-5 shrink-0" /> Otra carta</button>
        </div>
      </Modal>

      <Modal open={modal === 'trouble'} title={phase === 'kickDoor' ? 'Cargar monstruo' : '¿Qué vas a hacer?'} onClose={() => { setModal(null); setConfirmTrouble(false); }}>
        {phase === 'kickDoor' ? (
          <MonsterForm state={state} submitLabel="Entrar en combate" disabled={pending} onSubmit={(monster) => { void send({ type: 'turn.doorResult', result: 'monster', monster }); setModal(null); }} />
        ) : (
          <div className="space-y-3">
            <p className="text-sm">Elegí una sola opción para este turno.</p>
            {canAct && (
              <div className="rounded-xl border-2 border-ui-line/40 bg-surface-raised p-3">
                <h3 className="font-bold"><Swords aria-hidden className="mr-1 inline size-4" />Buscar problemas</h3>
                <p className="mb-3 text-sm">Jugá un monstruo de tu mano y cargá sus datos.</p>
                <MonsterForm
                  state={state}
                  submitLabel="Pelear contra este monstruo"
                  disabled={pending || !confirmTrouble}
                  onSubmit={(monster) => { void send({ type: 'turn.lookForTrouble', confirmed: true, monster }); setModal(null); setConfirmTrouble(false); }}
                  extra={<label className="flex min-h-11 items-center gap-2 font-bold"><input type="checkbox" className="h-5 w-5" checked={confirmTrouble} onChange={(event) => setConfirmTrouble(event.target.checked)} />Confirmo que juego un monstruo de mi mano</label>}
                />
              </div>
            )}
            <button className="btn-secondary w-full" disabled={pending} onClick={() => { void send({ type: 'turn.lootRoom' }); setModal(null); }}><Backpack aria-hidden className="size-5 shrink-0" /> Saquear: robar una Puerta boca abajo</button>
          </div>
        )}
      </Modal>

      <Modal open={modal === 'curse'} title="Maldición resuelta" onClose={() => setModal(null)}>
        <p className="mb-4">¿Ya aplicaron el efecto en la mesa y actualizaron las estadísticas si cambiaron?</p>
        <button className="btn-go w-full" disabled={pending} onClick={() => { void send({ type: 'turn.curseResolved' }); setModal(null); }}>Sí, seguir al camino sin monstruo</button>
      </Modal>
      <Modal open={modal === 'loot'} title="Confirmar saqueo" onClose={() => setModal(null)}>
        <p className="mb-4">¿Robaste una carta de Puerta boca abajo y la guardaste en tu mano?</p>
        <button className="btn-go w-full" disabled={pending} onClick={() => { void send({ type: 'turn.lootDone' }); setModal(null); }}>Sí, saqué una Puerta</button>
      </Modal>
      <Modal open={modal === 'charity'} title="Caridad resuelta" onClose={() => setModal(null)}>
        <p className="mb-4">Revisá el límite de tu mano y resolvé el excedente con las reglas y cartas de la mesa.</p>
        <button className="btn-go w-full" disabled={pending} onClick={() => { void send({ type: 'turn.charityDone' }); setModal(null); }}>Listo, continuar</button>
      </Modal>
      <Modal open={modal === 'endTurn'} title="Pasar el turno" onClose={() => setModal(null)}>
        <p className="mb-4">{next ? `${displayName(state, next)} empieza su turno. ¿Está todo listo?` : '¿Está todo listo para finalizar el turno?'}</p>
        <button className="btn-go w-full" disabled={pending} onClick={() => { void send({ type: 'turn.end' }); setModal(null); }}>Sí, pasar el turno <ArrowRight aria-hidden className="size-4 shrink-0" /></button>
      </Modal>
    </div>
  );
}
