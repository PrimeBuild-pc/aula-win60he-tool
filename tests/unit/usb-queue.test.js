import test from 'node:test';
import assert from 'node:assert/strict';
import Keyboard from '@sparklinkplayjoy/sdk-keyboard';
import { guardUsbQueue } from '../../src/usb-queue.js';

const packet = new Uint8Array(64);
function setup(t, respond) {
  const base = new Keyboard({ configs: [], usage: 1, usagePage: 0xffa0 }).deviceBase;
  const previousDevice = base.hidService.device;
  base.hidService.device = { collections: [{ usagePage: 0xffa0 }] };
  t.after(() => { base.hidService.device = previousDevice; });
  t.mock.method(base.hidService, 'sendReportAndWaitResponse', respond);
  const faults = [];
  guardUsbQueue(base, { timeoutMs: 20, onFailure: error => faults.push(error) });
  return { base, faults };
}

test('missing replies and transport errors reject and drain every queued SDK promise', async t => {
  for (const response of [null, new Error('device disconnected')]) {
    const { base, faults } = setup(t, async () => { if (response instanceof Error) throw response; return response; });
    const results = await Promise.allSettled([base.sendData(packet), base.sendData(packet)]);
    assert.ok(results.every(r => r.status === 'rejected' && r.reason.code === 'USB_CONNECTION_LOST'));
    assert.equal(faults.length, 1);
    assert.equal(base.commandQueueWrapper.commandQueue.length, 0);
    assert.equal(base.commandQueueWrapper.isFlushing, false);
  }
});

test('a transport promise that never settles has a bounded deadline and can be reset on reconnect', async t => {
  const { base, faults } = setup(t, () => new Promise(() => {}));
  await assert.rejects(base.sendData(packet), error => error.code === 'USB_CONNECTION_LOST');
  assert.equal(faults.length, 1);
  t.mock.method(base.hidService, 'sendReportAndWaitResponse', async () => {
    const response = new Uint8Array(64); response.set([0x5c, 4, 128, 0, 0, 2, 255, 255]);
    return new DataView(response.buffer);
  });
  guardUsbQueue(base);
  assert.deepEqual([...await base.sendData(packet)].slice(0, 4), [0, 2, 255, 255]);
});

test('multiple-response failures reject instead of hanging', async t => {
  const { base } = setup(t, async () => null);
  t.mock.method(base.hidService, 'sendReportAndWaitMultipleResponses', async () => []);
  await assert.rejects(base.sendDataAndWaitMultiple(packet, 3), error => error.code === 'USB_CONNECTION_LOST');
  assert.equal(base.commandQueueWrapperMultiple.commandQueue.length, 0);
  const reports = Array.from({ length: 3 }, () => new DataView(new ArrayBuffer(64)));
  t.mock.method(base.hidService, 'sendReportAndWaitMultipleResponses', async () => reports);
  guardUsbQueue(base);
  assert.equal(await base.sendDataAndWaitMultiple(packet, 3), reports);
});
