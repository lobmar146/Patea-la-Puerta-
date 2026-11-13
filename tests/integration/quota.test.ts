// Tope global de salas: protege la base gratis.
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { config } from '../../src/server/config';
import { prisma } from '../../src/server/db';
import { assertRoomQuota, createRoom } from '../../src/server/rooms';

const saved = { open: config.maxOpenRooms, day: config.maxRoomsPerDay };
const rooms: string[] = [];

afterEach(() => {
  config.maxOpenRooms = saved.open;
  config.maxRoomsPerDay = saved.day;
});
afterAll(async () => {
  await prisma.room.deleteMany({ where: { id: { in: rooms } } });
  await prisma.$disconnect();
});

describe('límite para crear salas', () => {
  it('rechaza crear cuando se llega al tope de salas abiertas o del día', async () => {
    const r = await createRoom({ name: 'Dana' });
    rooms.push(r.roomId);
    const open = await prisma.room.count({ where: { expiresAt: { gt: new Date() } } });
    config.maxOpenRooms = open;
    await expect(createRoom({ name: 'Otra' })).rejects.toMatchObject({ status: 503, message: expect.stringContaining('demasiadas salas abiertas') });
    config.maxOpenRooms = open + 100;
    const today = await prisma.room.count({ where: { createdAt: { gt: new Date(Date.now() - 86_400_000) } } });
    config.maxRoomsPerDay = today;
    await expect(assertRoomQuota()).rejects.toMatchObject({ status: 503, message: expect.stringContaining('hoy') });
    config.maxRoomsPerDay = today + 1;
    await expect(assertRoomQuota()).resolves.toBeUndefined();
  });
});
