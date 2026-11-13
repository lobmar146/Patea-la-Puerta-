import { useEffect, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import type { EventDTO } from '../../shared/types';
import { useRoom, type ConnStatus } from '../useRoom';

const STATUS: Record<ConnStatus, { text: string; icon: string; cls: string }> = {
  online: { text: 'Conectado', icon: '●', cls: 'bg-moss text-white' },
  connecting: { text: 'Conectando…', icon: '◌', cls: 'bg-gold text-white' },
  reconnecting: { text: 'Reconectando…', icon: '↻', cls: 'bg-gold text-white' },
  unauthorized: { text: 'Sin acceso', icon: '✕', cls: 'bg-blood text-white' },
};

export function ConnectionBadge({ big = false }: { big?: boolean }) {
  const { status } = useRoom();
  const s = STATUS[status];
  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="conn-status"
      data-status={status}
      className={`inline-flex items-center gap-1 rounded-full border-2 border-ink px-2 py-0.5 font-bold ${s.cls} ${big ? 'text-xl' : 'text-xs'}`}
    >
      <span aria-hidden>{s.icon}</span> {s.text}
    </span>
  );
}

export function PresenceDot({ online }: { online: boolean }) {
  return (
    <span className={`text-xs font-bold ${online ? 'text-moss' : 'text-ink-soft'}`} title={online ? 'En línea' : 'Desconectado'}>
      {online ? '● en línea' : '○ desconectado'}
    </span>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  min = -99,
  max = 999,
  disabled,
  testId,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2" data-testid={testId}>
      <span className="font-bold">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary w-12 text-xl" aria-label={`Restar 1 a ${label}`} disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <output className="w-12 text-center text-2xl font-black tabular-nums" aria-label={label} data-testid={testId ? `${testId}-value` : undefined}>
          {value}
        </output>
        <button type="button" className="btn-secondary w-12 text-xl" aria-label={`Sumar 1 a ${label}`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}

export function Toast() {
  const { toast, setToast } = useRoom();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast, setToast]);
  if (!toast) return null;
  return (
    <div role="alert" data-testid="toast" className="fixed inset-x-3 top-3 z-50 mx-auto max-w-md rounded-lg border-2 border-ink bg-blood p-3 font-bold text-white shadow-lg">
      <div className="flex items-start gap-2">
        <span aria-hidden>⚠</span>
        <p className="flex-1">{toast}</p>
        <button className="underline" onClick={() => setToast(null)}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

export function EventList({ events, limit = 10, big = false }: { events: EventDTO[]; limit?: number; big?: boolean }) {
  return (
    <ol className={`space-y-1 ${big ? 'text-2xl' : 'text-sm'}`} aria-label="Eventos recientes">
      {events.slice(0, limit).map((e) => (
        <li key={e.id} className={`border-l-4 pl-2 ${e.type.startsWith('dm.') ? 'border-royal' : 'border-parchment-300'}`}>
          {e.type.startsWith('dm.') && <span className="font-bold text-royal">[DM] </span>}
          {e.message}
        </li>
      ))}
    </ol>
  );
}

export function QrCode({ text, size = 180 }: { text: string; size?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(text, { margin: 1, width: size * 2, color: { dark: '#2b1d12', light: '#fdf9ef' } })
      .then(setUrl)
      .catch(() => setUrl(null));
  }, [text, size]);
  return url ? <img src={url} width={size} height={size} alt={`Código QR para unirse: ${text}`} /> : null;
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function joinUrl(code: string, publicUrl?: string | null) {
  const base = publicUrl || window.location.origin;
  return `${base.replace(/\/$/, '')}/s/${code}`;
}
