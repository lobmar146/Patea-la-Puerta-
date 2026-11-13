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

## Despliegue gratuito en Render

1. Subí la versión que quieras desplegar a una rama de GitHub. La versión pública usa las ilustraciones SVG incluidas en el repo.
2. En [Neon](https://console.neon.tech/), creá un proyecto **Free** en **AWS US East (N. Virginia)**. En **Connect**, desactivá *Connection pooling* y copiá la URL directa de PostgreSQL con `sslmode=require`. Agregale `&connect_timeout=15` para darle tiempo a la base de arrancar cuando está dormida. [Guía de Neon para Prisma](https://neon.com/docs/guides/prisma#troubleshooting).
3. En el [panel de Render](https://dashboard.render.com/), elegí **New → Blueprint**, conectá el repo y seleccioná la rama del paso 1. Usá el `render.yaml` de la raíz. El Blueprint configura un Web Service **Free** en Virginia. Pegá la URL de Neon como valor de `DATABASE_URL` en el formulario de Render.
4. Revisá el plan **Free** y elegí **Deploy Blueprint**. El arranque aplica las migraciones automáticamente. Cuando quede activo, probá `/api/health` en la URL pública y creá una partida. Abrí el QR en un celular y la vista TV en otra pantalla para verificar que ambos reciban los cambios.

Render Free suspende el servicio después de 15 minutos sin tráfico entrante. La primera visita después de la pausa puede tardar cerca de un minuto. La base de Neon guarda las partidas durante esos reinicios. [Límites de Render Free](https://render.com/docs/free) · [Plan Free de Neon](https://neon.com/docs/introduction/plans).

## Documentación
- `CLAUDE.md`: arquitectura, permisos y convenciones.
- `docs/PLAN.md`, `docs/PROGRESS.md`, `docs/DECISIONS.md`, `docs/ASSETS.md`.
