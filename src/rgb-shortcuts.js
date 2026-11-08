// KB2 main-light function codes; never expose ambient LEDs or unrelated vendor actions here.
export const RGB_COMMANDS = {
  0xf310: 'RGB Mode+', 0xf311: 'RGB Dir', 0xf312: 'RGB Bri+', 0xf313: 'RGB Bri-',
  0xf314: 'RGB Spd+', 0xf315: 'RGB Spd-', 0xf317: 'RGB On/Off',
  0xf32f: 'RGB Mode-', 0xf336: 'RGB Color',
};

export const RGB_DESCRIPTIONS = {
  0xf310: 'RGB: modalità successiva', 0xf311: 'RGB: inverti direzione',
  0xf312: 'RGB: aumenta luminosità', 0xf313: 'RGB: riduci luminosità',
  0xf314: 'RGB: aumenta velocità', 0xf315: 'RGB: riduci velocità',
  0xf317: 'RGB: accendi/spegni', 0xf32f: 'RGB: modalità precedente', 0xf336: 'RGB: cambia colore',
};

export const RGB_SUGGESTIONS = new Map([
  [42, 0xf317], [43, 0xf310], [20, 0xf32f], [49, 0xf311],
  [47, 0xf313], [48, 0xf312], [54, 0xf315], [55, 0xf314], [6, 0xf336],
]);
