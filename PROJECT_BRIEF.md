# Even Realities G2 external vision camera

Date: 2026-05-31

## Project goal

Build an external camera capability for Even Realities G2. The system includes a custom Even Hub app based on Vite. It must let a user capture an image with an external camera module, send that image to an OpenAI-compatible API endpoint for vision analysis, and display the AI response on the glasses. The phone camera is forbidden as an image source.

Additional requirement: hardware should be as small as practical.

## Selected architecture

```text
Even G2 / R1 press
  -> Even Hub Vite app POST /api/capture
  -> backend creates queued capture job
  -> XIAO ESP32S3 Sense polls GET /cam/next
  -> XIAO captures JPEG and POSTs /cam/upload/:id
  -> backend calls OpenAI-compatible /v1/chat/completions
  -> Even Hub app polls /api/events
  -> G2 displays AI text result

XIAO physical button press
  -> XIAO captures JPEG directly
  -> XIAO POSTs /cam/button-capture
  -> backend creates xiao_button job and calls vision endpoint
  -> Even Hub app polls /api/events
  -> G2 displays AI text result
```

The app layer controls display and G2/R1 input. The external XIAO module owns image capture. The backend owns API secrets, job coordination, CORS, and vision endpoint calls.

## Current verified MVP status

The primary real-device workflow has been validated:

- XIAO ESP32S3 Sense connects successfully on a home Wi-Fi network.
- G2/R1 press in the Even Hub app creates a backend job.
- XIAO polling receives the job without requiring reset.
- XIAO captures and uploads JPEG to the hosted backend.
- The backend sends the image to the vision endpoint and stores the result.
- The Even Hub app displays the AI result on the glasses.

The firmware now prints a low-frequency polling heartbeat:

```text
Polling backend: no job, RSSI ... dBm
```

When a G2/R1-created job is available, the expected serial sequence includes:

```text
Received backend job: ...
Handling backend job: ...
Uploading JPEG: ... bytes
Upload status: 200
```

The firmware uses one HTTPS client per request and disables connection reuse. This fixed a real-device issue where the XIAO would only upload a queued job after a reset.

## Source documentation reviewed

Even Hub official docs reviewed:

- `https://hub.evenrealities.com/docs/getting-started/overview`
- `https://hub.evenrealities.com/docs/getting-started/architecture`
- `https://hub.evenrealities.com/docs/getting-started/first-app`
- `https://hub.evenrealities.com/docs/guides/input-events`
- `https://hub.evenrealities.com/docs/guides/display`
- `https://hub.evenrealities.com/docs/guides/networking`
- `https://hub.evenrealities.com/docs/reference/packaging`
- `https://hub.evenrealities.com/docs/reference/cli`

Seeed Studio official docs reviewed:

- `https://wiki.seeedstudio.com/xiao_esp32s3_getting_started/`
- `https://wiki.seeedstudio.com/xiao_esp32s3_camera_usage/`

OpenAI vision docs reviewed:

- `https://developers.openai.com/api/docs/guides/images-vision`

## Important factual anchors

Even Hub / G2:

- G2 has dual micro-LED displays, touchpads, optional R1 ring input, and Bluetooth pairing to phone.
- G2 has no camera and no speaker.
- App logic runs in the phone WebView hosted by the Even Realities App; the glasses render UI containers and emit input events.
- Even Hub apps are web apps using standard web technologies plus `@evenrealities/even_hub_sdk`.
- G2 canvas is 576 x 288 per eye, 4-bit green greyscale.
- Text containers support `textContainerUpgrade`; a full-screen text container fills at about 400-500 characters.
- Touchpad events include single press, double press, swipe up, swipe down. Docs note SDK may normalize event code 0 to `undefined` in some cases.
- Production networking requires backend origin in `app.json` `network.whitelist` and valid CORS headers. HTTPS is required in production.
- Packaging uses `evenhub pack app.json dist -o myapp.ehpk`.

Seeed / XIAO:

