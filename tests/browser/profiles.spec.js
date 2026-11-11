import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installKeyboard, connectKeyboard } from './keyboard-fixture.js';

test.beforeEach(async ({ page }) => {
  await installKeyboard(page); await page.goto('/'); await connectKeyboard(page);
  await page.locator('#nav [data-view="profiles"]').click();
});

test('named game profiles retain independent RGB, performance and mappings after switching and reloading', async ({ page }) => {
  await page.locator('#profileName').fill('VALORANT');
  await page.locator('#profileColor').fill('#ff3355');
  await page.locator('#profileEffect').selectOption('2');
  await page.locator('#btnProfileSave').click();
  await expect(page.locator('#toast')).toHaveText('Profilo salvato e verificato');
  await expect(page.locator('#profileActiveName')).toHaveText('VALORANT');
  await page.locator('#nav [data-view="perf"]').click();
  await page.locator('#gamePreset').selectOption('valorant');
  await page.locator('#btnGamePresetApply').click();
  await expect(page.locator('#btnGamePresetApply')).toHaveText('Preset applicato');
  await page.locator('#nav [data-view="keymap"]').click();
  await page.locator('#kbdMap [data-key="40"]').click();
  await page.locator('#mapTarget').selectOption('76');
  await page.locator('#btnMapApply').click();
  await expect(page.locator('#btnMapApply')).toHaveClass(/is-applied/);
  await page.locator('#nav [data-view="profiles"]').click();
  const first = await page.evaluate(() => window.__keyboardFixture.snapshot());
  await page.locator('#profileCards [data-profile="1"]').click();
  await expect(page.locator('#quickProfile')).toHaveValue('1');
  await expect(page.locator('#profileEffect')).toHaveValue('0');
  expect(await page.evaluate(() => window.__keyboardFixture.registers.get('40:0'))).toBe(40);
  expect(await page.evaluate(() => window.__keyboardFixture.registers.get('8:4'))).toBe(500);
  await page.locator('#profileName').fill('Fortnite');
  await page.locator('#profileColor').fill('#3366ff');
  await page.locator('#btnProfileSave').click();
  await expect(page.locator('#toast')).toHaveText('Profilo salvato e verificato');
  await page.locator('#quickProfile').selectOption('0');
  await expect(page.locator('#profileActiveName')).toHaveText('VALORANT');
  await expect(page.locator('#profileEffect')).toHaveValue('2');
  expect(await page.evaluate(() => window.__keyboardFixture.snapshot())).toEqual(first);
  await page.reload(); await connectKeyboard(page);
  await expect(page.locator('#profileName')).toHaveValue('VALORANT');
  await page.locator('#quickProfile').selectOption('1');
  await expect(page.locator('#profileName')).toHaveValue('Fortnite');
  await expect(page.locator('#profileColor')).toHaveValue('#3366ff');
  await expect(page.locator('#activeProfileDot')).toHaveCSS('background-color', 'rgb(51, 102, 255)');
});

test('Fn defaults install in every slot, keep settings intact and follow a firmware shortcut', async ({ page }) => {
  const original = await page.evaluate(() => window.__keyboardFixture.snapshot());
  await page.locator('#btnProfileShortcutDefaults').click();
  await page.locator('#btnProfileShortcuts').click();
  await expect(page.locator('#toast')).toHaveText('Scorciatoie salvate nei quattro profili');
  await expect(page.locator('#quickProfile')).toHaveValue('0');
  for (let slot = 0; slot < 4; slot++) {
    if (slot) await page.locator('#quickProfile').selectOption(String(slot));
    await expect(page.locator(`#profileCards [data-profile="${slot}"]`)).toHaveAttribute('aria-pressed', 'true');
    const state = await page.evaluate(() => window.__keyboardFixture.snapshot());
    expect(state.light).toEqual(original.light);
    for (let i = 0; i < 4; i++) expect(new Map(state.registers).get(`${30 + i}:1`)).toBe([0xf108, 0xf109, 0xf10a, 0xf10c][i]);
    expect(new Map(state.registers).get('1:0')).toBe(0xf001);
  }
  await page.evaluate(() => window.__keyboardFixture.pressProfileKey(31));
  await expect(page.locator('#quickProfile')).toHaveValue('1', { timeout: 6000 });
  await expect(page.locator('#profileCards [data-profile="1"]')).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => window.__keyboardFixture.powerCycle());
  await connectKeyboard(page);
  expect(await page.evaluate(() => new Map(window.__keyboardFixture.snapshot().registers).get('33:1'))).toBe(0xf10c);
});

