// Genera las ilustraciones provisorias (originales, sin arte oficial) en public/illustrations.
// Uso: node scripts/gen-illustrations.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const out = new URL('../public/illustrations/', import.meta.url);
mkdirSync(out, { recursive: true });

const INK = '#2b1d12';
const frame = (bg, inner, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" role="img" aria-label="${label} (ilustración provisoria)">
  <rect x="4" y="4" width="192" height="272" rx="14" fill="${bg}" stroke="${INK}" stroke-width="6"/>
  <rect x="16" y="16" width="168" height="248" rx="8" fill="#fdf9ef" stroke="${INK}" stroke-width="2"/>
  ${inner}
  <text x="100" y="258" text-anchor="middle" font-family="Georgia, serif" font-size="11" fill="${INK}" opacity="0.7">provisoria</text>
</svg>
`;

const door = (x = 0, y = 0, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  <path d="M60 220 V90 a40 40 0 0 1 80 0 V220 Z" fill="#7a4a24" stroke="${INK}" stroke-width="5"/>
  <path d="M100 52 V220 M70 120 H130 M70 170 H130" stroke="${INK}" stroke-width="3" opacity="0.5"/>
  <circle cx="122" cy="150" r="6" fill="#b7791f" stroke="${INK}" stroke-width="2"/></g>`;

const arrow = (x, y, rot = 0, color = '#2f6b3a') => `<g transform="translate(${x} ${y}) rotate(${rot})">
  <path d="M-30 -8 H10 V-22 L36 0 L10 22 V8 H-30 Z" fill="${color}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></g>`;

const card = (x, y, rot, fill) => `<g transform="translate(${x} ${y}) rotate(${rot})">
  <rect x="-26" y="-38" width="52" height="76" rx="6" fill="${fill}" stroke="${INK}" stroke-width="3"/>
  <rect x="-18" y="-30" width="36" height="60" rx="3" fill="none" stroke="${INK}" stroke-width="1.5" opacity="0.5"/></g>`;

const items = {
  door: frame('#b7791f', door(), 'Puerta'),
  loot: frame('#b7791f', `${card(100, 120, -8, '#b7791f')}${card(110, 130, 6, '#7a4a24')}
    <text x="100" y="225" text-anchor="middle" font-family="Georgia, serif" font-size="18" font-weight="bold" fill="${INK}">boca abajo</text>`, 'Saquear'),
  endTurn: frame('#b7791f', `${door(-25, 10, 0.85)}${arrow(150, 150)}`, 'Fin de turno'),
  monster: frame('#9b1c1c', `<path d="M40 200 C40 120 70 80 100 80 C130 80 160 120 160 200 Z" fill="#2f6b3a" stroke="${INK}" stroke-width="5"/>
    <path d="M70 84 L60 50 L82 76 M130 84 L140 50 L118 76" fill="#2f6b3a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="82" cy="125" r="10" fill="#fdf9ef" stroke="${INK}" stroke-width="3"/><circle cx="118" cy="125" r="10" fill="#fdf9ef" stroke="${INK}" stroke-width="3"/>
    <circle cx="84" cy="127" r="4" fill="${INK}"/><circle cx="116" cy="127" r="4" fill="${INK}"/>
    <path d="M72 165 Q100 185 128 165" fill="none" stroke="${INK}" stroke-width="4"/><path d="M82 170 L86 180 L90 172 M110 172 L114 180 L118 170" fill="#fdf9ef" stroke="${INK}" stroke-width="2"/>`, 'Monstruo'),
  curse: frame('#7c3aed', `<ellipse cx="100" cy="160" rx="55" ry="38" fill="#fde047" stroke="${INK}" stroke-width="5"/>
    <circle cx="125" cy="110" r="28" fill="#fde047" stroke="${INK}" stroke-width="5"/><path d="M150 108 L178 116 L150 124 Z" fill="#f97316" stroke="${INK}" stroke-width="3"/>
    <circle cx="132" cy="102" r="4" fill="${INK}"/><path d="M60 70 l10 -14 l6 12 l10 -16" fill="none" stroke="#7c3aed" stroke-width="4"/>`, 'Maldición'),
  trouble: frame('#9b1c1c', `${card(80, 130, -10, '#2f6b3a')}<text x="135" y="160" text-anchor="middle" font-family="Georgia, serif" font-size="96" font-weight="bold" fill="#9b1c1c" stroke="${INK}" stroke-width="3">!</text>`, 'Buscar problemas'),
  help: frame('#1f4f8f', `<circle cx="70" cy="110" r="22" fill="#fdba74" stroke="${INK}" stroke-width="4"/><circle cx="130" cy="110" r="22" fill="#93c5fd" stroke="${INK}" stroke-width="4"/>
    <path d="M40 200 Q70 140 100 165 Q130 140 160 200 Z" fill="#e2c98c" stroke="${INK}" stroke-width="4"/><path d="M85 160 L115 160" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`, 'Pedir ayuda'),
  flee: frame('#2f6b3a', `<path d="M60 90 H95 V170 H130 Q150 170 150 195 H60 Z" fill="#9b1c1c" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M30 120 H50 M24 145 H50 M34 170 H54" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`, 'Huida'),
  rewards: frame('#b7791f', `<rect x="45" y="120" width="110" height="80" rx="6" fill="#7a4a24" stroke="${INK}" stroke-width="5"/>
    <path d="M45 120 Q100 70 155 120 Z" fill="#9a5b2c" stroke="${INK}" stroke-width="5"/><rect x="92" y="125" width="16" height="22" fill="#b7791f" stroke="${INK}" stroke-width="3"/>
    <circle cx="70" cy="100" r="8" fill="#fde047" stroke="${INK}" stroke-width="2"/><circle cx="130" cy="95" r="8" fill="#fde047" stroke="${INK}" stroke-width="2"/>`, 'Recompensas'),
  charity: frame('#2f6b3a', `${card(65, 135, -12, '#b7791f')}${card(80, 140, 4, '#7a4a24')}${arrow(140, 140)}`, 'Caridad'),
};

for (const [key, svg] of Object.entries(items)) writeFileSync(new URL(`${key}.svg`, out), svg);
console.log(`Generadas ${Object.keys(items).length} ilustraciones en public/illustrations/`);
