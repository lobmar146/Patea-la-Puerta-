import { useEffect, useState } from 'react';
import type { CharacterPatch } from '../../shared/commands';
import { CLASS_SUGGESTIONS, COLORS, RACE_SUGGESTIONS, basePower } from '../../shared/rules';
import { Section, Stepper } from '../components/ui';
import { useRoom } from '../useRoom';

function TagEditor({ label, values, suggestions, onChange, disabled, id }: { label: string; values: string[]; suggestions: string[]; onChange: (v: string[]) => void; disabled?: boolean; id: string }) {
  const [draft, setDraft] = useState('');
  const add = (v: string) => {
    const t = v.trim();
    if (t && !values.includes(t) && values.length < 6) onChange([...values, t]);
    setDraft('');
  };
  return (
    <div>
      <span className="label">{label}</span>
      <div className="mb-2 flex flex-wrap gap-1" data-testid={`${id}-list`}>
        {values.length === 0 && <span className="text-sm italic">{id === 'races' ? 'Humano (sin carta de raza)' : 'Sin clase'}</span>}
        {values.map((v) => (
          <span key={v} className="chip">
            {v}
            <button type="button" disabled={disabled} className="px-1 font-black" aria-label={`Quitar ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="input" list={`${id}-sug`} value={draft} disabled={disabled} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add(draft))} placeholder="Escribí o elegí" aria-label={`Agregar ${label.toLowerCase()}`} />
        <datalist id={`${id}-sug`}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
        <button type="button" className="btn-secondary" disabled={disabled || !draft.trim()} onClick={() => add(draft)}>Agregar</button>
      </div>
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
  if (!snap || !c) return null;

  const patch = (p: CharacterPatch) => send({ type: 'character.update', targetId, patch: p });

  return (
    <div className="space-y-4" data-testid="character-editor">
      <section className="card overflow-hidden">
        <div className="h-3" style={{ background: c.color }} />
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <h2 className="text-2xl font-black" data-testid="char-name">{c.name}</h2>
            <p className="text-sm">{[...c.races, ...c.classes].join(' · ') || 'Humano sin clase'}</p>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold uppercase">Poder base</div>
            <div className="text-5xl font-black tabular-nums" data-testid="char-power">{basePower(c)}</div>
            <div className="text-xs">nivel + equipo + otros</div>
          </div>
        </div>
      </section>

      <Section title="Estadísticas">
        <div className="space-y-3">
          <Stepper label="Nivel" testId="level" value={c.level} min={1} max={99} disabled={pending} onChange={(v) => patch({ level: v })} />
          <Stepper label="Equipo (bonificación total)" testId="gear" value={c.gear} disabled={pending} onChange={(v) => patch({ gear: v })} />
          <Stepper label="Otros modificadores permanentes" testId="mods" value={c.otherMods} disabled={pending} onChange={(v) => patch({ otherMods: v })} />
        </div>
      </Section>

      <Section title="Razas y clases">
        <p className="mb-3 text-sm">Podés registrar más de una si una carta lo habilita (por ejemplo Mestizo o Súper Munchkin). La mesa valida que sea legal.</p>
        <div className="space-y-4">
          <TagEditor id="races" label="Razas" values={c.races} suggestions={RACE_SUGGESTIONS} disabled={pending} onChange={(v) => patch({ races: v })} />
          <TagEditor id="classes" label="Clases" values={c.classes} suggestions={CLASS_SUGGESTIONS} disabled={pending} onChange={(v) => patch({ classes: v })} />
        </div>
      </Section>

      <Section title="Identidad y notas">
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor={`name-${targetId}`}>Nombre</label>
            <div className="flex gap-2">
              <input id={`name-${targetId}`} className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
              <button className="btn-secondary" disabled={pending || !name.trim() || name === c.name} onClick={() => patch({ name: name.trim() })}>Guardar</button>
            </div>
          </div>
          <fieldset>
            <legend className="label">Color</legend>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((col) => (
                <button key={col} type="button" aria-label={`Color ${col}${col === c.color ? ' (actual)' : ''}`} aria-pressed={col === c.color} className={`h-10 w-10 rounded-full border-2 border-ink ${col === c.color ? 'ring-4 ring-ink ring-offset-2' : ''}`} style={{ background: col }} onClick={() => patch({ color: col })}>
                  {col === c.color && <span className="font-black text-white">✔</span>}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="label" htmlFor={`notes-${targetId}`}>Notas de efectos (opcional)</label>
            <textarea id={`notes-${targetId}`} className="input min-h-[80px]" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej.: maldición de -1 hasta el próximo combate" />
            <button className="btn-secondary mt-2" disabled={pending || notes === c.notes} onClick={() => patch({ notes })}>Guardar notas</button>
          </div>
        </div>
      </Section>
    </div>
  );
}
