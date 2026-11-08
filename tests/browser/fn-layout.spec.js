import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installKeyboard, connectKeyboard } from './keyboard-fixture.js';

test.beforeEach(async ({ page }) => {
  await installKeyboard(page);
  await page.goto('/');
  await connectKeyboard(page);
  await page.locator('#nav [data-view="keymap"]').click();
  await page.locator('#btnMapEdit').click();
  await page.locator('#layerSeg [data-layer="1"]').click();
});

const register = (page, address) => page.evaluate(address => window.__keyboardFixture.registers.get(address), address);
const choose = async (page, code, key) => {
  await page.locator(`#mapChoices [data-code="${code}"]`).click();
  await page.locator(`#kbdMap [data-key="${key}"]`).click();
};

test('native drag stages Fn+Enter Delete, then saves through the real SDK and survives reconnect', async ({ page }) => {
  await expect(page.locator('#mapPoolTitle')).toBeVisible();
  await page.locator('#mapChoices [data-code="76"]').dragTo(page.locator('#kbdMap [data-key="40"]'));
  await expect(page.locator('#kbdMap [data-key="40"] .key-main')).toHaveText('Del');
  await expect(page.locator('#mapLayoutStatus')).toHaveText('Modifiche da applicare: 1');
  expect(await register(page, '40:1')).toBe(1);
  await page.locator('#btnMapSaveLayout').click();
  await expect(page.locator('#toast')).toHaveText('Layout salvato e verificato');
  expect(await register(page, '40:1')).toBe(76);
  expect(await register(page, '40:0')).toBe(40);
  await page.locator('#btnDisconnect').click();
  await connectKeyboard(page);
  await page.locator('#layerSeg [data-layer="1"]').click();
  await expect(page.locator('#kbdMap [data-key="40"] .key-main')).toHaveText('Del');
});

test('click alternative keeps layers separate, protects Fn and discards without USB writes', async ({ page }) => {
  await choose(page, 76, 40);
  await page.locator('#layerSeg [data-layer="0"]').click();
  await expect(page.locator('#kbdMap [data-key="40"] .key-main')).toHaveText('Enter');
  await choose(page, 104, 4);
  await page.locator('#kbdMap [data-key="1"]').click();
  await expect(page.locator('#toast')).toContainText('Fn');
  await expect(page.locator('#mapLayoutStatus')).toHaveText('Modifiche da applicare: 2');
  await page.locator('#btnMapEdit').click();
  await expect(page.locator('#btnMapEdit')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#btnMapDiscard').click();
  await page.locator('#layerSeg [data-layer="1"]').click();
  await expect(page.locator('#kbdMap [data-key="40"] .key-main')).toHaveText('—');
  expect(await register(page, '40:1')).toBe(1);
  expect(await register(page, '4:0')).toBe(4);
  await expect(page.locator('#btnMapSaveLayout')).toBeDisabled();
});

test('completion preserves custom bindings, fills the full physical layout and saves both drafts', async ({ page }) => {
  await choose(page, 0x10e9, 4);
  await page.locator('#btnMapCompleteFn').click();
  await expect(page.locator('#kbdMap .is-empty')).toHaveCount(0);
  await expect(page.locator('#kbdMap [data-key="4"] .key-main')).toHaveText('Vol+');
  await expect(page.locator('#kbdMap [data-key="40"] .key-main')).toHaveText('Del');
  await expect(page.locator('#mapLayoutStatus')).toHaveText('Modifiche da applicare: 60');
  await page.locator('#layerSeg [data-layer="0"]').click();
  await choose(page, 115, 4);
  await page.locator('#btnMapSaveLayout').click();
  await expect(page.locator('#toast')).toHaveText('Layout salvato e verificato');
  expect(await register(page, '4:0')).toBe(115);
  expect(await register(page, '4:1')).toBe(0x10e9);
  expect(await register(page, '40:1')).toBe(76);
  expect(await register(page, '1:0')).toBe(0xf001);
});

test('failed readback retains unverified drafts for retry and never claims success', async ({ page }) => {
  await choose(page, 76, 40);
  await page.evaluate(() => {
    const fixture = window.__keyboardFixture;
    const read = fixture.registers.get.bind(fixture.registers);
    fixture.registers.get = address => address === '40:1' ? 1 : read(address);
    fixture.restoreReads = () => { fixture.registers.get = read; };
  });
  await page.locator('#btnMapSaveLayout').click();
  await expect(page.locator('#toast')).toContainText('Mappatura non verificata');
  await expect(page.locator('#mapLayoutStatus')).toHaveText('Modifiche da applicare: 1');
  await expect(page.locator('#btnMapSaveLayout')).toBeEnabled();
  await page.evaluate(() => window.__keyboardFixture.restoreReads());
  await page.locator('#btnMapSaveLayout').click();
  await expect(page.locator('#toast')).toHaveText('Layout salvato e verificato');
});

for (const theme of ['dark', 'light']) test(`edit mode is accessible and responsive in ${theme}`, async ({ page }) => {
  await page.locator('#themeSelect').selectOption(theme);
  await page.locator('#mapSearch').fill('numpad');
  await expect(page.locator('#mapChoices button')).toHaveCount(18);
  await page.locator('#mapChoices [data-code="98"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('#kbdMap [data-key="20"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#kbdMap [data-key="20"] .key-main')).toHaveText('Num 0');
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
