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
}

export interface Character {
  id: string; // = participantId
  name: string;
  color: string;
  level: number;
  classes: string[];
  races: string[];
  gear: number;
  otherMods: number;
  notes: string;
}

export interface Monster {
  id: string;
  name: string;
  strength: number;
  levels: number;
  treasures: number;
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

export interface RoomConfig {
  sets: string[];
  extraSets: string[];
  ttlDays: number;
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
}

export type CommandResult =
  | { ok: true; version: number; duplicate: boolean }
  | { ok: false; code: string; message: string; version: number };
