import { Circle, Minus, Plus, RefreshCw, TriangleAlert, Wifi, WifiOff, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import type { EventDTO } from '../../shared/types';
import { useRoom, type ConnStatus } from '../useRoom';

const STATUS: Record<ConnStatus, { text: string; icon: LucideIcon; cls: string }> = {
  online: { text: 'Conectado', icon: Wifi, cls: 'bg-moss text-white' },
  connecting: { text: 'Conectando…', icon: RefreshCw, cls: 'bg-[#68410f] text-white' },
  reconnecting: { text: 'Reconectando…', icon: RefreshCw, cls: 'bg-[#68410f] text-white' },
  unauthorized: { text: 'Sin acceso', icon: WifiOff, cls: 'bg-blood text-white' },
};

export function ConnectionBadge({ big = false, quiet = false }: { big?: boolean; quiet?: boolean }) {
  const { status } = useRoom();
  const s = STATUS[status];
  // En la cabecera del celular, "conectado" es un punto verde: el cartel grande queda para los problemas.
  if (quiet && status === 'online') {
    return (
      <span role="status" aria-live="polite" data-testid="conn-status" data-status={status} className="inline-flex items-center gap-1.5 px-1 text-xs font-semibold text-parchment-100/80">
        <span className="relative flex size-2.5" aria-hidden><span className="absolute inline-flex size-full animate-ping rounded-full bg-[#7ed38a] opacity-40 motion-reduce:hidden" /><span className="relative inline-flex size-2.5 rounded-full bg-[#7ed38a]" /></span>
        <span className="sr-only sm:not-sr-only">{s.text}</span>
      </span>
    );
  }
  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="conn-status"
      data-status={status}
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 font-bold shadow-sm ${s.cls} ${big ? 'text-lg' : 'text-xs'}`}
    >
      <s.icon aria-hidden className="size-3.5 shrink-0" /> {s.text}
    </span>
  );
}

export function PresenceDot({ online }: { online: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${online ? 'text-accent-moss' : 'text-ui-muted'}`} title={online ? 'En línea' : 'Desconectado'}>
      <Circle aria-hidden className={`size-2 shrink-0 ${online ? 'fill-current' : ''}`} />
      {online ? 'en línea' : 'desconectado'}
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
          <Minus aria-hidden className="size-5" />
        </button>
        <output className="w-12 text-center text-2xl font-black tabular-nums" aria-label={label} data-testid={testId ? `${testId}-value` : undefined}>
          {value}
        </output>
        <button type="button" className="btn-secondary w-12 text-xl" aria-label={`Sumar 1 a ${label}`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
          <Plus aria-hidden className="size-5" />
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
        <TriangleAlert aria-hidden className="size-5 shrink-0" />
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
          {e.type.startsWith('dm.') && <span className="font-bold text-accent-blue">[DM] </span>}
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
    <section className="card p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-xl font-black tracking-tight sm:text-2xl"><span className="h-6 w-1.5 rounded-full bg-blood" aria-hidden />{title}</h2>
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
