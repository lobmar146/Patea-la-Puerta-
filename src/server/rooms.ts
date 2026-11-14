// Servicio de salas: alta, ingreso, snapshot y procesamiento transaccional de comandos.
// PostgreSQL es la fuente de verdad: cada cambio se confirma antes de emitirse.

import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { Command } from '../shared/commands.js';
import { GameError, addParticipant, applyAction, createInitialState, type EngineEvent } from '../shared/engine.js';
import { WIN_LEVEL, activeParticipantId, almostWinners, displayName, type AvatarId } from '../shared/rules.js';
import type { PushMessage } from './push.js';
import type { CommandResult, EventDTO, GameState, GameMode, Role, Sex } from '../shared/types.js';
import { config } from './config.js';
import { prisma } from './db.js';
import { hashToken, newRoomCode, newToken } from './sessions.js';

type Tx = Prisma.TransactionClient;

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface LockedRoom {
  id: string;
  code: string;
  version: number;
  state: GameState;
  expiresAt: Date;
}

const DAY = 24 * 60 * 60 * 1000;

function expiry(state: GameState, from = new Date()): Date {
  return new Date(from.getTime() + state.config.ttlDays * DAY);
}

/** Bloquea la fila de la sala hasta el fin de la transacción (serializa comandos de una sala). */
async function lockRoom(tx: Tx, code: string): Promise<LockedRoom | null> {
  const rows = await tx.$queryRaw<LockedRoom[]>`
    SELECT id, code, version, state, "expiresAt" FROM "Room" WHERE code = ${code} FOR UPDATE`;
  return rows[0] ?? null;
}

async function saveRoom(tx: Tx, room: LockedRoom, state: GameState, events: EngineEvent[], actorId: string | null) {
  const version = room.version + 1;
  const now = new Date();
  // Control optimista además del bloqueo: si la versión cambió, no se pisa nada.
  const res = await tx.room.updateMany({
    where: { id: room.id, version: room.version },
    data: { state: state as unknown as Prisma.InputJsonValue, version, lastActivityAt: now, expiresAt: expiry(state, now) },
  });
  if (res.count !== 1) throw new HttpError(409, 'La partida cambió mientras guardábamos. Probá de nuevo.');
  if (events.length) {
    await tx.gameEvent.createMany({
      data: events.map((e) => ({ roomId: room.id, version, type: e.type, actorId, message: e.message })),
    });
  }
  return version;
}

export interface Joined {
  code: string;
  token: string;
  participantId: string;
  roomId: string;
  ttlDays: number;
}

/** Jugadores de mentira de las salas de práctica. Los maneja quien creó la sala (es DM). */
export const PRACTICE_BOTS = [
  { name: 'Grog (práctica)', avatar: 'goblin' as AvatarId, color: '#2f6b3a', sex: 'male' as Sex },
  { name: 'Lía (práctica)', avatar: 'elfo' as AvatarId, color: '#7c3aed', sex: 'female' as Sex },
];

/** Límite global para crear salas: protege la base gratis de quien cree salas sin parar. */
export async function assertRoomQuota(db: Pick<Tx, 'room'> = prisma, now = new Date()): Promise<void> {
  const [open, today] = await Promise.all([
    db.room.count({ where: { expiresAt: { gt: now } } }),
    db.room.count({ where: { createdAt: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } }),
  ]);
  if (open >= config.maxOpenRooms) {
    throw new HttpError(503, 'Hay demasiadas salas abiertas en este momento. Volvé a una sala que ya tengas o probá más tarde.');
  }
  if (today >= config.maxRoomsPerDay) {
    throw new HttpError(503, 'Se crearon demasiadas salas hoy. Volvé a una sala que ya tengas o probá mañana.');
  }
}

