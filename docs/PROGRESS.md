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
- **Keep-alive:** en producción el servidor llama a `/api/ping` (sin base de datos) por su URL pública cada 10 min mientras haya sockets conectados o actividad en las últimas `KEEPALIVE_IDLE_HOURS` (2 por defecto). Así Render Free no lo duerme en plena partida y Neon puede suspenderse cuando no hay juego. Fuera de partida el servidor sí se duerme y el primer ingreso tarda ~1 min.
- **Límite de pedidos:** `POST /api/rooms` (10 cada 10 min por IP) y `POST /api/rooms/:code/join` (60 cada 10 min), en memoria.
- **Cronómetro:** el snapshot trae `serverTime` y el cliente corrige el desfase de su reloj.
- **Imágenes:** `npm run build` descarga las ilustraciones (`scripts/fetch-assets.mjs`, tolera fallas). Uso privado entre amigos por decisión del usuario.
- **UI:** el buscador de monstruos muestra los resultados justo debajo del campo; “Sin monstruo” ofrece dos tarjetas grandes (Buscar problemas / Saquear la sala) y el formulario aparece recién al elegir Buscar problemas; el combate muestra un “próximo paso” según el marcador y un aviso “¡Estás perdiendo!” con botones para pedir ayuda, jugar una carta o huir.
- Verificado: typecheck, lint, 38 pruebas, build y e2e completo.
