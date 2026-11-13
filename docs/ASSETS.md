# Ilustraciones: procedencia y estado

La app elige imágenes desde `src/client/assets/manifest.ts`. Las cartas se usan como referencia visual: sus efectos no se aplican automáticamente. Si falta una imagen local o no carga, se usa el SVG de `public/illustrations/`.

## Estado

- Las seis descargas de las referencias indicadas en el prompt se comprobaron visualmente el 2026-11-13 y se guardan en `public/cards/` para evitar hotlinks.
- `available.json` lista solo las copias disponibles. Las hojas con varias cartas se recortan desde el manifiesto; los recortes no modifican el original.
- `npm run build` ejecuta `scripts/fetch-assets.mjs` antes de Vite, así el despliegue en Render incluye las imágenes. Si una descarga falla, se usa la copia de `public/cards/` si está versionada o, si no, el SVG de respaldo.
- Para no depender de los sitios de origen, se pueden versionar las copias locales (`git add public/cards/*.jpg`); `.gitignore` ya no las excluye.
- Decisión del usuario (2026-11-13): se usan en el despliegue porque es un uso privado entre amigos y sin fines comerciales. El permiso de redistribución de SJ Games no está confirmado.
- Los reversos de carta no identifican artista en las copias consultadas. La página oficial de Munchkin identifica a John Kovalic como ilustrador del juego base y las páginas de las expansiones muestran el crédito en sus productos.

## Créditos y permisos

Munchkin, sus cartas y arte © Steve Jackson Games. El arte de las cartas fotografiadas está acreditado a John Kovalic cuando corresponde; la foto de eBay conserva visible la marca de agua de Western Ohio Gaming. Una publicación en internet no otorga automáticamente permiso de redistribución. La política online de SJ Games no es una licencia y no confirma permiso específico para esta aplicación. Uso en el despliegue: privado entre amigos, sin fines comerciales, por decisión del usuario; permiso formal no confirmado.

## Manifiesto

| Clave | Uso | Archivo local | Referencia | Crédito | Permiso |
|---|---|---|---|---|---|
| door | Patear la puerta | `door-back.jpg` | [Dorso de Puerta](https://net-clan.com/PDFS/Munchkin/door-back.jpg) | Steve Jackson Games; artista no identificado | No confirmado |
| loot | Saquear (siempre Puerta, nunca Tesoro) | `door-back.jpg` | Igual que arriba | Steve Jackson Games; artista no identificado | No confirmado |
| rewards | Recompensas | `loot-back.jpg` | [Dorso de Tesoro](https://net-clan.com/PDFS/Munchkin/loot-back.jpg) | Steve Jackson Games; artista no identificado | No confirmado |
| curse | Maldición | `duckofdoom.jpg` | [Duck of Doom](https://www.sjgames.com/img/newsq/illq/2016/duckofdoom.jpg) | Steve Jackson Games; John Kovalic | No confirmado |
| monster | Monstruo / combate | `selection-amazon.jpg` | [Selección de cartas](https://m.media-amazon.com/images/I/81kd4nstzlL._AC_SL1500_.jpg), Dragón de Plutonio (fila inferior, centro) | Steve Jackson Games; John Kovalic | No confirmado |
| trouble | Buscar problemas | `door5.jpg` | [Hoja de cartas](https://net-clan.com/PDFS/Munchkin/door5.jpg), Wandering Monster (fila inferior, derecha) | Steve Jackson Games; John Kovalic | No confirmado |
| help | Pedir ayuda | `door5.jpg` | Igual que arriba, Help Me Out Here! (arriba a la izquierda) | Steve Jackson Games; John Kovalic | No confirmado |
| flee | Huida | `boots-ebay.jpg` | [Aviso y foto](https://www.ebay.com/itm/295563935976) de Boots of Running Really Fast | Arte: Steve Jackson Games / John Kovalic; fotografía con marca de agua Western Ohio Gaming | No confirmado; foto de vendedor |
| charity | Caridad | SVG local compuesto con dorsos y flecha | Composición de la app | Patea la Puerta | — |
| endTurn | Fin de turno | SVG local con dorso y flecha | Composición de la app | Patea la Puerta | — |

## Mantener o sustituir

Para cambiar una asignación, editar `manifest.ts`. Para volver a intentar una descarga simple, ejecutar `npm run assets:fetch`; el script no sortea bloqueos. Las referencias de comercio como Amazon/eBay son fotografías de terceros, por lo que se reemplazan por una fuente autorizada si se consigue permiso. Los datos de cartas se documentan aparte: esta lista es solo de las ilustraciones usadas por fase, no un catálogo completo de cartas.
