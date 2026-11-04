import { AulaKeyboard, BASE_LAYER, FN_LAYER, KEYCODES, RATE_LABELS } from './aula.js';
import { CODE_TO_HID, KEY_GROUPS, KEY_WIDTH, keyLabel, physicalLabel } from './keycodes.js';
import { stepTrigger } from './settings.js';
import { initWorkspace } from './workspace.js';

const $ = (id) => document.getElementById(id);
const MAX_TRAVEL = 3.4;
// Physical matrix of the WIN 60 HE MAX (row, col, default code), used until the device reports its own.
const DEFAULT_ROWS = [
  [41, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 45, 46, 42],
  [43, 20, 26, 8, 21, 23, 28, 24, 12, 18, 19, 47, 48, 49],
  [57, 4, 22, 7, 9, 10, 11, 13, 14, 15, 51, 52, 40],
  [225, 29, 27, 6, 25, 5, 17, 16, 54, 55, 56, 229],
  [224, 227, 226, 44, 230, 101, 228, 1],
];
const DEFAULT_COLS = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13],
  [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  [0, 1, 2, 6, 9, 10, 11, 12],
];

const aula = new AulaKeyboard((message, level = 'info') => log(message, level));
const ui = {
  connected: false,
  busy: false,
  layer: BASE_LAYER,
  mapKey: null,
  perfSel: new Set(),
  followKey: KEYCODES.W,
  followPerf: null,
  socdMode: 0,
  live: false,
  socdPair: [KEYCODES.A, KEYCODES.D],
  calibration: false,
};

// ---------- helpers ----------

function log(message, level = 'info') {
  const el = $('log');
  const line = document.createElement('div');
  line.className = `log-${level}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  el.appendChild(line);
  while (el.childElementCount > 400) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
}

let toastTimer;
function toast(message, kind = 'ok') {
  const el = $('toast');
  el.textContent = message;
  el.className = `toast toast--${kind}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3500);
}

function setStatus(text, kind) {
  $('status').textContent = text;
  $('status').className = `status status--${kind}`;
  if (kind === 'warn') $('entryStatus').textContent = text;
}

function setButtons() {
  const becameConnected = ui.connected && $('workspace').hidden;
  for (const b of document.querySelectorAll('[data-needs-device]')) b.disabled = !ui.connected || ui.busy;
  if (ui.calibration) for (const b of document.querySelectorAll('[data-needs-device]')) b.disabled = true;
  $('btnRestore').disabled = !ui.connected || ui.busy || ui.calibration || !aula.backup;
  $('btnConnect').disabled = ui.busy || ui.calibration || !AulaKeyboard.isSupported();
  $('btnConnect').textContent = ui.connected ? 'Riconnetti' : 'Connetti tastiera';
  $('btnMapApply').disabled ||= $('btnMapApply').dataset.locked === '1';
  $('btnMapDefault').disabled ||= $('btnMapApply').dataset.locked === '1';
  $('btnCalibrationEnd').disabled = !ui.connected || ui.busy || !ui.calibration;
  $('btnDisconnect').hidden = !ui.connected;
  $('btnDisconnect').disabled = ui.busy || ui.calibration;
  for (const b of $('profileSeg').children) b.disabled ||= !aula.state?.config?.hasFourConfig;
  $('btnSystemApply').disabled ||= !aula.state?.system?.hasWinMode;
  $('btnSuperResponse').disabled ||= !aula.state?.lighting;
  $('perfMode').querySelector('[value="global"]').disabled = !aula.state?.globalPerformance;
  $('connectionHint').hidden = ui.connected;
  $('connectionScreen').hidden = ui.connected;
  $('workspace').hidden = !ui.connected;
  $('workspace').inert = !ui.connected;
  document.querySelector('.skip-link').href = ui.connected ? '#main' : '#btnEntryConnect';
  if (becameConnected) $('main').focus({ preventScroll: true });
  document.body.classList.toggle('is-disconnected', !ui.connected);
  $('btnEntryConnect').disabled = ui.busy || !AulaKeyboard.isSupported();
  $('btnEntryConnect').querySelector('span').textContent = ui.busy ? 'Connessione e lettura…' : 'Connetti la tua tastiera';
}

