import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installKeyboard, connectKeyboard } from './keyboard-fixture.js';

const locales = [
  { code: 'ru', locale: 'ru-RU', connect: 'Подключить клавиатуру', mapping: 'Назначение клавиш', rgb: 'RGB-подсветка', saved: 'RGB сохранён и проверен', selected: 'Выбрано клавиш: 4', search: 'громкость' },
  { code: 'es', locale: 'es-MX', connect: 'Conectar tu teclado', mapping: 'Asignación de teclas', rgb: 'Iluminación RGB', saved: 'RGB guardado y verificado', selected: '4 teclas seleccionadas', search: 'volumen' },
  { code: 'ja', locale: 'ja-JP', connect: 'キーボードを接続', mapping: 'キー割り当て', rgb: 'RGBライティング', saved: 'RGBを保存し確認しました', selected: '4キーを選択中', search: '音量' },
];

for (const language of locales) test(`${language.code}: browser detection, translated writes, search and saved preference`, async ({ browser }) => {
  const context = await browser.newContext({ locale: language.locale });
  const page = await context.newPage();
  await installKeyboard(page); await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', language.code);
  await expect(page.getByRole('button')).toHaveCount(1);
  await expect(page.locator('#btnEntryConnect')).toHaveText(new RegExp(language.connect));
  await connectKeyboard(page);
  await expect(page.locator('#nav [data-view="keymap"]')).toContainText(language.mapping);
  await page.locator('#nav [data-view="keymap"]').click();
  await page.locator('#kbdMap [data-key="4"]').click();
  await page.locator('#mapSearch').fill(language.search);
  await expect(page.locator('#mapChoices button')).toHaveCount(11);
  await page.locator('#nav [data-view="rgb"]').click();
  await expect(page.locator('section[data-view="rgb"] h1')).toHaveText(language.rgb);
  await expect(page).toHaveTitle(new RegExp(language.rgb));
  await page.locator('[data-rgb-select="wasd"]').click();
  await expect(page.locator('#rgbSelection')).toHaveText(language.selected);
  await page.locator('#rgbMode').selectOption('0');
  await page.locator('#rgbHex').fill('#aabbcc'); await page.locator('#rgbHex').press('Tab');
  await page.locator('#btnRgbApply').click();
  await expect(page.locator('#toast')).toHaveText(language.saved);
  await expect(page.locator('#btnRgbApply')).toBeEnabled();
  expect(await page.evaluate(() => window.__keyboardFixture.ledBrightness)).toBe(4);
  const names = await page.locator('#languageSelect option').allTextContents();
  expect(names).toEqual(['Italiano', 'English', 'Русский', 'Español', '日本語']);
  await page.locator('#languageSelect').selectOption('en');
  await page.reload(); await connectKeyboard(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#languageSelect')).toHaveValue('en');
  await context.close();
});

for (const language of locales) test(`${language.code}: narrow layouts and accessible labels`, async ({ page }) => {
  await installKeyboard(page);
  await page.addInitScript(code => localStorage.setItem('studio-language', code), language.code);
  await page.goto('/');
  await page.setViewportSize({ width: 375, height: 1000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await connectKeyboard(page);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const view of ['keymap', 'rgb', 'advanced', 'settings']) {
      await page.locator(`#nav [data-view="${view}"]`).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${language.code} ${view} at ${width}`).toBe(true);
    }
  }
  await page.locator('#nav [data-view="advanced"]').click();
  await page.locator('[data-advanced-mode="dks"]').click();
  await expect(page.locator('#dksPhases button').first()).toHaveAccessibleName(language.code === 'ru' ? 'Действие 1, фаза 1' : language.code === 'es' ? 'Acción 1, fase 1' : '動作1、フェーズ1');
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
});

test('switching all five languages preserves unsaved form data and keeps messages translatable', async ({ page }) => {
  await installKeyboard(page); await page.goto('/'); await connectKeyboard(page);
  await page.locator('#nav [data-view="rgb"]').click();
  await page.locator('#rgbHex').fill('#123456'); await page.locator('#rgbHex').press('Tab');
  await page.locator('#rgbBrightness').press('Home'); await page.locator('#rgbBrightness').press('ArrowRight');
  for (const language of ['ru', 'es', 'ja', 'en', 'it']) {
    await page.locator('#languageSelect').selectOption(language);
    await expect(page.locator('#rgbHex')).toHaveValue('#123456');
    await expect(page.locator('#rgbBrightness')).toHaveValue('1');
    await expect(page.locator('html')).toHaveAttribute('lang', language);
  }
  await page.locator('#btnRgbApply').click(); await expect(page.locator('#toast')).toContainText('RGB salvati');
  await page.locator('#languageSelect').selectOption('es');
  await expect(page.locator('#toast')).toHaveText('RGB guardado y verificado');
  await expect(page.locator('#btnRgbApply')).toHaveText('Aplicar iluminación');
});

test('English public guide is useful without JavaScript and has valid metadata', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const response = await page.goto('/guide/'); expect(response.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('h1')).toContainText('AULA WIN 60 HE MAX');
  await expect(page.locator('#compatibility')).toContainText('1CA2:1902');
  await expect(page.getByRole('link', { name: 'Connect your keyboard' })).toHaveAttribute('href', '../');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://primebuild-pc.github.io/aula-win60he-tool/guide/');
  const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  expect(schema['@type']).toBe('TechArticle'); expect(schema.inLanguage).toBe('en');
  await page.getByText('How do I change the AULA WIN60 HE MAX RGB lighting?', { exact: true }).click();
  await expect(page.locator('details').first()).toHaveAttribute('open', '');
  await context.close();
});

test('guide is responsive and accessible in both color schemes; sitemap uses real pages', async ({ page, request }) => {
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme }); await page.goto('/guide/');
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
  }
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('https://primebuild-pc.github.io/aula-win60he-tool/guide/');
  expect(sitemap).not.toContain('#');
});
