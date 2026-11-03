<p align="center">
  <img src="docs/banner.svg" alt="WIN60 HE Studio — web driver per AULA WIN 60 HE MAX" width="100%" />
</p>

<p align="center">
  <a href="https://primebuild-pc.github.io/aula-win60he-tool/"><img alt="Apri il web driver" src="https://img.shields.io/badge/Apri%20il%20web%20driver-5eead4?style=for-the-badge&logoColor=042f2b&labelColor=0a0c10" /></a>
  <img alt="Stato: beta" src="https://img.shields.io/badge/stato-beta-fbbf24?style=for-the-badge&labelColor=0a0c10" />
  <img alt="Licenza MIT" src="https://img.shields.io/badge/licenza-MIT-60a5fa?style=for-the-badge&labelColor=0a0c10" />
</p>

<p align="center">
  <b>Configura la tua AULA WIN 60 HE MAX direttamente dal browser.</b><br />
  Niente eseguibili da scaricare: Rapid Trigger, SOCD, mappatura tasti e polling 8 kHz via WebHID.
</p>

---

## Perché

Il driver web ufficiale è acerbo e per alcune funzioni chiede di scaricare un'app che Chrome segnala come pericolosa.
WIN60 HE Studio parla con la tastiera usando lo stesso protocollo del driver ufficiale (SparkLink KB2), ma ogni
scrittura viene **riletta e verificata** e i comandi partono **uno alla volta**, così le impostazioni non si mescolano.

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>⇅ Prestazioni</h3>
      Rapid Trigger su qualsiasi tasto, attuazione da 0.1 a 3.4 mm, sensibilità separata in pressione e rilascio,
      zone morte. Anteprima grafica della corsa.
    </td>
    <td width="50%" valign="top">
      <h3>⇄ SOCD</h3>
      Su A/D: ultimo premuto vince, priorità ad A, priorità a D, oppure neutro. Scritto nel formato esatto del
      driver ufficiale.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h3>⌨ Mappatura</h3>
      Rimappa ogni tasto sul layer base e sul layer Fn: lettere, F-key, navigazione, modificatori, tasti media.
    </td>
    <td valign="top">
      <h3>◉ Test tasti</h3>
      Tasto 3D che segue la corsa reale letta dai sensori magnetici (beta), grafico nel tempo e test di cosa arriva
      a Windows.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h3>◎ Profilo FPS in un clic</h3>
      Rapid Trigger su tutti i tasti, SOCD su A/D, frecce sul layer Fn e polling 8 kHz.
    </td>
    <td valign="top">
      <h3>⇩ Backup</h3>
      Salva layer e prestazioni in JSON e ripristinali quando vuoi.
    </td>
  </tr>
</table>

## Come si usa

1. Apri **[il web driver](https://primebuild-pc.github.io/aula-win60he-tool/)** con **Chrome** o **Edge** su desktop.
2. Collega la tastiera via cavo, meglio su una porta USB diretta del PC (niente hub, serve per gli 8 kHz).
3. Chiudi altre schede del driver AULA, poi premi **Connetti tastiera** e scegli `WIN 60 HE MAX`.
4. Dalla **Panoramica** applica il *Profilo FPS* oppure regola tutto a mano dalle altre sezioni.

Le impostazioni vengono salvate nella memoria della tastiera: restano anche scollegandola o usando un altro PC.

### Profilo FPS predefinito

| Impostazione | Valore |
|---|---|
| Attuazione | 0.5 mm su tutti i tasti |
| Rapid Trigger | 0.15 mm in pressione e rilascio |
| Zone morte | 0.15 mm in alto e in basso |
| SOCD | A/D, ultimo premuto vince |
| Polling | 8 kHz |
| Frecce | Fn + W/A/S/D e Fn + <kbd>/</kbd> <kbd>Alt dx</kbd> <kbd>Menu</kbd> <kbd>Ctrl dx</kbd> |

> [!NOTE]
> **Limite del firmware:** sui tasti con SOCD attivo il layer Fn viene ignorato, quindi Fn+A e Fn+D non danno le
> frecce. Per sinistra e destra usa Fn + Alt dx e Fn + Ctrl dx (stesso schema delle Wooting).

## Compatibilità

| | |
|---|---|
| Tastiera | AULA WIN 60 HE MAX (`1CA2:1902`, interfaccia vendor `FFA0:0001`) |
| Protocollo verificato | 1.0.9 |
| Browser | Chrome / Edge desktop (WebHID). Firefox e Safari non supportano WebHID. |
| Sistema | Windows, macOS, Linux (su Linux può servire una regola udev per l'accesso HID) |

Altre tastiere AULA basate sullo stesso chip potrebbero funzionare, ma non sono state provate.

## Sviluppo locale

```bash
npm install
npm run dev
```

Poi apri `http://127.0.0.1:5199` in Chrome. Su Windows basta un doppio clic su `start.cmd`.

<details>
<summary><b>Note tecniche sul protocollo</b></summary>

- SDK: `@sparklinkplayjoy/sdk-keyboard` (protocollo KB2, lo stesso del driver web AULA). Dopo `init()` va inviato il `SYNCPack`.
- Layer: `layout 0` = layer base, `layout 1` = layer Fn, `2-3` inutilizzati. `getLayoutKeyInfo` restituisce `{key, layout, value}`; in un pacchetto da 64 byte stanno circa 15 tasti.
- Keycode: HID standard; i tasti media sono `0x1000 | usage consumer` (es. `0x10EA` volume giù), `0xF001` è Fn, `0xF3xx` sono funzioni del produttore.
- Prestazioni: `Layout_Mode` = `(touchMode << 4) | advancedKeyMode`; `advancedKeyMode 8` = SOCD. Le corse sono in micron (`mm * 1000`).
- SOCD (protocollo ≥ 1.0.7): `[pos1, pos2, key1(2), key2(2), type, mode, delay(2)]`, `type 0` = binding per posizione.
- Polling: `setRateOfReturn(0..6)` = 8K, 4K, 2K, 1K, 500, 250, 125 Hz.
- Corsa in tempo reale: `getRm6X21Travel()` restituisce una matrice 6×21 in mm.

</details>

## Sicurezza

- L'app non aggiorna né modifica il firmware: scrive solo le impostazioni, con gli stessi comandi del driver ufficiale.
- Prima di cambiare molte cose scarica un backup dalla sezione **Backup**.
- Il progetto non è affiliato ad AULA. Usalo a tuo rischio.

## Licenza

[MIT](LICENSE)
