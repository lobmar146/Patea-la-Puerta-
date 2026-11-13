// Render Free apaga el servicio tras ~15 min sin tráfico entrante. Mientras haya una partida
// en uso, el servidor se llama a sí mismo por su URL pública (eso cuenta como tráfico entrante).
// Sin actividad durante `idleMs`, deja de hacerlo y Render puede dormirlo para ahorrar horas.

export interface KeepAliveOptions {
  url: string;
  /** Cada cuánto llamar (debe ser menor a 15 min). */
  intervalMs: number;
  /** Tiempo sin actividad tras el cual se deja de mantener despierto. */
  idleMs: number;
  /** Cantidad de sockets conectados ahora. */
  connected: () => number;
  fetchFn?: typeof fetch;
  now?: () => number;
}

export function createKeepAlive(opts: KeepAliveOptions) {
  const now = opts.now ?? Date.now;
  const fetchFn = opts.fetchFn ?? fetch;
  const pingUrl = new URL('/api/ping', opts.url).toString();
  let lastActivity = now();

  /** Registrar actividad (comandos, ingresos, conexiones). */
  function touch() {
    lastActivity = now();
  }

  /** Devuelve true si llamó a la URL pública. */
  async function tick(): Promise<boolean> {
    if (opts.connected() > 0) lastActivity = now();
    if (now() - lastActivity > opts.idleMs) return false;
    try {
      await fetchFn(pingUrl, { headers: { 'user-agent': 'patea-la-puerta-keepalive' }, signal: AbortSignal.timeout(10_000) });
    } catch (e) {
      console.warn('keep-alive', (e as Error).message);
    }
    return true;
  }

  function start() {
    const timer = setInterval(() => void tick(), opts.intervalMs);
    timer.unref();
    return () => clearInterval(timer);
  }

  return { touch, tick, start };
}
