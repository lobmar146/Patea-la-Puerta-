import { Shield, Smartphone, Tv } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME, DEFAULT_SETS } from '../../shared/rules';
import { api } from '../api';
import { Illustration } from '../components/Illustration';
import { ThemeToggle } from '../components/ThemeToggle';
import { GameIcon } from '../components/GameIcon';

export function Home() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [sets, setSets] = useState<string[]>(DEFAULT_SETS);
  const [extra, setExtra] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const extraSets = extra.split(',').map((s) => s.trim()).filter(Boolean);
      const r = await api.createRoom({ name: name.trim(), sets, extraSets });
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
      <header className="inverse-surface relative isolate overflow-hidden rounded-[2rem] px-5 py-7 text-parchment-50 sm:px-9 sm:py-10" style={{ background: 'radial-gradient(ellipse 80% 70% at 100% 0%, rgba(240,165,49,.28), transparent 60%), radial-gradient(ellipse 60% 60% at 0% 100%, rgba(192,42,36,.25), transparent 65%), linear-gradient(160deg, #2a1c14, #140e0b)' }}>
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 sm:gap-8">
          <div className="min-w-0">
            <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-b from-[#f6b64a] to-[#d98a16] text-[#2a1606] shadow-[inset_0_1px_0_rgba(255,255,255,.35),0_10px_24px_-8px_rgba(240,165,49,.7)]" aria-hidden><GameIcon name="door" className="size-7" /></span>
            <h1 className="mt-4 text-[2.6rem] font-extrabold leading-[.95] sm:text-7xl">{APP_NAME}</h1>
            <p className="mt-3 max-w-md text-base leading-snug text-parchment-100/80 sm:text-lg">La app lleva turnos, niveles y combates. Las cartas, los dados y las traiciones quedan en la mesa.</p>
          </div>
          <div className="w-24 rotate-6 rounded-2xl bg-white/10 p-1.5 shadow-[0_24px_40px_-16px_rgba(0,0,0,.8)] ring-1 ring-white/15 sm:w-36">
            <Illustration name="door" className="w-full" />
          </div>
        </div>
        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-parchment-100/75">
          <li className="inline-flex items-center gap-2"><GameIcon name="combat" className="size-4 shrink-0 text-[#f6b64a]" /> Combate en equipo</li>
          <li className="inline-flex items-center gap-2"><Smartphone aria-hidden className="size-4 shrink-0 text-[#f6b64a]" /> Todos sincronizados</li>
          <li className="inline-flex items-center gap-2"><Tv aria-hidden className="size-4 shrink-0 text-[#f6b64a]" /> Vista para la tele</li>
        </ul>
      </header>

      <div className="grid gap-4 md:grid-cols-2 sm:gap-6">
        <form onSubmit={create} className="card space-y-4 p-5 sm:p-6" aria-labelledby="crear">
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
            <input id="dm-name" className="input" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Gonzalo el Implacable" />
          </div>
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

        <form onSubmit={join} className="card space-y-4 p-5 sm:p-6" aria-labelledby="unirse">
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
            <input id="code" className="input text-center text-2xl font-black uppercase tracking-[0.3em]" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABC12" autoCapitalize="characters" />
          </div>
          <button className="btn-blue w-full" disabled={!code.trim()}>
            Entrar
          </button>
        </form>
      </div>
      <p className="text-center text-xs text-ui-muted">
        Aplicación de fans, no oficial. Munchkin es una marca de Steve Jackson Games. Íconos de <a className="underline" href="https://game-icons.net" target="_blank" rel="noreferrer">game-icons.net</a> (Lorc, Delapouite y otros, CC BY 3.0).
      </p>
    </main>
  );
}
