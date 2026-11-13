import { describe, expect, it } from 'vitest';
import type { Action } from '../../src/shared/commands';
import { GameError, addParticipant, applyAction, createInitialState } from '../../src/shared/engine';
import { activeParticipantId, combatTotals } from '../../src/shared/rules';
import type { GameState } from '../../src/shared/types';

let n = 0;
const id = () => `id-${++n}`;
const now = '2026-01-01T00:00:00.000Z';

function setup(): GameState {
  let s = createInitialState('ABCDE', 7);
  s = addParticipant(s, { id: 'dm', name: 'Dana', role: 'player', isDm: true, now });
  s = addParticipant(s, { id: 'p1', name: 'Pablo', role: 'player', isDm: false, now });
  s = addParticipant(s, { id: 'p2', name: 'Lu', role: 'player', isDm: false, now });
  s = addParticipant(s, { id: 'tv', name: 'TV', role: 'spectator', isDm: false, now });
  return s;
}

function run(s: GameState, actor: string, ...actions: Action[]): GameState {
  for (const a of actions) s = applyAction(s, actor, a, { now, id }).state;
  return s;
}

function expectError(fn: () => unknown, code: GameError['code']) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(GameError);
    expect((e as GameError).code).toBe(code);
    return;
  }
  throw new Error('se esperaba un error');
}

const started = () => run(setup(), 'dm', { type: 'game.start' });
const monster = { name: 'Planta', strength: 5, levels: 1, treasures: 1 };

describe('creación y personajes', () => {
  it('el DM es jugador con personaje y los espectadores no tienen personaje', () => {
    const s = setup();
    expect(s.participants.dm.isDm).toBe(true);
    expect(s.characters.dm.level).toBe(1);
    expect(s.characters.tv).toBeUndefined();
    expect(s.turn.order).toEqual(['dm', 'p1', 'p2']);
    expect(s.config.sets).toHaveLength(3);
  });

  it('un jugador edita su personaje fuera de su turno pero no el de otro', () => {
    const s = started();
    const r = applyAction(s, 'p1', { type: 'character.update', targetId: 'p1', patch: { level: 3, gear: 4, races: ['Elfo', 'Orco'] } });
    expect(r.state.characters.p1).toMatchObject({ level: 3, gear: 4, races: ['Elfo', 'Orco'] });
    expectError(() => applyAction(s, 'p1', { type: 'character.update', targetId: 'p2', patch: { level: 5 } }), 'forbidden');
  });

  it('el DM puede editar a cualquiera y queda como corrección', () => {
    const r = applyAction(started(), 'dm', { type: 'character.update', targetId: 'p2', patch: { level: 4 } });
    expect(r.state.characters.p2.level).toBe(4);
    expect(r.events[0].type).toBe('dm.correction');
  });

  it('el espectador no puede ejecutar ninguna mutación', () => {
    const s = started();
    const actions: Action[] = [
      { type: 'character.update', targetId: 'p1', patch: { level: 2 } },
      { type: 'turn.kickDoor' },
      { type: 'game.pause' },
    ];
    for (const a of actions) expectError(() => applyAction(s, 'tv', a), 'forbidden');
  });

  it('llegar a nivel 10 solo genera un aviso; el DM confirma', () => {
    let s = run(started(), 'p1', { type: 'character.update', targetId: 'p1', patch: { level: 10 } });
    expect(s.status).toBe('active');
    expect(s.levelAlert).toEqual({ participantId: 'p1', level: 10 });
    expectError(() => applyAction(s, 'p1', { type: 'levelAlert.confirmWinner' }), 'forbidden');
    s = run(s, 'dm', { type: 'levelAlert.confirmWinner' });
    expect(s.status).toBe('finished');
    expect(s.winnerId).toBe('p1');
  });
});

