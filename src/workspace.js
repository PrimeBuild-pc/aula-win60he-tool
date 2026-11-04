import { KEY_GROUPS, keyLabel, physicalLabel, CODE_TO_HID } from './keycodes.js';
import { DEFAULT_LIGHT, rgbFromHex } from './settings.js';
import { initLanguage } from './i18n.js';

const $ = id => document.getElementById(id);
const preferences = {
  get(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* Storage can be disabled. */ } },
};

export function initWorkspace({ aula, ui, task, toast, log, renderAll, drawKeyboard, physicalRows, mapOf, refresh, setButtons, setStatus, stopLive }) {
  const colorScheme = matchMedia('(prefers-color-scheme: light)');
  const theme = preferences.get('studio-theme', 'system');
  $('themeSelect').value = ['system', 'dark', 'light'].includes(theme) ? theme : 'system';
  const applyTheme = () => {
    const selected = $('themeSelect').value;
    document.documentElement.dataset.theme = selected === 'system' ? (colorScheme.matches ? 'light' : 'dark') : selected;
    document.querySelector('meta[name="theme-color"]').content = document.documentElement.dataset.theme === 'light' ? '#f3f5f8' : '#0a0c10';
    preferences.set('studio-theme', selected);
  };
  $('themeSelect').addEventListener('change', applyTheme);
  colorScheme.addEventListener('change', applyTheme);
  applyTheme();

  function navigate(view, updateHash = true) {
    if (ui.captureMapping) cancelCapture();
    const button = [...$('nav').children].find(b => b.dataset.view === view) || $('nav').firstElementChild;
    view = button.dataset.view;
    for (const b of $('nav').children) {
      b.classList.toggle('active', b === button);
      if (b === button) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    }
    document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.dataset.view === view));
    if (view !== 'test') stopLive();
    if (updateHash && location.hash !== `#${view}`) history.pushState(null, '', `#${view}`);
    document.title = `WIN60 HE Studio · ${button.textContent.trim()}`;
  }
  // Use the same path for sidebar, quick actions, deep links and browser back.
  $('nav').addEventListener('click', e => {
    const button = e.target.closest('[data-view]');
    if (button) navigate(button.dataset.view);
  });
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => navigate(b.dataset.go)));
  addEventListener('popstate', () => navigate(location.hash.slice(1), false));
  addEventListener('hashchange', () => navigate(location.hash.slice(1), false));
  navigate(location.hash.slice(1) || 'overview', false);

  aula.onDisconnect = () => {
    ui.connected = false;
    ui.calibration = false;
    stopLive();
    aula.state = null;
    setStatus('Disconnessa · riconnetti', 'warn');
    $('calibrationStatus').textContent = 'Connessione interrotta. Riconnetti prima di usare i sensori.';
    renderAll();
    setButtons();
  };
  $('btnDisconnect').addEventListener('click', () => task($('btnDisconnect'), async () => {
    await aula.disconnect();
    ui.connected = false;
    ui.followPerf = null;
    setStatus('Non connesso', 'idle');
    renderAll();
  }));
  $('btnRefresh').addEventListener('click', () => task($('btnRefresh'), refresh, 'Stato aggiornato'));
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopLive(); });

  // Mapping: searchable functions, category filters, physical key capture and draft feedback.
  let category = 'Tutte';
  const aliases = { Navigazione: 'frecce arrows arrow left right up down insert delete home end pagina', Media: 'volume audio musica play pause mute', Modificatori: 'ctrl shift alt win control', Controllo: 'invio spazio esc escape canc backspace enter space', Funzione: 'function funzione' };
  for (const group of ['Tutte', ...Object.keys(KEY_GROUPS)]) {
    const b = document.createElement('button');
    b.textContent = group;
    b.dataset.group = group;
    b.addEventListener('click', () => { category = group; renderFunctions(); });
    $('mapCategories').appendChild(b);
  }
  function renderFunctions() {
    const search = $('mapSearch').value.trim().toLowerCase();
    $('mapChoices').replaceChildren();
    for (const b of $('mapCategories').children) {
      b.classList.toggle('active', b.dataset.group === category);
      b.setAttribute('aria-pressed', b.dataset.group === category);
    }
    for (const [group, codes] of Object.entries(KEY_GROUPS)) {
      if (category !== 'Tutte' && category !== group) continue;
      for (const [code, name] of Object.entries(codes)) {
        if (search && !`${name} ${group} ${aliases[group] || ''}`.toLowerCase().includes(search)) continue;
        const b = document.createElement('button');
        b.textContent = name === '—' ? 'Nessuna' : name;
        b.className = 'function-key';
        b.title = group;
        b.setAttribute('aria-pressed', $('mapTarget').value === code);
        b.classList.toggle('active', $('mapTarget').value === code);
        b.addEventListener('click', () => { $('mapTarget').value = code; updateMapPreview(); renderFunctions(); });
        $('mapChoices').appendChild(b);
      }
    }
    if (!$('mapChoices').children.length) {
      const p = document.createElement('p');
      p.className = 'hint'; p.textContent = 'Nessuna funzione trovata. Prova un altro nome.';
      $('mapChoices').appendChild(p);
    }
  }
  function updateMapPreview() {
    if (ui.mapKey == null) return;
    $('mapFrom').textContent = physicalLabel(ui.mapKey);
    $('mapTo').textContent = keyLabel(Number($('mapTarget').value));
    $('mapDraft').textContent = Number($('mapTarget').value) === mapOf(ui.layer, ui.mapKey) ? 'Nessuna modifica' : 'Modifica da salvare';
  }
  document.addEventListener('studio:map', () => { cancelCapture(); updateMapPreview(); renderFunctions(); });
  $('mapSearch').addEventListener('input', renderFunctions);
  $('mapTarget').addEventListener('change', () => { updateMapPreview(); renderFunctions(); });
  let captureTimer;
  function cancelCapture() {
    ui.captureMapping = false;
    clearTimeout(captureTimer);
    $('btnMapCapture').textContent = 'Premi il tasto da assegnare';
    $('btnMapCapture').setAttribute('aria-pressed', 'false');
  }
  $('btnMapCapture').addEventListener('click', () => {
    if (ui.captureMapping) return cancelCapture();
    ui.captureMapping = true;
    $('btnMapCapture').textContent = 'In ascolto… Esc per annullare';
    $('btnMapCapture').setAttribute('aria-pressed', 'true');
    captureTimer = setTimeout(cancelCapture, 10000);
  });
  addEventListener('keydown', e => {
    if (!ui.captureMapping) return;
    if (e.code === 'Tab') return cancelCapture();
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.code === 'Escape') return cancelCapture();
    const code = CODE_TO_HID[e.code];
    if (code == null) return toast('Tasto non acquisibile. Scegli la funzione dall’elenco.', 'err');
    $('mapTarget').value = String(code);
    cancelCapture(); updateMapPreview(); renderFunctions();
  }, true);
  addEventListener('blur', cancelCapture);

  // RGB stays a local draft until the explicit Apply action.
  let light = structuredClone(DEFAULT_LIGHT);
  let lightSource = null;
  let paletteIndex = 0;
  let selected = new Set();
  let custom = new Map();
  let dirty = false;
  for (let i = 1; i <= 20; i++) {
    const o = document.createElement('option');
    o.value = i; o.textContent = `Effetto firmware ${i}`;
    $('rgbMode').appendChild(o);
  }
  function renderRgb() {
    $('rgbMode').value = light.mode;
    $('rgbBrightness').value = light.luminance;
    $('rgbBrightnessOut').textContent = light.luminance;
    // Preserve values read from firmware even if outside the usual 0–5 range.
    $('rgbSpeed').max = Math.max(5, light.speed);
    $('rgbSpeed').value = light.speed;
    $('rgbSpeedOut').textContent = light.speed;
    $('rgbDirection').checked = light.direction;
    $('rgbColor').value = light.colors[paletteIndex];
    $('rgbHex').value = light.colors[paletteIndex];
    $('rgbSelection').textContent = `${selected.size} tasti selezionati`;
    $('rgbReadout').textContent = dirty ? 'Bozza locale · premi Applica per salvare.' : ui.connected ? (light.open ? 'Configurazione letta dalla tastiera.' : 'RGB spento sulla tastiera.') : 'Anteprima locale · collega la tastiera per salvare.';
    $('rgbPalette').replaceChildren();
    light.colors.forEach((color, index) => {
      const b = document.createElement('button');
      b.className = 'swatch'; b.style.setProperty('--swatch', color);
      b.setAttribute('aria-label', `Colore ${index + 1}: ${color}`);
      b.setAttribute('aria-pressed', paletteIndex === index);
      b.classList.toggle('active', paletteIndex === index);
      b.addEventListener('click', () => { paletteIndex = index; light.staticColor = index + 1; dirty = true; renderRgb(); });
      $('rgbPalette').appendChild(b);
    });
    drawKeyboard($('kbdRgb'), {
      label: k => ({ main: physicalLabel(k) }), classes: k => selected.has(k) ? 'is-selected' : '',
      onClick: k => { selected.has(k) ? selected.delete(k) : selected.add(k); renderRgb(); },
    });
    for (const key of $('kbdRgb').querySelectorAll('.key')) {
      const rgb = custom.get(Number(key.dataset.key));
      const color = light.type === 'custom' ? (rgb ? `rgb(${rgb.r} ${rgb.g} ${rgb.b})` : '#111820') :
        light.type === 'static' ? light.colors[Math.max(0, light.staticColor - 1)] : light.colors[(Number(key.dataset.col) + Number(key.dataset.row)) % 7];
      key.style.setProperty('--rgb', color);
      key.style.setProperty('--rgb-opacity', light.open ? Math.max(0.12, light.luminance / 255) : 0);
      key.classList.add('rgb-key');
    }
  }
  for (const id of ['rgbMode', 'rgbBrightness', 'rgbSpeed', 'rgbDirection']) $(id).addEventListener('input', () => {
    light.mode = Number($('rgbMode').value);
    light.type = light.mode === 21 ? 'custom' : light.mode === 0 ? 'static' : 'dynamic';
    light.luminance = Number($('rgbBrightness').value);
    light.speed = Number($('rgbSpeed').value);
    light.direction = $('rgbDirection').checked;
    light.open = true; dirty = true; renderRgb();
  });
  function updateColor(color) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) { $('rgbHex').setCustomValidity('Usa un colore HEX, es. #5eead4'); return; }
    $('rgbHex').setCustomValidity('');
    light.colors[paletteIndex] = color;
    light.staticColor = paletteIndex + 1;
    light.open = true; dirty = true; renderRgb();
  }
  $('rgbColor').addEventListener('input', e => updateColor(e.target.value));
  $('rgbHex').addEventListener('change', e => updateColor(e.target.value));
  $('rgbPresets').addEventListener('click', e => {
    const colors = { mint: '#5eead4', ice: '#60a5fa', sunset: '#fb7185', violet: '#a78bfa' };
    const color = colors[e.target.closest('button')?.dataset.rgbPreset];
    if (color) updateColor(color);
  });
  document.querySelectorAll('[data-rgb-select]').forEach(b => b.addEventListener('click', () => {
    selected = new Set({ all: physicalRows().flat().map(p => p.keyValue), wasd: [26, 4, 22, 7], none: [] }[b.dataset.rgbSelect]);
    renderRgb();
  }));
  $('btnRgbPaint').addEventListener('click', () => {
    if (!selected.size) return toast('Seleziona almeno un tasto nell’anteprima.', 'err');
    for (const key of selected) custom.set(key, { key, ...rgbFromHex(light.colors[paletteIndex]) });
    light.type = 'custom'; light.mode = 21; light.open = true; dirty = true; renderRgb();
  });
  $('btnRgbApply').addEventListener('click', () => task($('btnRgbApply'), async () => {
    if (!$('rgbHex').reportValidity()) throw new Error('Colore HEX non valido.');
    if (light.type === 'custom' && custom.size) await aula.writeCustomLighting([...custom.values()]);
    light = structuredClone(await aula.writeLighting(light));
    lightSource = aula.state.lighting; dirty = false; renderRgb();
  }, 'RGB salvati e verificati'));
  $('btnRgbOff').addEventListener('click', () => task($('btnRgbOff'), async () => {
    const current = await aula.readLighting();
    light = structuredClone(await aula.writeLighting({ ...current, open: false }));
    lightSource = aula.state.lighting; dirty = false; renderRgb();
  }, 'RGB spenti'));
  $('btnRgbRead').addEventListener('click', () => task($('btnRgbRead'), async () => {
    light = structuredClone(await aula.readLighting());
    custom = new Map((await aula.readCustomLighting()).map(c => [c.key, c]));
    paletteIndex = Math.max(0, light.staticColor - 1);
    lightSource = aula.state.lighting; dirty = false; renderRgb();
  }, 'RGB riletti'));

  $('socdPair').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || ui.busy) return;
    ui.socdPair = b.dataset.pair === 'ws' ? [26, 22] : [4, 7];
    for (const x of $('socdPair').children) x.classList.toggle('active', x === b);
    const stored = aula.state?.socd?.find(p => p.pos1 === ui.socdPair[0]);
    ui.socdMode = stored?.mode ?? 0;
    for (const x of $('socdSeg').children) x.classList.toggle('active', Number(x.dataset.mode) === ui.socdMode);
    renderDevice();
  });
  $('profileSeg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    task(b, async () => { await aula.switchProfile(Number(b.dataset.profile)); await refresh(); ui.followPerf = null; }, 'Profilo hardware selezionato');
  });
  $('btnCalibrationStart').addEventListener('click', () => task($('btnCalibrationStart'), async () => {
    // SDK 1.0.24 returns null for a valid generic ACK; transport errors return Error.
    await aula.checked('Avvio calibrazione', () => aula.kb.calibrationStart(), true);
    ui.calibration = true;
    $('calibrationStatus').textContent = 'Calibrazione attiva: premi ogni tasto fino in fondo, poi rilasciali tutti e termina.';
  }));
  $('btnCalibrationEnd').addEventListener('click', () => task($('btnCalibrationEnd'), async () => {
    await aula.checked('Fine calibrazione', () => aula.kb.calibrationEnd(), true);
    ui.calibration = false;
    $('calibrationStatus').textContent = 'Calibrazione terminata. Verifica i sensori in Test tasti.';
    await refresh();
  }, 'Calibrazione terminata'));

  let advancedKey = null;
  for (const id of ['advancedFirst', 'advancedSecond']) $(id).innerHTML = $('mapTarget').innerHTML;
  $('advancedFirst').value = '4'; $('advancedSecond').value = '224';
  function renderAdvanced() {
    drawKeyboard($('kbdAdvanced'), {
      label: k => ({ main: physicalLabel(k), sub: aula.state?.performances.find(p => p.keyValue === k)?.advancedKeyMode ? 'ADV' : '' }),
      classes: k => k === advancedKey ? 'is-selected' : '',
      onClick: k => { advancedKey = k; $('advancedTitle').textContent = `Tasto ${physicalLabel(k)}`; renderAdvanced(); },
    });
  }
  $('advancedMode').addEventListener('change', () => {
    const mode = $('advancedMode').value;
    $('advancedDelayLabel').hidden = !['mt', 'tgl'].includes(mode);
    $('advancedSecondLabel').hidden = ['tgl', 'rs'].includes(mode);
    $('advancedTravelLabel').hidden = mode !== 'dks';
    $('advancedHint').textContent = {
      mt: 'Un tocco invia la prima funzione; una pressione lunga attiva la seconda.',
      tgl: 'Un tocco mantiene attiva la funzione; il tocco successivo la rilascia.',
      dks: 'La prima funzione scatta a 0,5 mm, la seconda al punto scelto. Il rilascio le disattiva.',
      rs: 'La prima funzione indica il secondo tasto fisico della coppia. Prevale il tasto con maggiore corsa.',
    }[mode];
  });
  document.addEventListener('click', e => {
    if (e.target.closest('.seg')) queueMicrotask(() => {
      document.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-pressed', b.classList.contains('active')));
    });
  });
  $('btnAdvancedApply').addEventListener('click', () => task($('btnAdvancedApply'), async () => {
    if (advancedKey == null) throw new Error('Seleziona un tasto.');
    if (!$('advancedDelay').reportValidity() || !$('advancedTravel').reportValidity()) throw new Error('Controlla i valori.');
    await aula.writeAdvanced(advancedKey, $('advancedMode').value, {
      first: Number($('advancedFirst').value), second: Number($('advancedSecond').value),
      delay: Number($('advancedDelay').value), travel: Number($('advancedTravel').value),
    });
    await refresh();
  }, 'Comportamento scritto e verificato'));
  $('btnAdvancedRemove').addEventListener('click', () => task($('btnAdvancedRemove'), async () => {
    if (advancedKey == null) throw new Error('Seleziona un tasto.');
    await aula.removeAdvanced(advancedKey);
    await refresh();
  }, 'Funzione avanzata rimossa'));

  function renderDevice() {
    const s = aula.state;
    $('deviceFirmware').textContent = s?.info?.appVersion && s.info.appVersion !== 'KB2' ? s.info.appVersion : 'Non disponibile';
    $('deviceProtocol').textContent = s?.protocolVersion ?? '—';
    $('deviceKeys').textContent = s?.physical.length ?? '—';
    for (const b of $('profileSeg').children) b.classList.toggle('active', Number(b.dataset.profile) === s?.config?.configID);
    $('profileReadout').textContent = s?.config?.hasFourConfig ? `Profilo attuale: ${s.config.configID + 1}` : 'La disponibilità viene verificata alla connessione.';
    $('socdFirst').textContent = keyLabel(ui.socdPair[0]);
    $('socdSecond').textContent = keyLabel(ui.socdPair[1]);
    $('socdReadout').textContent = s ? (s.socd?.length ? `Coppie attive: ${s.socd.map(p => `${keyLabel(p.pos1)}/${keyLabel(p.pos2)}`).join(', ')}` : 'Nessuna coppia SOCD attiva.') : 'Collega la tastiera per leggere le coppie attive.';
  }
  document.addEventListener('studio:render', () => {
    if (aula.state?.lighting && aula.state.lighting !== lightSource) {
      light = structuredClone(aula.state.lighting); lightSource = aula.state.lighting;
      custom = new Map((aula.state.customLighting || []).map(c => [c.key, c]));
      paletteIndex = Math.max(0, light.staticColor - 1); dirty = false;
    }
    renderRgb(); renderAdvanced(); renderDevice();
  });
  initLanguage(preferences);
}
