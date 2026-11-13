// Configuración leída del entorno. Ver .env.example.
export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  isProd: process.env.NODE_ENV === 'production',
  ttlDays: Math.max(1, Number(process.env.ROOM_TTL_DAYS ?? 7) || 7),
  publicUrl: process.env.PUBLIC_URL || '',
  recentEvents: 30,
  /** URL pública para el keep-alive. Render define RENDER_EXTERNAL_URL solo. Vacío = desactivado. */
  keepAliveUrl: process.env.KEEPALIVE_URL ?? (process.env.NODE_ENV === 'production' ? process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '' : ''),
  /** Horas sin actividad tras las que se deja dormir al servidor (por defecto 2). */
  keepAliveIdleHours: Math.max(0.25, Number(process.env.KEEPALIVE_IDLE_HOURS ?? 2) || 2),
};