- XIAO ESP32S3 Sense is the primary MVP module because it is compact and includes camera capability.
- Seeed lists XIAO ESP32S3 Sense as 21 x 17.8 x 15 mm with expansion board.
- Seeed docs list ESP32-S3R8, 2.4 GHz Wi-Fi, BLE 5.0, 8 MB PSRAM, 8 MB Flash, camera, digital microphone, and microSD support.
- Seeed notes later XIAO ESP32S3 Sense units use OV3660 and that camera examples still apply. OV5640 compatibility is also documented.
- Camera pins occupy GPIO10, GPIO11, GPIO12, GPIO13, GPIO14, GPIO15, GPIO16, GPIO17, GPIO18, GPIO38, GPIO39, GPIO40, GPIO47, GPIO48.
- PSRAM must be enabled for camera examples to work properly.
- D1 maps to GPIO2 and is suitable for an external button in this MVP.

Vision endpoint:

- OpenAI Chat Completions supports image input using `type: "image_url"` and a base64 data URL like `data:image/jpeg;base64,...`.
- This project uses Chat Completions format because it is broadly compatible with OpenAI-compatible endpoints.

## Hardware plan

MVP hardware:

```text
Seeed Studio XIAO ESP32S3 Sense
XIAO Sense camera expansion board
External momentary button
150-300 mAh 3.7 V LiPo
Small slide power switch
3D printed or CNC temple clip enclosure
```

Button wiring:

```text
D1 / GPIO2 ---- momentary button ---- GND
```

Firmware uses `INPUT_PULLUP`, so pressed is `LOW`.

Pins to avoid:

- GPIO0: boot strapping.
- GPIO10, 11, 12, 13, 14, 15, 16, 17, 18, 38, 39, 40, 47, 48: camera.
- D8-D10 / GPIO7-9: microSD SPI if microSD is needed.
- D11-D12 / GPIO42-41: microphone if microphone is needed.

Wearable placement:

- Mount camera module near the front third of the right temple.
- Angle lens forward and slightly downward.
- Put battery farther back for balance.

## Software package contents

```text
backend/
  src/config.ts
  src/server.ts
  src/store.ts
  src/test-page.ts
  src/test-settings.ts
  src/types.ts
  src/vision.ts
  src/server.test.ts
  scripts/camera-simulator.ts
  .env.example
  Dockerfile

even-hub-app/
  app.json
  index.html
  package.json
  src/api.ts
  src/main.ts
  src/render.ts
  src/styles.css

firmware/xiao_esp32s3_sense_g2vision/
  xiao_esp32s3_sense_g2vision.ino
  camera_pins_xiao_esp32s3_sense.h
  config.h
  secrets.example.h
  README.md

docs/
  API_CONTRACT.md
  DEPLOYMENT.md
  FUTURE_WORK.md
  HARDWARE_NOTES.md
```

## Backend notes

Backend is an Express server with in-memory state. It is intentionally simple for MVP.

Environment:

```bash
PORT=8787
PUBLIC_BASE_URL=https://g2vision.0ruka.dev
CORS_ORIGIN=*
CAMERA_DEVICE_ID=xiao-g2-001
CAMERA_TOKEN=replace-with-long-random-token
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-replace-me
OPENAI_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT=medium
OPENAI_MAX_COMPLETION_TOKENS=8192
OPENAI_REQUEST_TIMEOUT_MS=300000
OPENAI_IMAGE_DETAIL=
```

Endpoints are documented in `docs/API_CONTRACT.md`.

Hosted manual test page:

- `GET /test` serves a browser test page for manual image uploads.
- The upload area supports drag-and-drop and click/tap file selection.
- The page can edit the prompt used for test uploads.
- `Save` persists the prompt to backend-local ignored storage.
- `Revert` restores the saved prompt into the editor.
- `Reset` restores the original default prompt into the editor.
- Revert and Reset show their target prompt in a small hover toast.
- The page has no `getUserMedia` call and no file input `capture` attribute.

Local-only test prompt storage:

```text
backend/data/test-page-settings.json
```

This file is ignored by Git.

Security notes:

