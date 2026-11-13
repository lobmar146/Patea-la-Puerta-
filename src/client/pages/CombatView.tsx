import { useState } from 'react';
import type { Combat, GameState } from '../../shared/types';
import { combatTotals, displayName } from '../../shared/rules';
import { Illustration } from '../components/Illustration';
import { MonsterForm } from '../components/MonsterForm';
import { useRoom } from '../useRoom';

export function diffText(diff: number) {
  if (diff > 0) return `Los jugadores superan por ${diff}`;
  if (diff < 0) return `Los monstruos superan por ${-diff}`;
  return 'Empate (en el juego base gana el monstruo, salvo cartas o clases que digan otra cosa)';
}

export function CombatTotalsPanel({ state, combat, big = false }: { state: GameState; combat: Combat; big?: boolean }) {
  const t = combatTotals(state, combat);
  const num = big ? 'text-8xl' : 'text-5xl';
  return (
    <div data-testid="combat-totals">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
        <div className="rounded-lg border-2 border-ink bg-royal/10 p-2">
          <div className={`font-bold ${big ? 'text-3xl' : ''}`}>🛡 Jugadores</div>
          <div className={`${num} font-black tabular-nums`} data-testid="players-total">{t.players}</div>
          <div className={big ? 'text-xl' : 'text-xs'}>
            {displayName(state, combat.fighterId)} {t.fighter}
            {combat.helperId ? ` + ${displayName(state, combat.helperId)} ${t.helper}` : ''}
            {t.playerMods ? ` ${t.playerMods >= 0 ? '+' : ''}${t.playerMods} temp.` : ''}
          </div>
        </div>
        <div className={`font-black ${big ? 'text-5xl' : 'text-2xl'}`}>VS</div>
        <div className="rounded-lg border-2 border-ink bg-blood/10 p-2">
          <div className={`font-bold ${big ? 'text-3xl' : ''}`}>👹 Monstruos</div>
          <div className={`${num} font-black tabular-nums`} data-testid="monsters-total">{t.monsters}</div>
          <div className={big ? 'text-xl' : 'text-xs'}>
            base {t.monsterBase}
            {t.monsterMods ? ` ${t.monsterMods >= 0 ? '+' : ''}${t.monsterMods} temp.` : ''}
          </div>
        </div>
      </div>
      <p className={`mt-2 text-center font-bold ${big ? 'text-3xl' : 'text-lg'}`} data-testid="combat-diff">
        {t.diff > 0 ? '▲ ' : t.diff < 0 ? '▼ ' : '＝ '}
        {diffText(t.diff)}
      </p>
    </div>
  );
}