// Runs one device operation at a time; live polling is paused so responses don't interleave.
async function task(button, fn, okMessage) {
  if (ui.busy) return;
  ui.busy = true;
  setButtons();
  const wasLive = ui.live;
  if (wasLive) await stopLive();
  const old = button?.textContent;
  if (button) button.textContent = 'Attendi…';
  try {
    await fn();
    if (okMessage) toast(okMessage);
  } catch (error) {
    const msg = error?.message || String(error);
    log(msg, 'error');
    toast(msg, 'err');
    if (!ui.connected) { $('entryError').textContent = msg; $('entryError').hidden = false; }
  } finally {
    if (button) button.textContent = old;
    ui.busy = false;
    setButtons();
    if (wasLive && ui.connected && document.querySelector('.view.active')?.dataset.view === 'test' && !document.hidden) startLive();
  }
}

function physicalRows() {
  const physical = aula.state?.physical;
  if (!physical?.length) {
    return DEFAULT_ROWS.map((row, r) => row.map((keyValue, i) => ({ keyValue, row: r + 1, col: DEFAULT_COLS[r][i] })));
  }
  const rows = new Map();
  for (const p of physical) {
    if (!rows.has(p.row)) rows.set(p.row, []);
    rows.get(p.row).push(p);
  }
  return [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, keys]) => keys.sort((a, b) => a.col - b.col));
}

const perfOf = (key) => aula.state?.performances?.find((p) => p.keyValue === key);
const mapOf = (layer, key) => aula.state?.layerMaps?.[layer]?.get(key) ?? (layer === BASE_LAYER ? (key === 1 ? 0xf001 : key) : 1);

// ---------- keyboard drawing ----------

function drawKeyboard(el, { label, classes, onClick }) {
  el.textContent = '';
  for (const row of physicalRows()) {
    const rowEl = document.createElement('div');
    rowEl.className = 'kbd-row';
    for (const p of row) {
      const k = document.createElement('button');
      k.type = 'button';
      k.className = `key ${classes?.(p.keyValue) || ''}`;
      k.style.setProperty('--w', KEY_WIDTH[p.keyValue] || 1);
      k.dataset.key = p.keyValue;
      k.dataset.row = p.row;
      k.dataset.col = p.col;
      const main = label(p.keyValue);
      k.innerHTML = `<span class="key-main"></span><span class="key-sub"></span>`;
      k.firstChild.textContent = main.main;
      k.lastChild.textContent = main.sub || '';
      k.title = `${physicalLabel(p.keyValue)} (${p.keyValue})`;
      k.setAttribute('aria-label', `${physicalLabel(p.keyValue)}: ${main.main}${main.sub ? `, ${main.sub}` : ''}`);
      if (onClick) k.setAttribute('aria-pressed', k.classList.contains('is-selected'));
      else k.tabIndex = -1;
      if (onClick) k.addEventListener('click', (e) => onClick(p.keyValue, e));
      rowEl.appendChild(k);
    }
    el.appendChild(rowEl);
  }
}

function renderAll() {
  renderOverview();
  renderKeymap();
  renderPerf();
  renderTestKeyboard();
  document.dispatchEvent(new Event('studio:render'));
}

// ---------- overview ----------

function renderOverview() {
  const s = aula.state;
  $('statRate').textContent = s?.rate ?? '—';
  $('statRt').textContent = s ? `${s.rtCount}/${s.physical.length}` : '—';
  $('statSocd').textContent = s ? (s.socd?.length ? s.socd.map(p => `${keyLabel(p.pos1)}/${keyLabel(p.pos2)}`).join(' · ') : 'Spento') : '—';
  $('statProto').textContent = s?.protocolVersion ?? '—';
  for (const b of $('rateSeg').children) b.classList.toggle('active', Number(b.dataset.rate) === s?.rateIndex);
  drawKeyboard($('kbdOverview'), {
    label: (k) => ({ main: keyLabel(mapOf(BASE_LAYER, k)), sub: fnSub(k) }),
    classes: (k) => {
      const p = perfOf(k);
      return [p?.touchMode === 'rt' ? 'is-rt' : '', p?.advancedKeyMode === 8 ? 'is-socd' : ''].join(' ');
    },
  });
}

