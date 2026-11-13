import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME, displayName } from '../../shared/rules';
import { useRoom } from '../useRoom';
import { ConnectionBadge, Toast } from '../components/ui';
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
  const tabs: { id: Tab; label: string; icon: string }[] = [
    ...(isPlayer ? [{ id: 'me' as Tab, label: 'Mi personaje', icon: '🛡' }] : []),
    { id: 'turn', label: state.status === 'lobby' ? 'Sala' : 'Turno', icon: '🚪' },
    { id: 'table', label: 'Mesa', icon: '🎲' },
    ...(me.isDm ? [{ id: 'dm' as Tab, label: 'DM', icon: '👑' }] : []),
  ];
  const current = tabs.some((t) => t.id === tab) ? tab : 'turn';
  const alert = state.levelAlert;

  return (
    <div className="min-h-dvh pb-24">
      <Toast />
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-ink px-3 py-2 text-parchment-50">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
          <div>
            <span className="font-display text-lg font-black">{APP_NAME}</span>
            <span className="ml-2 rounded bg-parchment-50 px-2 font-black tracking-widest text-ink" data-testid="room-code">{snap.code}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm sm:inline" data-testid="me-label">
              {displayName(state, me.id)} · {me.isDm ? 'DM' : me.role === 'player' ? 'Jugador' : 'Espectador'}
            </span>
            <ConnectionBadge />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-3">
        {state.status === 'paused' && (
          <p role="status" className="card bg-gold p-3 text-center text-lg font-bold text-white">⏸ Partida en pausa</p>
        )}
        {alert && (
          <div role="alert" className="card border-gold p-3" data-testid="level-alert">
            <p className="text-lg font-bold">🏆 {displayName(state, alert.participantId)} figura en nivel {alert.level}.</p>
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
          <Link className="underline" to={`/s/${snap.code}/tv`}>Abrir vista TV</Link>
        </p>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-parchment-50 pb-[env(safe-area-inset-bottom)]" aria-label="Secciones">
        <ul className="mx-auto flex max-w-3xl">
          {tabs.map((t) => (
            <li key={t.id} className="flex-1">
              <button
                className={`flex min-h-[60px] w-full flex-col items-center justify-center text-sm font-bold ${current === t.id ? 'bg-ink text-parchment-50' : ''}`}
                aria-current={current === t.id ? 'page' : undefined}
                onClick={() => setTab(t.id)}
              >
                <span aria-hidden className="text-xl">{t.icon}</span>
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
