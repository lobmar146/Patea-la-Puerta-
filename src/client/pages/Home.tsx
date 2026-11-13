import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME, DEFAULT_SETS } from '../../shared/rules';
import { api } from '../api';

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
    <main className="mx-auto max-w-3xl space-y-6 p-4 pb-16">
      <header className="pt-6 text-center">
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{APP_NAME}</h1>
        <p className="mt-2 text-lg">La compañera de mesa para tus partidas de Munchkin con cartas físicas. Las puñaladas por la espalda siguen siendo analógicas.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={create} className="card space-y-4 p-4" aria-labelledby="crear">
          <h2 id="crear" className="text-2xl font-bold">Crear partida</h2>
          <p className="text-sm">Quien crea la sala es el Dungeon Master y también juega con su personaje.</p>
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
          {error && <p role="alert" className="font-bold text-blood">{error}</p>}
          <button className="btn-primary w-full" disabled={busy || !name.trim()}>
            {busy ? 'Creando…' : 'Crear partida'}
          </button>
        </form>

        <form onSubmit={join} className="card space-y-4 p-4" aria-labelledby="unirse">
          <h2 id="unirse" className="text-2xl font-bold">Unirse</h2>
          <p className="text-sm">Ingresá el código de la sala o escaneá el QR que muestra el DM.</p>
          <div>
            <label className="label" htmlFor="code">Código de sala</label>
            <input id="code" className="input text-center text-2xl font-black uppercase tracking-[0.3em]" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABC12" autoCapitalize="characters" />
          </div>
          <button className="btn-blue w-full" disabled={!code.trim()}>
            Entrar
          </button>
        </form>
      </div>
      <p className="text-center text-xs text-ink-soft">
        Aplicación de fans, no oficial. Munchkin es una marca de Steve Jackson Games.
      </p>
    </main>
  );
}
