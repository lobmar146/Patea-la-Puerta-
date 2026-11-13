import { useEffect, useState } from 'react';
import { PHASE_GUIDE } from '../../shared/phases';
import { APP_NAME, activeParticipantId, basePower, displayName, upcoming } from '../../shared/rules';
import { Illustration } from '../components/Illustration';
import { ConnectionBadge, EventList, QrCode, joinUrl } from '../components/ui';
import { useRoom } from '../useRoom';
import { CombatTotalsPanel } from './CombatView';

/** Vista de solo lectura para TV (1920x1080, se adapta a otras resoluciones). */
export function TvView({ publicUrl }: { publicUrl: string | null }) {
  const { snap, online, status } = useRoom();
  const [full, setFull] = useState(false);
  useEffect(() => {
    const h = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  if (!snap) return <main className="flex min-h-dvh items-center justify-center text-4xl">Conectando con la mesa…</main>;
  const { state } = snap;
  const active = activeParticipantId(state);
  const guide = PHASE_GUIDE[state.turn.phase];
  const next = upcoming(state, 3);
  const players = state.turn.order.map((id) => state.characters[id]).filter(Boolean);

  return (
    <main className="flex min-h-dvh flex-col gap-[1.2vw] bg-parchment-100 p-[1.5vw] text-[1.1vw] max-lg:text-base" data-testid="tv-view">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-display text-[2.2vw] font-black max-lg:text-2xl">{APP_NAME}</h1>
        <div className="flex items-center gap-3">
          <ConnectionBadge big />
          <button className="btn-secondary" onClick={() => (full ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => undefined)}>
            {full ? 'Salir de pantalla completa' : '⛶ Pantalla completa'}
          </button>
        </div>
      </header>
      {status !== 'online' && <p role="status" className="card bg-gold p-2 text-center text-[1.6vw] font-bold text-white">Reconectando… se muestra el último estado conocido.</p>}

      {state.status === 'finished' ? (
        <section className="card flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center" data-testid="tv-finished">
          <p className="text-[2vw] font-bold uppercase max-lg:text-2xl">Partida terminada</p>
          <p className="text-[5vw] font-black max-lg:text-5xl">{state.winnerId ? `🏆 ¡${displayName(state, state.winnerId)} gana!` : 'Fin de la partida'}</p>
        </section>
      ) : state.status === 'lobby' ? (
        <section className="card flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
          <p className="text-[2.5vw] font-bold max-lg:text-3xl">Esperando que empiece la partida</p>
          <p className="text-[6vw] font-black tracking-[0.3em] max-lg:text-6xl">{snap.code}</p>
          <QrCode text={joinUrl(snap.code, publicUrl)} size={260} />
          <p className="text-[1.6vw] max-lg:text-xl">Jugadores: {players.map((c) => c.name).join(', ') || '—'}</p>
        </section>
      ) : (
        <div className="grid flex-1 grid-cols-[1.25fr_1fr] gap-[1.2vw] max-lg:grid-cols-1">
          <div className="flex flex-col gap-[1.2vw]">
            <section className="card flex items-center gap-[1.5vw] p-[1.2vw]" data-testid="tv-turn">
              <Illustration name={guide.illustration} className="w-[9vw] shrink-0 max-lg:w-24" />
              <div>
                <p className="text-[1.4vw] font-bold uppercase max-lg:text-base">{state.status === 'paused' ? '⏸ En pausa · ' : ''}Turno {state.turn.turnNumber}</p>
                <p className="text-[4vw] font-black leading-none max-lg:text-4xl" data-testid="tv-active">▶ {displayName(state, active)}</p>
                <p className="mt-2 text-[2.4vw] font-bold max-lg:text-2xl" data-testid="tv-phase">{guide.title}</p>
                <p className="text-[1.4vw] max-lg:text-base">{guide.reminder}</p>
              </div>
            </section>
            {state.combat && (
              <section className="card border-blood p-[1.2vw]" data-testid="tv-combat">
                <h2 className="mb-2 text-[2vw] font-black max-lg:text-2xl">⚔ Combate: {state.combat.monsters.map((m) => m.name).join(', ') || 'monstruo sin cargar'}</h2>
                <CombatTotalsPanel state={state} combat={state.combat} big />
              </section>
            )}
            {state.levelAlert && (
              <p className="card bg-gold p-3 text-[2vw] font-bold text-white">🏆 {displayName(state, state.levelAlert.participantId)} llegó a nivel {state.levelAlert.level}. El DM confirma.</p>
            )}
            <section className="card p-[1.2vw]">
              <h2 className="text-[1.6vw] font-bold max-lg:text-xl">Últimos eventos</h2>
              <EventList events={snap.events} limit={4} big />
            </section>
          </div>
          <div className="flex flex-col gap-[1.2vw]">
            <section className="card p-[1.2vw]">
              <table className="w-full text-left" data-testid="tv-table">
                <thead>
                  <tr className="text-[1.3vw] max-lg:text-sm"><th>Personaje</th><th className="text-center">Nivel</th><th className="text-center">Poder</th></tr>
                </thead>
                <tbody>
                  {players.map((c) => (
                    <tr key={c.id} className={`border-t-2 border-parchment-300 ${active === c.id ? 'bg-gold/20' : ''}`}>
                      <td className="py-[0.5vw]">
                        <span className="mr-2 inline-block h-[1.4vw] w-[1.4vw] rounded-full border-2 border-ink align-middle max-lg:h-4 max-lg:w-4" style={{ background: c.color }} aria-hidden />
                        <span className="text-[2vw] font-bold max-lg:text-xl">{active === c.id ? '▶ ' : ''}{c.name}</span>
                        {!online.has(c.id) && <span className="ml-2 text-[1vw] max-lg:text-xs">(desconectado)</span>}
                        <div className="text-[1.1vw] max-lg:text-xs">{[...c.races, ...c.classes].join(' · ') || 'Humano sin clase'}</div>
                      </td>
                      <td className="text-center text-[3vw] font-black tabular-nums max-lg:text-3xl">{c.level}</td>
                      <td className="text-center text-[2.4vw] font-bold tabular-nums max-lg:text-2xl">{basePower(c)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="card p-[1.2vw]">
              <h2 className="text-[1.6vw] font-bold max-lg:text-xl">Próximos turnos</h2>
              <ol className="mt-1 flex flex-wrap gap-3 text-[1.8vw] max-lg:text-lg">
                {next.map((id, i) => <li key={id}>{i + 1}. {displayName(state, id)}</li>)}
              </ol>
            </section>
            <section className="mt-auto flex items-center justify-end gap-3 opacity-80">
              <span className="text-[1.2vw] max-lg:text-sm">Sumate: <b className="tracking-widest">{snap.code}</b></span>
              <QrCode text={joinUrl(snap.code, publicUrl)} size={90} />
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
