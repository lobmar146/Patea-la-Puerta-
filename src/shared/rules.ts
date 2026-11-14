import type { Character, Combat, GameState, Monster, MonsterCondition, Sex } from './types.js';

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

/** Avatares elegibles (íconos de game-icons.net). El id se guarda en el personaje. */
export const AVATARS = [
  { id: 'mago', label: 'Mago' },
  { id: 'guerrero', label: 'Guerrero' },
  { id: 'enano', label: 'Enano' },
  { id: 'elfo', label: 'Elfo' },
  { id: 'ladron', label: 'Ladrón' },
  { id: 'vikingo', label: 'Vikingo' },
  { id: 'dragon', label: 'Dragón' },
  { id: 'pollo', label: 'Pollo' },
  { id: 'calavera', label: 'Calavera' },
  { id: 'vampiro', label: 'Vampiro' },
  { id: 'bufon', label: 'Bufón' },
  { id: 'goblin', label: 'Goblin' },
] as const;
export type AvatarId = (typeof AVATARS)[number]['id'];
/** Sexo del personaje: algunas cartas y monstruos afectan solo a hombres o solo a mujeres. */
export const SEX_LABEL: Record<Sex, string> = { male: 'Hombre', female: 'Mujer' };
export const SEX_SYMBOL: Record<Sex, string> = { male: '♂', female: '♀' };

/** "♀ Mujer · Elfo · Mago": sexo, razas y clases en una línea. */
export function identityLine(c: Pick<Character, 'sex' | 'races' | 'classes'>): string {
  const sex = c.sex ? `${SEX_SYMBOL[c.sex]} ${SEX_LABEL[c.sex]}` : null;
  const rest = [...c.races, ...c.classes];
  return [sex, ...(rest.length ? rest : ['Humano'])].filter(Boolean).join(' · ');
}

export const AVATAR_IDS = AVATARS.map((a) => a.id) as [AvatarId, ...AvatarId[]];

