import { Pause, Tv } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME, activeParticipantId, displayName } from '../../shared/rules';
import { useRoom } from '../useRoom';
import { ConnectionBadge, Toast } from '../components/ui';
import { ThemeToggle } from '../components/ThemeToggle';
import { Celebration } from '../components/Celebration';
import { PushCard } from '../components/PushCard';
import { SoundEffects, SoundToggle } from '../components/SoundEffects';
import { ReactionFab, ReactionLayer } from '../components/Reactions';
import { CharacterEditor } from './CharacterEditor';
import { DmPanel } from './DmPanel';
import { Finished } from './Finished';
import { HelpInbox } from './HelpInbox';
import { Lobby } from './Lobby';
import { TableView } from './TableView';
import { TurnView } from './TurnView';
import { GameIcon, type GameIconName } from '../components/GameIcon';

type Tab = 'me' | 'turn' | 'table' | 'dm';

function readTab(): Tab | null {
  try {
    return (sessionStorage.getItem('pp-tab') as Tab) || null;
  } catch {
    return null;
  }
}

export function RoomApp({ publicUrl, onRejoin }: { publicUrl: string | null; onRejoin: () => void }) {
  const { snap, me, status, send } = useRoom();
  const [tab, setTab] = useState<Tab>(() => readTab() ?? 'turn');
  useEffect(() => {
    try {
      sessionStorage.setItem('pp-tab', tab);
    } catch {
      /* sin almacenamiento: no pasa nada */
    }
  }, [tab]);

  // Aviso "¡Te toca!": vibra y muestra un cartel cuando el turno pasa a este jugador.
  const activeId = snap ? activeParticipantId(snap.state) : null;
  const myId = me?.id;
  const prevActive = useRef<string | null | undefined>(undefined);
  const [yourTurn, setYourTurn] = useState(false);
  useEffect(() => {
    const prev = prevActive.current;
    prevActive.current = activeId;
    if (prev === undefined || !myId || activeId !== myId || prev === myId || snap?.state.status !== 'active') return;
    setYourTurn(true);
    try {
      navigator.vibrate?.([140, 70, 140]);
    } catch {
      /* sin vibración: no pasa nada */
    }
    const t = window.setTimeout(() => setYourTurn(false), 6000);
    return () => window.clearTimeout(t);
  }, [activeId, myId, snap?.state.status]);

  if (status === 'unauthorized') {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <p className="text-xl font-bold">Tu sesión en esta sala ya no es válida{me?.removed ? ': el DM te quitó de la partida' : ''}.</p>
        <button className="btn-primary mt-4" onClick={onRejoin}>Volver a entrar</button>
      </main>
    );
  }
  if (!snap || !me) return <main className="p-6 text-center" aria-busy>Cargando la partida…</main>;

  const { state } = snap;
  // SoundEffects queda en la misma posición en ambas ramas para no perder el estado anterior (y sonar al ganar).
  const sounds = <SoundEffects snap={snap} myId={me.id} />;
  if (state.status === 'finished') return <>{sounds}<Finished /></>;

  const isPlayer = me.role === 'player';
  const tabs: { id: Tab; label: string; icon: GameIconName }[] = [
    ...(isPlayer ? [{ id: 'me' as Tab, label: 'Mi personaje', icon: 'hero' as GameIconName }] : []),
    { id: 'turn', label: state.status === 'lobby' ? 'Sala' : 'Turno', icon: 'door' as GameIconName },
    { id: 'table', label: 'Mesa', icon: 'table' as GameIconName },
    ...(me.isDm ? [{ id: 'dm' as Tab, label: 'DM', icon: 'dm' as GameIconName }] : []),
  ];
  const current = tabs.some((t) => t.id === tab) ? tab : 'turn';
  const alert = state.levelAlert;

  return (
    <>{sounds}
    <div className="min-h-dvh pb-24">
      <Toast />
      <Celebration state={state} />
      <ReactionLayer state={state} />
      {state.status === 'active' && <ReactionFab />}
      <header className="inverse-surface sticky top-0 z-30 border-b border-white/[.06] bg-[#120d0a]/90 px-3 pb-2.5 pt-[calc(.625rem+env(safe-area-inset-top))] text-parchment-50 backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src="/logo.svg" alt="" width={40} height={40} className="size-10 shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,.4)]" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-base font-extrabold tracking-tight sm:text-lg">{APP_NAME}</span>
              <span className="block text-[11px] font-semibold uppercase tracking-[.14em] text-parchment-100/60">Sala <b className="font-black tracking-[.2em] text-[#f6b64a]" data-testid="room-code">{snap.code}</b></span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-sm sm:inline" data-testid="me-label">
              {displayName(state, me.id)} · {me.isDm ? 'DM' : me.role === 'player' ? 'Jugador' : 'Espectador'}
            </span>
            <ConnectionBadge quiet />
            <SoundToggle />
            <ThemeToggle compact />
          </div>
        </div>
      </header>

      {yourTurn && (
        <div className="fixed inset-x-3 top-16 z-40 mx-auto max-w-md" role="alert" data-testid="your-turn">
          <button
            type="button"
            className="your-turn flex w-full items-center gap-3 rounded-2xl bg-gradient-to-b from-[#f6b64a] to-[#d98a16] p-3 pr-4 text-left text-[#2a1606] shadow-[0_18px_40px_-12px_rgba(240,165,49,.7)]"
            onClick={() => { setTab('turn'); setYourTurn(false); }}
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#2a1606]/10"><GameIcon name="kick" className="size-8" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-xl font-extrabold leading-tight">¡Te toca, {displayName(state, me.id)}!</span>
              <span className="block text-sm font-semibold opacity-80">{current === 'turn' ? 'Andá a patear la puerta.' : 'Tocá para ir a tu turno.'}</span>
            </span>
          </button>
        </div>
      )}

      <main className="mx-auto max-w-4xl space-y-5 p-3 sm:p-5">
        {state.status === 'paused' && (
          <p role="status" className="card border-accent-gold/50 bg-surface-inset p-3 text-center text-lg font-bold text-accent-gold"><Pause aria-hidden className="mr-1 inline size-5" />Partida en pausa</p>
        )}
        {alert && (
          <div role="alert" className="card border-gold p-3" data-testid="level-alert">
            <p className="text-lg font-bold"><GameIcon name="victory" className="mr-1 inline size-5" />{displayName(state, alert.participantId)} figura en nivel {alert.level}.</p>
            <p className="text-sm">La app no declara ganadores sola: según el reglamento, el nivel 10 normalmente se alcanza matando un monstruo. El DM confirma lo que pasó en la mesa.</p>
            {me.isDm && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="btn-go" onClick={() => send({ type: 'levelAlert.confirmWinner' })}>Confirmar victoria</button>
                <button className="btn-secondary" onClick={() => send({ type: 'levelAlert.dismiss' })}>Todavía no gana</button>
              </div>
            )}
          </div>
        )}
        <HelpInbox />
        {isPlayer && !state.config.practice && current !== 'dm' && <PushCard code={snap.code} hideWhenOn={current !== 'me'} />}

        {current === 'me' && isPlayer && <CharacterEditor targetId={me.id} />}
        {current === 'turn' && (state.status === 'lobby' ? <Lobby publicUrl={publicUrl} /> : <TurnView />)}
        {current === 'table' && <TableView />}
        {current === 'dm' && me.isDm && <DmPanel />}

        <p className="pt-4 text-center text-sm">
          <Link className="inline-flex items-center gap-2 underline" to={`/s/${snap.code}/tv`}><Tv aria-hidden className="size-4 shrink-0" /> Abrir vista TV</Link>
        </p>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ui-line/[.08] bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl" aria-label="Secciones">
        <ul className="mx-auto flex max-w-4xl gap-1 px-2 py-1 sm:gap-2 sm:px-4">
          {tabs.map((t) => (
            <li key={t.id} className="flex-1 py-1">
              <button
                className={`group flex min-h-[56px] w-full flex-col items-center justify-center gap-1 text-xs font-bold transition-colors sm:text-sm ${current === t.id ? 'text-accent-brand' : 'text-ui-muted hover:text-ui-fg'}`}
                aria-current={current === t.id ? 'page' : undefined}
                onClick={() => setTab(t.id)}
              >
                <span className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${current === t.id ? 'bg-accent-brand/15' : 'group-hover:bg-surface-raised'}`}>
                  <GameIcon name={t.icon} className="size-6" />
                </span>
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
    </>
  );
}
