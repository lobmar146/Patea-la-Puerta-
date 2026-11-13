// Notificaciones Web Push: "¡te toca!" y pedidos de ayuda, aunque la app esté cerrada.
// Las claves VAPID salen del entorno o se generan una vez y quedan en la base (AppSetting),
// así sobreviven a reinicios y redeploys sin configurar nada.
import webpush from 'web-push';
import { prisma } from './db.js';

export interface PushMessage {
  participantId: string;
  title: string;
  body: string;
  tag: string;
}

let vapid: Promise<{ publicKey: string; privateKey: string }> | null = null;

async function loadVapid() {
  const fromEnv = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY;
  if (fromEnv) return { publicKey: process.env.VAPID_PUBLIC_KEY!, privateKey: process.env.VAPID_PRIVATE_KEY! };
  const row = await prisma.appSetting.findUnique({ where: { key: 'vapid' } });
  if (row) return JSON.parse(row.value) as { publicKey: string; privateKey: string };
  const keys = webpush.generateVAPIDKeys();
  // Si dos procesos compiten, gana el primero y el otro relee.
  await prisma.appSetting.upsert({ where: { key: 'vapid' }, update: {}, create: { key: 'vapid', value: JSON.stringify(keys) } });
  const saved = await prisma.appSetting.findUniqueOrThrow({ where: { key: 'vapid' } });
  return JSON.parse(saved.value) as { publicKey: string; privateKey: string };
}

export function vapidKeys() {
  vapid ??= loadVapid().catch((e) => {
    vapid = null;
    throw e;
  });
  return vapid;
}

export async function saveSubscription(roomId: string, participantId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { roomId, participantId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    create: { endpoint: sub.endpoint, roomId, participantId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
}

export async function removeSubscription(endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

/** Envía los avisos sin bloquear al que llama. Borra suscripciones vencidas (404/410). */
export async function sendPush(code: string, messages: PushMessage[], extra: Pick<webpush.RequestOptions, 'agent'> = {}) {
  if (!messages.length) return;
  const keys = await vapidKeys();
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@patea-la-puerta.invalid';
  const subs = await prisma.pushSubscription.findMany({ where: { participantId: { in: messages.map((m) => m.participantId) } } });
  await Promise.all(
    subs.map(async (s) => {
      const msg = messages.find((m) => m.participantId === s.participantId)!;
      const payload = JSON.stringify({ title: msg.title, body: msg.body, tag: `${msg.tag}-${code}`, url: `/s/${code}` });
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          vapidDetails: { subject, publicKey: keys.publicKey, privateKey: keys.privateKey },
          TTL: 60 * 30,
          urgency: 'high',
          ...extra,
        });
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await removeSubscription(s.endpoint);
        else console.warn('push', status ?? (e as Error).message);
      }
    }),
  );
}
