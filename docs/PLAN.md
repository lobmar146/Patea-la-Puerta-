# Plan por etapas

Cada etapa es vertical (servidor + UI + pruebas) y termina con verificaciones.

## a. Crear sala, ingresar y recuperar sesión
- Crear sala con código corto, enlace y QR (sin credenciales). El creador es DM y jugador.
- Ingreso como Jugador o Espectador por código o enlace.
- Cookie HttpOnly opaca; recargar no duplica participantes.
- **Aceptación:** pruebas de integración de `joinRoom` (reuso de sesión, tokens hasheados) y e2e de ingreso (criterios 1, 2, 12).

## b. Personajes y sincronización real
- Personaje: nombre, color, nivel ≥1, razas y clases múltiples, equipo, modificadores, notas. Poder = nivel + equipo + otros.
- Socket.IO con snapshot completo al conectar; comandos versionados e idempotentes.
- **Aceptación:** criterios 3, 4, 5, 13, 15, 16 (unitarias, integración PostgreSQL, e2e).

## c. Turnos y combate
- Máquina de estados: preparación → patear → (monstruo → combate | maldición → sin monstruo | otra → sin monstruo) → buscar problemas | saquear → caridad → fin.
- Combate: monstruos, modificadores temporales por bando, ayuda (pedir/aceptar/rechazar, uno solo), totales y diferencia sin decidir victoria; victoria/huida/otra con confirmación.
- Aviso de nivel 10 con confirmación del DM.
- **Aceptación:** criterios 6, 7, 8, 9, 10, 11, 17.

## d. Vista TV e ilustraciones
- Vista 1920×1080 adaptable, sin controles de edición, pantalla completa, conexión visible.
- Manifiesto de ilustraciones reemplazable con fallback local.
- **Aceptación:** criterio 18 (e2e en 390×844 y 1920×1080 sin scroll horizontal), `docs/ASSETS.md` completo.

## e. Recuperación tras reinicio y Render
- Reinicio real del proceso con la misma base: sala, roles, turno, combate y personajes intactos; reintentos sin duplicar.
- `render.yaml`, healthcheck, `PORT`/`0.0.0.0`, SPA fallback que no intercepta `/api` ni `/socket.io`.
- **Aceptación:** criterio 14 (Vitest y Playwright matan el proceso con SIGKILL y lo vuelven a levantar).
