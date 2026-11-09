import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installKeyboard, connectKeyboard } from './keyboard-fixture.js';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => { await installKeyboard(page); await page.goto('/'); });

test('disconnected entry exposes a single connect action and no configuration controls', async ({ page }) => {
  await expect(page.locator('#connectionScreen')).toBeVisible();
  await expect(page.locator('#workspace')).toBeHidden();
  await expect(page.getByRole('button')).toHaveCount(1);
  await page.goto('/#advanced');
  await expect(page.locator('#workspace')).toBeHidden();
  await connectKeyboard(page);
  await expect(page.locator('#connectionScreen')).toBeHidden();
  await expect(page.locator('section[data-view="advanced"]')).toBeVisible();
  await page.locator('#btnDisconnect').click();
  await expect(page.locator('#connectionScreen')).toBeVisible();
  await expect(page.locator('#workspace')).toBeHidden();
});

test('USB disconnection returns to entry screen', async ({ page }) => {
  await connectKeyboard(page);
  await page.evaluate(() => window.__keyboardFixture.disconnect());
  await expect(page.locator('#connectionScreen')).toBeVisible();
  await expect(page.locator('#workspace')).toBeHidden();
});

test('entry works without page overflow and passes accessibility in both themes', async ({ page }) => {
  for (const theme of ['dark', 'light']) {
    await page.evaluate(theme => localStorage.setItem('studio-theme', theme), theme);
    await page.reload();
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
  }
});

test('RGB brightness and palette indices match firmware, including rainbow', async ({ page }) => {
  await connectKeyboard(page); await page.locator('#nav [data-view="rgb"]').click();
  await expect(page.locator('#rgbBrightness')).toHaveAttribute('max', '4');
  await page.locator('#rgbBrightness').press('Home'); await page.locator('#rgbBrightness').press('ArrowRight');
  await page.locator('#rgbPalette button').nth(0).click();
  await page.locator('#rgbHex').fill('#aa1100'); await page.locator('#rgbHex').press('Tab');
  await page.locator('#btnRgbApply').click(); await expect(page.locator('#toast')).toContainText('RGB salvati');
  expect(await page.evaluate(() => ({ level: window.__keyboardFixture.ledBrightness, color: window.__keyboardFixture.light[42] }))).toEqual({ level: 1, color: 0 });
  await page.getByRole('button', { name: 'Arcobaleno', exact: true }).click();
  await page.locator('#btnRgbApply').click(); await expect(page.locator('#btnRgbApply')).toHaveClass(/is-applied/);
  expect(await page.evaluate(() => window.__keyboardFixture.light[42])).toBe(7);
});

test('choosing an effect from zero brightness turns it on and preserves dynamic color selection', async ({ page }) => {
  await connectKeyboard(page); await page.locator('#nav [data-view="rgb"]').click();
  await page.locator('#rgbBrightness').press('Home');
  await page.locator('#rgbMode').selectOption('3');
  await page.locator('#rgbPalette button').nth(3).click();
  await page.locator('#btnRgbApply').click(); await expect(page.locator('#btnRgbApply')).toHaveClass(/is-applied/);
  await expect(page.locator('#toast')).toContainText('RGB salvati');
  expect(await page.evaluate(() => [38, 39, 42, 43].map(i => window.__keyboardFixture.light[i]))).toEqual([4, 3, 0, 3]);
  await expect(page.locator('#rgbPalette button').nth(3)).toHaveAttribute('aria-pressed', 'true');
});

test('MPT writes three ordered points and END writes release behavior', async ({ page }) => {
  await connectKeyboard(page); await page.locator('#nav [data-view="advanced"]').click();
  await page.locator('#kbdAdvanced [data-key="4"]').click();
  await page.locator('[data-advanced-mode="mpt"]').click();
  await expect(page.locator('#advancedThirdLabel')).toBeVisible();
  await page.locator('#advancedThird').selectOption('7');
  await page.locator('#btnAdvancedApply').click(); await expect(page.locator('#btnAdvancedApply')).toHaveClass(/is-applied/); await expect(page.locator('#toast')).toContainText('Configurazione assegnata');
  expect(await page.evaluate(() => [5, 6, 7, 8].map(i => window.__keyboardFixture.registers.get(`4:${i}`)))).toEqual([500, 2000, 3000, 34]);
  await page.locator('[data-advanced-mode="end"]').click();
  await page.locator('#btnAdvancedApply').click(); await expect(page.locator('#btnAdvancedApply')).toHaveClass(/is-applied/); await expect(page.locator('#toast')).toContainText('Configurazione assegnata');
  expect(await page.evaluate(() => window.__keyboardFixture.registers.get('4:8') & 15)).toBe(5);
});

