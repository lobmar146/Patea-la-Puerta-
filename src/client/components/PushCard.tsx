import { BellRing, BellOff, Share } from 'lucide-react';
import { useEffect, useState } from 'react';
import { disablePush, enablePush, pushState, refreshPush, type PushState } from '../pwa';

/** Activa los avisos en este dispositivo: "¡te toca!" y pedidos de ayuda, aunque la app esté cerrada. */
export function PushCard({ code, hideWhenOn = false }: { code: string; hideWhenOn?: boolean }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void pushState().then((s) => {
      if (!alive) return;
      setState(s);
      if (s === 'on') void refreshPush(code);
    });
    return () => {
      alive = false;
    };
  }, [code]);

  if (!state || state === 'unsupported' || (hideWhenOn && state === 'on')) return null;

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      setState(state === 'on' ? await disablePush(code) : await enablePush(code));
    } catch (e) {
      setError((e as Error).message || 'No se pudieron activar los avisos.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card flex items-center gap-3 p-3 pr-4" data-testid="push-card">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${state === 'on' ? 'bg-moss/20 text-accent-moss' : 'bg-accent-brand/15 text-accent-brand'}`}>
        {state === 'on' ? <BellRing aria-hidden className="size-5" /> : <BellOff aria-hidden className="size-5" />}
      </span>
      <div className="min-w-0 flex-1 text-sm">
        {state === 'needs-install' ? (
          <>
            <p className="font-bold">Avisos en iPhone</p>
            <p className="text-ui-muted">Tocá <Share aria-label="Compartir" className="inline size-4 align-text-bottom" /> y “Agregar a inicio”. Abrila desde el ícono y activá los avisos.</p>
          </>
        ) : state === 'denied' ? (
          <>
            <p className="font-bold">Avisos bloqueados</p>
            <p className="text-ui-muted">Habilitá las notificaciones para esta app en los ajustes del teléfono.</p>
          </>
        ) : (
          <>
            <p className="font-bold">{state === 'on' ? 'Te avisamos cuando te toque' : '¿Te avisamos cuando te toque?'}</p>
            <p className="text-ui-muted">{error ?? 'También si alguien te pide ayuda, aunque tengas el celular bloqueado.'}</p>
          </>
        )}
      </div>
      {(state === 'on' || state === 'off') && (
        <button className={state === 'on' ? 'btn-secondary btn-small shrink-0' : 'btn-gold btn-small shrink-0'} disabled={busy} onClick={() => void toggle()}>
          {state === 'on' ? 'Apagar' : 'Activar'}
        </button>
      )}
    </section>
  );
}
