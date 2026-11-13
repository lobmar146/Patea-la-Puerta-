// Podio y premios "en joda" del final de la partida. Función pura sobre el estado guardado.
import type { GameState, PlayerStats } from './types.js';

export type AwardIcon = 'monster' | 'victory' | 'help' | 'curse' | 'flee' | 'treasure' | 'kick' | 'time' | 'loot' | 'trouble';

export interface Award {
  id: string;
  title: string;
  detail: string;
  icon: AwardIcon;
  winnerId: string;
}

interface AwardDef {
  id: string;
  title: string;
  icon: AwardIcon;
  value: (s: PlayerStats, time: number) => number;
  detail: (n: number) => string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const minutes = (ms: number) => {
  const m = Math.round(ms / 60000);
  return m < 1 ? 'menos de un minuto' : plural(m, 'minuto', 'minutos');
};

/** En orden de prioridad: si hay más premios que jugadores, se muestran primero los de arriba. */
const DEFS: AwardDef[] = [
  { id: 'slayer', title: 'Mata-monstruos', icon: 'monster', value: (s) => s.monsters, detail: (n) => plural(n, 'monstruo vencido', 'monstruos vencidos') },
  { id: 'biggest', title: 'Matagigantes', icon: 'victory', value: (s) => s.biggest, detail: (n) => `Venció a un monstruo de nivel ${n}` },
  { id: 'samaritan', title: 'Buen samaritano', icon: 'help', value: (s) => s.helpGiven, detail: (n) => `Ayudó a ganar ${plural(n, 'combate', 'combates')}` },
  { id: 'beggar', title: 'Pide-ayuda profesional', icon: 'help', value: (s) => s.helpAsked, detail: (n) => `Pidió ayuda ${plural(n, 'vez', 'veces')}` },
  { id: 'heartless', title: 'Corazón de piedra', icon: 'trouble', value: (s) => s.helpRefused, detail: (n) => `Negó ayuda ${plural(n, 'vez', 'veces')}` },
  { id: 'chicken', title: 'Pies de pollo', icon: 'flee', value: (s) => s.escaped, detail: (n) => `Escapó ${plural(n, 'vez', 'veces')}` },
  { id: 'snack', title: 'Comida de monstruo', icon: 'monster', value: (s) => s.caught, detail: (n) => `Lo atraparon ${plural(n, 'vez', 'veces')}` },
  { id: 'cursed', title: 'Imán de maldiciones', icon: 'curse', value: (s) => s.curses, detail: (n) => plural(n, 'maldición', 'maldiciones') },
  { id: 'hoarder', title: 'Acaparador', icon: 'treasure', value: (s) => s.treasures, detail: (n) => plural(n, 'tesoro ganado', 'tesoros ganados') },
  { id: 'kicker', title: 'Pateador serial', icon: 'kick', value: (s) => s.doors, detail: (n) => plural(n, 'puerta pateada', 'puertas pateadas') },
  { id: 'looter', title: 'Rata de mazmorra', icon: 'loot', value: (s) => s.loots, detail: (n) => `Saqueó ${plural(n, 'sala', 'salas')}` },
  { id: 'slow', title: 'Se toma su tiempo', icon: 'time', value: (_s, t) => t, detail: (n) => `${minutes(n)} jugando sus turnos` },
];

const ZERO: PlayerStats = {
  doors: 0, curses: 0, trouble: 0, loots: 0, wins: 0, monsters: 0, treasures: 0, biggest: 0,
  helpAsked: 0, helpGiven: 0, helpRefused: 0, escaped: 0, caught: 0,
};

/** Jugadores que siguen en la sala, ordenados para el podio: ganador primero, después por nivel. */
export function podium(state: GameState): string[] {
  return Object.values(state.characters)
    .filter((c) => !state.participants[c.id]?.removed)
    .sort((a, b) => Number(b.id === state.winnerId) - Number(a.id === state.winnerId) || b.level - a.level || a.name.localeCompare(b.name))
    .map((c) => c.id);
}

/**
 * Premios del final. Cada premio va a quien tiene el número más alto (si es mayor que 0);
 * en empate gana quien quedó mejor en el podio. Se muestran hasta `max` premios.
 */
export function computeAwards(state: GameState, max = 6): Award[] {
  const order = podium(state);
  if (order.length < 2) return [];
  const out: Award[] = [];
  for (const def of DEFS) {
    let best: { id: string; n: number } | null = null;
    for (const pid of order) {
      const n = def.value(state.stats?.[pid] ?? ZERO, state.clock.totalsByParticipant[pid] ?? 0);
      if (n > 0 && (!best || n > best.n)) best = { id: pid, n };
    }
    if (best) out.push({ id: def.id, title: def.title, detail: def.detail(best.n), icon: def.icon, winnerId: best.id });
    if (out.length >= max) break;
  }
  return out;
}
