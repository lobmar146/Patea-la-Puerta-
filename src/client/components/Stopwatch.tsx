import { useEffect, useState } from 'react';
import { activeParticipantId, displayName } from '../../shared/rules';
import type { GameState } from '../../shared/types';
import { serverNow } from '../serverClock';
import { GameIcon } from './GameIcon';

function useClockNow(running: boolean) {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setNow(serverNow()), 1000);
    return () => window.clearInterval(interval);
  }, [running]);
  return now;
}

function formatDuration(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function turnElapsed(state: GameState, now: number) {
  const runningMs = state.clock.activeSince ? Math.max(0, now - Date.parse(state.clock.activeSince)) : 0;
  return state.clock.turnElapsedMs + runningMs;
}

export function ActiveStopwatch({ state, big = false }: { state: GameState; big?: boolean }) {
  const now = useClockNow(state.status === 'active' && state.clock.activeSince !== null);
  const activeId = activeParticipantId(state);
  if (!activeId || state.status === 'lobby' || state.status === 'finished') return null;
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl bg-surface-muted px-4 py-2.5 text-ui-fg ring-1 ring-ui-line/[.07] ${big ? 'text-lg' : 'text-sm'}`} data-testid="active-stopwatch">
      <span className="flex min-w-0 items-center gap-2 font-semibold">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-brand/15 text-accent-brand" aria-hidden><GameIcon name="time" className="size-5 shrink-0" /></span>
        <span className="truncate text-ui-muted">Tiempo de {displayName(state, activeId)}{state.status === 'paused' ? ' · en pausa' : ''}</span>
      </span>
      <output className={`shrink-0 font-black tabular-nums tracking-wide ${big ? 'text-3xl sm:text-4xl' : 'text-2xl'}`} aria-label={`Tiempo de turno: ${formatDuration(turnElapsed(state, now))}`}>
        {formatDuration(turnElapsed(state, now))}
      </output>
    </div>
  );
}

/** Reloj chico para el encabezado del turno en el celular (el grande queda para la tele). */
export function TurnTimer({ state }: { state: GameState }) {
  const now = useClockNow(state.status === 'active' && state.clock.activeSince !== null);
  if (state.status === 'lobby' || state.status === 'finished') return null;
  const time = formatDuration(turnElapsed(state, now));
  return (
    <output className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-base font-black tabular-nums ring-1 ring-ui-line/[.07]" aria-label={`Tiempo de turno: ${time}${state.status === 'paused' ? ', en pausa' : ''}`} data-testid="turn-timer">
      <GameIcon name="time" className={`size-4 shrink-0 ${state.status === 'paused' ? 'text-ui-muted' : 'text-accent-brand'}`} />
      {time}
    </output>
  );
}

export function PlayerTime({ state, participantId }: { state: GameState; participantId: string }) {
  const activeId = activeParticipantId(state);
  const running = state.status === 'active' && state.clock.activeSince !== null && activeId === participantId;
  const now = useClockNow(running);
  const total = state.clock.totalsByParticipant[participantId] ?? 0;
  const elapsed = activeId === participantId && state.status !== 'lobby' ? turnElapsed(state, now) : 0;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-ui-muted" data-testid={`player-time-${participantId}`}>
      <GameIcon name="time" className="size-4 shrink-0" /> Tiempo en partida: <b className="tabular-nums">{formatDuration(total + elapsed)}</b>
    </span>
  );
}
