import { GAME_PRESETS, gamePresetPlan } from './game-presets.js';
import { physicalLabel } from './keycodes.js';

const $ = id => document.getElementById(id);

export function initGamePresets({ aula, ui, task, renderAll, setButtons }) {
  for (const preset of GAME_PRESETS) {
    const option = document.createElement('option');
    option.value = preset.id; option.textContent = preset.name;
    $('gamePreset').appendChild(option);
  }
  function preview() {
    const preset = GAME_PRESETS.find(p => p.id === $('gamePreset').value);
    $('presetDescription').textContent = preset.description;
    $('presetSocd').textContent = preset.socdMode == null ? 'SOCD: spento su A/D e W/S' : 'SOCD: ultimo input su A/D; spento su W/S';
    $('presetSocd').classList.toggle('warn', preset.socdMode != null);
    const keys = aula.state?.physical.map(p => p.keyValue) ?? [];
    if (!keys.length) { $('presetRows').replaceChildren(); return; }
    const plan = gamePresetPlan(preset.id, keys);
    ui.perfPresetKeys = new Set(plan.keys);
    $('presetRows').replaceChildren();
    for (const g of plan.groups) {
      const row = document.createElement('tr');
      for (const text of [g.keys.map(physicalLabel).join(' · '), `${g.values.actuation.toFixed(2)} mm`,
        g.values.touchMode === 'rt' ? `${g.values.rtPress.toFixed(2)} / ${g.values.rtRelease.toFixed(2)} mm` : 'Spento']) {
        const cell = document.createElement('td'); cell.textContent = text; row.appendChild(cell);
      }
      $('presetRows').appendChild(row);
    }
    document.querySelectorAll('#kbdPerf .key').forEach(key => key.classList.toggle('is-preset', ui.perfPresetKeys.has(Number(key.dataset.key))));
    setButtons();
  }
  $('gamePreset').addEventListener('change', () => { $('presetStatus').textContent = ''; preview(); });
  document.addEventListener('studio:render', preview);
  $('btnGamePresetApply').addEventListener('click', () => {
    const id = $('gamePreset').value;
    const rateIndex = Number($('presetRate').value);
    task($('btnGamePresetApply'), async () => {
      $('presetStatus').textContent = 'Attendi…';
      try {
        await aula.applyGamePreset(id, { rateIndex, onProgress: (done, total) => {
          $('presetStatus').textContent = `${done} / ${total}`;
        } });
        $('presetStatus').textContent = 'Preset salvato e verificato';
      } catch (error) {
        $('presetStatus').textContent = error.message;
        throw error;
      } finally { renderAll(); }
    }, 'Preset salvato e verificato');
  });
  preview();
}
