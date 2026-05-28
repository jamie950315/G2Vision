# Local deployment

The current local deployment serves the backend at:

```text
https://g2vision.0ruka.dev
```

It is hosted through Cloudflare Tunnel and points to the backend process on local port `8787`.

## Services

Backend service:

```bash
systemctl --user status g2vision-backend.service
systemctl --user restart g2vision-backend.service
```

Cloudflare Tunnel service:

```bash
systemctl status cloudflared
```

The backend service is enabled and configured with automatic restart. The Cloudflare Tunnel service is also enabled and routes `g2vision.0ruka.dev` to `http://127.0.0.1:8787`.

## Local-only files

The deployed backend reads environment variables from:

```text
backend/.env
```

This file is intentionally ignored by Git. It contains the backend port, camera token, OpenAI-compatible API settings, and public base URL.

The hosted test page saves its prompt settings to:

```text
backend/data/test-page-settings.json
```

This file is also ignored by Git so manual test prompts do not become repository state.

## Hosted manual test page

Manual image testing is available at:

```text
https://g2vision.0ruka.dev/test
```

The page supports:

- dragging an image into the upload area
- clicking or tapping the upload area to choose an image file
- removing the current preview image with the trash icon button
- editing the system prompt used for the upload
- saving the prompt on the backend for future test sessions
- reverting to the saved prompt
- resetting the editor to the original default prompt

The test page does not use phone camera APIs. It has no `getUserMedia` call and no file input `capture` attribute.

## Verification

Use these checks after deployment changes:

```bash
cd backend
npm run check
npm run build
```

```bash
cd even-hub-app
npm run build
npm run pack
```

```bash
curl https://g2vision.0ruka.dev/health
```

For hardware-free end-to-end validation:

```bash
cd backend
CAMERA_TOKEN=<token-from-backend-env> npm run simulate:camera -- --base-url https://g2vision.0ruka.dev --image /path/to/test.jpg
```

For app recovery, history, and long-response scrolling validation, run the Even Hub app against the backend on the Mac simulator host. The local Linux ARM64 environment does not support the official simulator binary.

```bash
ssh 100.114.172.82
PATH=$HOME/.tools/node22/bin:$HOME/.bun/bin:$PATH
cd ~/g2-external-vision-handoff-sim/even-hub-app
VITE_API_BASE=https://g2vision.0ruka.dev npm run dev -- --host 127.0.0.1 --port 5176
node node_modules/@evenrealities/evenhub-simulator/bin/index.js --no-glow --automation-port 9901 http://127.0.0.1:5176
```

Minimum simulator checks:

- `click` from main creates `status = 1`.
- Uploading a camera image moves backend app state to `status = 2`.
- `double_click` clears visible state back to `status = 0` while preserving history.
- `down` on the main screen opens the first history item; additional `down` actions advance through history.
- `up` on the main screen opens the last history item; additional `up` actions move backward through history.
- `click` while browsing history opens the selected response without changing backend state.
- `up` and `down` from a long response screen scroll the single long response text without creating a capture job.
- `click` from a response screen starts a new capture immediately.
- Restarting the app while backend has `status = 1` or `status = 2` restores that screen.
- A pending job abandoned with `double_click` must not reappear after the camera later uploads it.

Simulator automation can return `ok` for an input even when the simulator does not emit an app event. Check `/api/console` and `/api/screenshot/webview` after each gesture, especially for `down`.

Also run one real OpenAI-backed upload with a JPEG from `testImages/` before field testing. Confirm the job reaches `done`, `GET /api/app-state` returns `status = 2`, and `history[0]` contains the successful response.
