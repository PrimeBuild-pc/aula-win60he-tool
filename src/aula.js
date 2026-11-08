import Keyboard from '@sparklinkplayjoy/sdk-keyboard';
import { range, validatePerformance, validateLight, validateBackup } from './settings.js';
import { ADVANCED_MODES, advancedRegisters, validateMacro } from './advanced.js';
import { gamePresetPlan } from './game-presets.js';
import { guardUsbQueue } from './usb-queue.js';

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

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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
    this.onDisconnect = null;
    this.reconnecting = false;
  }

  static isSupported() {
    return typeof navigator !== 'undefined' && typeof navigator.hid?.getDevices === 'function' && typeof navigator.hid?.requestDevice === 'function';
  }

  async sendRawSync(hidDevice) {
    if (!hidDevice?.sendReport) throw new Error('HIDDevice non disponibile per il SYNCPack.');
    await hidDevice.sendReport(0, buildSyncPacket());
    this.log('SYNCPack inviato.', 'info');
  }

  async connect({ automatic = false } = {}) {
    if (!AulaKeyboard.isSupported()) {
      throw new Error('WebHID non disponibile. Apri questa pagina in Chrome o Edge.');
    }

    if (this.kb) {
      try {
        await this.disconnect();
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

    // An automatic reconnect must never open another device-permission picker.
    const devices = automatic
      ? (await this.kb.deviceBase.hidService.getDevices()).map(device => this.kb.deviceBase.hidService.tagDevice(device))
      : await this.kb.getDevices();
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
        if (!this.reconnecting) this.onDisconnect?.();
      } else {
        this.log(`USB: ${type}${data?.reconnect ? ' (riconnessa)' : ''}.`);
      }
    });

    const hidDevice = initialized.data || device.data;
    guardUsbQueue(this.kb.deviceBase, { onFailure: error => {
      this.log(error.message, 'error');
      if (!this.reconnecting) this.onDisconnect?.();
    } });
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

  async disconnect() {
    this.kb?.off('usbChange');
    if (this.device?.data?.opened) await this.device.data.close();
    this.kb = null;
    this.device = null;
    this.state = null;
    this.initialInfo = null;
  }

  async checked(label, fn, allowEmpty = false) {
    const result = await fn();
    if (result?.code === 'USB_CONNECTION_LOST') throw result;
    if (isBadResult(result) || result === false || (!allowEmpty && result == null)) {
      throw new Error(`${label}: ${result?.message || 'la tastiera non ha confermato il comando'}`);
    }
    return result;
  }

  async safe(label, fn, fallback = null) {
    try {
      const result = await fn();
      if (result?.code === 'USB_CONNECTION_LOST') throw result;
      if (isBadResult(result)) {
        this.log(`${label}: ${result.message || result}`, 'warn');
        return fallback;
      }
      return result;
    } catch (error) {
      if (error?.code === 'USB_CONNECTION_LOST') throw error;
      this.log(`${label}: ${error?.message || error}`, 'warn');
      return fallback;
    }
  }

  async saveSettings() {
    if (!this.kb || !this.state) throw new Error('Connetti la tastiera.');
    // SDK getApi discards this generic ACK; inspect the verified KB2 1.0.9 response directly.
    const packet = new Uint8Array(64);
    packet.set([0x5c, 3, 0, 0, 2, 0xff, 0xff]);
    packet[3] = computeKb2CheckSum(packet);
    const ack = await this.checked('Salvataggio memoria tastiera', () => this.kb.deviceBase.sendData(packet));
    if (!(ack instanceof Uint8Array) || ack.length < 4 || ack.length > 60 || ack[0] !== 0 || ack[1] !== 2 || ack[2] !== 255 || ack[3] !== 255) {
      throw new Error('Salvataggio permanente non confermato. Mantieni collegata la tastiera e riprova.');
    }
    this.log('Comando di salvataggio memoria confermato dalla tastiera.', 'ok');
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
    return this.readRegisters(keys.map(key => ({ key, layout })));
  }

  async readRegisters(requests) {
    const result = [];
    for (let i = 0; i < requests.length; i += 12) {
      const asked = requests.slice(i, i + 12);
      const chunk = await this.checked('Lettura registri', () => this.kb.getLayoutKeyInfo(asked));
      if (!Array.isArray(chunk)) throw new Error('Risposta layout non valida.');
      for (const request of asked) {
        // The SDK may decode a trailing padding record; accept only requested addresses.
        const entries = chunk.filter(p => p.key === request.key && p.layout === request.layout);
        if (entries.length !== 1 || !Number.isInteger(entries[0].value)) throw new Error('Risposta layout incompleta o duplicata.');
        result.push(entries[0]);
      }
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
    const rateIndex = Number.isInteger(rateRaw) && rateRaw >= 0 && rateRaw <= 6 ? rateRaw : null;

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

    // Read Layout_Mode in packets instead of 61 individual requests.
    const modes = await this.readRegisters(physical.map(p => ({ key: p.keyValue, layout: 8 })));
    const performances = physical.map(pos => {
      const value = modes.find(m => m.key === pos.keyValue)?.value;
      if (!Number.isInteger(value)) throw new Error('Modalità tasto non leggibile.');
      return { ...pos, touchMode: ['global', 'single', 'rt'][value >> 4] ?? 'single', advancedKeyMode: value & 15 };
    });
    const baseInfo = await this.safe('Informazioni firmware', () => this.kb.getBaseInfo());
    if (baseInfo && typeof baseInfo === 'object') Object.assign(info, baseInfo);
    const config = await this.safe('Profilo hardware', () => this.kb.getApi({ type: 'ORDER_TYPE_CONFIG' }));
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
      config: config?.hasFourConfig && Number.isInteger(config.configID) && config.configID >= 0 && config.configID <= 3 ? config : null,
      socd: [], lighting: null, customLighting: [],
    };
    this.state.macros = [];
    try {
      const cached = JSON.parse(localStorage.getItem(`studio-macro-${config?.configID ?? 0}`) || '[]');
      if (Array.isArray(cached)) for (const macro of cached) {
        validateMacro(macro.events);
        if (performances.find(p => p.keyValue === macro.key)?.advancedKeyMode !== 6) continue;
        const binding = await this.checked('Lettura macro', () => this.kb.getMacro(macro.key));
        if (['key', 'id', 'len', 'mode', 'num', 'delay'].every(field => binding[field] === macro.binding[field])) this.state.macros.push(macro);
      }
    } catch (error) { this.log(`Archivio macro locale: ${error.message}`, 'warn'); }
    for (const [a, b] of [[KEYCODES.A, KEYCODES.D], [KEYCODES.W, KEYCODES.S]]) {
      if (performances.find(p => p.keyValue === a)?.advancedKeyMode !== 8) continue;
      const pair = await this.checked('Lettura SOCD', () => this.kb.getSocd(a, protocolVersion));
      if (pair.pos1 !== a || pair.pos2 !== b) throw new Error('Coppia SOCD non riconosciuta: backup interrotto.');
      this.state.socd.push(pair);
    }
    this.state.lighting = await this.safe('Lettura RGB', () => this.readLighting());
    if (this.state.lighting?.type === 'custom') await this.safe('Colori per tasto', () => this.readCustomLighting());
    this.state.globalPerformance = await this.safe('Attuazione globale', () => this.readGlobalPerformance());
    this.state.system = await this.safe('Modalità sistema', () => this.kb.getApi({ type: 'ORDER_TYPE_QUERY_WIN_MODEL' }));
    return this.state;
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
    if (!ok) throw new Error('Verifica layer non riuscita.');
    this.log('Verifica riuscita: WASD lettere sul base, frecce su Fn+WASD e Fn+/ RAlt Menu RCtrl.', 'ok');
    return s.fnValues;
  }

  async applyRt(sensitivity = 0.15, firstTouch = 0.5) {
    const keys = this.state?.physical?.map(p => p.keyValue);
    if (!keys) throw new Error('Connetti la tastiera.');
    await this.writeKeyPerf(keys, {
      touchMode: 'rt', actuation: firstTouch, rtPress: sensitivity, rtRelease: sensitivity,
      pressDead: 0.15, releaseDead: 0.15,
    });
    return keys.length;
  }

  async applySocd(mode = 0, pair = [KEYCODES.A, KEYCODES.D]) {
    range(mode, 0, 3, 'SOCD', true);
    if (!this.state) throw new Error('Connetti la tastiera.');
    if (![[4, 7], [26, 22]].some(p => p[0] === pair[0] && p[1] === pair[1])) throw new Error('Coppia SOCD non valida.');
    const param = { pos1: pair[0], pos2: pair[1], key1: 0, key2: 0, type: 0, mode, delay: 0 };
    await this.checked('Scrittura SOCD', () => this.kb.setSocd(param, this.state.protocolVersion));
    const check = await this.checked('Verifica SOCD', () => this.kb.getSocd(pair[0], this.state.protocolVersion));
    if (check.pos1 !== pair[0] || check.pos2 !== pair[1] || check.mode !== mode) throw new Error('SOCD non verificato.');
    for (const key of pair) {
      const p = await this.checked('Modalità SOCD', () => this.kb.getPerformanceMode(key));
      if (p.advancedKeyMode !== 8) throw new Error('SOCD non attivo su entrambi i tasti.');
      Object.assign(this.state.performances.find(p => p.keyValue === key), p);
    }
    this.state.socd = [...(this.state.socd || []).filter(p => p.pos1 !== pair[0]), param];
    this.state.socdCount = this.state.performances.filter(p => p.advancedKeyMode === 8).length;
    this.log(`SOCD ${pair.join('/')}: modalità ${mode}, verificato.`, 'ok');
  }

  async removeSocd(pair = [KEYCODES.A, KEYCODES.D]) {
    for (const key of pair) {
      const old = await this.checked('Modalità attuale', () => this.kb.getPerformanceMode(key));
      await this.checked('Rimozione SOCD', () => this.kb.setPerformanceMode(key, old.touchMode, 0));
      const check = await this.checked('Verifica rimozione SOCD', () => this.kb.getPerformanceMode(key));
      if (check.advancedKeyMode !== 0) throw new Error('Rimozione SOCD non verificata.');
      Object.assign(this.state.performances.find(p => p.keyValue === key), check);
    }
    this.state.socd = (this.state.socd || []).filter(p => p.pos1 !== pair[0]);
    this.state.socdCount = this.state.performances.filter(p => p.advancedKeyMode === 8).length;
  }

  async applyRate() { return this.setRate(0); }

  async applyGamePreset(id, { rateIndex = 3, onProgress } = {}) {
    if (!this.state) throw new Error('Connetti la tastiera.');
    range(rateIndex, 0, 6, 'Polling', true);
    const plan = gamePresetPlan(id, this.state.physical.map(p => p.keyValue));
    const modes = new Map();
    // Inspect all affected keys before the first write; never silently overwrite macros or DKS.
    for (const key of plan.keys) {
      const mode = await this.checked('Modalità attuale', () => this.kb.getPerformanceMode(key));
      if (![0, 8].includes(mode.advancedKeyMode)) throw new Error('Rimuovi prima le azioni avanzate dai tasti del preset.');
      modes.set(key, mode.advancedKeyMode);
    }
    try {
      for (const pair of [[4, 7], [26, 22]]) {
        if (pair.some(key => modes.get(key) === 8)) await this.removeSocd(pair);
      }
      let done = 0;
      for (const g of plan.groups) {
        await this.writeKeyPerf(g.keys, g.values, () => onProgress?.(++done, plan.keys.length));
      }
      if (plan.socdMode != null) await this.applySocd(plan.socdMode);
      const beforeRate = this.state;
      await this.saveSettings();
      await this.setRate(rateIndex);
      if (this.state !== beforeRate) {
        for (const group of plan.groups) {
          const fields = ['actuation', 'pressDead', 'releaseDead', ...(group.values.touchMode === 'rt' ? ['rtPress', 'rtRelease'] : [])];
          for (const key of group.keys) {
            const stored = await this.readKeyPerf(key);
            if (stored.touchMode !== group.values.touchMode || fields.some(field => Math.abs(stored[field] - group.values[field]) > 0.011)) {
              throw new Error('Preset non verificato dopo la riconnessione.');
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`Preset interrotto; alcune impostazioni possono essere già salvate: ${error.message}`);
    }
    return plan;
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
    const mode = await this.checked('Modalità tasto', () => this.kb.getPerformanceMode(key));
    const rt = await this.checked('Rapid Trigger', () => this.kb.getRtTravel(key));
    const single = await this.checked('Attuazione', () => this.kb.getSingleTravel(key));
    const dead = await this.checked('Zone morte', () => this.kb.getDpDr(key));
    if ([mode, rt, single, dead].some(v => v == null || isBadResult(v))) throw new Error(`Lettura tasto ${key} fallita.`);
    const values = {
      touchMode: mode.touchMode,
      advancedKeyMode: mode.advancedKeyMode,
      actuation: Number(single),
      rtPress: rt.pressTravel,
      rtRelease: rt.releaseTravel,
      pressDead: dead.pressDead,
      releaseDead: dead.releaseDead,
    };
    if (!['global', 'single', 'rt'].includes(values.touchMode) || !Number.isInteger(values.advancedKeyMode) ||
        ['actuation', 'rtPress', 'rtRelease', 'pressDead', 'releaseDead'].some(field => !Number.isFinite(values[field]))) throw new Error(`Valori incompleti per il tasto ${key}.`);
    return values;
  }

  // Writes one command at a time and keeps each key's advanced mode (SOCD etc.).
  async writeKeyPerf(keys, values, onProgress) {
    validatePerformance(values);
    const { touchMode, actuation, rtPress, rtRelease, pressDead, releaseDead } = values;
    if (touchMode === 'global') await this.writeGlobalPerformance({ globalTouchTravel: actuation, pressDead, releaseDead });
    let done = 0;
    for (const key of keys) {
      if (!this.state?.physical.some(p => p.keyValue === key)) throw new Error('Tasto assente sulla tastiera.');
      const current = await this.checked('Lettura modalità', () => this.kb.getPerformanceMode(key));
      await this.checked('Scrittura modalità', () => this.kb.setPerformanceMode(key, touchMode, current.advancedKeyMode));
      if (touchMode === 'global') {
        const check = await this.checked('Verifica modalità globale', () => this.kb.getPerformanceMode(key));
        if (check.touchMode !== 'global' || check.advancedKeyMode !== current.advancedKeyMode) throw new Error('Modalità globale non verificata.');
        Object.assign(this.state.performances.find(p => p.keyValue === key), check);
        onProgress?.(++done, keys.length); continue;
      }
      await this.checked('Attuazione', () => this.kb.setSingleTravel(key, actuation));
      if (touchMode === 'rt') {
        await this.checked('RT pressione', () => this.kb.setRtPressTravel(key, rtPress));
        await this.checked('RT rilascio', () => this.kb.setRtReleaseTravel(key, rtRelease));
      }
      await this.checked('Zona morta alta', () => this.kb.setDp(key, pressDead));
      await this.checked('Zona morta bassa', () => this.kb.setDr(key, releaseDead));
      const stored = await this.readKeyPerf(key);
      for (const field of ['actuation', 'pressDead', 'releaseDead', ...(touchMode === 'rt' ? ['rtPress', 'rtRelease'] : [])]) {
        if (Math.abs(stored[field] - values[field]) > 0.011) throw new Error(`${key}: ${field} non verificato.`);
      }
      if (stored.touchMode !== touchMode || stored.advancedKeyMode !== current.advancedKeyMode) throw new Error('Modalità non verificata.');
      Object.assign(this.state.performances.find(p => p.keyValue === key), stored, { single: stored.actuation });
      onProgress?.(++done, keys.length);
    }
    this.state.rtCount = this.state.performances.filter(p => p.touchMode === 'rt').length;
    this.log(`Prestazioni scritte e verificate su ${done} tasti.`, 'ok');
  }

  async setMapping(layout, key, value) {
    range(layout, 0, 3, 'Layer', true);
    range(value, 0, 65535, 'Funzione', true);
    if (!this.state?.physical.some(p => p.keyValue === key)) throw new Error('Tasto non valido.');
    if (layout === BASE_LAYER && [1, KEYCODES.FN0, KEYCODES.FN1, KEYCODES.FN2, KEYCODES.FN3].includes(key) && value !== this.state.layerMaps[0].get(key)) throw new Error('Il tasto Fn deve restare accessibile.');
    const result = await this.kb.setKey([{ key, layout, value }]);
    if (isBadResult(result) || result == null || result === false) throw new Error('Scrittura mappatura fallita.');
    const check = await this.readRegisters([{ key, layout }]);
    const stored = Array.isArray(check) ? check[0]?.value : undefined;
    if (stored !== value) throw new Error(`Mappatura non verificata (letto ${stored}).`);
    this.state?.layerMaps?.[layout]?.set(key, value);
    const entry = this.state?.layers?.[layout]?.find(p => p.key === key);
    if (entry) entry.value = value;
    if (layout === FN_LAYER && this.state) {
      const m = this.state.layerMaps[FN_LAYER];
      this.state.fnValues = { W: m.get(KEYCODES.W), A: m.get(KEYCODES.A), S: m.get(KEYCODES.S), D: m.get(KEYCODES.D) };
    }
  }

  async writeGlobalPerformance(values) {
    range(values.globalTouchTravel, 0.1, 3.4, 'Attuazione globale');
    range(values.pressDead, 0, 1, 'Zona morta alta'); range(values.releaseDead, 0, 1, 'Zona morta bassa');
    await this.checked('Attuazione globale', () => this.kb.setDB(values));
    const check = await this.checked('Verifica attuazione globale', () => this.kb.getGlobalTouchTravel());
    if (['globalTouchTravel', 'pressDead', 'releaseDead'].some(field => !Number.isFinite(check[field]) || Math.abs(check[field] - values[field]) > 0.011)) throw new Error('Attuazione globale non verificata.');
    this.state.globalPerformance = check;
  }

  async readGlobalPerformance() {
    const values = await this.checked('Attuazione globale', () => this.kb.getGlobalTouchTravel());
    range(values.globalTouchTravel, 0.1, 3.4, 'Attuazione globale');
    range(values.pressDead, 0, 1, 'Zona morta globale'); range(values.releaseDead, 0, 1, 'Zona morta globale');
    return values;
  }

  async switchSystem(system) {
    if (!['win', 'mac'].includes(system)) throw new Error('Sistema non valido.');
    await this.checked('Cambio sistema', () => this.kb.switchSystemMode(system));
    const check = await this.checked('Verifica sistema', () => this.kb.getApi({ type: 'ORDER_TYPE_QUERY_WIN_MODEL' }));
    if (check.currentSystem !== system) throw new Error('Modalità sistema non verificata.');
    this.state.system = check;
  }

  async setRate(index) {
    range(index, 0, 6, 'Polling', true);
    const current = await this.checked('Lettura polling', () => this.kb.getApi({ type: 'ORDER_TYPE_ROES' }));
    range(current, 0, 6, 'Polling', true);
    if (current !== index) {
      // WIN60 HE MAX restarts USB even when rewriting the same rate; preserve pending settings first.
      await this.saveSettings();
      this.reconnecting = true;
      try {
        try { await this.checked('Polling', () => this.kb.setRateOfReturn(index)); }
        catch { this.log('Attesa riconnessione USB dopo cambio polling.', 'info'); }
        await this.reconnectAfterRateChange(index);
      } catch (error) {
        this.onDisconnect?.();
        throw error;
      } finally { this.reconnecting = false; }
    }
    this.state.rateIndex = index;
    this.state.rate = RATE_LABELS[index];
    this.log(`Polling verificato: ${this.state.rate}.`, 'ok');
  }

  async reconnectAfterRateChange(index) {
    const deadline = Date.now() + 8000;
    await this.disconnect().catch(() => {});
    while (Date.now() < deadline) {
      await sleep(200);
      try {
        await this.connect({ automatic: true });
        await this.diagnose();
        if (this.state.rateIndex !== index) throw new Error('Polling non verificato. Riconnetti per leggere lo stato attuale.');
        await this.saveSettings();
        return;
      } catch {
        await this.disconnect().catch(() => {});
      }
    }
    throw new Error('Riconnessione non riuscita. Ricollega la tastiera e premi Connetti.');
  }

  async readLighting() {
    const light = await this.checked('Lettura RGB', () => this.kb.getLighting(this.state.protocolVersion));
    validateLight(light);
    this.state.lighting = light;
    return light;
  }

  async writeLighting(light) {
    validateLight(light);
    await this.checked('Scrittura RGB', () => this.kb.setLighting(light, this.state.protocolVersion));
    if (!light.open) await this.checked('Spegnimento RGB', () => this.kb.closedLighting());
    const check = await this.readLighting();
    for (const field of ['open', 'mode', 'luminance', 'speed', 'direction', 'staticColor', 'dynamicColorId', 'sleepDelay', 'superResponse']) {
      const expected = field === 'mode' ? (light.type === 'custom' ? 21 : light.type === 'static' ? 0 : light.mode) : field === 'staticColor' && light.type === 'dynamic' ? 0 : light[field];
      if (check[field] !== expected) throw new Error(`RGB: ${field} non verificato.`);
    }
    if (check.colors.some((c, i) => c.toLowerCase() !== light.colors[i].toLowerCase())) throw new Error('Palette RGB non verificata.');
    this.log('Illuminazione salvata e verificata.', 'ok');
    return check;
  }

  async readCustomLighting() {
    const colors = [];
    for (const p of this.state.physical) {
      const c = await this.checked('Lettura colore per tasto', () => this.kb.getCustomLighting(p.keyValue));
      const color = { key: p.keyValue, r: c.r ?? c.R, g: c.g ?? c.G, b: c.b ?? c.B };
      for (const channel of ['r', 'g', 'b']) range(color[channel], 0, 255, channel, true);
      colors.push(color);
    }
    this.state.customLighting = colors;
    return colors;
  }

  async applyLighting(light, colors = []) {
    // The firmware must be in custom mode before accepting per-key edits.
    await this.writeLighting(light);
    if (light.type === 'custom' && colors.length) await this.writeCustomLighting(colors);
    return this.state.lighting;
  }

  async writeCustomLighting(colors) {
    for (const c of colors) {
      if (!this.state.physical.some(p => p.keyValue === c.key)) throw new Error('Tasto RGB non valido.');
      for (const channel of ['r', 'g', 'b']) range(c[channel], 0, 255, channel, true);
      await this.checked('Colore per tasto', () => this.kb.setCustomLighting(c));
      const check = await this.checked('Verifica colore', () => this.kb.getCustomLighting(c.key));
      if (check.key !== c.key || ['r', 'g', 'b'].some(k => (check[k] ?? check[k.toUpperCase()]) !== c[k])) throw new Error('Colore per tasto non verificato.');
    }
    await this.checked('Salvataggio colori', () => this.kb.saveCustomLighting(), true);
    for (const c of colors) {
      const check = await this.checked('Verifica colori salvati', () => this.kb.getCustomLighting(c.key));
      if (check.key !== c.key || ['r', 'g', 'b'].some(k => (check[k] ?? check[k.toUpperCase()]) !== c[k])) throw new Error('Persistenza del colore non verificata.');
    }
    const map = new Map((this.state.customLighting || []).map(c => [c.key, c]));
    colors.forEach(c => map.set(c.key, c));
    this.state.customLighting = [...map.values()];
  }

  async switchProfile(index) {
    range(index, 0, 3, 'Profilo', true);
    if (!this.state.config?.hasFourConfig) throw new Error('Profili hardware non supportati.');
    await this.checked('Cambio profilo', () => this.kb.switchConfig(index));
    const check = await this.checked('Verifica profilo', () => this.kb.getApi({ type: 'ORDER_TYPE_CONFIG' }));
    if (check.configID !== index) throw new Error('Profilo non verificato: riconnetti la tastiera.');
  }

  async readAdvanced(key, mode) {
    const layouts = { 1: [5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16], 2: [5, 6, 7, 9, 10, 11], 3: [9, 10, 11, 12, 19], 4: [9, 19], 5: [9, 19], 9: [32] }[mode];
    if (!layouts) throw new Error('Questa funzione avanzata non è esportabile.');
    const values = await this.readRegisters(layouts.map(layout => ({ key, layout })));
    if (!Array.isArray(values) || values.length !== layouts.length || layouts.some(layout => !values.some(v => v.key === key && v.layout === layout && Number.isInteger(v.value)))) throw new Error('Funzione avanzata incompleta.');
    return { key, mode, values: values.map(({ layout, value }) => ({ layout, value })) };
  }

  async writeAdvanced(key, type, config) {
    const { first, second, delay, travel } = config;
    if (!this.state?.physical.some(p => p.keyValue === key) || [1, KEYCODES.FN0, KEYCODES.FN1, KEYCODES.FN2, KEYCODES.FN3].includes(key)) throw new Error('Seleziona un tasto diverso da Fn.');
    const old = await this.readKeyPerf(key);
    if (old.advancedKeyMode === 8 || old.advancedKeyMode === 9) throw new Error('Rimuovi prima la coppia SOCD o Rappy Snappy.');
    range(first, 1, 65535, 'Prima funzione', true);
    range(second ?? 0, 0, 65535, 'Seconda funzione', true);
    range(delay, type === 'end' ? 0 : 10, 2550, 'Soglia pressione lunga', true);
    const mode = ADVANCED_MODES[type];
    if (!mode) throw new Error('Comportamento non valido.');
    const expected = [];
    if (['dks', 'mpt'].includes(type) && (config.masks || type === 'mpt')) {
      const values = advancedRegisters(type, config);
      await this.writeRegisters(key, values);
      expected.push(...values.map(v => [v.layout, v.value]));
    } else if (type === 'mt') {
      await this.checked('Mod-Tap', () => this.kb.setMT({ key, dks: [first, second, 0, 0], delay: delay / 10 }));
      expected.push([9, first], [10, second], [19, delay / 10]);
    } else if (type === 'tgl') {
      await this.checked('Toggle', () => this.kb.setTGL({ key, dks: first, delay }));
      expected.push([9, first], [19, delay / 10]);
    } else if (type === 'dks') {
      range(travel, 0.6, 3.4, 'Seconda attuazione');
      // TRPS uses four press/release edges, encoded as action bit masks.
      await this.checked('DKS', () => this.kb.setDks({ key, dks: [first, second, 0, 0], trps: [1, 2, 2, 1], dbs: [500, Math.round(travel * 1000)] }));
      expected.push([9, first], [10, second], [5, 500], [7, Math.round(travel * 1000)], [13, 1], [14, 2], [15, 2], [16, 1]);
    } else if (type === 'end') {
      range(delay, 0, 2550, 'Ritardo rilascio', true);
      await this.checked('Azione al rilascio', () => this.kb.setEND({ key, dks: first, delay }, this.state.protocolVersion));
      const check = await this.checked('Verifica rilascio', () => this.kb.getEND(key));
      if (check.dks !== first || check.delay !== delay) throw new Error('Azione al rilascio non verificata.');
    } else if (type === 'rs') {
      if (key === first || !this.state.physical.some(p => p.keyValue === first) || [1, KEYCODES.FN0, KEYCODES.FN1, KEYCODES.FN2, KEYCODES.FN3].includes(first)) throw new Error('Scegli un secondo tasto fisico diverso da Fn.');
      const partner = await this.readKeyPerf(first);
      if (partner.advancedKeyMode !== 0) throw new Error('Il secondo tasto ha già una funzione avanzata.');
      await this.checked('Rappy Snappy', () => this.kb.setRS({ key, dks: first }));
      await this.checked('Modalità secondo tasto', () => this.kb.setPerformanceMode(first, partner.touchMode, mode));
      const pair = await this.checked('Verifica Rappy Snappy', () => this.kb.getRS(key));
      if (![pair.dks1, pair.dks2].includes(key) || ![pair.dks1, pair.dks2].includes(first)) throw new Error('Coppia Rappy Snappy non verificata.');
      const partnerCheck = await this.checked('Verifica secondo tasto', () => this.kb.getPerformanceMode(first));
      if (partnerCheck.advancedKeyMode !== mode) throw new Error('Secondo tasto Rappy Snappy non verificato.');
    } else throw new Error('Comportamento non valido.');
    await this.checked('Modalità avanzata', () => this.kb.setPerformanceMode(key, old.touchMode, mode));
    const check = await this.checked('Verifica modalità', () => this.kb.getPerformanceMode(key));
    if (check.advancedKeyMode !== mode) throw new Error('Modalità avanzata non verificata.');
    if (expected.length) {
      const values = await this.readAdvanced(key, mode);
      if (expected.some(([layout, value]) => values.values.find(v => v.layout === layout)?.value !== value)) throw new Error('Funzione avanzata non verificata.');
    }
  }

  async writeRegisters(key, values) {
    for (let i = 0; i < values.length; i += 12) {
      const chunk = values.slice(i, i + 12).map(p => ({ key, ...p }));
      await this.checked('Scrittura registri', () => this.kb.setKey(chunk));
      const stored = await this.readRegisters(chunk);
      if (chunk.some(p => stored.find(s => s.key === p.key && s.layout === p.layout)?.value !== p.value)) throw new Error('Registri non verificati.');
    }
  }

  async writeMacro(key, events, { mode = 0, num = 1, delay = 0 } = {}) {
    validateMacro(events);
    range(mode, 0, 3, 'Modalità macro', true); range(num, 1, 100, 'Ripetizioni', true); range(delay, 0, 60000, 'Pausa ripetizioni', true);
    if (!this.state?.physical.some(p => p.keyValue === key) || [1, KEYCODES.FN0, KEYCODES.FN1, KEYCODES.FN2, KEYCODES.FN3].includes(key)) throw new Error('Seleziona un tasto diverso da Fn.');
    const old = await this.readKeyPerf(key);
    if ([8, 9].includes(old.advancedKeyMode)) throw new Error('Rimuovi prima la funzione di coppia.');
    // SDK 1.0.24 stages all events at address 256. Protect existing bindings from overwrite.
    const bound = [];
    for (const p of this.state.physical) {
      const current = await this.checked('Modalità tasti', () => this.kb.getPerformanceMode(p.keyValue));
      if (current.advancedKeyMode === 6 && p.keyValue !== key) bound.push(p.keyValue);
    }
    if (bound.length) throw new Error('Questo SDK usa un buffer macro condiviso. Rimuovi la macro già assegnata prima di registrarne un’altra.');
    const params = { key, index: 1, len: events.length, mode, num, delay };
    await this.checked('Scrittura macro', () => this.kb.setMacro(params, events, old.touchMode === 'rt' ? 'quick' : 'single'));
    const stored = await this.checked('Verifica assegnazione macro', () => this.kb.getMacro(key));
    if (stored.key !== key || stored.id !== params.index || stored.len !== events.length || stored.mode !== mode || stored.num !== num || stored.delay !== delay) throw new Error('Assegnazione macro non verificata.');
    this.state.macros = [{ key, events: structuredClone(events), params, binding: stored }];
    try { localStorage.setItem(`studio-macro-${this.state.config?.configID ?? 0}`, JSON.stringify(this.state.macros)); } catch { /* Export remains available. */ }
    this.log('Assegnazione macro verificata. Sequenza originale conservata per l’esportazione.', 'ok');
  }

  async removeAdvanced(key) {
    const mode = await this.checked('Modalità tasto', () => this.kb.getPerformanceMode(key));
    const socd = this.state?.socd?.find(p => p.pos1 === key || p.pos2 === key);
    if (socd) return this.removeSocd([socd.pos1, socd.pos2]);
    const keys = [key];
    if (mode.advancedKeyMode === 9) {
      const pair = await this.checked('Coppia Rappy Snappy', () => this.kb.getRS(key));
      const partner = [pair.dks1, pair.dks2].find(k => k !== key);
      if (!this.state.physical.some(p => p.keyValue === partner)) throw new Error('Coppia Rappy Snappy non leggibile.');
      keys.push(partner);
    }
    for (const k of new Set(keys)) {
      const old = await this.checked('Modalità attuale', () => this.kb.getPerformanceMode(k));
      await this.checked('Rimozione funzione', () => this.kb.setPerformanceMode(k, old.touchMode, 0));
      const check = await this.checked('Verifica rimozione', () => this.kb.getPerformanceMode(k));
      if (check.advancedKeyMode !== 0) throw new Error('Rimozione non verificata.');
    }
  }

  // Live travel of every key in mm, as a 6x21 matrix indexed like defKey rows/cols.
  async readTravel() {
    const r = await this.kb.getRm6X21Travel();
    if (isBadResult(r) || !Array.isArray(r?.travels)) throw new Error('Lettura corsa non disponibile.');
    return r.travels;
  }

  async captureBackup(onProgress) {
    if (!this.state) throw new Error('Connetti la tastiera.');
    // Refresh both layers before exporting; never reuse the connect-time snapshot.
    for (let layer = 0; layer < 4; layer++) {
      this.state.layers[layer] = await this.readLayer(layer);
      this.state.layerMaps[layer] = this.layerMap(this.state.layers[layer]);
    }
    for (let i = 0; i < this.state.performances.length; i++) {
      const p = this.state.performances[i];
      const perf = await this.readKeyPerf(p.keyValue);
      Object.assign(p, perf, { single: perf.actuation });
      onProgress?.(i + 1, this.state.performances.length);
    }
    // Unsupported advanced payloads cannot be restored faithfully by this backup.
    if (this.state.performances.some(p => ![0, 1, 2, 3, 4, 5, 6, 8, 9].includes(p.advancedKeyMode))) throw new Error('Backup interrotto: sono presenti funzioni avanzate non esportabili da questa versione.');
    for (const p of this.state.performances.filter(p => p.advancedKeyMode === 6)) {
      const cached = this.state.macros?.find(m => m.key === p.keyValue);
      const binding = await this.checked('Verifica archivio macro', () => this.kb.getMacro(p.keyValue));
      if (!cached || !['key', 'id', 'len', 'mode', 'num', 'delay'].every(field => binding[field] === cached.binding[field])) throw new Error('La macro è stata creata fuori da Studio: manca la sequenza originale da esportare.');
    }
    this.state.advanced = [];
    for (const p of this.state.performances) if ([1, 2, 3, 4, 5, 9].includes(p.advancedKeyMode)) this.state.advanced.push(await this.readAdvanced(p.keyValue, p.advancedKeyMode));
    this.state.socd = [];
    for (const pair of [[4, 7], [26, 22]]) {
      if (this.state.performances.find(p => p.keyValue === pair[0])?.advancedKeyMode === 8) {
        this.state.socd.push(await this.checked('Backup SOCD', () => this.kb.getSocd(pair[0], this.state.protocolVersion)));
      }
    }
    await this.readLighting();
    await this.readCustomLighting();
    return this.exportBackup();
  }

  exportBackup() {
    if (!this.state) throw new Error('Connetti la tastiera.');
    const s = this.state;
    return validateBackup({
      schema: 4, createdAt: new Date().toISOString(), product: this.device?.productName || 'WIN 60 HE MAX',
      device: { vendorId: VENDOR_ID, productId: PRODUCT_ID }, protocolVersion: s.protocolVersion,
      rateIndex: s.rateIndex, layers: s.layers, performances: s.performances,
      socd: s.socd, lighting: s.lighting, customLighting: s.customLighting, advanced: s.advanced || [], macros: s.macros || [],
      globalPerformance: s.globalPerformance || null,
    });
  }

  loadBackup(data) {
    this.backup = validateBackup(data);
    return data;
  }

  async restoreBackup() {
    if (!this.backup || !this.state) throw new Error('Connetti la tastiera e carica un backup.');
    const b = validateBackup(this.backup);
    const keys = new Set(this.state.physical.map(p => p.keyValue));
    for (const layer of b.layers) for (const p of layer || []) if (!keys.has(p.key)) throw new Error('Layout del backup incompatibile.');
    for (const p of b.performances) {
      if (!keys.has(p.keyValue)) throw new Error('Tasto del backup incompatibile.');
      if (![0, 8, null, undefined].includes(p.advancedKeyMode) && !b.advanced?.some(a => a.key === p.keyValue && a.mode === p.advancedKeyMode) && !(p.advancedKeyMode === 6 && b.macros?.some(m => m.key === p.keyValue))) throw new Error('Il backup contiene funzioni avanzate incomplete.');
    }
    for (const a of b.advanced || []) if (!keys.has(a.key) || !b.performances.some(p => p.keyValue === a.key && p.advancedKeyMode === a.mode)) throw new Error('Funzione avanzata incompatibile con il backup.');
    for (const m of b.macros || []) if (!keys.has(m.key) || !b.performances.some(p => p.keyValue === m.key && p.advancedKeyMode === 6)) throw new Error('Macro incompatibile con il backup.');
    for (const c of b.customLighting || []) if (!keys.has(c.key)) throw new Error('Tasto RGB del backup incompatibile.');
    // Validate every entry before sending the first write, including Fn access.
    const fnKeys = this.state.physical.filter(p => [1, KEYCODES.FN0, KEYCODES.FN1, KEYCODES.FN2, KEYCODES.FN3].includes(p.keyValue));
    for (const p of fnKeys) {
      if (b.performances.some(k => k.keyValue === p.keyValue && k.advancedKeyMode != null && k.advancedKeyMode !== 0)) throw new Error('Le funzioni avanzate non possono sostituire Fn.');
      const entry = b.layers[0]?.find(e => e.key === p.keyValue);
      if (entry && entry.value !== this.state.layerMaps[0].get(p.keyValue)) throw new Error('Il backup modifica il tasto Fn: ripristino interrotto.');
    }
    for (const pair of [...(this.state.socd || [])]) await this.removeSocd([pair.pos1, pair.pos2]);
    for (let layer = 0; layer < b.layers.length; layer++) {
      for (const p of b.layers[layer] || []) await this.setMapping(layer, p.key, p.value);
    }
    for (const p of b.performances) {
      // Restore exact micron values, including valid zero/default values from firmware.
      const fields = { single: 4, rtPress: 20, rtRelease: 21, pressDead: 22, releaseDead: 23 };
      for (const [field, layout] of Object.entries(fields)) {
        if (p[field] == null) continue;
        const value = Math.round(p[field] * 1000);
        await this.checked('Ripristino prestazioni', () => this.kb.setKey([{ key: p.keyValue, layout, value }]));
        const check = await this.readRegisters([{ key: p.keyValue, layout }]);
        if (check[0].value !== value) throw new Error('Prestazioni non ripristinate.');
      }
      const old = await this.readKeyPerf(p.keyValue);
      const mode = p.touchMode ?? old.touchMode;
      await this.checked('Ripristino modalità', () => this.kb.setPerformanceMode(p.keyValue, mode, 0));
      const check = await this.readKeyPerf(p.keyValue);
      if (check.touchMode !== mode || check.advancedKeyMode !== 0) throw new Error('Modalità non ripristinata.');
      Object.assign(this.state.performances.find(k => k.keyValue === p.keyValue), check, { single: check.actuation });
    }
    for (const pair of b.socd || []) await this.applySocd(pair.mode, [pair.pos1, pair.pos2]);
    for (const advanced of b.advanced || []) {
      for (const entry of advanced.values) {
        await this.checked('Ripristino funzione avanzata', () => this.kb.setKey([{ key: advanced.key, ...entry }]));
        const check = await this.readRegisters([{ key: advanced.key, layout: entry.layout }]);
        if (check[0]?.value !== entry.value) throw new Error('Ripristino funzione avanzata non verificato.');
      }
      const old = await this.readKeyPerf(advanced.key);
      await this.checked('Ripristino modalità avanzata', () => this.kb.setPerformanceMode(advanced.key, old.touchMode, advanced.mode));
      const check = await this.checked('Verifica modalità avanzata', () => this.kb.getPerformanceMode(advanced.key));
      if (check.advancedKeyMode !== advanced.mode) throw new Error('Modalità avanzata non ripristinata.');
    }
    if (b.globalPerformance) await this.writeGlobalPerformance(b.globalPerformance);
    if (b.macros?.length) await this.writeMacro(b.macros[0].key, b.macros[0].events, b.macros[0].params);
    if (b.lighting) await this.applyLighting(b.lighting, b.customLighting || []);
    else if (b.customLighting?.length) await this.writeCustomLighting(b.customLighting);
    if (b.rateIndex != null) await this.setRate(b.rateIndex);
    this.log('Backup ripristinato e verificato.', 'ok');
  }
}
