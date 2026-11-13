# Pateá la Puerta! — guía operativa

App web para acompañar partidas presenciales de Munchkin (cartas físicas). Interfaz 100 % en español.
Las cartas, dados y negociaciones pasan en la mesa: la app lleva números, turnos y sincronización.

## Arquitectura
- Un solo proceso Node (`src/server`): Express (API `/api/*`), Socket.IO (`/socket.io`) y el frontend compilado (`dist/client`).
- `src/shared`: tipos, esquemas Zod de comandos (`commands.ts`), máquina de estados pura (`engine.ts`), cálculos (`rules.ts`), textos de fases (`phases.ts`). Lo usan servidor y cliente.
- `src/client`: React + Vite + Tailwind. Estado en vivo vía `useRoom.tsx` (Socket.IO). Ilustraciones en `src/client/assets/manifest.ts`.
- PostgreSQL + Prisma (`prisma/schema.prisma`): `Room` guarda el estado JSONB versionado; `Participant`, `Session`, `GameEvent`, `ProcessedCommand` son relacionales.
- El cronómetro se persiste dentro de `GameState.clock`; el servidor marca inicio/pausa/reanudación/cambio de turno y el cliente calcula los segundos desde `activeSince` sin emitir comandos periódicos.

## Comandos
```
docker compose up -d            # PostgreSQL local (o usá uno propio; ver .env.example)
npm install
npx prisma migrate dev          # migraciones en la base de desarrollo
npm run dev                     # API :3000 + Vite :5173 (proxy /api y /socket.io)
npm run typecheck && npm run lint && npm test && npm run build
npm run test:e2e                # requiere `npm run build` antes
```
Las pruebas usan `TEST_DATABASE_URL` (por defecto `postgresql://munchkin:munchkin@localhost:5432/patea_test`). Nunca mocks para persistencia.

## Reglas de permisos (se validan SOLO en el servidor, `engine.ts`)
- Espectador: ninguna mutación. Removido: sesión revocada.
- Jugador: edita solo su personaje (en cualquier momento); avanza fases solo en su turno; pide ayuda si pelea; responde solo pedidos dirigidos a él.
- DM: todo lo anterior + iniciar/pausar/terminar, orden, editar cualquier personaje, corregir turno/fase, transferir DM, quitar participantes, confirmar ganador. Sus correcciones generan eventos `dm.*`.
- Nadie se vuelve DM desde el frontend; el DM nunca cambia por desconexión.

## Persistencia y comandos
- Cada comando: `{ commandId (uuid), expectedVersion, action }`. `processCommand` (rooms.ts) en UNA transacción: `SELECT … FOR UPDATE` de la sala → sesión → commandId repetido (devuelve resultado sin repetir) → versión esperada (si no coincide: `conflict` + snapshot) → `applyAction` → guarda estado+eventos+commandId. Se emite después del commit.
- Sesión: cookie HttpOnly `pp_<CODIGO>` (SameSite=Lax, Secure en prod), en DB solo el sha256.
- Salas vencen por inactividad (`ROOM_TTL_DAYS`, 7 por defecto). Un reinicio nunca borra nada.

## Convenciones
- TypeScript estricto; imports del servidor/shared con sufijo `.js` (NodeNext).
- Nueva acción = esquema en `commands.ts` + caso en `applyAction` + prueba en `tests/unit/engine.test.ts`.
- No automatizar efectos de cartas: la mesa y el DM corrigen a mano. Excepción pedida por M: las condiciones de monstruo que la mesa carga (bonus contra un sexo, raza o clase; "no persigue a…") se aplican solas según quién pelea o ayuda.
- Textos de reglas: paráfrasis breves, nunca copiar el reglamento.
- Imágenes: solo vía el manifiesto; registrar procedencia en `docs/ASSETS.md`; nunca hotlinks.
- Al terminar una etapa: correr verificaciones y actualizar `docs/PROGRESS.md`.

## UX móvil y transiciones
- Las decisiones y formularios del turno/combate van en `Modal`: en móvil se muestra como panel inferior, en escritorio centrado. Mantener botones táctiles de al menos 48 px, scroll dentro del panel, cierre con Escape y fondo, y área segura inferior.
- El resumen de fase queda visible detrás del modal; el modal no cambia reglas ni confirma una acción al cerrarse.
- Transiciones breves de fase y modal; respetar `prefers-reduced-motion`.
- En monstruos, “nivel de combate” equivale al nivel/fuerza impreso; “niveles al vencer” describe la recompensa. No mezclar ambos campos ni cambiar el contrato de datos sin migración.
- El cronómetro mide el turno actual, acumula el tiempo al pasar de jugador y se congela durante pausa. Mantenerlo sincronizado desde el backend y probar límites de turno/reinicio.
