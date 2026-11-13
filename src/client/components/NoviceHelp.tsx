import { Coins, GraduationCap, Lightbulb, Skull, X } from 'lucide-react';
import { useState } from 'react';
import { DEATH_STEPS, GOLD_PER_LEVEL, coaching, sale } from '../../shared/novice';
import { WIN_LEVEL } from '../../shared/rules';
import { useNoviceMode } from '../noviceMode';
import { useRoom } from '../useRoom';
import { Modal } from './Modal';

type Open = 'what' | 'death' | 'sell' | null;

/** Tarjeta del modo novato: consejos para este momento y acceso a las guías. */
export function CoachCard() {
  const { snap, me } = useRoom();
  const [on, setOn] = useNoviceMode();
  const [open, setOpen] = useState<Open>(null);
  if (!snap || !me) return null;
  const practice = !!snap.state.config.practice;
  if (!on && !practice) {
    return (
      <button type="button" className="inline-flex min-h-11 items-center gap-2 px-1 text-sm font-semibold text-ui-muted hover:text-ui-fg" onClick={() => setOn(true)} data-testid="novice-on">
        <GraduationCap aria-hidden className="size-4" /> Activar modo novato
      </button>
    );
  }
  const tips = coaching(snap.state, me.id);
  return (
    <section className="card border-accent-blue/25 bg-accent-blue/[.06] p-4" aria-labelledby="coach-title" data-testid="coach">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-blue/15 text-accent-blue"><Lightbulb aria-hidden className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 id="coach-title" className="text-xs font-black uppercase tracking-[.16em] text-accent-blue">{practice ? 'Práctica · consejo' : 'Modo novato'}</h2>
            {!practice && (
              <button type="button" className="grid size-9 place-items-center rounded-full text-ui-muted hover:bg-surface-raised" aria-label="Apagar modo novato" title="Apagar modo novato" onClick={() => setOn(false)}><X aria-hidden className="size-4" /></button>
            )}
          </div>
          <ul className="mt-1 space-y-1.5 text-[15px] leading-snug" data-testid="coach-tips">
            {tips.now.slice(0, 2).map((t) => <li key={t}>{t}</li>)}
          </ul>
          <button type="button" className="btn-blue btn-small mt-3" onClick={() => setOpen('what')} data-testid="what-can-i-do">¿Qué puedo hacer ahora?</button>
        </div>
      </div>
      <WhatCanIDo open={open === 'what'} onClose={() => setOpen(null)} onOpen={setOpen} />
      <DeathGuide open={open === 'death'} onClose={() => setOpen(null)} />
      <SellCalculator open={open === 'sell'} onClose={() => setOpen(null)} />
    </section>
  );
}

