// Modos de juego que se eligen al crear la sala. Los textos son paráfrasis breves:
// la app no impone reglas nuevas, solo ajusta la guía de cada fase y lo que se muestra.

import type { GameMode, Phase, RoomConfig } from './types.js';
import { PHASE_GUIDE, type PhaseGuide } from './phases.js';

export const GAME_MODES = ['normal', 'fast'] as const satisfies readonly GameMode[];

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

/** Guía de la fase según el modo de la sala. */
export function phaseGuide(phase: Phase, config: Pick<RoomConfig, 'mode'>): PhaseGuide {
  const base = PHASE_GUIDE[phase];
  if (modeOf(config) === 'fast') return { ...base, ...FAST_OVERRIDES[phase] };
  return base;
}
