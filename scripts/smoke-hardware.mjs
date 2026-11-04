import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import Keyboard from '@sparklinkplayjoy/sdk-keyboard';
import { AulaKeyboard } from '../src/aula.js';
import { installKeyboard, connectKeyboard } from '../tests/browser/keyboard-fixture.js';
import { createHidTransport } from './hardware-transport.mjs';

const transport = createHidTransport();
const driver = new AulaKeyboard();
driver.kb = new Keyboard({ configs: [], usage: 1, usagePage: 0xffa0 });
driver.state = { protocolVersion: '1.0.9' };
driver.kb.deviceBase.sendData = async packet => {
  const response = await transport.send(packet);
  return Uint8Array.from(response.slice(4, 4 + response[1]));
};
let browser, original;
try {
  await driver.sendRawSync({ sendReport: (_, packet) => transport.send(packet) });
  original = structuredClone(await driver.readLighting());
  browser = await chromium.launch();
  const context = await browser.newContext(); const page = await context.newPage();
  await page.exposeBinding('hardwareSend', (_, packet) => transport.send(packet));
  await installKeyboard(page, { hardware: true });
  await page.goto(process.env.STUDIO_URL || 'http://127.0.0.1:5199/#rgb');
  await connectKeyboard(page);
  console.log('HARDWARE_UI_CONNECTED');
  await page.locator('#nav [data-view="rgb"]').click();
  await page.locator('#rgbMode').selectOption('0');
  await page.locator('#rgbBrightness').press('End');
  await page.locator('#rgbPalette button').nth(0).click();
  await page.locator('#rgbHex').fill('#17dba0'); await page.locator('#rgbHex').press('Tab');
  await page.locator('#btnRgbApply').click();
  await page.locator('#btnRgbApply').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#btnRgbApply').disabled === false);
  const toast = await page.locator('#toast').innerText();
  assert.match(toast, /RGB salvati/);
  const actual = await driver.readLighting();
  assert.equal(actual.luminance, 4); assert.equal(actual.staticColor, 0); assert.equal(actual.colors[0], '#17dba0'); assert.equal(actual.open, true);
  console.log('BROWSER_TO_REAL_USB_RGB_PASS', JSON.stringify({ luminance: actual.luminance, selectedColor: actual.staticColor, color: actual.colors[0] }));
  await setTimeout(10000);
} finally {
  if (browser) await browser.close();
  if (original) { await driver.writeLighting(original); console.log('ORIGINAL_RGB_RESTORED'); }
  transport.close();
}
