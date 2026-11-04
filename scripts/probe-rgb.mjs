import { writeFile, mkdir } from 'node:fs/promises';
import Keyboard from '@sparklinkplayjoy/sdk-keyboard';
import { AulaKeyboard } from '../src/aula.js';

import { createHidTransport } from './hardware-transport.mjs';

const transport = createHidTransport();
const send = transport.send;

const driver = new AulaKeyboard((message, level) => console.log(`[${level || 'info'}] ${message}`));
driver.kb = new Keyboard({ configs: [], usage: 1, usagePage: 0xffa0 });
driver.state = { protocolVersion: '1.0.9' };
const trace = [];
driver.kb.deviceBase.sendData = async packet => {
  const response = await send(packet);
  trace.push({ tx: [...packet], rx: response });
  return Uint8Array.from(response.slice(4, 4 + response[1]));
};
try {
  await driver.sendRawSync({ sendReport: (_, packet) => send(packet) });
  console.log('PROTOCOL', await driver.checked('Protocollo', () => driver.kb.getApi({ type: 'ORDER_TYPE_PROTOCOL_VERSION' })));
  const lighting = await driver.checked('Lettura RGB', () => driver.kb.getLighting('1.0.9'));
  console.log('ACTUAL_LIGHTING', JSON.stringify(lighting));
  console.log('GLOBAL_PERFORMANCE', JSON.stringify(await driver.checked('Attuazione globale', () => driver.kb.getGlobalTouchTravel())));
  await mkdir('test-results', { recursive: true });
  await writeFile('test-results/rgb-hardware-read.json', JSON.stringify({ lighting, trace }, null, 2));
  if (process.argv.includes('--roundtrip')) {
    const original = structuredClone(lighting);
    try {
      const target = { ...original, type: 'static', mode: 0, open: true, luminance: 4, speed: 2, colors: original.colors.map(() => '#17dba0'), staticColor: 0, dynamicColorId: 0 };
      await driver.writeLighting(target);
      console.log('RGB_ROUNDTRIP_OK');
    } finally {
      await driver.writeLighting(original);
      console.log('ORIGINAL_RGB_RESTORED');
    }
  }
  if (process.argv.includes('--custom')) {
    const original = structuredClone(lighting);
    const color = await driver.checked('Colore originale A', () => driver.kb.getCustomLighting(4));
    driver.state.physical = [{ keyValue: 4 }]; driver.state.customLighting = [];
    try {
      await driver.applyLighting({ ...original, type: 'custom', mode: 21, open: true, luminance: 4, speed: 2 }, [{ key: 4, r: 23, g: 219, b: 160 }]);
      console.log('CUSTOM_RGB_ROUNDTRIP_OK');
    } finally {
      await driver.writeCustomLighting([{ key: 4, r: color.r ?? color.R, g: color.g ?? color.G, b: color.b ?? color.B }]);
      await driver.writeLighting(original);
      console.log('ORIGINAL_CUSTOM_RGB_RESTORED');
    }
  }
} finally {
  transport.close();
}
