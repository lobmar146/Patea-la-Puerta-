import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { createKeepAlive } from '../../src/server/keepAlive.js';
import { rateLimit } from '../../src/server/rateLimit.js';

describe('keep-alive para Render Free', () => {
  function setup(connected = 0) {
    let t = 0;
    let sockets = connected;
    const fetchFn = vi.fn(async () => new Response('{}'));
    const ka = createKeepAlive({
      url: 'https://ejemplo.onrender.com',
      intervalMs: 600_000,
      idleMs: 2 * 3_600_000,
      connected: () => sockets,
      fetchFn: fetchFn as unknown as typeof fetch,
      now: () => t,
    });
    return { ka, fetchFn, advance: (ms: number) => (t += ms), setSockets: (n: number) => (sockets = n) };
  }

  it('sin límite de inactividad, sigue llamando aunque pasen días', async () => {
    let t = 0;
    const fetchFn = vi.fn(async () => new Response('{}'));
    const ka = createKeepAlive({ url: 'https://ejemplo.onrender.com', intervalMs: 600_000, idleMs: Infinity, connected: () => 0, fetchFn: fetchFn as unknown as typeof fetch, now: () => t });
    t += 5 * 24 * 3_600_000;
    expect(await ka.tick()).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('llama a /api/ping mientras hay actividad reciente', async () => {
    const { ka, fetchFn, advance } = setup();
    advance(60 * 60_000);
    expect(await ka.tick()).toBe(true);
    expect(fetchFn).toHaveBeenCalledWith('https://ejemplo.onrender.com/api/ping', expect.anything());
  });

  it('deja dormir al servidor tras el tiempo sin actividad', async () => {
    const { ka, fetchFn, advance } = setup();
    advance(2 * 3_600_000 + 1);
    expect(await ka.tick()).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
    ka.touch();
    expect(await ka.tick()).toBe(true);
  });

  it('un socket conectado cuenta como actividad aunque nadie mande comandos', async () => {
    const { ka, advance, setSockets } = setup(1);
    advance(5 * 3_600_000);
    expect(await ka.tick()).toBe(true);
    setSockets(0);
    advance(2 * 3_600_000 + 1);
    expect(await ka.tick()).toBe(false);
  });

  it('un error de red no rompe el ciclo', async () => {
    const { ka, fetchFn } = setup();
    fetchFn.mockRejectedValueOnce(new Error('sin red'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await ka.tick()).toBe(true);
    warn.mockRestore();
  });
});

describe('límite de pedidos por IP', () => {
  it('responde 429 al superar el máximo', () => {
    const limit = rateLimit({ windowMs: 60_000, max: 2 });
    const req = { ip: '1.2.3.4' } as Request;
    const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
    const next = vi.fn();
    limit(req, res, next);
    limit(req, res, next);
    limit(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
    limit({ ip: '5.6.7.8' } as Request, res, next);
    expect(next).toHaveBeenCalledTimes(3);
  });
});
