import { Shield, Smartphone, Swords, Tv } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME, DEFAULT_SETS } from '../../shared/rules';
import { api } from '../api';
import { Illustration } from '../components/Illustration';
import { ThemeToggle } from '../components/ThemeToggle';

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
      <header className="inverse-surface relative isolate overflow-hidden rounded-[2rem] bg-ink px-5 py-7 text-parchment-50 shadow-[0_20px_60px_rgba(43,29,18,.2)] sm:px-9 sm:py-9">
        <div aria-hidden className="absolute -right-12 -top-24 -z-10 h-80 w-80 rounded-full border-[36px] border-parchment-50/5" />
        <div className="grid items-center gap-4 sm:grid-cols-[1fr_150px] sm:gap-8">
          <div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-parchment-50/20 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[.16em] text-parchment-200">
          <span className="h-2 w-2 rounded-full bg-moss" /> Compañera de mesa · juego presencial
        </div>
        <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">{APP_NAME}</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-parchment-200 sm:text-lg">Turnos, personajes y combate sincronizados en todos los móviles. Las cartas, los dados y las puñaladas por la espalda siguen siendo analógicos.</p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold text-parchment-100 sm:text-sm">
          <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2"><Swords aria-hidden className="size-4 shrink-0" /> Combate en equipo</span>
          <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2"><Smartphone aria-hidden className="size-4 shrink-0" /> Sincronizado</span>
          <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2"><Tv aria-hidden className="size-4 shrink-0" /> Vista para TV</span>
        </div>
          </div>
          <div className="mx-auto hidden w-32 rotate-3 rounded-[1.4rem] border border-white/15 bg-white/10 p-2 shadow-2xl sm:block">
            <Illustration name="door" className="w-full" />
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 sm:gap-6">
        <form onSubmit={create} className="card space-y-4 p-5 sm:p-6" aria-labelledby="crear">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blood/10 text-xl" ><Swords aria-hidden className="size-5 shrink-0" /></span>
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
        Aplicación de fans, no oficial. Munchkin es una marca de Steve Jackson Games.
      </p>
    </main>
  );
}
