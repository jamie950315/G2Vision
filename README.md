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

## Hardware MVP

- Seeed Studio XIAO ESP32S3 Sense.
- Momentary button between D1 / GPIO2 and GND.
- 150-300 mAh LiPo for wearable testing.
- Backend reachable over HTTPS.
- Even Hub app whitelist must match the backend origin.

## No phone camera policy

The Even Hub app contains no `getUserMedia`, no `<input capture>`, and no phone camera permissions. The only image source is the XIAO ESP32S3 Sense external camera module.
