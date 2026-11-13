// Revancha: sala nueva con el mismo grupo, armada por el DM desde el podio.
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import type { Action } from '../../src/shared/commands';
import { prisma } from '../../src/server/db';
import { createRematch, createRoom, findSession, joinRematch, joinRoom, loadRoom, processCommand } from '../../src/server/rooms';
import { hashToken } from '../../src/server/sessions';

const rooms: string[] = [];

afterAll(async () => {
  await prisma.room.deleteMany({ where: { id: { in: rooms } } });
  await prisma.$disconnect();
});

describe('revancha', () => {
  it('el DM la arma con el mismo grupo y cada uno entra con su sesión vieja', async () => {
    const r = await createRoom({ name: 'Dana' });
    rooms.push(r.roomId);
    const p1 = await joinRoom(r.code, undefined, { name: 'Pablo', role: 'player', avatar: 'mago', color: '#2563eb' });
    const tv = await joinRoom(r.code, undefined, { name: 'TV', role: 'spectator' });
    const cmd = async (token: string, action: Action) => {
      const res = await processCommand(r.code, hashToken(token), { commandId: randomUUID(), expectedVersion: (await loadRoom(r.roomId)).version, action });
      expect(res.result).toMatchObject({ ok: true });
    };
    await cmd(r.token, { type: 'game.start' });
    await cmd(p1.token, { type: 'character.update', targetId: p1.participantId, patch: { level: 6 } });

    await expect(createRematch(r.code, p1.token)).rejects.toMatchObject({ status: 403 });
    await expect(createRematch(r.code, r.token)).rejects.toMatchObject({ status: 409 });

    await cmd(r.token, { type: 'game.end', winnerId: p1.participantId });
    const made = await createRematch(r.code, r.token);
    rooms.push(made.roomId);
    expect(made.reused).toBe(false);
    expect(made.code).not.toBe(r.code);

    const fresh = await loadRoom(made.roomId);
    const st = fresh.state;
    expect(st.status).toBe('lobby');
    const ps = Object.values(st.participants);
    expect(ps.map((p) => p.name).sort()).toEqual(['Dana', 'Pablo', 'TV']);
    expect(ps.find((p) => p.name === 'Dana')?.isDm).toBe(true);
    expect(ps.find((p) => p.name === 'TV')?.role).toBe('spectator');
    const pablo = Object.values(st.characters).find((c) => c.name === 'Pablo');
    expect(pablo?.level).toBe(1);
    expect(pablo?.avatar).toBe('mago');
    expect(pablo?.color).toBe('#2563eb');

    const old = await loadRoom(r.roomId);
    expect(old.state.rematch?.code).toBe(made.code);

    // Repetir el pedido no crea otra sala.
    const again = await createRematch(r.code, r.token);
    expect(again.reused).toBe(true);
    expect(again.code).toBe(made.code);

    const joined = await joinRematch(r.code, p1.token);
    expect(joined.code).toBe(made.code);
    expect(joined.participantId).toBe(old.state.rematch?.map[p1.participantId]);
    const s = await findSession(made.code, joined.token);
    expect(s?.participantId).toBe(joined.participantId);

    await expect(joinRematch(r.code, 'token-falso')).rejects.toMatchObject({ status: 401 });
    expect(tv.code).toBe(r.code);
  });
});
