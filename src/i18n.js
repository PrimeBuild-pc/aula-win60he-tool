import english from './locales/en.json' with { type: 'json' };
import russian from './locales/ru.json' with { type: 'json' };
import spanish from './locales/es.json' with { type: 'json' };
import japanese from './locales/ja.json' with { type: 'json' };

export const LANGUAGES = { it: 'Italiano', en: 'English', ru: 'Русский', es: 'Español', ja: '日本語' };
export const catalogs = { ru: russian, es: spanish, ja: japanese };
export const sourceMessages = english;
const normalize = text => text.trim().replace(/\s+/g, ' ');
const canonical = new Map(), italian = new Map();
const templates = [];
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const [source, value] of Object.entries(english)) {
  canonical.set(source, value); canonical.set(value, value);
  if (!italian.has(value)) italian.set(value, source);
  if (source.includes('{')) {
    const pattern = source.split(/(\{\w+\})/).map(part => /^\{\w+\}$/.test(part) ? `(?<${part.slice(1, -1)}>.+?)` : escape(part)).join('');
    templates.push({ pattern: new RegExp(`^${pattern}$`), value });
  }
}
for (const catalog of Object.values(catalogs)) for (const [key, value] of Object.entries(catalog)) canonical.set(normalize(value), key);

export function preferredLanguage(saved, browserLanguages = []) {
  if (Object.hasOwn(LANGUAGES, saved)) return saved;
  for (const language of browserLanguages) {
    const code = language.toLowerCase().split('-')[0];
    if (Object.hasOwn(LANGUAGES, code)) return code;
  }
  return 'en';
}

export function translate(text, language = 'en', depth = 0) {
  if (!text || depth > 4) return text;
  const source = normalize(text);
  if (language === 'it' && Object.hasOwn(english, source)) return text;
  const key = canonical.get(source);
  let value;
  const localized = message => language === 'it' ? italian.get(message) || message : catalogs[language]?.[message] || message;
  if (key) value = localized(key);
  else {
    for (const template of templates) {
      const match = source.match(template.pattern);
      if (!match) continue;
      value = localized(template.value).replace(/\{(\w+)\}/g, (_, name) => translate(match.groups[name] || '', language, depth + 1));
      break;
    }
    // Effect labels keep their numeric firmware ID in every language.
    if (value == null && /^.+ · \d+$/.test(source)) {
      const [, name, number] = source.match(/^(.+) · (\d+)$/);
      value = `${translate(name, language, depth + 1)} · ${number}`;
    }
  }
  return value == null ? text : text.replace(text.trim(), value);
}

export function initLanguage(preferences) {
  const nodes = new WeakMap(), attrs = new WeakMap();
  const select = document.getElementById('languageSelect');
  select.value = preferredLanguage(preferences.get('studio-language', ''), navigator.languages || [navigator.language]);
  const observer = new MutationObserver(apply);
  function apply() {
    observer.disconnect();
    document.documentElement.lang = select.value;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim() || node.parentElement?.closest('script, style, #log, #keyLog, #languageSelect, [data-i18n-skip]')) continue;
      const old = nodes.get(node);
      const source = old && node.textContent === old.rendered ? old.source : node.textContent;
      const rendered = translate(source, select.value);
      if (node.textContent !== rendered) node.textContent = rendered;
      nodes.set(node, { source, rendered });
    }
    for (const node of document.querySelectorAll('[placeholder], [aria-label], [title], optgroup[label]')) {
      if (node.closest('#languageSelect')) continue;
      const record = attrs.get(node) || {};
      for (const attr of ['placeholder', 'aria-label', 'title', 'label']) {
        if (!node.hasAttribute(attr)) continue;
        const current = node.getAttribute(attr), old = record[attr];
        const source = old && current === old.rendered ? old.source : current;
        const rendered = translate(source, select.value);
        if (current !== rendered) node.setAttribute(attr, rendered);
        record[attr] = { source, rendered };
      }
      attrs.set(node, record);
    }
    const active = document.querySelector('#nav [aria-current="page"]');
    document.title = document.getElementById('workspace').hidden ? 'AULA WIN 60 HE MAX Web Driver | WIN60 HE Studio' : `WIN60 HE Studio · ${active?.textContent.trim() || 'AULA WIN 60 HE MAX'}`;
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title', 'label'] });
  }
  select.addEventListener('change', () => {
    preferences.set('studio-language', select.value); apply();
    document.dispatchEvent(new Event('studio:language'));
  });
  apply();
}
