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