export function CombatView() {
  const { snap, me, send, pending } = useRoom();
  const [adding, setAdding] = useState(false);
  const [modSide, setModSide] = useState<'players' | 'monsters'>('monsters');
  const [modValue, setModValue] = useState('');
  const [modLabel, setModLabel] = useState('');
  const [mode, setMode] = useState<'victory' | 'flee' | 'other' | null>(null);
  if (!snap || !me || !snap.state.combat) return null;
  const { state } = snap;
  const combat = snap.state.combat;
  const isFighter = combat.fighterId === me.id;
  const canEdit = isFighter || combat.helperId === me.id || me.isDm;
  const canResolve = isFighter || me.isDm;
  const isPlayer = me.role === 'player';
  const candidates = state.turn.order.filter((id) => id !== combat.fighterId && id !== combat.helperId);
  const pendingReqs = combat.helpRequests.filter((r) => r.status === 'pending');

  return (
    <section className="card space-y-4 p-4" data-testid="combat">
      <div className="flex items-center gap-3">
        <Illustration name="monster" className="w-16 shrink-0" />
        <h2 className="text-2xl font-black">¡Combate!</h2>
      </div>
      <CombatTotalsPanel state={state} combat={combat} />
      <p className="text-sm">La app no declara la victoria: cartas y habilidades pueden cambiarlo todo. Confirmen en la mesa.</p>

      <div>
        <h3 className="font-bold">Monstruos</h3>
        <ul className="space-y-1">
          {combat.monsters.length === 0 && <li className="italic">Todavía no hay monstruos cargados.</li>}
          {combat.monsters.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded border border-ink bg-white px-2 py-1">
              <span><b>{m.name}</b> · fuerza {m.strength} · {m.levels} nivel(es) · {m.treasures} tesoro(s)</span>
              {canEdit && <button className="btn-secondary btn-small" disabled={pending} aria-label={`Quitar ${m.name}`} onClick={() => send({ type: 'combat.removeMonster', monsterId: m.id })}>Quitar</button>}
            </li>
          ))}
        </ul>
        {canEdit && (adding ? (
          <div className="mt-2 rounded-lg border-2 border-ink bg-white p-3">
            <MonsterForm submitLabel="Sumar monstruo" disabled={pending} onSubmit={(m) => { void send({ type: 'combat.addMonster', monster: m }); setAdding(false); }} />
          </div>
        ) : (
          <button className="btn-secondary btn-small mt-2" onClick={() => setAdding(true)}>+ Otro monstruo</button>
        ))}
      </div>

      <div>
        <h3 className="font-bold">Modificadores temporales</h3>
        <p className="text-xs">Pociones, potenciadores, maldiciones de combate… desaparecen al terminar el combate.</p>
        <ul className="my-1 space-y-1">
          {combat.modifiers.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded border border-ink bg-white px-2 py-1">
              <span>{m.side === 'players' ? '🛡 Jugadores' : '👹 Monstruos'} {m.value >= 0 ? '+' : ''}{m.value}{m.label ? ` · ${m.label}` : ''} <span className="text-xs">({displayName(state, m.addedBy)})</span></span>
              {(m.addedBy === me.id || isFighter || me.isDm) && <button className="btn-secondary btn-small" disabled={pending} onClick={() => send({ type: 'combat.removeModifier', modifierId: m.id })}>Quitar</button>}
            </li>
          ))}
        </ul>
        {isPlayer && (
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); const v = Number(modValue); if (!modValue || Number.isNaN(v)) return; void send({ type: 'combat.addModifier', side: modSide, value: v, label: modLabel.trim() }); setModValue(''); setModLabel(''); }}>
            <label>
              <span className="label">Bando</span>
              <select className="input" value={modSide} onChange={(e) => setModSide(e.target.value as 'players' | 'monsters')}>
                <option value="monsters">Monstruos</option>
                <option value="players">Jugadores</option>
              </select>
            </label>
            <label className="w-24">
              <span className="label">Valor</span>
              <input className="input" type="number" min={-99} max={99} value={modValue} onChange={(e) => setModValue(e.target.value)} placeholder="+5" data-testid="mod-value" />
            </label>
            <label className="min-w-[8rem] flex-1">
              <span className="label">Motivo</span>
              <input className="input" maxLength={60} value={modLabel} onChange={(e) => setModLabel(e.target.value)} placeholder="Opcional" />
            </label>
            <button className="btn-secondary" disabled={pending || !modValue}>Sumar</button>
          </form>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2">
          <Illustration name="help" className="w-10 shrink-0" />
          <h3 className="font-bold">Ayuda</h3>
        </div>
        {combat.helperId ? (
          <p className="mt-1">
            Ayuda: <b>{displayName(state, combat.helperId)}</b> (suma su poder).{' '}
            {(isFighter || combat.helperId === me.id || me.isDm) && <button className="btn-secondary btn-small" disabled={pending} onClick={() => send({ type: 'help.dismissHelper' })}>Quitar ayudante</button>}
          </p>
        ) : (
          <p className="mt-1 text-sm">Sin ayudante. Solo se permite uno a la vez.</p>
        )}
        {pendingReqs.map((r) => (
          <p key={r.id} className="mt-1 text-sm">
            ⏳ Esperando respuesta de {displayName(state, r.toId)}{' '}
            {(isFighter || me.isDm) && <button className="underline" onClick={() => send({ type: 'help.cancel', requestId: r.id })}>cancelar</button>}
          </p>
        ))}
        {isFighter && !combat.helperId && candidates.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {candidates.map((id) => (
              <button key={id} className="btn-blue btn-small" disabled={pending || pendingReqs.some((r) => r.toId === id)} onClick={() => send({ type: 'help.request', toId: id })}>
                Pedir ayuda a {displayName(state, id)}
              </button>
            ))}
          </div>
        )}
      </div>

      {canResolve && (
        <div className="border-t-2 border-ink pt-3">
          <h3 className="font-bold">Resolver combate</h3>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button className={mode === 'victory' ? 'btn-go' : 'btn-secondary'} onClick={() => setMode('victory')}>🏆 Victoria</button>
            <button className={mode === 'flee' ? 'btn-go' : 'btn-secondary'} onClick={() => setMode('flee')}>🏃 Huida</button>
            <button className={mode === 'other' ? 'btn-go' : 'btn-secondary'} onClick={() => setMode('other')}>✳ Otra</button>
          </div>
          {mode === 'victory' && <VictoryForm combat={combat} />}
          {mode === 'flee' && <FleeForm combat={combat} />}
          {mode === 'other' && <OtherForm />}
        </div>
      )}
    </section>
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
  const rewards = [{ participantId: combat.fighterId, levels: Number(fighter) || 0, note: '' }];
  if (combat.helperId) rewards.push({ participantId: combat.helperId, levels: Number(helper) || 0, note: '' });
  return (
    <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); void send({ type: 'combat.resolveVictory', rewards, note: note.trim() }); }} data-testid="victory-form">
      <div className="flex items-center gap-3">
        <Illustration name="rewards" className="w-14 shrink-0" />
        <p>Tesoros a robar según los monstruos cargados: <b>{treasures}</b>. Revisá y confirmá los niveles que corresponden.</p>
      </div>
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
      <button className="btn-go w-full" disabled={pending}>Confirmar victoria y aplicar una sola vez</button>
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
            <fieldset key={k} className="flex flex-wrap items-center justify-between gap-2 rounded border border-ink bg-white p-2">
              <legend className="sr-only">{displayName(snap.state, p)} contra {m.name}</legend>
              <span>{displayName(snap.state, p)} vs {m.name}</span>
              <span className="flex gap-1">
                {(['escaped', 'caught'] as const).map((r) => (
                  <label key={r} className={`btn btn-small cursor-pointer ${(res[k] ?? 'escaped') === r ? 'bg-ink text-parchment-50' : 'bg-parchment-50'}`}>
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
