// Máquina de estados de la partida. Función pura: (estado, actor, acción) -> nuevo estado + eventos.
// El servidor la ejecuta dentro de una transacción; nunca se confía en el cliente.

import type { Action, CharacterPatch, MonsterInput } from './commands.js';
import { gearFromItems } from './novice.js';
import { AVATAR_IDS, DEFAULT_SETS, COLORS, SEX_LABEL, WIN_LEVEL, activeParticipantId, displayName, type AvatarId } from './rules.js';
import type { Character, Combat, GameState, Monster, Participant, Phase, PlayerStats, Role, Sex, UndoEntry } from './types.js';

export class GameError extends Error {
  constructor(
    public code: 'forbidden' | 'invalid' | 'not_found',
    message: string,
  ) {
    super(message);
  }
}

export interface EngineEvent {
  type: string;
  message: string;
}

export interface EngineResult {
  state: GameState;
  events: EngineEvent[];
  /** Efectos fuera del estado JSON que el servidor aplica en la misma transacción. */
  revokeParticipant?: string;
}

export type IdGen = () => string;
export type Rng = () => number;

const defaultId: IdGen = () => globalThis.crypto.randomUUID();

export const PHASE_LABEL: Record<Phase, string> = {
  setup: 'Preparación del turno',
  kickDoor: 'Patear la puerta',
  curse: 'Resolver maldición',
  noMonster: 'Sin monstruo',
  lootRoom: 'Saquear la habitación',
  combat: 'Combate',
  charity: 'Caridad',
  endTurn: 'Fin del turno',
};

// ---------------------------------------------------------------- creación

export function createInitialState(code: string, ttlDays: number, sets?: string[], extraSets?: string[]): GameState {
  return {
    schema: 1,
    code,
    status: 'lobby',
    config: { sets: sets ?? [...DEFAULT_SETS], extraSets: extraSets ?? [], ttlDays },
    participants: {},
    characters: {},
    turn: { order: [], activeIndex: 0, phase: 'setup', turnNumber: 0, doorResult: null },
    clock: { activeSince: null, turnElapsedMs: 0, totalsByParticipant: {} },
    combat: null,
    levelAlert: null,
    winnerId: null,
    finishedAt: null,
    stats: {},
  };
}

/** Agrega un participante (y su personaje si es jugador). No es un comando: lo usa el alta por HTTP. */
export function addParticipant(
  state: GameState,
  p: { id: string; name: string; role: Role; isDm: boolean; now: string; avatar?: AvatarId; color?: string; bot?: boolean; sex?: Sex },
): GameState {
  const next = structuredClone(state);
  const participant: Participant = {
    id: p.id,
    name: p.name,
    role: p.role,
    isDm: p.isDm,
    joinedAt: p.now,
    removed: false,
    ...(p.bot ? { bot: true } : {}),
  };
  next.participants[p.id] = participant;
  if (p.role === 'player') {
    const others = Object.values(next.characters);
    const used = new Set(others.map((c) => c.color));
    const color = p.color ?? COLORS.find((c) => !used.has(c)) ?? COLORS[others.length % COLORS.length];
    const usedAvatars = new Set(others.map((c) => c.avatar));
    const avatar = p.avatar ?? AVATAR_IDS.find((a) => !usedAvatars.has(a)) ?? AVATAR_IDS[others.length % AVATAR_IDS.length];
    next.characters[p.id] = {
      id: p.id,
      name: p.name,
      color,
      avatar,
      ...(p.sex ? { sex: p.sex } : {}),
      level: 1,
      classes: [],
      races: [],
      gear: 0,
      otherMods: 0,
      notes: '',
    };
    // Cada jugador nuevo se suma al final del orden (también si la partida ya empezó).
    next.turn.order.push(p.id);
  }
  return next;
}

// ---------------------------------------------------------------- helpers

function participant(state: GameState, id: string): Participant {
  const p = state.participants[id];
  if (!p || p.removed) throw new GameError('not_found', 'Ese participante no está en la sala.');
  return p;
}

function player(state: GameState, id: string): Participant {
  const p = participant(state, id);
  if (p.role !== 'player') throw new GameError('invalid', 'Esa persona es espectadora y no tiene personaje.');
  return p;
}

