import Keyboard from '@sparklinkplayjoy/sdk-keyboard';

const VENDOR_ID = 0x1ca2;
const PRODUCT_ID = 0x1902;
const USAGE_PAGES = [0xffa0, 0xffb0];
const USAGE = 1;

export const KEYCODES = {
  A: 4,
  D: 7,
  S: 22,
  W: 26,
  RIGHT: 79,
  LEFT: 80,
  DOWN: 81,
  UP: 82,
  SLASH: 56,
  RALT: 230,
  MENU: 101,
  RCTRL: 228,
  FN0: 61696,
  FN1: 61697,
  FN2: 61698,
  FN3: 61699,
};

export const KEY_NAMES = {
  4: 'A',
  7: 'D',
  22: 'S',
  26: 'W',
  79: '->',
  80: '<-',
  81: 'v',
  82: '^',
  61696: 'Fn0',
  61697: 'Fn1',
  61698: 'Fn2',
  61699: 'Fn3',
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function numberOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n !== 0 ? n : fallback;
}

function isBadResult(value) {
  return (
    value instanceof Error ||
    (value && typeof value === 'object' && typeof value.message === 'string' && typeof value.stack === 'string')
  );
}

function computeKb2CheckSum(pack) {
  let sum = 0x35 + pack[0] + pack[1] + pack[2];
  const len = pack[1];
  if (len > 0 && len <= 63 * 4) sum += pack[len + 4 - 1];
  return sum & 0xff;
}

function buildSyncPacket() {
  const packet = new Uint8Array(64);
  packet[0] = 0x5c;
  packet[1] = 6;
  packet[2] = 1;
  packet[4] = 1;
  packet[5] = 2;
  packet[6] = 3;
  packet[7] = 4;
  packet[8] = 0xff;
  packet[9] = 0xff;
  packet[3] = computeKb2CheckSum(packet);
  return packet;
}

// Verified on WIN 60 HE MAX (protocol 1.0.9): layout 0 = base layer, 1 = Fn layer, 2-3 unused.
export const LAYER_NAMES = ['Base', 'Fn', 'L2', 'L3'];
export const BASE_LAYER = 0;
export const FN_LAYER = 1;
// The firmware ignores the Fn layer on SOCD keys, so Fn+A/D can't be arrows while SOCD is on A/D:
// Left/Right also live on Fn+RAlt/RCtrl (Wooting-style cluster with Fn+/ and Fn+Menu).
const FN_ARROWS = [
  ['W', KEYCODES.W, KEYCODES.UP],
  ['A', KEYCODES.A, KEYCODES.LEFT],
  ['S', KEYCODES.S, KEYCODES.DOWN],
  ['D', KEYCODES.D, KEYCODES.RIGHT],
  ['/', KEYCODES.SLASH, KEYCODES.UP],
  ['RAlt', KEYCODES.RALT, KEYCODES.LEFT],
  ['Menu', KEYCODES.MENU, KEYCODES.DOWN],
  ['RCtrl', KEYCODES.RCTRL, KEYCODES.RIGHT],
];
export const RATE_LABELS = ['8KHz', '4KHz', '2KHz', '1KHz', '500Hz', '250Hz', '125Hz'];

export class AulaKeyboard {
  constructor(log) {
    this.log = log || (() => {});
    this.kb = null;
    this.device = null;
    this.state = null;
    this.backup = null;
  }

  static isSupported() {
    return typeof navigator !== 'undefined' && 'hid' in navigator;
  }

  async sendRawSync(hidDevice) {
    if (!hidDevice?.sendReport) throw new Error('HIDDevice non disponibile per il SYNCPack.');
    await hidDevice.sendReport(0, buildSyncPacket());
    this.log('SYNCPack inviato.', 'info');
  }

