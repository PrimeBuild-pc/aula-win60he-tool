// WebHID boundary emulator: the browser runs the production application and its real SDK.
export async function installKeyboard(page, { hardware = false, rateIndex = 0 } = {}) {
  await page.addInitScript(({ hardware, rateIndex }) => {
    const rows = [[], [41, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 45, 46, 42], [43, 20, 26, 8, 21, 23, 28, 24, 12, 18, 19, 47, 48, 49], [57, 4, 22, 7, 9, 10, 11, 13, 14, 15, 51, 52, 0, 40], [225, 0, 29, 27, 6, 25, 5, 17, 16, 54, 55, 56, 229], [224, 227, 226, 0, 0, 0, 44, 0, 0, 230, 101, 228, 1]];
    const keys = rows.flat().filter(Boolean);
    const registers = new Map(), colors = new Map(), staged = new Map(), pairs = new Map(), macros = new Map();
    for (const key of keys) for (const [layout, value] of [[0, key === 1 ? 0xf001 : key], [1, 1], [2, 1], [3, 1], [8, 32], [4, 500], [20, 150], [21, 150], [22, 150], [23, 150]]) registers.set(`${key}:${layout}`, value);
    let profile = 0, rate = rateIndex, system = 'win';
    const globalValues = [500, 150, 150];
    const light = new Uint8Array(60);
    const palette = ['#5eead4', '#60a5fa', '#a78bfa', '#fb7185', '#fbbf24', '#34d399', '#ffffff'];
    palette.forEach((c, i) => light.set([parseInt(c.slice(5, 7), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(1, 3), 16), 255], 5 + 4 * i));
    light[37] = 1; light[38] = 4; light[39] = 0; light[40] = 2; light[42] = 0; light[43] = 7;
    const trace = [];
    const model = { light, registers, colors, trace, ledBrightness: 4, commitCount: 0, saveCount: 0, saveFailure: false, rateWriteCount: 0, permissionRequests: 0 };
    const snapshot = () => structuredClone({ registers: [...registers], colors: [...colors], pairs: [...pairs], macros: [...macros],
      light: [...light], globalValues: [...globalValues], profile, rate, system });
    let saved = JSON.parse(sessionStorage.getItem('keyboard-fixture-flash') || 'null') || snapshot();
    const restore = () => {
      for (const [map, values] of [[registers, saved.registers], [colors, saved.colors], [pairs, saved.pairs], [macros, saved.macros]]) {
        map.clear(); for (const [key, value] of structuredClone(values)) map.set(key, value);
      }
      light.set(saved.light); staged.clear();
      globalValues.splice(0, globalValues.length, ...saved.globalValues);
      ({ profile, rate, system } = saved);
      model.ledBrightness = light[37] & 1 ? light[38] : 0;
    };
    restore();
    model.snapshot = snapshot;
    model.powerCycle = () => {
      restore();
      model.disconnect();
    };
    window.__keyboardFixture = model;

    class FakeDevice extends EventTarget {
      vendorId = 0x1ca2; productId = 0x1902; productName = 'WIN 60 HE MAX'; opened = false;
      collections = [{ usagePage: 0xffa0, usage: 1, inputReports: [{ reportId: 0 }], outputReports: [{ reportId: 0 }] }];
      async open() { this.opened = true; }
      async close() { this.opened = false; }
      async sendReport(_, bytes) {
        const packet = [...new Uint8Array(bytes)], command = packet[2], data = packet.slice(4, 4 + packet[1]);
        trace.push(packet);
        if (model.dropReplies && command !== 1) return;
        if (model.unplugOnNextWrite && command === 35 && data[0] === 1) {
          model.unplugOnNextWrite = false;
          this.opened = false;
          model.disconnect();
          throw new DOMException('The device has been disconnected.', 'NetworkError');
        }
        if (hardware) {
          const response = Uint8Array.from(await window.hardwareSend(packet));
          if (response.length) {
            const event = new Event('inputreport');
            Object.defineProperties(event, { data: { value: new DataView(response.buffer) }, reportId: { value: 0 }, device: { value: this } });
            this.dispatchEvent(event);
          }
          return;
        }
        let payload = new Uint8Array(60).fill(255);
        if (command === 1) {
          payload.fill(0); payload.set(new TextEncoder().encode('App V1.15'), 26);
        } else if (command === 0) {
          const op = data[0];
          if (op === 2) {
            if (model.saveFailure) payload = Uint8Array.from([0, 2, 0, 0]);
            else { saved = snapshot(); sessionStorage.setItem('keyboard-fixture-flash', JSON.stringify(saved)); model.saveCount++; payload = Uint8Array.from([0, 2, 255, 255]); }
          }
          else if (op === 1) payload = Uint8Array.from([0, 1, 9, 1]);
          else if (op === 38) payload = Uint8Array.from([0, 38, ...new TextEncoder().encode('WIN 60 HE MAX')]);
          else if (op === 80) {
            if (data[1] !== 255) {
              rate = data[1]; model.rateWriteCount++;
              if (model.rebootOnRateWrite) {
                const nextRate = rate;
                model.powerCycle(); rate = nextRate; model.rebooting = true;
                setTimeout(() => { model.rebooting = false; }, model.rebootDelayMs ?? 150);
                return;
              }
            }
            payload = Uint8Array.from([0, op, rate]);
          }
          else if (op === 112) { if (data[1] !== 255) profile = data[1]; payload = Uint8Array.from([0, op, profile]); }
          else if (op === 33) payload = Uint8Array.from([0, op, system === 'win' ? 1 : 0]);
          else if (op === 48 || op === 49) { system = op === 48 ? 'win' : 'mac'; payload = Uint8Array.from([0, op, 1]); }
          else payload = Uint8Array.from([0, op, 1]);
        } else if (command === 43) {
          payload.fill(0); payload[1] = data[1]; payload[23] = data[2];
          (rows[data[1]] || []).forEach((key, col) => payload[2 + col] = key);
          (rows[data[2]] || []).forEach((key, col) => payload[24 + col] = key);
        } else if (command === 35) {
          payload[0] = data[0];
          for (let i = 1; i + 3 < data.length; i += 4) {
            const address = `${data[i]}:${data[i + 1]}`;
            if (data[0] === 1) registers.set(address, data[i + 2] | data[i + 3] << 8);
            const value = registers.get(address) ?? 0;
            payload.set([data[i], data[i + 1], value & 255, value >> 8], i);
          }
        } else if (command === 24) {
          if (data[0] === 1) {
            light.set(data);
            // Firmware settings bytes can echo invalid values without driving valid LED levels.
            if (light[38] <= 4 && light[40] <= 4) model.ledBrightness = light[37] & 1 ? light[38] : 0;
          }
          payload = light;
        } else if (command === 42) {
          const key = data[1];
          if (data[0] === 1 && key === 254) { for (const [k, value] of staged) colors.set(k, value); staged.clear(); model.commitCount++; }
          else if (data[0] === 1 && light[39] === 21) staged.set(key, data.slice(2, 5));
          payload = Uint8Array.from([data[0], key, ...(staged.get(key) || colors.get(key) || [0, 0, 0])]);
        } else if (command === 44) {
          if (data[0] === 1) { pairs.set(data[1], data); for (const key of [data[1], data[2]]) registers.set(`${key}:8`, (registers.get(`${key}:8`) & 0xf0) | 8); }
          payload = Uint8Array.from(pairs.get(data[1]) || [0, data[1], 7, 0, 0, 0, 0, 0, 0, 0, 0]);
        } else if (command === 36) {
          for (let i = 0; i < 4; i++) registers.set(`${data[1]}:${9 + i}`, data[2 + i * 2] | data[3 + i * 2] << 8);
          registers.set(`${data[1]}:19`, data[10]); payload = Uint8Array.from(data);
        } else if (command === 37) {
          if (data[0]) { registers.set(`${data[1]}:9`, data[2] | data[3] << 8); registers.set(`${data[1]}:19`, data[4]); }
          const code = registers.get(`${data[1]}:9`) || 0; payload = Uint8Array.from([data[0], data[1], code & 255, code >> 8, registers.get(`${data[1]}:19`) || 0]);
        } else if (command === 40) {
          if (data[0]) { registers.set(`${data[1]}:9`, data[2] | data[3] << 8); registers.set(`${data[1]}:19`, data[4] | data[5] << 8); }
          const code = registers.get(`${data[1]}:9`) || 0, delay = registers.get(`${data[1]}:19`) || 0;
          payload = Uint8Array.from([data[0], data[1], code & 255, code >> 8, delay & 255, delay >> 8]);
        } else if (command === 41) {
          if (data[0]) for (let i = 0; i < 3; i++) globalValues[i] = data[3 + i * 2] | data[4 + i * 2] << 8;
          payload.fill(0); payload[0] = data[0];
          globalValues.forEach((value, i) => payload.set([value & 255, value >> 8], 3 + i * 2));
        } else if (command === 32) payload = Uint8Array.from(data);
        else if (command === 33) {
          if (data[0]) macros.set(data[1], data);
          payload = Uint8Array.from(macros.get(data[1]) || [0, data[1], 0, 0, 0, 0, 1, 0, 0, 0, 0]);
        }
        const reply = new Uint8Array(64); reply.set([0x5c, payload.length, command | 128, 0]); reply.set(payload.slice(0, 60), 4);
        reply[3] = (0x35 + reply[0] + reply[1] + reply[2] + reply[reply[1] + 3]) & 255;
        setTimeout(() => { const event = new Event('inputreport'); Object.defineProperties(event, { data: { value: new DataView(reply.buffer) }, reportId: { value: 0 }, device: { value: this } }); this.dispatchEvent(event); }, model.replyDelayMs ?? 0);
      }
    }
    const device = new FakeDevice(), hid = new EventTarget();
    hid.getDevices = async () => model.rebooting ? [] : [device];
    hid.requestDevice = async () => { model.permissionRequests++; return [device]; };
    model.disconnect = () => { const event = new Event('disconnect'); Object.defineProperty(event, 'device', { value: device }); hid.dispatchEvent(event); };
    Object.defineProperty(navigator, 'hid', { value: hid, configurable: true });
  }, { hardware, rateIndex });
}

export async function connectKeyboard(page) {
  await page.locator('#btnEntryConnect').click();
  await page.locator('#workspace').waitFor({ state: 'visible', timeout: 10000 });
}
