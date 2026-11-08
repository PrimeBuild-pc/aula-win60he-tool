import test from 'node:test';
import assert from 'node:assert/strict';
import Keyboard from '@sparklinkplayjoy/sdk-keyboard';
import protocol from '@sparklinkplayjoy/protocol-keyboard';
import { AulaKeyboard } from '../../src/aula.js';
import { DEFAULT_LIGHT } from '../../src/settings.js';

function device(keys = [4, 7, 26, 22, 1]) {
  const aula = new AulaKeyboard();
  aula.kb = new Keyboard({ configs: [], usage: 1, usagePage: 0xffa0 });
  const registers = new Map();
  for (const key of keys) for (const [layout, value] of [[0, key === 1 ? 0xf001 : key], [1, 1], [2, 1], [3, 1], [8, 32], [4, 500], [20, 150], [21, 150], [22, 150], [23, 150]]) registers.set(`${key}:${layout}`, value);
  const physical = keys.map((keyValue, i) => ({ keyValue, row: 1, col: i }));
  aula.state = {
    physical, performances: physical.map(p => ({ ...p, touchMode: 'rt', advancedKeyMode: 0 })),
    layers: [0, 1, 2, 3].map(layout => keys.map(key => ({ key, layout, value: registers.get(`${key}:${layout}`) }))),
    layerMaps: [0, 1, 2, 3].map(layout => new Map(keys.map(key => [key, registers.get(`${key}:${layout}`)]))),
    protocolVersion: '1.0.9', socd: [], customLighting: [], lighting: structuredClone(DEFAULT_LIGHT), rateIndex: 0, config: { hasFourConfig: true, configID: 0 },
  };
  const packets = [], colors = new Map();
  const rs = new Map();
  let pair;
  let lightPayload = protocol.lightingProtocol.cmdPRGB(false, DEFAULT_LIGHT, '1.0.9').slice(4, 52);
  let active = 0;
  let writes = 0;
  let rate = 0, profile = 0;
  aula.kb.deviceBase.sendData = async packet => {
    packets.push([...packet]);
    assert.equal(++active, 1, 'USB operations must never overlap');
    await new Promise(resolve => setTimeout(resolve, 0));
    active--;
    const data = packet.slice(4, 4 + packet[1]);
    const write = data[0] === 1;
    if (write) writes++;
    if (packet[2] === 0) {
      const command = data[0];
      if (command === 2) return Uint8Array.from([0, 2, 255, 255]);
      if (command === 80) {
        if (data[1] !== 255) rate = data[1];
        return Uint8Array.from([0, 80, rate]);
      }
      if (command === 112) {
        if (data[1] !== 255) profile = data[1];
        return Uint8Array.from([0, 112, profile]);
      }
      if ([12, 13].includes(command)) return Uint8Array.from([0, command, 1]);
    }
    if (packet[2] === 0x23) {
      const result = Uint8Array.from(data);
      for (let i = 1; i + 3 < data.length; i += 4) {
        const address = `${data[i]}:${data[i + 1]}`;
        if (write) registers.set(address, data[i + 2] | data[i + 3] << 8);
        const value = registers.get(address) ?? 0;
        result[i + 2] = value & 255; result[i + 3] = value >> 8;
      }
      return result;
    }
    if (packet[2] === 0x2c) {
      if (write) {
        pair = data;
        for (const key of [data[1], data[2]]) registers.set(`${key}:8`, (registers.get(`${key}:8`) & 0xf0) | 8);
      }
      return pair;
    }
    if (packet[2] === 36) {
      for (let i = 0; i < 4; i++) registers.set(`${data[1]}:${9 + i}`, data[2 + i * 2] | data[3 + i * 2] << 8);
      registers.set(`${data[1]}:19`, data[10]);
      return data;
    }
    if (packet[2] === 38) {
      const key = data[1];
      for (let i = 0; i < 4; i++) {
        registers.set(`${key}:${9 + i}`, data[2 + i * 2] | data[3 + i * 2] << 8);
        registers.set(`${key}:${13 + i}`, data[10 + i]);
      }
      registers.set(`${key}:5`, data[14] | data[15] << 8);
      registers.set(`${key}:7`, data[16] | data[17] << 8);
      return Uint8Array.from([1, key, 9, data[2], data[3]]);
    }
    if (packet[2] === protocol.higherKeyProtocol.cmdRS(true, { key: 4, dks: 0 })[2]) {
      if (write) { rs.set(data[1], data[2]); rs.set(data[2], data[1]); }
      return Uint8Array.from([data[0], data[1], rs.get(data[1]) ?? 0]);
    }
    if (packet[2] === protocol.higherKeyProtocol.cmdTGL(false, { key: 4, dks: 7, delay: 200 })[2]) {
      registers.set(`${data[1]}:9`, data[2] | data[3] << 8);
      registers.set(`${data[1]}:19`, data[4]);
      return data;
    }
    if (packet[2] === protocol.lightingProtocol.cmdPRGB(true, DEFAULT_LIGHT, '1.0.9')[2]) {
      if (write) lightPayload = data;
      return lightPayload;
    }
    if (packet[2] === protocol.lightingProtocol.cmdSingleRGB(true, { key: 4 })[2]) {
      const key = data[1];
      if (write && key !== 254) colors.set(key, { r: data[2], g: data[3], b: data[4] });
      const color = colors.get(key) || { r: 0, g: 0, b: 0 };
      return Uint8Array.from([data[0], key, color.r, color.g, color.b]);
    }
    throw new Error(`Unexpected test command ${packet[2]}`);
  };
  // This packet-level fixture has no native USB enumeration; browser tests cover the restart itself.
  aula.reconnectAfterRateChange = async index => {
    const stored = await aula.checked('Verifica polling', () => aula.kb.getApi({ type: 'ORDER_TYPE_ROES' }));
    assert.equal(stored, index);
    await aula.saveSettings();
  };
  return { aula, registers, packets, writes: () => writes };
}

