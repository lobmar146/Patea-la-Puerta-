# Ilustraciones: procedencia y estado

Todo pasa por `src/client/assets/manifest.ts`. Las imágenes son **temáticas**: usar una carta como ilustración no aplica sus efectos.

## Estado actual
- **En uso:** ilustraciones provisorias originales (SVG) en `public/illustrations/`, generadas con `node scripts/gen-illustrations.mjs`. Dicen "provisoria". No imitan cartas oficiales.
- **Referencias reales:** NO verificadas todavía. Desde el entorno donde se desarrolló la app, la red bloqueó `net-clan.com`, `www.sjgames.com` y `m.media-amazon.com` (política del entorno). Un lector web externo tampoco pudo abrir esas imágenes. No se intentó eludir ningún bloqueo.
- **Cómo incorporarlas:** en una máquina con acceso, `npm run assets:fetch` descarga a `public/cards/` y escribe `available.json`. La app usa una imagen solo si está en esa lista; si falta o falla, muestra la provisoria (nunca una imagen rota). Las descargadas están en `.gitignore`.
- **Hojas con varias cartas** (Amazon y `door5.jpg`) requieren definir `crop` (porcentajes) en el manifiesto después de ver la imagen; sin recorte no se usan.

## Permisos
Que una imagen esté publicada no implica licencia de reutilización. El arte de Munchkin es © Steve Jackson Games.
La [política online de SJ Games](https://www.sjgames.com/general/online_policy.html) (consultada el 2026-11-13, "actualizada el 12 de agosto de 2026") permite a fans usar una cantidad razonable de arte (no más de 10 piezas) en usos no comerciales, con crédito al artista, aviso de copyright y copia en servidor propio. **Pero también indica que no se deben publicar generadores de personajes ni ayudas de juego**, y aclara que es una política y no una licencia. Esta app podría considerarse una ayuda de juego: **permiso no confirmado**. Recomendación: usarla en privado o pedir permiso a SJ Games antes de publicarla con arte oficial.

## Tabla
| Clave | Uso | Fuente de referencia | Crédito conocido | Verificación | Permiso |
|---|---|---|---|---|---|
| door | Patear la puerta | https://net-clan.com/PDFS/Munchkin/door-back.jpg (dorso de Puerta) | Steve Jackson Games; artista no confirmado | Pendiente (bloqueado) | No confirmado |
| loot | Saquear (Puerta, nunca Tesoro) | misma que door | idem | Pendiente | No confirmado |
| rewards | Recompensas | https://net-clan.com/PDFS/Munchkin/loot-back.jpg (dorso de Tesoro) | Steve Jackson Games | Pendiente | No confirmado |
| curse | Maldición | https://www.sjgames.com/img/newsq/illq/2016/duckofdoom.jpg (Duck of Doom) | Steve Jackson Games; artista no confirmado | Pendiente | No confirmado |
| monster | Monstruo / combate | https://m.media-amazon.com/images/I/81kd4nstzlL._AC_SL1500_.jpg (Plutonium Dragon) | Steve Jackson Games | Pendiente; falta recorte | No confirmado |
| trouble | Buscar problemas | https://net-clan.com/PDFS/Munchkin/door5.jpg (Wandering Monster, 2.ª fila derecha) | Steve Jackson Games | Pendiente; falta recorte | No confirmado |
| help | Pedir ayuda | https://net-clan.com/PDFS/Munchkin/door5.jpg (Help Me Out Here!, arriba izquierda) | Steve Jackson Games | Pendiente; falta recorte | No confirmado |
| flee | Huida | Aviso https://www.ebay.com/itm/295563935976 ("Munchkin Boots Of Running Really Fast Card USED…"); foto principal https://i.ebayimg.com/images/g/6GoAAOSwlkNkDj7~/s-l1600.jpg | Steve Jackson Games; foto del vendedor de eBay | Aviso leído; foto no verificada | No confirmado (además la foto es del vendedor) |
| charity | Caridad | Composición de door + rewards con flecha (generada por la app) | — | Depende de door/rewards | — |
| endTurn | Fin de turno | Composición de door con flecha | — | Depende de door | — |

## Pendientes
1. Ejecutar `npm run assets:fetch` en una máquina con acceso y revisar cada imagen.
2. Definir `crop` para monster, trouble y help.
3. Decidir si se piden permisos o se mantienen las provisorias para una versión pública.
