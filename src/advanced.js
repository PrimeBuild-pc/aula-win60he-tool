import { range } from './settings.js';

export const ADVANCED_MODES = { dks: 1, mpt: 2, mt: 3, tgl: 4, end: 5, macro: 6, rs: 9 };
export const DKS_PHASES = [1, 2, 4, 24, 32, 64, 128];

export function advancedRegisters(type, config) {
  const { first, second, third = 0, fourth = 0, delay = 200, firstTravel = 0.5, travel = 2, thirdTravel = 3, masks = [127, 24, 0, 0] } = config;
  const codes = [first, second, third, fourth];
  for (const code of codes) range(code, 0, 65535, 'Funzione', true);
  if (!first) throw new Error('Scegli almeno la prima funzione.');
  const values = [];
  const put = (layout, value) => values.push({ layout, value });
  if (['mt', 'tgl'].includes(type)) {
    range(delay, 10, 2550, 'Soglia pressione lunga', true);
    if (delay % 10) throw new Error('La soglia deve essere un multiplo di 10 ms.');
    if (type === 'mt') codes.forEach((value, i) => put(9 + i, value)); else put(9, first);
    put(19, delay / 10);
  } else if (type === 'dks') {
    range(firstTravel, 0.1, 3.3, 'Prima soglia');
    range(travel, firstTravel + 0.05, 3.4, 'Seconda soglia');
    if (!Array.isArray(masks) || masks.length !== 4) throw new Error('Fasi DKS non valide.');
    codes.forEach((value, i) => { range(masks[i], 0, 255, 'Fasi DKS', true); put(9 + i, value); put(13 + i, masks[i]); });
    put(5, Math.round(firstTravel * 1000)); put(7, Math.round(travel * 1000));
  } else if (type === 'mpt') {
    range(firstTravel, 0.1, 3.2, 'Prima soglia');
    range(travel, firstTravel + 0.05, 3.3, 'Seconda soglia');
    range(thirdTravel, travel + 0.05, 3.4, 'Terza soglia');
    codes.slice(0, 3).forEach((value, i) => put(9 + i, value));
    [firstTravel, travel, thirdTravel].forEach((value, i) => put(5 + i, Math.round(value * 1000)));
  } else throw new Error('Modalità avanzata non valida.');
  return values;
}

export { validateMacro } from './settings.js';