function WhatCanIDo({ open, onClose, onOpen }: { open: boolean; onClose: () => void; onOpen: (o: Open) => void }) {
  const { snap, me } = useRoom();
  if (!snap || !me) return null;
  const tips = coaching(snap.state, me.id);
  return (
    <Modal open={open} title="¿Qué puedo hacer ahora?" onClose={onClose} testId="what-modal">
      <div className="space-y-4">
        <div>
          <h3 className="mb-1 text-sm font-black uppercase tracking-[.14em] text-accent-brand">Ahora</h3>
          <ul className="list-disc space-y-1.5 pl-5">{tips.now.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
        <div>
          <h3 className="mb-1 text-sm font-black uppercase tracking-[.14em] text-ui-muted">En cualquier momento</h3>
          <ul className="list-disc space-y-1.5 pl-5 text-ui-muted">{tips.anytime.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
        {me.role === 'player' && (
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className="btn-secondary" onClick={() => onOpen('sell')}><Coins aria-hidden className="size-4" /> Vender objetos</button>
            <button type="button" className="btn-secondary" onClick={() => onOpen('death')}><Skull aria-hidden className="size-4" /> Me morí, ¿y ahora?</button>
          </div>
        )}
        <p className="text-xs text-ui-muted">Son resúmenes de las reglas del juego base. Si una carta dice otra cosa, manda la carta.</p>
      </div>
    </Modal>
  );
}

/** Paso a paso de qué hacer al morir. Los tildes son solo de este dispositivo. */
export function DeathGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { snap, me, send, pending } = useRoom();
  const [done, setDone] = useState<number[]>([]);
  if (!snap || !me) return null;
  const c = snap.state.characters[me.id];
  const hasGear = !!c && ((c.items?.length ?? 0) > 0 || c.gear !== 0);
  return (
    <Modal open={open} title="Me morí, ¿y ahora?" onClose={onClose} testId="death-modal">
      <div className="space-y-3">
        <p className="text-sm text-ui-muted">Morir en este juego no es tan grave: no perdés niveles. Seguí estos pasos con la mesa.</p>
        <ol className="space-y-2">
          {DEATH_STEPS.map((step, i) => {
            const on = done.includes(i);
            return (
              <li key={step}>
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl p-2 ${on ? 'opacity-60' : 'bg-surface-muted'}`}>
                  <input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={on} onChange={() => setDone(on ? done.filter((x) => x !== i) : [...done, i])} />
                  <span className={on ? 'line-through' : ''}><b>{i + 1}.</b> {step}</span>
                </label>
              </li>
            );
          })}
        </ol>
        {c && hasGear && (
          <button type="button" className="btn-primary w-full" disabled={pending} data-testid="death-clear-gear" onClick={() => { void send({ type: 'character.setItems', targetId: me.id, items: [] }); }}>
            <Skull aria-hidden className="size-4" /> Vaciar mi equipo en la app
          </button>
        )}
        {c && !hasGear && <p className="rounded-xl bg-surface-muted p-2 text-sm">Tu equipo en la app ya está vacío. Tu nivel ({c.level}) se mantiene.</p>}
      </div>
    </Modal>
  );
}

const QUICK = [100, 200, 300, 400, 500, 600, 700, 800];

/** Suma el oro de lo que vendés y dice cuántos niveles da. */
export function SellCalculator({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { snap, me, send, pending } = useRoom();
  const [values, setValues] = useState<number[]>([]);
  const [custom, setCustom] = useState('');
  if (!snap || !me) return null;
  const c = snap.state.characters[me.id];
  if (!c) return null;
  const r = sale(values, c.level);
  const addCustom = () => {
    const v = Math.round(Number(custom));
    if (Number.isFinite(v) && v > 0 && v <= 10000) setValues([...values, v]);
    setCustom('');
  };
  return (
    <Modal open={open} title="Vender objetos" onClose={onClose} testId="sell-modal">
      <div className="space-y-4">
        <p className="text-sm text-ui-muted">Sumá el valor en oro de cada carta que descartás. Cada {GOLD_PER_LEVEL} de oro es un nivel; lo que sobra se pierde. Se vende en tu turno, fuera de combate.</p>
        <div className="grid grid-cols-4 gap-2">
          {QUICK.map((v) => <button key={v} type="button" className="btn-secondary btn-small" onClick={() => setValues([...values, v])}>+{v}</button>)}
        </div>
        <div className="flex gap-2">
          <input className="input" inputMode="numeric" aria-label="Otro valor en oro" placeholder="Otro valor" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())} />
          <button type="button" className="btn-secondary" disabled={!custom} onClick={addCustom}>Sumar</button>
        </div>
        {values.length > 0 && (
          <div className="flex flex-wrap gap-1.5" data-testid="sell-values">
            {values.map((v, i) => (
              <button key={`${v}-${i}`} type="button" className="chip" aria-label={`Quitar ${v}`} onClick={() => setValues(values.filter((_, j) => j !== i))}>{v} <X aria-hidden className="size-3" /></button>
            ))}
          </div>
        )}
        <div className="rounded-2xl bg-surface-muted p-4 text-center" data-testid="sell-result">
          <p className="text-sm text-ui-muted">Total: <b className="text-ui-fg">{r.total}</b> de oro</p>
          <p className="font-display text-3xl font-black">{r.levels > 0 ? `+${r.levels} ${r.levels === 1 ? 'nivel' : 'niveles'}` : 'Sin nivel'}</p>
          {r.leftover > 0 && <p className="text-sm text-ui-muted">Sobran {r.leftover} de oro que se pierden (no hay cambio).</p>}
          {r.capped && <p className="mt-1 text-sm font-semibold text-accent-wine">Vendiendo no se puede llegar al nivel {WIN_LEVEL}: como mucho llegás a {WIN_LEVEL - 1}.</p>}
        </div>
        <button
          type="button"
          className="btn-go w-full"
          disabled={pending || r.levels === 0}
          data-testid="sell-apply"
          onClick={() => { void send({ type: 'character.update', targetId: me.id, patch: { level: c.level + r.levels } }); setValues([]); onClose(); }}
        >
          Subir a nivel {c.level + r.levels}
        </button>
      </div>
    </Modal>
  );
}
