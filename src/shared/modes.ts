// Modos de juego que se eligen al crear la sala. Los textos son paráfrasis breves:
// la app no impone reglas nuevas, solo ajusta la guía de cada fase y lo que se muestra.

import type { GameMode, Phase, RoomConfig } from './types.js';
import { PHASE_GUIDE, type PhaseGuide } from './phases.js';

export const GAME_MODES = ['normal', 'fast', 'duel'] as const satisfies readonly GameMode[];

export interface ModeInfo {
  label: string;
  short: string;
  rules: string[];
}

export const MODE_INFO: Record<GameMode, ModeInfo> = {
  normal: {
    label: 'Normal',
    short: 'Las reglas de siempre, de 3 a 6 jugadores.',
    rules: ['Se juega con las reglas del reglamento base.', 'Gana quien llega a nivel 10 matando un monstruo.'],
  },
  fast: {
    label: 'Modo rápido',
    short: 'Reglas opcionales oficiales para partidas más cortas.',
    rules: [
      'Escuchar en la puerta: al empezar tu turno robás una carta de Puerta boca abajo; la podés jugar o guardar.',
      'Saquear la habitación: robás un Tesoro boca abajo en vez de una Puerta.',
      'Victoria compartida: si alguien llega a nivel 10 en un combate con ayuda, quien ayudó también gana.',
    ],
  },
  duel: {
    label: '2 jugadores',
    short: 'Variante casera de r/Munchkin para jugar mano a mano.',
    rules: [
      'Exactamente 2 jugadores. Usa las reglas del modo rápido (escuchar en la puerta y saquear un Tesoro).',
      'Codicia: en la caridad lo que sobra se descarta, no se regala.',
      'Tratado: no le podés jugar maldiciones ni monstruos al rival hasta que tenga nivel 4.',
      'Suma el Mercader (5 tesoros en el medio para intercambiar) y el Puño (cartas para sabotear al rival).',
    ],
  },
};

/** Nivel desde el que el Tratado deja de proteger al rival. */
export const TREATY_LEVEL = 4;

export interface GuideSection {
  title: string;
  icon: 'fast' | 'greed' | 'treaty' | 'deal' | 'merchant' | 'fist';
  items: string[];
}

/**
 * Guía completa del modo 2 jugadores. Paráfrasis de las reglas que un jugador
 * publicó en r/Munchkin (base + Hacha Antinatural). La mesa manda.
 */
export const DUEL_GUIDE: { intro: string; setup: string[]; sections: GuideSection[] } = {
  intro: 'Reglas caseras pensadas para que Munchkin funcione mano a mano. La app las recuerda en cada fase; las cartas siguen en la mesa.',
  setup: [
    'Pongan 5 cartas de Tesoro boca arriba en el medio: es el Mercader.',
    'Cada jugador recibe 3 cartas de Puerta boca abajo aparte de su mano: es su Puño.',
    'Después se reparte como siempre y arranca la partida.',
  ],
  sections: [
    {
      title: 'Juego rápido',
      icon: 'fast',
      items: [
        'Escuchar en la puerta: antes de patear, robás una Puerta boca abajo y la sumás a tu mano.',
        'Saquear la habitación: robás un Tesoro en vez de una Puerta.',
      ],
    },
    {
      title: 'Codicia',
      icon: 'greed',
      items: ['En la caridad, las cartas que te sobran se descartan: no se le dan al rival.'],
    },
    {
      title: 'Tratado',
      icon: 'treaty',
      items: [
        'No podés jugarle una maldición ni un monstruo al rival mientras tenga menos de nivel 4.',
        'Los tesoros de un solo uso (como las pociones) sí se pueden usar.',
      ],
    },
    {
      title: 'An-Cap (negociar niveles)',
      icon: 'deal',
      items: [
        'Si uno ayuda al otro en combate, también se pueden negociar los niveles, igual que los tesoros.',
        'Ejemplo: ayudo contra un monstruo que da 2 niveles a cambio de uno de esos niveles y los tesoros que quiera.',
      ],
    },
    {
      title: 'El Mercader',
      icon: 'merchant',
      items: [
        'En tu turno (fuera del combate) podés llevarte cartas del Mercader dando objetos tuyos que valgan igual o más oro.',
        'Podés sumar varias cartas tuyas para llegar al valor. Ejemplo: das dos objetos de 300 y 400 (700) por uno de 600. También vale al revés: un objeto tuyo caro por varias cartas baratas.',
        'El Mercader puede juntar todos los objetos que quiera.',
        'Si le quedan menos de 5 cartas, quien hizo el cambio roba Tesoros hasta reponerlas.',
        'Si el Mercader tiene una carta sin valor en oro, el rival corta el mazo de Tesoros donde quiera y la carta vuelve ahí.',
        '¡Trampa! es la carta de Tesoro que normalmente te deja equiparte algo que no podrías (en inglés, "Cheat!"). En este modo, en vez de eso, la podés jugar para usar el Mercader en cualquier momento, incluso en combate o en el turno del rival. El post no dice si se descarta: lo lógico es gastarla, pero decide la mesa.',
      ],
    },
    {
      title: 'El Puño',
      icon: 'fist',
      items: [
        'Tus 3 Puertas boca abajo. Solo sirven para sabotear al rival durante su turno.',
        'Para jugar una carta del Puño descartás una carta de tu mano, la que quieras. Se puede repetir, pero de a una acción por vez.',
        'Al final de tu turno sumás una Puerta a tu Puño.',
        'Si sale una Raza o Clase (incluidas Súper Munchkin y Mestizo), el rival corta el mazo y la carta vuelve ahí.',
        'Jugando una carta de ¡Trampa! podés usar el Puño en cualquier momento, incluso en tu propio turno.',
      ],
    },
  ],
};

