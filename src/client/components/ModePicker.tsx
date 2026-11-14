import { GAME_MODES, MODE_INFO } from '../../shared/modes';
import type { GameMode } from '../../shared/types';

/** Selector del modo de juego al crear la sala. */
export function ModePicker({ value, onChange }: { value: GameMode; onChange: (m: GameMode) => void }) {
  const info = MODE_INFO[value];
  return (
    <fieldset data-testid="mode-picker">
      <legend className="label">Modo de juego</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {GAME_MODES.map((m) => (
          <label
            key={m}
            className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border-2 p-3 transition-colors ${value === m ? 'border-accent-brand bg-accent-brand/10' : 'border-ui-line/25 hover:border-ui-line/50'}`}
          >
            <input type="radio" name="game-mode" className="mt-1 h-5 w-5 shrink-0" value={m} checked={value === m} onChange={() => onChange(m)} data-testid={`mode-${m}`} />
            <span className="min-w-0">
              <span className="block font-extrabold">{MODE_INFO[m].label}</span>
              <span className="block text-sm text-ui-muted">{MODE_INFO[m].short}</span>
            </span>
          </label>
        ))}
      </div>
      <ul className="mt-2 list-disc space-y-1 rounded-xl bg-surface-muted p-3 pl-8 text-sm" aria-live="polite">
        {info.rules.map((r) => <li key={r}>{r}</li>)}
      </ul>
    </fieldset>
  );
}
