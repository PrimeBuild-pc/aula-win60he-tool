# WIN60 HE Studio 0.5.1

Applied settings now finish with KB2's explicit parameter-save command. The app validates the ACK before showing success. Readback of working-memory values alone no longer completes a write task. Saving is batched per user operation, including layout editing, presets, performance, SOCD, RGB, system/profile changes, advanced actions, macros and calibration completion.

Layout drafts survive a failed memory-save acknowledgement. Device settings provides a manual memory-save retry for settings already applied. Read-only operations do not trigger flash saves.

Regression tests model separate volatile and saved device state and reset working memory on a simulated power cycle. The real-hardware comparison script captures the current profile and compares it after the owner physically removes and restores USB power. Its snapshots are kept outside the browser test runner's temporary output directory.

The real WIN60 HE MAX acknowledged the save command during preparation. Physical power-cycle comparison remains pending until the owner performs that step. An ACK or an emulated power cycle is not recorded as physical persistence proof. See [the procedure and limits](DEVELOPMENT.md#power-loss-persistence-check).