test('four-action DKS timeline reaches the real SDK and register verification', async ({ page }) => {
  await connectKeyboard(page); await page.locator('#nav [data-view="advanced"]').click();
  await page.locator('#kbdAdvanced [data-key="4"]').click();
  await page.locator('[data-advanced-mode="dks"]').click();
  await expect(page.locator('#advancedFourthLabel')).toBeVisible();
  await expect(page.locator('#dksPhases button')).toHaveCount(28);
  await page.locator('#advancedThird').selectOption('7'); await page.locator('#advancedFourth').selectOption('22');
  await page.locator('#btnAdvancedApply').click(); await expect(page.locator('#toast')).toContainText('Configurazione assegnata');
  expect(await page.evaluate(() => [9, 10, 11, 12].map(i => window.__keyboardFixture.registers.get(`4:${i}`)))).toEqual([4, 224, 7, 22]);
});

test('macro recording, export and binding are functional', async ({ page }) => {
  await connectKeyboard(page); await page.locator('#nav [data-view="advanced"]').click();
  await page.locator('#kbdAdvanced [data-key="4"]').click();
  await page.locator('[data-advanced-mode="macro"]').click();
  await page.locator('#btnMacroRecord').click(); await page.keyboard.press('b'); await page.keyboard.press('Escape');
  await expect(page.locator('#macroEvents tr')).toHaveCount(2);
  const download = page.waitForEvent('download'); await page.locator('#btnMacroExport').click();
  expect((await download).suggestedFilename()).toBe('win60-macro.json');
  await page.locator('#btnAdvancedApply').click(); await expect(page.locator('#toast')).toContainText('Configurazione assegnata');
  expect(await page.evaluate(() => window.__keyboardFixture.registers.get('4:8') & 15)).toBe(6);
  await expect(page.locator('#btnAdvancedApply')).toBeDisabled();
  await page.locator('#nav [data-view="backup"]').click();
  const backupDownload = page.waitForEvent('download'); await page.locator('#btnBackup').click();
  const backup = JSON.parse(await readFile(await (await backupDownload).path(), 'utf8'));
  expect(backup.macros).toHaveLength(1); expect(backup.macros[0].events).toHaveLength(2);
  await page.locator('#nav [data-view="advanced"]').click(); await page.locator('#kbdAdvanced [data-key="7"]').click();
  await page.locator('#btnAdvancedApply').click(); await expect(page.locator('#btnAdvancedApply')).toBeEnabled();
  await expect(page.locator('#toast')).toContainText('buffer macro condiviso');
  expect(await page.evaluate(() => window.__keyboardFixture.registers.get('7:8') & 15)).toBe(0);
});

test('global actuation and system mode save through firmware commands', async ({ page }) => {
  await connectKeyboard(page); await page.locator('#nav [data-view="perf"]').click();
  await page.locator('[data-select="wasd"]').click(); await page.locator('#perfMode').selectOption('global');
  await page.locator('#btnPerfApply').click(); await expect(page.locator('#btnPerfApply')).toHaveClass(/is-applied/);
  await expect(page.locator('#toast')).toContainText('Salvato');
  expect(await page.evaluate(() => window.__keyboardFixture.registers.get('4:8'))).toBe(0);
  await page.locator('#nav [data-view="settings"]').click(); await page.locator('#deviceSystem').selectOption('mac');
  await page.locator('#btnSystemApply').click(); await expect(page.locator('#btnSystemApply')).toHaveClass(/is-applied/); await expect(page.locator('#toast')).toContainText('sistema verificata');
});
