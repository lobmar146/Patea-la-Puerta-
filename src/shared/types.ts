// Tipos del estado de partida. Este estado se guarda como JSONB versionado en Room.state.

export type Role = 'player' | 'spectator';
export type GameStatus = 'lobby' | 'active' | 'paused' | 'finished';

export const PHASES = [
  'setup',
  'kickDoor',
  'curse',
  'noMonster',
  'lootRoom',
  'combat',
  'charity',
  'endTurn',
] as const;
export type Phase = (typeof PHASES)[number];

export interface Participant {
  id: string;
  name: string;
  role: Role;
  isDm: boolean;
  joinedAt: string;
  removed: boolean;
  /** Jugador de mentira de una sala de práctica (sin sesión). */
  bot?: boolean;
}

export type EquipSlot = 'head' | 'armor' | 'feet' | 'hand' | 'twoHands' | 'other';

/** Objeto del personaje. Solo los puestos (equipped) suman a la bonificación. */
export interface Item {
  id: string;
  name: string;
  bonus: number;
  slot: EquipSlot;
  big: boolean;
  equipped: boolean;
  /** De un solo uso (pociones y similares): no suma al equipo; se gasta al usarlo en un combate. */
  oneShot?: boolean;
}

export type Sex = 'male' | 'female';

export interface Character {
  id: string; // = participantId
  name: string;
  color: string;
  /** Id de AVATARS (rules.ts). Opcional: las salas viejas no lo tienen. */
  avatar?: string;
  /** Sexo del personaje (algunas cartas dependen de él). Opcional: las salas viejas no lo tienen. */
  sex?: Sex;
  level: number;
  classes: string[];
  races: string[];
  gear: number;
  otherMods: number;
  notes: string;
  /** Opcional: si hay objetos cargados, `gear` se calcula con ellos. */
  items?: Item[];
}

/** Condición impresa en la carta: "+5 contra mujeres", "no persigue a elfos". */
export interface MonsterCondition {
  /** Contra quién: sexo (male/female), una raza o una clase. */
  kind: 'sex' | 'race' | 'class';
  value: string;
  /** Suma (o resta) al monstruo si pelea alguien así. */
  bonus: number;
  /** No persigue a esa gente al huir. */
  noPursue: boolean;
}

export interface Monster {
  id: string;
  name: string;
  strength: number;
  levels: number;
  treasures: number;
  /** Opcional: los monstruos viejos no lo tienen. */
  conditions?: MonsterCondition[];
}

export type CombatSide = 'players' | 'monsters';

export interface CombatModifier {
  id: string;
  side: CombatSide;
  label: string;
  value: number;
  addedBy: string;
}

export type HelpStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface HelpRequest {
  id: string;
  fromId: string;
  toId: string;
  status: HelpStatus;
  createdAt: string;
}

export interface Combat {
  id: string;
  origin: 'door' | 'trouble' | 'dm';
  fighterId: string;
  monsters: Monster[];
  modifiers: CombatModifier[];
  helperId: string | null;
  helpRequests: HelpRequest[];
  startedAt: string;
}

/** Modo elegido al crear la sala. Las salas viejas no lo tienen: equivale a 'normal'. */
export type GameMode = 'normal' | 'fast';

export interface RoomConfig {
  sets: string[];
  extraSets: string[];
  ttlDays: number;
  /** Sala de práctica: jugadores de mentira que maneja quien la creó. */
  practice?: boolean;
  mode?: GameMode;
}

export type DoorResult = 'monster' | 'curse' | 'other';

export interface TurnState {
  order: string[];
  activeIndex: number;
  phase: Phase;
  turnNumber: number;
  doorResult: DoorResult | null;
}

/** Reloj por turnos. El intervalo actual se deriva de activeSince y se persiste. */
export interface TurnClockState {
  activeSince: string | null;
  turnElapsedMs: number;
  totalsByParticipant: Record<string, number>;
}

export interface LevelAlert {
  participantId: string;
  level: number;
}

/** Contadores por jugador para los premios del final. Solo suman; el DM no los edita. */
export interface PlayerStats {
  doors: number;
  curses: number;
  trouble: number;
  loots: number;
  wins: number;
  monsters: number;
  treasures: number;
  /** Fuerza del monstruo más fuerte vencido. */
  biggest: number;
  helpAsked: number;
  helpGiven: number;
  helpRefused: number;
  escaped: number;
  caught: number;
}

export interface GameState {
  schema: 1;
  code: string;
  status: GameStatus;
  config: RoomConfig;
  participants: Record<string, Participant>;
  characters: Record<string, Character>;
  turn: TurnState;
  clock: TurnClockState;
  combat: Combat | null;
  levelAlert: LevelAlert | null;
  winnerId: string | null;
  finishedAt: string | null;
  /** Opcional: las salas creadas antes de los premios no lo tienen. */
  stats?: Record<string, PlayerStats>;
  /** Revancha: sala nueva con el mismo grupo y a qué participante nuevo corresponde cada uno. */
  rematch?: { code: string; map: Record<string, string> };
  /** Último cambio manual de cada personaje, para poder deshacerlo (opcional en salas viejas). */
  undo?: Record<string, UndoEntry>;
}

export interface UndoEntry {
  /** Qué se cambió, para mostrarlo en el botón ("nivel 3→4"). */
  label: string;
  by: string;
  before: Character;
  after: Character;
}

export interface EventDTO {
  id: number;
  version: number;
  type: string;
  actorId: string | null;
  message: string;
  createdAt: string;
}

export interface Me {
  participantId: string;
  role: Role;
  isDm: boolean;
}

export interface Snapshot {
  roomId: string;
  code: string;
  version: number;
  state: GameState;
  events: EventDTO[];
  me: Me;
  online: string[];
  expiresAt: string;
  /** Hora del servidor al armar el snapshot: corrige relojes desfasados en el cronómetro. */
  serverTime: string;
}

export type CommandResult =
  | { ok: true; version: number; duplicate: boolean }
  | { ok: false; code: string; message: string; version: number };
