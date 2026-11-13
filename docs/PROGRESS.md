# Progreso

Última actualización: 2026-11-13.

## Estado por etapa
| Etapa | Estado | Verificación |
|---|---|---|
| a. Sala, ingreso, sesión | Hecha | Integración (`commands.test.ts`: reuso de sesión, tokens hasheados) + e2e |
| b. Personajes y sincronización | Hecha | Unitarias + integración (idempotencia, concurrencia) + e2e multicliente |
| c. Turnos y combate | Hecha | Unitarias (máquina de estados, ayuda, resoluciones) + e2e (3 caminos) |
| d. Vista TV e ilustraciones | Hecha con ilustraciones **provisorias** | e2e 1920×1080 y 390×844 sin scroll horizontal; ver `docs/ASSETS.md` |
| e. Reinicio y Render | Hecha (despliegue **no ejecutado**) | Vitest y Playwright matan el proceso (SIGKILL) y lo reinician contra la misma base |

## Verificaciones ejecutadas (2026-11-13, PostgreSQL 16 local)
- `npm run typecheck`: OK.
- `npm run lint`: OK, sin advertencias.
- `npm test`: 32 pruebas OK (19 unitarias, 11 de integración de comandos, 2 de reinicio real).
- `npm run build`: OK.
- `npm run test:e2e`: 1 recorrido completo OK (repetido 3 veces seguidas sin fallas).
- Manual con curl: `/api/health`, fallback SPA en `/s/CODIGO/tv`, `/api/*` inexistente devuelve 404 JSON, `/socket.io` responde, cookie `HttpOnly; Secure; SameSite=Lax` en producción. `npm run dev` con proxy de Vite probado.

## Criterios de aceptación
| # | Criterio | Cómo se verificó |
|---|---|---|
| 1 | DM crea sala y personaje | e2e |
| 2 | Dos jugadores y espectador TV | e2e |
| 3 | Edición visible en todos | e2e (nivel de Pablo en DM y Lu) |
| 4 | Jugador no edita a otro | integración + e2e con comando manual |
| 5 | Espectador sin mutaciones | unitaria + integración + e2e con comando manual |
| 6 | Fuera de turno no avanza | unitaria + integración + e2e (UI y comando manual) |
| 7 | DM ordena e inicia | e2e |
| 8 | Monstruo, maldición, otra carta | unitarias + e2e (los tres caminos) |
| 9 | Pedir, aceptar, rechazar ayuda | unitaria + e2e en dispositivos distintos |
| 10 | Combate sin duplicar recompensas | integración (reintento + comando nuevo) + e2e (doble clic) |
| 11 | Caridad → siguiente turno | e2e |
| 12 | Recargar sin duplicados | integración + e2e |
| 13 | Desconectar y volver | e2e (salir de la página, cambios del DM, volver) + reconexión tras reinicio |
| 14 | Reinicio real del backend | `restart.test.ts` + e2e (estado de conexión "reconectando" → "conectado") |
| 15 | commandId repetido sin efectos | integración (secuencial y en paralelo) + reinicio |
| 16 | Concurrencia sin pisar cambios | integración (dos comandos con la misma versión) |
| 17 | DM corrige fase y estadísticas | unitarias + e2e |
| 18 | Móvil y TV | e2e (sin scroll horizontal) + capturas revisadas a ojo |

## Pendientes
- **Ilustraciones reales**: no se pudieron descargar ni verificar desde el entorno de desarrollo. Siguiente paso: `npm run assets:fetch` en una máquina con acceso, revisar cada imagen y definir recortes (`docs/ASSETS.md`). Permiso de uso no confirmado.
- **Despliegue en Render**: preparado (`render.yaml`), no ejecutado por instrucción.
- Recordatorios específicos de Munchkin 2 y 3: no se obtuvo el texto completo de sus reglas; el flujo es el del juego base y el DM resuelve excepciones.
- No probado en dispositivos físicos ni en Safari/Firefox (solo Chromium de Playwright).
- Accesibilidad: foco visible, contraste y estados con texto/ícono además de color; no se corrió una auditoría automática (axe/Lighthouse).

## Cómo retomar
```bash
docker compose up -d && npm install && npx prisma migrate dev
npm run check && npm run test:e2e
```

