import { Check } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, type RoomInfo } from '../api';
import { ThemeToggle } from '../components/ThemeToggle';
import { AvatarPicker, type Look } from '../components/Avatar';
import { NoviceSwitch } from '../components/NoviceHelp';
import { RoomProvider } from '../useRoom';
import { RoomApp } from './RoomApp';
import { TvView } from './TvView';

export function RoomGate({ mode }: { mode: 'app' | 'tv' }) {
  const code = (useParams().code ?? '').toUpperCase();
  const [info, setInfo] = useState<RoomInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api.roomInfo(code).then(setInfo).catch((e: ApiError) => setError(e.message));
  }, [code]);
  useEffect(load, [load]);

  if (error)
    return (
      <Shell>
        <p role="alert" className="text-xl font-bold">{error}</p>
        <Link to="/" className="btn-secondary mt-4">Volver al inicio</Link>
      </Shell>
    );
  if (!info) return <Shell><p>Buscando la sala {code}…</p></Shell>;
  if (info.expired) return <Shell><p className="text-xl font-bold">Esta sala venció por inactividad.</p><Link to="/" className="btn-secondary mt-4">Crear otra</Link></Shell>;
  if (!info.hasSession) return <JoinForm code={code} tv={mode === 'tv'} info={info} onJoined={load} />;

  return (
    <RoomProvider code={code}>
      {mode === 'tv' ? <TvView publicUrl={info.publicUrl} /> : <RoomApp publicUrl={info.publicUrl} onRejoin={load} />}
    </RoomProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center p-4 text-center">{children}</main>;
}

function JoinForm({ code, tv, info, onJoined }: { code: string; tv: boolean; info: RoomInfo; onJoined: () => void }) {
  const [name, setName] = useState(tv ? 'Pantalla TV' : '');
  const [role, setRole] = useState<'player' | 'spectator'>(tv ? 'spectator' : 'player');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [look, setLook] = useState<Look>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.join(code, { name: name.trim(), role, ...(role === 'player' ? look : {}) });
      onJoined();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <div className="flex justify-end"><ThemeToggle /></div>
      <form onSubmit={submit} className="card mt-4 space-y-4 p-4">
        <h1 className="text-2xl font-bold">Entrar a la sala <span className="font-black tracking-widest">{code}</span></h1>
        {info.status !== 'lobby' && <p className="chip">La partida ya está en curso: si entrás como jugador, vas al final del orden.</p>}
        <div>
          <label className="label" htmlFor="join-name">Tu nombre</label>
          <input id="join-name" className="input" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <fieldset>
          <legend className="label">¿Cómo participás?</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['player', 'spectator'] as const).map((r) => (
              <label key={r} className={`btn cursor-pointer border-ui-control focus-within:ring-2 focus-within:ring-accent-blue ${role === r ? 'bg-surface-inset text-accent-gold' : 'bg-surface-raised text-ui-fg'}`}>
                <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="sr-only" />
                {role === r && <Check aria-hidden className="size-4 shrink-0" />}
                {r === 'player' ? 'Jugador' : 'Espectador'}
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm">
            {role === 'player' ? 'Vas a tener tu personaje y tus turnos.' : 'Solo mirás: ideal para la TV. No podés modificar nada.'}
          </p>
        </fieldset>
        {role === 'player' && <AvatarPicker avatar={look.avatar} color={look.color} onChange={setLook} idPrefix="join" />}
        {role === 'player' && <NoviceSwitch />}
        {error && <p role="alert" className="font-bold text-accent-wine">{error}</p>}
        <button className="btn-primary w-full" disabled={busy || !name.trim()}>{busy ? 'Entrando…' : 'Entrar'}</button>
        <p className="text-xs">Este navegador te va a recordar mientras conserve su sesión. Si cambiás de navegador o borrás los datos del sitio, vas a entrar como alguien nuevo.</p>
      </form>
    </main>
  );
}
