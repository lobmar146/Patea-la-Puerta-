import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Action } from '../shared/commands';
import type { CommandResult, Participant, Snapshot } from '../shared/types';
import { syncServerClock } from './serverClock';
import { uuid } from './api';

export type ConnStatus = 'connecting' | 'online' | 'reconnecting' | 'unauthorized';

export interface RoomApi {
  snap: Snapshot | null;
  me: Participant | null;
  status: ConnStatus;
  online: Set<string>;
  pending: boolean;
  send: (action: Action) => Promise<CommandResult>;
  toast: string | null;
  setToast: (t: string | null) => void;
}

const Ctx = createContext<RoomApi | null>(null);

export function useRoom(): RoomApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRoom fuera de RoomProvider');
  return v;
}

const ACK_TIMEOUT = 8000;
const MAX_ATTEMPTS = 6;

function waitConnected(socket: Socket): Promise<void> {
  if (socket.connected) return Promise.resolve();
  return new Promise((resolve) => socket.once('connect', () => resolve()));
}

export function RoomProvider({ code, children }: { code: string; children: ReactNode }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const versionRef = useRef(0);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    const socket = io({ auth: { code }, reconnectionDelayMax: 4000 });
    socketRef.current = socket;
    socket.on('connect', () => setStatus('online'));
    socket.on('disconnect', () => setStatus((s) => (s === 'unauthorized' ? s : 'reconnecting')));
    socket.on('connect_error', (err) => {
      if (err.message === 'unauthorized') {
        setStatus('unauthorized');
        socket.disconnect();
      } else setStatus('reconnecting');
    });
    socket.on('snapshot', (s: Snapshot) => {
      // Al reconectar llega un snapshot completo; se descartan los que llegan atrasados.
      if (s.version < versionRef.current) return;
      versionRef.current = s.version;
      syncServerClock(s.serverTime);
      setSnap(s);
      setOnline(new Set(s.online));
      const me = s.state.participants[s.me.participantId];
      if (me?.removed) {
        setStatus('unauthorized');
        socket.disconnect();
      }
    });
    socket.on('presence', (ids: string[]) => setOnline(new Set(ids)));
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code]);

  const send = useCallback((action: Action): Promise<CommandResult> => {
    // Los comandos de este dispositivo se envían de a uno, con la última versión conocida.
    const run = async (): Promise<CommandResult> => {
      const socket = socketRef.current;
      if (!socket) return { ok: false, code: 'offline', message: 'Sin conexión.', version: -1 };
      setPending(true);
      const cmd = { commandId: uuid(), expectedVersion: versionRef.current, action };
      try {
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          await waitConnected(socket);
          try {
            // Mismo commandId en cada reintento: si ya se guardó, el servidor no lo repite.
            const res: CommandResult = await socket.timeout(ACK_TIMEOUT).emitWithAck('command', cmd);
            if (res.ok) versionRef.current = Math.max(versionRef.current, res.version);
            else setToast(res.message);
            return res;
          } catch {
            // Sin respuesta: reintentamos tras reconectar.
          }
        }
        const msg = 'No pudimos confirmar la acción. Revisá la conexión.';
        setToast(msg);
        return { ok: false, code: 'timeout', message: msg, version: -1 };
      } finally {
        setPending(false);
      }
    };
    const p = queueRef.current.then(run, run);
    queueRef.current = p.catch(() => undefined);
    return p;
  }, []);

  const me = snap ? (snap.state.participants[snap.me.participantId] ?? null) : null;

  const value = useMemo<RoomApi>(
    () => ({ snap, me, status, online, pending, send, toast, setToast }),
    [snap, me, status, online, pending, send, toast],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