function fnSub(k) {
  const v = mapOf(FN_LAYER, k);
  return v === 1 || v === undefined ? '' : keyLabel(v);
}

$('rateSeg').innerHTML = RATE_LABELS.map((l, i) => `<button data-rate="${i}" data-needs-device>${l}</button>`).join('');
$('rateSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  task(null, async () => {
    await aula.setRate(Number(b.dataset.rate));
    renderOverview();
  }, `Polling impostato a ${RATE_LABELS[b.dataset.rate]}`);
});

$('btnProfile').addEventListener('click', () => {
  const act = Number($('pfAct').value) || 0.5;
  const rt = Number($('pfRt').value) || 0.15;
  $('pfProgress').hidden = false;
  task($('btnProfile'), async () => {
    try {
      await aula.applyProfile({ sensitivity: rt, firstTouch: act, socdMode: 0, want8k: true });
      await refresh();
    } finally {
      $('pfProgress').hidden = true;
    }
  }, 'Profilo FPS applicato');
});

$('btnFixFn').addEventListener('click', () =>
  task($('btnFixFn'), async () => {
    await aula.fixFnArrows();
    renderAll();
  }, 'Frecce Fn impostate'),
);

// ---------- keymap ----------

function renderKeymap() {
  for (const b of $('layerSeg').children) b.classList.toggle('active', Number(b.dataset.layer) === ui.layer);
  drawKeyboard($('kbdMap'), {
    label: (k) => ({ main: keyLabel(mapOf(ui.layer, k)), sub: ui.layer === FN_LAYER ? physicalLabel(k) : '' }),
    classes: (k) => [
      k === ui.mapKey ? 'is-selected' : '',
      mapOf(ui.layer, k) !== (ui.layer === BASE_LAYER ? k : 1) ? 'is-changed' : '',
      ui.layer === FN_LAYER && mapOf(FN_LAYER, k) === 1 ? 'is-empty' : '',
    ].join(' '),
    onClick: (k) => {
      ui.mapKey = k;
      renderKeymap();
      openMapEditor();
    },
  });
}

function openMapEditor() {
  const k = ui.mapKey;
  if (k == null) return;
  const current = mapOf(ui.layer, k);
  $('mapEditor').hidden = false;
  $('mapKeyName').textContent = `${physicalLabel(k)} · ${ui.layer === BASE_LAYER ? 'layer base' : 'layer Fn'}`;
  $('mapCurrent').textContent = `Funzione attuale: ${keyLabel(current)} (codice ${current})`;
  $('mapTarget').value = String(current);
  if ($('mapTarget').value !== String(current)) $('mapTarget').value = '1';
  $('mapSocdWarn').hidden = !(ui.layer === FN_LAYER && perfOf(k)?.advancedKeyMode === 8);
  const lockFn = ui.layer === BASE_LAYER && isFnKey(k);
  $('btnMapApply').dataset.locked = lockFn ? '1' : '';
  if (lockFn) $('mapCurrent').textContent += ' — il tasto Fn non è rimappabile qui, altrimenti perderesti il layer Fn.';
  $('mapEmpty').hidden = true;
  setButtons();
  document.dispatchEvent(new Event('studio:map'));
}
const isFnKey = key => [1, KEYCODES.FN0, KEYCODES.FN1, KEYCODES.FN2, KEYCODES.FN3].includes(key);

$('mapTarget').innerHTML = Object.entries(KEY_GROUPS)
  .map(([group, codes]) => `<optgroup label="${group}">${Object.entries(codes)
    .map(([code, name]) => `<option value="${code}">${name === '—' ? 'Nessuna funzione' : name}</option>`)
    .join('')}</optgroup>`)
  .join('');

