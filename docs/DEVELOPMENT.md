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
