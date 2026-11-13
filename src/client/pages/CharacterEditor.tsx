import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CharacterPatch } from '../../shared/commands';
import { CLASS_SUGGESTIONS, RACE_SUGGESTIONS, avatarOf, basePower } from '../../shared/rules';
import { Avatar, AvatarPicker } from '../components/Avatar';
import { Section, Stepper } from '../components/ui';
import { useRoom } from '../useRoom';

const OTHER = '__otra__';

/** Elegir de una lista desplegable; "Otra…" permite escribir una de expansiones o cartas especiales. */
function TagEditor({ label, values, suggestions, onChange, disabled, id }: { label: string; values: string[]; suggestions: string[]; onChange: (v: string[]) => void; disabled?: boolean; id: string }) {
  const [custom, setCustom] = useState<string | null>(null);
  const add = (v: string) => {
    const t = v.trim();
    if (t && !values.includes(t) && values.length < 6) onChange([...values, t]);
    setCustom(null);
  };
  const options = suggestions.filter((s) => !values.includes(s));
  const noun = id === 'races' ? 'raza' : 'clase';
  return (
    <div>
      <span className="label">{label}</span>
      <div className="mb-2 flex min-h-9 flex-wrap items-center gap-1.5" data-testid={`${id}-list`}>
        {values.length === 0 && <span className="text-sm italic text-ui-muted">{id === 'races' ? 'Humano (sin carta de raza)' : 'Sin clase'}</span>}
        {values.map((v) => (
          <span key={v} className="chip border-transparent bg-accent-brand/15 pr-1 font-bold text-accent-brand">
            {v}
            <button type="button" disabled={disabled} className="grid size-7 place-items-center rounded-full hover:bg-accent-brand/20" aria-label={`Quitar ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}><X aria-hidden className="size-4 shrink-0" /></button>
          </span>
        ))}
      </div>
      {custom === null ? (
        <select
          className="input"
          value=""
          disabled={disabled || values.length >= 6}
          aria-label={`Agregar ${noun}`}
          data-testid={`${id}-select`}
          onChange={(e) => {
            if (e.target.value === OTHER) setCustom('');
            else add(e.target.value);
          }}
        >
          <option value="" disabled>{values.length ? `Sumar otra ${noun}…` : `Elegir ${noun}…`}</option>
          {options.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value={OTHER}>Otra (escribirla)…</option>
        </select>
      ) : (
        <div className="flex gap-2">
          <input className="input" autoFocus maxLength={30} value={custom} disabled={disabled} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add(custom))} placeholder={`Nombre de la ${noun}`} aria-label={`Escribir ${noun}`} />
          <button type="button" className="btn-secondary" disabled={disabled || !custom.trim()} onClick={() => add(custom)}>Agregar</button>
          <button type="button" className="btn-secondary px-3" aria-label="Cancelar" onClick={() => setCustom(null)}><X aria-hidden className="size-4" /></button>
        </div>
      )}
    </div>
  );
}

/** Edición rápida de un personaje. El jugador edita el suyo; el DM, cualquiera. */
export function CharacterEditor({ targetId }: { targetId: string }) {
  const { snap, send, pending } = useRoom();
  const c = snap?.state.characters[targetId];
  const [name, setName] = useState(c?.name ?? '');
  const [notes, setNotes] = useState(c?.notes ?? '');
  useEffect(() => {
    setName(c?.name ?? '');
    setNotes(c?.notes ?? '');
  }, [c?.name, c?.notes, targetId]);
  // Guardado automático: al dejar de escribir un momento o al salir del campo.
  const savedName = c?.name ?? '';
  const savedNotes = c?.notes ?? '';
  useEffect(() => {
    if (!name.trim() || name.trim() === savedName) return;
    const t = window.setTimeout(() => void send({ type: 'character.update', targetId, patch: { name: name.trim() } }), 900);
    return () => window.clearTimeout(t);
  }, [name, savedName, send, targetId]);
  useEffect(() => {
    if (notes === savedNotes) return;
    const t = window.setTimeout(() => void send({ type: 'character.update', targetId, patch: { notes } }), 900);
    return () => window.clearTimeout(t);
  }, [notes, savedNotes, send, targetId]);
  if (!snap || !c) return null;

  const patch = (p: CharacterPatch) => send({ type: 'character.update', targetId, patch: p });
  const saveState = (local: string, saved: string) => (local.trim() === saved.trim() ? 'Guardado' : 'Guardando…');

  return (
    <div className="space-y-4" data-testid="character-editor">
      <section className="card phase-hero relative isolate overflow-hidden p-5 sm:p-7">
        
        <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: c.color }} />
        <div className="flex items-center justify-between gap-4 pl-2">
          <Avatar c={c} size="md" className="hidden min-[400px]:grid" />
          <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.18em] text-ui-muted">Tu aventurero</p><h1 className="mt-1 truncate font-display text-3xl font-black tracking-tight sm:text-4xl" data-testid="char-name">{c.name}</h1><p className="mt-1 truncate text-sm text-ui-muted">{[...c.races, ...c.classes].join(' · ') || 'Humano sin clase'}</p></div>
          <div className="shrink-0 rounded-2xl bg-gradient-to-b from-[#f6b64a] to-[#d98a16] px-4 py-3 text-center text-[#2a1606] shadow-[inset_0_1px_0_rgba(255,255,255,.35),0_12px_24px_-12px_rgba(240,165,49,.8)]">
            <div className="text-[9px] font-black uppercase tracking-[.18em]">Poder total</div>
            <div className="font-display text-4xl font-black tabular-nums sm:text-5xl" data-testid="char-power">{basePower(c)}</div>
            <div className="text-[10px] font-semibold opacity-75">nivel + equipo + otros</div>
          </div>
        </div>
      </section>

      <Section title="Estadísticas">
        <div className="space-y-2">
          <Stepper label="Nivel" testId="level" value={c.level} min={1} max={99} disabled={pending} onChange={(v) => patch({ level: v })} />
          <Stepper label="Equipo (bonificación total)" testId="gear" value={c.gear} disabled={pending} onChange={(v) => patch({ gear: v })} />
          <Stepper label="Otros modificadores permanentes" testId="mods" value={c.otherMods} disabled={pending} onChange={(v) => patch({ otherMods: v })} />
        </div>
      </Section>

      <Section title="Razas y clases">
        <p className="mb-3 text-sm text-ui-muted">Más de una solo si una carta lo permite (Mestizo, Súper Munchkin).</p>
        <div className="space-y-4">
          <TagEditor id="races" label="Razas" values={c.races} suggestions={RACE_SUGGESTIONS} disabled={pending} onChange={(v) => patch({ races: v })} />
          <TagEditor id="classes" label="Clases" values={c.classes} suggestions={CLASS_SUGGESTIONS} disabled={pending} onChange={(v) => patch({ classes: v })} />
        </div>
      </Section>

      <Section title="Nombre, avatar y notas">
        <div className="space-y-3">
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor={`name-${targetId}`}>Nombre</label>
              <span className="text-xs text-ui-muted" aria-live="polite">{name.trim() ? saveState(name, c.name) : 'Falta el nombre'}</span>
            </div>
            <input id={`name-${targetId}`} className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name.trim() !== c.name && patch({ name: name.trim() })} />
          </div>
          <AvatarPicker avatar={avatarOf(c)} color={c.color} disabled={pending} idPrefix="edit" onChange={(v) => patch(v.avatar !== avatarOf(c) ? { avatar: v.avatar } : { color: v.color })} />
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor={`notes-${targetId}`}>Notas de efectos (opcional)</label>
              <span className="text-xs text-ui-muted" aria-live="polite">{saveState(notes, c.notes)}</span>
            </div>
            <textarea id={`notes-${targetId}`} className="input min-h-[80px]" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== c.notes && patch({ notes })} placeholder="Ej.: maldición de -1 hasta el próximo combate" />
          </div>
        </div>
      </Section>
    </div>
  );
}