- Camera endpoints require `Authorization: Bearer CAMERA_TOKEN`.
- Even Hub app API calls are unauthenticated in the MVP. Production should add per-user auth or a signed session if this becomes public.
- The backend does not persist images. JPEG bytes are only used for the immediate vision request.
- In-memory jobs expire after `JOB_TTL_MS`.
- App recovery state and response history are also in memory for the MVP. Backend restart clears the latest app state and history.
- `GET /api/app-state` returns app recovery status: `0` main, `1` waiting, `2` response ready. Waiting/response status expires back to `0` after 10 minutes.
- `POST /api/app-state/clear` is called when the user intentionally returns to the main screen. If a pending job was abandoned, its later result is ignored for app recovery.
- The response history keeps the newest 20 terminal responses and drops the oldest item when full.
- Response history titles are generated from normalized response text and capped at 96 characters plus an ellipsis when needed.
- App-created camera uploads are accepted only while a job is `assigned`. After the first upload moves the job to `uploaded` / `analyzing`, duplicate uploads for the same job return `409` so the backend does not analyze the same job twice.
- Vision responses are normalized before app display and history storage. Common LaTeX and raw math notation is converted into readable plain text / Unicode where possible.
- The default prompt no longer asks for answers under 300 Chinese characters, so the app can show fuller responses.

## Even Hub app notes

The app has no phone camera code. It only talks to the backend and the G2 display bridge.

Main behavior:

- On startup, it creates one full-screen text container with `isEventCapture: 1`.
- On startup, it reads `/api/app-state` and restores the waiting or response screen when backend status is `1` or `2`.
- Single press or `undefined` event triggers backend `/api/capture`.
- Double press returns from the waiting/result/history screen to the app main screen.
- Single press from the capture/result screen starts a fresh capture and ignores any older pending result.
- Swipe down on the main screen enters history at the first item; additional down swipes advance through history.
- Swipe up on the main screen enters history at the last item; additional up swipes move backward through history.
- The selected history item is shown with a timestamp and longer generated title.
- Single press while browsing history opens the selected response without changing backend recovery state.
- Swipe up/down on a response screen scrolls one long response text. The app does not split responses into numbered pages.
- It polls `/api/events?after=...` every 1.5 seconds.
- It displays any app-triggered job status and any XIAO button-triggered result.

Important file:

```text
even-hub-app/src/main.ts
```

Verify the current SDK exports after `npm install`. If `CreateStartUpPageContainer`, `TextContainerProperty`, or `OsEventTypeList` changed, adjust imports and constructors using installed SDK types.

## Firmware notes

Important files:

```text
firmware/xiao_esp32s3_sense_g2vision/xiao_esp32s3_sense_g2vision.ino
firmware/xiao_esp32s3_sense_g2vision/config.h
firmware/xiao_esp32s3_sense_g2vision/secrets.example.h
```

Behavior:

- Connects to Wi-Fi.
- Initializes XIAO ESP32S3 Sense camera using Seeed pin mapping.
- Polls `/cam/next` every 2 seconds.
- Prints an idle polling heartbeat about every 10 seconds with Wi-Fi RSSI.
- Reads external button on D1/GPIO2 with debounce.
- Captures JPEG as SVGA, JPEG quality 12.
- Uploads app jobs to `/cam/upload/:id`.
- Uploads hardware button captures to `/cam/button-capture`.
- Creates a fresh secure HTTP client for each backend request and closes it after use.

Arduino setup:

```text
Board: Seeed Studio XIAO ESP32S3
PSRAM: enabled / OPI PSRAM
USB CDC On Boot: enabled for logs
Libraries: ArduinoJson
```

`secrets.h` must be created from `secrets.example.h`.

TLS:

- MVP uses `USE_INSECURE_TLS = true`.
- Production should use a CA certificate and set `USE_INSECURE_TLS = false`.

## How to test

Backend local smoke test:

```bash
cd backend
cp .env.example .env
npm install
npm test
npm run check
npm run build
npm run dev
curl http://localhost:8787/health
./scripts/curl-create-job.sh
./scripts/curl-events.sh
```

Hardware-free camera contract test:

```bash
cd backend
CAMERA_TOKEN=test-token npm run simulate:camera -- --base-url http://127.0.0.1:8787 --mode all
```

`--mode all` covers app-created jobs, hardware-button captures, wrong camera token, unknown device, empty queue, invalid JPEG, and duplicate upload rejection.

Hardware path:

1. Deploy backend at HTTPS origin, e.g. Cloudflare Tunnel to local port 8787.
2. Put the same `CAMERA_TOKEN` in backend `.env` and firmware `secrets.h`.
3. Flash firmware.
4. Open serial monitor at 115200.
5. Confirm Wi-Fi connected and `G2 external vision camera firmware ready`.
6. Wait for `Polling backend: no job, RSSI ... dBm` to confirm ongoing polling.
7. Press the physical button.
8. Confirm firmware logs upload status 2xx.
9. Open Even Hub app and confirm event polling displays result.