$('layerSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  ui.layer = Number(b.dataset.layer);
  renderKeymap();
  openMapEditor();
});

async function applyMapping(value) {
  const k = ui.mapKey;
  if (k == null) return;
  if (ui.layer === BASE_LAYER && isFnKey(k)) throw new Error('Il tasto Fn non si rimappa dal layer base.');
  await aula.setMapping(ui.layer, k, value);
  log(`${physicalLabel(k)} (${ui.layer === BASE_LAYER ? 'base' : 'Fn'}) → ${keyLabel(value)}`, 'ok');
  renderAll();
  openMapEditor();
}

$('btnMapApply').addEventListener('click', () =>
  task($('btnMapApply'), () => applyMapping(Number($('mapTarget').value)), 'Mappatura salvata'),
);
$('btnMapDefault').addEventListener('click', () =>
  task($('btnMapDefault'), () => applyMapping(ui.layer === BASE_LAYER ? ui.mapKey : 1), 'Tasto ripristinato'),
);

// ---------- performance ----------

const sliders = [
  ['perfAct', 'oAct'],
  ['perfRtp', 'oRtp'],
  ['perfRtr', 'oRtr'],
  ['perfDp', 'oDp'],
  ['perfDr', 'oDr'],
];
for (const [input, out] of sliders) {
  $(input).addEventListener('input', () => {
    $(out).textContent = Number($(input).value).toFixed(2);
    drawDiagram();
  });
  $(out).textContent = Number($(input).value).toFixed(2);
}
$('perfMode').addEventListener('change', drawDiagram);

function renderPerf() {
  drawKeyboard($('kbdPerf'), {
    label: (k) => ({ main: physicalLabel(k), sub: perfOf(k)?.touchMode === 'rt' ? 'RT' : '' }),
    classes: (k) => [ui.perfSel.has(k) ? 'is-selected' : '', perfOf(k)?.touchMode === 'rt' ? 'is-rt' : ''].join(' '),
    onClick: (k) => {
      if (ui.perfSel.has(k)) ui.perfSel.delete(k);
      else ui.perfSel.add(k);
      afterSelection();
    },
  });
  $('perfSelCount').textContent = `${ui.perfSel.size} tasti selezionati`;
}

function afterSelection() {
  renderPerf();
  if (ui.perfSel.size === 1 && ui.connected) {
    const [k] = ui.perfSel;
    task(null, async () => {
      const p = await aula.readKeyPerf(k);
      $('perfMode').value = p.touchMode;
      const set = (id, v) => {
        $(id).value = v;
        $(id).dispatchEvent(new Event('input'));
      };
      set('perfAct', p.touchMode === 'global' ? aula.state.globalPerformance?.globalTouchTravel ?? p.actuation : p.actuation);
      set('perfRtp', p.rtPress);
      set('perfRtr', p.rtRelease);
      set('perfDp', p.pressDead);
      set('perfDr', p.releaseDead);
      $('perfReadout').textContent = `${physicalLabel(k)}: ${p.touchMode === 'rt' ? 'Rapid Trigger' : p.touchMode}, attuazione ${p.actuation} mm, RT ${p.rtPress}/${p.rtRelease} mm.`;
    });
  }
}

document.querySelectorAll('[data-select]').forEach((b) =>
  b.addEventListener('click', () => {
    const all = physicalRows().flat().map((p) => p.keyValue);
    const pick = { all, wasd: [KEYCODES.W, KEYCODES.A, KEYCODES.S, KEYCODES.D], none: [] }[b.dataset.select];
    ui.perfSel = new Set(pick);
    afterSelection();
  }),
);

$('btnPerfApply').addEventListener('click', () => {
  const keys = [...ui.perfSel];
  if (keys.length === 0) return toast('Seleziona almeno un tasto', 'err');
  const values = {
    touchMode: $('perfMode').value,
    actuation: Number($('perfAct').value),
    rtPress: Number($('perfRtp').value),
    rtRelease: Number($('perfRtr').value),
    pressDead: Number($('perfDp').value),
    releaseDead: Number($('perfDr').value),
  };
  const bar = $('perfProgress');
  bar.hidden = false;
  task($('btnPerfApply'), async () => {
    try {
      await aula.writeKeyPerf(keys, values, (d, n) => bar.firstElementChild.style.setProperty('--p', d / n));
      renderAll();
    } finally {
      bar.hidden = true;
      bar.firstElementChild.style.removeProperty('--p');
    }
  }, `Salvato su ${keys.length} tasti`);
});