describe('turnos', () => {
  it('cronómetro sincronizado: pausa, reanuda y acumula al acabar el turno', () => {
    const t0 = '2026-01-01T00:00:00.000Z';
    let s = applyAction(setup(), 'dm', { type: 'game.start' }, { now: t0, id }).state;
    expect(s.clock.activeSince).toBe(t0);

    s = applyAction(s, 'dm', { type: 'game.pause' }, { now: '2026-01-01T00:00:10.000Z', id }).state;
    expect(s.clock).toMatchObject({ activeSince: null, turnElapsedMs: 10_000 });
    s = applyAction(s, 'dm', { type: 'game.resume' }, { now: '2026-01-01T00:00:40.000Z', id }).state;
    expect(s.clock.activeSince).toBe('2026-01-01T00:00:40.000Z');

    s = applyAction(s, 'dm', { type: 'turn.kickDoor' }, { now: '2026-01-01T00:00:45.000Z', id }).state;
    s = applyAction(s, 'dm', { type: 'turn.doorResult', result: 'other' }, { now: '2026-01-01T00:00:46.000Z', id }).state;
    s = applyAction(s, 'dm', { type: 'turn.lootRoom' }, { now: '2026-01-01T00:00:47.000Z', id }).state;
    s = applyAction(s, 'dm', { type: 'turn.lootDone' }, { now: '2026-01-01T00:00:48.000Z', id }).state;
    s = applyAction(s, 'dm', { type: 'turn.charityDone' }, { now: '2026-01-01T00:00:49.000Z', id }).state;
    s = applyAction(s, 'dm', { type: 'turn.end' }, { now: '2026-01-01T00:00:50.000Z', id }).state;
    expect(s.clock).toMatchObject({ activeSince: '2026-01-01T00:00:50.000Z', turnElapsedMs: 0 });
    expect(s.clock.totalsByParticipant.dm).toBe(20_000);
    expect(s.clock.totalsByParticipant.p1).toBeUndefined();
  });

  it('solo el jugador activo avanza la fase', () => {
    const s = started();
    expect(activeParticipantId(s)).toBe('dm');
    const s2 = run(s, 'dm', { type: 'dm.setTurn', activeId: 'p1', phase: 'setup' });
    expectError(() => applyAction(s2, 'p2', { type: 'turn.kickDoor' }), 'forbidden');
    expect(run(s2, 'p1', { type: 'turn.kickDoor' }).turn.phase).toBe('kickDoor');
  });

  it('camino de maldición y saqueo hasta pasar el turno', () => {
    let s = run(started(), 'dm', { type: 'turn.kickDoor' }, { type: 'turn.doorResult', result: 'curse' });
    expect(s.turn.phase).toBe('curse');
    s = run(s, 'dm', { type: 'turn.curseResolved' });
    expect(s.turn.phase).toBe('noMonster');
    s = run(s, 'dm', { type: 'turn.lootRoom' }, { type: 'turn.lootDone' });
    expect(s.turn.phase).toBe('charity');
    s = run(s, 'dm', { type: 'turn.charityDone' }, { type: 'turn.end' });
    expect(activeParticipantId(s)).toBe('p1');
    expect(s.turn).toMatchObject({ phase: 'setup', turnNumber: 2 });
  });

  it('otra carta lleva a buscar problemas, que exige confirmación y entra en combate', () => {
    const s = run(started(), 'dm', { type: 'turn.kickDoor' }, { type: 'turn.doorResult', result: 'other' });
    expect(s.turn.phase).toBe('noMonster');
    const s2 = run(s, 'dm', { type: 'turn.lookForTrouble', confirmed: true, monster });
    expect(s2.turn.phase).toBe('combat');
    expect(s2.combat?.origin).toBe('trouble');
  });

  it('no se puede saltar fases', () => {
    expectError(() => applyAction(started(), 'dm', { type: 'turn.end' }), 'invalid');
    expectError(() => applyAction(started(), 'dm', { type: 'turn.lootRoom' }), 'invalid');
  });

  it('en pausa no se avanza el turno', () => {
    const s = run(started(), 'dm', { type: 'game.pause' });
    expectError(() => applyAction(s, 'dm', { type: 'turn.kickDoor' }), 'invalid');
  });

  it('el DM corrige turno y fase', () => {
    const s = run(started(), 'dm', { type: 'dm.setTurn', activeId: 'p2', phase: 'charity' });
    expect(activeParticipantId(s)).toBe('p2');
    expect(s.turn.phase).toBe('charity');
    expectError(() => applyAction(s, 'p2', { type: 'dm.setTurn', activeId: 'p2', phase: 'setup' }), 'forbidden');
  });
});

