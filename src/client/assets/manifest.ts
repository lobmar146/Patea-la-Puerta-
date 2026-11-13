// Manifiesto central de ilustraciones. Reemplazable: cambiá acá qué imagen usa cada momento.
// La imagen es solo temática: usarla NO aplica los efectos de la carta original.
// Procedencia y permisos: docs/ASSETS.md.

import type { IllustrationKey } from '../../shared/phases';

export interface Crop {
  /** Porcentajes sobre la imagen original. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SourceRef {
  /** Archivo local en public/cards/ que genera `npm run assets:fetch`. */
  file: string;
  url: string;
  /** Hoja con varias cartas: solo se usa si hay recorte definido. */
  sheet?: boolean;
  crop?: Crop;
}

export interface AssetEntry {
  label: string;
  /** Ilustración original provisoria, siempre disponible. */
  fallback: string;
  source?: SourceRef;
  /** Composiciones: se dibujan varias fuentes y una flecha. */
  compose?: { keys: IllustrationKey[]; arrow: boolean };
}

const DOOR_BACK: SourceRef = { file: 'door-back.jpg', url: 'https://net-clan.com/PDFS/Munchkin/door-back.jpg' };
const LOOT_BACK: SourceRef = { file: 'loot-back.jpg', url: 'https://net-clan.com/PDFS/Munchkin/loot-back.jpg' };

export const ASSETS: Record<IllustrationKey, AssetEntry> = {
  door: { label: 'Dorso de carta de Puerta', fallback: '/illustrations/door.svg', source: DOOR_BACK },
  loot: { label: 'Dorso de carta de Puerta (saqueo boca abajo)', fallback: '/illustrations/loot.svg', source: DOOR_BACK },
  rewards: { label: 'Dorso de carta de Tesoro', fallback: '/illustrations/rewards.svg', source: LOOT_BACK },
  endTurn: {
    label: 'Puerta con flecha de siguiente',
    fallback: '/illustrations/endTurn.svg',
    compose: { keys: ['door'], arrow: true },
  },
  charity: {
    label: 'Cartas con flecha de entrega',
    fallback: '/illustrations/charity.svg',
    compose: { keys: ['door', 'rewards'], arrow: true },
  },
  curse: {
    label: 'Maldición: Duck of Doom',
    fallback: '/illustrations/curse.svg',
    source: { file: 'duckofdoom.jpg', url: 'https://www.sjgames.com/img/newsq/illq/2016/duckofdoom.jpg' },
  },
  monster: {
    label: 'Monstruo: Plutonium Dragon',
    fallback: '/illustrations/monster.svg',
    // Recorte: Dragón de Plutonio en la fila inferior, al centro.
    source: { file: 'selection-amazon.jpg', url: 'https://m.media-amazon.com/images/I/81kd4nstzlL._AC_SL1500_.jpg', sheet: true, crop: { x: 31, y: 50, w: 38, h: 47 } },
  },
  trouble: {
    label: 'Buscar problemas: Wandering Monster (ilustración temática)',
    fallback: '/illustrations/trouble.svg',
    // Segunda fila, derecha.
    source: { file: 'door5.jpg', url: 'https://net-clan.com/PDFS/Munchkin/door5.jpg', sheet: true, crop: { x: 68, y: 58, w: 31, h: 41 } },
  },
  help: {
    label: 'Pedir ayuda: Help Me Out Here! (ilustración temática)',
    fallback: '/illustrations/help.svg',
    // Arriba a la izquierda.
    source: { file: 'door5.jpg', url: 'https://net-clan.com/PDFS/Munchkin/door5.jpg', sheet: true, crop: { x: 0, y: 0, w: 28, h: 32 } },
  },
  flee: {
    label: 'Huida: Boots of Running Really Fast',
    fallback: '/illustrations/flee.svg',
    // Foto de la carta del aviso; se muestra completa para conservar la marca de agua del vendedor.
    source: { file: 'boots-ebay.jpg', url: 'https://i.ebayimg.com/images/g/6GoAAOSwlkNkDj7~/s-l1600.jpg' },
  },
};