test('real SDK packets write and verify mapping; cached backup layer updates', async () => {
  const { aula, registers } = device();
  await aula.setMapping(0, 4, 7);
  assert.equal(registers.get('4:0'), 7);
  assert.equal(aula.state.layers[0].find(p => p.key === 4).value, 7);
  assert.equal(aula.state.layerMaps[0].get(4), 7);
  await assert.rejects(aula.setMapping(0, 1, 4), /Fn/);
});

test('padding entries from the SDK do not leak into layers or backups', async () => {
  const { aula } = device();
  const layer = await aula.readLayer(0);
  assert.equal(layer.length, 5);
  assert.ok(layer.every(p => Number.isInteger(p.key)));
});

test('real SDK performance writes are sequential, preserve SOCD and read back values', async () => {
  const { aula, registers } = device();
  registers.set('4:8', 40);
  await aula.writeKeyPerf([4, 7], { touchMode: 'rt', actuation: 0.45, rtPress: 0.12, rtRelease: 0.17, pressDead: 0.1, releaseDead: 0.2 });
  assert.equal(registers.get('4:8'), 40);
  assert.equal(registers.get('4:4'), 450);
  assert.equal(registers.get('7:21'), 170);
});

test('SOCD packet uses physical positions and modern KB2 mode offset', async t => {
  t.mock.method(console, 'log', () => {});
  const { aula, packets } = device();
  await aula.applySocd(3, [4, 7]);
  const packet = packets.find(p => p[2] === 0x2c && p[4] === 1);
  assert.deepEqual(packet.slice(4, 15), [1, 4, 7, 0, 0, 0, 0, 0, 3, 0, 0]);
  assert.equal(aula.state.socd[0].mode, 3);
  await aula.removeSocd([4, 7]);
  assert.equal(aula.state.socd.length, 0);
});

test('RGB round trip uses seven-color KB2 packet and persists per-key colors', async () => {
  const { aula } = device();
  const light = structuredClone(DEFAULT_LIGHT);
  light.colors[0] = '#ff0080';
  const stored = await aula.writeLighting(light);
  assert.equal(stored.colors[0], '#ff0080');
  await aula.writeCustomLighting([{ key: 4, r: 20, g: 30, b: 40 }]);
  assert.deepEqual(aula.state.customLighting, [{ key: 4, r: 20, g: 30, b: 40 }]);
  await aula.writeLighting({ ...light, open: false });
  assert.equal(aula.state.lighting.open, false);
});

