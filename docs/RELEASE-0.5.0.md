# WIN60 HE Studio 0.5.0

The base/Fn layout editor supports drag-and-drop keycaps, click/keyboard alternatives, previews, explicit discard and verified application. The full-size key pool includes navigation, F1–F24, numeric-keypad and media functions. Empty Fn positions can be completed without replacing existing bindings, including Fn+Enter for Delete.

RGB lighting now contains its own shortcut editor with nine main-light commands and a suggested Fn layout. It saves only RGB command drafts, keeping unrelated mapping drafts pending. Existing vendor lighting codes have meaningful labels. Shortcut saving is separate from setting the current lighting effect and palette.

Performance provides seven targeted presets: CS2, VALORANT, responsive FPS, Fortnite, A/D SOCD, digital sim racing and mixed use. Preview each key group and its thresholds before applying. Default polling is 1000 Hz, with an explicit 8000 Hz option. SOCD is disabled except in its clearly named preset. CS2 keeps E fixed; racing uses fixed digital input. The previous all-key FPS quick action now opens the preset chooser.

Preset application checks advanced-action conflicts before any write, clears existing movement SOCD appropriately, writes only the listed game keys and verifies changes. It preserves mappings and lighting. Partial failure reports possible saved changes rather than claiming success.

All five interface languages cover the new controls. Unit and browser checks cover command encoding, drafts, preset boundaries, SOCD cleanup, conflicts, translations, accessibility and responsive layout. RGB shortcut semantics and gameplay thresholds still need physical user validation; values are Studio starting points, not certified pro settings. See the [user guide](USER_GUIDE.md) and [protocol evidence](DEVELOPMENT.md#rgb-shortcut-evidence).
