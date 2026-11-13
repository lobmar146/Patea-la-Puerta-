import { describe, expect, it } from 'vitest';
import { addParticipant, applyAction, createInitialState } from '../../src/shared/engine';
import type { Action } from '../../src/shared/commands';
import type { EventDTO, GameState, Snapshot } from '../../src/shared/types';
import { soundFor } from '../../src/client/soundRules';

const now = '2026-01-01T00:00:00.000Z';
let n = 0;
let eventId = 0;

function base(): GameState {
  let s = createInitialState('ABCDE', 7);
  s = addParticipant(s, { id: 'dm', name: 'Dana', role: 'player', isDm: true, now });
  s = addParticipant(s, { id: 'p1', name: 'Pablo', role: 'player', isDm: false, now });
  return applyAction(s, 'dm', { type: 'game.start' }, { now }).state;
}

function snap(state: GameState, events: EventDTO[], version: number): Snapshot {
  return { roomId: 'r', code: 'ABCDE', version, state, events, me: { participantId: 'dm', role: 'player', isDm: true }, online: [], expiresAt: now, serverTime: now };
}

/** Aplica una acción y arma el snapshot siguiente con sus eventos nuevos (más nuevo primero). */
function step(prev: Snapshot, actor: string, action: Action): Snapshot {
  const r = applyAction(prev.state, actor, action, { now, id: () => `id-${++n}` });
  const fresh = r.events.map((e) => ({ id: ++eventId, version: prev.version + 1, type: e.type, actorId: actor, message: e.message, createdAt: now })).reverse();
  return snap(r.state, [...fresh, ...prev.events], prev.version + 1);
}

describe('sonidos según lo que pasó', () => {
  const monster = { name: 'Planta', strength: 1, levels: 1, treasures: 1 };

  it('patada, victoria, nivel a mano, huida, turno propio y fin', () => {
    let s = snap(base(), [], 1);
    let next = step(s, 'dm', { type: 'turn.kickDoor' });
    expect(soundFor(s, next, 'p1')).toBe('door');
    s = next;
    next = step(s, 'dm', { type: 'turn.doorResult', result: 'monster', monster });
    expect(soundFor(s, next, 'p1')).toBeNull();
    s = next;
    next = step(s, 'dm', { type: 'combat.resolveVictory', rewards: [{ participantId: 'dm', levels: 1, note: '' }], note: '' });
    expect(soundFor(s, next, 'p1')).toBe('victory');
    s = next;
    next = step(s, 'p1', { type: 'character.update', targetId: 'p1', patch: { level: 3 } });
    expect(soundFor(s, next, 'dm')).toBe('level');
    s = step(step(next, 'dm', { type: 'turn.charityDone' }), 'dm', { type: 'turn.end' });
    expect(soundFor(next, s, 'p1')).toBe('turn');
    expect(soundFor(next, s, 'dm')).toBeNull();
    s = step(step(s, 'p1', { type: 'turn.kickDoor' }), 'p1', { type: 'turn.doorResult', result: 'monster', monster });
    next = step(s, 'p1', { type: 'combat.resolveFlee', outcomes: [], note: '' });
    expect(soundFor(s, next, 'dm')).toBe('boo');
    s = next;
    next = step(s, 'dm', { type: 'game.end', winnerId: 'dm' });
    expect(soundFor(s, next, null)).toBe('win');
  });
});