describe('combate', () => {
  function inCombat() {
    let s = run(started(), 'dm', { type: 'dm.setTurn', activeId: 'p1', phase: 'setup' });
    s = run(s, 'p1', { type: 'turn.kickDoor' }, { type: 'turn.doorResult', result: 'monster', monster });
    return s;
  }

  it('suma poder del jugador, ayudante y modificadores temporales', () => {
    let s = inCombat();
    s = run(s, 'p1', { type: 'character.update', targetId: 'p1', patch: { level: 2, gear: 3 } });
    s = run(s, 'p2', { type: 'character.update', targetId: 'p2', patch: { level: 3, otherMods: 1 } });
    s = run(s, 'p1', { type: 'help.request', toId: 'p2' });
    const req = s.combat!.helpRequests[0];
    s = run(s, 'p2', { type: 'help.respond', requestId: req.id, accept: true });
    s = run(s, 'dm', { type: 'combat.addModifier', side: 'monsters', value: 5, label: 'Enfurecido' });
    s = run(s, 'p1', { type: 'combat.addModifier', side: 'players', value: 2, label: 'Poción' });
    const t = combatTotals(s, s.combat!);
    expect(t).toMatchObject({ fighter: 5, helper: 4, playerMods: 2, players: 11, monsters: 10, diff: 1 });
    expect(s.turn.phase).toBe('combat'); // nunca se declara victoria automática
  });

  it('ayuda: no a uno mismo, solo el invitado responde, un solo ayudante', () => {
    let s = inCombat();
    expectError(() => applyAction(s, 'p1', { type: 'help.request', toId: 'p1' }), 'invalid');
    expectError(() => applyAction(s, 'p1', { type: 'help.request', toId: 'tv' }), 'invalid');
    s = run(s, 'p1', { type: 'help.request', toId: 'p2' }, { type: 'help.request', toId: 'dm' });
    const [toP2, toDm] = s.combat!.helpRequests;
    expectError(() => applyAction(s, 'dm', { type: 'help.respond', requestId: toP2.id, accept: true }), 'forbidden');
    s = run(s, 'p2', { type: 'help.respond', requestId: toP2.id, accept: false });
    expect(s.combat!.helperId).toBeNull();
    s = run(s, 'dm', { type: 'help.respond', requestId: toDm.id, accept: true });
    expect(s.combat!.helperId).toBe('dm');
    expectError(() => applyAction(s, 'p1', { type: 'help.request', toId: 'p2' }), 'invalid');
  });

  it('victoria aplica niveles una sola vez, limpia temporales y pasa a caridad', () => {
    let s = inCombat();
    s = run(s, 'p1', { type: 'combat.addModifier', side: 'players', value: 3, label: '' });
    s = run(s, 'p1', { type: 'combat.resolveVictory', rewards: [{ participantId: 'p1', levels: 1, note: '' }], note: '' });
    expect(s.characters.p1.level).toBe(2);
    expect(s.combat).toBeNull();
    expect(s.turn.phase).toBe('charity');
    expectError(() => applyAction(s, 'p1', { type: 'combat.resolveVictory', rewards: [{ participantId: 'p1', levels: 1, note: '' }], note: '' }), 'invalid');
  });

  it('no concede niveles al ayudante salvo que se indique', () => {
    let s = inCombat();
    s = run(s, 'p1', { type: 'help.request', toId: 'p2' });
    s = run(s, 'p2', { type: 'help.respond', requestId: s.combat!.helpRequests[0].id, accept: true });
    s = run(s, 'p1', { type: 'combat.resolveVictory', rewards: [{ participantId: 'p1', levels: 1, note: '' }], note: '' });
    expect(s.characters.p2.level).toBe(1);
  });

  it('recompensas solo para participantes del combate', () => {
    const s = inCombat();
    expectError(() => applyAction(s, 'p1', { type: 'combat.resolveVictory', rewards: [{ participantId: 'p2', levels: 1, note: '' }], note: '' }), 'invalid');
  });

  it('huida registra resultados por monstruo y otra resolución exige texto', () => {
    const s = inCombat();
    const mId = s.combat!.monsters[0].id;
    const r = applyAction(s, 'p1', { type: 'combat.resolveFlee', outcomes: [{ participantId: 'p1', monsterId: mId, result: 'caught' }], note: '' });
    expect(r.events[0].message).toContain('fue atrapado por Planta');
    expect(r.state.turn.phase).toBe('charity');
    expectError(() => applyAction(s, 'p2', { type: 'combat.resolveOther', text: 'x' }), 'forbidden');
  });
});

describe('administración', () => {
  it('transferir DM y quitar participantes', () => {
    let s = started();
    s = run(s, 'dm', { type: 'dm.transfer', toId: 'p1' });
    expect(s.participants.dm.isDm).toBe(false);
    expect(s.participants.p1.isDm).toBe(true);
    expectError(() => applyAction(s, 'dm', { type: 'game.pause' }), 'forbidden');
    const r = applyAction(s, 'p1', { type: 'dm.removeParticipant', participantId: 'p2' });
    expect(r.revokeParticipant).toBe('p2');
    expect(r.state.turn.order).toEqual(['dm', 'p1']);
  });

  it('el orden manual debe incluir a todos los jugadores una vez', () => {
    const s = setup();
    expectError(() => applyAction(s, 'dm', { type: 'order.set', order: ['p1', 'dm'] }), 'invalid');
    expect(run(s, 'dm', { type: 'order.set', order: ['p2', 'p1', 'dm'] }).turn.order).toEqual(['p2', 'p1', 'dm']);
  });
});
