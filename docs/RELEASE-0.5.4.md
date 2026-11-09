# WIN60 HE Studio 0.5.4

Reopening the page or reconnecting the keyboard now restores Apply feedback from device readback. Connection diagnosis reads all per-key actuation, Rapid Trigger and dead-zone values, plus supported active advanced-action registers. A matching game preset and polling rate are recognized again without relying on a browser-only success flag.

Apply buttons for performance, mappings, RGB, SOCD, advanced actions and device settings become gray and disabled when the draft matches the device. Editing a value enables Apply; reverting it disables Apply again without a write. A successful save is required before a write task can show the applied state. Failed saves remain retryable and do not show a saved confirmation. Selecting a key restores its advanced-action fields, including DKS phases and thresholds. Macro event recovery retains the existing local-archive and device-binding limitations.

Preset recognition checks the affected keys, thresholds, advanced modes, SOCD policy and polling. A custom combination that does not match a listed preset is not mislabeled as that preset. Unrelated mappings and RGB do not invalidate a matching preset.

Validation: 41 unit tests, 59 browser tests and the production build passed. Browser coverage includes loss of volatile memory, a full page reload with emulated flash retained, failed-save retries and changed device values that must not restore stale confirmation. Accessibility and responsive checks cover both themes and the supported languages.

A real WIN60 HE MAX on protocol 1.0.9 was read on 2026-11-09: its existing Fn mappings, A/D last-input SOCD and 8 kHz configuration were already active. The explicit keyboard-memory save returned its checked acknowledgement. A fresh USB connection read back the same mappings, per-key performance, SOCD, lighting, global performance, system and selected hardware profile. No performance thresholds or mappings needed to be rewritten. This readback is not a physical power-removal test; a fresh owner-observed unplug comparison remains separate.
