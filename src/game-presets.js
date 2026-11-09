import { validatePerformance, performanceMatches } from './settings.js';

const movement = [26, 4, 22, 7];
const actions = [20, 8, 21, 9, 6, 25, 27, 224, 225, 44];
const values = (actuation, rt = null) => ({
  touchMode: rt == null ? 'single' : 'rt', actuation, rtPress: rt ?? 0.3, rtRelease: rt ?? 0.3,
  pressDead: 0.15, releaseDead: 0.15,
});
const group = (keys, actuation, rt = null) => ({ keys, values: values(actuation, rt) });

export const GAME_PRESETS = [
  { id: 'cs2', name: 'CS2 · Precisione', description: 'RT su WASD; E e i tasti azione restano ad attuazione fissa. SOCD spento.',
    groups: [group(movement, 0.7, 0.3), group(actions, 1.5)] },
  { id: 'valorant', name: 'VALORANT · Controllo', description: 'Movimento rapido e abilità con soglia più profonda per ridurre le pressioni involontarie.',
    groups: [group(movement, 0.5, 0.2), group(actions, 1.2)] },
  { id: 'fps-fast', name: 'FPS · Reattivo', description: 'RT anche su Q/E, Ctrl, C/V/X e Shift. R/F/Space mantengono una pressione stabile.',
    groups: [group(movement, 0.4, 0.15), group([20, 8, 224, 6, 25, 27, 225], 0.8, 0.25), group([21, 9, 44], 1.2)] },
  { id: 'fortnite', name: 'Fortnite · Build', description: 'RT su movimento e Q/E/C/V/X/F per costruzioni e modifiche ripetute.',
    groups: [group(movement, 0.5, 0.2), group([20, 8, 6, 25, 27, 9], 0.8, 0.25), group([21, 224, 225, 44], 1.2)] },
  { id: 'socd', name: 'Competitive · SOCD A/D', description: 'Ultimo input su A/D. Solo dove il regolamento consente SOCD; non usare sui server Valve.',
    socdMode: 0, groups: [group(movement, 0.5, 0.2), group(actions, 1.2)] },
  { id: 'racing', name: 'Sim racing · Digitale', description: 'RT e SOCD spenti per mantenere sterzo, acceleratore e freno stabili. Non abilita input analogici.',
    groups: [group([4, 7], 1.2), group([26, 22], 1.5), group(actions, 1.5)] },
  { id: 'balanced', name: 'Uso misto · Stabile', description: 'Attuazione fissa sui tasti di gioco, senza RT o SOCD. Gli altri tasti mantengono le impostazioni attuali.',
    groups: [group([...movement, ...actions], 1.5)] },
];

export function gamePresetPlan(id, physicalKeys) {
  const preset = GAME_PRESETS.find(p => p.id === id);
  if (!preset) throw new Error('Preset non valido.');
  const available = new Set(physicalKeys);
  const groups = preset.groups.map(g => ({ keys: g.keys.filter(key => available.has(key)), values: { ...g.values } })).filter(g => g.keys.length);
  for (const g of groups) validatePerformance(g.values);
  if (!groups.length) throw new Error('Nessun tasto compatibile con il preset.');
  return { ...preset, groups, keys: groups.flatMap(g => g.keys) };
}

export function matchesGamePreset(state, id, rateIndex) {
  if (!state?.physical?.length || state.rateIndex !== rateIndex) return false;
  const plan = gamePresetPlan(id, state.physical.map(p => p.keyValue));
  return plan.groups.every(group => group.keys.every(key => {
    const stored = state.performances.find(p => p.keyValue === key);
    const advanced = plan.socdMode != null && [4, 7].includes(key) ? 8 : 0;
    return stored?.advancedKeyMode === advanced && performanceMatches(stored, group.values);
  })) && [[4, 7], [26, 22]].every(([a, b]) => {
    const pair = state.socd?.find(p => p.pos1 === a || p.pos2 === a);
    return a === 4 && plan.socdMode != null ? pair?.pos1 === a && pair.pos2 === b && pair.mode === plan.socdMode : !pair;
  });
}