## Actualización UX/UI (2026-11-13)
- Decisiones de fase, formularios de monstruos/modificadores y resoluciones de combate ahora se muestran en modales: panel inferior en móvil y centrado en escritorio.
- Se añadieron acciones táctiles grandes, scroll interno, área segura inferior, cierre con Escape/fondo y transiciones breves para modales y cambios de fase. La preferencia de movimiento reducido sigue respetada.
- En el formulario/lista de monstruos se distingue “nivel de combate” (valor para comparar) de “niveles al vencer” (recompensa), sin cambiar el modelo ni las reglas.
- Se añadió un cronómetro sincronizado: mide el turno actual, muestra el total acumulado por jugador, se congela en pausa y persiste en PostgreSQL. Nueva migración prepara las salas existentes.
- Se descargaron y revisaron las seis referencias de imagen disponibles. Los recortes del manifiesto apuntan al Dragón de Plutonio, Wandering Monster, Help Me Out Here! y Boots of Running Really Fast; las composiciones de caridad/fin usan los dorsos locales. Los créditos/permiso siguen detallados en `docs/ASSETS.md`.
- **Verificado en esta continuación:** `npm run typecheck`, `npm run lint`, `npm test` (32/32), `npx vite build` y `npx tsc -p tsconfig.server.json` pasan.
- **No verificado en esta continuación:** `npm run build` no pudo regenerar Prisma en Windows (`EPERM` al reemplazar `query_engine-windows.dll.node`; probablemente está abierto en la app local). `npm run test:e2e` no arrancó porque falta el Chromium que Playwright espera. No se cerró ningún proceso ni se instaló un navegador.
- Recorrido concreto para Claude: revisar en móvil que las decisiones aparezcan como panel inferior sin desplazar la página, que el cierre no ejecute acciones, y que las transiciones no distraigan; luego ejecutar `npx playwright install chromium`, `npm run build` y `npm run test:e2e` cuando no esté bloqueado el motor Prisma.

## Actualización de presentación (2026-11-13)
- La vista TV ahora organiza turno, combate, jugadores y QR en una sola pantalla en resoluciones de escritorio/TV; en móvil conserva desplazamiento vertical normal.
- La vista TV tiene un botón permanente para volver a la partida y control de pantalla completa.
- Se unificaron las cabeceras y tarjetas de Mi personaje, Mesa y DM con la paleta de Munchkin y controles de mayor jerarquía visual.
- Se reforzaron combinaciones de contraste de la interfaz para apuntar a WCAG AA (4,5:1 en texto normal); no se ejecutó una auditoría completa automatizada de accesibilidad.
- Verificado en esta actualización: `npm run typecheck`, `npm run lint`, `npx vite build` y `git diff --check` pasan. No se ejecutaron pruebas funcionales/e2e.

## Render Free, imágenes y combate guiado (2026-11-13)
- **Keep-alive:** en producción el servidor llama a `/api/ping` (sin base de datos) por su URL pública cada 10 min, siempre (o hasta `KEEPALIVE_IDLE_HOURS` sin actividad si se define). Render Free no lo duerme y el primer ingreso es instantáneo; un servicio 24/7 usa ~744 de las 750 h gratis del mes. La limpieza de salas vencidas corre cada 6 h para que Neon pueda suspenderse entre partidas.
- **Límite de pedidos:** `POST /api/rooms` (10 cada 10 min por IP) y `POST /api/rooms/:code/join` (60 cada 10 min), en memoria.
- **Cronómetro:** el snapshot trae `serverTime` y el cliente corrige el desfase de su reloj.
- **Imágenes:** `npm run build` descarga las ilustraciones (`scripts/fetch-assets.mjs`, tolera fallas). Uso privado entre amigos por decisión del usuario.
- **UI:** el buscador de monstruos muestra los resultados justo debajo del campo; “Sin monstruo” ofrece dos tarjetas grandes (Buscar problemas / Saquear la sala) y el formulario aparece recién al elegir Buscar problemas; el combate muestra un “próximo paso” según el marcador y un aviso “¡Estás perdiendo!” con botones para pedir ayuda, jugar una carta o huir.
- Verificado: typecheck, lint, 38 pruebas, build y e2e completo.
- Combate en menos toques: el modal de modificadores elige bando con dos botones (por defecto Jugadores si sos quien pelea o ayuda) y aplica con un toque (+1, +2, +3, +5, +10, −1, −2, −5) o con un valor libre. La victoria muestra el resumen precargado (niveles y tesoros) con un botón “Confirmar victoria”; ajustar niveles o agregar nota queda plegado. Verificado: typecheck, lint, 38 pruebas, build y e2e.
- Buscador de monstruos estable: el listado arranca abierto con alto fijo y los paneles con buscador tienen alto fijo en móvil (`Modal tall`), así escribir no mueve el campo. El e2e compara la posición del campo antes y después de escribir.

