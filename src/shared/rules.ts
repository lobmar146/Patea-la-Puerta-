import type { Character, Combat, GameState } from './types.js';

export const APP_NAME = 'Pateá la Puerta!';

/** Conjuntos preseleccionados al crear una sala. Se pueden sumar otros como texto libre. */
export const DEFAULT_SETS = [
  'Munchkin (juego base)',
  'Munchkin 2: Hacha sobrenatural (Unnatural Axe)',
  'Munchkin 3: Errores clericales (Clerical Errors)',
];

/**
 * Sugerencias para los campos de raza y clase. Son solo atajos: los campos admiten texto libre
 * y la mesa decide qué combinación es legal. Ver docs/DECISIONS.md (D-08).
 */
export const RACE_SUGGESTIONS = ['Elfo', 'Enano', 'Mediano', 'Orco', 'Gnomo'];
export const CLASS_SUGGESTIONS = ['Guerrero', 'Mago', 'Clérigo', 'Ladrón', 'Bárbaro', 'Bardo'];

export const COLORS = [
  '#9b1c1c',
  '#1f4f8f',
  '#2f6b3a',
  '#7c3aed',
  '#b45309',
  '#0f766e',
  '#be185d',
  '#4b5563',
];

export const MIN_LEVEL = 1;
export const WIN_LEVEL = 10;

export function basePower(c: Pick<Character, 'level' | 'gear' | 'otherMods'>): number {
  return c.level + c.gear + c.otherMods;
}

export interface CombatTotals {
  fighter: number;
  helper: number;
  playerMods: number;
  players: number;
  monsterBase: number;
  monsterMods: number;
  monsters: number;
  /** players - monsters. Positivo: los jugadores superan. No decide el resultado. */
  diff: number;
}

/** Totales del combate con las estadísticas vigentes de los participantes. */
export function combatTotals(state: GameState, combat: Combat): CombatTotals {
  const fighterChar = state.characters[combat.fighterId];
  const helperChar = combat.helperId ? state.characters[combat.helperId] : undefined;
  const fighter = fighterChar ? basePower(fighterChar) : 0;
  const helper = helperChar ? basePower(helperChar) : 0;
  const sum = (side: 'players' | 'monsters') =>
    combat.modifiers.filter((m) => m.side === side).reduce((a, m) => a + m.value, 0);
  const playerMods = sum('players');
  const monsterBase = combat.monsters.reduce((a, m) => a + m.strength, 0);
  const monsterMods = sum('monsters');
  const players = fighter + helper + playerMods;
  const monsters = monsterBase + monsterMods;
  return { fighter, helper, playerMods, players, monsterBase, monsterMods, monsters, diff: players - monsters };
}

/** En el juego base, un Guerrero en cualquiera de los dos puestos gana los empates. */
export function playersWinTies(state: GameState, fighterId: string | null, helperId?: string | null): boolean {
  return [fighterId, helperId].some((id) => {
    if (!id) return false;
    return state.characters[id]?.classes.some((label) => ['guerrero', 'warrior'].includes(label.trim().toLowerCase()));
  });
}

export function activeParticipantId(state: GameState): string | null {
  if (state.status === 'lobby' || state.turn.order.length === 0) return null;
  return state.turn.order[state.turn.activeIndex] ?? null;
}

export function displayName(state: GameState, participantId: string | null | undefined): string {
  if (!participantId) return '—';
  return state.characters[participantId]?.name ?? state.participants[participantId]?.name ?? 'Alguien';
}

/** Próximos jugadores en el orden, empezando por el siguiente al activo. */
export function upcoming(state: GameState, count: number): string[] {
  const { order, activeIndex } = state.turn;
  const out: string[] = [];
  for (let i = 1; i <= Math.min(count, order.length - 1); i++) {
    out.push(order[(activeIndex + i) % order.length]);
  }
  return out;
}
