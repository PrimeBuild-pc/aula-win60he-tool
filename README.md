<p align="center">
  <img src="docs/banner.svg" alt="WIN60 HE Studio, a browser configurator for the AULA WIN 60 HE MAX magnetic keyboard" width="100%" />
</p>

# AULA WIN 60 HE MAX Web Driver — WIN60 HE Studio

**A free, open source keyboard configurator for the AULA WIN 60 HE MAX Hall effect keyboard.** Configure Rapid Trigger, RGB lighting, SOCD, key remapping and 8000 Hz polling in your browser using WebHID. No desktop application or installer required.

The keyboard is also commonly written as **AULA WIN60 HE MAX**. This project supports the specific USB device listed below; it is an independent alternative interface, not an official AULA driver or a firmware download.

**[Open the web driver](https://primebuild-pc.github.io/aula-win60he-tool/)** · **[Read the user guide](https://primebuild-pc.github.io/aula-win60he-tool/guide/)** · **[Report a problem](https://github.com/PrimeBuild-pc/aula-win60he-tool/issues/new?template=bug_report.yml)**

[![Build, test and deploy](https://github.com/PrimeBuild-pc/aula-win60he-tool/actions/workflows/pages.yml/badge.svg)](https://github.com/PrimeBuild-pc/aula-win60he-tool/actions/workflows/pages.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-60a5fa)](LICENSE)
![Desktop Chrome and Edge](https://img.shields.io/badge/browser-Chrome%20%7C%20Edge-5eead4)
![Languages: English, Italian, Russian, Spanish, Japanese](https://img.shields.io/badge/languages-EN%20IT%20RU%20ES%20JA-a78bfa)

## Start in one minute

1. Connect your **AULA WIN 60 HE MAX** directly to a USB port on your computer.
2. Open **[WIN60 HE Studio](https://primebuild-pc.github.io/aula-win60he-tool/)** in desktop **Chrome or Edge**. Close other keyboard-driver tabs first.
3. Press **Connect your keyboard** on the welcome screen and select `WIN 60 HE MAX` in the browser device picker.
4. Open **Backup** and download your current setup before making large changes.
5. Choose a section, edit your settings and press its **Apply** or **Save** button.

The interface follows your browser language when supported. You can choose **English, Italiano, Русский, Español or 日本語** and a light, dark or system theme in the workspace. Your language and theme are remembered in this browser.

Configuration becomes available after a successful connection and device read. Settings are written to the keyboard through the firmware; editing a local draft alone does not save it. The connection screen returns if the USB connection is lost.

## What you can configure

| Feature | Controls |
| --- | --- |
| **Rapid Trigger** | Per-key press/release sensitivity, actuation point and top/bottom dead zones |
| **Actuation** | Fixed per-key actuation or shared global actuation |
| **RGB lighting** | Static colors, 20 firmware effects, rainbow palette, brightness, speed, direction, per-key colors and RGB off |
| **Key remapping** | Drag-and-drop base/Fn layout editor, searchable F1–F24/navigation/numpad/media key pool, physical capture, preview and verified save |
| **SOCD / Snap Tap-style input** | A/D and W/S pairs; last input, first-key priority, second-key priority or neutral |
| **Dynamic Keystroke (DKS)** | Up to four actions with editable press/release activation phases |
| **Multi-Point Trigger (MPT)** | Three actions at three increasing key depths |
| **Mod-Tap and Toggle** | Separate tap/hold actions or a latched key |
| **END / release action** | An action when the key is released |
| **Rappy Snappy** | A pair in which the more deeply pressed key takes priority |
| **Macros** | Record or import a sequence, edit delays, export JSON and assign playback behavior |
| **Polling rate** | 125 Hz to 8000 Hz, subject to the keyboard and USB connection |
| **Device settings** | Onboard profiles when reported by the device, Super Response, Windows/macOS mode and guided calibration |
| **Testing and backup** | Live magnetic-sensor travel, received-key tester, validated JSON backup/restore and diagnostic log |

These are keyboard settings, not firmware flashing. Device capabilities are checked during connection; unsupported controls remain disabled.

## Compatibility

| Requirement | Supported configuration |
| --- | --- |
| Keyboard | **AULA WIN 60 HE MAX** |
| USB identification | Vendor `1CA2`, product `1902`; vendor interface `FFA0:0001` |
| Verified protocol | SparkLink KB2 **1.0.9**, SDK **1.0.24** |
| Browser | Desktop Chrome or Edge with WebHID |
| Connection | USB cable; a direct port is recommended for 8 kHz |
| Host OS | Windows, macOS or Linux with a compatible WebHID browser and HID permissions |

Firefox and Safari do not provide the WebHID interface used here. A mobile browser is not a supported configuration environment. Linux may require a device-specific HID permission rule.

**WIN60 HE, WIN68 HE and other AULA models are not interchangeable compatibility claims.** A similar name or controller does not establish compatibility. Please include the exact product name and USB IDs when reporting another model.

## Verification and current limits

- **Real keyboard RGB checks:** static RGB and per-key custom RGB completed USB write/readback/restore cycles on a WIN 60 HE MAX. The application-to-SDK-to-USB RGB path was also exercised. The owner subsequently confirmed that lighting could be changed from the web app.
- **Software checks:** unit tests validate settings, backup boundaries and SDK packets. Browser tests use the production application and SDK with an emulated WebHID boundary. They cover connection, navigation, mapping, RGB, advanced settings, languages, themes, accessibility and responsive layouts.
- **Advanced modes:** software coverage is not a physical timing or behavior certification. DKS, MPT, END, macro playback and other performance/device operations still require behavioral validation on the keyboard.
- **Macros:** one assigned sequence per hardware profile, up to **64 events**. The SDK shares a staging buffer; Studio blocks assignments that could overwrite another binding. Binding metadata is read back, but macro event contents are retained locally rather than read from the keyboard. Export the original JSON. A backup cannot reconstruct an unknown sequence created in another driver.
- **Fn and SOCD:** this firmware ignores the Fn layer on SOCD-enabled keys. For left/right arrows while A/D SOCD is active, use **Fn + Right Alt / Right Ctrl** instead of Fn+A/D.
- **Firmware updates:** unavailable. A verified official image, bootloader identification and recovery procedure are required before flashing can be offered.

See the [release notes](docs/RELEASE-0.4.0.md) and [hardware verification notes](docs/RELEASE-0.3.0.md) for the scope of each check. This is beta software: keep a backup of a working setup.

## Common questions

### How do I change RGB lighting on the AULA WIN60 HE MAX?

Connect the keyboard, open **RGB lighting**, choose a static color or effect and press **Apply lighting**. To color individual keys, select them in the preview, choose a color, press **Paint selection**, then apply. The preview is a draft; firmware controls the actual animation.

Brightness and speed have **five firmware levels, 0–4**. Brightness 0 is dark; choosing a color or effect from that state restores a visible level. Palette slots are 0–6, and slot 7 selects rainbow.

### How do I enable Rapid Trigger or change the actuation point?

Open **Performance**, select the keys and choose the desired mode. Set the actuation, Rapid Trigger sensitivity and dead zones, then apply to the selection. The **FPS profile** in Overview applies a predefined setup across the keyboard; review its values in the [user guide](docs/USER_GUIDE.md#fps-profile).

### Why do A/D or WASD send arrows instead of letters?

The base layer may contain arrow assignments. **Set Fn arrows** in Overview restores W/A/S/D as letters and places arrows on the Fn layer. If SOCD is enabled, its firmware interaction with Fn still applies. See [troubleshooting](docs/TROUBLESHOOTING.md#wasd-or-ad-type-arrows-or-stop-typing).

### How do I add Delete and the missing full-size keyboard keys?

Open **Key mapping → Edit layout → Fn layer → Fill empty Fn slots**. Review the preview and press **Save and apply**. Empty slots receive **Fn+Enter = Delete/Canc**, F1–F12, navigation, the numeric keypad and media controls. Existing assignments stay in place. Customize either layer by dragging a keycap from the pool onto the keyboard, or select the keycap and click its destination. See the [Fn layout guide](docs/USER_GUIDE.md#map-keys-and-the-fn-layer) for the suggested combinations and SOCD interaction.

### Is this the official AULA software? Does it install a driver?

No. It is an independent open source web interface using the SparkLink keyboard SDK. The browser asks you to select a USB device. No Windows driver package, executable or firmware image is installed by this project.

### Does it work with other AULA magnetic keyboards?

Only the exact **WIN 60 HE MAX `1CA2:1902`** configuration above is the current target. Please do not flash or assume support for another model based on its name.

### Are SOCD and macros allowed in my game?

Check your game and tournament rules before enabling automated input. Availability in the keyboard firmware does not imply permission in a game or competition.

## Documentation

All project documentation is maintained in **English**. Interface translations are separate from the documentation.

- [Documentation index](docs/README.md)
- [User guide](docs/USER_GUIDE.md) — connection, mapping, lighting, performance, advanced actions and backups
- [Troubleshooting](docs/TROUBLESHOOTING.md) — USB, RGB, Fn/SOCD and macro issues
- [Development and protocol notes](docs/DEVELOPMENT.md) — local setup, tests, architecture, localization and deployment
- [Contributing](CONTRIBUTING.md) — reproducible reports, translations and hardware changes
- [0.4.0 release notes](docs/RELEASE-0.4.0.md)

## Run locally

Requires a maintained Node.js version compatible with Vite 7; CI uses **Node.js 22**.

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:5199/` in Chrome or Edge. On Windows, `start.cmd` is an optional shortcut. WebHID needs a secure context: HTTPS or localhost.

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Or run `npm run check` after installing Playwright Chromium. CI performs the tests and production build before deploying to GitHub Pages.

## Contribute or report a problem

[Open an issue](https://github.com/PrimeBuild-pc/aula-win60he-tool/issues/new?template=bug_report.yml) with your model, USB IDs, browser, firmware/protocol and reproduction steps. Please distinguish an on-screen success message, a USB readback and an observed physical result. Translation improvements and hardware evidence are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).

## License and attribution

[MIT](LICENSE). Built with `@sparklinkplayjoy/sdk-keyboard` and the SparkLink KB2 protocol. This project is not affiliated with or endorsed by AULA or SparkLink. Product names belong to their respective owners.
