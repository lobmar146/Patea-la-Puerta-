// Llamadas HTTP (alta e ingreso). Las cookies HttpOnly las maneja el navegador.

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error ?? 'Error inesperado.');
  return body as T;
}

export interface RoomInfo {
  code: string;
  status: string;
  expiresAt: string;
  ttlDays: number;
  expired: boolean;
  hasSession: boolean;
  publicUrl: string | null;
}

export const api = {
  createRoom: (body: { name: string; sets: string[]; extraSets: string[] }) =>
    request<{ code: string }>('/api/rooms', { method: 'POST', body: JSON.stringify(body) }),
  roomInfo: (code: string) => request<RoomInfo>(`/api/rooms/${encodeURIComponent(code)}`),
  join: (code: string, body: { name: string; role: 'player' | 'spectator' }) =>
    request<{ code: string; reused: boolean }>(`/api/rooms/${encodeURIComponent(code)}/join`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  pushKey: () => request<{ publicKey: string }>('/api/push/key'),
  pushSubscribe: (code: string, sub: PushSubscriptionJSON) =>
    request<{ ok: true }>(`/api/rooms/${encodeURIComponent(code)}/push`, { method: 'POST', body: JSON.stringify(sub) }),
  pushUnsubscribe: (code: string, endpoint: string) =>
    request<{ ok: true }>(`/api/rooms/${encodeURIComponent(code)}/push`, { method: 'DELETE', body: JSON.stringify({ endpoint }) }),
};

/** UUID v4 que funciona también fuera de HTTPS (crypto.randomUUID exige contexto seguro). */
export function uuid(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