export async function createRoom(input: { name: string; sets?: string[]; extraSets?: string[]; avatar?: AvatarId; color?: string; sex?: Sex; practice?: boolean; mode?: GameMode }): Promise<Joined> {
  await assertRoomQuota();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newRoomCode();
    const roomId = randomUUID();
    const participantId = randomUUID();
    const token = newToken();
    const now = new Date();
    let state = createInitialState(code, input.practice ? 1 : config.ttlDays, input.sets, input.extraSets);
    if (input.mode && input.mode !== 'normal' && !input.practice) state.config.mode = input.mode;
    state = addParticipant(state, { id: participantId, name: input.name, role: 'player', isDm: true, now: now.toISOString(), avatar: input.avatar, color: input.color, sex: input.sex });
    const botIds: string[] = [];
    const extraEvents: EngineEvent[] = [];
    if (input.practice) {
      state.config.practice = true;
      for (const b of PRACTICE_BOTS) {
        const id = randomUUID();
        botIds.push(id);
        state = addParticipant(state, { id, name: b.name, role: 'player', isDm: false, now: now.toISOString(), avatar: b.avatar, color: b.color, sex: b.sex, bot: true });
      }
      const started = applyAction(state, participantId, { type: 'game.start' }, { now: now.toISOString() });
      state = started.state;
      extraEvents.push(...started.events);
    }
    try {
      await prisma.$transaction(async (tx) => {
        await tx.room.create({
          data: { id: roomId, code, version: 1, state: state as unknown as Prisma.InputJsonValue, expiresAt: expiry(state, now) },
        });
        await tx.participant.create({ data: { id: participantId, roomId } });
        for (const id of botIds) await tx.participant.create({ data: { id, roomId } });
        await tx.session.create({ data: { tokenHash: hashToken(token), roomId, participantId } });
        await tx.gameEvent.create({
          data: {
            roomId,
            version: 1,
            type: 'room.create',
            actorId: participantId,
            message: input.practice
              ? `${input.name} abrió una partida de práctica con dos jugadores de mentira. Vos manejás sus turnos.`
              : `${input.name} abrió la sala y es el Dungeon Master.`,
          },
        });
        for (const e of extraEvents) await tx.gameEvent.create({ data: { roomId, version: 1, type: e.type, actorId: participantId, message: e.message } });
      });
      return { code, token, participantId, roomId, ttlDays: state.config.ttlDays };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue; // código repetido
      throw e;
    }
  }
  throw new HttpError(500, 'No pudimos generar un código de sala. Probá otra vez.');
}

/**
 * Revancha: el DM de una partida terminada abre una sala nueva con el mismo grupo
 * (mismos nombres, avatares, colores, roles y orden; personajes desde nivel 1).
 * La sala vieja guarda el código y el mapeo para que cada uno entre con un toque.
 */