test('failed readback and SDK Error return never become success', async () => {
  const { aula } = device();
  aula.kb.getLayoutKeyInfo = async () => [{ key: 4, layout: 0, value: 4 }];
  await assert.rejects(aula.setMapping(0, 4, 7), /non verificata/);
  aula.kb.setPerformanceMode = async () => new Error('USB disconnected');
  await assert.rejects(aula.writeKeyPerf([4], { touchMode: 'rt', actuation: 0.5, rtPress: 0.1, rtRelease: 0.1, pressDead: 0, releaseDead: 0 }), /USB disconnected/);
});

test('malformed backup cannot start writes; legacy nulls never become zero', async () => {
  const { aula, writes, registers } = device();
  aula.backup = { schema: 4, layers: [[{ key: 4, value: -1 }]], performances: [] };
  await assert.rejects(aula.restoreBackup());
  assert.equal(writes(), 0);
  aula.backup = { schema: 3, layers: [], performances: [{ keyValue: 4, touchMode: 'rt', advancedKeyMode: 0, single: null, rtPress: null, rtRelease: null, pressDead: null, releaseDead: null }] };
  await aula.restoreBackup();
  assert.equal(registers.get('4:4'), 500);
  assert.equal(registers.get('4:20'), 150);
});

test('complete backup reads every key including RGB, and captures current mappings', async () => {
  const { aula, registers } = device();
  registers.set('4:0', 7);
  const backup = await aula.captureBackup();
  assert.equal(backup.schema, 4);
  assert.equal(backup.performances.length, 5);
  assert.equal(backup.customLighting.length, 5);
  assert.ok(backup.performances.every(p => p.single === 0.5 && p.rtPress === 0.15));
  assert.equal(backup.layers[0].find(p => p.key === 4).value, 7);
});

test('hardware profile and polling changes are read back through the real SDK', async t => {
  t.mock.method(console, 'log', () => {});
  const { aula } = device();
  await aula.setRate(3);
  assert.equal(aula.state.rateIndex, 3);
  await aula.switchProfile(2);
  await assert.rejects(aula.switchProfile(4));
});

test('generic calibration ACK is accepted while a missing response is rejected', async t => {
  t.mock.method(console, 'log', () => {});
  const { aula } = device();
  assert.equal(await aula.checked('Calibrazione', () => aula.kb.calibrationStart(), true), null);
  assert.equal(await aula.checked('Calibrazione', () => aula.kb.calibrationEnd(), true), null);
  aula.kb.deviceBase.sendData = async () => { throw new Error('no response'); };
  await assert.rejects(aula.checked('Calibrazione', () => aula.kb.calibrationStart(), true), /no response/);
});

test('Mod-Tap and Toggle payloads preserve thresholds and reject Fn', async () => {
  const { aula, registers } = device();
  await aula.writeAdvanced(4, 'mt', { first: 4, second: 224, delay: 200, travel: 2 });
  assert.equal(registers.get('4:8') & 15, 3);
  assert.equal(registers.get('4:9'), 4);
  assert.equal(registers.get('4:10'), 224);
  assert.equal(registers.get('4:19'), 20);
  await aula.writeAdvanced(7, 'tgl', { first: 7, second: 224, delay: 200, travel: 2 });
  assert.equal(registers.get('7:8') & 15, 4);
  assert.equal(registers.get('7:19'), 20);
  await assert.rejects(aula.writeAdvanced(1, 'mt', { first: 4, second: 224, delay: 200, travel: 2 }), /Fn/);
});

test('advanced backup round trip restores payloads and modes after base performance', async t => {
  t.mock.method(console, 'log', () => {});
  const { aula, registers } = device();
  await aula.writeAdvanced(4, 'mt', { first: 4, second: 224, delay: 200, travel: 2 });
  const backup = await aula.captureBackup();
  assert.equal(backup.advanced[0].mode, 3);
  aula.loadBackup(structuredClone(backup));
  registers.set('4:9', 7); registers.set('4:8', 32); registers.set('4:19', 10);
  await aula.restoreBackup();
  assert.equal(registers.get('4:9'), 4);
  assert.equal(registers.get('4:19'), 20);
  assert.equal(registers.get('4:8') & 15, 3);
});

