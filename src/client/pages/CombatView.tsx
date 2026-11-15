import { Hourglass, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { Combat, GameState, Item } from '../../shared/types';
import { almostWinners, combatTotals, conditionTarget, displayName, fleeTarget, helperLevels as elfHelperLevels, isElf, noPursue, playersWinTies } from '../../shared/rules';
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
            {totals.conditionMods ? ` ${totals.conditionMods >= 0 ? '+' : ''}${totals.conditionMods} cond.` : ''}
            {totals.monsterMods ? ` ${totals.monsterMods >= 0 ? '+' : ''}${totals.monsterMods} temp.` : ''}
          </div>
        </div>
      </div>
      {totals.conditions.length > 0 && (
        <ul className={`mt-2 flex flex-wrap justify-center gap-1.5 ${big ? 'text-base' : 'text-xs'}`} data-testid="applied-conditions">
          {totals.conditions.map((c) => (
            <li key={`${c.monsterId}:${c.label}`} className="rounded-full bg-blood/15 px-2.5 py-1 font-bold text-accent-wine">{combat.monsters.length > 1 ? `${c.monsterName}: ` : ''}{c.label}</li>
          ))}
        </ul>
      )}
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
      {(() => {
        const atStake = almostWinners(state).filter((id) => id === combat.fighterId || id === combat.helperId);
        if (!atStake.length || state.status === 'finished') return null;
        return (
          <p className={`mt-2 rounded-xl bg-gold/15 px-3 py-2 text-center font-black text-accent-gold ${big ? 'text-xl' : 'text-sm'}`} data-testid="win-at-stake">
            <GameIcon name="victory" className="mr-1 inline size-5" />¡Si ganan este combate, {atStake.map((id) => displayName(state, id)).join(' o ')} puede ganar la partida!
          </p>
        );
      })()}
    </div>
  );
}

type CombatModal = 'monster' | 'modifier' | 'victory' | 'flee' | 'other' | { monsterId: string } | null;

