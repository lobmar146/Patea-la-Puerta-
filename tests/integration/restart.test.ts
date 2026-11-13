// Reinicio REAL del backend (proceso nuevo) conservando PostgreSQL, vía HTTP + Socket.IO.
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import type { Action } from '../../src/shared/commands';
import type { CommandResult, Snapshot } from '../../src/shared/types';

const PORT = 3211;
const BASE = `http://localhost:${PORT}`;
let server: ChildProcess | null = null;

async function startServer() {
  // Un solo proceso node (sin npx/tsx intermedios) para que SIGKILL lo corte de verdad.
  server = spawn(process.execPath, ['--import', 'tsx', 'src/server/index.ts'], {
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
    stdio: 'pipe',
  });
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch {
      /* todavía arrancando */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('el servidor no arrancó');
}

async function killServer() {
  if (!server) return;
  const proc = server;
  server = null;
  await new Promise<void>((resolve) => {
    proc.once('exit', () => resolve());
    proc.kill('SIGKILL'); // corte abrupto: nada se guarda "al salir"
  });
  // Verificamos que el proceso anterior realmente dejó de responder.
  for (let i = 0; i < 25; i++) {
    try {
      await fetch(`${BASE}/api/health`);
      await new Promise((r) => setTimeout(r, 200));
    } catch {
      return;
    }
  }
  throw new Error('el servidor anterior sigue respondiendo');
}

async function post(path: string, body: unknown, cookie?: string) {
  const r = await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
  const setCookie = r.headers.get('set-cookie')?.split(';')[0];
  return { status: r.status, json: await r.json(), cookie: setCookie ?? cookie };
}

function connect(code: string, cookie: string): Promise<{ socket: Socket; snap: Snapshot }> {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, { auth: { code }, extraHeaders: { cookie }, transports: ['websocket'], reconnection: false });
    socket.once('snapshot', (snap: Snapshot) => resolve({ socket, snap }));
    socket.once('connect_error', reject);
  });
}

async function send(socket: Socket, action: Action, expectedVersion: number, commandId = randomUUID()): Promise<CommandResult> {
  return socket.timeout(5000).emitWithAck('command', { commandId, expectedVersion, action });
}

describe('recuperación tras reinicio del backend', () => {
  beforeAll(startServer, 60000);
  afterAll(killServer);

  it('conserva sala, roles, turno, combate y personajes; un reintento no repite la acción', async () => {
    const dm = await post('/api/rooms', { name: 'Dana' });
    const code = dm.json.code as string;
    const p1 = await post(`/api/rooms/${code}/join`, { name: 'Pablo', role: 'player' });
    const tv = await post(`/api/rooms/${code}/join`, { name: 'TV', role: 'spectator' });

    let { socket, snap } = await connect(code, dm.cookie!);
    const p1Id = Object.values(snap.state.participants).find((p) => p.name === 'Pablo')!.id;
    let v = snap.version;
    const step = async (a: Action) => {
      const r = await send(socket, a, v);
      expect(r.ok).toBe(true);
      v = r.version;
    };
    await step({ type: 'character.update', targetId: p1Id, patch: { level: 4, gear: 2 } });
    await step({ type: 'game.start' });
    const startedSnapshot: Snapshot = await socket.timeout(5000).emitWithAck('sync');
    const clockStart = startedSnapshot.state.clock.activeSince;
    expect(clockStart).not.toBeNull();
    expect(Number.isFinite(Date.parse(startedSnapshot.serverTime))).toBe(true);
    await step({ type: 'turn.kickDoor' });
    await step({ type: 'turn.doorResult', result: 'monster', monster: { name: 'Dragón', strength: 20, levels: 2, treasures: 4 } });
    await step({ type: 'combat.addModifier', side: 'monsters', value: 3, label: 'enojado' });

    // Comando guardado pero "sin respuesta": el cliente lo reintentará con el mismo commandId.
    const lostId = randomUUID();
    const lost = await send(socket, { type: 'character.update', targetId: snap.me.participantId, patch: { level: 3 } }, v, lostId);
    expect(lost.ok).toBe(true);
    socket.disconnect();

    await killServer();
    await startServer();

    ({ socket, snap } = await connect(code, dm.cookie!));
    expect(snap.version).toBe(lost.ok ? lost.version : -1);
    expect(snap.me.isDm).toBe(true);
    expect(snap.state.status).toBe('active');
    expect(snap.state.clock.activeSince).toBe(clockStart);
    expect(snap.state.clock.turnElapsedMs).toBe(0);
    expect(snap.state.turn.phase).toBe('combat');
    expect(snap.state.combat?.monsters[0]).toMatchObject({ name: 'Dragón', strength: 20 });
    expect(snap.state.combat?.modifiers[0]).toMatchObject({ value: 3 });
    expect(snap.state.characters[p1Id]).toMatchObject({ level: 4, gear: 2 });
    expect(snap.state.characters[snap.me.participantId].level).toBe(3);

    // Reintento del comando "perdido": no se repite.
    const retry = await send(socket, { type: 'character.update', targetId: snap.me.participantId, patch: { level: 3 } }, v, lostId);
    expect(retry).toMatchObject({ ok: true, duplicate: true });

    // Roles recuperados por cookie, sin duplicar participantes.
    const tvConn = await connect(code, tv.cookie!);
    expect(tvConn.snap.me.role).toBe('spectator');
    const denied = await send(tvConn.socket, { type: 'game.pause' }, tvConn.snap.version);
    expect(denied).toMatchObject({ ok: false, code: 'forbidden' });
    const p1Again = await post(`/api/rooms/${code}/join`, { name: 'Pablo', role: 'player' }, p1.cookie);
    expect(p1Again.json.reused).toBe(true);
    expect(Object.keys(tvConn.snap.state.participants)).toHaveLength(3);

    tvConn.socket.disconnect();
    socket.disconnect();
  }, 90000);

  it('las rutas del frontend no interceptan la API', async () => {
    const r = await fetch(`${BASE}/api/no-existe`);
    expect(r.status).toBe(404);
    expect(await r.json()).toMatchObject({ error: expect.any(String) });
  });
});