function requireDm(actor: Participant) {
  if (!actor.isDm) throw new GameError('forbidden', 'Solo el Dungeon Master puede hacer eso.');
}

function requireStatus(state: GameState, ...allowed: GameState['status'][]) {
  if (!allowed.includes(state.status)) {
    const msg: Record<GameState['status'], string> = {
      lobby: 'La partida todavía no empezó.',
      active: 'La partida está en curso.',
      paused: 'La partida está en pausa.',
      finished: 'La partida ya terminó.',
    };
    throw new GameError('invalid', msg[state.status]);
  }
}

function requirePhase(state: GameState, ...phases: Phase[]) {
  if (!phases.includes(state.turn.phase)) {
    throw new GameError(
      'invalid',
      `Eso no corresponde a la fase actual (${PHASE_LABEL[state.turn.phase]}). Quizás alguien ya avanzó.`,
    );
  }
}

/** El jugador activo puede avanzar su turno. El DM también, como corrección. */
function requireTurnOwner(state: GameState, actor: Participant) {
  requireStatus(state, 'active');
  if (activeParticipantId(state) !== actor.id && !actor.isDm) {
    throw new GameError('forbidden', 'Solo el jugador activo puede avanzar su turno.');
  }
}

function requireCombat(state: GameState): Combat {
  if (!state.combat) throw new GameError('invalid', 'No hay un combate en curso.');
  return state.combat;
}

function newMonster(m: MonsterInput, id: IdGen): Monster {
  return { id: id(), name: m.name || 'Monstruo', strength: m.strength, levels: m.levels, treasures: m.treasures };
}

function startCombat(state: GameState, origin: Combat['origin'], monster: MonsterInput | undefined, id: IdGen, now: string) {
  const fighterId = activeParticipantId(state);
  if (!fighterId) throw new GameError('invalid', 'No hay jugador activo.');
  state.combat = {
    id: id(),
    origin,
    fighterId,
    monsters: monster ? [newMonster(monster, id)] : [],
    modifiers: [],
    helperId: null,
    helpRequests: [],
    startedAt: now,
  };
  state.turn.phase = 'combat';
}

function by(state: GameState, actor: Participant): string {
  const isOwner = activeParticipantId(state) === actor.id;
  return displayName(state, actor.id) + (actor.isDm && !isOwner ? ' (DM)' : '');
}

function setLevel(state: GameState, c: Character, level: number, events: EngineEvent[]) {
  const before = c.level;
  c.level = Math.max(1, Math.min(99, level));
  if (before < WIN_LEVEL && c.level >= WIN_LEVEL && state.status !== 'finished') {
    state.levelAlert = { participantId: c.id, level: c.level };
    events.push({
      type: 'level.alert',
      message: `¡${c.name} llegó a nivel ${c.level}! El DM debe confirmar qué pasó en la mesa.`,
    });
  }
  if (state.levelAlert?.participantId === c.id && c.level < WIN_LEVEL) state.levelAlert = null;
}

/** Guarda el último cambio manual del personaje para poder deshacerlo. */
function remember(state: GameState, c: Character, before: Character, label: string, by: string) {
  if (JSON.stringify(before) === JSON.stringify(c)) return;
  state.undo = { ...(state.undo ?? {}), [c.id]: { label, by, before, after: structuredClone(c) } };
}

/** El cambio para deshacer, solo si el personaje sigue igual que justo después de ese cambio. */
export function undoFor(state: GameState, characterId: string): UndoEntry | null {
  const entry = state.undo?.[characterId];
  const c = state.characters[characterId];
  if (!entry || !c) return null;
  return JSON.stringify(entry.after) === JSON.stringify(c) ? entry : null;
}

function describePatch(patch: CharacterPatch, before: Character): string {
  const parts: string[] = [];
  if (patch.level !== undefined && patch.level !== before.level) parts.push(`nivel ${before.level}→${patch.level}`);
  if (patch.gear !== undefined && patch.gear !== before.gear) parts.push(`equipo ${before.gear}→${patch.gear}`);
  if (patch.otherMods !== undefined && patch.otherMods !== before.otherMods)
    parts.push(`modificadores ${before.otherMods}→${patch.otherMods}`);
  if (patch.sex && patch.sex !== before.sex) parts.push(`sexo: ${SEX_LABEL[patch.sex].toLowerCase()}`);
  if (patch.races) parts.push(`razas: ${patch.races.join(', ') || 'humano'}`);
  if (patch.classes) parts.push(`clases: ${patch.classes.join(', ') || 'ninguna'}`);
  if (patch.name && patch.name !== before.name) parts.push(`nombre: ${patch.name}`);
  if (patch.color) parts.push('color');
  if (patch.notes !== undefined) parts.push('notas');
  return parts.join(', ') || 'sin cambios';
}

