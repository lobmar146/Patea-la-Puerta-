import { displayName } from '../../shared/rules';
import { Illustration } from '../components/Illustration';
import { useRoom } from '../useRoom';

/** Solicitudes de ayuda dirigidas a este dispositivo. Aparece en cualquier pestaña. */
export function HelpInbox() {
  const { snap, me, send, pending } = useRoom();
  const combat = snap?.state.combat;
  if (!snap || !me || !combat) return null;
  const mine = combat.helpRequests.filter((r) => r.toId === me.id && r.status === 'pending');
  if (!mine.length) return null;
  return (
    <>
      {mine.map((r) => (
        <div key={r.id} role="alert" className="card flex items-center gap-3 border-royal p-3" data-testid="help-inbox">
          <Illustration name="help" className="w-16 shrink-0" />
          <div className="flex-1">
            <p className="text-lg font-bold">{displayName(snap.state, r.fromId)} te pide ayuda en el combate.</p>
            <p className="text-sm">El trato (si lo hay) se negocia en la mesa.</p>
            <div className="mt-2 flex gap-2">
              <button className="btn-go" disabled={pending} onClick={() => send({ type: 'help.respond', requestId: r.id, accept: true })}>Acepto ayudar</button>
              <button className="btn-secondary" disabled={pending} onClick={() => send({ type: 'help.respond', requestId: r.id, accept: false })}>Rechazar</button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
