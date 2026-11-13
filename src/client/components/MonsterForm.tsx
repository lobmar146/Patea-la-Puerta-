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
  // El listado arranca abierto (salvo al editar) para que escribir no cambie la altura del panel.
  const [catalogQuery, setCatalogQuery] = useState<string | null>(initial?.name ? null : '');
  const [selectedSet, setSelectedSet] = useState('');
  const catalogId = useId();
  const nameField = useRef<HTMLInputElement>(null);
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
    // Cierra el teclado para que se vean los valores cargados y el botón de confirmar.
    nameField.current?.blur();
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || disabled) return;
    onSubmit({ name: name.trim(), strength: monsterLevel, levels: Number(levels) || 0, treasures: Number(treasures) || 0 });
  }

  const searching = catalogOpen && catalogQuery.trim() !== '';
  return (
    <form onSubmit={submit} className="space-y-3" data-testid="monster-form">
      <label className="block">
        <span className="label">Nombre (opcional)</span>
        <input
          ref={nameField}
          className="input"
          value={name}
          maxLength={60}
          autoComplete="off"
          enterKeyHint="search"
          role="combobox"
          aria-expanded={catalogOpen && matches.length > 0}
          aria-controls={catalogId}
          aria-autocomplete="list"
          onChange={(event) => {
            setName(event.target.value);
            if (!catalogOpen) setSelectedSet('');
            setCatalogQuery(event.target.value);
          }}
          onKeyDown={(event) => {
            // Enter elige la primera coincidencia en vez de enviar el formulario.
            if (event.key === 'Enter' && searching && matches[0]) {
              event.preventDefault();
              selectMonster(matches[0]);
            }
          }}
          placeholder="Buscá por nombre, ej.: Nariz Flotante"
        />
      </label>
      <div id={catalogId} hidden={!catalogOpen} className="space-y-2">
        {catalogOpen && (
          <p className="sr-only" role="status">{matches.length} {matches.length === 1 ? 'coincidencia' : 'coincidencias'}</p>
        )}
        {/* Alto fijo: al escribir solo cambia lo de adentro, el panel y lo de abajo quedan quietos. */}
        <div className="h-52 overflow-y-auto overscroll-contain rounded-xl border border-ui-line/15 bg-surface-muted p-1.5" data-testid="monster-results">
          {matches.length > 0 ? (
            <ul aria-label="Monstruos del catálogo" role="listbox" className="space-y-1">
              {matches.map((preset) => {
                const needed = existingPower + preset.strength - players + (winTies ? 0 : 1);
                return (
                  <li key={`${preset.set}:${preset.name}`} role="option" aria-selected={false}>
                    <button
                      type="button"
                      className="flex min-h-12 w-full items-center gap-3 rounded-lg bg-surface-raised px-3 py-2 text-left hover:bg-surface-inset active:bg-surface-inset"
                      onClick={() => selectMonster(preset)}
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blood/10 text-lg font-black tabular-nums" aria-label={`Nivel de combate ${preset.strength}`}>{preset.strength}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{preset.name}</span>
                        <span className="block truncate text-xs text-ui-muted">
                          +{preset.levels} {preset.levels === 1 ? 'nivel' : 'niveles'} · {preset.treasures} {preset.treasures === 1 ? 'tesoro' : 'tesoros'} · {preset.set.replace(/:.*$/, '')}
                        </span>
                      </span>
                      {fighterId && (
                        <span className={`flex shrink-0 items-center gap-1 text-xs font-bold ${needed > 0 ? 'text-accent-wine' : 'text-accent-moss'}`}>
                          <Swords aria-hidden className="size-3.5 shrink-0" />
                          {needed > 0 ? `−${needed}` : 'Ventaja'}
                          <span className="sr-only">{needed > 0 ? `faltan ${needed} puntos` : 'jugadores con ventaja'}</span>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : <p className="p-2 text-sm text-ui-muted">No hay coincidencias. Podés cargar los datos de la carta a mano.</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
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
        {catalogOpen && (
          <select className="input min-w-0 flex-1" aria-label="Edición" value={selectedSet} onChange={(event) => setSelectedSet(event.target.value)}>
            <option value="">Todos los mazos</option>
            {monsterSets.map((set) => <option key={set}>{set}</option>)}
          </select>
        )}
      </div>
      {catalogOpen && (
        <p className="text-xs text-ui-muted">Catálogo parcial de Buró. El número es el nivel de combate; la espada indica cuánto les falta a los jugadores con los valores base.</p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <label>
          <span className="label">Nivel de combate</span>
          <input className="input" required inputMode="numeric" type="number" min={0} max={999} value={strength} onChange={(e) => setStrength(e.target.value)} data-testid="monster-strength" />
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