function drawDiagram() {
  const act = Number($('perfAct').value);
  const rtp = Number($('perfRtp').value);
  const rtr = Number($('perfRtr').value);
  const dp = Number($('perfDp').value);
  const dr = Number($('perfDr').value);
  const rt = $('perfMode').value === 'rt';
  const top = 20;
  const h = 220;
  const y = (mm) => top + (mm / MAX_TRAVEL) * h;
  const svg = $('perfDiagram');
  svg.innerHTML = `
    <rect x="40" y="${top}" width="60" height="${h}" rx="8" class="d-track"/>
    <rect x="40" y="${top}" width="60" height="${y(dp) - top}" class="d-dead"/>
    <rect x="40" y="${y(MAX_TRAVEL - dr)}" width="60" height="${top + h - y(MAX_TRAVEL - dr)}" class="d-dead"/>
    <rect x="40" y="${y(act)}" width="60" height="${top + h - y(act)}" class="d-active"/>
    <line x1="30" x2="110" y1="${y(act)}" y2="${y(act)}" class="d-act"/>
    <text x="116" y="${y(act) + 4}" class="d-label">attuazione ${act.toFixed(2)} mm</text>
    ${rt ? `
      <path d="M150 ${y(act) + 30} v ${-Math.max(8, (rtr / MAX_TRAVEL) * h)}" class="d-arrow up"/>
      <path d="M180 ${y(act) + 30} v ${Math.max(8, (rtp / MAX_TRAVEL) * h)}" class="d-arrow down"/>
      <text x="130" y="${y(act) + 52}" class="d-label">↑ ${rtr.toFixed(2)}  ↓ ${rtp.toFixed(2)}</text>` : ''}
    <text x="40" y="12" class="d-label">0 mm</text>
    <text x="40" y="${top + h + 16}" class="d-label">${MAX_TRAVEL} mm</text>`;
}

// ---------- SOCD ----------

$('socdSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  ui.socdMode = Number(b.dataset.mode);
  for (const x of $('socdSeg').children) x.classList.toggle('active', x === b);
});

$('btnSocdApply').addEventListener('click', () =>
  task($('btnSocdApply'), async () => {
    await aula.applySocd(ui.socdMode, ui.socdPair);
    renderAll();
  }, 'SOCD salvato e verificato'),
);
$('btnSocdRemove').addEventListener('click', () =>
  task($('btnSocdRemove'), async () => {
    await aula.removeSocd(ui.socdPair);
    renderAll();
  }, 'SOCD disattivato'),
);

// ---------- live test ----------

const trace = [];
const rtState = { pressed: false, ref: 0 };

function renderTestKeyboard() {
  drawKeyboard($('kbdTest'), {
    label: (k) => ({ main: physicalLabel(k), sub: '' }),
    classes: (k) => (k === ui.followKey ? 'is-selected' : ''),
    onClick: (k) => {
      ui.followKey = k;
      renderTestKeyboard();
      loadFollowPerf();
    },
  });
  $('capLabel').textContent = physicalLabel(ui.followKey);
}

function loadFollowPerf() {
  ui.followPerf = null;
  Object.assign(rtState, { pressed: false, ref: 0, started: false });
  trace.length = 0;
  if (!ui.connected) return;
  task(null, async () => {
    ui.followPerf = await aula.readKeyPerf(ui.followKey);
  });
}

// Mirrors the firmware's Rapid Trigger logic so the UI can show press/release from the raw travel.
function stepRt(t, perf) {
  stepTrigger(rtState, t, perf ?? {});
}

