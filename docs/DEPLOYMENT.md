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
