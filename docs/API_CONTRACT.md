# API contract

Backend base URL: `PUBLIC_BASE_URL`, default `https://g2vision.0ruka.dev`.

## App-facing endpoints

### `POST /api/capture`

Creates a capture job for the external XIAO camera module.

Request:

```json
{
  "prompt": "Use Traditional Chinese (Taiwan). Analyze the photo..."
}
```

Response:

```json
{
  "id": "uuid",
  "status": "queued",
  "latestSeq": 1
}
```

### `GET /api/result/:id`

Returns job status and result text.

When a job finishes, the backend normalizes common LaTeX and raw math notation into readable plain text / Unicode before storing the result and emitting events. The vision prompt is allowed to return full answers; it no longer asks the model to keep responses under 300 Chinese characters.

Response:

```json
{
  "id": "uuid",
  "deviceId": "xiao-g2-001",
  "source": "even_hub",
  "status": "done",
  "result": "...",
  "error": null,
  "updatedAt": 1760000000000,
  "latestSeq": 10
}
```

### `GET /api/events?after=0`

Returns status events after the given monotonic sequence number. The Even Hub app polls this endpoint to discover both app-triggered jobs and hardware-button captures.

Response:

```json
{
  "events": [
    {
      "seq": 7,
      "jobId": "uuid",
      "deviceId": "xiao-g2-001",
      "source": "xiao_button",
      "status": "done",
      "result": "...",
      "createdAt": 1760000000000
    }
  ],
  "latestSeq": 7
}
```

### `GET /api/latest?device_id=xiao-g2-001`

Optional convenience endpoint for debugging. Returns the most recently updated job.

### `GET /api/app-state`

Returns the latest app recovery state plus response history. The Even Hub app calls this on startup so accidental app exits can return to the waiting or response screen.

Status values:

- `0`: main screen.
- `1`: capture was triggered and a response is still pending.
- `2`: response or error is ready to show.

`status = 1` and `status = 2` expire back to `0` after 10 minutes. History remains available until the fixed history list rotates it out.

Response:

```json
{
  "status": 2,
  "activeJobId": "uuid",
  "source": "even_hub",
  "jobStatus": "done",
  "result": "AI response text",
  "error": null,
  "updatedAt": 1760000000000,
  "expiresAt": 1760000600000,
  "history": [
    {
      "id": "uuid",
      "jobId": "uuid",
      "source": "even_hub",
      "title": "AI response text",
      "result": "AI response text",
      "createdAt": 1760000000000
    }
  ],
  "latestSeq": 10
}
```

History contains the newest 100 terminal responses. The oldest item is removed when the list grows past 100. Each history title is generated from the start of the normalized response text and is capped at 96 characters plus an ellipsis when needed.

### `GET /history`

Returns the backend website history page. The page lists saved responses and shows the backend input image for each item when an image was saved.

### `GET /test/history`

Alias for the same backend website history page. This keeps history reachable from the hosted `/test` workflow.

### `GET /api/history`

Returns the response history used by the website history page.

Response:

```json
{
  "limit": 100,
  "items": [
    {
      "id": "uuid",
      "jobId": "uuid",
      "source": "xiao_button",
      "title": "AI response text",
      "prompt": "Use Traditional Chinese (Taiwan)...",
      "result": "AI response text",
      "error": null,
      "hasInputImage": true,
      "inputImageUrl": "/api/history/uuid/image",
      "createdAt": 1760000000000
    }
  ]
}
```

### `GET /api/history/:id/image`

Returns the JPEG input image saved for a history item. The backend currently stores these history entries in memory, so history is reset when the backend process restarts.

### `POST /api/app-state/clear`

Clears the visible recovery state back to `status = 0` and returns the same shape as `GET /api/app-state`.

The Even Hub app calls this when the user intentionally double taps back to the main screen. If the cleared state was still waiting for a response, the backend also dismisses that pending job for app recovery so its later result does not reappear unexpectedly. Existing history is preserved.

## Test-page endpoints

These endpoints power the hosted manual test page at `/test`.

### `GET /api/test-prompt`

Returns the original default prompt and the currently saved test-page prompt.

### `PUT /api/test-prompt`

Saves a prompt for future test-page use. The saved prompt is stored on the backend and is not committed to Git.

Request:

```json
{
  "prompt": "Describe the image in one sentence."
}
```

### `POST /api/test-image`

Uploads a JPEG from the hosted test page. The optional `X-Test-Prompt` header overrides the saved prompt for that upload.

Headers:

```http
Content-Type: image/jpeg
X-Test-Prompt: Describe the image in one sentence.
```

Body: raw JPEG bytes.

## Camera-facing endpoints

All camera-facing endpoints require:

```http
Authorization: Bearer CAMERA_TOKEN
```

### `GET /cam/next?device_id=xiao-g2-001`

The XIAO polls this endpoint for app-created capture jobs.

No job response:

```http
204 No Content
```

Job response:

```json
{
  "request_id": "uuid",
  "upload_path": "/cam/upload/uuid",
  "frame_size": "SVGA",
  "jpeg_quality": 12
}
```

### `POST /cam/upload/:id?device_id=xiao-g2-001`

Uploads a JPEG for an app-created job.

Headers:

```http
Authorization: Bearer CAMERA_TOKEN
Content-Type: image/jpeg
X-Device-Id: xiao-g2-001
```

Body: raw JPEG bytes.

### `POST /cam/button-capture?device_id=xiao-g2-001`

Uploads a JPEG captured by the XIAO hardware button. The backend creates a new job with `source = "xiao_button"`, sends the image to the vision endpoint, and emits events for the Even Hub app to display.

Headers and body are the same as `/cam/upload/:id`.

## Hardware-free simulator

The backend includes a simulator for validating the camera contract without the XIAO ESP32S3 Sense:

```bash
cd backend
CAMERA_TOKEN=test-token npm run simulate:camera -- --base-url http://127.0.0.1:8787
```

The default mode exercises both app-created capture jobs and external-button uploads. Use `--mode app-job` or `--mode button` to test one path. Use `--image ./photo.jpg` to upload a real JPEG.

Use `--mode negative` to run only failure-path checks, or `--mode all` to run both successful paths and failure-path checks. The negative checks cover wrong camera token, unknown device, empty queue, invalid JPEG, and duplicate upload rejection.
