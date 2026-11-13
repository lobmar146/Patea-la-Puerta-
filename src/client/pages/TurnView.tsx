import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
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
import { GameIcon } from '../components/GameIcon';
import { Avatar } from '../components/Avatar';
import { ReactionBar } from '../components/Reactions';
import { CoachCard } from '../components/NoviceHelp';

type TurnModal = 'door' | 'trouble' | 'curse' | 'loot' | 'charity' | 'endTurn' | null;

export function TurnView() {
  const { snap, me, send, pending } = useRoom();
  const [modal, setModal] = useState<TurnModal>(null);
  const [troubleStep, setTroubleStep] = useState(false);
  if (!snap || !me) return null;
  const { state } = snap;
  const phase = state.turn.phase;
  const guide = PHASE_GUIDE[phase];
  const activeId = activeParticipantId(state);
  const mine = activeId === me.id;
  const canAct = (mine || me.isDm) && state.status === 'active';
  const next = upcoming(state, 1)[0];
  const open = (nextModal: TurnModal) => setModal(nextModal);
  const closeTrouble = () => { setModal(null); setTroubleStep(false); };

  const actionButton = () => {
    if (!canAct) return null;
    if (phase === 'setup') return <button className="btn-gold min-h-14 w-full text-lg sm:text-xl" disabled={pending} onClick={() => send({ type: 'turn.kickDoor' })}><GameIcon name="kick" className="size-6 shrink-0" /> Patear la puerta</button>;
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
        <div className="phase-hero p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-ui-muted">Turno {state.turn.turnNumber}</p>
            <span className={`chip border-transparent py-0.5 pl-0.5 font-bold ${mine ? 'bg-accent-brand text-[#2a1606]' : 'bg-surface-raised/80'}`}>
              {activeId && state.characters[activeId] && <Avatar c={state.characters[activeId]} size="xs" />}
              {mine ? '¡Tu turno!' : `Juega ${displayName(state, activeId)}`}
            </span>
          </div>
          <div className={`flex items-center gap-4 sm:gap-6 ${phase === 'combat' ? 'mt-1' : 'mt-4'}`}>
            <div className={`${phase === 'combat' ? 'hidden' : ''} w-[5.25rem] shrink-0 -rotate-3 rounded-2xl bg-surface-raised/60 p-1.5 shadow-[0_14px_30px_-12px_rgba(0,0,0,.7)] ring-1 ring-ui-line/10 sm:w-28`}>
              <Illustration name={guide.illustration} className="w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[1.75rem] font-extrabold leading-[1.05] sm:text-4xl" data-testid="phase-title">{guide.title}</h2>
              {phase !== 'combat' && <p className="mt-2 text-[15px] leading-snug text-ui-muted sm:text-lg">{guide.reminder}</p>}
            </div>
          </div>
        </div>
        <div className="space-y-3 p-4 sm:p-6">
          <ActiveStopwatch state={state} />
          <details className="group rounded-2xl px-1">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ui-muted hover:text-ui-fg [&::-webkit-details-marker]:hidden"><span aria-hidden className="grid size-6 place-items-center rounded-full bg-surface-raised text-xs transition-transform group-open:rotate-90">›</span>Ver ayuda de esta fase</summary>
            <ul className="list-inside list-disc space-y-2 px-1 pb-3 text-sm text-ui-muted">{guide.details.map((d) => <li key={d}>{d}</li>)}</ul>
          </details>
          {!canAct && phase !== 'combat' && (
            <p className="rounded-2xl bg-surface-muted p-4 font-semibold" role="status">
              {state.status === 'paused' ? 'Partida en pausa.' : `Esperando a ${displayName(state, activeId)}. Mientras tanto podés editar tus estadísticas.`}
            </p>
          )}
          {canAct && !mine && phase !== 'combat' && <p className="rounded-2xl bg-accent-blue/10 p-3 text-sm font-semibold text-accent-blue">{state.config.practice && activeId && state.participants[activeId]?.bot ? `Turno de ${displayName(state, activeId)}: jugalo vos para practicar.` : 'Sos DM: podés avanzar este turno como corrección.'}</p>}
        </div>
      </section>
      {/* La acción del turno queda fija sobre la barra inferior: siempre a mano del pulgar. */}
      {action && (
        <>
          <div className="action-bar" data-testid="turn-action"><div className="mx-auto max-w-4xl [&>button]:min-h-14 [&>button]:shadow-xl">{action}</div></div>
          <div aria-hidden className="h-16" />
        </>
      )}

      {phase === 'combat' && state.combat && <CombatView />}

      <CoachCard />

      {state.status === 'active' && <ReactionBar />}

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

      <Modal open={modal === 'door'} title="¿Qué carta apareció?" onClose={() => setModal(null)}>
        <div className="space-y-3">
          <p className="text-sm">Elegí el resultado de la carta que robaste en la mesa.</p>
          <button className="btn-primary w-full" disabled={pending} onClick={() => setModal('trouble')}><GameIcon name="monster" className="size-5 shrink-0" /> Monstruo: cargarlo y entrar en combate</button>
          <button className="btn-secondary w-full" disabled={pending} onClick={() => { void send({ type: 'turn.doorResult', result: 'curse' }); setModal(null); }}><GameIcon name="curse" className="size-5 shrink-0" /> Maldición</button>
          <button className="btn-secondary w-full" disabled={pending} onClick={() => { void send({ type: 'turn.doorResult', result: 'other' }); setModal(null); }}><GameIcon name="otherCard" className="size-5 shrink-0" /> Otra carta</button>
        </div>
      </Modal>

      <Modal tall={phase === 'kickDoor' || troubleStep} open={modal === 'trouble'} title={phase === 'kickDoor' ? 'Cargar monstruo' : troubleStep ? 'Buscar problemas' : '¿Qué vas a hacer?'} onClose={closeTrouble}>
        {phase === 'kickDoor' ? (
          <MonsterForm state={state} submitLabel="Entrar en combate" disabled={pending} onSubmit={(monster) => { void send({ type: 'turn.doorResult', result: 'monster', monster }); setModal(null); }} />
        ) : troubleStep ? (
          <div className="space-y-3">
            <button type="button" className="btn-secondary btn-small" onClick={() => setTroubleStep(false)}><ArrowLeft aria-hidden className="size-4 shrink-0" /> Volver a elegir</button>
            <p className="text-sm text-ui-muted">Jugá un monstruo de tu mano y buscalo o cargá sus datos.</p>
            <MonsterForm
              state={state}
              submitLabel="Pelear contra este monstruo"
              disabled={pending}
              onSubmit={(monster) => { void send({ type: 'turn.lookForTrouble', confirmed: true, monster }); closeTrouble(); }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">Elegí una sola opción para este turno.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {canAct && (
                <button type="button" className="choice-card" disabled={pending} onClick={() => setTroubleStep(true)}>
                  <Illustration name="trouble" className="w-20 shrink-0 sm:w-24" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-xl font-black"><GameIcon name="combat" className="size-5 shrink-0" />Buscar problemas</span>
                    <span className="mt-1 block text-sm text-ui-muted">Jugás un monstruo de tu mano y peleás contra él. Si ganás, subís de nivel y te llevás tesoros.</span>
                  </span>
                </button>
              )}
              <button type="button" className="choice-card" disabled={pending} onClick={() => { void send({ type: 'turn.lootRoom' }); closeTrouble(); }}>
                <Illustration name="loot" className="w-20 shrink-0 sm:w-24" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-xl font-black"><GameIcon name="loot" className="size-5 shrink-0" />Saquear la sala</span>
                  <span className="mt-1 block text-sm text-ui-muted">Robás una carta de Puerta boca abajo y la guardás en tu mano. Sin pelea.</span>
                </span>
              </button>
            </div>
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
