// Physical HID key -> suggested Fn action. Existing assignments always take precedence.
export const FN_SUGGESTIONS = new Map([
  [41, 53], ...Array.from({ length: 10 }, (_, i) => [30 + i, 58 + i]),
  [45, 68], [46, 69], [42, 73],
  [43, 70], [20, 98], [26, 82], [8, 99], [21, 84], [23, 85], [28, 86],
  [24, 95], [12, 96], [18, 97], [19, 87], [47, 71], [48, 72], [49, 101],
  [57, 83], [4, 80], [22, 81], [7, 79], [9, 74], [10, 77], [11, 75], [13, 78],
  [14, 92], [15, 93], [51, 94], [52, 88], [40, 76],
  [225, 225], [29, 89], [27, 90], [6, 91], [25, 0x10b6], [5, 0x10cd], [17, 0x10b5],
  [16, 0x1192], [54, 0x10ea], [55, 0x10e9], [56, 82], [229, 229],
  [224, 224], [227, 227], [226, 226], [44, 0x10e2], [230, 80], [101, 81], [228, 79],
]);

export function completeFnLayout(keys, mapping) {
  return keys.filter(key => FN_SUGGESTIONS.has(key) && [undefined, 0, 1].includes(mapping.get(key)))
    .map(key => [key, FN_SUGGESTIONS.get(key)]);
}
