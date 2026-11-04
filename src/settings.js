export const MAX_TRAVEL = 3.4;
export const LIGHT_EFFECTS = ['Onde', 'Respiro', 'Increspature', 'Vortice', 'Arcobaleno', 'Arcobaleno pulsante', 'Scintille', 'Griglia mobile', 'Onda cromatica', 'Trasformazione', 'Sinusoide', 'Flusso', 'Fioritura', 'Mosaico', 'Pioggia', 'Salto', 'Scia', 'Traccia reattiva', 'Laser', 'Ripple'];
export const DEFAULT_LIGHT = {
  open: true, type: 'static', mode: 0, luminance: 4, speed: 2,
  colors: ['#5eead4', '#60a5fa', '#a78bfa', '#fb7185', '#fbbf24', '#34d399', '#ffffff'],
  staticColor: 0, dynamicColorId: 7, direction: false, superResponse: false, sleepDelay: 0,
};

export function range(value, min, max, name, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new Error(`${name}: valore non valido (${min}–${max}).`);
  }
  return value;
}

export function validatePerformance(p) {
  if (!['rt', 'single', 'global'].includes(p.touchMode)) throw new Error('Modalità tasto non valida.');
  range(p.actuation, 0.1, MAX_TRAVEL, 'Attuazione');
  range(p.rtPress, 0.01, MAX_TRAVEL, 'RT pressione');
  range(p.rtRelease, 0.01, MAX_TRAVEL, 'RT rilascio');
  range(p.pressDead, 0, 1, 'Zona morta alta');
  range(p.releaseDead, 0, 1, 'Zona morta bassa');
  return p;
}

export function validateLight(light) {
  if (!light || !['static', 'dynamic', 'custom'].includes(light.type)) throw new Error('Illuminazione non valida.');
  range(light.mode, 0, 21, 'Effetto', true);
  range(light.luminance, 0, 4, 'Luminosità', true);
  range(light.speed, 0, 4, 'Velocità', true);
  range(light.sleepDelay, 0, 255, 'Standby', true);
  range(light.staticColor, 0, 7, 'Indice colore', true);
  range(light.dynamicColorId ?? 0, 0, 7, 'Colore dinamico', true);
  if (!Array.isArray(light.colors) || light.colors.length !== 7 || light.colors.some(c => !/^#[0-9a-f]{6}$/i.test(c))) {
    throw new Error('La palette RGB deve contenere sette colori HEX validi.');
  }
  for (const flag of ['open', 'direction', 'superResponse']) if (typeof light[flag] !== 'boolean') throw new Error(`RGB: ${flag} non valido.`);
  return light;
}

export function rgbFromHex(color) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Colore non valido.');
  return Object.fromEntries(['r', 'g', 'b'].map((c, i) => [c, parseInt(color.slice(1 + i * 2, 3 + i * 2), 16)]));
}

