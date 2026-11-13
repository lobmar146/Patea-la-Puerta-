import { Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { basePower, displayName } from '../../shared/rules';
import { EventList } from '../components/ui';
import { ThemeToggle } from '../components/ThemeToggle';
import { useRoom } from '../useRoom';

export function Finished() {
  const { snap } = useRoom();
  if (!snap) return null;
  const { state } = snap;
  const ranking = Object.values(state.characters)
    .filter((c) => !state.participants[c.id]?.removed)
    .sort((a, b) => b.level - a.level);
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4" data-testid="finished">
      <div className="flex justify-end"><ThemeToggle /></div>
      <section className="card p-6 text-center">
        <p className="text-sm font-bold uppercase">Partida terminada</p>
        {state.winnerId && <Trophy aria-hidden className="mx-auto mt-3 size-9 text-accent-gold" />}
        <h1 className="mt-2 text-4xl font-black">{state.winnerId ? `¡${displayName(state, state.winnerId)} gana!` : 'Fin de la partida'}</h1>
        <p className="mt-2">Las amistades se reparan con el tiempo. Probablemente.</p>
      </section>
      <section className="card p-4">
        <h2 className="mb-2 text-xl font-bold">Posiciones finales</h2>
        <ol className="space-y-1">
          {ranking.map((c, i) => (
            <li key={c.id} className="flex justify-between border-b border-ui-line/20 py-1">
              <span>{i + 1}. {c.name}</span>
              <span>Nivel <b>{c.level}</b> · poder {basePower(c)}</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="card p-4">
        <h2 className="mb-2 text-xl font-bold">Últimos eventos</h2>
        <EventList events={snap.events} limit={12} />
      </section>
      <Link to="/" className="btn-secondary w-full">Volver al inicio</Link>
    </main>
  );
}
