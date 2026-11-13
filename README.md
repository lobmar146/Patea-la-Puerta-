# Pateá la Puerta!

Compañera web para partidas **presenciales** de Munchkin con cartas físicas: estadísticas de todos los personajes, guía de turno, números del combate y sincronización entre celulares y una pantalla de TV. Las cartas, los dados y las traiciones siguen en la mesa.

> Aplicación de fans, no oficial. Munchkin es una marca de Steve Jackson Games.

## Requisitos
- Node.js 20.11+ (recomendado 22)
- PostgreSQL 14+ (hay `docker-compose.yml` con PostgreSQL 16)

## Instalación
```bash
cp .env.example .env              # ajustá DATABASE_URL si no usás docker
docker compose up -d              # PostgreSQL local (crea también patea_test)
npm install
npx prisma migrate dev            # aplica migraciones
npm run dev                       # http://localhost:5173 (API en :3000)
```
Con `npm run dev`, Vite también escucha en la red local: desde los celulares abrí `http://<IP-de-tu-compu>:5173`.
En producción (`NODE_ENV=production`) la cookie es `Secure`: hace falta HTTPS (como en Render) salvo en `localhost`.

## Uso
1. **Crear partida**: quien la crea es el Dungeon Master (también juega). Los tres conjuntos (base, Munchkin 2 y 3) vienen tildados; se pueden agregar otros como texto.
2. **Invitar**: código de 5 caracteres, enlace o QR. El QR no da permisos de DM.
3. **Ingresar** como Jugador o Espectador. El navegador te recuerda mientras conserve su sesión.
4. **Lobby**: el DM ordena (a mano o sorteo) y arranca.
5. **Mi personaje / Turno / Mesa** (barra inferior en el celu) y **DM** para quien administra.
6. **Vista TV**: `/s/CODIGO/tv` (o "Abrir vista TV"), con botón de pantalla completa.

Nada se decide solo: la victoria del combate, las recompensas y el ganador al llegar a nivel 10 se confirman a mano.

## Comandos
| Comando | Qué hace |
|---|---|
| `npm run dev` | API (tsx watch) + Vite con proxy |
| `npm run build` | `prisma generate` + frontend + servidor a `dist/` |
| `npm start` | Producción (sin migrar) |
| `npm run start:prod` | `prisma migrate deploy` y arranca |
| `npm run typecheck` / `npm run lint` | Controles estáticos |
| `npm test` | Vitest: unitarias + integración con PostgreSQL real (`patea_test`) |
| `npm run test:e2e` | Playwright multicliente (requiere `npm run build`) |
| `npm run assets:fetch` | Descarga ilustraciones de referencia (ver `docs/ASSETS.md`) |
| `npm run check` | typecheck + lint + test + build |

Variables: ver `.env.example`. Las pruebas usan `TEST_DATABASE_URL` (por defecto la base local `patea_test`).

## Despliegue en Render
1. Subí el repo a GitHub.
2. En Render: **New → Blueprint** y elegí el repo; `render.yaml` crea un Web Service Node y una base PostgreSQL. **Elegí los planes vos**: el archivo no asume ninguno gratuito y los precios pueden cambiar.
3. Build: `npm ci --include=dev && npm run build`. Start: `npm run start:prod` (aplica migraciones). Healthcheck: `/api/health`.
4. Opcional: `PUBLIC_URL` con la URL pública para que el QR use ese dominio.
5. Mantené **una sola instancia** (la presencia en línea vive en memoria).

El servidor escucha en `process.env.PORT` y `0.0.0.0`, sirve el frontend compilado y deja `/api` y `/socket.io` fuera del fallback de rutas.

## Documentación
- `CLAUDE.md`: arquitectura, permisos y convenciones.
- `docs/PLAN.md`, `docs/PROGRESS.md`, `docs/DECISIONS.md`, `docs/ASSETS.md`.
