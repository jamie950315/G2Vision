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

The hosted history page saves response metadata and input images to:

```text
backend/data/response-history/
```

These files are also ignored by Git so manual test prompts, response history, and uploaded image bytes do not become repository state.

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

For the hosted backend website, confirm both history routes return the same page:

```bash
curl -I https://g2vision.0ruka.dev/history
curl -I https://g2vision.0ruka.dev/test/history
```

The history page is backed by `backend/data/response-history/`, so restarting `g2vision-backend.service` should preserve the list and saved input images.

## Real glasses and XIAO validation

The real-device MVP path has been validated with:

- hosted backend at `https://g2vision.0ruka.dev`
- XIAO ESP32S3 Sense on home Wi-Fi
- Even Hub app loaded on paired G2 glasses through the companion app
- G2/R1 press triggering XIAO capture and AI result display on glasses

For a live dev run:

```bash
cd even-hub-app
npm run dev -- --host 0.0.0.0 --port 5173
evenhub qr --url "http://<dev-machine-lan-ip>:5173"
```

The phone paired with the G2 must be able to reach the dev server URL. The app itself calls the hosted backend listed in `app.json`.

On the XIAO serial monitor, use `115200` baud and confirm idle polling before pressing G2/R1:

```text
Polling backend: no job, RSSI ... dBm
```

After a G2/R1 press, the XIAO should show:

```text
Received backend job: ...
Handling backend job: ...
Upload status: 200
```

If the G2 creates a job but XIAO serial stays completely quiet, the first check is whether the polling heartbeat is still appearing. If it is absent, inspect XIAO Wi-Fi or reset the board. If the heartbeat is present but no job appears, inspect backend events and app network reachability.
