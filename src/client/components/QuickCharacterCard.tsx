import { Check, Minus, Plus, SlidersHorizontal, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CharacterPatch } from '../../shared/commands';
import { undoFor } from '../../shared/engine';
import { CLASS_SUGGESTIONS, RACE_SUGGESTIONS, SEX_LABEL, SEX_SYMBOL } from '../../shared/rules';
import type { Character, Sex } from '../../shared/types';
import { CharacterEditor } from '../pages/CharacterEditor';
import { useRoom } from '../useRoom';
import { Avatar } from './Avatar';
import { Modal } from './Modal';

/**
 * Valor optimista: cada toque suma sobre lo último que tocó el DM, aunque el servidor
 * todavía no haya confirmado el anterior. Cuando no queda nada en vuelo, manda el servidor.
 */
function useOptimistic(server: number) {
  const [local, setLocal] = useState(server);
  const inflight = useRef(0);
  const latest = useRef(server);
  latest.current = server;
  useEffect(() => {
    if (inflight.current === 0) setLocal(server);
  }, [server]);
  const run = (next: number, send: () => Promise<{ ok: boolean }>) => {
    setLocal(next);
    inflight.current++;
    // Si sale bien, el snapshot que llega después confirma el valor (puede llegar antes o después del ok).
    // Si falla, vuelve a lo que dice el servidor.
    void send()
      .then((res) => res.ok, () => false)
      .then((ok) => {
        inflight.current--;
        if (inflight.current === 0 && !ok) setLocal(latest.current);
      });
  };
  return [local, run] as const;
}

