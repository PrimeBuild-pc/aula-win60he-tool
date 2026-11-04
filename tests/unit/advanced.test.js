import test from 'node:test';
import assert from 'node:assert/strict';
import { advancedRegisters, validateMacro } from '../../src/advanced.js';
import { validateBackup } from '../../src/settings.js';

test('MPT requires three increasing depths and permits unused extra actions', () => {
  const config = { first: 26, second: 225, third: 44, firstTravel: 0.5, travel: 1.5, thirdTravel: 2.5 };
  const values = advancedRegisters('mpt', config);
  assert.deepEqual(values.filter(p => p.layout < 9).map(p => p.value), [500, 1500, 2500]);
  assert.throws(() => advancedRegisters('mpt', { ...config, thirdTravel: 1 }));
});

test('DKS preserves four action codes and full press/release phase masks', () => {
  const config = { first: 26, second: 225, third: 44, fourth: 22, masks: [127, 24, 255, 32], firstTravel: 0.5, travel: 2 };
  const values = advancedRegisters('dks', config);
  assert.equal(values.find(p => p.layout === 16).value, 32);
  assert.equal(values.find(p => p.layout === 12).value, 22);
  assert.throws(() => advancedRegisters('dks', { ...config, masks: [1, 2] }));
  assert.throws(() => advancedRegisters('dks', { ...config, travel: 0.2 }));
});

test('macro validation prevents stuck keys, unbalanced releases and invalid input', () => {
  const events = [{ keyCode: 224, status: 1, timeDifference: 0 }, { keyCode: 6, status: 1, timeDifference: 30 }, { keyCode: 6, status: 0, timeDifference: 30 }, { keyCode: 224, status: 0, timeDifference: 0 }];
  assert.equal(validateMacro(events), events);
  assert.throws(() => validateMacro(events.slice(0, 3)), /rilasciare/);
  assert.throws(() => validateMacro([{ ...events[0], status: 0 }, events[1]]));
  assert.throws(() => validateMacro([{ ...events[0], timeDifference: -1 }, events[1]]));
  assert.throws(() => validateMacro([...events, ...Array(121).fill(events[0])]));
  assert.throws(() => validateMacro(Array(65).fill(events[0])), /64 eventi/);
});

test('backup rejects incomplete advanced actions and unsafe macro payloads before writes', () => {
  assert.throws(() => validateBackup({ schema: 4, layers: [], performances: [], advanced: [{ key: 4, mode: 2, values: [] }] }));
  assert.throws(() => validateBackup({ schema: 4, layers: [], performances: [], macros: [{ key: 4, events: [{ keyCode: 4, status: 1, timeDifference: 0 }], params: { mode: 0, num: 1, delay: 0 } }] }));
});
