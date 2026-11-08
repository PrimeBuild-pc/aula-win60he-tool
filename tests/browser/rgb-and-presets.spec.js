import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installKeyboard, connectKeyboard } from './keyboard-fixture.js';

test.beforeEach(async ({ page }) => {
  await installKeyboard(page); await page.goto('/'); await connectKeyboard(page);
});
const read = (page, key) => page.evaluate(key => window.__keyboardFixture.registers.get(key), key);
const rgb = async page => {
  await page.locator('#nav [data-view="rgb"]').click();
  await page.locator('#rgbShortcuts > summary').click();
};

test('RGB has only lighting commands and saves native drag without applying other mapping drafts', async ({ page }) => {
  await page.locator('#nav [data-view="keymap"]').click();
  await page.locator('#btnMapEdit').click();
  await page.locator('#layerSeg [data-layer="1"]').click();
  await page.locator('#mapChoices [data-code="76"]').click();
  await page.locator('#kbdMap [data-key="40"]').click();
  await rgb(page);
  await expect(page.locator('#mapChoices button')).toHaveCount(9);
  await expect(page.locator('#btnMapCompleteFn')).toBeHidden();
  await page.locator('#mapChoices [data-code="62231"]').dragTo(page.locator('#kbdMap [data-key="42"]'));
  expect(await read(page, '42:1')).toBe(1);
  await page.locator('#btnMapSaveLayout').click();
  // Changing views during an in-flight save must not expand its scope.
  await page.locator('#nav [data-view="keymap"]').click();
  await expect(page.locator('#toast')).toHaveText('Layout salvato e verificato');
  expect(await read(page, '42:1')).toBe(62231);
  expect(await read(page, '40:1')).toBe(1);
  await expect(page.locator('#mapLayoutStatus')).toHaveText('Modifiche da applicare: 1');
});

test('RGB suggestions cover all nine actions while preserving Enter and lighting settings', async ({ page }) => {
  await rgb(page);
  const before = await page.evaluate(() => [...window.__keyboardFixture.light]);
  await page.locator('#btnMapCompleteRgb').click();
  await expect(page.locator('#mapLayoutStatus')).toHaveText('Modifiche da applicare: 9');
  await page.locator('#btnMapSaveLayout').click();
  await expect(page.locator('#toast')).toHaveText('Layout salvato e verificato');
  expect(await read(page, '6:1')).toBe(62262);
  expect(await read(page, '40:1')).toBe(1);
  expect(await read(page, '42:0')).toBe(42);
  expect(await page.evaluate(() => [...window.__keyboardFixture.light])).toEqual(before);
});

test('game preset previews without writes and applies CS2 thresholds through the SDK', async ({ page }) => {
  await page.locator('#btnProfile').click();
  await expect(page.locator('#gamePreset')).toHaveValue('cs2');
  await expect(page.locator('#presetRows')).toContainText('0.70 mm');
  expect(await read(page, '4:4')).toBe(500);
  await page.locator('#btnGamePresetApply').click();
  await expect(page.locator('#presetStatus')).toHaveText('Preset salvato e verificato');
  expect(await read(page, '4:4')).toBe(700);
  expect(await read(page, '4:20')).toBe(300);
  expect(await read(page, '8:4')).toBe(1500);
  expect((await read(page, '8:8')) >> 4).toBe(1);
  expect(await read(page, '40:4')).toBe(500);
});

test('explicit SOCD preset is removed by racing and advanced conflicts stop before writes', async ({ page }) => {
  await page.locator('#nav [data-view="perf"]').click();
  await page.locator('#gamePreset').selectOption('socd');
  await expect(page.locator('#presetDescription')).toContainText('Valve');
  await page.locator('#btnGamePresetApply').click();
  await expect(page.locator('#btnGamePresetApply')).toHaveText('Preset applicato');
  await expect(page.locator('#btnGamePresetApply')).toBeDisabled();
  expect((await read(page, '4:8')) & 15).toBe(8);
  await page.locator('#gamePreset').selectOption('racing');
  await page.locator('#btnGamePresetApply').click();
  await expect(page.locator('#btnGamePresetApply')).toHaveText('Preset applicato');
  await expect(page.locator('#btnGamePresetApply')).toBeDisabled();
  expect(await read(page, '4:8')).toBe(16);
  await page.evaluate(() => window.__keyboardFixture.registers.set('7:8', 33));
  const before = await page.evaluate(() => [...window.__keyboardFixture.registers]);
  await page.locator('#gamePreset').selectOption('fps-fast');
  await page.locator('#btnGamePresetApply').click();
  await expect(page.locator('#toast')).toContainText('Rimuovi prima le azioni avanzate');
  await expect(page.locator('#btnGamePresetApply')).toBeEnabled();
  await expect(page.locator('#presetAppliedHint')).toBeHidden();
  expect(await page.evaluate(() => [...window.__keyboardFixture.registers])).toEqual(before);
});

