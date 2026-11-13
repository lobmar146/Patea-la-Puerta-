import { useState, type FormEvent, type ReactNode } from 'react';
import type { MonsterInput } from '../../shared/commands';

export function MonsterForm({ onSubmit, submitLabel, disabled, extra, initial }: { onSubmit: (m: MonsterInput) => void; submitLabel: string; disabled?: boolean; extra?: ReactNode; initial?: Partial<MonsterInput> }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [strength, setStrength] = useState(String(initial?.strength ?? ''));
  const [levels, setLevels] = useState(String(initial?.levels ?? 1));
  const [treasures, setTreasures] = useState(String(initial?.treasures ?? 1));
  const valid = strength !== '' && Number(strength) >= 0;
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onSubmit({ name: name.trim(), strength: Number(strength), levels: Number(levels) || 0, treasures: Number(treasures) || 0 });
  }
  return (
    <form onSubmit={submit} className="space-y-2" data-testid="monster-form">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="col-span-2">
          <span className="label">Nombre (opcional)</span>
          <input className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Planta en maceta" />
        </label>
        <label>
          <span className="label">Fuerza</span>
          <input className="input" required inputMode="numeric" type="number" min={0} max={999} value={strength} onChange={(e) => setStrength(e.target.value)} data-testid="monster-strength" />
        </label>
        <label>
          <span className="label">Niveles</span>
          <input className="input" inputMode="numeric" type="number" min={0} max={10} value={levels} onChange={(e) => setLevels(e.target.value)} />
        </label>
        <label>
          <span className="label">Tesoros</span>
          <input className="input" inputMode="numeric" type="number" min={0} max={20} value={treasures} onChange={(e) => setTreasures(e.target.value)} />
        </label>
      </div>
      {extra}
      <button className="btn-primary w-full" disabled={disabled || !valid}>{submitLabel}</button>
    </form>
  );
}