## Rediseño visual (2026-11-13)
- Dirección: "taberna de noche". Fondo casi negro cálido, superficies en escalones claros, oro (`accent-brand`) como acento de marca, rojo solo para peligro/acción principal y verde para resolver.
- Tipografías locales vía Fontsource (sin hotlinks): Bricolage Grotesque para títulos, Inter para texto.
- Botones con relieve y respuesta al toque (`active:scale`), nuevo `btn-gold` para "Patear la puerta". Inputs hundidos con foco dorado.
- Cabecera compacta con marca, código de sala en oro y conexión como punto verde (el cartel grande solo aparece si hay problemas). Barra inferior con indicador en píldora.
- Turno: héroe de fase con brillo dorado y carta inclinada; la acción del turno queda fija sobre la barra inferior (`.action-bar`).
- Combate: marcador con degradés y "VS" en medalla; se quitó la ilustración duplicada.
- Inicio: héroe nuevo con logo, frase corta y beneficios en línea.
- `npm run tour` (después de `npm run build`) genera capturas de todas las pantallas en modo oscuro y claro.
- Verificado: typecheck, lint, 38 pruebas, build, e2e.
- Combate: la tarjeta de Ayuda pasó arriba, justo debajo del marcador y del próximo paso, con botones grandes. En fase de combate la cabecera del turno se compacta (sin carta ni texto).
- Íconos de juego de game-icons.net (CC BY 3.0) en `GameIcon` para puerta, patada, monstruo, combate, ayuda, huida, victoria, carta, saqueo, maldición, DM, mesa, personaje y tiempo; Lucide queda para la interfaz. Crédito en el inicio y en `docs/ASSETS.md`.
- Pulido: aviso "¡Te toca!" con vibración cuando el turno pasa a vos; mesa compacta (una fila por jugador, detalle al tocar); celebración "+N NIVEL" con confeti (también en la TV, sin confeti si se reduce el movimiento); combate con monstruos en fichas compactas y sin textos de relleno; últimos eventos plegables; razas y clases desde listas desplegables con opción "Otra"; nombre y notas con guardado automático.

## App instalable y notificaciones push (2026-11-13)
- **Logo propio** (`public/logo.svg`): puerta de madera pateada con estallido rojo. Íconos PNG 192/512, maskable y apple-touch en `public/icons/` (generados desde el SVG).
- **PWA:** `manifest.webmanifest` (standalone, tema oscuro) y `sw.js` (instalable, abre la pantalla de inicio sin conexión, muestra los push y abre la sala al tocarlos). `sw.js` y el manifiesto se sirven con `no-cache`. En el inicio aparece "Instalar la app" (Android/escritorio) o las instrucciones para iPhone.
- **Push:** modelos `PushSubscription` y `AppSetting` (migración `push_notifications`). Las claves VAPID salen del entorno o se generan una vez y quedan en la base. Tras cada comando se avisa a quien le empieza el turno y a quien le piden ayuda; las suscripciones vencidas (404/410) se borran. Tarjeta "¿Te avisamos cuando te toque?" para jugadores; en iPhone primero hay que agregarla a inicio (iOS 16.4+).
- Verificado: typecheck, lint, 42 pruebas (incluye envío cifrado real a un servicio push de prueba por HTTPS), build, e2e; service worker y manifiesto comprobados en Chromium. No probado en un teléfono real.

