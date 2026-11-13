// Textos de guía por fase. Paráfrasis breves de las reglas oficiales de Munchkin
// (munchkin.game/gameplay/rules y /faq). No reproducen el reglamento: la mesa manda.

import type { Phase } from './types.js';

export type IllustrationKey =
  | 'door'
  | 'monster'
  | 'curse'
  | 'trouble'
  | 'help'
  | 'flee'
  | 'loot'
  | 'rewards'
  | 'charity'
  | 'endTurn';

export interface PhaseGuide {
  title: string;
  illustration: IllustrationKey;
  reminder: string;
  details: string[];
}

export const PHASE_GUIDE: Record<Phase, PhaseGuide> = {
  setup: {
    title: 'Preparación del turno',
    illustration: 'door',
    reminder: 'Acomodá tu equipo y jugá lo que quieras antes de abrir la puerta.',
    details: [
      'Antes de patear la puerta podés cambiar de equipo, jugar razas, clases u objetos.',
      'Revisá que tu nivel, equipo y modificadores estén al día en la app.',
      'Cuando estés listo, pateá la puerta.',
    ],
  },
  kickDoor: {
    title: 'Patear la puerta',
    illustration: 'door',
    reminder: 'Robá una carta de Puerta boca arriba y contale a la app qué salió.',
    details: [
      'Monstruo: lo enfrentás ahora mismo.',
      'Maldición: te afecta de inmediato si puede, se resuelve en la mesa.',
      'Cualquier otra carta: la podés guardar en la mano o jugarla si corresponde.',
    ],
  },
  curse: {
    title: 'Resolver maldición',
    illustration: 'curse',
    reminder: 'Aplicá la maldición en la mesa. Si cambia tu nivel o equipo, actualizalo.',
    details: [
      'Una maldición robada boca arriba al patear la puerta afecta a quien la robó.',
      'La app no automatiza efectos de cartas: corregí las estadísticas a mano.',
      'Después seguís por el camino sin monstruo: buscar problemas o saquear.',
    ],
  },
  noMonster: {
    title: 'Sin monstruo',
    illustration: 'trouble',
    reminder: 'Elegí: buscar problemas con un monstruo de tu mano, o saquear la habitación.',
    details: [
      'Buscar problemas: jugás un monstruo de tu mano y peleás contra él.',
      'Saquear: robás una segunda carta de Puerta boca abajo y la guardás.',
      'No se puede hacer las dos cosas en el mismo turno.',
    ],
  },
  lootRoom: {
    title: 'Saquear la habitación',
    illustration: 'loot',
    reminder: 'Robá una carta de Puerta boca abajo y guardala en la mano.',
    details: [
      'Es de Puerta, no de Tesoro. Nadie más necesita verla.',
      'Si es un monstruo, no lo peleás ahora: queda en tu mano.',
    ],
  },
  combat: {
    title: 'Combate',
    illustration: 'monster',
    reminder: 'Cargá monstruos y modificadores. La mesa decide quién gana.',
    details: [
      'Tu fuerza es nivel + equipo + modificadores; se suman los efectos temporales del combate.',
      'Según el reglamento base, los empates los gana el monstruo (algunas cartas y clases cambian esto).',
      'Podés pedir ayuda a una sola persona; el soborno se negocia en la mesa.',
      'Si huís, cada monstruo se resuelve por separado con el dado físico (5 o más escapa, salvo modificadores).',
      'La app nunca declara la victoria sola: confirmá el resultado que pasó en la mesa.',
    ],
  },
  charity: {
    title: 'Caridad',
    illustration: 'charity',
    reminder: 'Revisá tu límite de mano y entregá o descartá el excedente.',
    details: [
      'Al terminar el turno, el límite habitual es de 5 cartas en la mano (algunas cartas lo cambian).',
      'El excedente va al jugador de menor nivel; si ese sos vos, se descarta.',
      'La app no ve tu mano: solo confirmá cuando esté resuelto.',
    ],
  },
  endTurn: {
    title: 'Fin del turno',
    illustration: 'endTurn',
    reminder: 'Todo listo. Pasá el turno al siguiente jugador.',
    details: ['El siguiente en el orden empieza su preparación.', 'Si algo quedó mal, el DM puede corregir turno y fase.'],
  },
};

export const ILLUSTRATION_FOR_ACTION = {
  help: 'help',
  flee: 'flee',
  rewards: 'rewards',
} as const satisfies Record<string, IllustrationKey>;
