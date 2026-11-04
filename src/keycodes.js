// HID usage IDs used by the firmware. Values >= 0x1000 are consumer (media) codes as 0x1000 | usage,
// 0xF0xx/0xF1xx are firmware Fn/layer keys, 0xF3xx are vendor functions (lighting etc.).
const GROUPS = {
  Lettere: Object.fromEntries('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [4 + i, c])),
  Numeri: { 30: '1', 31: '2', 32: '3', 33: '4', 34: '5', 35: '6', 36: '7', 37: '8', 38: '9', 39: '0' },
  Funzione: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [58 + i, `F${i + 1}`])),
  Controllo: {
    40: 'Enter', 41: 'Esc', 42: 'Backspace', 43: 'Tab', 44: 'Space', 57: 'Caps', 101: 'Menu',
    70: 'PrtSc', 71: 'ScrLk', 72: 'Pause',
  },
  Simboli: {
    45: '-', 46: '=', 47: '[', 48: ']', 49: '\\', 51: ';', 52: "'", 53: '`', 54: ',', 55: '.', 56: '/',
  },
  Navigazione: {
    73: 'Ins', 74: 'Home', 75: 'PgUp', 76: 'Del', 77: 'End', 78: 'PgDn',
    79: '→', 80: '←', 81: '↓', 82: '↑',
  },
  Modificatori: {
    224: 'LCtrl', 225: 'LShift', 226: 'LAlt', 227: 'LWin', 228: 'RCtrl', 229: 'RShift', 230: 'RAlt', 231: 'RWin',
  },
  Media: {
    0x10e9: 'Vol+', 0x10ea: 'Vol-', 0x10e2: 'Mute', 0x10cd: 'Play', 0x10b5: 'Next', 0x10b6: 'Prev',
    0x1183: 'Player', 0x118a: 'Mail', 0x1192: 'Calc', 0x1194: 'PC', 0x1223: 'Web',
  },
  Speciali: { 1: '—', 0xf001: 'Fn' },
};

export const KEY_GROUPS = GROUPS;
export const KEY_LABELS = Object.assign({}, ...Object.values(GROUPS));

export function keyLabel(code) {
  if (code == null) return '?';
  if (KEY_LABELS[code] !== undefined) return KEY_LABELS[code];
  if (code >= 0xf100 && code <= 0xf103) return `L${code - 0xf100}`;
  if (code >= 0xf300) return 'Fx';
  return `0x${code.toString(16)}`;
}

export const physicalLabel = code => code === 1 ? 'Fn' : keyLabel(code);

// Physical width in key units for the 60% ANSI layout; anything not listed is 1u.
export const KEY_WIDTH = {
  42: 2, 43: 1.5, 49: 1.5, 57: 1.75, 40: 2.25, 225: 2.25, 229: 2.75,
  224: 1.25, 227: 1.25, 226: 1.25, 44: 6.25, 230: 1.25, 101: 1.25, 228: 1.25, 1: 1.25,
};

// KeyboardEvent.code -> default HID code, to light keys up in the tester.
export const CODE_TO_HID = (() => {
  const m = {};
  for (let i = 0; i < 26; i += 1) m[`Key${String.fromCharCode(65 + i)}`] = 4 + i;
  for (let i = 1; i <= 9; i += 1) m[`Digit${i}`] = 29 + i;
  m.Digit0 = 39;
  for (let i = 1; i <= 12; i += 1) m[`F${i}`] = 57 + i;
  Object.assign(m, {
    Enter: 40, Escape: 41, Backspace: 42, Tab: 43, Space: 44, Minus: 45, Equal: 46, BracketLeft: 47,
    BracketRight: 48, Backslash: 49, Semicolon: 51, Quote: 52, Backquote: 53, Comma: 54, Period: 55,
    Slash: 56, CapsLock: 57, ContextMenu: 101, ControlLeft: 224, ShiftLeft: 225, AltLeft: 226, MetaLeft: 227,
    ControlRight: 228, ShiftRight: 229, AltRight: 230, MetaRight: 231,
  });
  return m;
})();
