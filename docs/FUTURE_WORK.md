# Future work

This project is now useful without hardware through the hosted test page and camera simulator. The remaining work should focus on moving from software validation to a reliable hardware MVP.

## 1. Hardware bring-up

- Flash the XIAO ESP32S3 Sense firmware.
- Confirm serial logs for Wi-Fi connection, camera initialization, polling, button press detection, capture, and upload.
- Verify the D1 / GPIO2 button path can capture and upload without an Even Hub or R1 event.
- Test at least one real wearable mounting position on the G2 frame and record any wiring or enclosure changes in `docs/HARDWARE_NOTES.md`.

## 2. TLS and field safety

- Replace `USE_INSECURE_TLS = true` with CA validation before field testing.
- Add the production root CA to `BACKEND_ROOT_CA`.
- Confirm firmware uploads still work over `https://g2vision.0ruka.dev`.

## 3. Even Hub app validation

- Install the packaged Even Hub app on a real device or simulator.
- Confirm G2/R1 input creates a capture job.
- Confirm polling receives app-triggered and hardware-button results.
- Confirm result text is readable on the glasses display.
- Confirm app restart restores `status = 1` waiting screens and `status = 2` response screens for up to 10 minutes.
- Confirm main-screen history entry behavior: swipe down opens the first history item and advances; swipe up opens the last history item and moves backward.
- Confirm swipe up/down on a long response screen scrolls the single long AI response without starting a new capture.
- Confirm math-heavy answers remain readable after LaTeX / raw math normalization on the glasses display.
- Confirm double tap from waiting/result/history returns to the main screen and does not let an abandoned pending job reappear later.
- Re-check `@evenrealities/even_hub_sdk` exported names when upgrading the SDK.

## 4. Backend hardening

- Add request rate limits for `/api/test-image` and public app endpoints.
- Add basic access control for the hosted `/test` page before sharing the URL widely.
- Rotate the OpenAI API key that was used during initial manual testing.
- Add structured request logs without storing image bytes.
- Move app recovery state and response history out of in-memory storage if backend restarts must preserve the latest response.
- Decide whether response history should become per-device, per-user, or account-scoped before adding multiple users or multiple G2 devices.

## 5. Test page improvements

- Add optional response format presets for short caption, OCR, risk check, and detailed scene analysis.
- Add visible upload progress and image metadata.
- Keep the current no-camera policy: no `getUserMedia`, no file input `capture` attribute, and no mobile camera fallback.

## 6. Release workflow

- Keep generated `dist/`, `.ehpk`, `.env`, and local prompt settings out of Git.
- Publish `.ehpk` files as GitHub release artifacts when the app is ready to distribute.
- Run backend tests, backend build, Even Hub app tests, Even Hub package, public `/health` check, camera simulator, Mac Even Hub simulator recovery/history/long-response-scroll checks, and at least one real OpenAI vision call before tagging a release.
