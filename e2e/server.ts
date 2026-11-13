import { spawn, type ChildProcess } from 'node:child_process';
import type { BrowserContext } from '@playwright/test';
import { io } from 'socket.io-client';
import { randomUUID } from 'node:crypto';

export const PORT = 3300;
export const BASE = `http://localhost:${PORT}`;
const DB = process.env.TEST_DATABASE_URL ?? 'postgresql://munchkin:munchkin@localhost:5432/patea_test?schema=public';

let proc: ChildProcess | null = null;

export async function startServer() {
  proc = spawn(process.execPath, ['dist/server/server/index.js'], {
    env: { ...process.env, PORT: String(PORT), DATABASE_URL: DB, NODE_ENV: 'test' },
    stdio: 'inherit',
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
    } catch {
      /* arrancando */
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('el servidor no arrancó');
}

export async function stopServer() {
  if (!proc) return;
  const p = proc;
  proc = null;
  await new Promise<void>((resolve) => {
    p.once('exit', () => resolve());
    p.kill('SIGKILL');
  });
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

/** Envía un comando "a mano" con la cookie de un navegador, salteando la interfaz. */
export async function rawCommand(context: BrowserContext, code: string, action: unknown) {
  const cookie = (await context.cookies(BASE)).map((c) => `${c.name}=${c.value}`).join('; ');
  const socket = io(BASE, { auth: { code }, extraHeaders: { cookie }, transports: ['websocket'], reconnection: false });
  try {
    const snap = await new Promise<{ version: number }>((resolve, reject) => {
      socket.once('snapshot', resolve);
      socket.once('connect_error', reject);
    });
    return await socket.timeout(5000).emitWithAck('command', { commandId: randomUUID(), expectedVersion: snap.version, action });
  } finally {
    socket.disconnect();
  }
}
