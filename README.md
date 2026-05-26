# G2 External Vision handoff

This repository is a handoff package for continuing the Even Realities G2 external camera project in Codex.

Goal: add a miniature external camera module to Even Realities G2 so users can trigger image capture, send the image to an OpenAI-compatible vision endpoint, and display the AI response on the glasses. Phone camera use is intentionally excluded.

## Repository layout

```text
backend/                         Node.js / Express proxy and job queue
even-hub-app/                    Even Hub Vite app for G2/R1 control and display
firmware/xiao_esp32s3_sense_g2vision/
                                 Arduino firmware for Seeed XIAO ESP32S3 Sense
docs/API_CONTRACT.md             App/camera/backend API contract
docs/HARDWARE_NOTES.md           Hardware selection and wiring notes
docs/FUTURE_WORK.md              Remaining validation and hardening work
docs/DEPLOYMENT.md               Local hosted deployment notes
HANDOFF_FOR_CODEX.md             Complete continuation brief for Codex
AGENTS.md                        Coding guidance for Codex agents
```

## Capture paths

1. G2/R1 press in the Even Hub app creates a backend job. The XIAO polls for the job, captures JPEG, uploads it, and the backend calls the vision endpoint.
2. External physical button on the XIAO captures immediately and uploads JPEG to the backend. The Even Hub app polls events and displays the result on the glasses.

## Fast start

Backend:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Even Hub app:

```bash
cd even-hub-app
npm install
VITE_API_BASE=https://g2vision.0ruka.dev npm run dev
```

Firmware:

```text
Open firmware/xiao_esp32s3_sense_g2vision/xiao_esp32s3_sense_g2vision.ino in Arduino IDE.
Copy secrets.example.h to secrets.h.
Set WiFi, backend URL, device ID, and token.
Board: Seeed Studio XIAO ESP32S3.
Enable PSRAM.
Upload.
```

## Without hardware

You can test the camera/backend contract before the XIAO ESP32S3 Sense is available.

```bash
cd backend
npm install
npm run build
PORT=8787 CAMERA_TOKEN=test-token npm start
```

In another shell:

```bash
cd backend
CAMERA_TOKEN=test-token npm run simulate:camera -- --base-url http://127.0.0.1:8787
```

The simulator covers both capture paths:

- app-created job: `POST /api/capture` -> `GET /cam/next` -> `POST /cam/upload/:id`
- hardware-button path: `POST /cam/button-capture`

It can also run negative checks:

```bash
cd backend
CAMERA_TOKEN=test-token npm run simulate:camera -- --base-url http://127.0.0.1:8787 --mode all
```

`--mode all` covers both successful paths plus wrong camera token, unknown device, empty queue, invalid JPEG, and duplicate upload rejection.

If `OPENAI_API_KEY` is not configured, uploads still succeed and jobs end with the expected backend error: `OPENAI_API_KEY is not configured`. Pass a real JPEG with `--image ./photo.jpg` when testing against a real vision endpoint.

## Hosted manual test page

The local deployment exposes a manual test page at:

```text
https://g2vision.0ruka.dev/test
```

The page lets a user drag an image, click or tap the upload area to choose an image, remove the current image, edit the prompt, save the prompt on the backend, revert to the saved prompt, and reset to the original default prompt.

The test page still preserves the no-phone-camera policy. It does not use `getUserMedia` and its file picker does not use the `capture` attribute.

## Hardware MVP

- Seeed Studio XIAO ESP32S3 Sense.
- Momentary button between D1 / GPIO2 and GND.
- 150-300 mAh LiPo for wearable testing.
- Backend reachable over HTTPS.
- Even Hub app whitelist must match the backend origin.

## Future work

See `docs/FUTURE_WORK.md` for the remaining hardware bring-up, TLS, Even Hub validation, backend hardening, and release tasks.

## No phone camera policy

The Even Hub app contains no `getUserMedia`, no `<input capture>`, and no phone camera permissions. The only image source is the XIAO ESP32S3 Sense external camera module.