  async connect() {
    if (!AulaKeyboard.isSupported()) {
      throw new Error('WebHID non disponibile. Apri questa pagina in Chrome o Edge.');
    }

    if (this.kb) {
      try {
        await this.kb.closeDevice();
      } catch (error) {
        this.log(`Chiusura sessione precedente: ${error?.message || error}`, 'warn');
      }
    }

    this.kb = new Keyboard({
      configs: [
        { vendorId: VENDOR_ID, productId: PRODUCT_ID, usagePage: 0xffa0, usage: USAGE },
        { vendorId: VENDOR_ID, productId: PRODUCT_ID, usagePage: 0xffb0, usage: USAGE },
      ],
      usage: USAGE,
      usagePage: USAGE_PAGES,
    });

    const devices = await this.kb.getDevices();
    if (!devices || devices.length === 0) {
      throw new Error('Nessuna tastiera AULA trovata. Controlla il cavo, chiudi altre schede driver e riprova.');
    }

    const vendorDevices = devices.filter((d) =>
      d.collections?.some(
        (c) => (c.usagePage === 0xffa0 || c.usagePage === 0xffb0) && c.usage === USAGE,
      ),
    );
    const device =
      vendorDevices.find((d) => /WIN\s*60\s*HE\s*MAX/i.test(d.productName || '')) ||
      vendorDevices[0] ||
      devices[0];

    const collection =
      device.collections?.find(
        (c) => (c.usagePage === 0xffa0 || c.usagePage === 0xffb0) && c.usage === USAGE,
      ) || device.collections?.[0];
    this.log(
      `Interfaccia scelta: ${collection ? `${collection.usagePage.toString(16)}:${collection.usage}` : '?'} (${device.productName || '?'}).`,
    );

    const initialized = await this.kb.init(device.id);
    if (!initialized) {
      throw new Error('Inizializzazione del device fallita.');
    }
    this.device = device;

    this.kb.on('usbChange', (data) => {
      const type = data?.type || 'sconosciuto';
      if (type === 'disconnect' || type === 'isUpgrading_disconnect') {
        this.log(`USB: ${type}. Ricollega la tastiera se necessario.`, 'warn');
      } else {
        this.log(`USB: ${type}${data?.reconnect ? ' (riconnessa)' : ''}.`);
      }
    });

    const hidDevice = initialized.data || device.data;
    await this.sendRawSync(hidDevice);
    await sleep(80);

    const protocolVersion = await this.safe('Versione protocollo', () =>
      this.kb.getApi({ type: 'ORDER_TYPE_PROTOCOL_VERSION' }),
    );
    const keyboardName = await this.safe('Nome tastiera', () =>
      this.kb.getApi({ type: 'ORDER_TYPE_KEYBOARD_NAME' }),
    );
    if (protocolVersion === null && keyboardName === null) {
      throw new Error('La tastiera non risponde ai comandi KB2 dopo il SYNCPack.');
    }

    this.initialInfo = {
      appVersion: 'KB2',
      KeyboardLayout: '60%',
      KeyType: 3,
      KeyboardRunMode: 'App',
      name: typeof keyboardName === 'string' && keyboardName ? keyboardName : device.productName || 'WIN 60 HE MAX',
      protocolVersion: typeof protocolVersion === 'string' ? protocolVersion : '?',
    };
    this.log(
      `KB2 pronto: ${this.initialInfo.name}; protocollo ${this.initialInfo.protocolVersion}; interfaccia ${collection ? `${collection.usagePage.toString(16)}:${collection.usage}` : '?'}.`,
      'ok',
    );
    return device;
  }

  async safe(label, fn, fallback = null) {
    try {
      const result = await fn();
      if (isBadResult(result)) {
        this.log(`${label}: ${result.message || result}`, 'warn');
        return fallback;
      }
      return result;
    } catch (error) {
      this.log(`${label}: ${error?.message || error}`, 'warn');
      return fallback;
    }
  }

  flattenLayout(layout) {
    const result = [];
    if (!Array.isArray(layout)) return result;
    for (let r = 0; r < layout.length; r += 1) {
      const row = layout[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c += 1) {
        const item = row[c];
        if (!item || typeof item.keyValue !== 'number') continue;
        result.push({
          keyValue: item.keyValue,
          row: item.location?.row ?? r,
          col: item.location?.col ?? c,
        });
      }
    }
    return result;
  }