test('DKS writes and reads back both thresholds and all transition masks', async t => {
  t.mock.method(console, 'log', () => {});
  const { aula, registers } = device();
  await aula.writeAdvanced(4, 'dks', { first: 4, second: 7, delay: 200, travel: 2 });
  assert.equal(registers.get('4:5'), 500);
  assert.equal(registers.get('4:7'), 2000);
  assert.equal(registers.get('4:13'), 1);
  assert.equal(registers.get('4:8') & 15, 1);
});

test('Rappy Snappy enables and removes both members of a pair', async t => {
  t.mock.method(console, 'log', () => {});
  const { aula, registers } = device();
  await aula.writeAdvanced(4, 'rs', { first: 7, second: 4, delay: 200, travel: 2 });
  assert.equal(registers.get('4:8') & 15, 9);
  assert.equal(registers.get('7:8') & 15, 9);
  await aula.removeAdvanced(4);
  assert.equal(registers.get('4:8') & 15, 0);
  assert.equal(registers.get('7:8') & 15, 0);
});


test('game presets clear SOCD, target only game keys and preserve mapping and RGB', async () => {
  const keys = [4, 7, 26, 22, 20, 8, 21, 9, 6, 25, 27, 224, 225, 44, 40, 1];
  const { aula, registers } = device(keys);
  await aula.applySocd(0);
  await aula.applySocd(0, [26, 22]);
  const before = structuredClone(aula.state.lighting);
  await aula.applyGamePreset('cs2');
  assert.equal(registers.get('4:4'), 700);
  assert.equal(registers.get('4:20'), 300);
  assert.equal(registers.get('8:4'), 1500);
  assert.equal((await aula.readKeyPerf(8)).touchMode, 'single');
  assert.equal((await aula.readKeyPerf(4)).advancedKeyMode, 0);
  assert.equal((await aula.readKeyPerf(26)).advancedKeyMode, 0);
  assert.equal(registers.get('40:4'), 500);
  assert.equal(registers.get('4:0'), 4);
  assert.equal(registers.get('4:1'), 1);
  assert.equal(aula.state.rateIndex, 3);
  assert.deepEqual(aula.state.lighting, before);
  assert.deepEqual(aula.state.socd, []);
  await aula.applyGamePreset('socd');
  assert.equal((await aula.readKeyPerf(4)).advancedKeyMode, 8);
  assert.equal(aula.state.socd[0].mode, 0);
  await aula.applyGamePreset('racing');
  assert.equal((await aula.readKeyPerf(4)).touchMode, 'single');
  assert.deepEqual(aula.state.socd, []);
});

test('preset preflight rejects advanced conflicts and invalid input before writes', async () => {
  const { aula, registers, writes } = device();
  registers.set('7:8', 33);
  await assert.rejects(aula.applyGamePreset('cs2'), /azioni avanzate/);
  await assert.rejects(aula.applyGamePreset('unknown'), /Preset/);
  await assert.rejects(aula.applyGamePreset('cs2', { rateIndex: 7 }), /Polling/);
  assert.equal(writes(), 0);
});


test('explicit save uses the documented KB2 command and rejects missing or wrong ACKs', async () => {
  const { aula, packets } = device();
  await aula.saveSettings();
  assert.deepEqual(packets.at(-1).slice(0, 7), [92, 3, 0, 147, 2, 255, 255]);
  aula.kb.deviceBase.sendData = async () => { const ack = new Uint8Array(60); ack.set([0, 2, 255, 255]); return ack; };
  await aula.saveSettings();
  for (const ack of [null, false, new Error('Transport failed'), Uint8Array.from([0, 2, 0, 0]), Uint8Array.from([0, 3, 255, 255])]) {
    aula.kb.deviceBase.sendData = async () => ack;
    await assert.rejects(aula.saveSettings());
  }
});
