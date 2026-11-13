import { useState } from 'react';
import { DEFAULT_SETS, displayName } from '../../shared/rules';
import { PresenceDot, QrCode, Section, joinUrl } from '../components/ui';
import { useRoom } from '../useRoom';

export function Lobby({ publicUrl }: { publicUrl: string | null }) {
  const { snap, me, online, send, pending } = useRoom();
  const [copied, setCopied] = useState(false);
  const [extra, setExtra] = useState('');
  if (!snap || !me) return null;
  const { state } = snap;
  const url = joinUrl(snap.code, publicUrl);
  const order = state.turn.order;
  const move = (i: number, d: number) => {
    const next = [...order];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    void send({ type: 'order.set', order: next });
  };
  const spectators = Object.values(state.participants).filter((p) => !p.removed && p.role === 'spectator');
  const allSets = [...new Set([...DEFAULT_SETS, ...state.config.sets])];

  return (
    <div className="space-y-4">
      <Section title="Invitá a la mesa">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <QrCode text={url} />
          <div className="space-y-2 text-center sm:text-left">
            <p>Código de sala</p>
            <p className="text-5xl font-black tracking-[0.2em]" data-testid="lobby-code">{snap.code}</p>
            <p className="break-all text-sm">{url}</p>
            <button
              className="btn-secondary btn-small"
              onClick={() => {
                void navigator.clipboard?.writeText(url).then(() => setCopied(true)).catch(() => setCopied(false));
              }}
            >
              {copied ? '✔ Enlace copiado' : 'Copiar enlace'}
            </button>
            <p className="text-xs">El QR solo lleva a la sala: no da permisos de DM. Cada uno elige Jugador o Espectador al entrar.</p>
          </div>
        </div>
      </Section>

      <Section title="Orden de turnos">
        <ol className="space-y-2" data-testid="order-list">
          {order.map((id, i) => (
            <li key={id} className="flex items-center justify-between gap-2 rounded-lg border-2 border-ink bg-white p-2">
              <span className="flex items-center gap-2">
                <span className="w-6 text-center font-black">{i + 1}.</span>
                <span className="inline-block h-4 w-4 rounded-full border border-ink" style={{ background: state.characters[id]?.color }} aria-hidden />
                <span className="font-bold">{displayName(state, id)}</span>
                {state.participants[id].isDm && <span className="chip">👑 DM</span>}
                <PresenceDot online={online.has(id)} />
              </span>
              {me.isDm && (
                <span className="flex gap-1">
                  <button className="btn-secondary btn-small" aria-label={`Subir a ${displayName(state, id)}`} disabled={pending || i === 0} onClick={() => move(i, -1)}>↑</button>
                  <button className="btn-secondary btn-small" aria-label={`Bajar a ${displayName(state, id)}`} disabled={pending || i === order.length - 1} onClick={() => move(i, 1)}>↓</button>
                </span>
              )}
            </li>
          ))}
        </ol>
        {spectators.length > 0 && <p className="mt-2 text-sm">Espectadores: {spectators.map((s) => s.name).join(', ')}</p>}
        {me.isDm ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-secondary" disabled={pending || order.length < 2} onClick={() => send({ type: 'order.randomize' })}>🎲 Sortear orden</button>
            <button className="btn-go flex-1" disabled={pending || order.length === 0} onClick={() => send({ type: 'game.start' })} data-testid="start-game">¡Empezar partida!</button>
          </div>
        ) : (
          <p className="mt-4 font-bold">Esperando que el DM arranque la partida…</p>
        )}
      </Section>

      <Section title="Conjuntos en juego">
        {me.isDm ? (
          <div className="space-y-2">
            {allSets.map((s) => (
              <label key={s} className="flex items-center gap-2">
                <input type="checkbox" className="h-5 w-5" checked={state.config.sets.includes(s)} disabled={pending} onChange={(e) => send({ type: 'room.updateConfig', sets: e.target.checked ? [...state.config.sets, s] : state.config.sets.filter((x) => x !== s), extraSets: state.config.extraSets })} />
                {s}
              </label>
            ))}
            <div className="flex flex-wrap gap-1">
              {state.config.extraSets.map((s) => (
                <span key={s} className="chip">
                  {s} <span className="text-xs">(reglas a cargo de la mesa)</span>
                  <button aria-label={`Quitar ${s}`} className="px-1 font-black" onClick={() => send({ type: 'room.updateConfig', sets: state.config.sets, extraSets: state.config.extraSets.filter((x) => x !== s) })}>×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Otro conjunto o expansión" aria-label="Otro conjunto" />
              <button className="btn-secondary" disabled={!extra.trim()} onClick={() => { void send({ type: 'room.updateConfig', sets: state.config.sets, extraSets: [...state.config.extraSets, extra.trim()] }); setExtra(''); }}>Agregar</button>
            </div>
          </div>
        ) : (
          <ul className="list-inside list-disc">{[...state.config.sets, ...state.config.extraSets].map((s) => <li key={s}>{s}</li>)}</ul>
        )}
        <p className="mt-2 text-xs">La app mantiene el flujo del juego base. Las excepciones de cada conjunto las resuelve la mesa (y el DM corrige si hace falta).</p>
      </Section>

      <p className="text-center text-xs">
        La sala vence tras {state.config.ttlDays} días sin actividad (hoy: {new Date(snap.expiresAt).toLocaleDateString('es-AR')}). Este navegador te recuerda mientras conserve su sesión.
      </p>
    </div>
  );
}