const EMPTY_STATS: PlayerStats = {
  doors: 0, curses: 0, trouble: 0, loots: 0, wins: 0, monsters: 0, treasures: 0, biggest: 0,
  helpAsked: 0, helpGiven: 0, helpRefused: 0, escaped: 0, caught: 0,
};

/** Suma a las estadísticas de un jugador (para los premios del final). */
function bump(state: GameState, pid: string | null, key: keyof PlayerStats, n = 1) {
  if (!pid) return;
  state.stats ??= {};
  const s = (state.stats[pid] ??= { ...EMPTY_STATS });
  s[key] = (s[key] ?? 0) + n;
}

function nextActiveIndex(state: GameState): number {
  const { order, activeIndex } = state.turn;
  return order.length === 0 ? 0 : (activeIndex + 1) % order.length;
}

function accrueClock(state: GameState, now: string, completeTurn = false) {
  const clock = state.clock;
  if (clock.activeSince) {
    const delta = Math.max(0, Date.parse(now) - Date.parse(clock.activeSince));
    clock.turnElapsedMs += delta;
    clock.activeSince = null;
  }
  if (completeTurn) {
    const id = activeParticipantId(state);
    if (id) clock.totalsByParticipant[id] = (clock.totalsByParticipant[id] ?? 0) + clock.turnElapsedMs;
    clock.turnElapsedMs = 0;
  }
}

