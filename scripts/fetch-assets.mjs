// Descarga las referencias del manifiesto a public/cards/ para usarlas sin hotlinks.
// Uso: npm run assets:fetch   (ejecutalo en una máquina con acceso a esos sitios)
//
// - Hace un GET simple. Si un sitio bloquea la descarga, NO se intenta eludir: queda el fallback.
// - Escribe public/cards/available.json con los archivos realmente descargados y válidos.
// - La licencia de reutilización no está confirmada (ver docs/ASSETS.md); no publiques estos
//   archivos en un despliegue compartido sin revisar antes ese estado.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const dir = new URL('../public/cards/', import.meta.url);
mkdirSync(dir, { recursive: true });

const manifest = readFileSync(new URL('../src/client/assets/manifest.ts', import.meta.url), 'utf8');
const pairs = new Map();
for (const m of manifest.matchAll(/file: '([^']+)', url: '([^']+)'/g)) pairs.set(m[1], m[2]);

const available = [];
for (const [file, url] of pairs) {
  const target = new URL(file, dir);
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'patea-la-puerta-asset-fetch/1.0' }, redirect: 'follow' });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.startsWith('image/')) throw new Error(`HTTP ${res.status} ${type}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2000) throw new Error(`archivo demasiado chico (${buf.length} bytes)`);
    writeFileSync(target, buf);
    available.push(file);
    console.log(`OK   ${file}  ${buf.length} bytes  ${type}`);
  } catch (e) {
    if (existsSync(target)) {
      available.push(file);
      console.log(`USO  ${file}  (falló la descarga, se conserva la copia local: ${e.message})`);
    } else {
      console.log(`FALTA ${file}  ${url}  -> ${e.message}. Se usará la ilustración provisoria.`);
    }
  }
}
writeFileSync(new URL('available.json', dir), JSON.stringify({ files: available, fetchedAt: new Date().toISOString() }, null, 2));
console.log(`\n${available.length}/${pairs.size} archivos disponibles. Revisá docs/ASSETS.md y actualizá su estado.`);
