import { Hourglass, Plus, Sparkles } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { Combat, GameState } from '../../shared/types';
import { combatTotals, displayName, playersWinTies } from '../../shared/rules';
import { Illustration } from '../components/Illustration';
import { Modal } from '../components/Modal';
import { MonsterForm } from '../components/MonsterForm';
import { useRoom } from '../useRoom';
import { GameIcon } from '../components/GameIcon';

export function diffText(diff: number, playersTakeTie = false) {
  if (diff > 0) return `Los jugadores superan por ${diff}`;
  if (diff < 0) return `Los monstruos superan por ${-diff}`;
  return playersTakeTie
    ? 'Empate · ventaja de los jugadores por Guerrero'
    : 'Empate · ventaja de los monstruos';
}

export function CombatTotalsPanel({ state, combat, big = false }: { state: GameState; combat: Combat; big?: boolean }) {
  const totals = combatTotals(state, combat);
  const hasMonsters = combat.monsters.length > 0;
  const playersTakeTie = playersWinTies(state, combat.fighterId, combat.helperId);
  const winningDifference = playersTakeTie ? 0 : 1;
  const playersLead = totals.diff >= winningDifference;
  const pointsNeeded = playersLead ? totals.diff - winningDifference + 1 : winningDifference - totals.diff;
  const trailingSide = playersLead ? 'monstruos' : 'jugadores';
  const statusColor = totals.diff > 0
    ? 'bg-moss/10 text-accent-moss'
    : totals.diff < 0
      ? 'bg-blood/10 text-accent-wine'
      : 'bg-gold/15 text-accent-gold';
  const numberSize = big ? 'text-3xl min-[360px]:text-4xl sm:text-6xl' : 'text-3xl min-[360px]:text-4xl sm:text-5xl';
  return (
    <div data-testid="combat-totals">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-0 text-center [&>div:nth-child(2)]:-mx-2 [&>div:nth-child(2)]:z-10">
        <div className="min-w-0 rounded-2xl bg-gradient-to-b from-royal/25 to-royal/5 p-2 ring-1 ring-royal/30">
          <div className={`font-bold text-accent-blue ${big ? 'text-2xl' : 'text-sm'}`}>Jugadores</div>
          <div className={`${numberSize} font-display font-extrabold tabular-nums`} data-testid="players-total">{totals.players}</div>
          <div className={`break-words text-ui-muted ${big ? 'text-base' : 'text-xs'}`}>
            {displayName(state, combat.fighterId)} {totals.fighter}
            {combat.helperId ? ` + ${displayName(state, combat.helperId)} ${totals.helper}` : ''}
            {totals.playerMods ? ` ${totals.playerMods >= 0 ? '+' : ''}${totals.playerMods} temp.` : ''}
          </div>
        </div>
        <div className={`grid place-items-center rounded-full bg-surface-inset font-display font-black text-ui-muted ring-4 ring-surface ${big ? 'size-16 text-2xl' : 'size-10 text-xs'}`} aria-hidden="true">VS</div>
        <div className="min-w-0 rounded-2xl bg-gradient-to-b from-blood/30 to-blood/5 p-2 ring-1 ring-blood/35">
          <div className={`font-bold text-accent-wine ${big ? 'text-2xl' : 'text-sm'}`}>Monstruos</div>
          <div className={`${numberSize} font-display font-extrabold tabular-nums`} data-testid="monsters-total">{totals.monsters}</div>
          <div className={`text-ui-muted ${big ? 'text-base' : 'text-xs'}`}>
            Base {totals.monsterBase}
            {totals.monsterMods ? ` ${totals.monsterMods >= 0 ? '+' : ''}${totals.monsterMods} temp.` : ''}
          </div>
        </div>
      </div>
      <p
        className={`mt-2 flex flex-wrap items-baseline justify-center gap-x-3 rounded-xl px-3 py-2 text-center ${big ? 'text-xl' : 'text-base'} ${hasMonsters ? statusColor : 'bg-surface-raised text-ui-muted'}`}
        aria-live="polite"
        aria-atomic="true"
        data-testid="combat-diff"
      >
        <strong>{hasMonsters ? diffText(totals.diff, playersTakeTie) : 'Sin monstruos en combate'}</strong>
        {hasMonsters && (
          <span className={`font-semibold ${big ? 'text-sm' : 'text-xs'}`}>
            A los {trailingSide} les {pointsNeeded === 1 ? 'falta 1 punto' : `faltan ${pointsNeeded} puntos`} para tomar la ventaja
          </span>
        )}
      </p>
    </div>
  );
}

