import { Link } from 'react-router-dom';
import { displayName } from '../../shared/rules';
import { EventList } from '../components/ui';
import { ThemeToggle } from '../components/ThemeToggle';
import { FinalResults } from '../components/FinalResults';
import { useRoom } from '../useRoom';

export function Finished() {
  const { snap } = useRoom();
  if (!snap) return null;
  const { state } = snap;
  return (
    <main className="mx-auto max-w-2xl space-y-5 p-4 pb-12" data-testid="finished">
      <div className="flex justify-end"><ThemeToggle /></div>
      <section className="text-center">
        <p className="text-xs font-black uppercase tracking-[.22em] text-ui-muted">Partida terminada</p>
        <h1 className="mt-2 font-display text-4xl font-black sm:text-5xl">{state.winnerId ? `¡${displayName(state, state.winnerId)} gana!` : 'Fin de la partida'}</h1>
        <p className="mt-2 text-ui-muted">Las amistades se reparan con el tiempo. Probablemente.</p>
      </section>
      <FinalResults state={state} />
      <details className="card group p-4">
        <summary className="cursor-pointer list-none font-bold [&::-webkit-details-marker]:hidden">Ver últimos eventos</summary>
        <div className="mt-2"><EventList events={snap.events} limit={12} /></div>
      </details>
      <Link to="/" className="btn-secondary w-full">Volver al inicio</Link>
    </main>
  );
}
