# WIN60 HE Studio — release 0.2.0 and handoff, 2026-11-04

Release: **0.2.0 beta**. Deployment: [GitHub Pages](https://primebuild-pc.github.io/aula-win60he-tool/). Source: `main` in `PrimeBuild-pc/aula-win60he-tool`.

## Implemented

- RGB settings and readback through SDK 1.0.24 / KB2 protocol 1.0.9. Static color, firmware effects 1–20, custom mode 21, brightness, speed, direction and off. Seven palette colors and per-key color drafts; saving is explicit. Custom colors have a separate persistence command.
- Searchable mapping by function/category, keyboard capture, before/after feedback. Physical Fn is labeled correctly and cannot be reassigned on the base layer or replaced by an advanced mode during restore.
- Explicit light/dark/system theme and Italian/English preferences, with browser-local persistence. Diagnostic logs keep their original language.
- Both A/D and W/S SOCD pairs, readback of positions/mode and removal that preserves the touch mode. The firmware still overrides Fn on SOCD keys.
- Onboard profile selection gated by the device's `hasFourConfig` response; refreshed state after a switch.
- Guided calibration with exclusive access to the device while calibration is active. The SDK returns `null` after a valid generic calibration ACK; transport failures return `Error`. Calibration accepts the former and rejects the latter.
- Beta Mod-Tap, Toggle, DKS and Rappy Snappy. Registers/modes are read back; paired functions are removed together. Exact physical behavior still needs validation.
- Backup v4 reads current layers and every key's performance, SOCD, seven-color palette, individual colors and supported advanced payloads. Restore validates the entire file before the first write and verifies written values. Legacy v3 nulls are preserved as missing values, never converted to zero. Legacy backups do not contain full SOCD or advanced payloads.
- Layout mode reads are batched in groups of 12. Register responses are matched to requested addresses because the SDK can decode a spurious padding entry.
- Polling and write errors no longer show successful save notifications. Live sensor polling pauses for other operations, navigation and background tabs. The travel model can retrigger below the initial actuation point.

## Automated verification

- `npm test`: validation, trigger display model, real SDK packet encoding with simulated USB transport, sequential performance writes, Fn protection, SOCD, RGB round trips, complete backup, restore, profile/polling changes and generic calibration ACKs.
- `npm run build`.
- `npm run test:e2e`: all sections, history/deep links, mapping search/capture, per-key RGB drafts, invalid imports, theme/language persistence, keyboard Tab behavior, layouts at 375/768/1024/1440 pixels and axe WCAG A/AA checks in both themes.
- GitHub Actions runs these checks before deploying Pages. The simulator does not prove physical firmware behavior.

## Physical validation still required

1. Connect using Chrome or Edge. Confirm model, firmware, protocol, initial rate and active profile. `getBaseInfo()` may not return firmware on every revision; the UI displays “not available” instead of KB2 as a fake version.
2. Export v4 backup, then verify static RGB, dynamic effect IDs, brightness scale (raw firmware units), palette selection (one-based static color index), custom per-key colors, off, persistence after unplugging and restore. Effects are intentionally identified by ID because names for this firmware have not been verified.
3. Verify Mod-Tap, Toggle, DKS masks/thresholds and Rappy Snappy against actual emitted OS keys. DKS uses the SDK's two-threshold payload and explicit transition masks; do not call the physical behavior validated until tested.
4. Verify both SOCD pairs independently and together, then remove them and confirm normal Fn behavior returns. Follow game/tournament rules for directional automation.
5. Change between the four profiles, check persistence and confirm whether the USB connection resets. Reconnect if the device requires it. Never show a switch as verified when readback fails.
6. Test calibration with every switch. The generic ACK confirms command reception, not sensor accuracy; verify travel afterward.
7. Press keys while sampling travel to verify matrix row/column indexing, maximum travel and real USB latency. The loop waits 50 ms after each completed read to avoid saturating USB. The displayed pressed state is a model; the OS event log is the actual input evidence.
8. Round-trip a complete v4 backup with non-default settings and supported advanced functions on real hardware.

## Blocked / intentionally unavailable

- **Firmware 1.15 → 1.16 flashing:** no verified official binary/hash, exact bootloader handshake/PID and recovery path. No flash/erase/reboot operations were added. The official driver asset referenced by its homepage returned HTTP 404 during research; there is no verified firmware provenance from this session. Implement only after obtaining those artifacts and validating on a spare keyboard or a recoverable setup.
- **Onboard macros:** SDK `setMacro` writes event storage starting at address 256 and `getMacro` exposes only the binding/header. This version has no verified event-memory reader or allocator. Editing macros could overwrite other macros or produce a backup that cannot restore them, so no write UI was shipped. A backup containing unknown advanced modes (including macro mode 6) is rejected explicitly.
- **Other AULA models:** no physical compatibility evidence. Keep the WebHID filter at `1CA2:1902`.
- **Automatic USB reconnection:** a disconnect invalidates cached state and prompts reconnect. Do not retry writes automatically after an uncertain acknowledgement.

## Relevant sources

- [SparkLink lighting API](https://sparklinkplayjoy.github.io/keyboard-docs/keyboard/api/lighting.html).
- [Device/profile/calibration API](https://sparklinkplayjoy.github.io/keyboard-docs/keyboard/api/info.html).
- [Advanced key API](https://sparklinkplayjoy.github.io/keyboard-docs/keyboard/api/higherKey.html).
- Installed SDK implementation and protocol declarations under `node_modules/@sparklinkplayjoy/`; packet tests use the installed public protocol package.