export function CombatView() {
  const { snap, me, send, pending } = useRoom();
  const [modal, setModal] = useState<CombatModal>(null);
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
  const oneShots = (state.characters[me.id]?.items ?? []).filter((i) => i.oneShot);
  const playersTakeTie = playersWinTies(state, combat.fighterId, combat.helperId);
  const losing = combat.monsters.length > 0 && totals.diff < (playersTakeTie ? 0 : 1);
  const missing = (playersTakeTie ? 0 : 1) - totals.diff;
  // El DM pone al ayudante directo (los jugadores no siempre usan la app); quien pelea se lo pide.
  const dmPicks = me.isDm && state.status === 'active';
  const canAskHelp = !combat.helperId && (dmPicks ? candidates.length > 0 : isFighter && pendingReqs.length === 0 && candidates.some((id) => !combat.helpRequests.some((r) => r.toId === id && r.status === 'rejected')));
  // Victoria sin confirmar: niveles de los monstruos para quien pelea (y el Elfo ayudante). Se vuelve atrás con un toque.
  const winNow = () => {
    const rewards = [{ participantId: combat.fighterId, levels: combat.monsters.reduce((a, m) => a + m.levels, 0), note: '' }];
    if (combat.helperId) rewards.push({ participantId: combat.helperId, levels: elfHelperLevels(state.characters[combat.helperId], combat.monsters.length), note: '' });
    void send({ type: 'combat.resolveVictory', rewards, note: '' });
  };
  // Huida: si no hace falta tirar el dado (no persigue), se registra directo.
  const fleeRolls = [combat.fighterId, ...(combat.helperId ? [combat.helperId] : [])].flatMap((p) => combat.monsters.filter((m) => !noPursue(state, m, p)).map((m) => `${p}:${m.id}`));
  const fleeNow = () => {
    if (fleeRolls.length > 0) return setModal('flee');
    const outcomes = [combat.fighterId, ...(combat.helperId ? [combat.helperId] : [])].flatMap((p) => combat.monsters.map((m) => ({ participantId: p, monsterId: m.id, result: 'escaped' as const })));
    void send({ type: 'combat.resolveFlee', outcomes, note: '' });
  };
  const open = (m: CombatModal) => (m === 'victory' ? winNow() : m === 'flee' ? fleeNow() : m === 'other' ? void send({ type: 'combat.resolveOther', text: '' }) : setModal(m));
  const askHelp = (toId: string) => {
    void send(dmPicks ? { type: 'dm.setHelper', helperId: toId } : { type: 'help.request', toId });
  };

  return (
    <section className="card space-y-4 p-4" data-testid="combat">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold">¡Combate!</h2>
        <span className="chip border-transparent bg-blood/15 text-accent-wine">{displayName(state, combat.fighterId)} pelea</span>
      </div>
      <CombatTotalsPanel state={state} combat={combat} />
      {/* Opciones rápidas arriba de todo: se ven sin scrollear en el celular. */}
      {state.status === 'active' && combat.monsters.length > 0 && (canResolve || isPlayer) && (
        <div data-testid="combat-quick">
          {canResolve && <p className="mb-1.5 text-xs font-bold uppercase tracking-[.12em] text-ui-muted">Resolver combate</p>}
          {oneShots.length > 0 && (
            <button type="button" className="mb-2 flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl bg-accent-brand/10 px-3 text-left text-sm font-bold ring-1 ring-accent-brand/30" onClick={() => setModal('modifier')} data-testid="use-one-shot">
              <span className="truncate">Tenés {oneShots.length === 1 ? `${oneShots[0].name}` : `${oneShots.length} objetos de un solo uso`}: usalo en este combate</span>
              <GameIcon name="card" className="size-5 shrink-0 text-accent-brand" />
            </button>
          )}
          <div className={`grid gap-2 ${canResolve ? 'grid-cols-3' : 'grid-cols-1'}`}>
            {canResolve ? (
              <>
                <button className="btn-go w-full px-2" disabled={pending} onClick={winNow}><GameIcon name="victory" className="size-4 shrink-0" /> Victoria</button>
                <button className="btn-secondary w-full px-2" disabled={pending} onClick={fleeNow}><GameIcon name="flee" className="size-4 shrink-0" /> Huida</button>
                <button className="btn-secondary w-full px-2" disabled={pending} onClick={() => open('other')}><Sparkles aria-hidden className="size-4 shrink-0" /> Otra</button>
              </>
            ) : (
              <button className="btn-secondary w-full" onClick={() => setModal('modifier')}><GameIcon name="card" className="size-5" /> Jugar una carta</button>
            )}
          </div>
        </div>
      )}
      {canResolve && state.status === 'active' && (
        <NextStep
          hasMonsters={combat.monsters.length > 0}
          losing={losing}
          missing={missing}
          helperName={combat.helperId ? displayName(state, combat.helperId) : null}
          waitingFor={dmPicks ? [] : pendingReqs.map((r) => displayName(state, r.toId))}
          dmPicks={dmPicks}
          helpOptions={canAskHelp ? candidates.filter((id) => dmPicks || !combat.helpRequests.some((r) => r.toId === id && r.status === 'rejected')).map((id) => ({ id, name: displayName(state, id) })) : []}
          pending={pending}
          onAskHelp={askHelp}
          onOpen={open}
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
        {(isFighter || dmPicks) && !combat.helperId && candidates.length > 0 && !(losing && canAskHelp) && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="help-candidates">
            {candidates.map((id) => (
              <button key={id} className="btn-blue w-full" disabled={pending || (!dmPicks && pendingReqs.some((r) => r.toId === id))} onClick={() => askHelp(id)}>
                <GameIcon name="help" className="size-5 shrink-0" /> {dmPicks ? `Ayuda ${displayName(state, id)}` : `Pedir ayuda a ${displayName(state, id)}`}
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="font-bold">Monstruos</h3>
        {combat.monsters.length > 0 && (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {combat.monsters.map((monster) => (
              <li key={monster.id} className="flex items-center gap-3 rounded-2xl bg-surface-raised p-2 pr-2.5 ring-1 ring-ui-line/[.08]">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-blood/15 font-display text-2xl font-extrabold text-accent-wine tabular-nums" aria-label={`Nivel de combate ${monster.strength}`}>{monster.strength}</span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate">{monster.name}</strong>
                  <span className="block text-xs text-accent-gold">Al vencer: +{monster.levels} {monster.levels === 1 ? 'nivel' : 'niveles'} · {monster.treasures} {monster.treasures === 1 ? 'tesoro' : 'tesoros'}</span>
                  {!!monster.conditions?.length && (
                    <span className="mt-0.5 block text-xs text-ui-muted" data-testid="monster-conditions">
                      {monster.conditions.map((c) => [c.bonus ? `${c.bonus > 0 ? '+' : ''}${c.bonus} contra ${conditionTarget(c)}` : '', c.noPursue ? `no persigue a ${conditionTarget(c)}` : ''].filter(Boolean).join(', ')).join(' · ')}
                    </span>
                  )}
                </span>
                {canEdit && (
                  <span className="flex shrink-0 gap-1">
                    <button className="grid size-10 place-items-center rounded-xl text-ui-muted hover:bg-surface-inset hover:text-ui-fg" disabled={pending} aria-label={`Editar ${monster.name}`} onClick={() => setModal({ monsterId: monster.id })}><Pencil aria-hidden className="size-4" /></button>
                    <button className="grid size-10 place-items-center rounded-xl text-ui-muted hover:bg-blood/15 hover:text-accent-wine" disabled={pending} aria-label={`Quitar ${monster.name}`} onClick={() => send({ type: 'combat.removeMonster', monsterId: monster.id })}><Trash2 aria-hidden className="size-4" /></button>
                  </span>
                )}
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
        <h3 className="font-bold">Bonus temporales <span className="text-xs font-normal text-ui-muted">(cartas, pociones: se borran solos al terminar el combate)</span></h3>
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
          oneShots={oneShots}
          onApply={(side, value, label) => { void send({ type: 'combat.addModifier', side, value, label }); setModal(null); }}
          onUse={(itemId, side) => { void send({ type: 'combat.useItem', itemId, side }); setModal(null); }}
        />
      </Modal>
      <Modal open={modal === 'flee'} title="Registrar huida" onClose={() => setModal(null)}><FleeForm combat={combat} /></Modal>
    </section>
  );
}

/** Guía del combate para quien pelea: qué conviene hacer ahora según el marcador. */
function NextStep({ hasMonsters, losing, missing, helperName, waitingFor, helpOptions, pending, onAskHelp, onOpen, dmPicks = false }: {
  dmPicks?: boolean;
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
          <button key={p.id} className="btn-blue w-full" disabled={pending} onClick={() => onAskHelp(p.id)}><GameIcon name="help" className="size-5 shrink-0" /> {dmPicks ? `Ayuda ${p.name}` : `Pedir ayuda a ${p.name}`}</button>
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

const QUICK_VALUES = [1, 2, 3, 5, 10, -1, -2, -5] as const;

/** Modificador en un toque: elegir bando y tocar un valor. El valor libre queda para casos raros. */
function ModifierForm({ defaultSide, pending, oneShots, onApply, onUse }: {
  defaultSide: 'players' | 'monsters';
  pending: boolean;
  oneShots: Item[];
  onApply: (side: 'players' | 'monsters', value: number, label: string) => void;
  onUse: (itemId: string, side: 'players' | 'monsters') => void;
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
      {oneShots.length > 0 && (
        <div data-testid="one-shots">
          <span className="label">Tus objetos de un solo uso (se gastan)</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {oneShots.map((i) => (
              <button key={i.id} type="button" className="btn w-full justify-between bg-accent-brand/10 text-ui-fg ring-1 ring-accent-brand/30" disabled={pending} onClick={() => onUse(i.id, side)}>
                <span className="truncate">Usar {i.name}</span>
                <b className="font-display tabular-nums text-accent-brand">{i.bonus >= 0 ? '+' : ''}{i.bonus}</b>
              </button>
            ))}
          </div>
        </div>
      )}
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
  const outcomes = people.flatMap((p) => combat.monsters.map((m) => ({ participantId: p, monsterId: m.id, result: noPursue(snap.state, m, p) ? 'escaped' as const : res[`${p}:${m.id}`] ?? 'escaped' })));
  const rolls = people.flatMap((p) => combat.monsters.filter((m) => !noPursue(snap.state, m, p)).map((m) => ({ p, m })));
  // Una sola tirada: un toque con el resultado y listo.
  if (rolls.length === 1) {
    const { p, m } = rolls[0];
    const sendOne = (result: 'escaped' | 'caught') => void send({ type: 'combat.resolveFlee', outcomes: outcomes.map((o) => (o.participantId === p && o.monsterId === m.id ? { ...o, result } : o)), note: '' });
    return (
      <div className="space-y-3" data-testid="flee-form">
        <p>{displayName(snap.state, p)} tira el dado contra {m.name || 'el monstruo'}: escapa con <b data-testid="flee-target">{fleeTarget(snap.state.characters[p])}+</b>{isElf(snap.state.characters[p]) ? ' (Elfo)' : ''}.</p>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-go min-h-16 text-lg" disabled={pending} onClick={() => sendOne('escaped')}>Escapó</button>
          <button className="btn-primary min-h-16 text-lg" disabled={pending} onClick={() => sendOne('caught')}>Lo atrapó</button>
        </div>
      </div>
    );
  }
  return (
    <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); void send({ type: 'combat.resolveFlee', outcomes, note: note.trim() }); }} data-testid="flee-form">
      <div className="flex items-center gap-3">
        <Illustration name="flee" className="w-14 shrink-0" />
        <p>Tiren el dado físico por cada monstruo (en el juego base, 5 o más escapa; el Elfo, 4 o más). Registren el resultado; las consecuencias se aplican a mano.</p>
      </div>
      {people.map((p) =>
        combat.monsters.map((m) => {
          const k = `${p}:${m.id}`;
          if (noPursue(snap.state, m, p)) {
            return (
              <p key={k} className="flex items-center justify-between gap-2 rounded border border-moss/40 bg-moss/10 p-2" data-testid="no-pursue">
                <span>{displayName(snap.state, p)} vs {m.name}</span>
                <b className="text-accent-moss">No lo persigue: escapa solo</b>
              </p>
            );
          }
          return (
            <fieldset key={k} className="flex flex-wrap items-center justify-between gap-2 rounded border border-ui-line bg-surface-raised p-2">
              <legend className="sr-only">{displayName(snap.state, p)} contra {m.name}</legend>
              <span>{displayName(snap.state, p)} vs {m.name} <span className="text-xs text-ui-muted" data-testid="flee-target">· escapa con {fleeTarget(snap.state.characters[p])}+{isElf(snap.state.characters[p]) ? ' (Elfo)' : ''}</span></span>
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

