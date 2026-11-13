import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { displayName } from '../../shared/rules';
import { EventList } from '../components/ui';
import { ThemeToggle } from '../components/ThemeToggle';
import { FinalResults } from '../components/FinalResults';
import { useRoom } from '../useRoom';

export function Finished() {
  const { snap, me } = useRoom();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!snap) return null;
  const { state } = snap;
  const rematch = state.rematch;
  const mine = rematch && me ? rematch.map[me.id] : undefined;
  const go = async (create: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const { code } = create ? await api.rematch(snap.code) : await api.joinRematch(snap.code);
      // Recarga completa: la sala nueva arranca con su propia conexión y sesión.
      window.location.assign(`/s/${code}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos entrar a la revancha. Probá otra vez.');
      setBusy(false);
    }
  };
  return (
    <main className="mx-auto max-w-2xl space-y-5 p-4 pb-12" data-testid="finished">
      <div className="flex justify-end"><ThemeToggle /></div>
      <section className="text-center">
        <p className="text-xs font-black uppercase tracking-[.22em] text-ui-muted">Partida terminada</p>
        <h1 className="mt-2 font-display text-4xl font-black sm:text-5xl">{state.winnerId ? `¡${displayName(state, state.winnerId)} gana!` : 'Fin de la partida'}</h1>
        <p className="mt-2 text-ui-muted">Las amistades se reparan con el tiempo. Probablemente.</p>
      </section>
      <FinalResults state={state} />
      {(mine || (!rematch && me?.isDm)) && (
        <section className="card border-gold p-4 text-center" data-testid="rematch">
          <p className="font-display text-xl font-extrabold">{mine ? '¡Hay revancha!' : '¿Otra partida?'}</p>
          <p className="mt-1 text-sm text-ui-muted">
            {mine ? `Sala ${rematch!.code}: mismo grupo, todos desde nivel 1.` : 'Armá una sala nueva con el mismo grupo, el mismo orden y todos desde nivel 1. Los demás entran con un toque.'}
          </p>
          <button className="btn-go mt-3 w-full" disabled={busy} onClick={() => void go(!mine)} data-testid="rematch-button">
            <RotateCcw aria-hidden className="size-5" /> {mine ? 'Ir a la revancha' : 'Revancha con el mismo grupo'}
          </button>
          {error && <p role="alert" className="mt-2 text-sm font-semibold text-accent-wine">{error}</p>}
        </section>
      )}
      <details className="card group p-4">
        <summary className="cursor-pointer list-none font-bold [&::-webkit-details-marker]:hidden">Ver últimos eventos</summary>
        <div className="mt-2"><EventList events={snap.events} limit={12} /></div>
      </details>
      <Link to="/" className="btn-secondary w-full">Volver al inicio</Link>
    </main>
  );
}