export function modeOf(config: Pick<RoomConfig, 'mode'>): GameMode {
  return config.mode ?? 'normal';
}

const FAST_OVERRIDES: Partial<Record<Phase, Partial<PhaseGuide>>> = {
  setup: {
    title: 'Escuchar en la puerta',
    reminder: 'Robá una Puerta boca abajo (jugala o guardala), acomodá tu equipo y pateá la puerta.',
    details: [
      'Modo rápido: al empezar el turno robás una carta de Puerta boca abajo. La podés jugar ahora o guardarla.',
      'Antes de patear la puerta podés cambiar de equipo, jugar razas, clases u objetos.',
      'Cuando estés listo, pateá la puerta.',
    ],
  },
  noMonster: {
    details: [
      'Buscar problemas: jugás un monstruo de tu mano y peleás contra él.',
      'Saquear (modo rápido): robás un Tesoro boca abajo y lo guardás.',
      'No se puede hacer las dos cosas en el mismo turno.',
    ],
  },
  lootRoom: {
    reminder: 'Modo rápido: robá un Tesoro boca abajo y guardalo en la mano.',
    details: ['En modo rápido se saquea un Tesoro, no una Puerta.', 'Nadie más necesita verlo.'],
  },
  combat: {
    details: [
      ...PHASE_GUIDE.combat.details,
      'Modo rápido: si quien pelea llega a nivel 10 con ayuda, quien ayudó también gana.',
    ],
  },
};

const DUEL_OVERRIDES: Partial<Record<Phase, Partial<PhaseGuide>>> = {
  setup: {
    ...FAST_OVERRIDES.setup,
    details: [
      ...FAST_OVERRIDES.setup!.details!,
      'Fuera del combate podés cambiar objetos con el Mercader.',
    ],
  },
  kickDoor: {
    details: [
      ...PHASE_GUIDE.kickDoor.details,
      'Tu rival puede sabotearte con su Puño (descartando una carta de su mano por cada una).',
    ],
  },
  combat: {
    details: [
      ...PHASE_GUIDE.combat.details,
      'An-Cap: si tu rival te ayuda, pueden negociar niveles además de tesoros.',
      'Tratado: nadie juega monstruos ni maldiciones al rival hasta que tenga nivel 4.',
    ],
  },
  charity: {
    reminder: 'Codicia: si te pasás del límite de mano, el excedente se descarta.',
    details: ['Modo 2 jugadores: lo que sobra va al descarte, no al rival.', 'La app no ve tu mano: solo confirmá cuando esté resuelto.'],
  },
  endTurn: {
    reminder: 'Sumá una Puerta a tu Puño y pasale el turno a tu rival.',
    details: ['Al final del turno cada jugador agrega una carta de Puerta a su Puño.', ...PHASE_GUIDE.endTurn.details],
  },
};

/** Guía de la fase según el modo de la sala. */
export function phaseGuide(phase: Phase, config: Pick<RoomConfig, 'mode'>): PhaseGuide {
  const base = PHASE_GUIDE[phase];
  const mode = modeOf(config);
  if (mode === 'fast') return { ...base, ...FAST_OVERRIDES[phase] };
  if (mode === 'duel') return { ...base, ...FAST_OVERRIDES[phase], ...DUEL_OVERRIDES[phase] };
  return base;
}

/** Jugadores que el Tratado todavía protege (modo 2 jugadores). */
export function treatyProtected(state: { config: Pick<RoomConfig, 'mode'>; turn: { order: string[] }; characters: Record<string, { level: number }> }): string[] {
  if (modeOf(state.config) !== 'duel') return [];
  return state.turn.order.filter((id) => (state.characters[id]?.level ?? 0) < TREATY_LEVEL);
}