  layerMap(layer) {
    const map = new Map();
    for (const item of layer || []) map.set(item.key, item.value);
    return map;
  }

  async readLayer(layout) {
    const keys = this.state?.physical?.map((p) => p.keyValue) || [];
    const result = [];
    for (let i = 0; i < keys.length; i += 12) {
      const chunk = await this.kb.getLayoutKeyInfo(keys.slice(i, i + 12).map((key) => ({ key, layout })));
      if (isBadResult(chunk) || !Array.isArray(chunk)) throw new Error('Risposta layout non valida');
      result.push(...chunk);
    }
    return result;
  }

  async diagnose() {
    if (!this.kb) throw new Error('Prima connetti la tastiera.');
    if (!this.initialInfo) throw new Error('Connessione non inizializzata. Premi Connetti.');

    const info = this.initialInfo;
    const protocolRaw = await this.safe('Versione protocollo', () =>
      this.kb.getApi({ type: 'ORDER_TYPE_PROTOCOL_VERSION' }),
    );
    const protocolVersion = typeof protocolRaw === 'string' ? protocolRaw : info.protocolVersion;
    const rateRaw = await this.safe('Report rate', () => this.kb.getApi({ type: 'ORDER_TYPE_ROES' }));
    const rateIndex = Number.isFinite(Number(rateRaw)) ? Number(rateRaw) : null;

    const baseLayout = await this.kb.defKey();
    if (isBadResult(baseLayout) || !Array.isArray(baseLayout)) {
      throw new Error(`defKey non valido: ${baseLayout?.message || JSON.stringify(baseLayout)}`);
    }
    const physical = this.flattenLayout(baseLayout);
    if (physical.length === 0) throw new Error('Layout fisico vuoto.');

    const findKey = (keyValue) => physical.find((p) => p.keyValue === keyValue) || null;
    const positions = {
      W: findKey(KEYCODES.W),
      A: findKey(KEYCODES.A),
      S: findKey(KEYCODES.S),
      D: findKey(KEYCODES.D),
      Fn:
        findKey(KEYCODES.FN0) ||
        findKey(KEYCODES.FN1) ||
        findKey(KEYCODES.FN2) ||
        findKey(KEYCODES.FN3),
    };

    // readLayer may use state.physical as a fallback; set it early.
    this.state = { physical };

    const layers = [];
    for (let layout = 0; layout < 4; layout += 1) {
      layers.push(await this.safe(`Layer ${LAYER_NAMES[layout]}`, () => this.readLayer(layout)));
    }
    const layerMaps = layers.map((layer) => (layer ? this.layerMap(layer) : null));
    const fnLayer = FN_LAYER;
    const fnMap = layerMaps[FN_LAYER];
    const fnValues = {
      W: fnMap?.get(KEYCODES.W) ?? null,
      A: fnMap?.get(KEYCODES.A) ?? null,
      S: fnMap?.get(KEYCODES.S) ?? null,
      D: fnMap?.get(KEYCODES.D) ?? null,
    };

    const performances = [];
    let index = 0;
    for (const pos of physical) {
      index += 1;
      const modeInfo = await this.safe(`Modalità ${pos.keyValue}`, () =>
        this.kb.getPerformanceMode(pos.keyValue),
      );
      let rt = null;
      let dead = null;
      let single = null;
      if (
        pos.keyValue === KEYCODES.W ||
        pos.keyValue === KEYCODES.A ||
        pos.keyValue === KEYCODES.S ||
        pos.keyValue === KEYCODES.D
      ) {
        rt = await this.safe(`RT ${pos.keyValue}`, () => this.kb.getRtTravel(pos.keyValue));
        dead = await this.safe(`Deadzone ${pos.keyValue}`, () => this.kb.getDpDr(pos.keyValue));
        single = await this.safe(`Single ${pos.keyValue}`, () => this.kb.getSingleTravel(pos.keyValue));
      }
      performances.push({
        ...pos,
        touchMode: modeInfo?.touchMode ?? null,
        advancedKeyMode: modeInfo?.advancedKeyMode ?? null,
        rtPress: rt?.pressTravel ?? null,
        rtRelease: rt?.releaseTravel ?? null,
        single,
        pressDead: dead?.pressDead ?? null,
        releaseDead: dead?.releaseDead ?? null,
      });
      if (index % 15 === 0) this.log(`Diagnosi performance: ${index}/${physical.length}...`);
    }

    const rtCount = performances.filter((p) => p.touchMode === 'rt').length;
    const socdCount = performances.filter((p) => p.advancedKeyMode === 8).length;

    this.state = {
      connectedAt: new Date().toISOString(),
      device: this.device,
      info,
      protocolVersion,
      rateIndex,
      rate: rateIndex !== null ? RATE_LABELS[rateIndex] ?? String(rateIndex) : '?',
      baseLayout,
      physical,
      positions,
      layers,
      layerMaps,
      fnLayer,
      fnValues,
      performances,
      rtCount,
      socdCount,
    };
    return this.state;
  }

