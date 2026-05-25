# Agent instructions

Work as if this repo is an MVP hardware/software integration package.

## Constraints

- Do not introduce phone camera usage. No `getUserMedia`, no file input capture, no mobile camera fallback.
- Keep the XIAO ESP32S3 Sense as the primary hardware target until the MVP works end to end.
- Keep OpenAI-compatible vision calls server-side only. Do not put API keys in the Even Hub app.
- Keep Even Hub network calls limited to the backend origin listed in `app.json`.
- Preserve the external hardware button path. A D1/GPIO2 button press must be able to capture and upload without a G2/R1 event.

## Priority tasks for Codex

1. Install dependencies and run TypeScript checks for `backend` and `even-hub-app`.
2. Verify current `@evenrealities/even_hub_sdk` exported names. Adjust imports in `even-hub-app/src/main.ts` if SDK changed.
3. Run the backend and test endpoints with curl.
4. Flash XIAO firmware and verify serial logs for Wi-Fi, camera init, polling, button capture, and upload.
5. Replace firmware `USE_INSECURE_TLS = true` with CA validation before field testing.
6. Package Even Hub app with `evenhub pack app.json dist -o g2-external-vision.ehpk`.

## Style

- Keep code small and explicit.
- Prefer stable HTTP polling over WebSocket until MVP is reliable.
- Add tests only where they help integration safety.
- Document hardware pin changes in `docs/HARDWARE_NOTES.md`.