export async function createRematch(oldCode: string, token: string | undefined): Promise<Joined & { oldRoomId: string; reused: boolean }> {
  const session = await findSession(oldCode, token);
  if (!session) throw new HttpError(401, 'Tu sesión en esta sala ya no es válida.');
  return prisma.$transaction(async (tx) => {
    const old = await lockRoom(tx, oldCode);
    if (!old) throw new HttpError(404, 'No existe una sala con ese código.');
    const me = old.state.participants[session.participantId];
    if (!me?.isDm) throw new HttpError(403, 'Solo el Dungeon Master puede armar la revancha.');
    if (old.state.status !== 'finished') throw new HttpError(409, 'La revancha se arma cuando termina la partida.');
    if (old.state.rematch) {
      const join = await joinRematchTx(tx, old.state, session.participantId);
      return { ...join, oldRoomId: old.id, reused: true };
    }
    await assertRoomQuota(tx);
    const prev = old.state;
    const practice = !!prev.config.practice;
    const now = new Date();
    const code = await freeCode(tx);
    const roomId = randomUUID();
    let state = createInitialState(code, practice ? 1 : config.ttlDays, prev.config.sets, prev.config.extraSets);
    if (prev.config.mode) state.config.mode = prev.config.mode;
    const active = Object.values(prev.participants).filter((p) => !p.removed);
    const ordered = [...prev.turn.order.map((id) => prev.participants[id]).filter((p) => p && !p.removed), ...active.filter((p) => p.role === 'spectator')];
    const map: Record<string, string> = {};
    for (const p of ordered) {
      const id = randomUUID();
      map[p.id] = id;
      const c = prev.characters[p.id];
      state = addParticipant(state, { id, name: p.name, role: p.role, isDm: p.isDm, now: now.toISOString(), avatar: c?.avatar as AvatarId | undefined, color: c?.color, sex: c?.sex, bot: p.bot });
      if (c) state.characters[id].name = c.name;
    }
    const events: EngineEvent[] = [{ type: 'room.create', message: `¡Revancha! ${me.name} armó la sala con el mismo grupo.` }];
    if (practice) {
      state.config.practice = true;
      const started = applyAction(state, map[me.id], { type: 'game.start' }, { now: now.toISOString() });
      state = started.state;
      events.push(...started.events);
    }
    const newToken_ = newToken();
    await tx.room.create({ data: { id: roomId, code, version: 1, state: state as unknown as Prisma.InputJsonValue, expiresAt: expiry(state, now) } });
    for (const id of Object.values(map)) await tx.participant.create({ data: { id, roomId } });
    await tx.session.create({ data: { tokenHash: hashToken(newToken_), roomId, participantId: map[me.id] } });
    for (const e of events) await tx.gameEvent.create({ data: { roomId, version: 1, type: e.type, actorId: map[me.id], message: e.message } });
    const oldNext = structuredClone(prev);
    oldNext.rematch = { code, map };
    await saveRoom(tx, old, oldNext, [{ type: 'room.rematch', message: `${me.name} armó la revancha en la sala ${code}. ¡Tocá «Ir a la revancha»!` }], me.id);
    return { code, token: newToken_, participantId: map[me.id], roomId, ttlDays: state.config.ttlDays, oldRoomId: old.id, reused: false };
  });
}

async function freeCode(tx: Tx): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = newRoomCode();
    if (!(await tx.room.findUnique({ where: { code }, select: { id: true } }))) return code;
  }
  throw new HttpError(500, 'No pudimos generar un código de sala. Probá otra vez.');
}

async function joinRematchTx(tx: Tx, oldState: GameState, oldParticipantId: string): Promise<Joined> {
  const r = oldState.rematch;
  const newId = r?.map[oldParticipantId];
  if (!r || !newId) throw new HttpError(404, 'No hay revancha para vos en esta sala.');
  const room = await tx.room.findUnique({ where: { code: r.code } });
  if (!room) throw new HttpError(404, 'La sala de la revancha ya no existe.');
  const token = newToken();
  await tx.session.create({ data: { tokenHash: hashToken(token), roomId: room.id, participantId: newId } });
  const st = room.state as unknown as GameState;
  return { code: r.code, token, participantId: newId, roomId: room.id, ttlDays: st.config.ttlDays };
}

/** Entrar a la revancha con la sesión de la sala vieja (sin volver a escribir el nombre). */
export async function joinRematch(oldCode: string, token: string | undefined): Promise<Joined> {
  const session = await findSession(oldCode, token);
  if (!session) throw new HttpError(401, 'Tu sesión en esta sala ya no es válida.');
  return prisma.$transaction(async (tx) => {
    const old = await tx.room.findUnique({ where: { code: oldCode } });
    if (!old) throw new HttpError(404, 'No existe una sala con ese código.');
    return joinRematchTx(tx, old.state as unknown as GameState, session.participantId);
  });
}

export interface SessionInfo {
  roomId: string;
  participantId: string;
  tokenHash: string;
}

/** Devuelve la sesión vigente del token para esa sala, o null. */
export async function findSession(code: string, token: string | undefined): Promise<SessionInfo | null> {
  if (!token) return null;
  const s = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { room: { select: { code: true } } } });
  if (!s || s.revokedAt || s.room.code !== code) return null;
  return { roomId: s.roomId, participantId: s.participantId, tokenHash: s.tokenHash };
}

