# Development and protocol notes

[Documentation](README.md) · [Contributing](../CONTRIBUTING.md)

## Stack and local setup

Studio is a static JavaScript application built with Vite and `@sparklinkplayjoy/sdk-keyboard` 1.0.24. No application server or database is deployed. CI uses Node.js 22 and the npm lockfile.

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:5199/` in a desktop WebHID browser. `npm run preview` serves the production build on the same port. Use HTTPS or localhost; opening the HTML as a local file is not the supported workflow.

## Source layout

| Path | Responsibility |
| --- | --- |
| `src/aula.js` | Connection, SDK/protocol boundary, device reads/writes and readback validation |
| `src/main.js` | Core UI, performance, SOCD, tester, backup and operation serialization |
| `src/workspace.js` | Navigation, theme, mapping search, RGB drafts, profiles and device controls |
| `src/advanced.js` | DKS/MPT register encoding and advanced validation |
| `src/advanced-ui.js` | Advanced-mode editor, DKS phases and macro recording/import/export |
| `src/settings.js` | Settings/backup trust boundaries, RGB constraints and trigger display model |
| `src/keycodes.js` | HID usages, physical ANSI layout, labels and keyboard-event mapping |
| `src/i18n.js`, `src/locales/` | Language selection, message catalogs and dynamic interpolation |
| `public/guide/` | Static English guide, available without JavaScript or a connected keyboard |
| `tests/browser/keyboard-fixture.js` | WebHID boundary emulator; production UI and SDK still execute |
| `scripts/` | Optional local real-USB diagnostics, excluded from the web runtime |

## Checks

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run check` runs unit tests, the production build and browser tests in order. Playwright starts the production preview if no server is running. If a local development server already occupies port 5199, stop it before claiming a production-build test. Browser tests do not require a physical keyboard.

Unit tests cover validators, SDK packets and localization catalogs. Browser tests cover device connection, writes through the real SDK, backup, locale persistence, themes, responsive layouts and axe accessibility checks. Emulated USB tests cannot establish physical sensor behavior or macro timing.

## Localization

The supported locale IDs are `en`, `it`, `ru`, `es` and `ja`. A valid saved choice wins; otherwise, browser languages are matched by base language (`es-MX` matches `es`), then English is the fallback. Native language names in the selector are preserved.

`src/locales/en.json` maps the existing Italian source messages to canonical English messages. The `ru.json`, `es.json` and `ja.json` catalogs use those **English messages as keys**. Keep every catalog complete; the unit test checks key parity and interpolation fields. Use UTF-8. Keep hardware names, key codes and values intact.

Dynamic messages use named placeholders such as `{count}`, `{key}` and `{duration}`. Preserve each placeholder exactly; word order may differ. Text and accessibility labels are translated while input/select values and event handlers stay unchanged. Translation source text is retained so repeated language switches and asynchronous button restoration work correctly. Diagnostic logs and unknown vendor details remain original for reproducibility.

When adding user-facing text, add its canonical English entry and all three additional translations, then check the actual screen in each language. Add a dynamic template rather than hard-coding every count. Update multilingual search aliases if a new key category requires them.

## KB2 protocol boundaries

The target is VID `0x1CA2`, PID `0x1902`, vendor usage `0xFFA0:0x0001`. Do not open keyboard/mouse interfaces for configuration. The verified device reported protocol 1.0.9.

- Send `SYNCPack` after SDK initialization. Serialize device operations so responses do not interleave.
- Layout 0 is the base layer; layout 1 is Fn. `getLayoutKeyInfo` returns `{key, layout, value}`. Approximately 15 entries fit in a 64-byte packet.
- Standard key codes are HID usages. Consumer codes are `0x1000 | usage`; `0xF001` is Fn; `0xF3xx` are vendor functions.
- Performance mode is `(touchMode << 4) | advancedKeyMode`. Advanced modes include DKS 1, MPT 2, MT 3, Toggle 4, END 5, Macro 6, SOCD 8 and RS 9. Travel registers use microns (`mm * 1000`).
- Polling indices 0–6 correspond to 8K, 4K, 2K, 1K, 500, 250 and 125 Hz. This is firmware configuration readback, not measured USB frequency.
- RGB brightness and speed are 0–4. Palette indices are 0–6; 7 is rainbow. Dynamic mode uses `dynamicColorId` and normalizes `staticColor` to 0. Static mode is 0; custom mode is 21. Activate custom mode before per-key writes, persist and read back.
- Macro SDK 1.0.24 stages events at address 256. Protect other bindings from overwrite. A metadata match does not verify the event bytes or physical playback.
- `getRm6X21Travel()` returns a 6×21 travel matrix in millimetres. The UI's trigger display is a model, not firmware execution.

Backups must be validated fully before the first write. Protect physical Fn access. Preserve a key's touch mode when removing its advanced action, and clear both members of paired functions. Do not replace checked SDK calls with unchecked success assumptions.

## RGB shortcut evidence

