import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { SLOT_LABEL, equipmentWarnings, gearFromItems } from '../../shared/novice';
import type { Character, EquipSlot, Item } from '../../shared/types';
import { uuid } from '../api';

const SLOTS = Object.keys(SLOT_LABEL) as EquipSlot[];

/** Equipo por espacios: la bonificación se suma sola y avisa si algo no entra. */
export function EquipmentEditor({ c, disabled, onChange }: { c: Character; disabled?: boolean; onChange: (items: Item[]) => void }) {
  const items = c.items ?? [];
  const [name, setName] = useState('');
  const [bonus, setBonus] = useState(1);
  const [slot, setSlot] = useState<EquipSlot>('hand');
  const [big, setBig] = useState(false);
  const warnings = equipmentWarnings(items, c);
  const handsUsed = items.filter((i) => i.equipped && (i.slot === 'hand' || i.slot === 'twoHands')).reduce((a, i) => a + (i.slot === 'twoHands' ? 2 : 1), 0);
  const used = (s: EquipSlot) => items.some((i) => i.equipped && i.slot === s);

  function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onChange([...items, { id: uuid(), name: name.trim(), bonus, slot, big, equipped: true }]);
    setName('');
    setBonus(1);
    setBig(false);
  }
  const update = (id: string, patch: Partial<Item>) => onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  return (
    <div className="space-y-4" data-testid="equipment">
      <div className="grid grid-cols-5 gap-1.5 text-center text-[11px] font-bold">
        {([
          ['Cabeza', used('head')],
          ['Armadura', used('armor')],
          ['Calzado', used('feet')],
          [`Manos ${handsUsed}/2`, handsUsed > 0],
          [`Grande ${items.filter((i) => i.big).length}/1`, items.some((i) => i.big)],
        ] as const).map(([label, on]) => (
          <span key={label} className={`rounded-xl px-1 py-2 ${on ? 'bg-accent-brand/15 text-accent-brand' : 'bg-surface-muted text-ui-muted'}`}>{label}</span>
        ))}
      </div>

      {warnings.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-accent-wine/10 p-3 text-sm font-semibold text-accent-wine" role="status" data-testid="equipment-warnings">
          {warnings.map((w) => <li key={w} className="flex gap-2"><AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />{w}</li>)}
        </ul>
      )}

      {items.length > 0 ? (
        <ul className="divide-y divide-ui-line/[.07] rounded-2xl border border-ui-line/[.08]">
          {items.map((i) => (
            <li key={i.id} className={`flex items-center gap-2 p-2 ${i.equipped ? '' : 'opacity-60'}`}>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{i.name}{i.big && <span className="ml-1 text-xs font-black text-accent-gold">GRANDE</span>}</span>
                <span className="block text-xs text-ui-muted">{SLOT_LABEL[i.slot]} · {i.equipped ? 'puesto' : 'lo llevás sin usar'}</span>
              </span>
              <b className="w-10 text-center font-display text-lg tabular-nums">{i.bonus >= 0 ? '+' : ''}{i.bonus}</b>
              <button type="button" className="btn-secondary btn-small" disabled={disabled} onClick={() => update(i.id, { equipped: !i.equipped })}>{i.equipped ? 'Sacar' : 'Poner'}</button>
              <button type="button" className="btn-secondary btn-small px-2" disabled={disabled} aria-label={`Quitar ${i.name}`} onClick={() => onChange(items.filter((x) => x.id !== i.id))}><Trash2 aria-hidden className="size-4" /></button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ui-muted">Cargá cada objeto que juegues y la app suma tu bonificación de equipo. Si preferís, podés seguir usando el número suelto de arriba.</p>
      )}

      <form onSubmit={add} className="space-y-2 rounded-2xl bg-surface-muted p-3" aria-label="Agregar objeto">
        <div className="grid grid-cols-[1fr_5.5rem] gap-2">
          <input className="input" aria-label="Nombre del objeto" placeholder="Ej.: Casco de valentía" maxLength={40} value={name} disabled={disabled} onChange={(e) => setName(e.target.value)} />
          <input className="input text-center" aria-label="Bonus" type="number" min={-20} max={20} value={bonus} disabled={disabled} onChange={(e) => setBonus(Math.max(-20, Math.min(20, Math.round(Number(e.target.value) || 0))))} />
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <select className="input" aria-label="Dónde va" value={slot} disabled={disabled} onChange={(e) => setSlot(e.target.value as EquipSlot)}>
            {SLOTS.map((s) => <option key={s} value={s}>{SLOT_LABEL[s]}</option>)}
          </select>
          <label className="flex min-h-12 items-center gap-2 px-1 text-sm font-semibold"><input type="checkbox" className="size-5" checked={big} disabled={disabled} onChange={(e) => setBig(e.target.checked)} /> Grande</label>
        </div>
        <button className="btn-secondary w-full" disabled={disabled || !name.trim()}><Plus aria-hidden className="size-4" /> Agregar objeto</button>
      </form>
      {items.length > 0 && <p className="text-xs text-ui-muted">Bonificación del equipo puesto: <b>{gearFromItems(items) >= 0 ? '+' : ''}{gearFromItems(items)}</b>. Los límites son avisos: si una carta dice otra cosa, manda la carta.</p>}
    </div>
  );
}
