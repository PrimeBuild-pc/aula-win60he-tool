# WIN60 HE Studio 0.5.2

Fortnite and other presets could restart USB by writing the polling rate even when it was already correct. A subsequent read could fail and leave the SDK's command promise pending, with the interface stuck on connecting/reading.

Studio now reads the current rate and avoids redundant writes. When the rate genuinely changes, settings are saved before the USB restart, the already-authorized keyboard is reconnected automatically, and preset thresholds are read back. No second permission picker is opened during this recovery.

USB command queues reject missing responses and transport errors instead of leaving the UI indefinitely busy. A failed session returns to a retryable connection screen. Multi-response operations use the same protection.

The failure was reproduced on the owner's WIN60 HE MAX. After the fix, Fortnite completed through the production app and SDK against the real USB device with zero redundant polling writes. Original game-key performance settings were restored and verified afterward. Browser regression tests also cover genuine rate-change restarts, delayed responses, all seven presets and reconnecting after failures. Physical power-loss verification remains separate and requires a fresh pre-unplug snapshot.