- Inicio en dos pasos: primero se elige "Crear partida" o "Unirse a una partida" y recién ahí aparece el formulario (`?modo=crear|unirse`, el botón atrás del celular vuelve a la elección).
- Avatar y color por jugador: se eligen al crear o unirse y se cambian en "Mi personaje"; aparecen en sala, mesa, turno, tele y podio. Las salas viejas reciben un avatar estable.
- Pantalla final con podio (1°, 2°, 3°) y premios en joda calculados de `GameState.stats` (contadores que suma el motor) y del cronómetro (`src/shared/awards.ts`). También en la vista TV.
- Reacciones rápidas (😂 💀 🔥 🐔 👏 😱): evento de Socket.IO efímero, validado y limitado a una cada 600 ms por conexión; flotan en todos los celulares y en la tele. No cambian la versión de la partida.
- Sonidos sintetizados (patada, nivel, victoria, huida, fin y "te toca") con botón de silencio en el encabezado; la preferencia queda en el navegador.
- El aviso "¡Estás perdiendo!" ya no reaparece al cambiar de sección.
- Ayudas para novatos (`src/shared/novice.ts`, paráfrasis breves de las reglas del juego base):
  - Modo novato (prendido por defecto, se apaga por dispositivo): consejos según fase, rol y combate, más "¿Qué puedo hacer ahora?".
  - Equipo por espacios (`character.setItems`): cabeza, armadura, calzado, manos y objetos grandes; la bonificación se calcula sola y los límites son avisos, no prohibiciones.
  - Guía "Me morí" con pasos tildables y botón para vaciar el equipo en la app.
  - Calculadora de venta: 1000 de oro por nivel, sin llegar al nivel 10 vendiendo.
  - Partida de práctica (`POST /api/practice`): arranca sola con dos jugadores de mentira (`bot`) que maneja quien la crea; el DM responde pedidos de ayuda por ellos; vence en un día.
- Modo novato: apagado por defecto; switch al crear/unirse y en "Mi personaje" (siempre activo en la práctica). La tarjeta ya no tiene ✕.
- Turno más limpio: "Ver ayuda de esta fase" se oculta con modo novato; las reacciones van en un botón flotante; "Últimos eventos" quedó solo en Mesa.
- Revancha con un toque (`POST /api/rooms/:code/rematch` y `/rematch/join`): el DM arma una sala nueva con el mismo grupo, orden, avatares y roles (todos desde nivel 1); la sala vieja guarda `rematch` y los demás entran con su sesión vieja. La tele muestra el enlace.
- Vista TV escalada: un escenario de 1280×720 que se achica con `transform` en pantallas más chicas (navegadores de tele a 960×540, etc.). Prueba `e2e/tv-fit.spec.ts`.
- Turno compacto en el celular: fase, quién juega y reloj en una sola línea (el reloj grande queda en la tele). En combate, "Resolver combate" (o "Jugar una carta" para el resto) va justo debajo de los totales; el aviso de notificaciones ya no ocupa lugar en el turno. Prueba `e2e/mobile-fold.spec.ts` a 390×700.
- Sexo del personaje (`Character.sex`, opcional para salas viejas): switch Hombre/Mujer obligatorio al crear, unirse o practicar; se cambia en "Mi personaje" (por ejemplo, por una maldición) y queda en el historial. Se muestra con razas y clases en la ficha, la mesa y la tele (`identityLine`). La revancha lo conserva.
- Deshacer (`character.undo`): cada personaje guarda su último cambio manual (nivel, equipo, modificadores, razas, clases, sexo, avatar, color u objetos; no nombre ni notas). El botón "Deshacer: nivel 3→4" aparece fijo abajo a la izquierda en la ficha y solo funciona si el personaje no cambió después. Lo puede usar el dueño o el DM.
- Bonus temporales: objetos "de un solo uso" (`Item.oneShot`, pociones y similares) que no suman al equipo. En combate, `combat.useItem` los gasta (salen del inventario) y su bonus queda como modificador del combate, que se borra solo al terminar. La sección se llama "Bonus temporales".
- Condiciones del monstruo (`Monster.conditions`, opcional): al cargar el monstruo se agregan "+N contra mujeres/hombres/una raza/una clase" y "no persigue a…". `combatTotals` suma el bonus si quien pelea o ayuda coincide (sin raza cuenta como humano; plurales y tildes se ignoran) y lo muestra como chips ("+5 contra hombres (Martín)"), también en la tele. En la huida, a quien no persigue se lo marca como escapado.
- Aviso de nivel 9: el motor emite `level.nine` al llegar a 9; todos ven un cartel "A un paso: … en nivel 9. El nivel 10 solo se gana matando un monstruo" (también en la tele) y llega una notificación push a los demás jugadores. En combate, si pelea o ayuda alguien en nivel 9, los totales avisan "¡Si ganan este combate, … puede ganar la partida!".
- Límite para crear salas: por IP, 10 cada 10 min y 30 por día (en memoria); además un tope global en la base, `MAX_OPEN_ROOMS` (300 salas abiertas a la vez) y `MAX_ROOMS_PER_DAY` (150 nuevas en 24 h), que también aplica a la práctica y la revancha. En pruebas el tope global no aplica salvo que se fije.
