import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LIGHT, validateBackup, validateLight, validatePerformance, rgbFromHex, stepTrigger } from '../../src/settings.js';

const backup = () => ({ schema: 4, layers: [[{ key: 4, value: 4 }]], performances: [], socd: [], lighting: structuredClone(DEFAULT_LIGHT), customLighting: [] });

test('backup accepts legacy and current schemas and rejects dangerous values', () => {
  assert.equal(validateBackup(backup()).schema, 4);
  assert.equal(validateBackup({ ...backup(), schema: 3 }).schema, 3);
  for (const mutate of [
    b => b.layers[0][0].value = -1, b => b.layers[0][0].key = 999,
    b => b.layers[0].push({ key: 4, value: 5 }), b => b.device = { vendorId: 1, productId: 2 },
    b => b.rateIndex = null / 0, b => b.lighting.colors = ['#ffffff'],
    b => b.customLighting = [{ key: 4, r: 256, g: 0, b: 0 }],
    b => b.socd = [{ pos1: 4, pos2: 4, mode: 0 }],
    b => b.advanced = [{ key: 4, mode: 3, values: [] }],
  ]) {
    const value = backup(); mutate(value); assert.throws(() => validateBackup(value));
  }
});

test('RGB colors and seven-color palettes are checked before packet generation', () => {
  assert.deepEqual(rgbFromHex('#ff0080'), { r: 255, g: 0, b: 128 });
  assert.throws(() => rgbFromHex('red'));
  assert.throws(() => validateLight({ ...DEFAULT_LIGHT, colors: [] }));
  assert.throws(() => validateLight({ ...DEFAULT_LIGHT, speed: Infinity }));
});

test('performance rejects non-numeric, out-of-range and invalid modes', () => {
  const p = { touchMode: 'rt', actuation: 0.5, rtPress: 0.15, rtRelease: 0.15, pressDead: 0.15, releaseDead: 0.15 };
  assert.equal(validatePerformance(p), p);
  for (const delta of [{ actuation: NaN }, { actuation: '0.5' }, { touchMode: 'bad' }, { rtPress: -1 }]) assert.throws(() => validatePerformance({ ...p, ...delta }));
});

test('rapid trigger reactivates below initial actuation after releasing', () => {
  const s = { pressed: false, started: false, ref: 0 };
  const p = { touchMode: 'rt', actuation: 0.5, rtPress: 0.1, rtRelease: 0.1, pressDead: 0.05 };
  stepTrigger(s, 0.6, p); assert.equal(s.pressed, true);
  stepTrigger(s, 0.3, p); assert.equal(s.pressed, false);
  stepTrigger(s, 0.41, p); assert.equal(s.pressed, true);
  stepTrigger(s, 0.01, p); assert.equal(s.started, false);
  stepTrigger(s, 0.4, p); assert.equal(s.pressed, false);
  stepTrigger(s, 0.6, p); assert.equal(s.pressed, true);
});

test('fixed actuation is independent from rapid-trigger history', () => {
  const s = { pressed: false, ref: 0 };
  stepTrigger(s, 0.6, { touchMode: 'single', actuation: 0.5 }); assert.equal(s.pressed, true);
  stepTrigger(s, 0.4, { touchMode: 'single', actuation: 0.5 }); assert.equal(s.pressed, false);
});