test('verified preset stays confirmed until its selection or affected settings change', async ({ page }) => {
  await page.locator('#nav [data-view="perf"]').click();
  await page.locator('#gamePreset').selectOption('fortnite');
  await page.locator('#btnGamePresetApply').click();
  await expect(page.locator('#btnGamePresetApply')).toHaveText('Preset applicato');
  await expect(page.locator('#btnGamePresetApply')).toBeDisabled();
  await expect(page.locator('#presetAppliedHint')).toBeVisible();
  const saves = await page.evaluate(() => window.__keyboardFixture.saveCount);
  // Neither a synthetic click nor revisiting the view should write the same preset again.
  await page.locator('#btnGamePresetApply').dispatchEvent('click');
  await page.locator('#nav [data-view="rgb"]').click();
  await page.locator('#themeSelect').selectOption('light');
  await page.locator('#nav [data-view="perf"]').click();
  await expect(page.locator('#btnGamePresetApply')).toBeDisabled();
  expect(await page.evaluate(() => window.__keyboardFixture.saveCount)).toBe(saves);
  await page.locator('#gamePreset').selectOption('racing');
  await expect(page.locator('#btnGamePresetApply')).toBeEnabled();
  await expect(page.locator('#presetAppliedHint')).toBeHidden();
  await page.locator('#gamePreset').selectOption('fortnite');
  await expect(page.locator('#btnGamePresetApply')).toBeDisabled();
  await page.locator('#presetRate').selectOption('0');
  await expect(page.locator('#btnGamePresetApply')).toBeEnabled();
  await page.locator('#presetRate').selectOption('3');
  await expect(page.locator('#btnGamePresetApply')).toBeDisabled();
  await page.locator('#kbdPerf [data-key="26"]').click();
  await expect(page.locator('#btnPerfApply')).toBeEnabled();
  await page.locator('#perfAct').fill('1.1');
  await page.locator('#btnPerfApply').click();
  await expect(page.locator('#btnPerfApply')).toBeEnabled();
  await expect(page.locator('#btnGamePresetApply')).toBeEnabled();
  await expect(page.locator('#presetStatus')).toHaveText('Modifiche da applicare');
  await expect(page.locator('#presetAppliedHint')).toBeHidden();
});

test('a failed memory save never confirms a preset and can be retried', async ({ page }) => {
  await page.locator('#nav [data-view="perf"]').click();
  await page.evaluate(() => { window.__keyboardFixture.saveFailure = true; });
  await page.locator('#btnGamePresetApply').click();
  await expect(page.locator('#presetStatus')).toContainText('Salvataggio permanente non confermato');
  await expect(page.locator('#btnGamePresetApply')).toBeEnabled();
  await expect(page.locator('#btnGamePresetApply')).toHaveText('Applica preset');
  await expect(page.locator('#presetAppliedHint')).toBeHidden();
  await page.evaluate(() => { window.__keyboardFixture.saveFailure = false; });
  await page.locator('#btnGamePresetApply').click();
  await expect(page.locator('#btnGamePresetApply')).toHaveText('Preset applicato');
  await expect(page.locator('#btnGamePresetApply')).toBeDisabled();
});

test('SOCD policy changes and a new USB session clear the previous confirmation', async ({ page }) => {
  await page.locator('#nav [data-view="perf"]').click();
  await page.locator('#gamePreset').selectOption('socd');
  await page.locator('#btnGamePresetApply').click();
  await expect(page.locator('#btnGamePresetApply')).toHaveText('Preset applicato');
  await page.locator('#nav [data-view="socd"]').click();
  await page.locator('#socdSeg [data-mode="3"]').click();
  await page.locator('#btnSocdApply').click();
  await expect(page.locator('#btnSocdApply')).toBeEnabled();
  await page.locator('#nav [data-view="perf"]').click();
  await expect(page.locator('#btnGamePresetApply')).toBeEnabled();
  await expect(page.locator('#presetAppliedHint')).toBeHidden();
  await page.locator('#btnGamePresetApply').click();
  await expect(page.locator('#btnGamePresetApply')).toHaveText('Preset applicato');
  await page.evaluate(() => window.__keyboardFixture.powerCycle());
  await connectKeyboard(page);
  await page.locator('#nav [data-view="perf"]').click();
  await expect(page.locator('#btnGamePresetApply')).toBeEnabled();
  await expect(page.locator('#presetAppliedHint')).toBeHidden();
});

test('an unconfirmed manual save clears success even when cached values are unchanged', async ({ page }) => {
  await page.locator('#nav [data-view="perf"]').click();
  await page.locator('#presetRate').selectOption('0');
  await page.locator('#btnGamePresetApply').click();
  await expect(page.locator('#btnGamePresetApply')).toHaveText('Preset applicato');
  await page.locator('#kbdPerf [data-key="26"]').click();
  await expect(page.locator('#btnPerfApply')).toBeEnabled();
  await page.evaluate(() => { window.__keyboardFixture.saveFailure = true; });
  await page.locator('#btnPerfApply').click();
  await expect(page.locator('#toast')).toContainText('Salvataggio permanente non confermato');
  await expect(page.locator('#btnGamePresetApply')).toBeEnabled();
  await expect(page.locator('#presetAppliedHint')).toBeHidden();
});

for (const theme of ['light', 'dark']) test(`${theme}: RGB shortcuts and presets are accessible and responsive`, async ({ page }) => {
  await page.locator('#themeSelect').selectOption(theme);
  await rgb(page);
  await page.locator('#mapSearch').fill('luminosità');
  await expect(page.locator('#mapChoices button')).toHaveCount(2);
  for (const view of ['rgb', 'perf']) {
    await page.locator(`#nav [data-view="${view}"]`).click();
    if (view === 'perf') {
      await page.locator('#btnGamePresetApply').click();
      await expect(page.locator('#btnGamePresetApply')).toHaveText('Preset applicato');
    }
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
