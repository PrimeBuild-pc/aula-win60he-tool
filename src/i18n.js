// Preserve each text node's source so switching language never changes form values or handlers.
const translations = {
  'Vai al contenuto': 'Skip to content', 'Il tuo setup. Il tuo controllo.': 'Your setup. Your control.',
  'Panoramica': 'Overview', 'Mappatura': 'Key mapping', 'Prestazioni': 'Performance',
  'Illuminazione RGB': 'RGB lighting', 'Tasti avanzati': 'Advanced keys', 'Test tasti': 'Key tester',
  'Dispositivo': 'Device', 'Non connesso': 'Not connected', 'Connetti tastiera': 'Connect keyboard',
  'Disconnetti': 'Disconnect', 'Tema': 'Theme', 'Sistema': 'System', 'Scuro': 'Dark', 'Chiaro': 'Light', 'Lingua': 'Language',
  'Esplora il tuo setup. Collega la tastiera per leggere e salvare le impostazioni.': 'Explore your setup. Connect your keyboard to read and save settings.',
  'Come funziona ↗': 'How it works ↗', 'Stato della tastiera e profilo competitivo in un clic.': 'Your keyboard at a glance. A competitive profile in one click.',
  '60% LAYOUT. 100% CONTROLLO.': '60% LAYOUT. 100% CONTROL.', 'Una tastiera, fatta a modo tuo.': 'Your keyboard. Your way.',
  'Dal punto di attuazione al colore di ogni tasto.': 'From actuation to the color of every key.',
  'Tutto nel browser, tutto nella memoria della tastiera.': 'All in your browser. All saved to your keyboard.',
  'Personalizza i tasti →': 'Customize your keys →', 'Crea la tua illuminazione': 'Make it glow',
  'Profilo FPS competitivo': 'Competitive FPS profile', 'Applica profilo FPS': 'Apply FPS profile',
  "Applica a tutti i tasti: Rapid Trigger, attuazione bassa, SOCD su A/D (l'ultimo premuto vince), frecce sul layer Fn e polling 8 kHz.": 'Apply to all keys: Rapid Trigger, low actuation, last-input-priority SOCD on A/D, Fn arrows and 8 kHz polling.',
  'Attuazione (mm)': 'Actuation (mm)', 'Sensibilità RT (mm)': 'RT sensitivity (mm)',
  '8 kHz richiede una porta USB diretta sul PC, senza hub.': '8 kHz requires a direct USB port on your computer, without a hub.',
  'Frecce sul layer Fn': 'Fn layer arrows', 'Imposta frecce Fn': 'Set Fn arrows', 'Layer attivo': 'Current layout',
  'Rosso: tasti con SOCD. Verde: Rapid Trigger attivo.': 'Red: SOCD keys. Green: Rapid Trigger enabled.',
  'Ripristina WASD come lettere e mette le frecce su Fn+W/A/S/D e su Fn +': 'Restore WASD as letters and put arrows on Fn+W/A/S/D and Fn +',
  'Alt dx': 'Right Alt', 'Ctrl dx': 'Right Ctrl', 'Mappatura tasti': 'Key mapping',
  'Clicca un tasto, scegli la nuova funzione, applica. Le modifiche restano salvate sulla tastiera.': 'Select a key, choose its new function and save. Changes stay in your keyboard memory.',
  'Layer base': 'Base layer', 'Layer Fn': 'Fn layer', '1. Seleziona un tasto': '1. Select a key', '2. Scegli la funzione': '2. Choose a function', '3. Salva sulla tastiera': '3. Save to keyboard',
  'Da quale tasto iniziamo?': 'Which key first?', 'Seleziona un tasto nella tastiera qui sopra. Puoi esplorare le funzioni anche senza collegarla.': 'Select a key above. You can explore functions without connecting a keyboard.',
  'Tasto': 'Key', 'Nessuna modifica': 'No changes', 'Modifica da salvare': 'Unsaved change',
  'Cerca una funzione': 'Find a function', 'Es. volume, freccia, F5…': 'Try volume, arrow, F5…',
  'Nuova funzione': 'New function', 'Salva mappatura': 'Save mapping', 'Premi il tasto da assegnare': 'Press a key to assign',
  'Predefinito': 'Reset key', 'Nessuna funzione': 'No function', 'Nessuna': 'None', 'Tutte': 'All', 'Lettere': 'Letters', 'Numeri': 'Numbers', 'Funzione': 'Function', 'Controllo': 'Control', 'Simboli': 'Symbols', 'Navigazione': 'Navigation', 'Modificatori': 'Modifiers', 'Speciali': 'Special',
  'Questo tasto ha il SOCD attivo: il firmware ignora il layer Fn su di esso.': 'SOCD is active on this key: the firmware ignores its Fn layer.',
  'Seleziona uno o più tasti e imposta attuazione e Rapid Trigger.': 'Select one or more keys to set actuation and Rapid Trigger.',
  'Tutti': 'All', 'Nessuno': 'None', 'Impostazioni': 'Settings', 'Modalità': 'Mode', 'Attuazione fissa': 'Fixed actuation',
  'RT pressione (mm)': 'RT press (mm)', 'RT rilascio (mm)': 'RT release (mm)', 'Zona morta alta (mm)': 'Top dead zone (mm)', 'Zona morta bassa (mm)': 'Bottom dead zone (mm)',
  'Applica ai tasti selezionati': 'Apply to selected keys', 'Come funziona': 'How it works',
  'Una palette tutta tua. Scegli un effetto o dipingi ogni singolo tasto.': 'Your own palette. Choose an effect or paint each individual key.',
  'ANTEPRIMA COLORE': 'COLOR PREVIEW', 'Nessun tasto selezionato': 'No keys selected',
  'L’anteprima mostra i colori; le animazioni effettive dipendono dal firmware. Le modifiche si salvano solo con Applica.': 'The preview shows colors; actual animations depend on firmware. Changes are saved only when you apply them.',
  'Effetto e intensità': 'Effect and intensity', 'Effetto': 'Effect', 'Colore statico': 'Static color', 'Personalizzato · per tasto': 'Custom · per key',
  'Luminosità': 'Brightness', 'Velocità': 'Speed', 'Inverti direzione': 'Reverse direction', 'Applica illuminazione': 'Apply lighting', 'Spegni RGB': 'Turn RGB off', 'Rileggi': 'Read again',
  'Anteprima locale · collega la tastiera per salvare.': 'Local preview · connect your keyboard to save.',
  'Bozza locale · premi Applica per salvare.': 'Local draft · press Apply to save.',
  'Configurazione letta dalla tastiera.': 'Settings read from your keyboard.', 'RGB spento sulla tastiera.': 'Keyboard RGB is off.',
  'La tua palette': 'Your palette', 'Scegli uno dei sette colori, poi modificalo con il selettore.': 'Choose one of seven colors, then adjust it with the picker.',
  'Colore selezionato': 'Selected color', 'Valore HEX': 'HEX value', 'Menta': 'Mint', 'Ghiaccio': 'Ice', 'Tramonto': 'Sunset', 'Viola': 'Violet',
  'Colore per tasto': 'Per-key color', 'Seleziona i tasti nell’anteprima, scegli il colore e aggiungilo alla bozza. Premi Applica per salvarlo.': 'Select keys in the preview, choose a color and add it to your draft. Press Apply to save.',
  'Colora selezione': 'Paint selection', 'Gestisce cosa succede quando A e D sono premuti insieme. Utile per lo strafe negli FPS.': 'Choose how opposing keys behave when held together.',
  'Scegli quale input inviare quando due direzioni opposte sono premute insieme.': 'Choose which input to send when two opposing directions are held together.',
  'A / D · orizzontale': 'A / D · horizontal', 'W / S · verticale': 'W / S · vertical',
  'Ultimo premuto vince': 'Last input wins', 'Ha priorità la direzione premuta più di recente': 'The most recently pressed direction takes priority',
  'Priorità al primo tasto': 'First key priority', 'Con entrambi premuti vale il primo della coppia': 'When both are held, the first key takes priority',
  'Priorità al secondo tasto': 'Second key priority', 'Con entrambi premuti vale il secondo della coppia': 'When both are held, the second key takes priority',
  'Neutro': 'Neutral', 'Con entrambi premuti non esce nulla': 'When both are held, neither direction is sent',
  'Attiva SOCD': 'Enable SOCD', 'Disattiva': 'Disable', 'Spento': 'Off',
  'Collega la tastiera per leggere le coppie attive.': 'Connect your keyboard to read active pairs.', 'Nessuna coppia SOCD attiva.': 'No active SOCD pairs.',
  'Verifica le regole del gioco o del torneo prima di attivare SOCD: l’automazione delle direzioni può essere vietata.': 'Check your game or tournament rules before enabling SOCD: automated directional input may be prohibited.',
  'Limite del firmware: sui tasti con SOCD il layer Fn viene ignorato, quindi Fn+A/D non danno le frecce. Usa Fn + Alt dx / Ctrl dx per sinistra/destra.': 'Firmware limitation: SOCD keys ignore the Fn layer, so Fn+A/D cannot send arrows. Use Fn + Right Alt / Right Ctrl for left/right.',
  'Corsa in tempo reale letta dai sensori magnetici, più il test di cosa arriva al PC.': 'Live magnetic sensor travel and a test of what your computer receives.',
  'Rapid Trigger dal vivo': 'Live Rapid Trigger', 'rilasciato': 'released', 'premuto': 'pressed',
  'Avvia lettura': 'Start reading', 'Ferma lettura': 'Stop reading', 'Clicca un tasto qui sotto per seguirlo.': 'Select a key below to follow its travel.',
  'Cosa riceve il PC': 'What your computer receives', 'Premi i tasti: si accendono quelli che arrivano a Windows (anche le frecce del layer Fn).': 'Press keys to see what reaches your computer, including Fn layer arrows.',
  'Un file per ritrovare il tuo setup: mappatura, prestazioni, SOCD e illuminazione.': 'Your setup in a file: mapping, performance, SOCD and lighting.',
  'Scarica backup': 'Download backup', 'Carica backup': 'Load backup', 'Ripristina': 'Restore', 'Nessun file caricato.': 'No file loaded.', 'Nessun file valido caricato.': 'No valid file loaded.',
  'Il backup legge tutti i tasti e include le coppie SOCD e i colori RGB. I vecchi backup v3 restano importabili. Il ripristino riguarda il profilo hardware attualmente selezionato.': 'Backup reads every key and includes SOCD pairs and RGB colors. Legacy v3 backups can still be imported. Restore affects the currently selected hardware profile.',
  'Il ripristino sostituisce le impostazioni del profilo attuale. Esporta prima una copia del setup che vuoi conservare.': 'Restore replaces the current profile settings. Export a copy of any setup you want to keep first.',
  'Profili nella memoria della tastiera, sensori e informazioni sulla connessione.': 'Onboard profiles, sensors and connection information.',
  'Profili hardware': 'Hardware profiles', 'Quattro configurazioni indipendenti. Il cambio profilo legge nuovamente mappatura, prestazioni e RGB dalla tastiera.': 'Four independent configurations. Switching profiles reads mapping, performance and RGB from the keyboard again.',
  'La disponibilità viene verificata alla connessione.': 'Availability is checked when you connect.', 'Rileggi dispositivo': 'Refresh device',
  'Informazioni': 'Information', 'Modello': 'Model', 'Protocollo': 'Protocol', 'Interfaccia': 'Interface', 'Tasti rilevati': 'Keys detected', 'Non disponibile': 'Not available',
  'Calibrazione guidata': 'Guided calibration',
  'Usala dopo aver cambiato switch o se i sensori rispondono in modo anomalo. Appoggia la tastiera su una superficie stabile, libera i tasti e mantieni il cavo collegato.': 'Use after replacing switches or if sensors behave unexpectedly. Place your keyboard on a stable surface, release all keys and keep the cable connected.',
  'Avvia senza premere alcun tasto.': 'Start without pressing any keys.', 'Premi lentamente tutti i tasti fino in fondo, poi rilasciali.': 'Slowly press every key fully, then release it.',
  'Termina e salva, poi verifica la corsa in Test tasti.': 'Finish and save, then check travel in the Key tester.',
  'Avvia calibrazione': 'Start calibration', 'Termina e salva calibrazione': 'Finish and save calibration', 'Calibrazione non avviata.': 'Calibration has not started.',
  'Calibrazione attiva: premi ogni tasto fino in fondo, poi rilasciali tutti e termina.': 'Calibration active: fully press each key, release them all, then finish.',
  'Calibrazione terminata. Verifica i sensori in Test tasti.': 'Calibration finished. Check the sensors in the Key tester.',
  'Collega e personalizza': 'Connect and customize', 'Apri questa pagina in Chrome o Edge su desktop, con la tastiera collegata via USB.': 'Open this page in desktop Chrome or Edge with your keyboard connected via USB.',
  'Chiudi le altre schede del driver AULA e premi Connetti tastiera.': 'Close other AULA driver tabs and press Connect keyboard.',
  'Seleziona WIN 60 HE MAX nella finestra del browser.': 'Select WIN 60 HE MAX in the browser dialog.',
  'Le modifiche vengono scritte solo quando premi Applica o Salva.': 'Changes are written only when you press Apply or Save.',
  'Per problemi USB, scollega e ricollega il cavo e premi Connetti. Il cambio di polling o profilo può richiedere una nuova connessione.': 'For USB issues, reconnect the cable and press Connect. Changing polling or profiles may require a new connection.',
  'Firmware e compatibilità': 'Firmware and compatibility',
  'Il flashing firmware non è disponibile: manca un binario ufficiale verificato con procedura di recupero. Questa versione supporta AULA WIN 60 HE MAX (1CA2:1902). Non usare firmware di altri modelli.': 'Firmware flashing is unavailable: a verified official binary and recovery procedure are still needed. This version supports AULA WIN 60 HE MAX (1CA2:1902). Do not use firmware for other models.',
  'Le macro in memoria richiedono ancora un percorso verificabile di lettura e ripristino: non vengono scritte da questa versione.': 'Onboard macros still need a verifiable read and restore path; this version does not write them.',
  'Apri il driver ufficiale AULA ↗': 'Open the official AULA driver ↗',
  'Più azioni per ogni tasto. Configura un tasto alla volta e verifica la risposta nel tester.': 'More actions per key. Configure one key at a time and check its response in the tester.',
  'Funzioni beta del protocollo KB2. Sostituiscono la funzione avanzata del tasto e possono rendere inaccessibile il suo layer Fn. Per rimuoverle usa Ripristina tasto.': 'Beta KB2 functions. They replace the key’s advanced behavior and may override its Fn layer. Use Reset key to remove them.',
  'Seleziona un tasto': 'Select a key', 'Comportamento': 'Behavior', 'Prima funzione': 'First function', 'Seconda funzione': 'Second function',
  'Mod-Tap · tocco / pressione lunga': 'Mod-Tap · tap / hold', 'Toggle · premi per attivare, ripremi per rilasciare': 'Toggle · tap to hold, tap again to release',
  'DKS · azioni in due punti della corsa': 'DKS · actions at two travel points', 'Rappy Snappy · prevale il tasto più premuto': 'Rappy Snappy · deepest key wins',
  'Soglia pressione lunga (ms)': 'Hold threshold (ms)', 'Punto di attuazione secondario (mm)': 'Second actuation point (mm)',
  'Un tocco invia la prima funzione; una pressione lunga attiva la seconda.': 'A tap sends the first function; holding activates the second.',
  'Un tocco mantiene attiva la funzione; il tocco successivo la rilascia.': 'A tap holds the function; the next tap releases it.',
  'La prima funzione scatta a 0,5 mm, la seconda al punto scelto. Il rilascio le disattiva.': 'The first function triggers at 0.5 mm, the second at your chosen point. Releasing deactivates both.',
  'La prima funzione indica il secondo tasto fisico della coppia. Prevale il tasto con maggiore corsa.': 'The first function identifies the second physical key. The deeper key takes priority.',
  'Applica comportamento': 'Apply behavior', 'Ripristina tasto': 'Reset key', 'Tutti i comandi inviati e le risposte della tastiera.': 'Commands sent and responses received from your keyboard.',
  'Attendi…': 'Please wait…', 'Connessione…': 'Connecting…', 'Disconnessa · riconnetti': 'Disconnected · reconnect',
  'Clicca un solo tasto per leggerne i valori attuali.': 'Select a single key to read its current settings.',
  'Anteprima corsa': 'Travel preview', 'Schema della corsa del tasto': 'Key travel diagram',
  'In ascolto… Esc per annullare': 'Listening… Esc to cancel', 'Nessuna funzione trovata. Prova un altro nome.': 'No matching functions. Try another name.',
  'WebHID non è disponibile in questo browser. Usa Chrome o Edge su desktop.': 'WebHID is unavailable in this browser. Use desktop Chrome or Edge.',
  'IL TUO SETUP INIZIA QUI': 'YOUR SETUP STARTS HERE', 'Piccola tastiera.': 'Small keyboard.', 'Infinite possibilità.': 'Endless possibilities.',
  'La precisione dei tuoi switch. Il carattere dei tuoi colori.': 'The precision of your switches. The character of your colors.',
  'Collega la tastiera e rendila tua, un tasto alla volta.': 'Connect your keyboard. Make it yours, one key at a time.',
  '61 TASTI · SENSORI MAGNETICI · IL TUO CONTROLLO': '61 KEYS · MAGNETIC SENSORS · YOUR CONTROL',
  'Connetti la tua tastiera': 'Connect your keyboard', 'Connessione e lettura…': 'Connecting and reading…', 'Riconnetti': 'Reconnect',
  'Collega il cavo USB e seleziona WIN 60 HE MAX nella finestra del browser.': 'Plug in the USB cable and select WIN 60 HE MAX in the browser dialog.',
  'Chrome o Edge su desktop · Nessuna installazione · Impostazioni salvate nella tastiera': 'Desktop Chrome or Edge · No installation · Settings saved to your keyboard',
  'PRECISIONE CHE SI SENTE.': 'PRECISION YOU CAN FEEL.', 'OPEN SOURCE. FATTO PER IL TUO SETUP.': 'OPEN SOURCE. BUILT FOR YOUR SETUP.',
  'Apri questa pagina in Chrome o Edge su desktop per collegare la tastiera via USB.': 'Open this page in desktop Chrome or Edge to connect your keyboard over USB.',
  'Scegli uno dei sette colori, poi modificalo con il selettore.': 'Choose one of seven colors, then adjust it with the picker.',
  'Attuazione globale · condivisa': 'Global actuation · shared', 'Risposta e sistema': 'Response and system', 'Sistema operativo': 'Operating system',
  'Salva sistema': 'Save system mode', 'Salva Super Response': 'Save Super Response',
  'Super Response privilegia la velocità di risposta e può modificare la precisione del sensore. La modalità sistema cambia il comportamento dei modificatori Windows/macOS.': 'Super Response prioritizes speed and may change sensor precision. System mode changes Windows/macOS modifier behavior.',
  'Un tocco, una funzione. Tieni premuto per la seconda.': 'Tap for one action. Hold for the other.', 'Attiva un tasto senza tenerlo premuto.': 'Keep a key active without holding it.',
  'Quattro azioni, dalla pressione al rilascio.': 'Four actions, from press to release.', 'Tre azioni a tre profondità differenti.': 'Three actions at three different depths.',
  'Una funzione aggiuntiva quando rilasci il tasto.': 'An extra action when you release the key.', 'Tra due tasti, vince quello premuto più a fondo.': 'Between two keys, the deeper one wins.',
  'Una sequenza di azioni, in un solo tasto.': 'A sequence of actions on a single key.', 'Terza funzione': 'Third function', 'Quarta funzione': 'Fourth function',
  'Prima soglia (mm)': 'First threshold (mm)', 'Seconda soglia (mm)': 'Second threshold (mm)', 'Terza soglia (mm)': 'Third threshold (mm)', 'Soglia / ritardo (ms)': 'Threshold / delay (ms)',
  'Toggle · attiva / rilascia': 'Toggle · activate / release', 'DKS · quattro azioni lungo la corsa': 'DKS · four actions through the travel', 'MPT · tre punti di attuazione': 'MPT · three actuation points',
  'END · azione al rilascio': 'END · action on release', 'Rappy Snappy · maggiore profondità': 'Rappy Snappy · deepest press', 'Macro · sequenza di tasti': 'Macro · key sequence',
  'Fasi di attivazione': 'Activation phases', 'Ogni riga è una funzione. Seleziona le fasi di pressione e rilascio in cui deve essere attiva.': 'Each row is an action. Select the press and release phases in which it should be active.',
  'Fondo': 'Bottom', 'Registra una sequenza oppure aggiungi i tasti manualmente. I dati restano nel browser finché non premi Applica.': 'Record a sequence or add keys manually. Data stays in your browser until you press Apply.',
  'Registra sequenza': 'Record sequence', 'Ferma registrazione': 'Stop recording', 'Svuota': 'Clear', 'Esporta sequenza': 'Export sequence', 'Importa sequenza': 'Import sequence',
  'Premi Registra sequenza per iniziare. Esc o Tab interrompono la registrazione.': 'Press Record sequence to start. Esc or Tab stops recording.',
  'Registrazione attiva: premi i tasti. Esc o Tab per terminare.': 'Recording: press your keys. Esc or Tab to finish.',
  'Registrazione fermata. Controlla la sequenza prima di assegnarla.': 'Recording stopped. Review the sequence before assigning it.',
  'Tasto da aggiungere': 'Key to add', 'Pausa prima del tasto (ms)': 'Delay before key (ms)', 'Aggiungi pressione e rilascio': 'Add press and release',
  'Azione': 'Action', 'Pausa (ms)': 'Delay (ms)', 'Pressione': 'Press', 'Rilascio': 'Release', 'Riproduzione': 'Playback',
  'Una volta / numero di ripetizioni': 'Once / repeat count', 'Tocca per ripetere, ritocca per fermare': 'Tap to repeat, tap again to stop',
  'Ripeti mentre il tasto è premuto': 'Repeat while held', 'Ripeti finché premuto, completa l’ultimo ciclo': 'Repeat while held, finish the last cycle',
  'Ripetizioni': 'Repeat count', 'Pausa tra ripetizioni (ms)': 'Delay between repeats (ms)',
  'Questo SDK usa un buffer macro condiviso: Studio protegge le sequenze esistenti e consente una macro assegnata per profilo. Le macro provenienti da altri driver richiedono il loro file originale per il backup.': 'This SDK uses a shared macro buffer: Studio protects existing sequences and supports one assigned macro per profile. Macros from other drivers need their original file for backup.',
  'Configura fino a quattro funzioni e le rispettive fasi di attivazione tra le due soglie.': 'Configure up to four actions and their activation phases between the two thresholds.',
  'Tre funzioni, tre profondità crescenti: ad esempio camminare, correre e scattare.': 'Three actions at increasing depths: for example, walk, run and sprint.',
  'Invia la funzione selezionata quando rilasci il tasto, con il ritardo scelto.': 'Send the selected action when you release the key, with your chosen delay.',
  'Registra, controlla e assegna la sequenza. L’assegnazione viene riletta dalla tastiera; i dati originali restano esportabili.': 'Record, review and assign your sequence. The binding is read back from the keyboard; your original data remains exportable.',
  'Registra e assegna le macro da Tasti avanzati. Il buffer condiviso dell’SDK consente una sequenza assegnata per profilo; esporta il file originale per conservarla.': 'Record and assign macros from Advanced keys. The SDK shared buffer supports one assigned sequence per profile; export the original file to keep it.',
};

