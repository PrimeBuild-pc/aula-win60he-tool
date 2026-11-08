# AULA WIN 60 HE MAX user guide

[Open WIN60 HE Studio](https://primebuild-pc.github.io/aula-win60he-tool/) · [Documentation](README.md) · [Troubleshooting](TROUBLESHOOTING.md)

## Connect

Use desktop Chrome or Edge on Windows, macOS or Linux. Connect the keyboard by USB, close other AULA driver tabs and press **Connect your keyboard**. Choose `WIN 60 HE MAX` in the browser picker. The supported USB device is `1CA2:1902`, vendor interface `FFA0:0001`.

The welcome screen has one connection button. The workspace opens only after connection and a successful state read. If the keyboard disconnects, the welcome screen returns. A failed or cancelled connection leaves the connection screen available for another attempt.

The browser asks for permission to use the chosen device. It does not install an executable or flash firmware. Use HTTPS for hosted copies; localhost is supported during development.

## Language and appearance

The first visit uses the first supported language in your browser preferences, falling back to English. Choose **English, Italiano, Русский, Español or 日本語** in the workspace language menu. An explicit selection is remembered in this browser and takes precedence over browser preferences.

Choose **Light**, **Dark** or **System** for the theme. Hardware key codes and user data remain unchanged when switching language. Diagnostic logs and unrecognized device/SDK error details preserve their original text so reports remain useful.

## Save a backup first

Open **Backup** and download a complete JSON backup before making large changes. The app reads mapping, performance, supported advanced settings, SOCD and lighting. Backups created by Studio can include the locally retained source events for its macro.

Loading a file validates it before Restore becomes available. Restore changes the **currently selected hardware profile**. It is not a factory reset. Fn access is protected. Legacy schema v3 files remain importable, subject to validation and supported payloads.

## Saving to keyboard memory

**Apply/Save** first writes and reads back the changed values, then sends the keyboard's explicit parameter-save command. Keep USB connected until the operation finishes. This includes base/Fn mappings, RGB shortcuts, per-key performance, game presets, SOCD, lighting, system mode, selected hardware profile, advanced actions, macros and calibration completion. Read-only navigation, diagnostics and sensor polling do not save memory.

If the save response is missing or unexpected, the app reports failure. Layout drafts are cleared only after the save command is acknowledged, so you can retry. **Device settings → Save keyboard memory** retries saving settings already applied to the keyboard. Unsaved on-screen edits must still be applied through their editor.

A disconnect/reconnect in the browser only reopens the USB interface; it does not establish that settings survive power loss. A real persistence check removes the keyboard's USB power, reconnects it and compares the read-back configuration with a pre-unplug snapshot. See the [hardware procedure](DEVELOPMENT.md#power-loss-persistence-check). Only configurations actually compared across that cycle are physically verified. Macro event bytes and calibration extrema remain outside the readback supported by this test.

## Map keys and the Fn layer

1. Open **Key mapping** and select the base or Fn layer.
2. Select a physical key in the keyboard preview.
3. Search or filter actions, or use **Press a key to assign** to capture a standard key.
4. Review the before/after assignment and press **Save mapping**.

The base-layer Fn key is protected. **Reset key** restores the selected mapping; it is not a whole-keyboard reset. Category names and search aliases support the interface languages. Physical key legends such as `LCtrl` and `F5` remain recognizable HID labels.

For a whole layout, press **Edit layout**. Select **Fn layer**, then drag keycaps from the pool below onto the keyboard. You can also select a pool key and click its destination, or focus both buttons in turn and press Enter. The keyboard stays visible as you scroll through the pool. Search and categories include navigation, F1–F24, the numeric keypad, modifiers and media keys. Fn itself stays protected.

Edits are local previews, marked with a dashed border. You can edit both layers before pressing **Save and apply**; it writes and reads back each changed assignment. **Discard changes** removes both drafts without writing them. If a write or memory save fails, the layout draft stays available for retry; some values may already have changed in the keyboard’s working memory. Changing hardware profile, reconnecting or reading a new device configuration discards pending previews with a notification; apply or discard them first.

**Fill empty Fn slots** previews useful assignments on all 60 non-Fn positions. It preserves existing assignments, including vendor functions, and fills only empty positions. Use **Save and apply** to save the result. In an empty Fn layout the suggestions include:

| Combination | Action |
| --- | --- |
| Fn + Enter | Delete / Canc (HID 76, forward delete) |
| Fn + 1–0, −, = | F1–F12 |
| Fn + Backspace / Tab | Insert / Print Screen |
| Fn + F / G / H / J | Home / End / Page Up / Page Down |
| Fn + [ / ] / Caps | Scroll Lock / Pause / Num Lock |
| Fn + W/A/S/D | Up / Left / Down / Right |
| Fn + `/` / Right Alt / Menu / Right Ctrl | Up / Left / Down / Right |
| Fn + U/I/O, K/L/;, Z/X/C, Q/E | Numeric keypad 7–9, 4–6, 1–3, 0/decimal |
| Fn + R/T/Y/P/' | Keypad divide / multiply / subtract / add / Enter |
| Fn + V/B/N/M | Previous track / play-pause / next track / calculator |
| Fn + comma / period / Space | Volume down / up / mute |

These are suggestions for empty slots, not an overwrite preset: existing mappings may differ. Numeric-keypad digits follow Num Lock behavior. Delete is sent by the keyboard after saving; entering BIOS with Fn+Enter still depends on the motherboard accepting that key and the keyboard being available before boot. This boot-time behavior has not been physically verified.

**Set Fn arrows** in Overview restores WASD letters on the base layer and puts arrows on the Fn layer. SOCD-enabled keys ignore their Fn assignments in this firmware; use the alternative Fn combinations below.

## Rapid Trigger and actuation

Open **Performance**, select keys and choose a mode:

- **Fixed actuation:** the selected keys use their individual actuation point.
- **Rapid Trigger:** configure actuation, the movement needed to press/release again and top/bottom dead zones.
- **Global actuation:** selected keys use the shared firmware actuation and dead zones. Changing shared values also affects other keys already using global mode.

Apply explicitly. Selecting a single key reads its current settings. Travel is displayed in millimetres; this controller's supported maximum travel is 3.4 mm. Availability and actual physical behavior depend on the keyboard and calibration.

### Game presets

Open **Performance** (or **Choose a preset** in Overview). Select a preset and review the affected keys, actuation and Rapid Trigger press/release values. Choose 1000 Hz (default) or 8000 Hz for a suitable direct USB connection, then press **Apply preset**. Previewing a preset does not write to the keyboard.

These are Studio starting points adapted to this keyboard, not verified professional-player configurations. All presets use 0.15 mm top/bottom dead zones. They affect WASD plus Q/E/R/F/C/V/X, Left Ctrl, Left Shift and Space; unrelated keys, mappings and RGB stay unchanged.

| Preset | WASD actuation / RT | Other game keys | SOCD |
| --- | --- | --- | --- |
| CS2 · Precision | 0.70 / 0.30 mm | Fixed 1.50 mm, including E | Off |
| VALORANT · Control | 0.50 / 0.20 mm | Fixed 1.20 mm | Off |
| FPS · Responsive | 0.40 / 0.15 mm | Q/E/Ctrl/C/V/X/Shift: 0.80 / 0.25 mm RT; R/F/Space: fixed 1.20 mm | Off |
| Fortnite · Build | 0.50 / 0.20 mm | Q/E/C/V/X/F: 0.80 / 0.25 mm RT; R/Ctrl/Shift/Space: fixed 1.20 mm | Off |
| Competitive · A/D SOCD | 0.50 / 0.20 mm | Fixed 1.20 mm | A/D last input; W/S off |
| Sim racing · Digital | A/D fixed 1.20 mm; W/S fixed 1.50 mm | Fixed 1.50 mm; RT off | Off |
| Mixed use · Stable | Fixed 1.50 mm; RT off | Fixed 1.50 mm | Off |

Both RT directions use the same sensitivity in these presets. The manual editor can adjust them separately. Raise sensitivity or actuation if resting fingers cause accidental input. The racing preset supplies digital key presses; it does not enable analog steering, pedals or gamepad output.

Studio checks every affected key before writing. Remove macros, DKS, Rappy Snappy or other advanced actions on these keys first. Existing A/D and W/S SOCD is removed, then re-enabled on A/D only for the explicit SOCD preset. Each change is read back. If application fails partway, already verified settings may remain saved; the UI reports interruption instead of success. Reapply or restore a backup after resolving the error.

The CS2 starting range and keeping E fixed follow [Wooting’s CS2 guidance](https://wooting.io/post/wooting-cs2-guide-in-game-benefits-rapid-trigger-settings-and-pro-profiles). These values are an adaptation, not a transferred Wootility profile. Valve’s [Side-stepping Skill announcement](https://store.steampowered.com/news/app/730/view/6500469346429600836) addresses hardware-assisted counter-strafing. Keep SOCD and Rappy Snappy off on Valve servers. Other named presets are Studio design choices for their input patterns; check current game/tournament rules before choosing automated direction handling.

## RGB lighting

Choose a static color, firmware effect or custom per-key lighting. There are 20 firmware effect IDs; their actual animation is generated by the keyboard. The visual preview shows colors, not a faithful firmware animation simulation.

- Brightness and speed use firmware levels **0–4**. Brightness 0 is dark.
- Seven palette slots use indices **0–6**; **7** selects rainbow.
- Choosing a color or effect from zero brightness restores a visible level. Setting the brightness slider to zero is still allowed.
- **Apply lighting** writes the draft. **Turn RGB off** sends the off setting. **Read again** replaces the draft with the device state.

### Remap RGB keyboard shortcuts

Expand **RGB keyboard shortcuts** in RGB lighting. This opens the same layout editor with a pool containing only main-light commands: next/previous mode, on/off, color, brightness, direction and speed. Select base or Fn, drag a command onto a physical key, or choose the command and click the destination. Review the preview, then **Save and apply**.

**Suggest RGB layout** previews replacements for only these nine Fn bindings:

| Fn combination | Action |
| --- | --- |
| Backspace | RGB on/off |
| Tab / Q | Next / previous effect |
| [ / ] | Brightness down / up |
| Comma / period | Speed down / up |
| Backslash | Reverse direction |
| C | Change color |

The suggestion deliberately replaces those positions, even if already assigned, and leaves Enter/Delete and other positions alone. Applying from the RGB section writes only pending RGB commands; unrelated mapping drafts remain pending in Key mapping. **Discard changes** in this section discards only pending RGB commands. Applying a shortcut layout does not change the current lighting effect or colors.

These shortcuts are firmware assignments intended to work after the page closes. Color cycling depends on the selected effect (the color function is a static-light command), and direction has no visible effect on modes without directional motion. A saved/read-back code confirms the binding, not the physical lighting behavior; validate the remapped controls on your keyboard. Ambient-strip commands and unrelated vendor functions are excluded from the RGB pool.

### Per-key colors

For per-key colors, select keys in the preview, choose a color and press **Paint selection**. Then apply. Studio activates custom mode before sending per-key colors, sends the persistence command and reads the colors back.

A success message means the settings passed the relevant readback checks. It does not measure LED brightness optically. For RGB troubleshooting, distinguish a local preview, the saved settings and the visible keyboard result.

## SOCD and Rappy Snappy

SOCD controls opposing-direction input for **A/D** and **W/S**. Select last input priority, fixed priority for the first or second member of the pair, or neutral. The latter sends neither direction when both are held. Apply or disable the selected pair explicitly.

Rappy Snappy is a separate advanced mode: choose a physical partner and the more deeply pressed key takes priority. Remove an existing SOCD or Rappy Snappy pair before replacing it with another advanced action. Removing a pair must clear both members.

## Advanced actions

Select a physical key in **Advanced keys**, choose a mode and configure it before applying. Fn is protected. These beta protocol features can override the key's Fn-layer behavior.

| Mode | Configuration |
| --- | --- |
| Mod-Tap | First action on tap, second action on hold; choose the hold threshold |
| Toggle | Activate the assigned key without holding it; tap again to release |
| DKS | Up to four actions, two depth thresholds and seven editable activation phases |
| MPT | Three actions at three strictly increasing depth thresholds |
| END | Action on release with a chosen delay |
| Rappy Snappy | A second physical key; deeper press takes priority |
| Macro | A recorded/imported event sequence and playback settings |

In the DKS timeline, each row is an action. Select the phases in which it should be active. In MPT, thresholds must increase and fit within supported travel. Apply saves the configuration and performs readback checks. **Reset key** removes the selected advanced action.

Software tests cover the register and SDK paths. Physical action timing, macro playback and sensor behavior still require keyboard validation; do not infer them from a successful RGB test.

## Macros

Choose Macro in Advanced keys. Start recording, type the sequence and stop with **Esc**, **Tab** or **Stop recording**. Stopping releases any held keys in the recorded sequence. You can add standard key press/release pairs manually and edit event delays. Recording clears the previous local draft.

A valid macro has **2–64 events**, balanced press/release pairs and delays within the editor's range. Press and release count as separate events. Use **Export sequence** to keep the original JSON and **Import sequence** to reload it. The JSON format is `win60-macro-1`.

Choose playback mode, repeat count and delay, then apply to the selected physical key. The current SDK stages all macro events in a shared buffer, so only **one assigned sequence per profile** is supported. Studio checks for another binding and blocks an overwrite. Remove the previous binding before assigning elsewhere.

The binding metadata is read back. The original event sequence is retained in browser storage and can be exported or included in a Studio backup; it is not reconstructed from keyboard memory. A macro created in another driver needs its original source file. A matching header alone cannot prove that another tool has not changed its event data. Physical timing and playback modes still need hardware testing.

## Profiles, polling and device settings

The device must report onboard profile support before profile controls are enabled. Switching profiles re-reads settings. Export a backup for each profile you want to keep.

Polling options range from 125 Hz to 8 kHz. The displayed value comes from a firmware setting, not an independent measurement of USB report frequency. Use a direct USB connection; reconnect if changing the rate or profile interrupts the device.

Windows/macOS mode changes modifier behavior. Super Response prioritizes speed and may affect sensor precision. These controls are enabled only when the corresponding information is available. They are not host operating-system settings.

## Calibration and testing

Use guided calibration after changing switches or if sensor behavior is abnormal. Place the keyboard on a stable surface and keep USB connected. Start without pressing keys, slowly press every key fully and release it, then finish and save. Other device operations are disabled during calibration.

In **Key tester**, follow a key to read live magnetic-sensor travel. The received-key test shows keyboard events delivered to the computer, including Fn arrows. Tab remains available for normal keyboard navigation. These views help diagnose behavior; they are not a laboratory latency or polling-rate benchmark.

## Firmware updates

Firmware flashing is deliberately unavailable until an official binary/hash, the correct bootloader and a recovery procedure are verified. Do not use firmware for a similarly named AULA model.
