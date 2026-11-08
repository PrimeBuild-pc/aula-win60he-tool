# WIN60 HE Studio 0.5.3

After a game preset finishes writing, readback verification and the keyboard-memory save acknowledgement, the Apply button becomes **Preset applied** and stays disabled. A persistent checkmark and **Preset saved and verified** message confirm completion; progress and failed writes never show this success state.

Selecting another preset or polling rate enables Apply again. Changing the affected key performance settings or SOCD also clears the confirmation. Returning to the same unchanged selection keeps the button disabled, including after navigating between sections or changing theme/language. Unrelated mappings and RGB do not invalidate it.

Confirmation belongs to the current verified device session. Reconnecting, re-reading the device or reloading the page requires fresh confirmation; this does not erase settings stored in keyboard memory. A failed device operation also clears previous confirmation because a partial write may have occurred.

Browser checks cover successful saves, prevention of duplicate writes, selection and polling changes, manual performance/SOCD changes, failed-save retries, reconnection, responsive layouts and accessibility in both themes. The existing SDK and persistence tests remain in place. This release changes feedback only; it does not add a new physical keyboard or computer power-cycle test.