G2/R1 path:

1. Start backend and firmware.
2. Start Even Hub app dev server.
3. Use `evenhub qr --url "http://<dev-machine-lan-ip>:5173"` for hardware sideloading.
4. Press G2/R1.
5. Confirm XIAO serial monitor shows `Received backend job`, `Handling backend job`, and upload status 2xx.
6. Confirm backend job goes queued -> assigned -> uploaded -> analyzing -> done.
7. Confirm G2 displays the result.

Packaging:

```bash
cd even-hub-app
npm run pack
```

Mac simulator validation. Start a backend or mock API on the Mac first; port `18798` is the example backend origin below.

```bash
ssh 100.114.172.82
PATH=$HOME/.tools/node22/bin:$HOME/.bun/bin:$PATH
cd ~/g2-external-vision-handoff-sim/even-hub-app
VITE_API_BASE=http://127.0.0.1:18798 npm run dev -- --host 127.0.0.1 --port 5176
node node_modules/@evenrealities/evenhub-simulator/bin/index.js --no-glow --automation-port 9901 http://127.0.0.1:5176
```

## Validation already performed in this project environment

- `backend`: `npm install --ignore-scripts --no-audit --no-fund` succeeded.
- `backend`: `npm run check` and `npm run build` succeeded.
- `even-hub-app`: `npm install --ignore-scripts --no-audit --no-fund` succeeded after setting currently available npm package versions.
- `even-hub-app`: `npm run build` succeeded.
- `even-hub-app`: `npm test` covers response paging and Even Hub event classification, including scroll top and scroll bottom handling.
- `even-hub-app`: `npm run pack` succeeded and produced `g2-external-vision.ehpk`.
- Hosted backend is running locally through `g2vision-backend.service` and Cloudflare Tunnel at `https://g2vision.0ruka.dev`.
- `https://g2vision.0ruka.dev/health` returned healthy JSON.
- Hardware-free camera simulator succeeded against the public URL with a real JPEG.
- Hosted `/test` page upload succeeded with an OpenAI vision response.
- Prompt save and reload for the hosted `/test` page succeeded.
- The backend service auto-restart path was tested by terminating the process and confirming systemd restarted it.
- `backend`: integration tests were added for app-created jobs, hardware-button captures, events, wrong token, unknown device, empty queue, invalid JPEG, and duplicate upload rejection.
- `backend`: `npm test`, `npm run check`, and `npm run build` succeeded after the integration test work.
- `backend`: local server plus `npm run simulate:camera -- --mode all` succeeded without hardware.
- `even-hub-app`: `npm run pack` succeeded after the integration test work.
- Mac Even Hub simulator validation on `100.114.172.82` confirmed a long response can advance from page `1/8` to `2/8` and `3/8` using `up`, with no simulator console errors. The simulator automation `down` action can return `ok` without emitting a down event, so `SCROLL_BOTTOM_EVENT` behavior is covered by app tests.
- XIAO ESP32S3 Sense was flashed and connected successfully on a home Wi-Fi network.
- Real G2/R1 capture flow succeeded end to end: glasses trigger -> backend job -> XIAO polling -> JPEG upload -> AI analysis -> result displayed on glasses.
- Firmware polling stability was fixed after a real-device issue where a queued job was only uploaded after XIAO reset.
- Updated firmware serial heartbeat confirms the XIAO is still polling while idle.

## Known gaps and next actions

1. Replace insecure TLS in firmware before field use.
2. Rotate the OpenAI API key used during manual testing before wider sharing.
3. Add access control or rate limits before sharing the hosted test page widely.
4. Add OTA update for firmware.
5. Add power modes. Current firmware keeps Wi-Fi awake for low latency and drains the battery faster.
6. Add mechanical enclosure files after confirming lens angle and temple placement.
7. Add a hardware shutter LED or haptic cue if privacy signaling is required.
8. Consider lowering poll interval for battery or switching to WebSocket/MQTT after the current polling approach is stable across longer sessions.

## Recommended first setup task

Install dependencies, run backend tests, typecheck backend and Even Hub app, and fix compile errors. Preserve the no-phone-camera constraint and preserve the XIAO D1/GPIO2 hardware button capture path.
