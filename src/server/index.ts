import http from 'node:http';
import { config } from './config.js';
import { prisma } from './db.js';
import { createApp } from './http.js';
import { createKeepAlive } from './keepAlive.js';
import { createRealtime } from './realtime.js';
import { deleteExpiredRooms } from './rooms.js';

// onJoined se invoca recién con pedidos HTTP, cuando `realtime` ya existe.
const app = createApp({ onJoined: (roomId) => void realtime.broadcast(roomId), onActivity: () => keepAlive?.touch() });
const server = http.createServer(app);
const realtime = createRealtime(server, () => keepAlive?.touch());

const keepAlive = config.keepAliveUrl
  ? createKeepAlive({
      url: config.keepAliveUrl,
      intervalMs: 10 * 60 * 1000,
      idleMs: config.keepAliveIdleHours * 60 * 60 * 1000,
      connected: () => realtime.io.engine.clientsCount,
    })
  : null;
if (keepAlive) {
  keepAlive.start();
  console.log(`Keep-alive activo contra ${config.keepAliveUrl} (se apaga tras ${config.keepAliveIdleHours} h sin actividad).`);
}

const cleanup = setInterval(() => {
  deleteExpiredRooms().catch((e) => console.error('cleanup', e));
}, 60 * 60 * 1000);
cleanup.unref();

server.listen(config.port, config.host, () => {
  console.log(`Pateá la Puerta! escuchando en http://${config.host}:${config.port}`);
});

async function shutdown(signal: string) {
  console.log(`${signal}: cerrando…`);
  realtime.io.close();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
