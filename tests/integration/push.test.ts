// Notificaciones push: a quién se avisa, alta/baja de suscripciones y limpieza de las vencidas.
import { createECDH, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addParticipant, applyAction, createInitialState } from '../../src/shared/engine';
import type { Action } from '../../src/shared/commands';
import type { GameState } from '../../src/shared/types';
import { createApp } from '../../src/server/http';
import { prisma } from '../../src/server/db';
import { pushMessagesFor } from '../../src/server/rooms';
import { sendPush } from '../../src/server/push';

const now = '2026-01-01T00:00:00.000Z';
const hasOpenssl = (() => {
  try {
    execFileSync('openssl', ['version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();
let n = 0;
const id = () => `id-${++n}`;
const run = (s: GameState, actor: string, a: Action) => applyAction(s, actor, a, { now, id }).state;

function lobby(): GameState {
  let s = createInitialState('PUSH1', 7);
  s = addParticipant(s, { id: 'dm', name: 'Dana', role: 'player', isDm: true, now });
  s = addParticipant(s, { id: 'p1', name: 'Pablo', role: 'player', isDm: false, now });
  return s;
}

function fakeSubscription(endpoint: string) {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return { endpoint, keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };
}

describe('a quién se avisa', () => {
  it('al empezar la partida y al pasar el turno, a quien le toca', () => {
    const s0 = lobby();
    const s1 = run(s0, 'dm', { type: 'game.start' });
    expect(pushMessagesFor(s0, s1)).toEqual([expect.objectContaining({ participantId: 'dm', tag: 'turn' })]);
    let s = run(s1, 'dm', { type: 'turn.kickDoor' });
    s = run(s, 'dm', { type: 'turn.doorResult', result: 'other' });
    s = run(s, 'dm', { type: 'turn.lootRoom' });
    s = run(s, 'dm', { type: 'turn.lootDone' });
    const before = run(s, 'dm', { type: 'turn.charityDone' });
    const after = run(before, 'dm', { type: 'turn.end' });
    expect(pushMessagesFor(before, after)).toEqual([expect.objectContaining({ participantId: 'p1', title: '¡Te toca!' })]);
    // Un cambio que no mueve el turno no avisa a nadie.
    expect(pushMessagesFor(after, run(after, 'p1', { type: 'character.update', targetId: 'p1', patch: { level: 2 } }))).toEqual([]);
  });

  it('al pedir ayuda, a quien se la piden', () => {
    let s = run(lobby(), 'dm', { type: 'game.start' });
    s = run(s, 'dm', { type: 'turn.kickDoor' });
    const before = run(s, 'dm', { type: 'turn.doorResult', result: 'monster', monster: { name: 'Planta', strength: 9, levels: 1, treasures: 1 } });
    const after = run(before, 'dm', { type: 'help.request', toId: 'p1' });
    expect(pushMessagesFor(before, after)).toEqual([expect.objectContaining({ participantId: 'p1', tag: 'help', body: expect.stringContaining('Dana') })]);
  });
});

describe('suscripciones por HTTP', () => {
  let server: http.Server;
  let base = '';
  beforeAll(async () => {
    server = http.createServer(createApp({ onJoined: () => {} }));
    await new Promise<void>((r) => server.listen(0, r));
    base = `http://localhost:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it('clave pública estable, alta solo con sesión y baja', async () => {
    const k1 = await (await fetch(`${base}/api/push/key`)).json();
    const k2 = await (await fetch(`${base}/api/push/key`)).json();
    expect(k1.publicKey).toMatch(/^[A-Za-z0-9_-]{80,}$/);
    expect(k2.publicKey).toBe(k1.publicKey);

    const created = await fetch(`${base}/api/rooms`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Dana' }) });
    const { code } = await created.json();
    const cookie = created.headers.get('set-cookie')!.split(';')[0];
    const sub = fakeSubscription(`https://push.example.com/${randomBytes(6).toString('hex')}`);

    const anon = await fetch(`${base}/api/rooms/${code}/push`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sub) });
    expect(anon.status).toBe(401);
    const bad = await fetch(`${base}/api/rooms/${code}/push`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ ...sub, endpoint: 'http://inseguro.example.com' }) });
    expect(bad.status).toBe(400);
    const ok = await fetch(`${base}/api/rooms/${code}/push`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(sub) });
    expect(ok.status).toBe(201);
    expect(await prisma.pushSubscription.count({ where: { endpoint: sub.endpoint } })).toBe(1);

    const del = await fetch(`${base}/api/rooms/${code}/push`, { method: 'DELETE', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ endpoint: sub.endpoint }) });
    expect(del.status).toBe(200);
    expect(await prisma.pushSubscription.count({ where: { endpoint: sub.endpoint } })).toBe(0);
  });

  // Necesita openssl para el certificado de prueba (viene con Git for Windows, macOS y Linux).
  it.skipIf(!hasOpenssl)('envía el aviso cifrado y borra la suscripción si el servicio dice que venció', async () => {
    const received: { status: number; encoding?: string }[] = [];
    let reply = 201;
    // Servicio push falso por HTTPS (web-push solo habla HTTPS), con certificado propio de prueba.
    const dir = mkdtempSync(path.join(tmpdir(), 'pp-push-'));
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost', '-keyout', path.join(dir, 'k.pem'), '-out', path.join(dir, 'c.pem')], { stdio: 'ignore' });
    const cert = readFileSync(path.join(dir, 'c.pem'));
    const agent = new https.Agent({ ca: cert });
    const pushService = https.createServer({ key: readFileSync(path.join(dir, 'k.pem')), cert }, (req, res) => {
      req.resume();
      received.push({ status: reply, encoding: req.headers['content-encoding'] as string | undefined });
      res.statusCode = reply;
      res.end();
    });
    await new Promise<void>((r) => pushService.listen(0, r));
    const endpoint = `https://localhost:${(pushService.address() as AddressInfo).port}/sub`;

    const created = await fetch(`${base}/api/rooms`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Dana' }) });
    const { code, participantId } = await created.json();
    const room = await prisma.room.findUniqueOrThrow({ where: { code } });
    const sub = fakeSubscription(endpoint);
    await prisma.pushSubscription.create({ data: { endpoint, roomId: room.id, participantId, p256dh: sub.keys.p256dh, auth: sub.keys.auth } });

    await sendPush(code, [{ participantId, title: '¡Te toca!', body: 'Dana', tag: 'turn' }], { agent });
    expect(received).toEqual([{ status: 201, encoding: 'aes128gcm' }]);
    expect(await prisma.pushSubscription.count({ where: { endpoint } })).toBe(1);

    reply = 410;
    await sendPush(code, [{ participantId, title: '¡Te toca!', body: 'Dana', tag: 'turn' }], { agent });
    expect(await prisma.pushSubscription.count({ where: { endpoint } })).toBe(0);
    await new Promise<void>((r) => pushService.close(() => r()));
  });
});
