import { activeParticipantId } from '../shared/rules';
import type { Snapshot } from '../shared/types';

export type SoundName = 'door' | 'level' | 'victory' | 'boo' | 'win' | 'turn' | 'pop';

/**
 * Elige el sonido que corresponde a lo que acaba de pasar. Pura para poder probarla.
 * `prev` es el snapshot anterior que vio este dispositivo.
 */
export function soundFor(prev: Snapshot, next: Snapshot, myId: string | null): SoundName | null {
  const seen = prev.events[0]?.id ?? 0;
  const fresh = next.events.filter((e) => e.id > seen).map((e) => e.type);
  if (fresh.includes('game.end')) return 'win';
  if (fresh.includes('combat.victory')) return 'victory';
  if (fresh.includes('combat.flee')) return 'boo';
  const s0 = prev.state;
  const s1 = next.state;
  const leveled = Object.values(s1.characters).some((c) => c.level > (s0.characters[c.id]?.level ?? c.level));
  if (leveled) return 'level';
  if (s1.turn.phase === 'kickDoor' && s0.turn.phase !== 'kickDoor') return 'door';
  const active = activeParticipantId(s1);
  if (myId && active === myId && activeParticipantId(s0) !== myId && s1.status === 'active') return 'turn';
  return null;
}

