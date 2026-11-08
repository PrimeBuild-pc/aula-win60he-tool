import { GAME_PRESETS, gamePresetPlan } from './game-presets.js';
import { physicalLabel } from './keycodes.js';

const $ = id => document.getElementById(id);

export function initGamePresets({ aula, ui, task, renderAll, setButtons }) {
  let verified = null;
  let message = '';
  let failed = false;
  const button = $('btnGamePresetApply');
  function snapshot(keys) {
    const fields = ['keyValue', 'touchMode', 'advancedKeyMode', 'actuation', 'rtPress', 'rtRelease', 'pressDead', 'releaseDead'];
    return JSON.stringify({
      rate: aula.state?.rateIndex,
      keys: aula.state?.performances.filter(p => keys.includes(p.keyValue)).map(p => fields.map(field => p[field])),
      socd: aula.state?.socd,
    });
  }
  ui.syncPresetState = ({ invalidate = false } = {}) => {
    // A new device read needs fresh confirmation; never infer a saved preset from local preferences.
    if (verified && (invalidate || !ui.connected || aula.state !== verified.state || snapshot(verified.keys) !== verified.snapshot)) {
      verified = null;
      message = 'Modifiche da applicare';
    }
    const applied = verified?.id === $('gamePreset').value && verified.rateIndex === Number($('presetRate').value);
    button.disabled ||= Boolean(applied);
    button.classList.toggle('is-applied', Boolean(applied));
    if (!ui.busy) button.textContent = applied ? 'Preset applicato' : 'Applica preset';
    $('presetFeedback').classList.toggle('is-applied', Boolean(applied));
    $('presetFeedback').classList.toggle('is-error', failed);
    $('presetAppliedIcon').hidden = !applied;
    $('presetAppliedHint').hidden = !applied;
    $('presetStatus').textContent = applied ? 'Preset salvato e verificato' : verified ? 'Modifiche da applicare' : message;
  };
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
    if (!keys.length) { $('presetRows').replaceChildren(); setButtons(); return; }
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
  $('gamePreset').addEventListener('change', () => { failed = false; message = ''; preview(); });
  $('presetRate').addEventListener('change', () => { failed = false; message = ''; setButtons(); });
  document.addEventListener('studio:render', preview);
  button.addEventListener('click', () => {
    if (button.disabled) return;
    const id = $('gamePreset').value;
    const rateIndex = Number($('presetRate').value);
    task(button, async () => {
      verified = null; failed = false; message = 'Attendi…';
      ui.syncPresetState();
      try {
        const plan = await aula.applyGamePreset(id, { rateIndex, onProgress: (done, total) => {
          message = `Scrittura e verifica: ${done} / ${total}`;
          ui.syncPresetState();
        } });
        verified = { id, rateIndex, keys: plan.keys, state: aula.state, snapshot: snapshot(plan.keys) };
      } catch (error) {
        failed = true; message = error.message;
        throw error;
      } finally { renderAll(); }
    }, 'Preset salvato e verificato');
  });
  preview();
}