  summary() {
    const s = this.state;
    if (!s) return null;
    return {
      product: this.device?.productName || 'WIN 60 HE MAX',
      firmware: s.info?.appVersion ?? '?',
      protocol: s.protocolVersion ?? '?',
      layout: s.info?.KeyboardLayout ?? '?',
      keyType: s.info?.KeyType ?? '?',
      runMode: s.info?.KeyboardRunMode ?? '?',
      rate: s.rate ?? '?',
      fnLayer: s.fnLayer,
      fnValues: s.fnValues,
      keys: s.physical.length,
      rtCount: s.rtCount,
      socdCount: s.socdCount,
    };
  }

  async fixFnArrows() {
    const s = this.state;
    if (!s) throw new Error('Esegui prima la diagnosi.');
    const base = s.layerMaps[BASE_LAYER];
    const fn = s.layerMaps[FN_LAYER];
    if (!base || !fn) throw new Error('Layer base/Fn non leggibili.');

    const updates = [];
    // Base layer keeps W/A/S/D as letters (the old tool wrote arrows there).
    for (const k of [KEYCODES.W, KEYCODES.A, KEYCODES.S, KEYCODES.D]) {
      if (base.get(k) !== k) updates.push({ key: k, layout: BASE_LAYER, value: k });
    }
    for (const [label, key, target] of FN_ARROWS) {
      if (fn.get(key) !== target) {
        updates.push({ key, layout: FN_LAYER, value: target });
        this.log(`Fn+${label}: ${fn.get(key) ?? '?'} -> ${target}`);
      }
    }
    if (updates.length > 0) {
      const result = await this.kb.setKey(updates);
      if (isBadResult(result)) throw result;
    }

    for (const layout of [BASE_LAYER, FN_LAYER]) {
      s.layers[layout] = await this.readLayer(layout);
      s.layerMaps[layout] = this.layerMap(s.layers[layout]);
    }
    const nb = s.layerMaps[BASE_LAYER];
    const nf = s.layerMaps[FN_LAYER];
    s.fnValues = { W: nf.get(KEYCODES.W), A: nf.get(KEYCODES.A), S: nf.get(KEYCODES.S), D: nf.get(KEYCODES.D) };
    const ok =
      [KEYCODES.W, KEYCODES.A, KEYCODES.S, KEYCODES.D].every((k) => nb.get(k) === k) &&
      FN_ARROWS.every(([, key, target]) => nf.get(key) === target);
    this.log(
      ok ? 'Verifica riuscita: WASD lettere sul base, frecce su Fn+WASD e Fn+/ RAlt Menu RCtrl.' : 'Verifica layer non riuscita.',
      ok ? 'ok' : 'error',
    );
    return s.fnValues;
  }

