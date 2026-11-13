import { describe, expect, it } from 'vitest';
import type { Action } from '../../src/shared/commands';
import { GameError, addParticipant, applyAction, createInitialState, undoFor } from '../../src/shared/engine';
import { activeParticipantId, almostWinners, avatarOf, combatTotals, identityLine, matchesCondition, noPursue } from '../../src/shared/rules';
import { actionSchema } from '../../src/shared/commands';
import { computeAwards, podium } from '../../src/shared/awards';
import { coaching, equipmentWarnings, gearFromItems, sale } from '../../src/shared/novice';
import type { GameState, Item } from '../../src/shared/types';

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

describe('aviso de nivel 9', () => {
  it('avisa al llegar a 9 (una vez) y lista a quienes están a un paso', () => {
    let s = started();
    const r = applyAction(s, 'p1', { type: 'character.update', targetId: 'p1', patch: { level: 9 } }, { now, id });
    expect(r.events.map((e) => e.type)).toContain('level.nine');
    expect(r.events.find((e) => e.type === 'level.nine')?.message).toContain('solo se gana matando un monstruo');
    s = r.state;
    expect(almostWinners(s)).toEqual(['p1']);
    expect(applyAction(s, 'p1', { type: 'character.update', targetId: 'p1', patch: { gear: 1 } }, { now, id }).events.map((e) => e.type)).not.toContain('level.nine');
    s = run(s, 'p1', { type: 'character.update', targetId: 'p1', patch: { level: 10 } });
    expect(almostWinners(s)).toEqual([]);
    expect(s.levelAlert?.participantId).toBe('p1');
  });
});

describe('deshacer', () => {
  it('deshace el último cambio manual, una sola vez y solo si no hubo otro después', () => {
    let s = started();
    s = run(s, 'p1', { type: 'character.update', targetId: 'p1', patch: { gear: 3 } });
    s = run(s, 'p1', { type: 'character.update', targetId: 'p1', patch: { level: 4 } });
    expect(undoFor(s, 'p1')?.label).toBe('nivel 1→4');
    // Las notas se guardan solas y no pisan lo que se puede deshacer.
    s = run(s, 'p1', { type: 'character.update', targetId: 'p1', patch: { notes: 'Botas' } });
    expect(undoFor(s, 'p1')).toBeNull(); // el personaje cambió después
    s = run(s, 'p1', { type: 'character.update', targetId: 'p1', patch: { level: 9 } });
    expectError(() => applyAction(s, 'p2', { type: 'character.undo', targetId: 'p1' }, { now, id }), 'forbidden');
    const r = applyAction(s, 'p1', { type: 'character.undo', targetId: 'p1' }, { now, id });
    expect(r.state.characters.p1.level).toBe(4);
    expect(r.state.characters.p1.gear).toBe(3);
    expect(r.events[0].message).toContain('deshizo «nivel 4→9»');
    expectError(() => applyAction(r.state, 'p1', { type: 'character.undo', targetId: 'p1' }, { now, id }), 'invalid');
    // El DM puede deshacer el cambio de otro, y volver a nivel < 10 limpia el aviso de victoria.
    let t = run(r.state, 'dm', { type: 'character.update', targetId: 'p2', patch: { level: 10 } });
    expect(t.levelAlert?.participantId).toBe('p2');
    t = run(t, 'dm', { type: 'character.undo', targetId: 'p2' });
    expect(t.characters.p2.level).toBe(1);
    expect(t.levelAlert).toBeNull();
  });
});