export function validateBackup(data) {
  if (!data || ![3, 4].includes(data.schema) || !Array.isArray(data.layers) || data.layers.length > 4 ||
      !Array.isArray(data.performances) || data.performances.length > 126) throw new Error('Formato di backup non valido.');
  if (data.device?.vendorId != null && (data.device.vendorId !== 0x1ca2 || data.device.productId !== 0x1902)) throw new Error('Backup di una tastiera differente.');
  for (const layer of data.layers) {
    if (layer == null) continue;
    if (!Array.isArray(layer) || layer.length > 126) throw new Error('Layer non valido.');
    const seen = new Set();
    for (const entry of layer) {
      range(entry?.key, 1, 255, 'Tasto', true);
      range(entry?.value, 0, 65535, 'Funzione', true);
      if (seen.has(entry.key)) throw new Error('Tasto duplicato nel backup.');
      seen.add(entry.key);
    }
  }
  const seen = new Set();
  for (const p of data.performances) {
    range(p?.keyValue, 1, 255, 'Tasto', true);
    if (seen.has(p.keyValue)) throw new Error('Prestazioni duplicate nel backup.');
    seen.add(p.keyValue);
    if (p.touchMode != null && !['rt', 'single', 'global'].includes(p.touchMode)) throw new Error('Modalità non valida nel backup.');
    for (const field of ['single', 'rtPress', 'rtRelease', 'pressDead', 'releaseDead']) {
      if (p[field] != null) range(p[field], 0, MAX_TRAVEL, field);
    }
    if (p.advancedKeyMode != null) range(p.advancedKeyMode, 0, 15, 'Modalità avanzata', true);
  }
  if (data.rateIndex != null) range(data.rateIndex, 0, 6, 'Polling', true);
  if (data.lighting != null) validateLight(data.lighting);
  if (data.customLighting != null) {
    if (!Array.isArray(data.customLighting) || data.customLighting.length > 126) throw new Error('Colori per tasto non validi.');
    for (const c of data.customLighting) {
      range(c.key, 1, 255, 'Tasto RGB', true);
      for (const channel of ['r', 'g', 'b']) range(c[channel], 0, 255, channel, true);
    }
  }
  if (data.socd != null) {
    if (!Array.isArray(data.socd) || data.socd.length > 2) throw new Error('SOCD non valido.');
    const used = new Set();
    for (const p of data.socd) {
      if (![[4, 7], [26, 22]].some(pair => pair[0] === p.pos1 && pair[1] === p.pos2)) throw new Error('Coppia SOCD non valida.');
      if (used.has(p.pos1)) throw new Error('Coppia SOCD duplicata.');
      used.add(p.pos1);
      range(p.mode, 0, 3, 'Modalità SOCD', true);
    }
  }
  if (data.advanced != null) {
    if (!Array.isArray(data.advanced) || data.advanced.length > 126) throw new Error('Funzioni avanzate non valide.');
    const seen = new Set();
    for (const p of data.advanced) {
      range(p.key, 1, 255, 'Tasto avanzato', true);
      if (seen.has(p.key)) throw new Error('Funzione avanzata duplicata.');
      seen.add(p.key);
      if (![1, 2, 3, 4, 5, 9].includes(p.mode) || !Array.isArray(p.values) || p.values.length > 14) throw new Error('Payload avanzato non valido.');
      const layouts = new Set();
      for (const entry of p.values) {
        if (![5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 19, 32].includes(entry.layout) || layouts.has(entry.layout)) throw new Error('Registro avanzato non valido.');
        layouts.add(entry.layout);
        range(entry.value, 0, 65535, 'Valore avanzato', true);
      }
      const expected = p.mode === 9 ? [32] : p.mode === 1 ? [5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16] : p.mode === 2 ? [5, 6, 7, 9, 10, 11] : p.mode === 3 ? [9, 10, 11, 12, 19] : [9, 19];
      if (expected.some(layout => !layouts.has(layout))) throw new Error('Payload avanzato incompleto.');
    }
  }
  if (data.macros != null) {
    if (!Array.isArray(data.macros) || data.macros.length > 1) throw new Error('Il buffer condiviso consente una sequenza macro per profilo.');
    for (const macro of data.macros) {
      range(macro.key, 1, 255, 'Tasto macro', true); validateMacro(macro.events);
      range(macro.params?.mode, 0, 3, 'Modalità macro', true); range(macro.params?.num, 1, 100, 'Ripetizioni', true); range(macro.params?.delay, 0, 60000, 'Pausa macro', true);
    }
  }
  if (data.globalPerformance != null) {
    range(data.globalPerformance.globalTouchTravel, 0.1, 3.4, 'Attuazione globale');
    range(data.globalPerformance.pressDead, 0, 1, 'Zona morta globale'); range(data.globalPerformance.releaseDead, 0, 1, 'Zona morta globale');
  }
  return data;
}

// A display model, not a claim that the operating system received this input.
export function stepTrigger(state, travel, perf = {}) {
  const act = perf.actuation ?? 0.5;
  const top = perf.pressDead ?? 0;
  if (travel <= top) { state.pressed = false; state.started = false; state.ref = travel; return state; }
  if (perf.touchMode !== 'rt') { state.pressed = travel >= act; state.ref = travel; return state; }
  if (!state.started) {
    state.pressed = travel >= act;
    state.started = state.pressed;
    state.ref = travel;
  } else if (state.pressed) {
    state.ref = Math.max(state.ref, travel);
    if (travel <= state.ref - (perf.rtRelease ?? 0.15)) { state.pressed = false; state.ref = travel; }
  } else {
    state.ref = Math.min(state.ref, travel);
    if (travel >= state.ref + (perf.rtPress ?? 0.15)) { state.pressed = true; state.ref = travel; }
  }
  if (travel <= top) state.started = false;
  return state;
}

export function validateMacro(events) {
  if (!Array.isArray(events) || events.length < 2 || events.length > 64) throw new Error('La macro deve contenere da 2 a 64 eventi.');
  const held = new Set();
  for (const event of events) {
    range(event.keyCode, 4, 231, 'Tasto macro', true);
    range(event.timeDifference, 0, 60000, 'Pausa macro', true);
    if (![0, 1].includes(event.status)) throw new Error('Stato macro non valido.');
    if (event.status === 1) {
      if (held.has(event.keyCode)) throw new Error('La macro preme due volte un tasto senza rilasciarlo.');
      held.add(event.keyCode);
    } else if (!held.delete(event.keyCode)) throw new Error('La macro rilascia un tasto che non è premuto.');
  }
  if (held.size) throw new Error('La macro deve rilasciare tutti i tasti premuti.');
  return events;
}
