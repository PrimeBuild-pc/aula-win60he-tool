import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFILE_CODES, profileLighting, validateProfileShortcuts } from '../../src/profiles.js';
import { DEFAULT_LIGHT } from '../../src/settings.js';

test('profile identity uses the selected color for static and animated effects without mutating the source', () => {
  const current = structuredClone(DEFAULT_LIGHT);
  current.superResponse = true; current.sleepDelay = 42;
  for (const mode of [0, 1, 20]) {
    const light = profileLighting(current, { color: '#1234ab', mode, luminance: 2, speed: 4 });
    assert.equal(light.type, mode ? 'dynamic' : 'static');
    assert.deepEqual(light.colors, Array(7).fill('#1234ab'));
    assert.equal(light.dynamicColorId, 0);
    assert.equal(light.superResponse, true); assert.equal(light.sleepDelay, 42);
  }
  assert.deepEqual(current.colors, DEFAULT_LIGHT.colors);
  assert.throws(() => profileLighting(current, { color: 'red', mode: 0, luminance: 4, speed: 2 }));
});

test('profile shortcut validation rejects Fn, missing keys, duplicate keys and duplicate destinations', () => {
  const physical = [1, 30, 31, 32, 33].map(keyValue => ({ keyValue }));
  const bindings = PROFILE_CODES.map((value, i) => ({ value, key: 30 + i, layout: 1 }));
  assert.equal(PROFILE_CODES[3], 0xf10c);
  assert.deepEqual(validateProfileShortcuts(bindings, physical), bindings);
  for (const invalid of [[], [{ ...bindings[0], key: 1 }], [{ ...bindings[0], key: 4 }],
    [bindings[0], { ...bindings[1], key: 30 }], [bindings[0], { ...bindings[1], value: PROFILE_CODES[0] }],
    [{ ...bindings[0], value: 0xf10b }], [{ ...bindings[0], layout: 2 }]]) {
    assert.throws(() => validateProfileShortcuts(invalid, physical));
  }
});