describe('creación y personajes', () => {
  it('sexo: se elige al entrar, se cambia en la partida (maldición) y se valida', () => {
    let s = addParticipant(setup(), { id: 'p3', name: 'Sofi', role: 'player', isDm: false, now, sex: 'female' });
    expect(s.characters.p3.sex).toBe('female');
    expect(s.characters.p1.sex).toBeUndefined();
    expect(identityLine(s.characters.p3)).toBe('♀ Mujer · Humano');
    const r = applyAction(s, 'p3', { type: 'character.update', targetId: 'p3', patch: { sex: 'male' } }, { now, id });
    s = r.state;
    expect(s.characters.p3.sex).toBe('male');
    expect(r.events[0].message).toContain('sexo: hombre');
    s = run(s, 'p3', { type: 'character.update', targetId: 'p3', patch: { races: ['Elfo'], classes: ['Mago'] } });
    expect(identityLine(s.characters.p3)).toBe('♂ Hombre · Elfo · Mago');
    expect(actionSchema.safeParse({ type: 'character.update', targetId: 'p3', patch: { sex: 'otro' } }).success).toBe(false);
  });


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

  it('condiciones del monstruo: suman según sexo, raza o clase de quien pelea y ayuda', () => {
    let s = inCombat();
    s = run(s, 'p1', { type: 'character.update', targetId: 'p1', patch: { sex: 'male', races: ['Elfo'] } });
    s = run(s, 'p2', { type: 'character.update', targetId: 'p2', patch: { sex: 'female', classes: ['Clérigo'] } });
    const m = s.combat!.monsters[0];
    s = run(s, 'p1', { type: 'combat.updateMonster', monsterId: m.id, monster: { ...monster, conditions: [
      { kind: 'sex', value: 'female', bonus: 5, noPursue: false },
      { kind: 'race', value: 'Elfos', bonus: 2, noPursue: true },
      { kind: 'class', value: 'clerigos', bonus: -3, noPursue: false },
    ] } });
    let t = combatTotals(s, s.combat!);
    expect(t.conditionMods).toBe(2); // solo pelea p1 (elfo, hombre)
    expect(t.monsters).toBe(7);
    expect(t.conditions.map((c) => c.label)).toEqual(['+2 contra Elfos (Pablo)']);
    expect(noPursue(s, s.combat!.monsters[0], 'p1')).toBe(true);
    expect(noPursue(s, s.combat!.monsters[0], 'p2')).toBe(false);
    s = run(s, 'p1', { type: 'help.request', toId: 'p2' });
    s = run(s, 'p2', { type: 'help.respond', requestId: s.combat!.helpRequests[0].id, accept: true });
    t = combatTotals(s, s.combat!);
    expect(t.conditionMods).toBe(5 + 2 - 3);
    // Sin carta de raza se cuenta como humano; quitar las condiciones las borra.
    expect(matchesCondition({ sex: undefined, races: [], classes: [] }, { kind: 'race', value: 'Humanos' })).toBe(true);
    expect(matchesCondition({ sex: undefined, races: [], classes: ['Ladrón'] }, { kind: 'class', value: 'ladrones' })).toBe(true);
    s = run(s, 'p1', { type: 'combat.updateMonster', monsterId: m.id, monster });
    expect(s.combat!.monsters[0].conditions).toBeUndefined();
    expect(actionSchema.safeParse({ type: 'combat.addMonster', monster: { strength: 3, conditions: [{ kind: 'sex', value: 'otro', bonus: 2 }] } }).success).toBe(false);
    expect(actionSchema.safeParse({ type: 'combat.addMonster', monster: { strength: 3, conditions: [{ kind: 'race', value: 'Elfo', bonus: 0 }] } }).success).toBe(false);
  });

  it('objetos de un solo uso: no suman al equipo, se gastan en el combate y su bonus se va al terminar', () => {
    let s = inCombat();
    const potion = { id: 'pot-1', name: 'Poción de fuego', bonus: 3, slot: 'other' as const, big: false, equipped: true, oneShot: true };
    const sword = { id: 'sw-1', name: 'Espada', bonus: 2, slot: 'hand' as const, big: false, equipped: true };
    s = run(s, 'p2', { type: 'character.setItems', targetId: 'p2', items: [potion, sword] });
    expect(s.characters.p2.gear).toBe(2);
    expectError(() => applyAction(s, 'p2', { type: 'combat.useItem', itemId: 'sw-1', side: 'players' }, { now, id }), 'invalid');
    expectError(() => applyAction(s, 'p1', { type: 'combat.useItem', itemId: 'pot-1', side: 'players' }, { now, id }), 'invalid');
    s = run(s, 'p2', { type: 'combat.useItem', itemId: 'pot-1', side: 'players' });
    expect(s.characters.p2.items?.map((i) => i.id)).toEqual(['sw-1']);
    expect(s.combat!.modifiers).toMatchObject([{ side: 'players', value: 3, label: 'Poción de fuego', addedBy: 'p2' }]);
    expect(combatTotals(s, s.combat!).playerMods).toBe(3);
    s = run(s, 'p1', { type: 'combat.resolveVictory', rewards: [{ participantId: 'p1', levels: 1, note: '' }], note: '' });
    expect(s.combat).toBeNull();
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

describe('avatares, estadísticas y premios', () => {
  it('asigna avatares distintos, respeta el elegido y valida al editar', () => {
    let s = createInitialState('ABCDE', 7);
    s = addParticipant(s, { id: 'a', name: 'A', role: 'player', isDm: true, now, avatar: 'pollo', color: '#123456' });
    s = addParticipant(s, { id: 'b', name: 'B', role: 'player', isDm: false, now });
    expect(s.characters.a).toMatchObject({ avatar: 'pollo', color: '#123456' });
    expect(s.characters.b.avatar).toBeTruthy();
    expect(s.characters.b.avatar).not.toBe('pollo');
    s = run(s, 'b', { type: 'character.update', targetId: 'b', patch: { avatar: 'dragon' } });
    expect(s.characters.b.avatar).toBe('dragon');
    expect(actionSchema.safeParse({ type: 'character.update', targetId: 'b', patch: { avatar: 'nope' } }).success).toBe(false);
  });

  it('las salas viejas sin avatar reciben uno estable', () => {
    const c = { id: 'viejo-123', avatar: undefined };
    expect(avatarOf(c)).toBe(avatarOf(c));
  });

  it('cuenta puertas, maldiciones, ayudas, victorias y huidas', () => {
    let s = run(started(), 'dm', { type: 'dm.setTurn', activeId: 'p1', phase: 'setup' });
    s = run(s, 'p1', { type: 'turn.kickDoor' }, { type: 'turn.doorResult', result: 'monster', monster: { ...monster, strength: 12, treasures: 3 } });
    s = run(s, 'p1', { type: 'help.request', toId: 'dm' }, { type: 'help.request', toId: 'p2' });
    s = run(s, 'dm', { type: 'help.respond', requestId: s.combat!.helpRequests[0].id, accept: false });
    s = run(s, 'p2', { type: 'help.respond', requestId: s.combat!.helpRequests[1].id, accept: true });
    s = run(s, 'p1', { type: 'combat.resolveVictory', rewards: [{ participantId: 'p1', levels: 1, note: '' }], note: '' });
    expect(s.stats!.p1).toMatchObject({ doors: 1, wins: 1, monsters: 1, treasures: 3, biggest: 12, helpAsked: 2 });
    expect(s.stats!.p2.helpGiven).toBe(1);
    expect(s.stats!.dm.helpRefused).toBe(1);

    s = run(s, 'p1', { type: 'turn.charityDone' }, { type: 'turn.end' });
    s = run(s, 'p2', { type: 'turn.kickDoor' }, { type: 'turn.doorResult', result: 'monster', monster });
    const mId = s.combat!.monsters[0].id;
    s = run(s, 'p2', { type: 'combat.resolveFlee', outcomes: [{ participantId: 'p2', monsterId: mId, result: 'escaped' }], note: '' });
    expect(s.stats!.p2).toMatchObject({ doors: 1, escaped: 1 });

    s = run(s, 'dm', { type: 'game.end', winnerId: 'p1' });
    expect(podium(s)[0]).toBe('p1');
    const awards = computeAwards(s, 20);
    const byId = Object.fromEntries(awards.map((a) => [a.id, a]));
    expect(byId.slayer).toMatchObject({ winnerId: 'p1', detail: '1 monstruo vencido' });
    expect(byId.samaritan.winnerId).toBe('p2');
    expect(byId.heartless.winnerId).toBe('dm');
    expect(byId.chicken.winnerId).toBe('p2');
    expect(byId.cursed).toBeUndefined();
  });

  it('las salas viejas sin estadísticas no rompen los premios', () => {
    const s = started();
    delete s.stats;
    expect(computeAwards(s)).toEqual([]);
  });
});

describe('ayudas para novatos', () => {
  const item = (over: Partial<Item> = {}): Item => ({ id: `i-${++n}`, name: 'Casco', bonus: 1, slot: 'head', big: false, equipped: true, ...over });

  it('equipo por espacios: calcula el bonus y valida permisos', () => {
    let s = started();
    const items = [item({ bonus: 2 }), item({ slot: 'twoHands', bonus: 3, big: true }), item({ slot: 'feet', bonus: 1, equipped: false })];
    s = run(s, 'p1', { type: 'character.setItems', targetId: 'p1', items });
    expect(s.characters.p1.gear).toBe(5);
    expect(s.characters.p1.items).toHaveLength(3);
    expectError(() => applyAction(s, 'p1', { type: 'character.setItems', targetId: 'p2', items: [] }), 'forbidden');
    s = run(s, 'dm', { type: 'character.setItems', targetId: 'p1', items: [] });
    expect(s.characters.p1.gear).toBe(0);
    expectError(() => applyAction(s, 'p1', { type: 'character.setItems', targetId: 'p1', items: [items[0], items[0]] }), 'invalid');
  });

  it('avisos de equipo: un casco, dos manos, un objeto grande salvo Enano', () => {
    const items = [item(), item(), item({ slot: 'twoHands' }), item({ slot: 'hand' }), item({ slot: 'other', big: true }), item({ slot: 'armor', big: true })];
    const w = equipmentWarnings(items, { races: [] });
    expect(w.join(' ')).toContain('cabeza');
    expect(w.join(' ')).toContain('3 manos');
    expect(w.join(' ')).toContain('Grande');
    expect(equipmentWarnings(items, { races: ['Enano'] }).join(' ')).not.toContain('Grande');
    expect(equipmentWarnings([item(), item({ equipped: false })], { races: [] })).toEqual([]);
    expect(gearFromItems([item({ bonus: 3 }), item({ bonus: 2, equipped: false })])).toBe(3);
  });

  it('venta: 1000 de oro por nivel y nunca hasta el nivel 10', () => {
    expect(sale([400, 300, 500], 3)).toEqual({ total: 1200, levels: 1, leftover: 200, capped: false });
    expect(sale([1000, 1000, 1000], 8)).toMatchObject({ levels: 1, capped: true });
    expect(sale([500], 9)).toMatchObject({ levels: 0, capped: false });
  });

  it('consejos según la fase y el rol', () => {
    let s = started(); // le toca a dm
    expect(coaching(s, 'dm').now.join(' ')).toContain('Patear la puerta');
    expect(coaching(s, 'p1').now.join(' ')).toContain('Es el turno de Dana');
    s = run(s, 'dm', { type: 'turn.kickDoor' }, { type: 'turn.doorResult', result: 'monster', monster: { ...monster, strength: 9 } });
    expect(coaching(s, 'dm').now.join(' ')).toContain('Vas perdiendo');
    expect(coaching(s, 'dm').now.join(' ')).toContain('5 o 6');
    expect(coaching(s, 'p1').now.join(' ')).toContain('está peleando');
    s = run(s, 'dm', { type: 'character.update', targetId: 'dm', patch: { level: 9, gear: 2, races: ['Enano'] } });
    expect(coaching(s, 'dm').now.join(' ')).toContain('Vas ganando');
    expect(coaching(s, 'dm').now.join(' ')).toContain('nivel 9');
    s = run(s, 'dm', { type: 'combat.resolveVictory', rewards: [], note: '' });
    expect(coaching(s, 'dm').now.join(' ')).toContain('máximo es 6');
  });

  it('práctica: el DM responde pedidos de ayuda por los jugadores de mentira', () => {
    let s = createInitialState('ABCDE', 1);
    s.config.practice = true;
    s = addParticipant(s, { id: 'dm', name: 'Dana', role: 'player', isDm: true, now });
    s = addParticipant(s, { id: 'bot', name: 'Grog', role: 'player', isDm: false, now, bot: true });
    s = addParticipant(s, { id: 'p1', name: 'Pablo', role: 'player', isDm: false, now });
    s = run(s, 'dm', { type: 'game.start' }, { type: 'turn.kickDoor' }, { type: 'turn.doorResult', result: 'monster', monster });
    s = run(s, 'dm', { type: 'help.request', toId: 'bot' }, { type: 'help.request', toId: 'p1' });
    const [toBot, toP1] = s.combat!.helpRequests;
    expectError(() => applyAction(s, 'dm', { type: 'help.respond', requestId: toP1.id, accept: true }), 'forbidden');
    s = run(s, 'dm', { type: 'help.respond', requestId: toBot.id, accept: true });
    expect(s.combat!.helperId).toBe('bot');
    // Fuera de una sala de práctica no vale.
    const normal = structuredClone(s);
    normal.config.practice = false;
    normal.combat!.helperId = null;
    normal.combat!.helpRequests[0].status = 'pending';
    expectError(() => applyAction(normal, 'dm', { type: 'help.respond', requestId: toBot.id, accept: true }), 'forbidden');
  });
});
