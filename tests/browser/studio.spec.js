import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installKeyboard, connectKeyboard } from './keyboard-fixture.js';

test.beforeEach(async ({ page }) => {
  await installKeyboard(page);
  await page.goto('/');
  await connectKeyboard(page);
  await expect(page.locator('#bootError')).toBeHidden();
  await expect(page.locator('#kbdOverview .key')).toHaveCount(61);
});

test('all views navigate, deep links and browser back work', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const view of ['keymap', 'perf', 'rgb', 'socd', 'advanced', 'test', 'backup', 'settings', 'log']) {
    await page.locator(`#nav [data-view="${view}"]`).click();
    await expect(page.locator(`section[data-view="${view}"]`)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`#${view}$`));
  }
  await page.goBack();
  await expect(page.locator('section[data-view="settings"]')).toBeVisible();
  await page.reload();
  await connectKeyboard(page);
  await expect(page.locator('section[data-view="settings"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('mapping search, physical capture and Fn protection', async ({ page }) => {
  await page.locator('#nav [data-view="keymap"]').click();
  await page.locator('#kbdMap [data-key="4"]').click();
  await expect(page.locator('#mapEmpty')).toBeHidden();
  await page.locator('#mapSearch').fill('volume');
  await expect(page.locator('#mapChoices button')).toHaveCount(11);
  await page.locator('#mapChoices button').filter({ hasText: 'Vol+' }).click();
  await expect(page.locator('#mapTo')).toHaveText('Vol+');
  await page.locator('#btnMapCapture').click();
  await page.keyboard.press('F5');
  await expect(page.locator('#mapTarget')).toHaveValue('62');
  await expect(page.locator('#mapDraft')).toHaveText('Modifica da salvare');
  await page.locator('#kbdMap [data-key="1"]').click();
  await expect(page.locator('#btnMapApply')).toBeDisabled();
});

test('RGB draft paints keys and writes through the actual browser SDK', async ({ page }) => {
  await page.locator('#nav [data-view="rgb"]').click();
  await expect(page.locator('#kbdRgb .key')).toHaveCount(61);
  await page.locator('[data-rgb-select="wasd"]').click();
  await page.locator('#rgbHex').fill('#ff00aa');
  await page.locator('#rgbHex').press('Tab');
  await page.locator('#btnRgbPaint').click();
  await expect(page.locator('#rgbMode')).toHaveValue('21');
  await expect(page.locator('#rgbSelection')).toHaveText('4 tasti selezionati');
  expect(await page.locator('#kbdRgb [data-key="4"]').evaluate(el => el.style.getPropertyValue('--rgb'))).toBe('rgb(255 0 170)');
  await page.locator('#btnRgbApply').click();
  await expect(page.locator('#toast')).toContainText('RGB salvati');
  expect(await page.evaluate(() => window.__keyboardFixture.colors.get(4))).toEqual([255, 0, 170]);
  expect(await page.evaluate(() => window.__keyboardFixture.ledBrightness)).toBe(4);
});

test('theme and language persist and can switch back', async ({ page }) => {
  await page.locator('#themeSelect').selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('#languageSelect').selectOption('en');
  await expect(page.locator('#nav [data-view="keymap"]')).toContainText('Key mapping');
  await page.locator('#nav [data-view="rgb"]').click();
  await expect(page.locator('section[data-view="rgb"] h1')).toHaveText('RGB lighting');
  await page.reload();
  await connectKeyboard(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.locator('#languageSelect').selectOption('it');
  await expect(page.locator('section[data-view="rgb"] h1')).toHaveText('Illuminazione RGB');
});

test('invalid backup is rejected before restore is enabled', async ({ page }) => {
  await page.locator('#nav [data-view="backup"]').click();
  await page.locator('#fileBackup').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"schema":4,"layers":[[{"key":4,"value":-1}]],"performances":[]}') });
  await expect(page.locator('#toast')).toContainText('Backup non valido');
  await expect(page.locator('#btnRestore')).toBeDisabled();
});

for (const theme of ['light', 'dark']) test(`${theme} theme accessibility on each view`, async ({ page }) => {
  await page.locator('#themeSelect').selectOption(theme);
  for (const view of ['overview', 'keymap', 'rgb', 'perf', 'socd', 'advanced', 'test', 'backup', 'settings']) {
    await page.locator(`#nav [data-view="${view}"]`).click();
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), view).toEqual([]);
  }
});

for (const width of [375, 768, 1024, 1440]) test(`responsive at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  for (const view of ['overview', 'keymap', 'rgb', 'perf', 'advanced', 'settings']) {
    await page.locator(`#nav [data-view="${view}"]`).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), view).toBe(true);
  }
});

test('tester leaves Tab available for keyboard navigation', async ({ page }) => {
  await page.locator('#nav [data-view="test"]').click();
  await page.locator('#themeSelect').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#languageSelect')).toBeFocused();
  await page.locator('#main').focus();
  await page.keyboard.press('a');
  await expect(page.locator('#keyLog')).toContainText('KeyA');
});
