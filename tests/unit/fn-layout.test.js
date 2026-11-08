import test from 'node:test';
import assert from 'node:assert/strict';
import { FN_SUGGESTIONS, completeFnLayout } from '../../src/fn-layout.js';
import { KEY_LABELS, CODE_TO_HID } from '../../src/keycodes.js';

test('Fn suggestions cover 60 positions, Delete, all full-size extras and the numeric pad', () => {
  assert.equal(FN_SUGGESTIONS.size, 60);
  assert.equal(FN_SUGGESTIONS.has(1), false);
  assert.equal(FN_SUGGESTIONS.get(40), 76);
  const codes = new Set(FN_SUGGESTIONS.values());
  for (let code = 58; code <= 99; code++) assert.ok(codes.has(code), `Missing HID ${code}`);
  for (const code of codes) assert.ok(KEY_LABELS[code], `Unselectable HID ${code}`);
});

test('completion fills only empty physical slots, preserving user and vendor functions', () => {
  const mapping = new Map([[40, 1], [4, 0xf301], [7, 80], [26, 0], [22, 1]]);
  assert.deepEqual(completeFnLayout([40, 4, 7, 26, 22, 1], mapping), [[40, 76], [26, 82], [22, 81]]);
  assert.equal(mapping.get(40), 1);
  assert.deepEqual(completeFnLayout([40], new Map([[40, 76]])), []);
});

test('physical capture covers navigation, function and keypad keys', () => {
  assert.equal(CODE_TO_HID.Delete, 76);
  assert.equal(CODE_TO_HID.NumpadEnter, 88);
  assert.equal(CODE_TO_HID.Numpad0, 98);
  assert.equal(CODE_TO_HID.F12, 69);
  assert.equal(CODE_TO_HID.F13, 104);
  assert.equal(CODE_TO_HID.F24, 115);
});