function drawLive(travels) {
  const key = $('kbdTest').querySelector(`[data-key="${ui.followKey}"]`);
  const t = key ? travels?.[key.dataset.row]?.[key.dataset.col] ?? 0 : 0;
  stepRt(t, ui.followPerf);
  const frac = Math.min(1, t / MAX_TRAVEL);
  $('cap3d').style.setProperty('--depth', frac);
  $('cap3d').classList.toggle('down', rtState.pressed);
  $('gaugeFill').style.setProperty('--p', frac);
  $('gaugeAct').style.setProperty('--p', (ui.followPerf?.actuation ?? 0.5) / MAX_TRAVEL);
  $('liveMm').textContent = t.toFixed(2);
  $('liveState').textContent = rtState.pressed ? 'premuto' : 'rilasciato';
  $('liveState').classList.toggle('on', rtState.pressed);

  for (const k of $('kbdTest').children) {
    for (const b of k.children) {
      const v = travels?.[b.dataset.row]?.[b.dataset.col] ?? 0;
      b.style.setProperty('--heat', Math.min(1, v / MAX_TRAVEL));
    }
  }

  trace.push({ t, p: rtState.pressed });
  if (trace.length > 240) trace.shift();
  const c = $('trace');
  const g = c.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  g.clearRect(0, 0, c.width, c.height);
  const yOf = (mm) => 8 + (mm / MAX_TRAVEL) * (c.height - 16);
  g.strokeStyle = css.getPropertyValue('--warn');
  g.setLineDash([6, 6]);
  g.beginPath();
  g.moveTo(0, yOf(ui.followPerf?.actuation ?? 0.5));
  g.lineTo(c.width, yOf(ui.followPerf?.actuation ?? 0.5));
  g.stroke();
  g.setLineDash([]);
  const step = c.width / 240;
  for (let i = 1; i < trace.length; i += 1) {
    g.strokeStyle = trace[i].p ? css.getPropertyValue('--accent') : css.getPropertyValue('--muted');
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo((i - 1) * step, yOf(trace[i - 1].t));
    g.lineTo(i * step, yOf(trace[i].t));
    g.stroke();
  }
}

