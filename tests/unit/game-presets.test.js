import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_PRESETS, gamePresetPlan } from '../../src/game-presets.js';
import { RGB_COMMANDS, RGB_SUGGESTIONS } from '../../src/rgb-shortcuts.js';

test('every preset has valid, disjoint keys and conservative dead zones', () => {
  const keys = Array.from({ length: 232 }, (_, i) => i);
  for (const preset of GAME_PRESETS) {
    const plan = gamePresetPlan(preset.id, keys);
    assert.equal(plan.keys.length, new Set(plan.keys).size);
    assert.ok(!plan.keys.includes(1));
    assert.ok(plan.groups.every(g => g.values.pressDead === 0.15 && g.values.releaseDead === 0.15));
  }
  assert.throws(() => gamePresetPlan('unknown', keys), /Preset/);
  assert.throws(() => gamePresetPlan('cs2', [1]), /Nessun tasto/);
  assert.deepEqual(gamePresetPlan('cs2', [4, 7, 1]).keys, [4, 7]);
});

test('CS2 leaves E fixed, racing has no RT, and SOCD is exclusive to its explicit preset', () => {
  const keys = Array.from({ length: 232 }, (_, i) => i);
  const cs2 = gamePresetPlan('cs2', keys);
  assert.equal(cs2.groups.find(g => g.keys.includes(8)).values.touchMode, 'single');
  assert.ok(gamePresetPlan('racing', keys).groups.every(g => g.values.touchMode === 'single'));
  assert.deepEqual(GAME_PRESETS.filter(p => p.socdMode != null).map(p => p.id), ['socd']);
  assert.equal(gamePresetPlan('fps-fast', keys).groups.find(g => g.keys.includes(8)).values.touchMode, 'rt');
});

test('RGB suggestions use only main-light functions and protect Fn and Enter', () => {
  assert.equal(RGB_SUGGESTIONS.size, 9);
  for (const [key, code] of RGB_SUGGESTIONS) {
    assert.ok(![1, 40].includes(key));
    assert.ok(Object.hasOwn(RGB_COMMANDS, code));
  }
  assert.equal(RGB_SUGGESTIONS.get(42), 0xf317);
});
