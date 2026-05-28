# Agent instructions

Work as if this repo is an MVP hardware/software integration package.

## Constraints

- Do not introduce phone camera usage. No `getUserMedia`, no file input capture, no mobile camera fallback.
- Keep the XIAO ESP32S3 Sense as the primary hardware target until the MVP works end to end.
- Keep OpenAI-compatible vision calls server-side only. Do not put API keys in the Even Hub app.
- Keep Even Hub network calls limited to the backend origin listed in `app.json`.
- Preserve the external hardware button path. A D1/GPIO2 button press must be able to capture and upload without a G2/R1 event.

## Priority tasks

1. Install dependencies and run TypeScript checks for `backend` and `even-hub-app`.
2. Verify current `@evenrealities/even_hub_sdk` exported names. Adjust imports in `even-hub-app/src/main.ts` if SDK changed.
3. Run the backend and test endpoints with curl.
4. Flash XIAO firmware and verify serial logs for Wi-Fi, camera init, polling, button capture, and upload.
5. Replace firmware `USE_INSECURE_TLS = true` with CA validation before field testing.
6. Package Even Hub app with `evenhub pack app.json dist -o g2-external-vision.ehpk`.

## Even Hub simulator on Mac

- The local Linux ARM64 environment does not support the official Even Hub simulator binary. For simulator validation, SSH to the Mac host at `100.114.172.82`.
- Use the Mac test workspace at `~/g2-external-vision-handoff-sim`. Sync local repo changes there before running simulator tests.
- On the Mac, put the local Node install and Bun on PATH:
  ```bash
  PATH=$HOME/.tools/node22/bin:$HOME/.bun/bin:$PATH
  ```
- Start the simulator through the package JS wrapper, not by assuming a global binary:
  ```bash
  cd ~/g2-external-vision-handoff-sim/even-hub-app
  node node_modules/@evenrealities/evenhub-simulator/bin/index.js --no-glow --automation-port 9901 http://127.0.0.1:5176
  ```
- A typical simulator run uses three Mac-side services:
  1. backend or mock API on a local port, for example `18798`
  2. Vite app with `VITE_API_BASE` pointing to that backend, for example port `5176`
  3. simulator automation server, for example port `9901`
- Drive the simulator with its automation API:
  ```bash
  curl http://127.0.0.1:9901/api/ping
  curl -X POST http://127.0.0.1:9901/api/input \
    -H 'Content-Type: application/json' \
    -d '{"action":"up"}'
  curl http://127.0.0.1:9901/api/screenshot/webview -o /tmp/webview.png
  curl http://127.0.0.1:9901/api/console
  ```
- Supported automation inputs are `up`, `down`, `click`, and `double_click`. If an action returns `ok` but does not change the app, inspect `/api/console` and screenshots; simulator input behavior can differ from hardware.
- Always stop Mac-side test services after validation so ports do not remain occupied:
  ```bash
  for p in 18798 5176 9901; do
    ids=$(lsof -tiTCP:$p -sTCP:LISTEN 2>/dev/null || true)
    if [ -n "$ids" ]; then kill $ids; fi
  done
  ```

## Style

- Keep code small and explicit.
- Prefer stable HTTP polling over WebSocket until MVP is reliable.
- Add tests only where they help integration safety.
- Document hardware pin changes in `docs/HARDWARE_NOTES.md`.