let liveLoop = null;
function startLive() {
  if (ui.live || ui.busy || !ui.connected || document.hidden) return;
  ui.live = true;
  $('btnLive').textContent = 'Ferma lettura';
  liveLoop = (async () => {
    let errors = 0;
    while (ui.live) {
      try {
        drawLive(await aula.readTravel());
        errors = 0;
      } catch (error) {
        errors += 1;
        if (errors > 5) {
          log(`Lettura corsa interrotta: ${error?.message || error}`, 'warn');
          toast('Questa tastiera non risponde alla lettura della corsa', 'err');
          ui.live = false;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    $('btnLive').textContent = 'Avvia lettura';
  })();
}

async function stopLive() {
  ui.live = false;
  await liveLoop;
}

$('btnLive').addEventListener('click', async () => {
  if (ui.live) return stopLive();
  if (!ui.followPerf) {
    await task(null, async () => {
      ui.followPerf = await aula.readKeyPerf(ui.followKey);
    });
  }
  startLive();
});

// What Windows receives.
const keyLines = [];
function onKey(e, down) {
  if (e.target?.closest?.('input, select, textarea')) return;
  if (document.querySelector('.view.active')?.dataset.view !== 'test') return;
  if (e.key === 'Tab' || e.key === 'Escape' || (['Enter', ' '].includes(e.key) && e.target?.closest?.('button, a'))) return;
  e.preventDefault();
  if (down && e.repeat) return;
  const hid = CODE_TO_HID[e.code];
  const keyEl = hid ? $('kbdTest').querySelector(`[data-key="${hid}"]`) : null;
  keyEl?.classList.toggle('is-down', down);
  const chips = $('pressed');
  if (down) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.dataset.code = e.code;
    chip.textContent = e.key === ' ' ? 'Space' : e.key;
    if (![...chips.children].some(c => c.dataset.code === e.code)) chips.appendChild(chip);
  } else {
    chips.querySelector(`[data-code="${e.code}"]`)?.remove();
  }
  keyLines.push(`${down ? '▼' : '▲'} ${e.code.padEnd(14)} key=${e.key}`);
  if (keyLines.length > 14) keyLines.shift();
  $('keyLog').textContent = keyLines.join('\n');
}
window.addEventListener('keydown', (e) => onKey(e, true), true);
window.addEventListener('keyup', (e) => onKey(e, false), true);
window.addEventListener('blur', () => {
  $('pressed').textContent = '';
  document.querySelectorAll('.is-down').forEach((k) => k.classList.remove('is-down'));
});

// ---------- backup ----------

$('btnBackup').addEventListener('click', () => task($('btnBackup'), async () => {
  $('backupProgress').hidden = false;
  try {
    const data = await aula.captureBackup((done, total) => {
      $('backupProgress').firstElementChild.style.setProperty('--p', done / total);
      $('backupInfo').textContent = `Lettura ${done}/${total}`;
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `win60he-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    $('backupInfo').textContent = `${data.performances.length} tasti · ${data.socd.length} coppie SOCD · RGB inclusi`;
  } finally { $('backupProgress').hidden = true; }
}, 'Backup completo scaricato'));

$('fileBackup').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 1024 * 1024) throw new Error('Il file supera 1 MB.');
    aula.loadBackup(JSON.parse(await file.text()));
    $('backupInfo').textContent = `${file.name} · v${aula.backup.schema} · ${aula.backup.performances.length} tasti`;
    toast(`Backup letto: ${file.name}`);
  } catch (error) {
    aula.backup = null;
    $('backupInfo').textContent = 'Nessun file valido caricato.';
    toast(`Backup non valido: ${error?.message || error}`, 'err');
  }
  setButtons();
});

$('btnRestore').addEventListener('click', () =>
  task($('btnRestore'), async () => {
    await aula.restoreBackup();
    await refresh();
  }, 'Backup ripristinato'),
);

// ---------- navigation & connect ----------

$('nav').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  for (const x of $('nav').children) x.classList.toggle('active', x === b);
  for (const v of document.querySelectorAll('.view')) v.classList.toggle('active', v.dataset.view === b.dataset.view);
  if (b.dataset.view !== 'test' && ui.live) stopLive();
});

async function refresh() {
  await aula.diagnose();
  const socd = aula.state.socd.find(p => p.pos1 === ui.socdPair[0]);
  ui.socdMode = socd?.mode ?? 0;
  for (const x of $('socdSeg').children) x.classList.toggle('active', Number(x.dataset.mode) === ui.socdMode);
  renderAll();
}

$('btnConnect').addEventListener('click', () =>
  task($('btnConnect'), async () => {
    setStatus('Connessione…', 'warn');
    $('entryError').hidden = true;
    try {
      await aula.connect();
      setStatus(aula.initialInfo?.name || 'Connessa', 'ok');
      await refresh();
      ui.connected = true;
      ui.followPerf = null;
      renderAll();
    } catch (error) {
      ui.connected = false;
      setStatus('Non connesso', 'idle');
      await aula.disconnect();
      renderAll();
      throw error;
    }
  }, 'Tastiera connessa'),
);

$('btnEntryConnect').addEventListener('click', () => $('btnConnect').click());
drawKeyboard($('entryKeyboard'), { label: key => ({ main: physicalLabel(key) }) });

if (!AulaKeyboard.isSupported()) {
  $('notSupported').hidden = false;
  $('btnConnect').disabled = true;
  $('entryStatus').textContent = 'Apri questa pagina in Chrome o Edge su desktop per collegare la tastiera via USB.';
}

initWorkspace({ aula, ui, task, toast, log, renderAll, drawKeyboard, physicalRows, mapOf, refresh, setButtons, setStatus, stopLive, openMapEditor });
drawDiagram();
renderAll();
setButtons();
if (!AulaKeyboard.isSupported()) $('btnConnect').disabled = true;
window.__aulaBooted = true;
log('Pronto. Collega la tastiera via USB, chiudi altre schede del driver AULA e premi Connetti.');
