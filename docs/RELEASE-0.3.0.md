# WIN60 HE Studio 0.3.0 — 2026-11-04

## User-visible changes

The welcome screen has one Connect button. Configuration is hidden and inert until a successful connection and state read. A USB disconnect returns to the welcome screen; failed/cancelled connections remain there with a retry action and an error message. The keyboard illustration uses CSS transforms and restrained motion, with reduced-motion support.

The advanced key page now has a visible catalog for Mod-Tap, Toggle, DKS, MPT, END, Rappy Snappy and macros. DKS supports four independent action codes and seven editable press/release phases. MPT supports three increasing travel thresholds. END triggers the assigned action on release. Macro recording captures balanced key down/up events, supports manual editing by key pairs, imports/exports JSON sequences and assigns playback modes and repeat counts.

Global actuation, Super Response and Windows/macOS controls are included. Unsupported device capabilities remain disabled. Per-key remapping, both SOCD pairs, hardware profiles, calibration and backup are retained.

## RGB defect and fix

The 0.2.0 tests accepted arbitrary byte-sized brightness/speed and treated palette indices as one-based. This failed to match the AULA driver: both sliders use five levels (0–4), colors use slots 0–6 and 7 selects rainbow. The connected keyboard initially reported brightness 0 and rainbow slot 7. A color change must therefore choose the correct zero-based slot, and the UI restores visible brightness when choosing a color from brightness 0.

Custom colors now activate custom mode before sending key colors, send the persistence command, and read the colors back afterward. Dynamic-color selection, sleep and Super Response fields are included in readback checks. UI success describes configuration readback, not an optical measurement of the LEDs.

Regression command: `node --test tests/unit/lighting-regression.test.js`. Before the fix it failed with “Missing expected exception” for brightness 100; after the fix it passes.

The official-driver mirror used to inspect the original slider bounds, palette selectors and DKS phases is [caioalonso/win-68-he-tool](https://github.com/caioalonso/win-68-he-tool). Its lighting flow matches the WIN60 HE MAX's KB2 report layout. The unrelated controller in [AulaControl](https://github.com/sgtflixy/AulaControl) was checked and explicitly excluded because its VID/protocol differ.

## Verification

- Unit tests cover firmware ranges, DKS/MPT validation, balanced macros, backup trust boundaries and SDK packets.
- Browser tests run the actual application and bundled SDK against an emulated WebHID boundary. They verify the welcome gate, connect/disconnect, RGB persistence ordering and indices, DKS/MPT/END registers, macro recording/export/binding/backup, overwrite protection, global actuation, system mode, navigation, language/themes, keyboard access, responsive sizes and axe WCAG A/AA checks.
- A local hardware transport ran the browser RGB workflow against the connected **WIN 60 HE MAX / protocol 1.0.9**, reading back brightness 4, static color index 0 and `#17dba0`. It restored the original RGB configuration afterward. Per-key custom RGB also completed a real USB write/readback/persist/restore cycle. This verifies the USB settings path; visual LED confirmation is separate.
- The connected device also returned global actuation 1 mm, top/bottom dead zones 0. No performance or advanced key settings were changed during the hardware RGB checks.

Optional hardware diagnostics require Python `hidapi` and the matching keyboard. They only open the vendor interface `FFA0:0001` for `1CA2:1902`:

```text
node scripts/probe-rgb.mjs                 # information / RGB reads
node scripts/probe-rgb.mjs --roundtrip     # temporary RGB change and restore
node scripts/probe-rgb.mjs --custom        # temporary A-key color and restore
node scripts/smoke-hardware.mjs            # running local app → real USB RGB test and restore
```

The diagnostic bridge rejects firmware/bootloader commands, key register writes, SOCD writes, profile writes and global-performance writes. It is not included in the browser bundle or deployed as a server.

## Remaining limits and hardware checks

- Macro metadata is verified via the SDK; physical playback, timing and repeat modes still require keyboard testing. Sequences support up to 64 events, matching the original AULA editor. SDK 1.0.24 stages events at address 256, so Studio protects existing bindings by allowing one assigned sequence per profile. Original sequences are stored locally and can be exported. Backups containing externally created macros without the original events are rejected explicitly. A matching binding is not proof that an external tool has not changed the sequence: keep the original JSON file.
- DKS/MPT/END, Rappy Snappy, system mode, Super Response, profile switching, calibration and global-actuation writes are covered by software tests but still need physical behavioral validation. Do not label them hardware-verified from the RGB test.
- Firmware flashing still requires a verified official binary/hash, bootloader identification and a recovery path. No flashing commands are exposed.
- Other controller generations/models remain out of scope. [Wootility](https://wooting.io/post/wootility-5-4-app-linking-and-advanced-keys-presets) and [Keychron Launcher](https://www.keychron.com/blogs/news/how-to-use-he-mode-on-keychron-launcher) were used to compare discoverability and advanced-action workflows, not to assume their firmware capabilities exist on AULA.
