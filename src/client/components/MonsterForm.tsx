import { List, Swords } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { MonsterInput } from '../../shared/commands';
import { activeParticipantId, basePower, combatTotals, playersWinTies } from '../../shared/rules';
import type { GameState } from '../../shared/types';
import { monsterSets, searchMonsters, type MonsterPreset } from '../assets/monsters';

export function MonsterForm({ state, onSubmit, submitLabel, disabled, extra, initial }: {
  state: GameState;
  onSubmit: (monster: MonsterInput) => void;
  submitLabel: string;
  disabled?: boolean;
  extra?: ReactNode;
  initial?: Partial<MonsterInput>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [strength, setStrength] = useState(String(initial?.strength ?? ''));
  const [levels, setLevels] = useState(String(initial?.levels ?? 1));
  const [treasures, setTreasures] = useState(String(initial?.treasures ?? 1));
  const [catalogQuery, setCatalogQuery] = useState<string | null>(null);
  const [selectedSet, setSelectedSet] = useState('');
  const catalogId = useId();
  const strengthField = useRef<HTMLInputElement>(null);
  const catalogOpen = catalogQuery !== null;
  const matches = catalogQuery === null ? [] : searchMonsters(catalogQuery)
    .filter((monster) => !selectedSet || monster.set === selectedSet);
  const monsterLevel = Number(strength);
  const valid = strength !== '' && Number.isInteger(monsterLevel) && monsterLevel >= 0 && monsterLevel <= 999;

  const combat = state.combat;
  const fighterId = combat?.fighterId ?? activeParticipantId(state);
  const fighter = fighterId ? state.characters[fighterId] : undefined;
  const totals = combat ? combatTotals(state, combat) : undefined;
  const players = totals?.players ?? (fighter ? basePower(fighter) : 0);
  const existingPower = (totals?.monsters ?? 0) - (initial?.strength ?? 0);
  const monsters = existingPower + monsterLevel;
  const difference = players - monsters;
  const winTies = playersWinTies(state, fighterId, combat?.helperId);
  const playersAhead = difference > 0 || (difference === 0 && winTies);
  const pointsNeeded = (winTies ? 0 : 1) - difference;

  function selectMonster(preset: MonsterPreset) {
    setName(preset.name);
    setStrength(String(preset.strength));
    setLevels(String(preset.levels));
    setTreasures(String(preset.treasures));
    setCatalogQuery(null);
    strengthField.current?.focus();
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || disabled) return;
    onSubmit({ name: name.trim(), strength: monsterLevel, levels: Number(levels) || 0, treasures: Number(treasures) || 0 });
  }
  return (
    <form onSubmit={submit} className="space-y-3" data-testid="monster-form">
      <label className="block">
        <span className="label">Nombre (opcional)</span>
        <input
          className="input"
          value={name}
          maxLength={60}
          autoComplete="off"
          onChange={(event) => {
            setName(event.target.value);
            if (!catalogOpen) setSelectedSet('');
            setCatalogQuery(event.target.value);
          }}
          placeholder="Buscá por nombre, ej.: Nariz Flotante"
        />
      </label>
      <button
        type="button"
        className="btn-secondary btn-small"
        aria-expanded={catalogOpen}
        aria-controls={catalogId}
        onClick={() => {
          if (!catalogOpen) setSelectedSet('');
          setCatalogQuery(catalogOpen ? null : '');
        }}
      >
        <List aria-hidden className="size-4" />
        {catalogOpen ? 'Ocultar listado' : 'Ver listado de monstruos'}
      </button>
      <div id={catalogId} hidden={!catalogOpen}>
        <p className="mb-2 text-xs text-ui-muted">Catálogo parcial de Buró. Si tu carta no figura, podés cargarla a mano.</p>
        {catalogOpen && (
          <p className="sr-only" role="status">{matches.length} {matches.length === 1 ? 'coincidencia' : 'coincidencias'}</p>
        )}
        <label className="mb-2 block">
          <span className="label">Edición</span>
          <select className="input" value={selectedSet} onChange={(event) => setSelectedSet(event.target.value)}>
            <option value="">Todos los mazos</option>
            {monsterSets.map((set) => <option key={set}>{set}</option>)}
          </select>
        </label>
        {fighterId && matches.length > 0 && (
          <p className="mb-2 text-xs text-ui-muted">Comparación con los valores base de cada carta.</p>
        )}
        {matches.length > 0 ? (
          <ul aria-label="Monstruos del catálogo" className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-ui-line/15 bg-surface-muted p-2">
            {matches.map((preset) => {
              const needed = existingPower + preset.strength - players + (winTies ? 0 : 1);
              return (
                <li key={`${preset.set}:${preset.name}`}>
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-surface-raised px-3 py-2 text-left hover:bg-surface-inset"
                    onClick={() => selectMonster(preset)}
                  >
                    <span className="min-w-0 flex-1 basis-40">
                      <span className="block break-words font-bold">{preset.name}</span>
                      <span className="block text-xs text-ui-muted">{preset.set}</span>
                    </span>
                    <span className="text-xs font-bold text-ui-muted">
                      <span className="block">Nivel de combate {preset.strength}</span>
                      <span className="block">Al vencer: +{preset.levels} {preset.levels === 1 ? 'nivel' : 'niveles'} · {preset.treasures} {preset.treasures === 1 ? 'tesoro' : 'tesoros'}</span>
                      {fighterId && (
                        <span className={`mt-0.5 flex items-center gap-1 ${needed > 0 ? 'text-accent-wine' : 'text-accent-moss'}`}>
                          <Swords aria-hidden className="size-3.5 shrink-0" />
                          {needed > 0 ? `Faltan ${needed} ${needed === 1 ? 'punto' : 'puntos'}` : 'Jugadores con ventaja'}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm text-ui-muted">No hay coincidencias. Podés cargar los datos de la carta a mano.</p>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <label>
          <span className="label">Nivel de combate</span>
          <input ref={strengthField} className="input" required inputMode="numeric" type="number" min={0} max={999} value={strength} onChange={(e) => setStrength(e.target.value)} data-testid="monster-strength" />
        </label>
        <label>
          <span className="label">Niveles al vencer</span>
          <input className="input" inputMode="numeric" type="number" min={0} max={10} value={levels} onChange={(e) => setLevels(e.target.value)} />
        </label>
        <label>
          <span className="label">Tesoros</span>
          <input className="input" inputMode="numeric" type="number" min={0} max={20} value={treasures} onChange={(e) => setTreasures(e.target.value)} />
        </label>
      </div>
      {valid && fighterId && (
        <div className="rounded-xl bg-surface-muted px-3 py-2 text-sm">
          <p className="font-bold">Jugadores {players} · Monstruos {monsters}</p>
          <p className={playersAhead ? 'text-accent-moss' : 'text-accent-wine'}>
            {playersAhead
              ? difference === 0 ? 'Empate favorable a los jugadores por Guerrero.' : `Jugadores por delante por ${difference}.`
              : `A los jugadores les faltan ${pointsNeeded} ${pointsNeeded === 1 ? 'punto' : 'puntos'} para ganar con estos valores.`}
          </p>
        </div>
      )}
      <p className="text-xs leading-snug text-ui-muted">Podés ajustar los valores según tu carta. Aplicá los modificadores especiales en el combate.</p>
      {extra}
      <button className="btn-primary w-full" disabled={disabled || !valid}>{submitLabel}</button>
    </form>
  );
}
