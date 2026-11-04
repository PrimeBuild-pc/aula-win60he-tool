import test from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, catalogs, sourceMessages, preferredLanguage, translate } from '../../src/i18n.js';

test('every added language covers the source catalog and preserves interpolation fields', () => {
  const expected = [...new Set(Object.values(sourceMessages))].sort();
  for (const [language, catalog] of Object.entries(catalogs)) {
    assert.deepEqual(Object.keys(catalog).sort(), expected, language);
    for (const [key, value] of Object.entries(catalog)) {
      assert.ok(value.trim(), `${language}: ${key}`);
      assert.deepEqual((value.match(/\{\w+\}/g) || []).sort(), (key.match(/\{\w+\}/g) || []).sort(), `${language}: ${key}`);
    }
  }
  assert.deepEqual(Object.keys(LANGUAGES).sort(), ['en', 'es', 'it', 'ja', 'ru']);
});

test('saved language wins; browser language variants match; unknown locales use English', () => {
  assert.equal(preferredLanguage('es', ['ru-RU']), 'es');
  assert.equal(preferredLanguage('xx', ['fr-FR', 'ja-JP']), 'ja');
  assert.equal(preferredLanguage('', ['ru-RU']), 'ru');
  assert.equal(preferredLanguage('', ['es-MX']), 'es');
  assert.equal(preferredLanguage('', ['it-IT']), 'it');
  assert.equal(preferredLanguage('', ['de-DE']), 'en');
});

test('dynamic counts, delays, palette slots and hardware codes keep their values', () => {
  assert.equal(translate('4 tasti selezionati', 'es'), '4 teclas seleccionadas');
  assert.equal(translate('12 eventi · 530 ms', 'ja'), '12イベント・530 ms');
  assert.equal(translate('Funzione 4, fase 7', 'ru'), 'Действие 4, фаза 7');
  assert.equal(translate('Onde · 1', 'es'), 'Ondas · 1');
  assert.equal(translate('Funzione attuale: F5 (codice 62)', 'ja'), '現在の機能：F5（コード62）');
  assert.equal(translate('Backup non valido: Formato di backup non valido.', 'es'), 'Copia de seguridad no válida: Formato de copia de seguridad no válido.');
});

test('translated button labels can be restored by an async action and translated again', () => {
  assert.equal(translate(translate('Salva mappatura', 'ru'), 'es'), 'Guardar asignación');
  assert.equal(translate(translate('Salva mappatura', 'ja'), 'it'), 'Salva mappatura');
  assert.equal(translate('WIN 60 HE MAX 1CA2:1902', 'ja'), 'WIN 60 HE MAX 1CA2:1902');
  assert.equal(translate('  RGB salvati e verificati  ', 'es'), '  RGB guardado y verificado  ');
});