export async function touchSession(tokenHash: string) {
  await prisma.session.update({ where: { tokenHash }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
}

export async function getRoomPublic(code: string) {
  const room = await prisma.room.findUnique({ where: { code } });
  if (!room) return null;
  const state = room.state as unknown as GameState;
  return { code: room.code, status: state.status, expiresAt: room.expiresAt, ttlDays: state.config.ttlDays, expired: room.expiresAt < new Date() };
}

/**
 * Ingreso a una sala. Si el navegador ya tiene una sesión válida en esa sala, se reutiliza:
 * nunca se crea un participante duplicado por recargar o volver a escanear el QR.
 */
export async function joinRoom(
  code: string,
  existingToken: string | undefined,
  input: { name: string; role: Role; avatar?: AvatarId; color?: string; sex?: Sex },
): Promise<Joined & { reused: boolean }> {
  const existing = await findSession(code, existingToken);
  if (existing && existingToken) {
    const room = await prisma.room.findUniqueOrThrow({ where: { id: existing.roomId } });
    const state = room.state as unknown as GameState;
    return { code, token: existingToken, participantId: existing.participantId, roomId: room.id, ttlDays: state.config.ttlDays, reused: true };
  }
  return prisma.$transaction(async (tx) => {
    const room = await lockRoom(tx, code);
    if (!room) throw new HttpError(404, 'No existe una sala con ese código.');
    if (room.expiresAt < new Date()) throw new HttpError(410, 'Esa sala venció por inactividad.');
    if (room.state.status === 'finished') throw new HttpError(409, 'Esa partida ya terminó.');
    const participantId = randomUUID();
    const token = newToken();
    const state = addParticipant(room.state, { id: participantId, name: input.name, role: input.role, isDm: false, now: new Date().toISOString(), avatar: input.avatar, color: input.color, sex: input.sex });
    await tx.participant.create({ data: { id: participantId, roomId: room.id } });
    await tx.session.create({ data: { tokenHash: hashToken(token), roomId: room.id, participantId } });
    await saveRoom(tx, room, state, [{ type: 'participant.join', message: `${input.name} se sumó como ${input.role === 'player' ? 'jugador' : 'espectador'}.` }], participantId);
    return { code, token, participantId, roomId: room.id, ttlDays: state.config.ttlDays, reused: false };
  });
}

export async function recentEvents(roomId: string): Promise<EventDTO[]> {
  const rows = await prisma.gameEvent.findMany({ where: { roomId }, orderBy: { id: 'desc' }, take: config.recentEvents });
  return rows.map((e) => ({ id: e.id, version: e.version, type: e.type, actorId: e.actorId, message: e.message, createdAt: e.createdAt.toISOString() }));
}

export async function loadRoom(roomId: string) {
  const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });
  return { id: room.id, code: room.code, version: room.version, state: room.state as unknown as GameState, expiresAt: room.expiresAt };
}

export interface ProcessOutcome {
  result: CommandResult;
  changed: boolean;
  revokedParticipant?: string;
  /** Avisos push a enviar después del commit. */
  notify?: PushMessage[];
}

