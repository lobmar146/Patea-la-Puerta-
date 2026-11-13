import { activeParticipantId, basePower } from '../../shared/rules';
import { PresenceDot, Section } from '../components/ui';
import { useRoom } from '../useRoom';

export function TableView() {
  const { snap, online } = useRoom();
  if (!snap) return null;
  const { state } = snap;
  const active = activeParticipantId(state);
  const players = state.turn.order.map((id) => state.characters[id]).filter(Boolean);
  const spectators = Object.values(state.participants).filter((p) => !p.removed && p.role === 'spectator');
  return (
    <Section title="La mesa">
      <ul className="grid gap-3 sm:grid-cols-2" data-testid="table">
        {players.map((c) => {
          const p = state.participants[c.id];
          return (
            <li key={c.id} className={`card overflow-hidden ${active === c.id ? 'ring-4 ring-gold' : ''}`} data-testid={`table-${c.name}`}>
              <div className="h-2" style={{ background: c.color }} />
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-black">
                      {c.name} {p.isDm && <span className="chip">👑 DM</span>} {active === c.id && <span className="chip bg-gold text-white">▶ Su turno</span>}
                    </h3>
                    <PresenceDot online={online.has(c.id)} />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold">NIVEL</div>
                    <div className="text-3xl font-black tabular-nums" data-testid={`level-${c.name}`}>{c.level}</div>
                  </div>
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-1 text-center text-sm">
                  <div><dt>Equipo</dt><dd className="font-bold">{c.gear}</dd></div>
                  <div><dt>Otros</dt><dd className="font-bold">{c.otherMods}</dd></div>
                  <div><dt>Poder</dt><dd className="text-xl font-black" data-testid={`power-${c.name}`}>{basePower(c)}</dd></div>
                </dl>
                <p className="mt-2 text-sm">{c.races.join(', ') || 'Humano'} · {c.classes.join(', ') || 'sin clase'}</p>
                {c.notes && <p className="mt-1 text-sm italic">📝 {c.notes}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      {spectators.length > 0 && (
        <p className="mt-3 text-sm">
          Espectadores: {spectators.map((s) => `${s.name}${online.has(s.id) ? ' (en línea)' : ''}`).join(', ')}
        </p>
      )}
    </Section>
  );
}
