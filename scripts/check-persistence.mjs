import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import Keyboard from '@sparklinkplayjoy/sdk-keyboard';
import { AulaKeyboard } from '../src/aula.js';
import { createHidTransport } from './hardware-transport.mjs';

const capture = process.argv.includes('--capture');
const baselinePath = new URL('../.persistence-check/before.json', import.meta.url);
const resultPath = new URL('../.persistence-check/result.json', import.meta.url);
let baseline;
if (capture) {
  try { await readFile(baselinePath); throw new Error('Baseline already exists; preserve it until verification is complete.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
} else baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
const transport = createHidTransport({ allowSave: capture });
const driver = new AulaKeyboard();
driver.kb = new Keyboard({ configs: [], usage: 1, usagePage: 0xffa0 });
driver.kb.deviceBase.sendData = async packet => {
  const response = await transport.send(packet);
  return Uint8Array.from(response.slice(4, 4 + response[1]));
};
async function snapshot() {
  const protocol = await driver.checked('Protocol', () => driver.kb.getApi({ type: 'ORDER_TYPE_PROTOCOL_VERSION' }));
  const physical = driver.flattenLayout(await driver.kb.defKey());
  driver.state = { protocolVersion: protocol, physical };
  const layouts = [0, 1, 2, 3, 4, 8, 20, 21, 22, 23];
  const registers = [];
  for (const layout of layouts) {
    registers.push(...await driver.readRegisters(physical.map(p => ({ key: p.keyValue, layout }))));
  }
  const advancedLayouts = { 1: [5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16], 2: [5, 6, 7, 9, 10, 11],
    3: [9, 10, 11, 12, 19], 4: [9, 19], 5: [9, 19], 6: [9, 17, 18, 19], 9: [32] };
  for (const p of registers.filter(p => p.layout === 8)) {
    for (const layout of advancedLayouts[p.value & 15] || []) {
      registers.push(...await driver.readRegisters([{ key: p.key, layout }]));
    }
  }
  const socd = [];
  for (const key of [4, 26]) if ((registers.find(p => p.key === key && p.layout === 8)?.value & 15) === 8) {
    socd.push(await driver.checked('SOCD', () => driver.kb.getSocd(key, protocol)));
  }
  return {
    protocol, physical, registers, socd,
    profile: await driver.checked('Profile', () => driver.kb.getApi({ type: 'ORDER_TYPE_CONFIG' })),
    rate: await driver.checked('Rate', () => driver.kb.getApi({ type: 'ORDER_TYPE_ROES' })),
    system: await driver.checked('System', () => driver.kb.getApi({ type: 'ORDER_TYPE_QUERY_WIN_MODEL' })),
    global: await driver.readGlobalPerformance(), lighting: await driver.readLighting(),
    customLighting: await driver.readCustomLighting(),
  };
}
try {
  await driver.sendRawSync({ sendReport: (_, packet) => transport.send(packet) });
  const settings = await snapshot();
  await mkdir(new URL('../.persistence-check/', import.meta.url), { recursive: true });
  if (capture) {
    await writeFile(baselinePath, JSON.stringify({ capturedAt: new Date().toISOString(), settings }, null, 2), { flag: 'wx' });
    await driver.saveSettings();
    console.log(`BASELINE_CAPTURED: ${settings.physical.length} keys, ${settings.registers.length} registers; save ACK received. Disconnect USB power for 5 seconds, reconnect, then run without --capture.`);
  } else {
    const changed = Object.keys(settings).filter(key => !isDeepStrictEqual(baseline.settings[key], settings[key]));
    const result = { verifiedAt: new Date().toISOString(), match: !changed.length, changed, before: baseline, after: settings,
      limits: ['Current hardware profile only', 'Macro event bytes and calibration extrema are not readable by this check', 'Physical power removal must be performed by the owner'] };
    await writeFile(resultPath, JSON.stringify(result, null, 2));
    if (changed.length) { console.error(`PERSISTENCE_MISMATCH: ${changed.join(', ')}. Baseline and result preserved.`); process.exitCode = 1; }
    else console.log(`PERSISTENCE_MATCH: ${settings.physical.length} keys, ${settings.registers.length} registers, RGB, per-key colors, SOCD, polling, system and profile all match the pre-unplug snapshot.`);
  }
} finally { transport.close(); }