function startClock(state: GameState, now: string) {
  state.clock.activeSince = state.status === 'active' && activeParticipantId(state) ? now : null;
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------- reducer

export function applyAction(
  input: GameState,
  actorId: string,
  action: Action,
  opts: { now?: string; id?: IdGen; rng?: Rng } = {},
): EngineResult {
  const now = opts.now ?? new Date().toISOString();
  const id = opts.id ?? defaultId;
  const rng = opts.rng ?? Math.random;
  const state = structuredClone(input);
  const events: EngineEvent[] = [];
  const actor = participant(state, actorId);
  const log = (type: string, message: string) => events.push({ type, message });

  if (actor.role === 'spectator') {
    throw new GameError('forbidden', 'Los espectadores solo pueden mirar. ¡Pochoclos!');
  }
  if (state.status === 'finished') {
    throw new GameError('invalid', 'La partida ya terminó.');
  }

  switch (action.type) {
    // ------------------------------------------------ personajes
    case 'character.update': {
      if (action.targetId !== actor.id && !actor.isDm) {
        throw new GameError('forbidden', 'Solo podés editar tu propio personaje.');
      }
      player(state, action.targetId);
      const c = state.characters[action.targetId];
      const summary = describePatch(action.patch, c);
      const snapshot = structuredClone(c);
      const { level, ...rest } = action.patch;
      Object.assign(c, rest);
      if (level !== undefined) setLevel(state, c, level, events);
      // El nombre y las notas se guardan solos al escribir: no pisan lo que se puede deshacer.
      if (Object.keys(action.patch).some((k) => k !== 'name' && k !== 'notes')) remember(state, c, snapshot, summary, actor.id);
      const who = action.targetId === actor.id ? c.name : `${displayName(state, actor.id)} (DM) a ${c.name}`;
      events.unshift({
        type: actor.isDm && action.targetId !== actor.id ? 'dm.correction' : 'character.update',
        message: `${who}: ${summary}.`,
      });
      break;
    }

    case 'character.setItems': {
      if (action.targetId !== actor.id && !actor.isDm) {
        throw new GameError('forbidden', 'Solo podés editar tu propio personaje.');
      }
      player(state, action.targetId);
      const c = state.characters[action.targetId];
      if (new Set(action.items.map((i) => i.id)).size !== action.items.length) throw new GameError('invalid', 'Hay objetos repetidos.');
      const before = c.gear;
      const snapshot = structuredClone(c);
      c.items = action.items;
      c.gear = gearFromItems(action.items);
      remember(state, c, snapshot, `equipo ${before}→${c.gear}`, actor.id);
      const who = action.targetId === actor.id ? c.name : `${displayName(state, actor.id)} (DM) a ${c.name}`;
      log(
        actor.isDm && action.targetId !== actor.id ? 'dm.correction' : 'character.update',
        `${who}: equipo ${before === c.gear ? 'reacomodado' : `${before >= 0 ? '+' : ''}${before}→${c.gear >= 0 ? '+' : ''}${c.gear}`}.`,
      );
      break;
    }

    case 'character.undo': {
      if (action.targetId !== actor.id && !actor.isDm) {
        throw new GameError('forbidden', 'Solo podés deshacer cambios de tu propio personaje.');
      }
      player(state, action.targetId);
      const c = state.characters[action.targetId];
      const entry = undoFor(state, action.targetId);
      if (!entry) throw new GameError('invalid', 'No hay nada para deshacer: después hubo otro cambio. Corregilo a mano.');
      const restored = structuredClone(entry.before);
      const { level, ...rest } = restored;
      Object.assign(c, rest);
      setLevel(state, c, level, events);
      delete state.undo![action.targetId];
      const who = action.targetId === actor.id ? c.name : `${displayName(state, actor.id)} (DM) a ${c.name}`;
      events.unshift({ type: actor.isDm && action.targetId !== actor.id ? 'dm.correction' : 'character.undo', message: `${who}: deshizo «${entry.label}».` });
      break;
    }

    // ------------------------------------------------ configuración y orden
    case 'room.updateConfig': {
      requireDm(actor);
      state.config.sets = action.sets;
      state.config.extraSets = action.extraSets;
      log('room.config', `${displayName(state, actor.id)} actualizó los conjuntos en juego.`);
      break;
    }
    case 'order.set': {
      requireDm(actor);
      const players = Object.values(state.participants).filter((p) => !p.removed && p.role === 'player');
      const ids = new Set(players.map((p) => p.id));
      if (action.order.length !== ids.size || new Set(action.order).size !== action.order.length || !action.order.every((x) => ids.has(x))) {
        throw new GameError('invalid', 'El orden debe incluir a cada jugador exactamente una vez.');
      }
      const currentActive = activeParticipantId(state);
      state.turn.order = action.order;
      if (currentActive) state.turn.activeIndex = Math.max(0, action.order.indexOf(currentActive));
      log('order.set', `Orden de turnos: ${action.order.map((x) => displayName(state, x)).join(' → ')}.`);
      break;
    }
    case 'order.randomize': {
      requireDm(actor);
      requireStatus(state, 'lobby');
      state.turn.order = shuffle(state.turn.order, rng);
      log('order.set', `El destino sorteó el orden: ${state.turn.order.map((x) => displayName(state, x)).join(' → ')}.`);
      break;
    }

    // ------------------------------------------------ ciclo de partida
    case 'game.start': {
      requireDm(actor);
      requireStatus(state, 'lobby');
      if (state.turn.order.length === 0) throw new GameError('invalid', 'Hace falta al menos un jugador.');
      state.status = 'active';
      state.turn = { ...state.turn, activeIndex: 0, phase: 'setup', turnNumber: 1, doorResult: null };
      startClock(state, now);
      log('game.start', `¡Comienza la partida! Arranca ${displayName(state, state.turn.order[0])}.`);
      break;
    }
    case 'game.pause': {
      requireDm(actor);
      requireStatus(state, 'active');
      accrueClock(state, now);
      state.status = 'paused';
      log('game.pause', 'Partida en pausa. Hidratarse es parte de la estrategia.');
      break;
    }
    case 'game.resume': {
      requireDm(actor);
      requireStatus(state, 'paused');
      state.status = 'active';
      startClock(state, now);
      log('game.resume', 'Se reanuda la partida.');
      break;
    }
    case 'game.end': {
      requireDm(actor);
      if (action.winnerId) player(state, action.winnerId);
      accrueClock(state, now, true);
      state.status = 'finished';
      state.winnerId = action.winnerId;
      state.finishedAt = now;
      state.combat = null;
      state.levelAlert = null;
      log(
        'game.end',
        action.winnerId
          ? `Fin de la partida. ¡${displayName(state, action.winnerId)} gana!`
          : 'El DM terminó la partida sin ganador declarado.',
      );
      break;
    }

    // ------------------------------------------------ turno
    case 'turn.kickDoor': {
      requireTurnOwner(state, actor);
      requirePhase(state, 'setup');
      state.turn.phase = 'kickDoor';
      log('turn.phase', `${by(state, actor)} se prepara para patear la puerta.`);
      break;
    }
    case 'turn.doorResult': {
      requireTurnOwner(state, actor);
      requirePhase(state, 'kickDoor');
      state.turn.doorResult = action.result;
      bump(state, activeParticipantId(state), 'doors');
      if (action.result === 'curse') bump(state, activeParticipantId(state), 'curses');
      if (action.result === 'monster') {
        if (!action.monster) throw new GameError('invalid', 'Cargá la fuerza del monstruo.');
        startCombat(state, 'door', action.monster, id, now);
        log('combat.start', `¡Detrás de la puerta había un monstruo! ${by(state, actor)} entra en combate.`);
      } else if (action.result === 'curse') {
        state.turn.phase = 'curse';
        log('turn.phase', `${by(state, actor)} se comió una maldición. Se resuelve en la mesa.`);
      } else {
        state.turn.phase = 'noMonster';
        log('turn.phase', `${by(state, actor)} encontró otra carta. No hay monstruo (por ahora).`);
      }
      break;
    }
    case 'turn.curseResolved': {
      requireTurnOwner(state, actor);
      requirePhase(state, 'curse');
      state.turn.phase = 'noMonster';
      log('turn.phase', 'Maldición resuelta. Sigue el camino sin monstruo.');
      break;
    }
    case 'turn.lookForTrouble': {
      requireTurnOwner(state, actor);
      requirePhase(state, 'noMonster');
      startCombat(state, 'trouble', action.monster, id, now);
      bump(state, activeParticipantId(state), 'trouble');
      log('combat.start', `${by(state, actor)} busca problemas con un monstruo de su mano.`);
      break;
    }
    case 'turn.lootRoom': {
      requireTurnOwner(state, actor);
      requirePhase(state, 'noMonster');
      state.turn.phase = 'lootRoom';
      bump(state, activeParticipantId(state), 'loots');
      log('turn.phase', `${by(state, actor)} saquea la habitación: roba una Puerta boca abajo.`);
      break;
    }
    case 'turn.lootDone': {
      requireTurnOwner(state, actor);
      requirePhase(state, 'lootRoom');
      state.turn.phase = 'charity';
      log('turn.phase', 'Saqueo hecho. Pasamos a caridad.');
      break;
    }
    case 'turn.charityDone': {
      requireTurnOwner(state, actor);
      requirePhase(state, 'charity');
      state.turn.phase = 'endTurn';
      log('turn.phase', 'Caridad resuelta.');
      break;
    }
    case 'turn.end': {
      requireTurnOwner(state, actor);
      requirePhase(state, 'endTurn');
      const prev = activeParticipantId(state);
      accrueClock(state, now, true);
      state.turn.activeIndex = nextActiveIndex(state);
      state.turn.phase = 'setup';
      state.turn.doorResult = null;
      state.turn.turnNumber += 1;
      startClock(state, now);
      log('turn.next', `Termina el turno de ${displayName(state, prev)}. Le toca a ${displayName(state, activeParticipantId(state))}.`);
      break;
    }

    // ------------------------------------------------ combate
    case 'combat.addMonster': {
      requireCombatEditor(state, actor);
      const c = requireCombat(state);
      if (c.monsters.length >= 8) throw new GameError('invalid', 'Demasiados monstruos. ¡Huí mientras puedas!');
      c.monsters.push(newMonster(action.monster, id));
      log('combat.monster', `Se suma ${action.monster.name || 'un monstruo'} (fuerza ${action.monster.strength}).`);
      break;
    }
    case 'combat.updateMonster': {
      requireCombatEditor(state, actor);
      const c = requireCombat(state);
      const m = c.monsters.find((x) => x.id === action.monsterId);
      if (!m) throw new GameError('not_found', 'Ese monstruo ya no está en el combate.');
      Object.assign(m, { ...action.monster, name: action.monster.name || m.name });
      log('combat.monster', `${by(state, actor)} ajustó a ${m.name} (fuerza ${m.strength}).`);
      break;
    }
    case 'combat.removeMonster': {
      requireCombatEditor(state, actor);
      const c = requireCombat(state);
      const m = c.monsters.find((x) => x.id === action.monsterId);
      if (!m) throw new GameError('not_found', 'Ese monstruo ya no está en el combate.');
      c.monsters = c.monsters.filter((x) => x.id !== action.monsterId);
      log('combat.monster', `${m.name} sale del combate.`);
      break;
    }
    case 'combat.addModifier': {
      requireStatus(state, 'active');
      const c = requireCombat(state);
      c.modifiers.push({ id: id(), side: action.side, label: action.label, value: action.value, addedBy: actor.id });
      const sign = action.value >= 0 ? `+${action.value}` : `${action.value}`;
      log(
        'combat.modifier',
        `${displayName(state, actor.id)} suma ${sign} a ${action.side === 'players' ? 'los jugadores' : 'los monstruos'}${action.label ? ` (${action.label})` : ''}.`,
      );
      break;
    }
    case 'combat.removeModifier': {
      requireStatus(state, 'active');
      const c = requireCombat(state);
      const m = c.modifiers.find((x) => x.id === action.modifierId);
      if (!m) throw new GameError('not_found', 'Ese modificador ya no existe.');
      if (m.addedBy !== actor.id && !actor.isDm && c.fighterId !== actor.id) {
        throw new GameError('forbidden', 'Solo quien lo agregó, el jugador activo o el DM pueden quitarlo.');
      }
      c.modifiers = c.modifiers.filter((x) => x.id !== action.modifierId);
      log('combat.modifier', `Se quitó un modificador de ${m.value >= 0 ? '+' : ''}${m.value}.`);
      break;
    }

    // ------------------------------------------------ ayuda
    case 'help.request': {
      requireStatus(state, 'active');
      const c = requireCombat(state);
      if (c.fighterId !== actor.id) throw new GameError('forbidden', 'Solo quien pelea puede pedir ayuda.');
      if (action.toId === actor.id) throw new GameError('invalid', 'No podés ayudarte a vos mismo. Buen intento.');
      player(state, action.toId);
      if (c.helperId) throw new GameError('invalid', 'Ya tenés un ayudante. Solo se permite uno a la vez.');
      if (c.helpRequests.some((r) => r.toId === action.toId && r.status === 'pending')) {
        throw new GameError('invalid', 'Ya le pediste ayuda a esa persona. Esperá su respuesta.');
      }
      c.helpRequests.push({ id: id(), fromId: actor.id, toId: action.toId, status: 'pending', createdAt: now });
      bump(state, actor.id, 'helpAsked');
      log('help.request', `${displayName(state, actor.id)} le pide ayuda a ${displayName(state, action.toId)}.`);
      break;
    }
    case 'help.respond': {
      requireStatus(state, 'active');
      const c = requireCombat(state);
      const r = c.helpRequests.find((x) => x.id === action.requestId);
      if (!r) throw new GameError('not_found', 'Esa solicitud de ayuda ya no existe.');
      // En las salas de práctica, el DM responde por los jugadores de mentira.
      const forBot = state.config.practice && actor.isDm && state.participants[r.toId]?.bot;
      if (r.toId !== actor.id && !forBot) throw new GameError('forbidden', 'Esa solicitud no es para vos.');
      if (r.status !== 'pending') throw new GameError('invalid', 'Esa solicitud ya fue respondida.');
      if (action.accept) {
        if (c.helperId) throw new GameError('invalid', 'Ya hay un ayudante en este combate.');
        r.status = 'accepted';
        c.helperId = r.toId;
        for (const other of c.helpRequests) if (other.status === 'pending') other.status = 'cancelled';
        log('help.accept', `${displayName(state, r.toId)} se suma al combate como ayudante.`);
      } else {
        r.status = 'rejected';
        bump(state, r.toId, 'helpRefused');
        log('help.reject', `${displayName(state, r.toId)} rechazó ayudar. Que lo disfrute.`);
      }
      break;
    }
    case 'help.cancel': {
      requireStatus(state, 'active');
      const c = requireCombat(state);
      const r = c.helpRequests.find((x) => x.id === action.requestId);
      if (!r || r.status !== 'pending') throw new GameError('invalid', 'Esa solicitud ya no está pendiente.');
      if (r.fromId !== actor.id && !actor.isDm) throw new GameError('forbidden', 'Solo quien pidió la ayuda puede cancelarla.');
      r.status = 'cancelled';
      log('help.cancel', `Se canceló el pedido de ayuda a ${displayName(state, r.toId)}.`);
      break;
    }
    case 'help.dismissHelper': {
      requireStatus(state, 'active');
      const c = requireCombat(state);
      if (!c.helperId) throw new GameError('invalid', 'No hay ayudante.');
      if (![c.fighterId, c.helperId].includes(actor.id) && !actor.isDm) {
        throw new GameError('forbidden', 'Solo quien pelea, el ayudante o el DM pueden hacer eso.');
      }
      log('help.leave', `${displayName(state, c.helperId)} deja de ayudar.`);
      c.helperId = null;
      break;
    }

    // ------------------------------------------------ resoluciones
    case 'combat.resolveVictory': {
      const c = requireResolver(state, actor);
      const allowed = new Set([c.fighterId, c.helperId].filter(Boolean) as string[]);
      const seen = new Set<string>();
      const parts: string[] = [];
      for (const r of action.rewards) {
        if (!allowed.has(r.participantId) || seen.has(r.participantId)) {
          throw new GameError('invalid', 'Las recompensas son solo para quien peleó y su ayudante.');
        }
        seen.add(r.participantId);
        const ch = state.characters[r.participantId];
        if (r.levels !== 0) setLevel(state, ch, ch.level + r.levels, events);
        parts.push(`${ch.name} ${r.levels >= 0 ? '+' : ''}${r.levels} nivel${Math.abs(r.levels) === 1 ? '' : 'es'}${r.note ? ` (${r.note})` : ''}`);
      }
      const treasures = c.monsters.reduce((a, m) => a + m.treasures, 0);
      bump(state, c.fighterId, 'wins');
      bump(state, c.fighterId, 'monsters', c.monsters.length);
      bump(state, c.fighterId, 'treasures', treasures);
      const strongest = Math.max(0, ...c.monsters.map((m) => m.strength));
      const fs = state.stats?.[c.fighterId];
      if (fs && strongest > fs.biggest) fs.biggest = strongest;
      bump(state, c.helperId, 'helpGiven');
      events.unshift({
        type: 'combat.victory',
        message: `¡Victoria contra ${c.monsters.map((m) => m.name).join(', ') || 'el monstruo'}! ${parts.join('; ') || 'Sin cambios de nivel'}. Tesoros a robar: ${treasures}.${action.note ? ` ${action.note}` : ''}`,
      });
      endCombat(state);
      break;
    }
    case 'combat.resolveFlee': {
      const c = requireResolver(state, actor);
      const fighters = new Set([c.fighterId, c.helperId].filter(Boolean) as string[]);
      const lines: string[] = [];
      for (const o of action.outcomes) {
        const m = c.monsters.find((x) => x.id === o.monsterId);
        if (!fighters.has(o.participantId) || !m) throw new GameError('invalid', 'Resultado de huida inválido.');
        lines.push(`${displayName(state, o.participantId)} ${o.result === 'escaped' ? 'escapó de' : 'fue atrapado por'} ${m.name}`);
        bump(state, o.participantId, o.result === 'escaped' ? 'escaped' : 'caught');
      }
      log('combat.flee', `Huida: ${lines.join('; ') || 'sin detalle'}.${action.note ? ` ${action.note}` : ''} Las consecuencias se resuelven en la mesa.`);
      endCombat(state);
      break;
    }
    case 'combat.resolveOther': {
      requireResolver(state, actor);
      log('combat.other', `Combate resuelto: ${action.text}`);
      endCombat(state);
      break;
    }

    // ------------------------------------------------ DM
    case 'dm.setTurn': {
      requireDm(actor);
      requireStatus(state, 'active', 'paused');
      const idx = state.turn.order.indexOf(action.activeId);
      if (idx < 0) throw new GameError('invalid', 'Ese jugador no está en el orden de turnos.');
      const changedPlayer = idx !== state.turn.activeIndex;
      if (changedPlayer) accrueClock(state, now, true);
      if (state.combat && (action.phase !== 'combat' || changedPlayer)) {
        log('dm.correction', 'El DM descartó el combate en curso.');
        state.combat = null;
      }
      state.turn.activeIndex = idx;
      if (changedPlayer) startClock(state, now);
      if (action.phase === 'combat' && !state.combat) startCombat(state, 'dm', undefined, id, now);
      state.turn.phase = action.phase;
      log('dm.correction', `Corrección del DM: turno de ${displayName(state, action.activeId)}, fase «${PHASE_LABEL[action.phase]}».`);
      break;
    }
    case 'dm.transfer': {
      requireDm(actor);
      const target = player(state, action.toId);
      if (target.id === actor.id) throw new GameError('invalid', 'Ya sos el DM.');
      actor.isDm = false;
      target.isDm = true;
      log('dm.transfer', `${displayName(state, actor.id)} le pasó la administración a ${displayName(state, target.id)}.`);
      break;
    }
    case 'dm.removeParticipant': {
      requireDm(actor);
      const target = participant(state, action.participantId);
      if (target.id === actor.id) throw new GameError('invalid', 'Transferí la administración antes de irte.');
      const activeId = activeParticipantId(state);
      const removedActive = activeId === target.id && state.turn.order.includes(target.id);
      if (removedActive) accrueClock(state, now, true);
      if (state.combat && [state.combat.fighterId, state.combat.helperId].includes(target.id)) {
        throw new GameError('invalid', 'Resolvé el combate antes de quitar a alguien que participa.');
      }
      target.removed = true;
      const order = state.turn.order.filter((x) => x !== target.id);
      if (order.length !== state.turn.order.length) {
        if (activeId === target.id) {
          // Quitar al activo: el turno pasa al siguiente, desde preparación.
          state.turn.order = order;
          state.turn.activeIndex = order.length ? state.turn.activeIndex % order.length : 0;
          state.turn.phase = 'setup';
          state.turn.doorResult = null;
        } else {
          state.turn.order = order;
          state.turn.activeIndex = activeId ? Math.max(0, order.indexOf(activeId)) : 0;
        }
      }
      if (removedActive) startClock(state, now);
      if (state.levelAlert?.participantId === target.id) state.levelAlert = null;
      log('dm.remove', `El DM quitó a ${displayName(state, target.id)} de la sala.`);
      return { state, events, revokeParticipant: target.id };
    }
    case 'levelAlert.confirmWinner': {
      requireDm(actor);
      if (!state.levelAlert) throw new GameError('invalid', 'No hay ningún aviso de nivel pendiente.');
      const w = state.levelAlert.participantId;
      accrueClock(state, now, true);
      state.status = 'finished';
      state.winnerId = w;
      state.finishedAt = now;
      state.combat = null;
      state.levelAlert = null;
      log('game.end', `El DM confirmó la victoria: ¡${displayName(state, w)} gana la partida!`);
      break;
    }
    case 'levelAlert.dismiss': {
      requireDm(actor);
      if (!state.levelAlert) throw new GameError('invalid', 'No hay ningún aviso de nivel pendiente.');
      log('dm.correction', `El DM indicó que ${displayName(state, state.levelAlert.participantId)} todavía no gana.`);
      state.levelAlert = null;
      break;
    }
    default: {
      const never: never = action;
      throw new GameError('invalid', `Acción desconocida: ${(never as { type: string }).type}`);
    }
  }

  return { state, events };
}

function requireCombatEditor(state: GameState, actor: Participant) {
  requireStatus(state, 'active');
  const c = requireCombat(state);
  if (c.fighterId !== actor.id && c.helperId !== actor.id && !actor.isDm) {
    throw new GameError('forbidden', 'Solo quien pelea, su ayudante o el DM cargan monstruos.');
  }
}

function requireResolver(state: GameState, actor: Participant): Combat {
  requireStatus(state, 'active');
  const c = requireCombat(state);
  if (c.fighterId !== actor.id && !actor.isDm) {
    throw new GameError('forbidden', 'Solo el jugador activo o el DM pueden resolver el combate.');
  }
  return c;
}

/** Cierra el combate: los modificadores temporales desaparecen con él y se pasa a caridad. */
function endCombat(state: GameState) {
  state.combat = null;
  state.turn.phase = 'charity';
}
