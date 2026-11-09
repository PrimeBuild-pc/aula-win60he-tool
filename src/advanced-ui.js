import { ADVANCED_MODES, DKS_PHASES, validateMacro } from './advanced.js';
import { CODE_TO_HID, keyLabel } from './keycodes.js';

const $ = id => document.getElementById(id);

export function initAdvancedEditor({ ui, toast }) {
  let masks = [127, 24, 0, 0];
  let events = [];
  const held = new Set();
  let previous = 0;
  const source = $('mapTarget').innerHTML.replace('<option value="1">', '<option value="0">');
  for (const id of ['advancedFirst', 'advancedSecond', 'advancedThird', 'advancedFourth', 'macroActionKey']) $(id).innerHTML = source;
  $('advancedFirst').value = '4'; $('advancedSecond').value = '224';
  $('advancedThird').value = '0'; $('advancedFourth').value = '0'; $('macroActionKey').value = '4';

  function renderTimeline() {
    $('dksPhases').replaceChildren();
    for (const text of ['Funzione', '↓ 1', '↓ 2', '↓ 3', 'Fondo', '↑ 3', '↑ 2', '↑ 1']) {
      const span = document.createElement('span'); span.textContent = text; span.className = 'phase-heading'; $('dksPhases').appendChild(span);
    }
    masks.forEach((mask, row) => {
      const label = document.createElement('span'); label.textContent = `${row + 1} · ${keyLabel(Number($(['advancedFirst', 'advancedSecond', 'advancedThird', 'advancedFourth'][row]).value))}`; $('dksPhases').appendChild(label);
      DKS_PHASES.forEach((bit, column) => {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = (mask & bit) === bit ? '●' : '○';
        button.setAttribute('aria-label', `Funzione ${row + 1}, fase ${column + 1}`); button.setAttribute('aria-pressed', (mask & bit) === bit);
        button.addEventListener('click', () => { masks[row] = (mask & bit) === bit ? mask & ~bit : mask | bit; renderTimeline(); });
        $('dksPhases').appendChild(button);
      });
    });
  }
  for (const id of ['advancedFirst', 'advancedSecond', 'advancedThird', 'advancedFourth']) $(id).addEventListener('change', renderTimeline);

  function renderEvents() {
    $('macroEvents').replaceChildren();
    for (const event of events) {
      const tr = document.createElement('tr');
      for (const value of [keyLabel(event.keyCode), event.status ? 'Pressione' : 'Rilascio']) { const td = document.createElement('td'); td.textContent = value; tr.appendChild(td); }
      const cell = document.createElement('td'), input = document.createElement('input');
      input.type = 'number'; input.min = '0'; input.max = '60000'; input.step = '1'; input.value = event.timeDifference;
      input.setAttribute('aria-label', `Pausa evento ${events.indexOf(event) + 1} (ms)`);
      input.addEventListener('change', () => { if (input.reportValidity()) { event.timeDifference = Number(input.value); renderEvents(); } });
      cell.appendChild(input); tr.appendChild(cell);
      $('macroEvents').appendChild(tr);
    }
    $('macroSummary').textContent = `${events.length} eventi · ${events.reduce((sum, e) => sum + e.timeDifference, 0)} ms`;
    $('btnMacroRecord').disabled = ui.recordingMacro || ui.busy;
    $('btnMacroStop').disabled = !ui.recordingMacro;
    $('macroCapture').classList.toggle('recording', ui.recordingMacro);
  }
  function stopRecording() {
    if (!ui.recordingMacro) return;
    for (const keyCode of held) events.push({ keyCode, status: 0, timeDifference: 0 });
    held.clear(); ui.recordingMacro = false;
    $('macroCapture').textContent = 'Registrazione fermata. Controlla la sequenza prima di assegnarla.';
    renderEvents();
  }
  ui.stopMacroRecording = stopRecording;
  $('btnMacroRecord').addEventListener('click', () => {
    events = []; held.clear(); previous = performance.now(); ui.recordingMacro = true;
    $('macroCapture').textContent = 'Registrazione attiva: premi i tasti. Esc o Tab per terminare.'; $('macroCapture').focus(); renderEvents();
  });
  $('btnMacroStop').addEventListener('click', stopRecording);
  $('btnMacroClear').addEventListener('click', () => { stopRecording(); events = []; renderEvents(); });
  $('btnMacroAdd').addEventListener('click', () => {
    if (!$('macroAddDelay').reportValidity()) return;
    stopRecording();
    const keyCode = Number($('macroActionKey').value);
    if (keyCode < 4 || keyCode > 231) return toast('Scegli un tasto standard per la macro.', 'err');
    if (events.length > 62) return toast('Limite: 64 eventi.', 'err');
    events.push({ keyCode, status: 1, timeDifference: Number($('macroAddDelay').value) }, { keyCode, status: 0, timeDifference: 30 }); renderEvents();
  });
  function capture(event, down) {
    if (!ui.recordingMacro) return;
    if (['Escape', 'Tab'].includes(event.code)) { stopRecording(); return; }
    event.preventDefault(); event.stopImmediatePropagation();
    const keyCode = CODE_TO_HID[event.code];
    if (!keyCode || event.repeat || (down && held.has(keyCode)) || (!down && !held.has(keyCode))) return;
    if (events.length + held.size >= 62) { stopRecording(); toast('Registrazione completata: limite di eventi raggiunto.'); return; }
    const now = performance.now();
    events.push({ keyCode, status: down ? 1 : 0, timeDifference: Math.min(60000, Math.max(0, Math.round(now - previous))) }); previous = now;
    if (down) held.add(keyCode); else held.delete(keyCode);
    renderEvents();
  }
  addEventListener('keydown', event => capture(event, true), true);
  addEventListener('keyup', event => capture(event, false), true);
  addEventListener('blur', stopRecording);
  $('btnMacroExport').addEventListener('click', () => {
    stopRecording();
    try {
      validateMacro(events);
      const url = URL.createObjectURL(new Blob([JSON.stringify({ format: 'win60-macro-1', events }, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'win60-macro.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { toast(error.message, 'err'); }
  });
  $('macroImport').addEventListener('change', async event => {
    stopRecording();
    try {
      const file = event.target.files?.[0]; if (!file) return;
      if (file.size > 100000) throw new Error('File troppo grande.');
      const data = JSON.parse(await file.text());
      if (data.format !== 'win60-macro-1') throw new Error('Formato macro non valido.');
      events = validateMacro(data.events); renderEvents();
    } catch (error) { toast(error.message, 'err'); }
  });
  $('advancedCatalog').addEventListener('click', e => {
    const b = e.target.closest('[data-advanced-mode]'); if (!b) return;
    $('advancedMode').value = b.dataset.advancedMode; $('advancedMode').dispatchEvent(new Event('change'));
  });
  $('advancedMode').addEventListener('change', () => {
    stopRecording();
    const mode = $('advancedMode').value;
    $('advancedStandard').hidden = mode === 'macro'; $('macroEditor').hidden = mode !== 'macro';
    $('advancedDelayLabel').hidden = !['mt', 'tgl', 'end'].includes(mode);
    $('advancedSecondLabel').hidden = !['mt', 'dks', 'mpt'].includes(mode);
    $('advancedThirdLabel').hidden = !['dks', 'mpt'].includes(mode); $('advancedFourthLabel').hidden = mode !== 'dks';
    $('advancedFirstTravelLabel').hidden = !['dks', 'mpt'].includes(mode); $('advancedTravelLabel').hidden = !['dks', 'mpt'].includes(mode); $('advancedThirdTravelLabel').hidden = mode !== 'mpt';
    $('dksTimeline').hidden = mode !== 'dks';
    for (const b of $('advancedCatalog').children) { b.classList.toggle('active', b.dataset.advancedMode === mode); b.setAttribute('aria-pressed', b.dataset.advancedMode === mode); }
    $('advancedHint').textContent = {
      mt: 'Un tocco invia la prima funzione; una pressione lunga attiva la seconda.', tgl: 'Un tocco mantiene attiva la funzione; il tocco successivo la rilascia.',
      dks: 'Configura fino a quattro funzioni e le rispettive fasi di attivazione tra le due soglie.', mpt: 'Tre funzioni, tre profondità crescenti: ad esempio camminare, correre e scattare.',
      end: 'Invia la funzione selezionata quando rilasci il tasto, con il ritardo scelto.', rs: 'La prima funzione indica il secondo tasto fisico della coppia. Prevale il tasto con maggiore corsa.',
      macro: 'Registra, controlla e assegna la sequenza. L’assegnazione viene riletta dalla tastiera; i dati originali restano esportabili.',
    }[mode];
    renderTimeline();
  });
  $('advancedMode').dispatchEvent(new Event('change')); renderEvents();
  const macroDraft = () => ({ events: structuredClone(events), options: { mode: Number($('macroPlayback').value), num: Number($('macroRepeats').value), delay: Number($('macroRepeatDelay').value) } });
  return {
    macroDraft,
    load: (stored, macro) => {
      stopRecording();
      const type = macro ? 'macro' : Object.keys(ADVANCED_MODES).find(type => ADVANCED_MODES[type] === stored.mode);
      $('advancedMode').value = type;
      if (macro) {
        events = structuredClone(macro.events);
        $('macroPlayback').value = macro.params.mode; $('macroRepeats').value = macro.params.num; $('macroRepeatDelay').value = macro.params.delay;
        renderEvents();
      } else {
        const values = new Map(stored.values.map(v => [v.layout, v.value]));
        const put = (id, value) => {
          if (value == null) return;
          if ($(id).tagName === 'SELECT' && ![...$(id).options].some(o => Number(o.value) === value)) $(id).add(new Option(keyLabel(value), value));
          $(id).value = value;
        };
        ['advancedFirst', 'advancedSecond', 'advancedThird', 'advancedFourth'].forEach((id, i) => put(id, values.get(type === 'rs' ? 32 : 9 + i)));
        if (values.has(19)) put('advancedDelay', values.get(19) * (type === 'end' ? 1 : 10));
        put('advancedFirstTravel', values.has(5) ? values.get(5) / 1000 : null);
        put('advancedTravel', values.has(type === 'mpt' ? 6 : 7) ? values.get(type === 'mpt' ? 6 : 7) / 1000 : null);
        if (type === 'mpt') put('advancedThirdTravel', values.get(7) / 1000);
        if (type === 'dks') masks = [13, 14, 15, 16].map(layout => values.get(layout));
      }
      $('advancedMode').dispatchEvent(new Event('change'));
    },
    config: () => ({ first: Number($('advancedFirst').value), second: Number($('advancedSecond').value), third: Number($('advancedThird').value), fourth: Number($('advancedFourth').value), delay: Number($('advancedDelay').value), firstTravel: Number($('advancedFirstTravel').value), travel: Number($('advancedTravel').value), thirdTravel: Number($('advancedThirdTravel').value), masks: [...masks] }),
    macro: () => { stopRecording(); return { events: validateMacro(events), options: { mode: Number($('macroPlayback').value), num: Number($('macroRepeats').value), delay: Number($('macroRepeatDelay').value) } }; },
  };
}
