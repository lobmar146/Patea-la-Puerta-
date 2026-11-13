import { Check } from 'lucide-react';
import { AVATARS, COLORS, avatarOf, type AvatarId } from '../../shared/rules';
import type { Character } from '../../shared/types';
import { AVATAR_SVG } from './avatarIcons';

const SIZES = {
  xs: 'size-7 rounded-lg [&_svg]:size-5',
  sm: 'size-11 rounded-2xl [&_svg]:size-7',
  md: 'size-14 rounded-2xl [&_svg]:size-9',
  lg: 'size-20 rounded-3xl [&_svg]:size-14',
  xl: 'size-28 rounded-[2rem] [&_svg]:size-20',
} as const;

export function AvatarIcon({ id, className = 'size-6' }: { id: AvatarId; className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden className={`shrink-0 ${className}`}>
      <g dangerouslySetInnerHTML={{ __html: AVATAR_SVG[id] }} />
    </svg>
  );
}

/** Retrato del personaje: su avatar sobre su color. */
export function Avatar({ c, size = 'sm', className = '' }: { c: Pick<Character, 'id' | 'avatar' | 'color' | 'name'>; size?: keyof typeof SIZES; className?: string }) {
  const id = avatarOf(c);
  return (
    <span
      className={`grid shrink-0 place-items-center text-white shadow-[inset_0_-3px_0_rgba(0,0,0,.22),inset_0_1px_0_rgba(255,255,255,.18)] ${SIZES[size]} ${className}`}
      style={{ background: c.color }}
      role="img"
      aria-label={`Avatar de ${c.name}: ${AVATARS.find((a) => a.id === id)?.label ?? ''}`}
      data-avatar={id}
    >
      <AvatarIcon id={id} />
    </span>
  );
}

/** Selector de avatar y color. Controlado: no guarda nada por su cuenta. */
export interface Look {
  avatar?: AvatarId;
  color?: string;
}

/** Selector de avatar y color. Controlado: no guarda nada. Sin elección, el servidor asigna uno libre. */
export function AvatarPicker({ avatar, color, onChange, disabled, idPrefix = 'av' }: { avatar?: AvatarId; color?: string; onChange: (v: Look) => void; disabled?: boolean; idPrefix?: string }) {
  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="label">Tu avatar{!avatar && <span className="font-normal"> · si no elegís, te toca uno libre</span>}</legend>
        <div className="grid grid-cols-6 gap-1.5" data-testid={`${idPrefix}-avatars`}>
          {AVATARS.map((a) => {
            const on = a.id === avatar;
            return (
              <button
                key={a.id}
                type="button"
                disabled={disabled}
                aria-label={a.label}
                aria-pressed={on}
                title={a.label}
                className={`grid aspect-square min-h-11 place-items-center rounded-xl border-2 transition ${on ? 'border-accent-brand text-white' : 'border-transparent bg-surface-muted text-ui-muted hover:text-ui-fg'}`}
                style={on ? { background: color ?? '#9b1c1c' } : undefined}
                onClick={() => onChange({ avatar: a.id, color })}
              >
                <AvatarIcon id={a.id} className="size-[70%]" />
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Tu color</legend>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((col) => (
            <button
              key={col}
              type="button"
              disabled={disabled}
              aria-label={`Color ${col}${col === color ? ' (elegido)' : ''}`}
              aria-pressed={col === color}
              className={`grid size-11 place-items-center rounded-full border-2 border-ui-line/30 ${col === color ? 'ring-4 ring-ui-fg ring-offset-2 ring-offset-surface' : ''}`}
              style={{ background: col }}
              onClick={() => onChange({ avatar, color: col })}
            >
              {col === color && <Check aria-hidden className="size-5 text-white" />}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