  async applyRt(sensitivity = 0.15, firstTouch = 0.5) {
    const s = this.state;
    if (!s) throw new Error('Esegui prima la diagnosi.');
    let updated = 0;
    let index = 0;

    for (const pos of s.physical) {
      index += 1;
      const modeInfo = await this.safe(`Modalità ${pos.keyValue}`, () =>
        this.kb.getPerformanceMode(pos.keyValue),
      );
      const advanced = Number.isFinite(Number(modeInfo?.advancedKeyMode))
        ? Number(modeInfo.advancedKeyMode)
        : 0;

      const modeResult = await this.safe(`RT mode ${pos.keyValue}`, () =>
        this.kb.setPerformanceMode(pos.keyValue, 'rt', advanced),
      );
      if (modeResult === null) {
        this.log(`RT modalità fallita su ${pos.keyValue}.`, 'warn');
        continue;
      }

      // One command at a time: the device answers in order, parallel writes mixed up the values.
      const results = [];
      for (const write of [
        () => this.kb.setSingleTravel(pos.keyValue, firstTouch),
        () => this.kb.setRtPressTravel(pos.keyValue, sensitivity),
        () => this.kb.setRtReleaseTravel(pos.keyValue, sensitivity),
        () => this.kb.setDp(pos.keyValue, 0.15),
        () => this.kb.setDr(pos.keyValue, 0.15),
      ]) {
        results.push(await this.safe(`RT valori ${pos.keyValue}`, write));
      }
      const failed = results.filter((r) => r === null);
      if (failed.length > 0) {
        this.log(`RT valori: ${failed.length} comandi falliti su ${pos.keyValue}.`, 'warn');
      }
      updated += 1;
      if (index % 10 === 0) this.log(`RT: ${index}/${s.physical.length}...`);
      await sleep(8);
    }

    this.log(`RT applicato a ${updated}/${s.physical.length} tasti (${sensitivity} mm).`, 'ok');
    return updated;
  }

  // SOCD only on A/D: W/S keep their Fn arrows. Packet as the official AULA driver sends it:
  // type 0 = bind by position; mode 0 = last wins, 1 = A wins, 2 = D wins, 3 = neutral.
  async applySocd(mode = 0) {
    const s = this.state;
    if (!s) throw new Error('Esegui prima la diagnosi.');
    const version = typeof s.protocolVersion === 'string' ? s.protocolVersion : '1.0.9';
    const param = { pos1: KEYCODES.A, pos2: KEYCODES.D, key1: 0, key2: 0, type: 0, mode: Number(mode), delay: 0 };
    const result = await this.safe('SOCD A/D', () => this.kb.setSocd(param, version));
    const check = await this.safe('Verifica SOCD', () => this.kb.getPerformanceMode(KEYCODES.A));
    if (result === null || check?.advancedKeyMode !== 8) throw new Error('SOCD A/D non applicato.');
    this.log(`SOCD A/D: mode ${mode}.`, 'ok');
    return true;
  }

  async removeSocd() {
    for (const key of [KEYCODES.A, KEYCODES.D]) {
      await this.safe(`Rimozione SOCD ${key}`, () => this.kb.setPerformanceMode(key, 'rt', 0));
    }
    this.log('SOCD rimosso da A/D.', 'ok');
  }

  async applyRate() {
    const s = this.state;
    if (!s) throw new Error('Esegui prima la diagnosi.');

    let target = 0; // 0 = 8KHz
    this.log(`Imposto report rate ${RATE_LABELS[target]} (valore ${target})...`);
    let result = await this.safe('Set report rate 8K', () => this.kb.setRateOfReturn(target));
    if (result === null) {
      target = 3; // 3 = 1KHz
      this.log('8KHz non accettato; provo 1KHz.', 'warn');
      result = await this.safe('Set report rate 1K', () => this.kb.setRateOfReturn(target));
    }
    if (result === null) {
      throw new Error('Impostazione report rate fallita.');
    }

    const currentRaw = await this.safe('Verifica report rate', () =>
      this.kb.getApi({ type: 'ORDER_TYPE_ROES' }),
    );
    if (Number.isFinite(Number(currentRaw))) {
      s.rateIndex = Number(currentRaw);
      s.rate = RATE_LABELS[s.rateIndex] ?? String(s.rateIndex);
    } else {
      s.rateIndex = target;
      s.rate = RATE_LABELS[target] ?? String(target);
    }
    this.log(`Report rate attuale: ${s.rate}.`, 'ok');
    return { rateIndex: s.rateIndex, rate: s.rate };
  }

