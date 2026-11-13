import { ArrowLeft, Maximize, Minimize, Pause, Play, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PHASE_GUIDE } from '../../shared/phases';
import { APP_NAME, activeParticipantId, basePower, displayName, identityLine, upcoming } from '../../shared/rules';
import { Illustration } from '../components/Illustration';
import { ActiveStopwatch } from '../components/Stopwatch';
import { ThemeToggle } from '../components/ThemeToggle';
import { ConnectionBadge, EventList, QrCode, joinUrl } from '../components/ui';
import { useRoom } from '../useRoom';
import { CombatTotalsPanel } from './CombatView';
import { GameIcon } from '../components/GameIcon';
import { Celebration } from '../components/Celebration';
import { Avatar } from '../components/Avatar';
import { FinalResults } from '../components/FinalResults';
import { SoundEffects, SoundToggle } from '../components/SoundEffects';
import { ReactionLayer } from '../components/Reactions';

/** Lienzo mínimo de la vista TV en horizontal. Las teles suelen reportar 960×540: ahí se escala. */
const STAGE_W = 1280;
const STAGE_H = 720;

/**
 * En pantallas horizontales arma un "lienzo" de al menos 1280×720 y lo escala para que entre
 * entero. En teles con navegador de baja resolución todo queda visible sin hacer scroll.
 */
