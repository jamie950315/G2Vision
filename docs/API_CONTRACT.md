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