function BigStepper({ label, short, value, min = -99, max = 999, signed, onChange, disabled, hint, testId }: {
  label: string;
  short: string;
  value: number;
  min?: number;
  max?: number;
  signed?: boolean;
  onChange: (v: number) => void;
  disabled?: boolean;
  hint?: string;
  testId: string;
}) {
  const btn = 'grid size-14 shrink-0 place-items-center rounded-2xl border border-ui-line/[.14] bg-surface-raised text-ui-fg shadow-sm transition active:scale-90 disabled:opacity-35 touch-manipulation';
  return (
    <div className="flex items-center gap-2" data-testid={testId}>
      <button type="button" className={btn} aria-label={`Restar 1 a ${label}`} disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
        <Minus aria-hidden className="size-7" strokeWidth={3} />
      </button>
      <div className="min-w-0 flex-1 text-center leading-none">
        <span className="block text-[11px] font-black uppercase tracking-[.14em] text-ui-muted">{short}</span>
        <output className="mt-1 block font-display text-3xl font-black tabular-nums" aria-label={label} data-testid={`${testId}-value`}>
          {signed && value > 0 ? '+' : ''}{value}
        </output>
        {hint && <span className="mt-0.5 block truncate text-[10px] font-semibold text-ui-muted">{hint}</span>}
      </div>
      <button type="button" className={btn} aria-label={`Sumar 1 a ${label}`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        <Plus aria-hidden className="size-7" strokeWidth={3} />
      </button>
    </div>
  );
}

/** Elegir raza o clase con botones grandes. Un toque reemplaza; "Dos a la vez" permite sumar (Mestizo, Súper Munchkin). */
function TagPicker({ open, onClose, kind, values, onChange }: {
  open: boolean;
  onClose: () => void;
  kind: 'races' | 'classes';
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [multi, setMulti] = useState(values.length > 1);
  const [custom, setCustom] = useState('');
  useEffect(() => {
    if (open) {
      setMulti(values.length > 1);
      setCustom('');
    }
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const suggestions = kind === 'races' ? RACE_SUGGESTIONS : CLASS_SUGGESTIONS;
  const options = [...suggestions, ...values.filter((v) => !suggestions.includes(v))];
  const noun = kind === 'races' ? 'raza' : 'clase';
  const pick = (v: string) => {
    if (multi) {
      onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v].slice(0, 6));
    } else {
      onChange(values.length === 1 && values[0] === v ? [] : [v]);
      onClose();
    }
  };
  const addCustom = () => {
    const t = custom.trim();
    if (!t) return;
    pick(t);
    setCustom('');
  };
  const tile = (on: boolean) =>
    `flex min-h-16 items-center justify-center gap-2 rounded-2xl border-2 px-2 text-lg font-black transition active:scale-95 touch-manipulation ${on ? 'border-accent-brand bg-accent-brand/15 text-accent-brand' : 'border-ui-line/[.12] bg-surface-raised'}`;
  return (
    <Modal open={open} title={kind === 'races' ? 'Raza' : 'Clase'} onClose={onClose} testId={`quick-${kind}-picker`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button type="button" className={tile(values.length === 0)} onClick={() => { onChange([]); onClose(); }}>
          {values.length === 0 && <Check aria-hidden className="size-5" />}{kind === 'races' ? 'Humano' : 'Sin clase'}
        </button>
        {options.map((o) => (
          <button key={o} type="button" className={tile(values.includes(o))} aria-pressed={values.includes(o)} onClick={() => pick(o)}>
            {values.includes(o) && <Check aria-hidden className="size-5" />}{o}
          </button>
        ))}
      </div>
      <label className="mt-4 flex min-h-12 items-center gap-3 text-sm font-semibold">
        <input type="checkbox" className="size-6" checked={multi} onChange={(e) => setMulti(e.target.checked)} />
        Dos a la vez (Mestizo / Súper Munchkin)
      </label>
      <div className="mt-2 flex gap-2">
        <input className="input" maxLength={30} value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())} placeholder={`Otra ${noun} (escribirla)`} aria-label={`Escribir ${noun}`} />
        <button type="button" className="btn-secondary" disabled={!custom.trim()} onClick={addCustom}>Poner</button>
      </div>
      {multi && <button type="button" className="btn-primary mt-4 w-full" onClick={onClose}>Listo</button>}
    </Modal>
  );
}

/** Ficha del DM: todo lo que cambia en una partida, a un toque, sin elegir de una lista. */
export function QuickCharacterCard({ c, active, badge }: { c: Character; active: boolean; badge?: string }) {
  const { snap, send } = useRoom();
  const [level, runLevel] = useOptimistic(c.level);
  const [gear, runGear] = useOptimistic(c.gear);
  const [mods, runMods] = useOptimistic(c.otherMods);
  const [picker, setPicker] = useState<'races' | 'classes' | null>(null);
  const [more, setMore] = useState(false);
  if (!snap) return null;

  const patch = (p: CharacterPatch) => send({ type: 'character.update', targetId: c.id, patch: p });
  const hasItems = !!c.items?.length;
  const power = level + gear + mods;
  const undo = undoFor(snap.state, c.id);
  const pill = 'flex min-h-14 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 px-2 text-base font-black transition active:scale-95 touch-manipulation';

  return (
    <article id={`dm-char-${c.id}`} aria-label={`Personaje ${c.name}`} data-testid="dm-char" className={`card relative scroll-mt-20 overflow-hidden p-3 sm:p-4 ${active ? 'ring-2 ring-accent-brand' : ''}`}>
      <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: c.color }} />
      <header className="flex items-center gap-3 pl-1.5">
        <Avatar c={c} size="sm" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-2xl font-black leading-tight">{c.name}</h3>
          {badge && <span className="inline-block rounded-full bg-accent-brand px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-white" data-testid="quick-badge">{badge}</span>}
        </div>
        <div className="shrink-0 rounded-2xl bg-gradient-to-b from-[#f6b64a] to-[#d98a16] px-3 py-1 text-center text-[#2a1606]">
          <span className="block text-[9px] font-black uppercase tracking-[.16em]">Poder</span>
          <b className="block font-display text-3xl font-black leading-none tabular-nums" data-testid="quick-power">{power}</b>
        </div>
      </header>

      <div className="mt-3 space-y-2">
        <BigStepper label="Nivel" short="Nivel" testId="quick-level" value={level} min={1} max={99} onChange={(v) => runLevel(v, () => patch({ level: v }))} />
        <BigStepper
          label="Equipo"
          short="Equipo"
          testId="quick-gear"
          signed
          value={gear}
          disabled={hasItems}
          hint={hasItems ? 'Se calcula con los objetos (Más)' : undefined}
          onChange={(v) => runGear(v, () => patch({ gear: v }))}
        />
        <BigStepper label="Otros bonus" short="Otros bonus" testId="quick-mods" signed value={mods} onChange={(v) => runMods(v, () => patch({ otherMods: v }))} />
      </div>

      <div className="mt-3 flex gap-2" role="group" aria-label="Sexo">
        {(['male', 'female'] as Sex[]).map((s) => (
          <button key={s} type="button" aria-pressed={c.sex === s} className={`${pill} ${c.sex === s ? 'border-accent-brand bg-accent-brand/15 text-accent-brand' : 'border-ui-line/[.12] bg-surface-raised'}`} onClick={() => c.sex !== s && void patch({ sex: s })}>
            <span aria-hidden className="text-2xl leading-none">{SEX_SYMBOL[s]}</span>{SEX_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <button type="button" className={`${pill} border-ui-line/[.12] bg-surface-raised flex-col !gap-0`} onClick={() => setPicker('races')} data-testid="quick-races">
          <span className="text-[10px] uppercase tracking-[.14em] text-ui-muted">Raza</span>
          <span className="max-w-full truncate">{c.races.join(' + ') || 'Humano'}</span>
        </button>
        <button type="button" className={`${pill} border-ui-line/[.12] bg-surface-raised flex-col !gap-0`} onClick={() => setPicker('classes')} data-testid="quick-classes">
          <span className="text-[10px] uppercase tracking-[.14em] text-ui-muted">Clase</span>
          <span className="max-w-full truncate">{c.classes.join(' + ') || 'Sin clase'}</span>
        </button>
      </div>

      <div className="mt-2 flex gap-2">
        {undo && (
          <button type="button" className="btn-secondary min-h-12 min-w-0 flex-1" onClick={() => void send({ type: 'character.undo', targetId: c.id })} data-testid="quick-undo">
            <Undo2 aria-hidden className="size-5 shrink-0 text-accent-brand" /><span className="truncate">Deshacer {undo.label}</span>
          </button>
        )}
        <button type="button" className={`btn-secondary min-h-12 ${undo ? '' : 'flex-1'}`} onClick={() => setMore(true)} data-testid="quick-more">
          <SlidersHorizontal aria-hidden className="size-5 shrink-0" /> Más
        </button>
      </div>

      <TagPicker open={picker === 'races'} kind="races" values={c.races} onClose={() => setPicker(null)} onChange={(v) => void patch({ races: v })} />
      <TagPicker open={picker === 'classes'} kind="classes" values={c.classes} onClose={() => setPicker(null)} onChange={(v) => void patch({ classes: v })} />
      <Modal open={more} title={`Ficha completa: ${c.name}`} onClose={() => setMore(false)} tall>
        <CharacterEditor targetId={c.id} />
      </Modal>
    </article>
  );
}
