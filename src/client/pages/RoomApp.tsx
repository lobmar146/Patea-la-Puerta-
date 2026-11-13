import { Crown, Dices, DoorOpen, Pause, Shield, Trophy, Tv, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME, displayName } from '../../shared/rules';
import { useRoom } from '../useRoom';
import { ConnectionBadge, Toast } from '../components/ui';
import { ThemeToggle } from '../components/ThemeToggle';
import { CharacterEditor } from './CharacterEditor';
import { DmPanel } from './DmPanel';
import { Finished } from './Finished';
import { HelpInbox } from './HelpInbox';
import { Lobby } from './Lobby';
import { TableView } from './TableView';
import { TurnView } from './TurnView';

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
  if (state.status === 'finished') return <Finished />;

  const isPlayer = me.role === 'player';
  const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
    ...(isPlayer ? [{ id: 'me' as Tab, label: 'Mi personaje', icon: Shield }] : []),
    { id: 'turn', label: state.status === 'lobby' ? 'Sala' : 'Turno', icon: DoorOpen },
    { id: 'table', label: 'Mesa', icon: Dices },
    ...(me.isDm ? [{ id: 'dm' as Tab, label: 'DM', icon: Crown }] : []),
  ];
  const current = tabs.some((t) => t.id === tab) ? tab : 'turn';
  const alert = state.levelAlert;

  return (
    <div className="min-h-dvh pb-24">
      <Toast />
      <header className="inverse-surface sticky top-0 z-30 border-b border-white/10 bg-ink/95 px-3 py-3 text-parchment-50 shadow-lg shadow-ink/10 backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
          <div>
            <span className="font-display text-lg font-black tracking-tight sm:text-xl">{APP_NAME}</span>
            <span className="ml-2 inline-flex rounded-lg border border-parchment-50/15 bg-white/10 px-2.5 py-1 text-xs font-black tracking-[.16em] text-parchment-100 sm:text-sm" data-testid="room-code">{snap.code}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-sm sm:inline" data-testid="me-label">
              {displayName(state, me.id)} · {me.isDm ? 'DM' : me.role === 'player' ? 'Jugador' : 'Espectador'}
            </span>
            <ConnectionBadge />
            <ThemeToggle compact />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 p-3 sm:p-5">
        {state.status === 'paused' && (
          <p role="status" className="card border-accent-gold/50 bg-surface-inset p-3 text-center text-lg font-bold text-accent-gold"><Pause aria-hidden className="mr-1 inline size-5" />Partida en pausa</p>
        )}
        {alert && (
          <div role="alert" className="card border-gold p-3" data-testid="level-alert">
            <p className="text-lg font-bold"><Trophy aria-hidden className="mr-1 inline size-5" />{displayName(state, alert.participantId)} figura en nivel {alert.level}.</p>
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

        {current === 'me' && isPlayer && <CharacterEditor targetId={me.id} />}
        {current === 'turn' && (state.status === 'lobby' ? <Lobby publicUrl={publicUrl} /> : <TurnView />)}
        {current === 'table' && <TableView />}
        {current === 'dm' && me.isDm && <DmPanel />}

        <p className="pt-4 text-center text-sm">
          <Link className="inline-flex items-center gap-2 underline" to={`/s/${snap.code}/tv`}><Tv aria-hidden className="size-4 shrink-0" /> Abrir vista TV</Link>
        </p>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ui-line/15 bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(43,29,18,.08)] backdrop-blur-lg" aria-label="Secciones">
        <ul className="mx-auto flex max-w-4xl gap-1 px-2 py-1 sm:gap-2 sm:px-4">
          {tabs.map((t) => (
            <li key={t.id} className="flex-1 py-1">
              <button
                className={`flex min-h-[56px] w-full flex-col items-center justify-center rounded-2xl text-xs font-bold transition-colors sm:text-sm ${current === t.id ? 'bg-blood text-white shadow-md shadow-blood/20' : 'text-ui-muted hover:bg-surface-muted'}`}
                aria-current={current === t.id ? 'page' : undefined}
                onClick={() => setTab(t.id)}
              >
                <t.icon aria-hidden className="mb-1 size-5" />
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
