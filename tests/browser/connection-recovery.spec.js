import { test, expect } from '@playwright/test';
import { installKeyboard, connectKeyboard } from './keyboard-fixture.js';

test('normal USB response latency allows connection and every game preset', async ({ page }) => {
  test.setTimeout(60000);
  await installKeyboard(page); await page.goto('/');
  await page.evaluate(() => { window.__keyboardFixture.replyDelayMs = 15; });
  await connectKeyboard(page);
  await page.locator('#nav [data-view="perf"]').click();
  for (const preset of ['cs2', 'valorant', 'fps-fast', 'fortnite', 'socd', 'racing', 'balanced']) {
    await page.locator('#gamePreset').selectOption(preset);
    await page.locator('#btnGamePresetApply').click();
    await expect(page.locator('#presetStatus')).toHaveText('Preset salvato e verificato', { timeout: 10000 });
  }
});

test('Fortnite does not restart USB by rewriting the existing polling rate', async ({ page }) => {
  await installKeyboard(page, { rateIndex: 3 }); await page.goto('/'); await connectKeyboard(page);
  await page.evaluate(() => { window.__keyboardFixture.rebootOnRateWrite = true; });
  await page.locator('#nav [data-view="perf"]').click();
  await page.locator('#gamePreset').selectOption('fortnite');
  await page.locator('#btnGamePresetApply').click();
  await expect(page.locator('#presetStatus')).toHaveText('Preset salvato e verificato', { timeout: 7000 });
  expect(await page.evaluate(() => window.__keyboardFixture.rateWriteCount)).toBe(0);
});

test('a real polling change reconnects after USB restart and retains the preset', async ({ page }) => {
  await installKeyboard(page); await page.goto('/'); await connectKeyboard(page);
  await page.evaluate(() => { window.__keyboardFixture.rebootOnRateWrite = true; window.__keyboardFixture.rebootDelayMs = 3500; });
  await page.locator('#nav [data-view="perf"]').click();
  await page.locator('#gamePreset').selectOption('fortnite');
  await page.locator('#btnGamePresetApply').click();
  await expect(page.locator('#presetStatus')).toHaveText('Preset salvato e verificato', { timeout: 12000 });
  await expect(page.locator('#workspace')).toBeVisible();
  expect(await page.evaluate(() => window.__keyboardFixture.registers.get('26:4'))).toBe(500);
  expect(await page.evaluate(() => window.__keyboardFixture.registers.get('20:4'))).toBe(800);
  expect(await page.evaluate(() => window.__keyboardFixture.permissionRequests)).toBe(0);
});

test('an unresponsive keyboard cannot leave Connect and read disabled forever', async ({ page }) => {
  await installKeyboard(page); await page.goto('/');
  await page.evaluate(() => { window.__keyboardFixture.dropReplies = true; });
  await page.locator('#btnEntryConnect').click();
  await expect(page.locator('#btnEntryConnect')).toBeEnabled({ timeout: 6500 });
  await page.evaluate(() => { window.__keyboardFixture.dropReplies = false; });
  await connectKeyboard(page);
  await expect(page.locator('#bootError')).toBeHidden();
});

test('USB disconnect during a preset releases Connecting and allows a new session', async ({ page }) => {
  await installKeyboard(page); await page.goto('/'); await connectKeyboard(page);
  await page.locator('#nav [data-view="perf"]').click();
  await page.locator('#gamePreset').selectOption('valorant');
  await page.evaluate(() => { window.__keyboardFixture.unplugOnNextWrite = true; });
  await page.locator('#btnGamePresetApply').click();
  await expect(page.locator('#connectionScreen')).toBeVisible();
  await expect(page.locator('#btnEntryConnect')).toBeEnabled({ timeout: 4000 });
  await expect(page.locator('#btnEntryConnect')).not.toContainText('Connessione e lettura');
  await connectKeyboard(page);
  await expect(page.locator('#bootError')).toBeHidden();
});
