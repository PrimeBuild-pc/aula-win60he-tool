import { DEFAULT_LIGHT, validateLight } from './settings.js';

// KB2 reference table: F108/F109/F10A/F10C. F10B is WASD swap, not profile 4.
export const PROFILE_CODES = [0xf108, 0xf109, 0xf10a, 0xf10c];
export const PROFILE_COMMANDS = Object.fromEntries(PROFILE_CODES.map((code, i) => [code, `Profilo ${i + 1}`]));

export function profileLighting(current, { color, mode, luminance, speed }) {
  return validateLight({ ...structuredClone(current || DEFAULT_LIGHT), open: true,
    type: mode === 0 ? 'static' : 'dynamic', mode, luminance, speed,
    staticColor: 0, dynamicColorId: 0,
    colors: Array(7).fill(color),
  });
}

export function validateProfileShortcuts(bindings, physical) {
  if (!Array.isArray(bindings) || !bindings.length || bindings.length > 4) throw new Error('Scorciatoie profilo non valide.');
  const keys = new Set(), profiles = new Set();
  for (const b of bindings) {
    if (![0, 1].includes(b.layout) || !PROFILE_CODES.includes(b.value) || !physical.some(p => p.keyValue === b.key) || b.key === 1 ||
        keys.has(`${b.layout}:${b.key}`) || profiles.has(b.value)) throw new Error('Scorciatoie duplicate o tasto non valido.');
    keys.add(`${b.layout}:${b.key}`); profiles.add(b.value);
  }
  return bindings;
}
