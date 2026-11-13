import { ArrowLeft, ChevronRight, GraduationCap, Shield, Smartphone, Tv } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { APP_NAME, DEFAULT_SETS } from '../../shared/rules';
import { api } from '../api';
import { ThemeToggle } from '../components/ThemeToggle';
import { GameIcon } from '../components/GameIcon';
import { InstallApp } from '../components/InstallApp';
import { AvatarPicker, type Look } from '../components/Avatar';

export function Home() {
  const nav = useNavigate();
  // El paso elegido vive en la URL (?modo=crear|unirse) para que "atrás" del celular vuelva a la elección.
  const [params, setParams] = useSearchParams();
  const modo = params.get('modo');
  const mode = modo === 'crear' ? 'create' : modo === 'unirse' ? 'join' : modo === 'practica' ? 'practice' : null;
  const choose = (m: 'crear' | 'unirse' | 'practica') => setParams({ modo: m });
  const back = () => (window.history.state?.idx > 0 ? nav(-1) : setParams({}, { replace: true }));
  const [name, setName] = useState('');
  const [sets, setSets] = useState<string[]>(DEFAULT_SETS);
  const [extra, setExtra] = useState('');
  const [code, setCode] = useState('');
  const [look, setLook] = useState<Look>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const extraSets = extra.split(',').map((s) => s.trim()).filter(Boolean);
      const r = await api.createRoom({ name: name.trim(), sets, extraSets, ...look });
      nav(`/s/${r.code}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function practice(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.practice({ name: name.trim(), ...look });
      nav(`/s/${r.code}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function join(e: FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c) nav(`/s/${c}`);
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 pb-16 sm:p-6">
      <div className="flex justify-end"><ThemeToggle /></div>
      {mode === null && (
      <header className="inverse-surface relative isolate overflow-hidden rounded-[2rem] px-5 py-7 text-parchment-50 sm:px-9 sm:py-10" style={{ background: 'radial-gradient(ellipse 80% 70% at 100% 0%, rgba(240,165,49,.28), transparent 60%), radial-gradient(ellipse 60% 60% at 0% 100%, rgba(192,42,36,.25), transparent 65%), linear-gradient(160deg, #2a1c14, #140e0b)' }}>
        <div>
          <div className="min-w-0">
            <img src="/logo.svg" alt="" width={72} height={72} className="size-[4.5rem] drop-shadow-[0_10px_24px_rgba(0,0,0,.5)]" />
            <h1 className="mt-4 text-[2.6rem] font-extrabold leading-[.95] sm:text-7xl">{APP_NAME}</h1>
            <p className="mt-3 max-w-md text-base leading-snug text-parchment-100/80 sm:text-lg">La app lleva turnos, niveles y combates. Las cartas, los dados y las traiciones quedan en la mesa.</p>
          </div>

        </div>
        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-parchment-100/75">
          <li className="inline-flex items-center gap-2"><GameIcon name="combat" className="size-4 shrink-0 text-[#f6b64a]" /> Combate en equipo</li>
          <li className="inline-flex items-center gap-2"><Smartphone aria-hidden className="size-4 shrink-0 text-[#f6b64a]" /> Todos sincronizados</li>
          <li className="inline-flex items-center gap-2"><Tv aria-hidden className="size-4 shrink-0 text-[#f6b64a]" /> Vista para la tele</li>
        </ul>
        <div className="mt-5"><InstallApp /></div>
      </header>
      )}

      {mode === null && (
        <section aria-label="¿Qué querés hacer?" className="phase-transition grid gap-3 sm:grid-cols-2 sm:gap-4">
          <button type="button" className="choice-card min-h-[8.5rem]" data-testid="home-create" onClick={() => choose('crear')}>
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent-brand/15 text-accent-brand"><GameIcon name="door" className="size-8 shrink-0" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-2xl font-black">Crear partida</span>
              <span className="mt-1 block text-sm text-ui-muted">Armás la sala, sos el DM y también jugás.</span>
            </span>
            <ChevronRight aria-hidden className="size-5 shrink-0 text-ui-muted" />
          </button>
          <button type="button" className="choice-card min-h-[8.5rem]" data-testid="home-join" onClick={() => choose('unirse')}>
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-royal/10"><Shield aria-hidden className="size-7 shrink-0" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-2xl font-black">Unirse a una partida</span>
              <span className="mt-1 block text-sm text-ui-muted">Entrás con el código o el QR que te muestra el DM.</span>
            </span>
            <ChevronRight aria-hidden className="size-5 shrink-0 text-ui-muted" />
          </button>
          <button type="button" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-ui-line/25 px-4 text-sm font-semibold text-ui-muted hover:border-accent-blue hover:text-ui-fg sm:col-span-2" data-testid="home-practice" onClick={() => choose('practica')}>
            <GraduationCap aria-hidden className="size-5 shrink-0 text-accent-blue" /> ¿Primera vez? Probá una partida de práctica
          </button>
        </section>
      )}

      {mode === 'practice' && (
        <div className="phase-transition mx-auto max-w-xl">
          <form onSubmit={practice} className="card space-y-4 p-5 sm:p-6" aria-labelledby="practica">
            <button type="button" className="btn-secondary btn-small" onClick={back}><ArrowLeft aria-hidden className="size-4 shrink-0" /> Volver</button>
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-blue/15 text-accent-blue"><GraduationCap aria-hidden className="size-5 shrink-0" /></span>
              <div>
                <h2 id="practica" className="text-2xl font-bold">Partida de práctica</h2>
                <p className="mt-1 text-sm text-ui-muted">Para aprender a usar la app antes de juntarte.</p>
              </div>
            </div>
            <ul className="list-disc space-y-1 rounded-xl bg-surface-muted p-3 pl-8 text-sm">
              <li>Jugás con dos personajes de mentira, Grog y Lía. Sus turnos los manejás vos.</li>
              <li>Los consejos del modo novato te guían en cada paso.</li>
              <li>No necesitás cartas: inventá monstruos y números para probar. La sala se borra sola en un día.</li>
            </ul>
            <div>
              <label className="label" htmlFor="practice-name">Tu nombre</label>
              <input id="practice-name" className="input" autoFocus required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Novata valiente" />
            </div>
            <AvatarPicker avatar={look.avatar} color={look.color} onChange={setLook} idPrefix="practice" />
            {error && <p role="alert" className="font-bold text-accent-wine">{error}</p>}
            <button className="btn-blue w-full" disabled={busy || !name.trim()}>{busy ? 'Preparando…' : 'Empezar práctica'}</button>
          </form>
        </div>
      )}

      {mode === 'create' && (
        <div className="phase-transition mx-auto max-w-xl">
          <form onSubmit={create} className="card space-y-4 p-5 sm:p-6" aria-labelledby="crear">
            <button type="button" className="btn-secondary btn-small" onClick={back}><ArrowLeft aria-hidden className="size-4 shrink-0" /> Volver</button>
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-brand/15 text-accent-brand"><GameIcon name="combat" className="size-5 shrink-0" /></span>
              <div>
                <h2 id="crear" className="text-2xl font-bold">Crear partida</h2>
                <p className="mt-1 text-sm text-ui-muted">Prepará una sala nueva para tu grupo.</p>
              </div>
            </div>
            <p className="rounded-xl bg-surface-muted p-3 text-sm">Quien crea la sala será Dungeon Master y también jugará con su personaje.</p>
            <div>
              <label className="label" htmlFor="dm-name">Tu nombre</label>
              <input id="dm-name" className="input" autoFocus required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Gonzalo el Implacable" />
            </div>
            <AvatarPicker avatar={look.avatar} color={look.color} onChange={setLook} idPrefix="create" />
            <fieldset>
              <legend className="label">Conjuntos en juego</legend>
              {DEFAULT_SETS.map((s) => (
                <label key={s} className="flex items-center gap-2 py-1">
                  <input type="checkbox" className="h-5 w-5" checked={sets.includes(s)} onChange={(e) => setSets(e.target.checked ? [...sets, s] : sets.filter((x) => x !== s))} />
                  {s}
                </label>
              ))}
              <label className="label mt-2" htmlFor="extra-sets">Otros conjuntos (separados por coma)</label>
              <input id="extra-sets" className="input" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Opcional: sus reglas quedan a cargo de la mesa" />
            </fieldset>
            {error && <p role="alert" className="font-bold text-accent-wine">{error}</p>}
            <button className="btn-primary w-full" disabled={busy || !name.trim()}>
              {busy ? 'Creando…' : 'Crear partida'}
            </button>
          </form>
        </div>
      )}

      {mode === 'join' && (
        <div className="phase-transition mx-auto max-w-xl">
          <form onSubmit={join} className="card space-y-4 p-5 sm:p-6" aria-labelledby="unirse">
            <button type="button" className="btn-secondary btn-small" onClick={back}><ArrowLeft aria-hidden className="size-4 shrink-0" /> Volver</button>
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-royal/10 text-xl" ><Shield aria-hidden className="size-5 shrink-0" /></span>
              <div>
                <h2 id="unirse" className="text-2xl font-bold">Unirse a una partida</h2>
                <p className="mt-1 text-sm text-ui-muted">Volvé a la aventura con el código de sala.</p>
              </div>
            </div>
            <p className="text-sm">También podés escanear el QR que muestra el DM.</p>
            <div>
              <label className="label" htmlFor="code">Código de sala</label>
              <input id="code" autoFocus className="input text-center text-2xl font-black uppercase tracking-[0.3em]" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABC12" autoCapitalize="characters" />
            </div>
            <button className="btn-blue w-full" disabled={!code.trim()}>
              Entrar
            </button>
          </form>
        </div>
      )}
      <p className="text-center text-xs text-ui-muted">
        Aplicación de fans, no oficial. Munchkin es una marca de Steve Jackson Games. Íconos de <a className="underline" href="https://game-icons.net" target="_blank" rel="noreferrer">game-icons.net</a> (Lorc, Delapouite y otros, CC BY 3.0).
      </p>
    </main>
  );
}
