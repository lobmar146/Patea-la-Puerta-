// Ayudas para quien juega por primera vez. Paráfrasis breves de las reglas del juego base
// (munchkin.game/gameplay/rules y /faq): no reproducen el reglamento y la mesa siempre manda.

import { combatTotals, WIN_LEVEL, activeParticipantId, displayName, playersWinTies } from './rules.js';
import type { Character, EquipSlot, GameState, Item } from './types.js';

// ---------------------------------------------------------------- consejos por situación

export interface Coaching {
  /** Lo más importante para hacer ahora. */
  now: string[];
  /** Lo que se puede hacer en cualquier momento, aunque no sea tu turno. */
  anytime: string[];
}

const hasRace = (c: Character | undefined, ...names: string[]) =>
  !!c?.races.some((r) => names.includes(r.trim().toLowerCase()));

/** Consejos según la fase y el rol de quien mira. Función pura. */
export function coaching(state: GameState, meId: string): Coaching {
  const me = state.characters[meId];
  const activeId = activeParticipantId(state);
  const mine = activeId === meId;
  const who = displayName(state, activeId);
  const now: string[] = [];
  const anytime: string[] = [
    'Podés jugar una maldición sobre cualquier jugador en cualquier momento.',
    'Las cartas de “Uso único” (pociones, por ejemplo) se pueden jugar en cualquier combate, aunque no sea tuyo.',
    'Podés ofrecer ayuda en un combate ajeno y negociar qué te llevás a cambio.',
  ];

  if (state.status === 'lobby') {
    now.push('Elegí tu avatar y esperá a que el DM empiece. Todos arrancan en nivel 1.');
    now.push('Al empezar, cada uno roba 4 cartas de Puerta y 4 de Tesoro y puede jugar las razas, clases y objetos que quiera.');
    return { now, anytime };
  }

  if (!mine) {
    if (state.turn.phase === 'combat' && state.combat) {
      now.push(`${who} está peleando. Podés ayudar si te lo piden, o meter un monstruo errante o una carta que lo complique.`);
      now.push('Si querés ayudar, negociá: el que pelea decide qué tesoros te tocan.');
    } else {
      now.push(`Es el turno de ${who}. Mientras, podés reacomodar tu equipo en la app y planear tu jugada.`);
    }
    if (me && me.level === WIN_LEVEL - 1) now.push('Estás en nivel 9: solo ganás matando un monstruo (no vendiendo ni con cartas de “sube un nivel”, salvo que la carta lo diga).');
    return { now, anytime };
  }

  switch (state.turn.phase) {
    case 'setup':
      now.push('Antes de patear la puerta: jugá razas, clases y objetos de tu mano, y vendé objetos si querés subir de nivel.');
      now.push('Cambiar de equipo solo se puede en tu turno y fuera de combate. ¡Aprovechá ahora!');
      now.push('Cuando estés listo, tocá “Patear la puerta” y robá una carta de Puerta boca arriba.');
      break;
    case 'kickDoor':
      now.push('Mirá la carta que robaste: si es un monstruo, peleás ya; si es maldición, te afecta a vos; si es otra cosa, va a tu mano.');
      break;
    case 'curse':
      now.push('Aplicá la maldición como dice la carta. Si te baja de nivel o te saca equipo, corregilo en “Mi personaje”.');
      break;
    case 'noMonster':
      now.push('Elegí una: buscar problemas (peleás contra un monstruo de tu mano) o saquear (robás otra Puerta boca abajo).');
      now.push('Buscar problemas solo conviene si le ganás: mirá tu poder en la pestaña “Mi personaje”.');
      break;
    case 'lootRoom':
      now.push('Robá una carta de Puerta boca abajo y guardala. Si es un monstruo, no lo peleás ahora.');
      break;
    case 'combat': {
      const c = state.combat;
      if (!c || c.monsters.length === 0) {
        now.push('Cargá el monstruo con su nivel para ver quién va ganando.');
        break;
      }
      const t = combatTotals(state, c);
      const tie = playersWinTies(state, c.fighterId, c.helperId);
      const winning = t.diff > 0 || (t.diff === 0 && tie);
      if (winning) {
        now.push(`Vas ganando ${t.players} a ${t.monsters}. Esperá un momento por si alguien juega algo en tu contra, y después confirmá la victoria.`);
        now.push('Al ganar subís los niveles que dice el monstruo y robás sus tesoros boca abajo (si alguien te ayudó, repartís como acordaron).');
      } else {
        now.push(`Vas perdiendo ${t.players} a ${t.monsters}${t.diff === 0 ? ' (en empate gana el monstruo, salvo que seas Guerrero)' : ''}.`);
        now.push('Opciones: jugar una carta de “Uso único” que te sume, pedir ayuda a otro jugador, o huir.');
        now.push(`Para huir tirás el dado por cada monstruo: con 5 o 6 escapás${hasRace(me, 'elfo', 'elf') ? ' (como Elfo sumás +1)' : ''}. Si no, te pasa lo “malo” que dice la carta.`);
      }
      break;
    }
    case 'charity': {
      const limit = hasRace(me, 'enano', 'dwarf') ? 6 : 5;
      now.push(`Contá tus cartas en la mano: el máximo es ${limit}${limit === 6 ? ' (por ser Enano)' : ''}.`);
      now.push('Antes de dar, podés jugar las que puedas (equipo, razas, clases). Lo que sobre va al jugador de menor nivel; si el menor sos vos, se descarta.');
      break;
    }
    case 'endTurn':
      now.push('¡Listo! Pasá el turno. Si algo quedó mal, el DM lo puede corregir.');
      break;
  }
  if (me && me.level === WIN_LEVEL - 1) now.push('Estás en nivel 9: el nivel 10 solo se gana matando un monstruo.');
  return { now, anytime };
}

