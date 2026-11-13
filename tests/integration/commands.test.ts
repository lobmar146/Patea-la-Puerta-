// Integración con PostgreSQL real: permisos, idempotencia y concurrencia en la capa de comandos.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Action } from '../../src/shared/commands';
import type { GameState } from '../../src/shared/types';
import { prisma } from '../../src/server/db';
import { createRoom, joinRoom, loadRoom, processCommand } from '../../src/server/rooms';
import { hashToken } from '../../src/server/sessions';

interface Who {
  pid: string;
  hash: string;
  token: string;
}
let code = '';
let roomId = '';
let dm: Who, p1: Who, p2: Who, tv: Who;

async function version() {
  return (await loadRoom(roomId)).version;
}
async function state(): Promise<GameState> {
  return (await loadRoom(roomId)).state;
}
async function cmd(who: Who, action: Action, opts: { commandId?: string; expectedVersion?: number } = {}) {
  return processCommand(code, who.hash, {
    commandId: opts.commandId ?? randomUUID(),
    expectedVersion: opts.expectedVersion ?? (await version()),
    action,
  });
}

beforeAll(async () => {
  const r = await createRoom({ name: 'Dana' });
  code = r.code;
  roomId = r.roomId;
  dm = { pid: r.participantId, token: r.token, hash: hashToken(r.token) };
  const j = async (name: string, role: 'player' | 'spectator') => {
    const x = await joinRoom(code, undefined, { name, role });
    return { pid: x.participantId, token: x.token, hash: hashToken(x.token) };
  };
  p1 = await j('Pablo', 'player');
  p2 = await j('Lu', 'player');
  tv = await j('TV', 'spectator');
});

afterAll(async () => {
  await prisma.room.delete({ where: { id: roomId } }).catch(() => undefined);
  await prisma.$disconnect();
});

describe('sesiones', () => {
  it('reingresar con la misma cookie no duplica al participante', async () => {
    const before = await prisma.participant.count({ where: { roomId } });
    const again = await joinRoom(code, p1.token, { name: 'Pablo otra vez', role: 'player' });
    expect(again.reused).toBe(true);
    expect(again.participantId).toBe(p1.pid);
    expect(await prisma.participant.count({ where: { roomId } })).toBe(before);
  });

  it('los tokens se guardan hasheados', async () => {
    const s = await prisma.session.findMany({ where: { roomId } });
    expect(s.every((x) => x.tokenHash.length === 64 && x.tokenHash !== dm.token)).toBe(true);
  });
});

describe('permisos en el servidor', () => {
  it('espectador: rechazado aunque mande comandos a mano', async () => {
    const r = await cmd(tv, { type: 'character.update', targetId: p1.pid, patch: { level: 5 } });
    expect(r.result).toMatchObject({ ok: false, code: 'forbidden' });
    expect((await state()).characters[p1.pid].level).toBe(1);
  });

  it('jugador no edita a otro', async () => {
    const r = await cmd(p1, { type: 'character.update', targetId: p2.pid, patch: { level: 5 } });
    expect(r.result).toMatchObject({ ok: false, code: 'forbidden' });
  });

  it('sesión inválida', async () => {
    const r = await processCommand(code, hashToken('inventado'), { commandId: randomUUID(), expectedVersion: 0, action: { type: 'game.start' } });
    expect(r.result).toMatchObject({ ok: false, code: 'unauthorized' });
  });
});

describe('idempotencia y concurrencia', () => {
  it('reenviar el mismo commandId no repite la subida de nivel', async () => {
    const commandId = randomUUID();
    const v = await version();
    const first = await cmd(p1, { type: 'character.update', targetId: p1.pid, patch: { level: 2 } }, { commandId, expectedVersion: v });
    const again = await cmd(p1, { type: 'character.update', targetId: p1.pid, patch: { level: 2 } }, { commandId, expectedVersion: v });
    expect(first.result).toMatchObject({ ok: true, duplicate: false, version: v + 1 });
    expect(again.result).toMatchObject({ ok: true, duplicate: true, version: v + 1 });
    expect(await version()).toBe(v + 1);
    expect(await prisma.processedCommand.count({ where: { roomId, commandId } })).toBe(1);
  });

  it('el mismo commandId en paralelo se aplica una sola vez', async () => {
    await cmd(dm, { type: 'game.start' });
    const commandId = randomUUID();
    const v = await version();
    const results = await Promise.all(
      [1, 2, 3].map(() => cmd(dm, { type: 'turn.kickDoor' }, { commandId, expectedVersion: v })),
    );
    expect(results.filter((r) => r.changed)).toHaveLength(1);
    expect(results.every((r) => r.result.ok)).toBe(true);
    expect(await version()).toBe(v + 1);
    expect((await state()).turn.phase).toBe('kickDoor');
  });

  it('dos comandos concurrentes con la misma versión: uno gana y el otro recibe conflicto', async () => {
    const v = await version();
    const [a, b] = await Promise.all([
      cmd(p1, { type: 'character.update', targetId: p1.pid, patch: { gear: 3 } }, { expectedVersion: v }),
      cmd(dm, { type: 'character.update', targetId: p1.pid, patch: { gear: 7 } }, { expectedVersion: v }),
    ]);
    const ok = [a, b].filter((r) => r.result.ok);
    const conflict = [a, b].filter((r) => !r.result.ok);
    expect(ok).toHaveLength(1);
    expect(conflict).toHaveLength(1);
    expect(conflict[0].result).toMatchObject({ code: 'conflict', version: v + 1 });
    const gear = (await state()).characters[p1.pid].gear;
    expect(gear).toBe(ok[0] === a ? 3 : 7);
    expect(await version()).toBe(v + 1);
  });

  it('jugador fuera de turno no avanza la fase', async () => {
    const r = await cmd(p2, { type: 'turn.doorResult', result: 'curse' });
    expect(r.result).toMatchObject({ ok: false, code: 'forbidden' });
  });

  it('victoria: las recompensas se aplican una sola vez aunque se reintente', async () => {
    await cmd(dm, { type: 'turn.doorResult', result: 'monster', monster: { name: 'Babosa', strength: 1, levels: 2, treasures: 1 } });
    const lvl = (await state()).characters[dm.pid].level;
    const victory: Action = { type: 'combat.resolveVictory', rewards: [{ participantId: dm.pid, levels: 2, note: '' }], note: '' };
    const commandId = randomUUID();
    const v = await version();
    await cmd(dm, victory, { commandId, expectedVersion: v });
    await cmd(dm, victory, { commandId, expectedVersion: v }); // reintento del mismo comando
    const other = await cmd(dm, victory); // comando nuevo: ya no hay combate
    expect(other.result).toMatchObject({ ok: false, code: 'invalid' });
    const s = await state();
    expect(s.characters[dm.pid].level).toBe(lvl + 2);
    expect(s.turn.phase).toBe('charity');
    const events = await prisma.gameEvent.count({ where: { roomId, type: 'combat.victory' } });
    expect(events).toBe(1);
  });

  it('quitar a un participante revoca su sesión', async () => {
    const r = await cmd(dm, { type: 'dm.removeParticipant', participantId: tv.pid });
    expect(r.result.ok).toBe(true);
    const again = await cmd(tv, { type: 'game.pause' });
    expect(again.result).toMatchObject({ ok: false, code: 'unauthorized' });
  });
});
