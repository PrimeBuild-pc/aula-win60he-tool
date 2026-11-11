import { PROFILE_CODES, profileLighting, validateProfileShortcuts } from './profiles.js';
import { LIGHT_EFFECTS } from './settings.js';
import { physicalLabel } from './keycodes.js';
import { translate } from './i18n.js';

const $ = id => document.getElementById(id);
const STORAGE = 'studio-profile-names-1ca2-1902';

export function initProfiles({ aula, ui, task, refresh, renderAll, setButtons, toast }) {
  let names = ['', '', '', ''];
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE));
    if (Array.isArray(stored)) names = names.map((_, i) => typeof stored[i] === 'string' ? stored[i].slice(0, 40) : '');
  } catch { /* Hardware profiles remain usable without browser storage. */ }
  const name = i => names[i] || translate(`Profilo ${i + 1}`, $('languageSelect').value);
  let source, loadedIndex, draft = false, rgbDraft = false, shortcutSource, shortcutDraft = false;
  const index = () => aula.state?.config?.configID;
  const supported = () => ui.connected && aula.state?.config?.hasFourConfig;
  const bindings = () => [...$('profileShortcutRows').querySelectorAll('select')].flatMap((select, i) =>
    select.value ? [{ layout: Number($('profileShortcutLayer').value), key: Number(select.value), value: PROFILE_CODES[i] }] : []);

  for (const [i, effect] of LIGHT_EFFECTS.entries()) $('profileEffect').add(new Option(`${effect} · ${i + 1}`, i + 1));
  for (let i = 0; i < 4; i++) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.profile = i; b.dataset.needsDevice = ''; b.dataset.i18nSkip = '';
    b.addEventListener('click', () => activate(i, b));
    $('profileCards').appendChild(b);
    $('quickProfile').add(new Option(name(i), i));
    const label = document.createElement('label');
    const title = document.createElement('span'); title.textContent = `Profilo ${i + 1}`; title.dataset.i18nSkip = '';
    const select = document.createElement('select'); select.id = `profileShortcut${i}`;
    select.add(new Option('Non modificare', ''));
    label.append(title, select); $('profileShortcutRows').appendChild(label);
  }

  function activate(target, button) {
    if (!supported() || ui.busy || ui.calibration || target === index()) return;
    task(button, async () => {
      await aula.saveSettings();
      await aula.switchProfile(target);
      try { await aula.saveSettings(); } finally { await refresh(); }
      ui.followPerf = null;
    }, 'Profilo hardware selezionato', { writes: true }).finally(() => {
      if (index() != null) $('quickProfile').value = index();
    });
  }
  ui.activateProfile = activate;
  $('quickProfile').addEventListener('change', e => activate(Number(e.target.value)));

  function readEditor() {
    const light = aula.state?.lighting;
    loadedIndex = index(); source = light; draft = false; rgbDraft = false;
    $('profileName').value = names[loadedIndex] || '';
    const colorIndex = light?.type === 'dynamic' ? light.dynamicColorId : light?.staticColor;
    $('profileColor').value = light?.colors[colorIndex < 7 ? colorIndex : 0] || '#5eead4';
    $('profileEffect').value = light?.type === 'dynamic' ? light.mode : 0;
    $('profileBrightness').value = light?.luminance ?? 4;
    $('profileSpeed').value = light?.speed ?? 2;
  }
  const lightingDraft = () => profileLighting(aula.state?.lighting, {
    color: $('profileColor').value, mode: Number($('profileEffect').value),
    luminance: Number($('profileBrightness').value), speed: Number($('profileSpeed').value),
  });
  function preview() {
    $('profileColorPreview').style.setProperty('--profile-color', $('profileColor').value);
    $('profileBrightnessOut').textContent = `${Number($('profileBrightness').value) * 25}%`;
    $('profileSpeedOut').textContent = `${Number($('profileSpeed').value) + 1} / 5`;
  }
  for (const id of ['profileName', 'profileColor', 'profileEffect', 'profileBrightness', 'profileSpeed']) {
    const edit = () => { draft = true; if (id !== 'profileName') rgbDraft = true; preview(); setButtons(); };
    $(id).addEventListener('input', edit);
    $(id).addEventListener('change', edit);
  }
  $('btnProfileSave').addEventListener('click', () => task($('btnProfileSave'), async () => {
    if (!$('profileName').reportValidity()) throw new Error('Controlla i valori.');
    const target = index(), nextName = $('profileName').value.trim();
    if (rgbDraft) await aula.applyLighting(lightingDraft());
    await aula.saveSettings();
    names[target] = nextName;
    let stored = true;
    try { localStorage.setItem(STORAGE, JSON.stringify(names)); } catch { stored = false; }
    draft = false; readEditor(); renderAll();
    toast(stored ? 'Profilo salvato e verificato' : 'RGB salvati. Il browser non consente di salvare i nomi.', stored ? 'ok' : 'err');
  }, null, { writes: true }));
  $('btnProfileReload').addEventListener('click', () => { readEditor(); preview(); setButtons(); });

  $('btnProfileShortcutDefaults').addEventListener('click', () => {
    shortcutDraft = true;
    $('profileShortcutLayer').value = '1';
    for (let i = 0; i < 4; i++) $(`profileShortcut${i}`).value = String(30 + i);
    setButtons();
  });
  $('btnProfileShortcuts').addEventListener('click', () => task($('btnProfileShortcuts'), async () => {
    try { await aula.installProfileShortcuts(bindings()); shortcutDraft = false; }
    finally { renderAll(); }
  }, 'Scorciatoie salvate nei quattro profili', { writes: true }));
  function readShortcuts() {
    const mapping = aula.state?.layerMaps?.[Number($('profileShortcutLayer').value)];
    for (let i = 0; i < 4; i++) $(`profileShortcut${i}`).value = String([...mapping || []].find(([key, value]) => key !== 1 && value === PROFILE_CODES[i])?.[0] || '');
    shortcutSource = aula.state?.layerMaps; shortcutDraft = false;
  }
  $('profileShortcutLayer').addEventListener('change', () => { readShortcuts(); setButtons(); });
  $('profileShortcutRows').addEventListener('change', () => { shortcutDraft = true; setButtons(); });

  ui.syncProfileState = () => {
    const enabled = supported() && !ui.busy && !ui.calibration;
    $('quickProfile').disabled = !enabled;
    $('profileEditor').disabled = !enabled;
    $('profileShortcutEditor').disabled = !enabled;
    $('btnProfileSave').disabled ||= !supported() || (!draft && !ui.saveUnconfirmed);
    $('btnProfileReload').disabled ||= !draft;
    $('btnProfileShortcuts').disabled ||= !supported();
    try {
      validateProfileShortcuts(bindings(), aula.state?.physical || []);
      $('profileShortcutStatus').textContent = 'Le assegnazioni sostituiscono i tasti scelti nei quattro profili.';
    } catch (error) {
      $('btnProfileShortcuts').disabled = true;
      $('profileShortcutStatus').textContent = bindings().length ? error.message : 'Scegli almeno una scorciatoia.';
    }
    for (const b of $('profileCards').children) b.disabled ||= !supported() || Number(b.dataset.profile) === index();
    $('profileDraftStatus').textContent = ui.saveUnconfirmed ? 'Salvataggio da verificare. Rileggi o riprova.' :
      draft ? 'Bozza locale · premi Salva profilo per applicare nome e RGB.' : 'Modifica il profilo attivo; gli altri slot mantengono le proprie impostazioni.';
    $('profileActiveStatus').textContent = !supported() ? 'Profili hardware non supportati.' :
      ui.busy ? 'Attendi…' : ui.saveUnconfirmed ? 'Salvataggio da verificare. Rileggi o riprova.' : 'Profilo attivo';
  };

  function render() {
    if (loadedIndex !== index() || (!draft && source !== aula.state?.lighting)) readEditor();
    for (let i = 0; i < 4; i++) {
      const b = $('profileCards').children[i];
      const active = supported() && i === index();
      b.textContent = `${i + 1} · ${name(i)}`;
      b.classList.toggle('active', active); b.setAttribute('aria-pressed', active);
      $('quickProfile').options[i].textContent = `${i + 1} · ${name(i)}`;
      $('profileShortcutRows').children[i].firstElementChild.textContent = `${i + 1} · ${name(i)}`;
    }
    if (index() != null) $('quickProfile').value = index();
    $('profileActiveName').textContent = supported() ? name(index()) : '—';
    const light = aula.state?.lighting;
    const c = light?.type === 'dynamic' ? light.dynamicColorId : light?.staticColor;
    $('activeProfileDot').style.background = light?.open && light.luminance ? (light.type !== 'custom' && c < 7 ? light.colors[c] : 'linear-gradient(135deg, #fb7185, #60a5fa, #5eead4)') : 'var(--border)';
    for (let i = 0; i < 4; i++) {
      const select = $(`profileShortcut${i}`);
      if (select.options.length !== (aula.state?.physical.filter(p => p.keyValue !== 1).length || 0) + 1) {
        const value = select.value; select.length = 1;
        for (const p of aula.state?.physical || []) if (p.keyValue !== 1) select.add(new Option(physicalLabel(p.keyValue), p.keyValue));
        select.value = value;
      }
    }
    if (!shortcutDraft && shortcutSource !== aula.state?.layerMaps) readShortcuts();
    preview(); setButtons();
  }
  document.addEventListener('studio:render', render);
  document.addEventListener('studio:language', render);
  // Firmware shortcuts work without the browser; refresh the visible indicator on return.
  addEventListener('focus', syncHardware);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncHardware(); });
  setInterval(syncHardware, 2000);
  let polling = false;
  async function syncHardware() {
    if (!supported() || ui.busy || ui.calibration || ui.live || document.hidden || polling) return;
    polling = true;
    try {
      // A read uses the SDK queue without disabling controls; only a changed slot needs the UI lock.
      const config = await aula.checked('Profilo hardware', () => aula.kb.getApi({ type: 'ORDER_TYPE_CONFIG' }));
      if (ui.connected && !ui.busy && !ui.calibration && !ui.live && config.configID !== index()) await task(null, refresh);
    } catch (error) { aula.log(error.message, 'warn'); }
    finally { polling = false; }
  }
  render();
}
