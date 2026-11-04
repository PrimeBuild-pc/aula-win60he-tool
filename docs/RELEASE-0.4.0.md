# WIN60 HE Studio 0.4.0 — 2026-11-04

## Interface languages

- Added Russian, Spanish and Japanese alongside Italian and English.
- First visits match supported browser language preferences, falling back to English. A saved explicit selection takes priority.
- Extracted the English source catalog and added complete locale files. Dynamic counts, delays, firmware effect IDs, accessible labels, tooltips and common confirmation/error messages are localized.
- Language changes preserve form values, hardware codes, event handlers and unsaved drafts. Native language names remain recognizable. Diagnostic logs and unknown vendor error details retain their original text.
- Mapping search includes localized categories and common aliases. Page titles follow the selected interface language after connection.

## English documentation and discovery

- Rewrote the README around the exact AULA WIN 60 HE MAX model, browser setup, features, compatibility and verified limitations.
- Added a documentation index, user guide, troubleshooting, development/localization/protocol notes, contribution guide and English bug-report form.
- Added a static, accessible English `/guide/` page with real crawlable links, setup questions, compatibility and current limits. It works without JavaScript or a connected device.
- Improved application metadata, truthful structured data and sitemap coverage. The welcome screen links to the guide while keeping one connection button.
- Repository metadata is intended to describe the actual supported model and feature set. Search ranking and index inclusion cannot be guaranteed; no fake ratings or claims are included.

## Verification scope

Localization tests enforce complete catalogs, matching interpolation fields, browser-language fallback, repeated switching and stable hardware values. Browser checks cover the three added languages, native names, persistence, RGB confirmation messages, localized search, responsive layouts and accessibility. Guide checks cover no-JavaScript access, links, metadata and structured-data JSON.

This release does not change firmware packet encoding or hardware compatibility. The real-USB RGB evidence and advanced-mode physical validation limits in [0.3.0](RELEASE-0.3.0.md) still apply. The owner has confirmed that RGB can now be changed through the web app. Macro support remains one sequence per profile, up to 64 events, with local original-event retention and metadata readback.

Deployment is verified separately from source and tests. A pending GitHub Pages workflow is not a successful publication. See the live [workflow](https://github.com/PrimeBuild-pc/aula-win60he-tool/actions/workflows/pages.yml) for its current conclusion.