function useTvFit() {
  const read = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const fit = w >= 640 && w > h;
    const scale = fit ? Math.min(1, w / STAGE_W, h / STAGE_H) : 1;
    return { fit, scale, w: w / scale, h: h / scale };
  };
  const [v, setV] = useState(read);
  useEffect(() => {
    const on = () => setV(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return v;
}

/** Vista de solo lectura, diseñada para verse bien tanto en una TV como en móvil. */
export function TvView({ publicUrl }: { publicUrl: string | null }) {
  const { snap, online, status } = useRoom();
  const [full, setFull] = useState(false);
  const stage = useTvFit();
  useEffect(() => {
    if (!stage.fit) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [stage.fit]);
  useEffect(() => {
    const h = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  if (!snap) return <main className="grid min-h-dvh place-items-center bg-ink p-6 text-2xl font-bold text-parchment-50">Conectando con la mesa…</main>;
  const { state } = snap;
  const active = activeParticipantId(state);
  const guide = PHASE_GUIDE[state.turn.phase];
  const next = upcoming(state, 3);
  const players = state.turn.order.map((id) => state.characters[id]).filter(Boolean);

  return (
    <main
      className={`tv-shell inverse-surface min-h-dvh overflow-x-hidden p-3 text-parchment-50 sm:p-5 lg:p-6 ${state.status !== 'lobby' && state.status !== 'finished' ? 'tv-shell-live' : ''} ${stage.fit ? `tv-fit overflow-y-auto${stage.h < 800 ? ' tv-fit-short' : ''}${state.combat ? ' tv-has-combat' : ''}` : ''}`}
      style={stage.fit ? { position: 'fixed', top: 0, left: 0, width: stage.w, height: stage.h, minHeight: 0, transform: stage.scale < 1 ? `scale(${stage.scale})` : undefined, transformOrigin: 'top left' } : undefined}
      data-testid="tv-view"
      data-scale={stage.scale.toFixed(2)}
    >
      <Celebration state={state} big />
      <SoundEffects snap={snap} myId={null} />
      <ReactionLayer state={state} big />
      <header className="tv-header mx-auto flex w-full max-w-[1800px] flex-wrap items-center justify-between gap-3 pb-4 sm:pb-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link to={`/s/${snap.code}`} className="tv-control shrink-0" aria-label="Volver a la partida"><ArrowLeft aria-hidden className="size-4 shrink-0" /> <span className="hidden sm:inline">Volver a la partida</span></Link>
          <span className="h-8 w-px bg-white/15" aria-hidden />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-black tracking-tight sm:text-2xl">{APP_NAME}</p>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-parchment-200/65 sm:text-xs">Vista de mesa</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ConnectionBadge />
          <SoundToggle />
          <ThemeToggle compact />
          <button className="tv-control" onClick={() => (full ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => undefined)} aria-label={full ? 'Salir de pantalla completa' : 'Activar pantalla completa'}>
            {full ? <Minimize aria-hidden className="size-4 shrink-0" /> : <Maximize aria-hidden className="size-4 shrink-0" />}<span className="hidden md:inline">{full ? 'Salir de pantalla completa' : 'Pantalla completa'}</span>
          </button>
        </div>
      </header>

      <div className={`tv-content mx-auto flex w-full max-w-[1800px] flex-col gap-4 sm:gap-6 ${state.status !== 'lobby' && state.status !== 'finished' ? 'tv-content-live' : ''}`}>
        {status !== 'online' && <p role="status" className="tv-connection rounded-2xl border border-gold/50 bg-gold/20 p-3 text-center font-bold text-white">Reconectando… se muestra el último estado conocido.</p>}

        {state.status === 'finished' ? (
          <section className="tv-panel flex min-h-[65dvh] flex-col items-center justify-center gap-4 p-6 text-center sm:p-10" data-testid="tv-finished">
            <p className="text-sm font-black uppercase tracking-[.25em] text-accent-wine">Partida terminada</p>
            <p className="font-display text-4xl font-black sm:text-6xl">{state.winnerId ? `¡${displayName(state, state.winnerId)} gana!` : 'Fin de la partida'}</p>
            <FinalResults state={state} big />
            {state.rematch && (
              <a href={`/s/${state.rematch.code}/tv`} className="btn-primary text-xl" data-testid="tv-rematch">¡Revancha en la sala {state.rematch.code}! Ver en la tele</a>
            )}
          </section>
        ) : state.status === 'lobby' ? (
          <section className="tv-panel grid min-h-[65dvh] items-center gap-8 p-6 text-center md:grid-cols-[1fr_auto] md:p-12 md:text-left">
            <div>
              <p className="text-sm font-black uppercase tracking-[.22em] text-accent-wine">Preparando la aventura</p>
              <h2 className="mt-3 font-display text-4xl font-black leading-tight sm:text-6xl">Esperando que empiece la partida</h2>
              <p className="mt-4 text-lg text-ui-muted">Compartí el código para que se sume el grupo.</p>
              <p className="mt-6 inline-flex rounded-2xl bg-surface-inset px-5 py-3 font-black tracking-[.32em] text-accent-gold sm:text-3xl">{snap.code}</p>
              <p className="mt-5 text-sm text-ui-muted">{players.length} {players.length === 1 ? 'jugador' : 'jugadores'} · {players.map((c) => c.name).join(' · ') || 'aún no hay jugadores'}</p>
            </div>
            <div className="mx-auto rounded-3xl bg-white p-4 shadow-xl"><QrCode text={joinUrl(snap.code, publicUrl)} size={220} /></div>
          </section>
        ) : (
          <>
            <div className="tv-primary">
            <section className="tv-hero grid overflow-hidden rounded-[1.7rem] sm:rounded-[2.2rem] lg:grid-cols-[1.15fr_.85fr]" data-testid="tv-turn">
              <div className="relative z-10 flex min-w-0 flex-col justify-center p-5 sm:p-8 lg:p-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tv-kicker">Turno {state.turn.turnNumber}</span>
                  {state.status === 'paused' && <span className="tv-kicker !bg-[#68410f]"><Pause aria-hidden className="size-3 shrink-0" /> En pausa</span>}
                  <span className="tv-kicker !bg-white/10">{guide.title}</span>
                </div>
                <p className="mt-4 text-xs font-black uppercase tracking-[.26em] text-parchment-100/80 sm:text-sm">Ahora juega</p>
                <div className="mt-1 flex items-center gap-3 sm:gap-5">
                {active && state.characters[active] && <Avatar c={state.characters[active]} size="lg" className="max-sm:!size-14 max-sm:[&_svg]:!size-9" />}
                <h1 className="min-w-0 break-words font-display text-4xl font-black leading-[.98] tracking-tight sm:text-6xl lg:text-[clamp(3rem,5.3vw,6rem)]" data-testid="tv-active">{displayName(state, active)}</h1>
                </div>
                <p className="mt-3 font-display text-xl font-bold leading-tight text-parchment-50 sm:text-2xl" data-testid="tv-phase">{guide.title}</p>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-parchment-50 sm:text-base">{guide.reminder}</p>
                <div className="mt-4 max-w-xl"><ActiveStopwatch state={state} big /></div>
              </div>
              <div className="relative hidden min-h-0 items-center justify-center overflow-hidden bg-gradient-to-br from-blood/35 to-transparent p-5 lg:flex">
                <div aria-hidden className="absolute h-[25rem] w-[25rem] rounded-full border border-parchment-100/10 shadow-[0_0_0_36px_rgba(248,239,217,.025),0_0_0_72px_rgba(248,239,217,.02)]" />
                <div className="relative w-[min(44%,250px)] rotate-3 rounded-2xl border border-white/20 bg-white/10 p-2 shadow-[0_25px_60px_rgba(0,0,0,.35)]"><Illustration name={guide.illustration} className="w-full rounded-xl" /></div>
              </div>
            </section>

            {state.combat && (
              <section className="tv-panel tv-combat-panel border-accent-wine/25 p-3 sm:p-5" data-testid="tv-combat">
                <div className="mb-2 flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blood/10 text-xl" ><GameIcon name="combat" className="size-5 shrink-0" /></span>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[.18em] text-accent-wine">Combate activo</p>
                    <h2 className="truncate font-display text-lg font-black sm:text-2xl">
                      {state.combat.monsters.map((m) => m.name).join(' + ') || 'Monstruo sin cargar'}
                    </h2>
                  </div>
                </div>
                <CombatTotalsPanel state={state} combat={state.combat} big />
              </section>
            )}
            {state.levelAlert && <p className="tv-level-alert rounded-2xl border border-gold/50 bg-[#68410f] p-3 text-center text-base font-black text-white sm:text-xl"><GameIcon name="victory" className="mr-1 inline size-5" />{displayName(state, state.levelAlert.participantId)} llegó a nivel {state.levelAlert.level}. El DM confirma.</p>}
            </div>

            <section className="tv-section tv-roster" data-testid="tv-table">
              <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-parchment-100/80 sm:text-xs">La aventura</p><h2 className="font-display text-2xl font-black sm:text-3xl">La mesa</h2></div><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white">{players.length} {players.length === 1 ? 'jugador' : 'jugadores'}</span></div>
              <ul className="tv-roster-list grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-2">
                {players.map((c) => (
                  <li key={c.id} className={`tv-player ${active === c.id ? 'tv-player-active' : ''}`}>
                    <div className="flex items-center gap-2"><Avatar c={c} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-base font-black sm:text-lg">{active === c.id && <Play aria-hidden className="mr-1 inline size-4 text-[#ffd36a]" />}{c.name}</p><p className="truncate text-xs text-parchment-50/80">{identityLine(c)}</p></div><div className="text-center"><span className="block text-[9px] font-black uppercase tracking-widest text-parchment-50/80">Nivel</span><strong className="font-display text-2xl font-black tabular-nums sm:text-3xl">{c.level}</strong></div></div>
                    <div className="mt-2 flex items-center justify-between border-t border-white/15 pt-2"><span className="inline-flex items-center gap-1 text-xs font-semibold text-parchment-50/80">{online.has(c.id) ? <Wifi aria-hidden className="size-3 shrink-0" /> : <WifiOff aria-hidden className="size-3 shrink-0" />}{online.has(c.id) ? 'En línea' : 'Desconectado'}</span><span className="rounded-lg bg-[#692424] px-2.5 py-1 inline-flex items-center gap-1 text-xs font-black text-white"><GameIcon name="combat" className="size-3 shrink-0" /> Poder {basePower(c)}</span></div>
                  </li>
                ))}
              </ul>
            </section>

            <div className="tv-footer-grid grid gap-3 lg:grid-cols-[1fr_auto]">
              <section className="tv-panel tv-meta-panel p-3 sm:p-4">
                <h2 className="mb-2 font-display text-lg font-black sm:text-xl">Turnos que vienen</h2>
                <ol className="flex flex-wrap gap-2">
                  {next.map((id, i) => (
                    <li key={id} className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-1.5 text-sm font-bold sm:text-base">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-inset text-xs text-accent-gold">{i + 1}</span>
                      {displayName(state, id)}
                    </li>
                  ))}
                </ol>
                <div className="mt-2 border-t border-ui-line/15 pt-2">
                  <h3 className="mb-1 text-xs font-black uppercase tracking-widest text-ui-muted">Últimos eventos</h3>
                  <EventList events={snap.events} limit={2} />
                </div>
              </section>
              <section className="tv-join flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[.06] p-3 sm:gap-4 sm:p-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-white sm:text-xs">Sumate a la mesa</p><p className="mt-1 font-black tracking-[.22em] sm:text-lg" data-testid="tv-code">{snap.code}</p></div><div className="rounded-xl bg-white p-1.5"><QrCode text={joinUrl(snap.code, publicUrl)} size={72} /></div></section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
