import path from 'node:path';
import fs from 'node:fs';
import express, { type NextFunction, type Request, type Response } from 'express';
import { parse as parseCookie } from 'cookie';
import { ZodError } from 'zod';
import { createRoomSchema, joinRoomSchema } from '../shared/commands.js';
import { config } from './config.js';
import { prisma } from './db.js';
import { rateLimit } from './rateLimit.js';
import { HttpError, createRoom, findSession, getRoomPublic, joinRoom } from './rooms.js';
import { cookieName, cookieOptions, normalizeCode } from './sessions.js';

type Handler = (req: Request, res: Response) => Promise<unknown>;
const wrap = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  return parseCookie(header)[name];
}

export interface HttpHooks {
  onJoined: (roomId: string) => void;
  onActivity?: () => void;
}

export function createApp(hooks: HttpHooks) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '32kb' }));

  // Sin base de datos: lo usa el keep-alive para no despertar a PostgreSQL.
  app.get('/api/ping', (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.get('/api/health', wrap(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: 'up', time: new Date().toISOString() });
  }));

  const createLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 10 });
  const joinLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 60 });

  app.post('/api/rooms', createLimit, wrap(async (req, res) => {
    const body = createRoomSchema.parse(req.body);
    const joined = await createRoom(body);
    hooks.onActivity?.();
    res.cookie(cookieName(joined.code), joined.token, cookieOptions(joined.ttlDays));
    res.status(201).json({ code: joined.code, participantId: joined.participantId });
  }));

  app.get('/api/rooms/:code', wrap(async (req, res) => {
    const code = normalizeCode(req.params.code);
    const room = await getRoomPublic(code);
    if (!room) throw new HttpError(404, 'No existe una sala con ese código.');
    const session = await findSession(code, readCookie(req.headers.cookie, cookieName(code)));
    res.json({ ...room, hasSession: Boolean(session), publicUrl: config.publicUrl || null });
  }));

  app.post('/api/rooms/:code/join', joinLimit, wrap(async (req, res) => {
    const code = normalizeCode(req.params.code);
    const body = joinRoomSchema.parse(req.body);
    const joined = await joinRoom(code, readCookie(req.headers.cookie, cookieName(code)), body);
    res.cookie(cookieName(code), joined.token, cookieOptions(joined.ttlDays));
    hooks.onActivity?.();
    if (!joined.reused) hooks.onJoined(joined.roomId);
    res.json({ code, participantId: joined.participantId, reused: joined.reused });
  }));

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta inexistente.' }));

  // Frontend compilado. Las rutas del cliente caen en index.html; /api y /socket.io no.
  const clientDir = path.resolve(process.cwd(), 'dist/client');
  if (fs.existsSync(clientDir)) {
    app.use(express.static(clientDir, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!api\/|socket\.io\/).*/, (_req, res) => res.sendFile(path.join(clientDir, 'index.html')));
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: err.issues[0]?.message ?? 'Datos inválidos.' });
    } else if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Algo salió mal en el servidor.' });
    }
  });
  return app;
}