The main-light code table is `src/rgb-shortcuts.js`: `F310` next mode, `F311` direction, `F312/F313` brightness, `F314/F315` speed, `F317` on/off, `F32F` previous mode and `F336` static-light color. The reference is the [AureTrix implementation table at a fixed commit](https://github.com/AureTrix-Solutions/AureTrix_driver/blob/589ee92110d4680f1c1d5d0be4563c4d21a6f057/src/utils/keyMap.ts), not a complete manufacturer firmware specification. A read-only check of the owner's WIN60 HE MAX on 2026-11-08 found F310/F311/F312/F313/F314/F317 already assigned on its Fn layer. No mappings or performance values were written during that check.

Browser/SDK tests verify encoding and readback for all nine assignments. Physical remapped behavior remains unverified, especially previous-mode and static-light color. Do not infer behavioral support from a successful register readback. Keep unknown vendor codes intact, and do not add ambient-light or unrelated vendor actions without model-specific evidence.

## Real hardware diagnostics

Optional scripts require Python with the `hidapi` package and the exact keyboard. See [0.3.0 hardware notes](RELEASE-0.3.0.md) for the tested scope.

```bash
node scripts/probe-rgb.mjs
node scripts/probe-rgb.mjs --roundtrip
node scripts/probe-rgb.mjs --custom
node scripts/smoke-hardware.mjs
```

The first command reads; the latter three make temporary RGB changes and restore the original configuration. The browser smoke test expects the local app on port 5199; set `STUDIO_URL` to test another hosted build. Close other driver connections first. These commands are not CI tests and do not prove physical action timing. The bridge rejects firmware/bootloader and non-RGB configuration writes.

## Deployment

Pushing `main` or dispatching `.github/workflows/pages.yml` runs dependency installation, unit tests, production build and Playwright before uploading the GitHub Pages artifact and deploying. Workflow concurrency replaces an older pending run. Avoid repeatedly restarting a healthy queue.

After deployment, check the workflow conclusion **and** the served version/bundle, connection screen and `/guide/`. A successful push is not a completed deployment. Preserve an accurate handoff if an external GitHub incident prevents publication. No deployment secrets belong in the frontend.

## Documentation and public search

Keep documentation in English and interface localization in the catalogs. Keep README instructions, public guide, app metadata and known limitations consistent. See [discoverability notes](DISCOVERABILITY.md) for repository topics, canonical URLs, sitemap scope and search-engine verification limits.


## Power-loss persistence check

KB2 defines `ORDER_TYPE_SAVING_PARAMETER` (`0x02`); see the [SDK command table](https://sparklinkplayjoy.github.io/keyboard-docs/keyboard/type.html). The installed SDK discards the generic result in `getApi`, so `AulaKeyboard.saveSettings()` sends the same command through its serialized transport and checks the response. On the owner's protocol 1.0.9 keyboard, the ACK payload was `00 02 FF FF`; the browser SDK retains trailing report padding. Missing, negative or unrelated responses cannot produce success.

UI write tasks call this once after their verified batch. The game-preset method performs its own final save. Do not save once per key or during read-only sensor polling. Low-level driver setters write/read registers; scripts calling those setters must explicitly call `saveSettings()` after their batch. A save ACK alone is not proof of retained data after power loss.

The local diagnostic bridge remains read-only for key/performance/SOCD settings. `createHidTransport({ allowSave: true })` permits only the explicit parameter-save command in addition to its existing permissions; it does not enable remapping, reset or firmware writes.

```bash
node scripts/check-persistence.mjs --capture
# Remove keyboard USB power for at least five seconds, reconnect, and keep settings unchanged.
node scripts/check-persistence.mjs
```

Capture reads the current profile's four layers, per-key performance registers, active advanced registers where available, SOCD, global performance, lighting, all per-key colors, polling, system and selected profile, then asks the device to save. It refuses to overwrite the baseline. Results are in ignored `.persistence-check/before.json` and `.persistence-check/result.json`, outside Playwright's temporary output folder. Archive these files before starting a later independent capture. The check does not assert that a physical unplug occurred; record the owner's action separately. It cannot verify unreadable macro event bytes, calibration extrema or other hardware profiles.

Browser regression tests separately model volatile working memory and saved state. Their power-cycle operation discards unsaved values. Tests exercise settings through the production app/SDK, then compare retained mappings, performance, SOCD, lighting, global values, advanced/macro metadata, system and profile selection. These emulated tests supplement the physical check; they do not replace it.

Connection diagnosis batches reads of all per-key performance thresholds and reads supported active advanced registers. Apply state compares drafts with that readback, rather than session-only success flags. Preset recognition checks all affected thresholds, modes, SOCD policy and polling; unrelated mappings and RGB do not invalidate it. A failed write/save leaves the session unconfirmed until a successful persistent save. Browser tests also reopen the entire page with the emulator's flash snapshot retained independently of application state, and verify that changed device values cannot restore a stale preset confirmation.


## USB command and polling recovery

WIN60 HE MAX restarts its USB interface when its polling-rate command is written, including a write of the value already active. A real-hardware Fortnite probe on 2026-11-08 reproduced the subsequent polling-read failure on Studio 0.5.1. Read the current rate and skip unchanged writes. For a real change, save pending settings before sending the command, then reconnect without a permission picker, diagnose and verify the retained preset thresholds. Automatic enumeration uses only already-authorized devices. Failure to reappear exits to the connection screen with a retryable error.

SDK 1.0.24's command queue can leave its returned promise unresolved when the transport returns null or throws an error other than its exact recognized timeout string. `src/usb-queue.js` guards the SDK's existing serialized queues, rejects and drains outstanding commands, and gives USB requests a 3.5-second deadline. Failed sessions are not reused for new commands until initialization resets the guard. Optional reads must propagate `USB_CONNECTION_LOST` rather than silently continuing a connection attempt on a dead transport. Keep this adapter aligned with the pinned SDK version; it preserves that version's single/multiple-report conversion.

Tests exercise missing replies, rejected transport operations, queue draining, reconnection, all seven presets with delayed responses and polling-triggered USB restarts. A second browser-to-real-USB Fortnite run completed after the unchanged-rate write was removed; its 14 game-key settings were restored and read back afterward. These checks do not replace an owner-observed physical unplug test. The earlier persistence snapshot predates the owner's subsequent preset changes and must not be reused as proof of power-loss retention.

The hardware probes used a temporary allowlist limited to the 14 game keys, SOCD and polling. That diagnostic-only allowance was removed after the original settings were restored. The shipped diagnostic bridge retains its existing write restrictions.