/** Avatar del personaje; las salas creadas antes de los avatares reciben uno estable según su id. */
export function avatarOf(c: Pick<Character, 'id' | 'avatar'>): AvatarId {
  if (c.avatar && (AVATAR_IDS as string[]).includes(c.avatar)) return c.avatar as AvatarId;
  let h = 0;
  for (const ch of c.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_IDS[h % AVATAR_IDS.length];
}

/** Reacciones rápidas permitidas (efímeras: no se guardan). */
export const REACTIONS = ['😂', '💀', '🔥', '🐔', '👏', '😱'] as const;
export type Reaction = (typeof REACTIONS)[number];

export const MIN_LEVEL = 1;
export const WIN_LEVEL = 10;

/** Jugadores a un paso de ganar (nivel 9): el nivel 10 solo se gana matando un monstruo. */
export function almostWinners(state: GameState): string[] {
  return state.turn.order.filter((id) => {
    const c = state.characters[id];
    return c && !state.participants[id]?.removed && c.level === WIN_LEVEL - 1;
  });
}

export function basePower(c: Pick<Character, 'level' | 'gear' | 'otherMods'>): number {
  return c.level + c.gear + c.otherMods;
}

export interface AppliedCondition {
  monsterId: string;
  monsterName: string;
  bonus: number;
  /** Texto corto: "+5 contra mujeres (Lu)". */
  label: string;
  who: string[];
}

const norm = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** "contra mujeres", "contra elfos" (texto de la condición, sin el bonus). */
export function conditionTarget(c: Pick<MonsterCondition, 'kind' | 'value'>): string {
  if (c.kind === 'sex') return c.value === 'female' ? 'mujeres' : 'hombres';
  return c.value;
}

/** ¿Este personaje cumple la condición? Sin carta de raza se cuenta como humano. */
export function matchesCondition(ch: Pick<Character, 'sex' | 'races' | 'classes'>, c: Pick<MonsterCondition, 'kind' | 'value'>): boolean {
  if (c.kind === 'sex') return ch.sex === c.value;
  const list = c.kind === 'race' ? (ch.races.length ? ch.races : ['Humano']) : ch.classes;
  const want = norm(c.value).replace(/s$/, '');
  // "Elfos" coincide con "Elfo", "enanos" con "Enano".
  return list.some((x) => {
    const have = norm(x).replace(/s$/, '');
    return have === want || (want.endsWith('e') && have === want.slice(0, -1));
  });
}

/** Condiciones con bonus que aplican por quien pelea o ayuda. Cada una se suma una vez. */
export function appliedConditions(state: GameState, combat: Combat): AppliedCondition[] {
  const people = [combat.fighterId, combat.helperId].filter((x): x is string => !!x && !!state.characters[x]);
  const out: AppliedCondition[] = [];
  for (const m of combat.monsters) {
    for (const c of m.conditions ?? []) {
      if (!c.bonus) continue;
      const who = people.filter((p) => matchesCondition(state.characters[p], c)).map((p) => state.characters[p].name);
      if (who.length) out.push({ monsterId: m.id, monsterName: m.name, bonus: c.bonus, who, label: `${c.bonus > 0 ? '+' : ''}${c.bonus} contra ${conditionTarget(c)} (${who.join(', ')})` });
    }
  }
  return out;
}

/** ¿El monstruo deja de perseguir a esta persona al huir? */
export function noPursue(state: GameState, monster: Monster, participantId: string): boolean {
  const ch = state.characters[participantId];
  return !!ch && (monster.conditions ?? []).some((c) => c.noPursue && matchesCondition(ch, c));
}

export interface CombatTotals {
  fighter: number;
  helper: number;
  playerMods: number;
  players: number;
  monsterBase: number;
  monsterMods: number;
  /** Condiciones de los monstruos que aplican por quién pelea (sexo, raza o clase). */
  conditionMods: number;
  conditions: AppliedCondition[];
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
  const conditions = appliedConditions(state, combat);
  const conditionMods = conditions.reduce((a, c) => a + c.bonus, 0);
  const players = fighter + helper + playerMods;
  const monsters = monsterBase + monsterMods + conditionMods;
  return { fighter, helper, playerMods, players, monsterBase, monsterMods, conditionMods, conditions, monsters, diff: players - monsters };
}

// ---------------------------------------------------------------- poderes simples (juego base)
// Solo los que no dependen de descartar cartas; el resto se juega en la mesa.

// Tolera plurales y tildes: "Elfos", "Guerreros", "medianos".
const tagIs = (list: string[], ...names: string[]) => list.some((x) => names.includes(norm(x).replace(/s$/, '')));
export const isElf = (c: Pick<Character, 'races'> | undefined) => !!c && tagIs(c.races, 'elfo', 'elf');
export const isDwarf = (c: Pick<Character, 'races'> | undefined) => !!c && tagIs(c.races, 'enano', 'dwarf');
export const isHalfling = (c: Pick<Character, 'races'> | undefined) => !!c && tagIs(c.races, 'mediano', 'halfling');
export const isWarrior = (c: Pick<Character, 'classes'> | undefined) => !!c && tagIs(c.classes, 'guerrero', 'warrior');

/** Número del dado para escapar: 5 o más; el Elfo suma +1 (escapa con 4). */
export function fleeTarget(c: Pick<Character, 'races'> | undefined): number {
  return isElf(c) ? 4 : 5;
}

/** Niveles por ayudar a vencer: el Elfo sube 1 por cada monstruo que ayuda a matar. */
export function helperLevels(c: Pick<Character, 'races'> | undefined, monsters: number): number {
  return isElf(c) ? monsters : 0;
}

/** Poderes que la app aplica sola, para mostrarlos en la ficha. */
export function appliedPowers(c: Pick<Character, 'races' | 'classes'>): string[] {
  const out: string[] = [];
  if (isWarrior(c)) out.push('Guerrero: ganás los empates en combate (peleando o ayudando).');
  if (isElf(c)) out.push('Elfo: +1 para huir (escapás con 4, 5 o 6) y subís 1 nivel por cada monstruo que ayudás a vencer.');
  if (isDwarf(c)) out.push('Enano: podés llevar varios objetos Grandes y tener hasta 6 cartas en la mano.');
  if (isHalfling(c)) out.push('Mediano: en tu turno, un objeto por turno se vende al doble (la calculadora de venta lo suma).');
  return out;
}

/** En el juego base, un Guerrero en cualquiera de los dos puestos gana los empates. */
export function playersWinTies(state: GameState, fighterId: string | null, helperId?: string | null): boolean {
  return [fighterId, helperId].some((id) => {
    if (!id) return false;
    return isWarrior(state.characters[id]);
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
