// Configuración leída del entorno. Ver .env.example.
export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  isProd: process.env.NODE_ENV === 'production',
  ttlDays: Math.max(1, Number(process.env.ROOM_TTL_DAYS ?? 7) || 7),
  publicUrl: process.env.PUBLIC_URL || '',
  recentEvents: 30,
};