test('shortcut validation blocks duplicate keys and preflights advanced conflicts before replacing any mappings', async ({ page }) => {
  await page.locator('#btnProfileShortcutDefaults').click();
  await page.locator('#profileShortcut1').selectOption('30');
  await expect(page.locator('#btnProfileShortcuts')).toBeDisabled();
  await page.locator('#btnProfileShortcutDefaults').click();
  await page.evaluate(() => {
    const model = window.__keyboardFixture;
    model.selectProfile(3); model.registers.set('30:8', 33); model.selectProfile(0);
  });
  await page.locator('#btnProfileShortcuts').click();
  await expect(page.locator('#toast')).toContainText('Rimuovi prima le azioni avanzate');
  expect(await page.evaluate(() => window.__keyboardFixture.snapshot().profile)).toBe(0);
  for (let slot = 0; slot < 4; slot++) {
    expect(await page.evaluate(slot => { window.__keyboardFixture.selectProfile(slot); return window.__keyboardFixture.registers.get('30:1'); }, slot)).toBe(1);
  }
});

test('failed save retains the draft and allows retry without falsely confirming the profile', async ({ page }) => {
  await page.locator('#profileName').fill('My game');
  await page.locator('#profileColor').fill('#1234ab');
  await page.evaluate(() => { window.__keyboardFixture.saveFailure = true; });
  await page.locator('#btnProfileSave').click();
  await expect(page.locator('#toast')).toContainText('Salvataggio permanente non confermato');
  await expect(page.locator('#profileName')).toHaveValue('My game');
  await expect(page.locator('#profileActiveName')).toHaveText('Profilo 1');
  await expect(page.locator('#btnProfileSave')).toBeEnabled();
  await page.evaluate(() => { window.__keyboardFixture.saveFailure = false; });
  await page.locator('#btnProfileSave').click();
  await expect(page.locator('#toast')).toHaveText('Profilo salvato e verificato');
  await expect(page.locator('#profileActiveName')).toHaveText('My game');
});

test('renaming preserves per-key RGB and user names are never translated', async ({ page }) => {
  await page.evaluate(() => { window.__keyboardFixture.light[39] = 21; });
  await page.locator('#nav [data-view="settings"]').click();
  await page.locator('#btnRefresh').click();
  await expect(page.locator('#btnRefresh')).toHaveText('Rileggi dispositivo');
  await page.locator('#nav [data-view="profiles"]').click();
  await page.locator('#profileName').fill('Onde');
  await page.locator('#btnProfileSave').click();
  await expect(page.locator('#toast')).toHaveText('Profilo salvato e verificato');
  expect(await page.evaluate(() => window.__keyboardFixture.light[39])).toBe(21);
  await page.locator('#languageSelect').selectOption('en');
  await expect(page.locator('#profileActiveName')).toHaveText('Onde');
  await expect(page.locator('#profileCards [data-profile="0"]')).toContainText('Onde');
});

test('profile controls are gated by hardware support and a failed switch never selects the destination', async ({ page }) => {
  await page.evaluate(() => { window.__keyboardFixture.profileSwitchFailure = true; });
  await page.locator('#quickProfile').selectOption('1');
  await expect(page.locator('#toast')).toContainText('Profilo non verificato');
  await expect(page.locator('#quickProfile')).toHaveValue('0');
  await expect(page.locator('#profileCards [data-profile="1"]')).toHaveAttribute('aria-pressed', 'false');
  await page.evaluate(() => { window.__keyboardFixture.profileUnsupported = true; });
  await page.locator('#nav [data-view="settings"]').click();
  await page.locator('#btnRefresh').click();
  await expect(page.locator('#quickProfile')).toBeDisabled();
  await page.locator('#nav [data-view="profiles"]').click();
  await expect(page.locator('#profileName')).toBeDisabled();
  await expect(page.locator('#btnProfileShortcuts')).toBeDisabled();
});

test('direct Base shortcuts persist and existing assignments are shown after reload', async ({ page }) => {
  await page.locator('#profileShortcutLayer').selectOption('0');
  await page.locator('#profileShortcut3').selectOption('101');
  await page.locator('#btnProfileShortcuts').click();
  await expect(page.locator('#toast')).toHaveText('Scorciatoie salvate nei quattro profili');
  await page.evaluate(() => window.__keyboardFixture.pressProfileKey(101, 0));
  await expect(page.locator('#quickProfile')).toHaveValue('3');
  await page.reload(); await connectKeyboard(page);
  await page.locator('#profileShortcutLayer').selectOption('0');
  await expect(page.locator('#profileShortcut3')).toHaveValue('101');
  expect(await page.evaluate(() => window.__keyboardFixture.registers.get('1:0'))).toBe(0xf001);
});

test('profiles remain usable at narrow widths and accessible in both themes', async ({ page }) => {
  await page.locator('#profileName').fill('M'.repeat(40));
  await page.locator('#btnProfileSave').click();
  await expect(page.locator('#toast')).toHaveText('Profilo salvato e verificato');
  for (const theme of ['dark', 'light']) {
    await page.locator('#themeSelect').selectOption(theme);
    const results = await new AxeBuilder({ page }).include('section[data-view="profiles"]').analyze();
    expect(results.violations).toEqual([]);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: 'test-results/profiles.png', fullPage: true });
});