  async applyProfile({ sensitivity = 0.15, firstTouch = 0.5, socdMode = 0, want8k = true } = {}) {
    const steps = [];
    const run = async (label, fn) => {
      this.log(`--- ${label} ---`);
      const result = await fn();
      steps.push({ label, ok: true, result });
      return result;
    };

    await run('Correzione frecce Fn', () => this.fixFnArrows());
    await run('Rapid trigger', () => this.applyRt(sensitivity, firstTouch));
    await run('SOCD', () => this.applySocd(socdMode));
    if (want8k) {
      await run('Report rate 8K', () => this.applyRate());
    }

    this.log('Profilo applicato. Esegui una nuova diagnosi e prova Fn+WASD nel key tester.', 'ok');
    return steps;
  }

  async readKeyPerf(key) {
    const mode = await this.kb.getPerformanceMode(key);
    const rt = await this.kb.getRtTravel(key);
    const single = await this.kb.getSingleTravel(key);
    const dead = await this.kb.getDpDr(key);
    if ([mode, rt, single, dead].some(isBadResult)) throw new Error(`Lettura tasto ${key} fallita.`);
    return {
      touchMode: mode.touchMode,
      advancedKeyMode: mode.advancedKeyMode,
      actuation: Number(single),
      rtPress: rt.pressTravel,
      rtRelease: rt.releaseTravel,
      pressDead: dead.pressDead,
      releaseDead: dead.releaseDead,
    };
  }

  // Writes one command at a time and keeps each key's advanced mode (SOCD etc.).
  async writeKeyPerf(keys, { touchMode, actuation, rtPress, rtRelease, pressDead, releaseDead }, onProgress) {
    let done = 0;
    for (const key of keys) {
      const current = await this.kb.getPerformanceMode(key);
      const advanced = Number(current?.advancedKeyMode) || 0;
      await this.kb.setPerformanceMode(key, touchMode, advanced);
      await this.kb.setSingleTravel(key, actuation);
      if (touchMode === 'rt') {
        await this.kb.setRtPressTravel(key, rtPress);
        await this.kb.setRtReleaseTravel(key, rtRelease);
      }
      await this.kb.setDp(key, pressDead);
      await this.kb.setDr(key, releaseDead);
      const perf = this.state?.performances?.find((p) => p.keyValue === key);
      if (perf) perf.touchMode = touchMode;
      done += 1;
      onProgress?.(done, keys.length);
    }
    if (this.state) this.state.rtCount = this.state.performances.filter((p) => p.touchMode === 'rt').length;
    this.log(`Prestazioni scritte su ${done} tasti.`, 'ok');
  }

  async setMapping(layout, key, value) {
    const result = await this.kb.setKey([{ key, layout, value }]);
    if (isBadResult(result)) throw result;
    const check = await this.kb.getLayoutKeyInfo([{ key, layout }]);
    const stored = Array.isArray(check) ? check[0]?.value : undefined;
    if (stored !== value) throw new Error(`Mappatura non verificata (letto ${stored}).`);
    this.state?.layerMaps?.[layout]?.set(key, value);
    if (layout === FN_LAYER && this.state) {
      const m = this.state.layerMaps[FN_LAYER];
      this.state.fnValues = { W: m.get(KEYCODES.W), A: m.get(KEYCODES.A), S: m.get(KEYCODES.S), D: m.get(KEYCODES.D) };
    }
  }

  async setRate(index) {
    const result = await this.kb.setRateOfReturn(index);
    if (isBadResult(result)) throw result;
    const current = await this.safe('Verifica report rate', () => this.kb.getApi({ type: 'ORDER_TYPE_ROES' }));
    if (this.state && Number.isFinite(Number(current))) {
      this.state.rateIndex = Number(current);
      this.state.rate = RATE_LABELS[this.state.rateIndex] ?? String(current);
    }
    this.log(`Report rate: ${this.state?.rate ?? RATE_LABELS[index]}.`, 'ok');
  }

