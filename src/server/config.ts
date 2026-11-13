// Configuración leída del entorno. Ver .env.example.
function idleHours(raw: string | undefined): number {
  const n = Number(raw ?? 0);
  return !Number.isFinite(n) || n <= 0 ? Infinity : Math.max(0.25, n);
}

// Las pruebas crean muchas salas en la base de test: ahí el tope global no aplica salvo que se fije.
const testing = process.env.NODE_ENV === 'test' || !!process.env.VITEST;

export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  isProd: process.env.NODE_ENV === 'production',
  ttlDays: Math.max(1, Number(process.env.ROOM_TTL_DAYS ?? 7) || 7),
  publicUrl: process.env.PUBLIC_URL || '',
  /** Tope de salas abiertas (sin vencer) a la vez, para no llenar la base gratis. */
  maxOpenRooms: Math.max(1, Number(process.env.MAX_OPEN_ROOMS ?? (testing ? 1e6 : 300)) || 300),
  /** Tope de salas nuevas en 24 h entre todos. */
  maxRoomsPerDay: Math.max(1, Number(process.env.MAX_ROOMS_PER_DAY ?? (testing ? 1e6 : 150)) || 150),
  recentEvents: 30,
  /** URL pública para el keep-alive. Render define RENDER_EXTERNAL_URL solo. Vacío = desactivado. */
  keepAliveUrl: process.env.KEEPALIVE_URL ?? (process.env.NODE_ENV === 'production' ? process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '' : ''),
  /**
   * Horas sin actividad tras las que se deja dormir al servidor. Por defecto (o con 0) nunca:
   * así el primer ingreso no espera el minuto de arranque de Render Free.
   */
  keepAliveIdleHours: idleHours(process.env.KEEPALIVE_IDLE_HOURS),
};
