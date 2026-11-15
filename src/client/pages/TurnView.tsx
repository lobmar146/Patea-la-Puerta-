import { ArrowRight, ChevronRight, Undo2 } from 'lucide-react';
import { stepUndoFor } from '../../shared/engine';
import { useState } from 'react';
import { TREATY_LEVEL, phaseGuide, treatyProtected } from '../../shared/modes';
import { DuelGuideButton } from '../components/DuelGuide';
import { activeParticipantId, displayName, upcoming } from '../../shared/rules';
import { Illustration } from '../components/Illustration';
import { Modal } from '../components/Modal';
import { MonsterForm } from '../components/MonsterForm';
import { TurnTimer } from '../components/Stopwatch';
import { useRoom } from '../useRoom';
import { CombatView } from './CombatView';
import { GameIcon } from '../components/GameIcon';
import { Avatar } from '../components/Avatar';
import { CoachCard } from '../components/NoviceHelp';
import { useNoviceMode } from '../noviceMode';

type TurnModal = 'trouble' | null;

export function TurnView() {
  const { snap, me, send, pending } = useRoom();
  const [modal, setModal] = useState<TurnModal>(null);
  const [novice] = useNoviceMode();
  if (!snap || !me) return null;
  const { state } = snap;
  const phase = state.turn.phase;
  const guide = phaseGuide(phase, state.config);
  const activeId = activeParticipantId(state);
  const mine = activeId === me.id;
  const canAct = (mine || me.isDm) && state.status === 'active';
  const next = upcoming(state, 1)[0];
  const open = (nextModal: TurnModal) => setModal(nextModal);
  const closeTrouble = () => setModal(null);

  const actionButton = () => {
    if (!canAct) return null;
    if (phase === 'setup') return <button className="btn-gold min-h-14 w-full text-lg sm:text-xl" disabled={pending} onClick={() => send({ type: 'turn.kickDoor' })}><GameIcon name="kick" className="size-6 shrink-0" /> Patear la puerta</button>;
    // Un toque = avanzar. Solo se abre un panel cuando hay que cargar un monstruo.
    const row = 'grid gap-2 [&>button]:min-h-14 [&>button]:shadow-xl';
    if (phase === 'kickDoor') return (
      <div className={`${row} grid-cols-3`} role="group" aria-label="¿Qué salió detrás de la puerta?">
        <button className="btn-primary px-2 text-base sm:text-lg" disabled={pending} onClick={() => open('trouble')}><GameIcon name="monster" className="size-5 shrink-0" /> Monstruo</button>
        <button className="btn-secondary px-2 text-base sm:text-lg" disabled={pending} onClick={() => send({ type: 'turn.doorResult', result: 'curse' })}><GameIcon name="curse" className="size-5 shrink-0" /> Maldición</button>
        <button className="btn-secondary px-2 text-base sm:text-lg" disabled={pending} onClick={() => send({ type: 'turn.doorResult', result: 'other' })}><GameIcon name="otherCard" className="size-5 shrink-0" /> Otra carta</button>
      </div>
    );
    if (phase === 'curse') return <button className="btn-go w-full text-lg" disabled={pending} onClick={() => send({ type: 'turn.curseResolved' })}>Maldición resuelta: seguir <ChevronRight aria-hidden className="size-4 shrink-0" /></button>;
    if (phase === 'noMonster') return (
      <div className={`${row} grid-cols-2`} role="group" aria-label="Sin monstruo">
        <button className="btn-primary px-2 text-base sm:text-lg" disabled={pending} onClick={() => open('trouble')}><GameIcon name="monster" className="size-5 shrink-0" /> Buscar problemas</button>
        <button className="btn-go px-2 text-base sm:text-lg" disabled={pending} onClick={() => send({ type: 'turn.lootRoom' })}><GameIcon name="loot" className="size-5 shrink-0" /> Saquear</button>
      </div>
    );
    // Salas viejas que quedaron en "saquear": un toque y sigue.
    if (phase === 'lootRoom') return <button className="btn-go w-full text-lg" disabled={pending} onClick={() => send({ type: 'turn.lootDone' })}>Seguir <ChevronRight aria-hidden className="size-4 shrink-0" /></button>;
    if (phase === 'endTurn' || phase === 'charity') return <button className="btn-go w-full text-lg sm:text-xl" disabled={pending} onClick={() => send({ type: 'turn.end' })}>Pasar turno{next ? ` a ${displayName(state, next)}` : ''} <ArrowRight aria-hidden className="size-4 shrink-0" /></button>;
    return null;
  };
  const action = actionButton();

  return (
    <div className="space-y-4">
      {(() => {
        // Sin confirmaciones: el último paso se vuelve atrás con un toque.
        const step = stepUndoFor(state);
        if (!step || state.status !== 'active' || (!me.isDm && step.by !== me.id)) return null;
        return (
          <button type="button" className="flex min-h-12 w-full scroll-mt-24 items-center gap-2 rounded-2xl border border-ui-line/[.12] bg-surface-raised px-4 text-left text-sm font-bold active:scale-[.98]" disabled={pending} onClick={() => send({ type: 'step.undo' })} data-testid="step-undo">
            <Undo2 aria-hidden className="size-5 shrink-0 text-accent-brand" />
            <span className="truncate">Volver atrás: {step.label}</span>
          </button>
        );
      })()}
      <section key={phase} className="card phase-transition overflow-hidden" data-testid="turn-panel" data-phase={phase}>
        {/* Una sola línea: quién juega, la fase y el reloj. Así el combate entra de entrada en el celular. */}
        <div className="phase-hero flex items-center gap-3 px-3 py-2.5 sm:px-5 sm:py-3">
          {activeId && state.characters[activeId] && <Avatar c={state.characters[activeId]} size="sm" />}
          <div className="min-w-0 flex-1">
            <p className={`truncate text-xs font-bold uppercase tracking-[.12em] ${mine ? 'text-accent-brand' : 'text-ui-muted'}`}>
              {mine ? '¡Tu turno!' : `Juega ${displayName(state, activeId)}`} · T{state.turn.turnNumber}
            </p>
            <h2 className="line-clamp-2 text-lg font-extrabold leading-tight sm:text-2xl" data-testid="phase-title">{guide.title}</h2>
          </div>
          <TurnTimer state={state} />
        </div>
        {state.config.mode === 'duel' && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-ui-line/10 px-3 py-1.5 text-sm sm:px-5" data-testid="duel-strip">
            <span className="min-w-0 flex-1 text-ui-muted">
              {(() => {
                const prot = treatyProtected(state);
                return prot.length
                  ? `Tratado: sin monstruos ni maldiciones contra ${prot.map((id) => displayName(state, id)).join(' ni ')} (nivel menor a ${TREATY_LEVEL}).`
                  : 'Tratado terminado: ya se pueden jugar monstruos y maldiciones al rival.';
              })()}
            </span>
            <DuelGuideButton className="btn-secondary btn-small" label="Guía" />
          </div>
        )}
        {phase !== 'combat' && (
          <div className="flex items-center gap-3 px-3 pt-3 sm:px-5">
            <div className="w-14 shrink-0 -rotate-3 rounded-xl bg-surface-raised/60 p-1 ring-1 ring-ui-line/10 sm:w-20">
              <Illustration name={guide.illustration} className="w-full" />
            </div>
            <p className="text-[15px] leading-snug text-ui-muted sm:text-lg">{guide.reminder}</p>
          </div>
        )}
        {phase !== 'combat' && <div className="space-y-3 px-3 py-3 sm:px-5">
          {!(novice || state.config.practice) && <details className="group rounded-2xl px-1">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ui-muted hover:text-ui-fg [&::-webkit-details-marker]:hidden"><span aria-hidden className="grid size-6 place-items-center rounded-full bg-surface-raised text-xs transition-transform group-open:rotate-90">›</span>Ver ayuda de esta fase</summary>
            <ul className="list-inside list-disc space-y-2 px-1 pb-3 text-sm text-ui-muted">{guide.details.map((d) => <li key={d}>{d}</li>)}</ul>
          </details>}
          {!canAct && (
            <p className="rounded-2xl bg-surface-muted p-4 font-semibold" role="status">
              {state.status === 'paused' ? 'Partida en pausa.' : `Esperando a ${displayName(state, activeId)}. Mientras tanto podés editar tus estadísticas.`}
            </p>
          )}
          {canAct && !mine && <p className="rounded-2xl bg-accent-blue/10 p-3 text-sm font-semibold text-accent-blue">{state.config.practice && activeId && state.participants[activeId]?.bot ? `Turno de ${displayName(state, activeId)}: jugalo vos para practicar.` : 'Sos DM: podés avanzar este turno como corrección.'}</p>}
        </div>}
      </section>
      {/* La acción del turno queda fija sobre la barra inferior: siempre a mano del pulgar. */}
      {action && <div className="action-bar" data-testid="turn-action"><div className="mx-auto max-w-4xl [&>button]:min-h-14 [&>button]:shadow-xl">{action}</div></div>}

      {phase === 'combat' && state.combat && <CombatView />}

      <CoachCard />

      {/* Espacio al final para que la acción fija no tape lo último de la pantalla. */}
      {action && <div aria-hidden className="h-16" />}

      <Modal tall open={modal === 'trouble'} title={phase === 'kickDoor' ? 'Cargar monstruo' : 'Buscar problemas'} onClose={closeTrouble}>
        {phase === 'kickDoor' ? (
          <MonsterForm state={state} submitLabel="Entrar en combate" disabled={pending} onSubmit={(monster) => { void send({ type: 'turn.doorResult', result: 'monster', monster }); setModal(null); }} />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ui-muted">Jugá un monstruo de tu mano y buscalo o cargá sus datos.</p>
            <MonsterForm
              state={state}
              submitLabel="Pelear contra este monstruo"
              disabled={pending}
              onSubmit={(monster) => { void send({ type: 'turn.lookForTrouble', confirmed: true, monster }); closeTrouble(); }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