  // Live travel of every key in mm, as a 6x21 matrix indexed like defKey rows/cols.
  async readTravel() {
    const r = await this.kb.getRm6X21Travel();
    if (isBadResult(r) || !Array.isArray(r?.travels)) throw new Error('Lettura corsa non disponibile.');
    return r.travels;
  }

  exportBackup() {
    if (!this.state) throw new Error('Esegui prima la diagnosi.');
    const s = this.state;
    return {
      schema: 3,
      createdAt: new Date().toISOString(),
      product: this.device?.productName || 'WIN 60 HE MAX',
      device: { vendorId: this.device?.vendorId, productId: this.device?.productId },
      info: s.info,
      protocolVersion: s.protocolVersion,
      rateIndex: s.rateIndex,
      rate: s.rate,
      baseLayout: s.baseLayout,
      physical: s.physical,
      positions: s.positions,
      layers: s.layers,
      fnLayer: s.fnLayer,
      fnValues: s.fnValues,
      performances: s.performances,
      rtCount: s.rtCount,
      socdCount: s.socdCount,
    };
  }

  loadBackup(data) {
    if (!data || data.schema !== 3 || !Array.isArray(data.layers) || !Array.isArray(data.performances)) {
      throw new Error('Backup non valido o di una versione precedente.');
    }
    this.backup = data;
    this.log(`Backup caricato: ${data.createdAt || 'senza data'}.`, 'ok');
    return data;
  }

  async restoreBackup() {
    if (!this.backup) throw new Error('Carica prima un file di backup.');
    if (!this.kb) throw new Error('Connetti la tastiera.');
    const b = this.backup;

    let keyUpdates = 0;
    for (let layout = 0; layout < b.layers.length; layout += 1) {
      const layer = b.layers[layout];
      if (!Array.isArray(layer)) continue;
      const updates = layer.filter((i) => typeof i?.key === 'number').map((i) => ({ key: i.key, layout, value: i.value }));
      for (let i = 0; i < updates.length; i += 12) {
        const part = updates.slice(i, i + 12);
        const result = await this.safe(`Ripristino layer ${layout}`, () => this.kb.setKey(part));
        if (result !== null) keyUpdates += part.length;
      }
    }

    let perfCount = 0;
    for (const entry of b.performances) {
      const mode = entry.touchMode || 'single';
      await this.safe(`Ripristino RT ${entry.keyValue}`, () =>
        this.kb.setPerformanceMode(entry.keyValue, mode, Number(entry.advancedKeyMode) || 0),
      );
      if (Number.isFinite(Number(entry.single))) {
        await this.safe(`Ripristino single ${entry.keyValue}`, () =>
          this.kb.setSingleTravel(entry.keyValue, Number(entry.single)),
        );
      }
      if (Number.isFinite(Number(entry.rtPress))) {
        await this.safe(`Ripristino RT press ${entry.keyValue}`, () =>
          this.kb.setRtPressTravel(entry.keyValue, Number(entry.rtPress)),
        );
      }
      if (Number.isFinite(Number(entry.rtRelease))) {
        await this.safe(`Ripristino RT release ${entry.keyValue}`, () =>
          this.kb.setRtReleaseTravel(entry.keyValue, Number(entry.rtRelease)),
        );
      }
      if (Number.isFinite(Number(entry.pressDead))) {
        await this.safe(`Ripristino dp ${entry.keyValue}`, () =>
          this.kb.setDp(entry.keyValue, Number(entry.pressDead)),
        );
      }
      if (Number.isFinite(Number(entry.releaseDead))) {
        await this.safe(`Ripristino dr ${entry.keyValue}`, () =>
          this.kb.setDr(entry.keyValue, Number(entry.releaseDead)),
        );
      }
      perfCount += 1;
      await sleep(8);
    }

    if (Number.isFinite(Number(b.rateIndex))) {
      await this.safe('Ripristino report rate', () => this.kb.setRateOfReturn(Number(b.rateIndex)));
    }

    this.log(`Ripristino completato: ${keyUpdates} chiavi di layout, ${perfCount} tasti.`, 'ok');
  }
}