// ---------------------------------------------------------------- muerte

export const DEATH_STEPS = [
  'Te quedás con tu nivel, tus razas, tus clases y las maldiciones que digan que siguen.',
  'Poné a la vista todas las cartas de tu mano y todo lo que tenías en juego (equipo y objetos que llevabas).',
  'Empezando por el jugador de mayor nivel, cada uno se lleva una carta a elección. Si empatan en nivel, tiran el dado.',
  'Lo que nadie se llevó se descarta.',
  'Hasta tu próximo turno no tenés cartas, pero seguís jugando: podés ayudar en combates con tu nivel. Mientras tanto no recibís cartas de caridad.',
  'Cuando vuelva a ser tu turno, robás 2 Puertas y 2 Tesoros boca abajo y seguís jugando normalmente.',
] as const;

// ---------------------------------------------------------------- venta

export const GOLD_PER_LEVEL = 1000;

export interface SaleResult {
  total: number;
  /** Niveles que se pueden subir de verdad (respeta el tope de nivel 9). */
  levels: number;
  /** Oro que no alcanza para otro nivel: se pierde (no hay cambio). */
  leftover: number;
  /** true si el oro alcanzaba para más niveles pero el tope lo impide. */
  capped: boolean;
}

/** Cada 1000 de oro es un nivel; vendiendo no se puede llegar al nivel ganador. */
export function sale(values: number[], level: number): SaleResult {
  const total = values.reduce((a, v) => a + Math.max(0, v), 0);
  const raw = Math.floor(total / GOLD_PER_LEVEL);
  const max = Math.max(0, WIN_LEVEL - 1 - level);
  const levels = Math.min(raw, max);
  return { total, levels, leftover: total - raw * GOLD_PER_LEVEL, capped: raw > max };
}

// ---------------------------------------------------------------- equipo

export const SLOT_LABEL: Record<EquipSlot, string> = {
  head: 'Cabeza',
  armor: 'Armadura',
  feet: 'Calzado',
  hand: 'Una mano',
  twoHands: 'Dos manos',
  other: 'Otro',
};

/** Bonificación total del equipo puesto. */
export function gearFromItems(items: Item[]): number {
  return items.filter((i) => i.equipped).reduce((a, i) => a + i.bonus, 0);
}

/** Avisos (no prohibiciones) sobre el equipo puesto. Las cartas pueden cambiar estos límites. */
export function equipmentWarnings(items: Item[], c: Pick<Character, 'races'>): string[] {
  const on = items.filter((i) => i.equipped);
  const count = (s: EquipSlot) => on.filter((i) => i.slot === s).length;
  const out: string[] = [];
  if (count('head') > 1) out.push('Tenés más de un objeto de cabeza puesto: solo se permite uno.');
  if (count('armor') > 1) out.push('Tenés más de una armadura puesta: solo se permite una.');
  if (count('feet') > 1) out.push('Tenés más de un calzado puesto: solo se permite uno.');
  const hands = count('hand') + count('twoHands') * 2;
  if (hands > 2) out.push(`Estás usando ${hands} manos: solo tenés 2.`);
  const big = items.filter((i) => i.big).length;
  const dwarf = c.races.some((r) => ['enano', 'dwarf'].includes(r.trim().toLowerCase()));
  if (big > 1 && !dwarf) out.push('Llevás más de un objeto Grande: solo se permite uno (los Enanos pueden llevar varios).');
  return out;
}