type CombatModal = 'monster' | 'modifier' | 'victory' | 'flee' | 'other' | { monsterId: string } | null;

export function CombatView() {
  const { snap, me, send, pending } = useRoom();
  const [modal, setModal] = useState<CombatModal>(null);
  const [seenAlert, setSeenAlert] = useState<string | null>(null);
  if (!snap || !me || !snap.state.combat) return null;
  const { state } = snap;
  const combat = snap.state.combat;
  const isFighter = combat.fighterId === me.id;
  const canEdit = state.status === 'active' && (isFighter || combat.helperId === me.id || me.isDm);
  const canResolve = isFighter || me.isDm;
  const isPlayer = me.role === 'player';
  const candidates = state.turn.order.filter((id) => id !== combat.fighterId && id !== combat.helperId);
  const pendingReqs = combat.helpRequests.filter((r) => r.status === 'pending');
  const editingMonsterId = modal && typeof modal === 'object' ? modal.monsterId : null;
  const editingMonster = combat.monsters.find(({ id }) => id === editingMonsterId);
  const totals = combatTotals(state, combat);
  const playersTakeTie = playersWinTies(state, combat.fighterId, combat.helperId);
  const losing = combat.monsters.length > 0 && totals.diff < (playersTakeTie ? 0 : 1);
  const missing = (playersTakeTie ? 0 : 1) - totals.diff;
  const canAskHelp = isFighter && !combat.helperId && pendingReqs.length === 0 && candidates.some((id) => !combat.helpRequests.some((r) => r.toId === id && r.status === 'rejected'));
  // El aviso aparece una vez por situación: al empezar a perder y de nuevo si rechazan un pedido.
  const declined = combat.helpRequests.filter((r) => r.status === 'rejected').length;
  const alertKey = `${combat.id}:${declined}`;
  const showLosingAlert = losing && canAskHelp && state.status === 'active' && seenAlert !== alertKey && modal === null;
  const askHelp = (toId: string) => {
    setSeenAlert(alertKey);
    void send({ type: 'help.request', toId });
  };

  return (
    <section className="card space-y-4 p-4" data-testid="combat">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold">¡Combate!</h2>
        <span className="chip border-transparent bg-blood/15 text-accent-wine">{displayName(state, combat.fighterId)} pelea</span>
      </div>
      <CombatTotalsPanel state={state} combat={combat} />
      {canResolve && state.status === 'active' && (
        <NextStep
          hasMonsters={combat.monsters.length > 0}
          losing={losing}
          missing={missing}
          helperName={combat.helperId ? displayName(state, combat.helperId) : null}
          waitingFor={pendingReqs.map((r) => displayName(state, r.toId))}
          helpOptions={canAskHelp ? candidates.filter((id) => !combat.helpRequests.some((r) => r.toId === id && r.status === 'rejected')).map((id) => ({ id, name: displayName(state, id) })) : []}
          pending={pending}
          onAskHelp={askHelp}
          onOpen={setModal}
        />
      )}
      <div className="rounded-2xl bg-gradient-to-b from-royal/20 to-royal/5 p-3 ring-1 ring-royal/30" data-testid="combat-help">
        <div className="flex items-center gap-3">
          <Illustration name="help" className="w-12 shrink-0 -rotate-3" />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-extrabold text-accent-blue">Ayuda</h3>
            {combat.helperId ? (
              <p className="text-sm">Te ayuda <b>{displayName(state, combat.helperId)}</b> y suma su poder.</p>
            ) : (
              <p className="text-sm text-ui-muted">{isFighter ? 'Pedile a alguien que pelee con vos. Solo uno a la vez.' : 'Sin ayudante por ahora. Solo se permite uno a la vez.'}</p>
            )}
          </div>
          {combat.helperId && (isFighter || combat.helperId === me.id || me.isDm) && (
            <button className="btn-secondary btn-small shrink-0" disabled={pending} onClick={() => send({ type: 'help.dismissHelper' })}>Quitar</button>
          )}
        </div>
        {pendingReqs.map((r) => (
          <p key={r.id} className="mt-2 flex items-center gap-2 rounded-xl bg-surface/60 px-3 py-2 text-sm font-semibold">
            <Hourglass aria-hidden className="size-4 shrink-0 animate-pulse motion-reduce:animate-none" />
            <span className="flex-1">Esperando respuesta de {displayName(state, r.toId)}…</span>
            {(isFighter || me.isDm) && <button className="underline" onClick={() => send({ type: 'help.cancel', requestId: r.id })}>cancelar</button>}
          </p>
        ))}
        {isFighter && !combat.helperId && candidates.length > 0 && !(losing && canAskHelp) && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {candidates.map((id) => (
              <button key={id} className="btn-blue w-full" disabled={pending || pendingReqs.some((r) => r.toId === id)} onClick={() => send({ type: 'help.request', toId: id })}>
                <GameIcon name="help" className="size-5 shrink-0" /> Pedir ayuda a {displayName(state, id)}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-sm text-ui-muted">Las cartas y habilidades en mesa pueden cambiar la ventaja. Confirmen cómo terminó el combate.</p>

      <div>
        <h3 className="font-bold">Monstruos</h3>
        {combat.monsters.length > 0 && (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {combat.monsters.map((monster) => (
              <li key={monster.id} className="rounded-xl border border-ui-line bg-surface-raised p-3">
                <div className="flex items-center justify-between gap-2">
                  <strong className="min-w-0 break-words">{monster.name}</strong>
                  {canEdit && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        className="btn-secondary btn-small"
                        disabled={pending}
                        aria-label={`Editar ${monster.name}`}
                        onClick={() => setModal({ monsterId: monster.id })}
                      >
                        Editar
                      </button>
                      <button
                        className="btn-secondary btn-small"
                        disabled={pending}
                        aria-label={`Quitar ${monster.name}`}
                        onClick={() => send({ type: 'combat.removeMonster', monsterId: monster.id })}
                      >
                        Quitar
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <dl className="rounded-lg bg-blood/10 p-2 text-accent-wine">
                    <dt className="text-xs font-semibold">Nivel de combate</dt>
                    <dd className="text-2xl font-black tabular-nums">{monster.strength}</dd>
                  </dl>
                  <dl className="rounded-lg bg-gold/15 p-2 text-accent-gold">
                    <dt className="text-xs font-semibold">Al vencer</dt>
                    <dd className="text-sm font-bold tabular-nums">
                      +{monster.levels} {monster.levels === 1 ? 'nivel' : 'niveles'}
                    </dd>
                    <dd className="text-sm font-bold tabular-nums">
                      {monster.treasures} {monster.treasures === 1 ? 'tesoro' : 'tesoros'}
                    </dd>
                  </dl>
                </div>
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <button className="btn-secondary mt-2 w-full sm:w-auto" onClick={() => setModal('monster')}>
            <Plus aria-hidden className="size-4 shrink-0" /> {combat.monsters.length ? 'Añadir otro monstruo' : 'Añadir monstruo'}
          </button>
        )}
      </div>

      <div>
        <h3 className="font-bold">Modificadores temporales</h3>
        <p className="text-xs">Pociones, potenciadores, maldiciones de combate… desaparecen al terminar el combate.</p>
        <ul className="my-1 space-y-1">
          {combat.modifiers.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded border border-ui-line bg-surface-raised px-2 py-1">
              <span>{m.side === 'players' ? 'Jugadores' : 'Monstruos'} {m.value >= 0 ? '+' : ''}{m.value}{m.label ? ` · ${m.label}` : ''} <span className="text-xs">({displayName(state, m.addedBy)})</span></span>
              {(m.addedBy === me.id || isFighter || me.isDm) && <button className="btn-secondary btn-small" disabled={pending} onClick={() => send({ type: 'combat.removeModifier', modifierId: m.id })}>Quitar</button>}
            </li>
          ))}
        </ul>
        {isPlayer && <button className="btn-secondary mt-2 w-full sm:w-auto" onClick={() => setModal('modifier')}><GameIcon name="card" className="size-5" /> Añadir modificador</button>}
      </div>

      {canResolve && (
        <div className="border-t border-ui-line pt-3">
          <h3 className="font-bold">Resolver combate</h3>
          <p className="mt-1 text-sm">Elegí cómo terminó en la mesa y registralo.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <button className="btn-go w-full" onClick={() => setModal('victory')}><GameIcon name="victory" className="size-4 shrink-0" /> Victoria</button>
            <button className="btn-secondary w-full" onClick={() => setModal('flee')}><GameIcon name="flee" className="size-4 shrink-0" /> Huida</button>
            <button className="btn-secondary w-full" onClick={() => setModal('other')}><Sparkles aria-hidden className="size-4 shrink-0" /> Otra resolución</button>
          </div>
        </div>
      )}

      <Modal open={showLosingAlert} title="¡Estás perdiendo!" onClose={() => setSeenAlert(alertKey)}>
        <div className="space-y-3" data-testid="losing-alert">
          <div className="flex items-center gap-3 rounded-2xl bg-blood/10 p-3 text-accent-wine">
            <Illustration name="help" className="w-16 shrink-0" />
            <p className="text-lg font-black leading-tight">Te {missing === 1 ? 'falta 1 punto' : `faltan ${missing} puntos`} para ganar. ¿Querés pedir ayuda?</p>
          </div>
          {candidates.filter((id) => !combat.helpRequests.some((r) => r.toId === id && r.status === 'rejected')).map((id) => (
            <button key={id} className="btn-blue w-full text-lg" disabled={pending} onClick={() => askHelp(id)}>
              <GameIcon name="help" className="size-5 shrink-0" /> Pedir ayuda a {displayName(state, id)}
            </button>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-secondary w-full" onClick={() => { setSeenAlert(alertKey); setModal('modifier'); }}><GameIcon name="card" className="size-5" /> Jugar una carta</button>
            <button className="btn-secondary w-full" onClick={() => { setSeenAlert(alertKey); setModal('flee'); }}><GameIcon name="flee" className="size-4 shrink-0" /> Huir</button>
          </div>
          <button className="w-full py-2 text-sm font-semibold text-ui-muted underline" onClick={() => setSeenAlert(alertKey)}>Seguir sin ayuda por ahora</button>
        </div>
      </Modal>
      <Modal tall open={modal === 'monster'} title="Añadir monstruo" onClose={() => setModal(null)}>
        <MonsterForm state={state} submitLabel="Sumar al combate" disabled={pending || !canEdit} onSubmit={(monster) => { void send({ type: 'combat.addMonster', monster }); setModal(null); }} />
      </Modal>
      <Modal open={editingMonsterId !== null} title="Editar monstruo" onClose={() => setModal(null)}>
        {editingMonster ? (
          <MonsterForm
            key={editingMonster.id}
            state={state}
            initial={editingMonster}
            submitLabel="Guardar cambios"
            disabled={pending || !canEdit}
            onSubmit={async (monster) => {
              const result = await send({ type: 'combat.updateMonster', monsterId: editingMonster.id, monster });
              if (result.ok) setModal((current) => current === modal ? null : current);
            }}
          />
        ) : <p className="text-sm text-ui-muted">Este monstruo ya salió del combate.</p>}
      </Modal>
      <Modal open={modal === 'modifier'} title="Jugar una carta o modificador" onClose={() => setModal(null)}>
        <ModifierForm
          key={modal === 'modifier' ? 'open' : 'closed'}
          defaultSide={isFighter || combat.helperId === me.id ? 'players' : 'monsters'}
          pending={pending}
          onApply={(side, value, label) => { void send({ type: 'combat.addModifier', side, value, label }); setModal(null); }}
        />
      </Modal>
      <Modal open={modal === 'victory'} title="Registrar victoria" onClose={() => setModal(null)}><VictoryForm combat={combat} /></Modal>
      <Modal open={modal === 'flee'} title="Registrar huida" onClose={() => setModal(null)}><FleeForm combat={combat} /></Modal>
      <Modal open={modal === 'other'} title="Registrar otra resolución" onClose={() => setModal(null)}><OtherForm /></Modal>
    </section>
  );
}

/** Guía del combate para quien pelea: qué conviene hacer ahora según el marcador. */
function NextStep({ hasMonsters, losing, missing, helperName, waitingFor, helpOptions, pending, onAskHelp, onOpen }: {
  hasMonsters: boolean;
  losing: boolean;
  missing: number;
  helperName: string | null;
  waitingFor: string[];
  helpOptions: { id: string; name: string }[];
  pending: boolean;
  onAskHelp: (id: string) => void;
  onOpen: (modal: CombatModal) => void;
}) {
  let tone = 'border-gold/40 bg-gold/10';
  let title: string;
  let body: ReactNode = null;
  if (!hasMonsters) {
    title = 'Paso 1: cargá el monstruo';
    body = <button className="btn-primary w-full" onClick={() => onOpen('monster')}><Plus aria-hidden className="size-5 shrink-0" /> Añadir monstruo</button>;
  } else if (!losing) {
    tone = 'border-moss/40 bg-moss/10';
    title = '¡Vas ganando!';
    body = (
      <>
        <p className="text-sm">Si nadie en la mesa juega una carta en contra, registrá la victoria.</p>
        <button className="btn-go w-full text-lg" onClick={() => onOpen('victory')}><GameIcon name="victory" className="size-5 shrink-0" /> Gané: registrar victoria</button>
      </>
    );
  } else if (waitingFor.length > 0) {
    tone = 'border-royal/40 bg-royal/10';
    title = `Esperando la respuesta de ${waitingFor.join(', ')}…`;
    body = <p className="text-sm">Mientras tanto pueden jugar cartas en la mesa.</p>;
  } else {
    tone = 'border-blood/40 bg-blood/10';
    title = `Vas perdiendo: ${missing === 1 ? 'falta 1 punto' : `faltan ${missing} puntos`}`;
    body = (
      <>
        <p className="text-sm">{helperName ? `Ya te ayuda ${helperName}. Prueben con cartas o intentá huir.` : helpOptions.length ? 'Pedí ayuda, jugá una carta o intentá huir.' : 'Jugá una carta o intentá huir.'}</p>
        {helpOptions.map((p) => (
          <button key={p.id} className="btn-blue w-full" disabled={pending} onClick={() => onAskHelp(p.id)}><GameIcon name="help" className="size-5 shrink-0" /> Pedir ayuda a {p.name}</button>
        ))}
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-secondary w-full" onClick={() => onOpen('modifier')}><GameIcon name="card" className="size-5" /> Jugar una carta</button>
          <button className="btn-secondary w-full" onClick={() => onOpen('flee')}><GameIcon name="flee" className="size-4 shrink-0" /> Huir</button>
        </div>
      </>
    );
  }
  return (
    <div className={`space-y-2 rounded-2xl border-2 p-3 ${tone}`} data-testid="combat-next-step" aria-live="polite">
      <p className="text-lg font-black">{title}</p>
      {body}
    </div>
  );
}

function VictoryForm({ combat }: { combat: Combat }) {
  const { snap, send, pending } = useRoom();
  const defaultLevels = combat.monsters.reduce((a, m) => a + m.levels, 0);
  const [fighter, setFighter] = useState(String(defaultLevels));
  const [helper, setHelper] = useState('0');
  const [note, setNote] = useState('');
  if (!snap) return null;
  const treasures = combat.monsters.reduce((a, m) => a + m.treasures, 0);
  const fighterLevels = Number(fighter) || 0;
  const helperLevels = Number(helper) || 0;
  const rewards = [{ participantId: combat.fighterId, levels: fighterLevels, note: '' }];
  if (combat.helperId) rewards.push({ participantId: combat.helperId, levels: helperLevels, note: '' });
  const signed = (n: number) => `${n >= 0 ? '+' : ''}${n} ${Math.abs(n) === 1 ? 'nivel' : 'niveles'}`;
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void send({ type: 'combat.resolveVictory', rewards, note: note.trim() }); }} data-testid="victory-form">
      <div className="flex items-center gap-3 rounded-2xl bg-moss/10 p-3">
        <Illustration name="rewards" className="w-16 shrink-0" />
        <ul className="space-y-1 text-lg font-bold" data-testid="victory-summary">
          <li>{displayName(snap.state, combat.fighterId)}: {signed(fighterLevels)}</li>
          {combat.helperId && helperLevels !== 0 && <li>{displayName(snap.state, combat.helperId)}: {signed(helperLevels)}</li>}
          <li>Roban {treasures} {treasures === 1 ? 'tesoro' : 'tesoros'} en la mesa</li>
        </ul>
      </div>
      <button className="btn-go w-full text-lg" disabled={pending}><GameIcon name="victory" className="size-5 shrink-0" /> Confirmar victoria</button>
      <details className="rounded-2xl bg-surface-muted/75 px-4">
        <summary className="min-h-12 cursor-pointer py-3 font-bold">Ajustar niveles o agregar una nota</summary>
        <div className="space-y-2 pb-4">
          <label className="flex items-center justify-between gap-2">
            <span>Niveles para {displayName(snap.state, combat.fighterId)}</span>
            <input className="input w-24" type="number" min={-10} max={10} value={fighter} onChange={(e) => setFighter(e.target.value)} data-testid="reward-fighter" />
          </label>
          {combat.helperId && (
            <label className="flex items-center justify-between gap-2">
              <span>Niveles para {displayName(snap.state, combat.helperId)} (ayudante; solo si una carta o raza lo indica)</span>
              <input className="input w-24" type="number" min={-10} max={10} value={helper} onChange={(e) => setHelper(e.target.value)} />
            </label>
          )}
          <input className="input" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota opcional (ej.: el ayudante se lleva 2 tesoros)" />
        </div>
      </details>
    </form>
  );
}

const QUICK_VALUES = [1, 2, 3, 5, 10, -1, -2, -5] as const;

/** Modificador en un toque: elegir bando y tocar un valor. El valor libre queda para casos raros. */
function ModifierForm({ defaultSide, pending, onApply }: {
  defaultSide: 'players' | 'monsters';
  pending: boolean;
  onApply: (side: 'players' | 'monsters', value: number, label: string) => void;
}) {
  const [side, setSide] = useState(defaultSide);
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const custom = Number(value);
  const sideButton = (key: 'players' | 'monsters', text: string, active: string) => (
    <button
      type="button"
      aria-pressed={side === key}
      className={`btn w-full ${side === key ? active : 'bg-surface-raised text-ui-fg'}`}
      onClick={() => setSide(key)}
    >
      {text}
    </button>
  );
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!value || Number.isNaN(custom)) return; onApply(side, custom, label.trim()); }}>
      <div>
        <span className="label">¿A quién ayuda la carta?</span>
        <div className="grid grid-cols-2 gap-2">
          {sideButton('players', 'Jugadores', 'bg-royal text-white')}
          {sideButton('monsters', 'Monstruos', 'bg-blood text-white')}
        </div>
      </div>
      <label className="block">
        <span className="label">Carta o motivo (opcional)</span>
        <input className="input" maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej.: poción, enfurecido" />
      </label>
      <div>
        <span className="label">Tocá el valor para aplicarlo</span>
        <div className="grid grid-cols-4 gap-2" data-testid="mod-quick">
          {QUICK_VALUES.map((n) => (
            <button key={n} type="button" className={`btn text-lg tabular-nums ${n > 0 ? 'bg-moss/15 text-accent-moss' : 'bg-blood/10 text-accent-wine'}`} disabled={pending} onClick={() => onApply(side, n, label.trim())}>
              {n > 0 ? `+${n}` : `−${-n}`}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <input className="input min-w-0 flex-1" type="number" inputMode="numeric" min={-99} max={99} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Otro valor" aria-label="Otro valor" data-testid="mod-value" />
        <button className="btn-primary shrink-0" disabled={pending || !value}>Aplicar modificador</button>
      </div>
    </form>
  );
}

function FleeForm({ combat }: { combat: Combat }) {
  const { snap, send, pending } = useRoom();
  const people = [combat.fighterId, ...(combat.helperId ? [combat.helperId] : [])];
  const [res, setRes] = useState<Record<string, 'escaped' | 'caught'>>({});
  const [note, setNote] = useState('');
  if (!snap) return null;
  const outcomes = people.flatMap((p) => combat.monsters.map((m) => ({ participantId: p, monsterId: m.id, result: res[`${p}:${m.id}`] ?? 'escaped' })));
  return (
    <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); void send({ type: 'combat.resolveFlee', outcomes, note: note.trim() }); }} data-testid="flee-form">
      <div className="flex items-center gap-3">
        <Illustration name="flee" className="w-14 shrink-0" />
        <p>Tiren el dado físico por cada monstruo (en el juego base, 5 o más escapa). Registren el resultado; las consecuencias se aplican a mano.</p>
      </div>
      {people.map((p) =>
        combat.monsters.map((m) => {
          const k = `${p}:${m.id}`;
          return (
            <fieldset key={k} className="flex flex-wrap items-center justify-between gap-2 rounded border border-ui-line bg-surface-raised p-2">
              <legend className="sr-only">{displayName(snap.state, p)} contra {m.name}</legend>
              <span>{displayName(snap.state, p)} vs {m.name}</span>
              <span className="flex gap-1">
                {(['escaped', 'caught'] as const).map((r) => (
                  <label key={r} className={`btn btn-small cursor-pointer ${(res[k] ?? 'escaped') === r ? 'bg-ink text-parchment-50' : 'bg-surface'} focus-within:ring-2 focus-within:ring-accent-blue`}>
                    <input type="radio" className="sr-only" name={k} checked={(res[k] ?? 'escaped') === r} onChange={() => setRes({ ...res, [k]: r })} />
                    {r === 'escaped' ? 'Escapó' : 'Lo atrapó'}
                  </label>
                ))}
              </span>
            </fieldset>
          );
        }),
      )}
      <input className="input" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota opcional (cosas malas aplicadas, etc.)" />
      <button className="btn-go w-full" disabled={pending}>Registrar huida</button>
    </form>
  );
}

function OtherForm() {
  const { send, pending } = useRoom();
  const [text, setText] = useState('');
  return (
    <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) void send({ type: 'combat.resolveOther', text: text.trim() }); }}>
      <input className="input" maxLength={200} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej.: el monstruo fue eliminado con una carta, sin nivel" data-testid="other-text" />
      <button className="btn-go w-full" disabled={pending || !text.trim()}>Confirmar resolución</button>
    </form>
  );
}