/** Qué avisar tras un cambio: a quien le empieza el turno y a quien le piden ayuda. */
export function pushMessagesFor(before: GameState, after: GameState): PushMessage[] {
  const out: PushMessage[] = [];
  const prev = activeParticipantId(before);
  const next = activeParticipantId(after);
  if (after.status === 'active' && next && (next !== prev || before.status === 'lobby')) {
    out.push({ participantId: next, title: '¡Te toca!', body: `${displayName(after, next)}, es tu turno: andá a patear la puerta.`, tag: 'turn' });
  }
  // Alguien llegó a nivel 9: aviso a los demás (a un paso de ganar).
  for (const id of almostWinners(after)) {
    if ((before.characters[id]?.level ?? 0) >= WIN_LEVEL - 1 || after.status !== 'active') continue;
    for (const p of Object.values(after.participants)) {
      if (p.removed || p.id === id || p.bot || p.role !== 'player') continue;
      out.push({ participantId: p.id, title: '¡A un paso de ganar!', body: `${displayName(after, id)} llegó a nivel ${WIN_LEVEL - 1}. Solo gana matando un monstruo.`, tag: `nine-${id}` });
    }
  }
  const known = new Set(before.combat?.helpRequests.map((r) => r.id) ?? []);
  for (const r of after.combat?.helpRequests ?? []) {
    if (r.status === 'pending' && !known.has(r.id)) {
      out.push({ participantId: r.toId, title: '¡Te piden ayuda!', body: `${displayName(after, r.fromId)} necesita ayuda en un combate.`, tag: 'help' });
    }
  }
  return out;
}

/**
 * Procesa un comando en una única transacción:
 * 1) bloquea la sala y valida la sesión, 2) detecta commandId repetido,
 * 3) verifica la versión esperada, 4) aplica la máquina de estados,
 * 5) persiste estado, eventos y commandId. La emisión ocurre después del commit (en realtime.ts).
 */
export async function processCommand(code: string, tokenHash: string, cmd: Command): Promise<ProcessOutcome> {
  return prisma.$transaction(async (tx) => {
    const room = await lockRoom(tx, code);
    if (!room) return { changed: false, result: { ok: false, code: 'not_found', message: 'La sala no existe.', version: 0 } };
    const session = await tx.session.findUnique({ where: { tokenHash } });
    if (!session || session.revokedAt || session.roomId !== room.id) {
      return { changed: false, result: { ok: false, code: 'unauthorized', message: 'Tu sesión ya no es válida en esta sala.', version: room.version } };
    }
    const done = await tx.processedCommand.findUnique({ where: { roomId_commandId: { roomId: room.id, commandId: cmd.commandId } } });
    if (done) {
      if (done.participantId !== session.participantId) {
        return { changed: false, result: { ok: false, code: 'invalid', message: 'Identificador de comando repetido.', version: room.version } };
      }
      // Reintento de algo ya aplicado: se informa el resultado sin repetir la acción.
      return { changed: false, result: { ok: true, version: done.resultVersion, duplicate: true } };
    }
    if (cmd.expectedVersion !== room.version) {
      return {
        changed: false,
        result: {
          ok: false,
          code: 'conflict',
          message: 'Alguien cambió la partida justo antes. Ya ves el estado actual: revisalo y volvé a intentar.',
          version: room.version,
        },
      };
    }
    let outcome;
    try {
      outcome = applyAction(room.state, session.participantId, cmd.action);
    } catch (e) {
      if (e instanceof GameError) return { changed: false, result: { ok: false, code: e.code, message: e.message, version: room.version } };
      throw e;
    }
    const version = await saveRoom(tx, room, outcome.state, outcome.events, session.participantId);
    await tx.processedCommand.create({
      data: { roomId: room.id, commandId: cmd.commandId, participantId: session.participantId, type: cmd.action.type, resultVersion: version },
    });
    if (outcome.revokeParticipant) {
      await tx.session.updateMany({ where: { participantId: outcome.revokeParticipant }, data: { revokedAt: new Date() } });
    }
    return { changed: true, revokedParticipant: outcome.revokeParticipant, notify: pushMessagesFor(room.state, outcome.state), result: { ok: true, version, duplicate: false } };
  });
}

/** Borra salas vencidas por inactividad. Nunca se ejecuta por un reinicio: solo por fecha. */
export async function deleteExpiredRooms(now = new Date()): Promise<number> {
  const res = await prisma.room.deleteMany({ where: { expiresAt: { lt: now } } });
  // Los commandId procesados de más de 2 días no hacen falta para reintentos.
  await prisma.processedCommand.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 2 * DAY) } } });
  return res.count;
}
