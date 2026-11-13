import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { commandSchema } from '../shared/commands.js';
import type { CommandResult, Snapshot } from '../shared/types.js';
import { readCookie } from './http.js';
import { findSession, loadRoom, processCommand, recentEvents, touchSession } from './rooms.js';
import { cookieName, normalizeCode } from './sessions.js';

interface SocketData {
  code: string;
  roomId: string;
  participantId: string;
  tokenHash: string;
}

// Presencia: solo en memoria (es efímera por naturaleza). La identidad vive en PostgreSQL.
const presence = new Map<string, Map<string, number>>();

function online(roomId: string): string[] {
  return [...(presence.get(roomId)?.entries() ?? [])].filter(([, n]) => n > 0).map(([id]) => id);
}

export function createRealtime(server: HttpServer, onActivity: () => void = () => {}) {
  const io = new Server<Record<string, never>, Record<string, never>, Record<string, never>, SocketData>(server, {
    serveClient: false,
  });

  async function snapshotFor(data: SocketData): Promise<Snapshot> {
    const room = await loadRoom(data.roomId);
    const p = room.state.participants[data.participantId];
    return {
      roomId: room.id,
      code: room.code,
      version: room.version,
      state: room.state,
      events: await recentEvents(room.id),
      me: { participantId: data.participantId, role: p.role, isDm: p.isDm },
      online: online(room.id),
      expiresAt: room.expiresAt.toISOString(),
      serverTime: new Date().toISOString(),
    };
  }

  /** Emite el estado nuevo a todos los sockets de la sala, después del commit. */
  async function broadcast(roomId: string) {
    const sockets = await io.in(roomId).fetchSockets();
    await Promise.all(
      sockets.map(async (s) => {
        try {
          s.emit('snapshot' as never, (await snapshotFor(s.data)) as never);
        } catch (e) {
          console.error('broadcast', e);
        }
      }),
    );
  }

  function broadcastPresence(roomId: string) {
    io.to(roomId).emit('presence' as never, online(roomId) as never);
  }

  io.use(async (socket, next) => {
    try {
      const code = normalizeCode(String(socket.handshake.auth?.code ?? ''));
      const token = readCookie(socket.handshake.headers.cookie, cookieName(code));
      const session = await findSession(code, token);
      if (!session) return next(new Error('unauthorized'));
      socket.data = { code, roomId: session.roomId, participantId: session.participantId, tokenHash: session.tokenHash };
      next();
    } catch (e) {
      next(e as Error);
    }
  });

  io.on('connection', async (socket: Socket) => {
    const data = socket.data as SocketData;
    onActivity();
    await socket.join(data.roomId);
    const room = presence.get(data.roomId) ?? new Map<string, number>();
    room.set(data.participantId, (room.get(data.participantId) ?? 0) + 1);
    presence.set(data.roomId, room);
    void touchSession(data.tokenHash);
    try {
      socket.emit('snapshot', await snapshotFor(data));
    } catch (e) {
      console.error('snapshot', e);
    }
    broadcastPresence(data.roomId);

    socket.on('sync', async (ack?: (s: Snapshot | null) => void) => {
      try {
        ack?.(await snapshotFor(data));
      } catch {
        ack?.(null);
      }
    });

    socket.on('command', async (raw: unknown, ack?: (r: CommandResult) => void) => {
      const parsed = commandSchema.safeParse(raw);
      if (!parsed.success) {
        ack?.({ ok: false, code: 'invalid', message: parsed.error.issues[0]?.message ?? 'Comando inválido.', version: -1 });
        return;
      }
      onActivity();
      try {
        const out = await processCommand(data.code, data.tokenHash, parsed.data);
        ack?.(out.result);
        if (out.changed) {
          await broadcast(data.roomId);
          if (out.revokedParticipant) {
            const sockets = await io.in(data.roomId).fetchSockets();
            for (const s of sockets) if (s.data.participantId === out.revokedParticipant) s.disconnect(true);
          }
        } else if (!out.result.ok) {
          socket.emit('snapshot', await snapshotFor(data));
        }
      } catch (e) {
        console.error('command', e);
        ack?.({ ok: false, code: 'server', message: 'Error del servidor. Probá de nuevo.', version: -1 });
      }
    });

    socket.on('disconnect', () => {
      const m = presence.get(data.roomId);
      if (m) {
        m.set(data.participantId, Math.max(0, (m.get(data.participantId) ?? 1) - 1));
        broadcastPresence(data.roomId);
      }
    });
  });

  return { io, broadcast };
}
