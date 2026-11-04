import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LIGHT, validateLight } from '../../src/settings.js';

test('WIN60 firmware RGB accepts only its five brightness and speed levels', () => {
  assert.throws(() => validateLight({ ...DEFAULT_LIGHT, luminance: 100 }), /Luminosità/);
  assert.throws(() => validateLight({ ...DEFAULT_LIGHT, speed: 5 }), /Velocità/);
  assert.ok(DEFAULT_LIGHT.luminance > 0 && DEFAULT_LIGHT.luminance <= 4);
  assert.equal(DEFAULT_LIGHT.staticColor, 0, 'the first palette slot is zero-based; slot 7 is rainbow');
});
