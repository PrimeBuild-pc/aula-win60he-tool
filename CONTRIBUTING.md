# Contributing to WIN60 HE Studio

Thanks for helping improve the AULA WIN 60 HE MAX web configurator. Keep issues, pull requests and project documentation in English. The interface also supports Italian, Russian, Spanish and Japanese.

## Report a problem

Use the [bug report form](https://github.com/PrimeBuild-pc/aula-win60he-tool/issues/new?template=bug_report.yml). Include your exact model, USB IDs, browser/OS, firmware/protocol, app version and reproduction steps. Describe the expected behavior, on-screen result and physical keyboard result separately.

Review diagnostic excerpts before posting. Do not include secrets, personal browser data or unverified firmware binaries. Do not assume another AULA model is compatible because its product name is similar.

## Propose a change

Explain the concrete user problem and current behavior. For hardware features, identify the matching protocol/controller and cite reproducible evidence. Features of Wooting, Keychron or another keyboard do not establish support in this firmware.

## Develop and verify

Follow the [development guide](docs/DEVELOPMENT.md). Use `npm ci`, keep the lockfile consistent and run the checks appropriate to the change. UI/localization changes need browser verification. Hardware write changes need a meaningful regression check at the SDK/transport boundary.

Keep device commands serialized, validate imported data before writing, preserve Fn access and verify stored settings. Do not report emulated USB or metadata tests as proof of physical timing. Never introduce firmware flashing without a verified image, correct device/bootloader identification and recovery plan.

## Improve a translation

Edit the relevant UTF-8 file in `src/locales/`. Canonical English strings are the keys in Russian, Spanish and Japanese catalogs. Preserve named placeholders, model names and HID codes. Keep every locale complete and run `node --test tests/unit/i18n.test.js`, then inspect the affected screen at narrow and desktop widths.

The language selector uses native names. Translation improvements should preserve meaning and familiar keyboard terminology rather than translate product names literally. Explain any terminology correction in the pull request.

## Submit a pull request

Describe the problem, resulting behavior, validation performed and remaining hardware limits. Screenshots help reviewers assess UI changes. Keep unrelated changes separate. Update English documentation when behavior or compatibility changes.
