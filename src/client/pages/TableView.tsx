import { Crown, NotebookPen, Play } from 'lucide-react';
import { activeParticipantId, basePower } from '../../shared/rules';
import { PresenceDot, Section } from '../components/ui';
import { PlayerTime } from '../components/Stopwatch';
import { useRoom } from '../useRoom';

export function TableView() {
  const { snap, online } = useRoom();
  if (!snap) return null;
  const { state } = snap;
  const active = activeParticipantId(state);
  const players = state.turn.order.map((id) => state.characters[id]).filter(Boolean);
  const spectators = Object.values(state.participants).filter((p) => !p.removed && p.role === 'spectator');
  return (
    <div className="space-y-4" data-testid="table-screen">
      <div className="inverse-surface rounded-3xl bg-gradient-to-br from-ink via-[#3a261b] to-blood/90 p-5 text-parchment-50 shadow-[0_18px_45px_rgba(43,29,18,.18)] sm:p-7">
        <p className="text-[10px] font-black uppercase tracking-[.24em] text-parchment-50 sm:text-xs">Estado de la aventura</p>
        <div className="mt-2 flex items-end justify-between gap-4"><div><h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">La mesa</h1><p className="mt-1 text-sm text-parchment-50 sm:text-base">Personajes, nivel y poder de combate.</p></div><span className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold">{players.length} {players.length === 1 ? 'jugador' : 'jugadores'}</span></div>
      </div>
      <Section title="Personajes">
      <ul className="grid gap-3 sm:grid-cols-2" data-testid="table">
        {players.map((c) => {
          const p = state.participants[c.id];
          return (
            <li key={c.id} className={`overflow-hidden rounded-2xl border bg-surface-raised shadow-sm transition ${active === c.id ? 'border-accent-gold/70 ring-2 ring-accent-gold/35 shadow-md' : 'border-ui-line/10'}`} data-testid={`table-${c.name}`}>
              <div className="h-1.5" style={{ background: c.color }} />
              <div className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg font-black text-white shadow-inner" style={{ background: c.color }}>{c.name.slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0 flex-1"><h3 className="truncate text-lg font-black tracking-tight sm:text-xl">{c.name}</h3><div className="flex flex-wrap items-center gap-x-2 gap-y-0.5"><PresenceDot online={online.has(c.id)} />{p.isDm && <span className="inline-flex items-center gap-1 text-xs font-bold text-accent-gold"><Crown aria-hidden className="size-3 shrink-0" /> DM</span>}</div></div>
                  <div className="min-w-14 text-center"><span className="block text-[9px] font-black uppercase tracking-widest text-ui-muted">Nivel</span><span className="font-display text-3xl font-black tabular-nums" data-testid={`level-${c.name}`}>{c.level}</span></div>
                </div>
                {active === c.id && <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent-gold/15 px-2.5 py-1 text-xs font-black text-accent-gold"><Play aria-hidden className="size-3 shrink-0" /> Su turno</div>}
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-surface-muted/75 p-2"><span className="block text-[10px] font-bold uppercase tracking-wide text-ui-muted">Equipo</span><b className="text-base">{c.gear}</b></div>
                  <div className="rounded-xl bg-surface-muted/75 p-2"><span className="block text-[10px] font-bold uppercase tracking-wide text-ui-muted">Otros</span><b className="text-base">{c.otherMods}</b></div>
                  <div className="rounded-xl bg-accent-wine/10 p-2"><span className="block text-[10px] font-bold uppercase tracking-wide text-accent-wine">Poder</span><b className="text-lg font-black text-accent-wine" data-testid={`power-${c.name}`}>{basePower(c)}</b></div>
                </div>
                <p className="mt-3 truncate text-sm text-ui-muted">{c.races.join(', ') || 'Humano'} · {c.classes.join(', ') || 'sin clase'}</p>
                <div className="mt-3 border-t border-ui-line/10 pt-2"><PlayerTime state={state} participantId={c.id} /></div>
                {c.notes && <p className="mt-2 rounded-xl bg-surface-muted/70 p-2 text-sm italic"><NotebookPen aria-hidden className="mr-1 inline size-4" />{c.notes}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      </Section>
      {spectators.length > 0 && (
        <p className="rounded-2xl border border-ui-line/10 bg-surface-raised/60 px-4 py-3 text-sm text-ui-muted">
          Espectadores: {spectators.map((s) => `${s.name}${online.has(s.id) ? ' (en línea)' : ''}`).join(', ')}
        </p>
      )}
    </div>
  );
}
