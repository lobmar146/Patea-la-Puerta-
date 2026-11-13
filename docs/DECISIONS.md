# Decisiones y supuestos

**D-01 Versiones.** Se fijaron versiones estables y conocidas en lugar de las últimas mayores (React 18.3, Vite 5.4, Tailwind 3.4, Express 4.22, Prisma 6.19, Zod 3.25, Vitest 2.1, ESLint 9, TypeScript 5.9, Playwright 1.63). Motivo: compatibilidad probada entre sí y con el Chromium disponible. Hay `package-lock.json`.

**D-02 Un solo paquete.** Cliente, servidor y código compartido viven en un solo `package.json` (sin monorepo) para simplificar comandos y despliegue.

**D-03 Estado en JSONB versionado.** `Room.state` guarda el estado completo de la partida y `Room.version` su versión. Salas, participantes, sesiones, eventos y comandos procesados son tablas. Simplifica el MVP y el snapshot completo.

**D-04 Concurrencia estricta.** Cada comando lleva `expectedVersion`. Además se bloquea la fila (`FOR UPDATE`) y se actualiza con `WHERE version = …`. Si la versión no coincide se responde `conflict` con el estado vigente y un mensaje; no se re-aplica en silencio. El cliente serializa sus propios comandos y usa la última versión conocida, así que los conflictos solo aparecen con ediciones simultáneas de distintas personas.

**D-05 Idempotencia.** `(roomId, commandId)` es clave primaria de `ProcessedCommand`. Un reintento devuelve `{ ok, duplicate: true, version }` sin repetir efectos. Se conservan 2 días (luego un reintento cae en `conflict`, que también es seguro).

**D-06 Sesión por sala.** Cookie `pp_<CÓDIGO>` HttpOnly, SameSite=Lax, Secure en producción. En la base solo se guarda el sha256 del token. Así un mismo navegador puede estar en varias salas. El socket se autentica con esa cookie, nunca con `socket.id`.

**D-07 Presencia en memoria.** "En línea/desconectado" se calcula con los sockets vivos (efímero por naturaleza). Por eso `render.yaml` fija una sola instancia. La identidad y la partida están en PostgreSQL.

**D-08 Razas y clases.** Texto libre con sugerencias: base (Elfo, Enano, Mediano; Guerrero, Mago, Clérigo, Ladrón) y las pedidas para Munchkin 2 y 3 (Orco, Gnomo, Bardo). Se agregó Bárbaro como sugerencia porque, hasta donde sabemos, viene en Munchkin 2; **no se pudo confirmar** en el texto de las reglas oficiales consultadas. Se permiten varias razas/clases; la mesa valida la legalidad.

**D-09 Conjuntos.** Base + Munchkin 2 (Unnatural Axe) + Munchkin 3 (Clerical Errors) vienen tildados por defecto; se pueden sumar otros como texto libre ("reglas a cargo de la mesa"). No se automatiza ninguna regla específica de expansión.

**D-10 Permisos de combate.** Monstruos: quien pelea, su ayudante o el DM. Modificadores temporales: cualquier jugador (en la mesa todos tiran cartas al combate); cada uno queda registrado con su autor. Resolver: jugador activo o DM. Pedir ayuda: solo quien pelea; varias solicitudes pendientes a la vez, pero al aceptar una se cancelan las demás.

**D-11 Victoria manual.** Se precarga para quien pelea la suma de niveles de los monstruos y 0 para el ayudante; se edita antes de confirmar. Los tesoros solo se informan (se roban en la mesa). Nada se declara automáticamente.

**D-12 Nivel 10.** Llegar a 10 por cualquier vía crea un aviso visible para todos; el DM confirma la victoria o lo descarta. Rango técnico de nivel: 1–99.

**D-13 El DM puede avanzar un turno ajeno** desde la guía de turno (queda marcado "(DM)" en el evento) y también corregir turno/fase desde su panel. Cambiar fase o jugador durante un combate lo descarta (con evento).

**D-14 Jugadores que llegan tarde** se agregan al final del orden. Quitar al jugador activo pasa el turno al siguiente, desde preparación.

**D-15 Ilustraciones.** El entorno de desarrollo no pudo descargar las referencias (bloqueo de red del entorno, no del sitio). Se crearon ilustraciones provisorias originales y un script `npm run assets:fetch` para descargarlas localmente. Las imágenes descargadas no se versionan hasta confirmar permisos. Ver `docs/ASSETS.md`.

**D-16 Textos de reglas.** Paráfrasis breves del reglamento base (versión 1.8, julio 2019) y del FAQ oficial de munchkin.game. Del Unnatural Axe y Clerical Errors solo se obtuvo texto parcial; no hay recordatorios específicos de esas expansiones.

**D-17 Vencimiento.** 7 días sin actividad por defecto (`ROOM_TTL_DAYS`), visible en la sala. La limpieza corre cada hora por fecha; un reinicio no borra nada.