function translate(text) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  let value = translations[normalized];
  if (!value) {
    value = normalized.replace(/^(\d+) tasti selezionati$/, '$1 keys selected')
      .replace(/^Effetto firmware (\d+)$/, 'Firmware effect $1').replace(/^Profilo (\d+)$/, 'Profile $1')
      .replace(/^Profilo attuale: (\d+)$/, 'Current profile: $1').replace(/^Coppie attive: /, 'Active pairs: ')
      .replace(/^Funzione attuale: /, 'Current function: ').replace(/^Tasto /, 'Key ').replace(/layer base/g, 'base layer').replace(/layer Fn/g, 'Fn layer')
      .replace(/^Lettura (\d+)\/(\d+)$/, 'Reading $1/$2');
    value = value.replace(/^(\d+) eventi · /, '$1 events · ').replace(/^Colore (\d+): /, 'Color $1: ');
  }
  return text.replace(text.trim(), value);
}

export function initLanguage(preferences) {
  const nodes = new WeakMap();
  const attrs = new WeakMap();
  const select = document.getElementById('languageSelect');
  select.value = preferences.get('studio-language', 'it') === 'en' ? 'en' : 'it';
  const observer = new MutationObserver(() => apply());
  function apply() {
    observer.disconnect();
    const english = select.value === 'en';
    document.documentElement.lang = english ? 'en' : 'it';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim() || node.parentElement?.closest('script, style, #log, #keyLog')) continue;
      const old = nodes.get(node);
      const source = old && node.textContent === old.rendered ? old.source : node.textContent;
      const rendered = english ? translate(source) : source;
      if (node.textContent !== rendered) node.textContent = rendered;
      nodes.set(node, { source, rendered });
    }
    for (const node of document.querySelectorAll('[placeholder], [aria-label]')) {
      let record = attrs.get(node) || {};
      for (const attr of ['placeholder', 'aria-label']) {
        if (!node.hasAttribute(attr)) continue;
        const current = node.getAttribute(attr), old = record[attr];
        const source = old && current === old.rendered ? old.source : current;
        const rendered = english ? translate(source) : source;
        if (current !== rendered) node.setAttribute(attr, rendered);
        record[attr] = { source, rendered };
      }
      attrs.set(node, record);
    }
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  select.addEventListener('change', () => { preferences.set('studio-language', select.value); apply(); });
  apply();
}
