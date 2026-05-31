import express, { type Request, type Response } from 'express'
import cors from 'cors'
import { fileURLToPath } from 'node:url'
import { config, DEFAULT_PROMPT } from './config.js'
import { HISTORY_PAGE_HTML } from './history-page.js'
import { TEST_PAGE_HTML } from './test-page.js'
import { getTestPromptSettings, loadTestPrompt, saveTestPrompt } from './test-settings.js'
import {
  assignNextQueuedJob,
  clearAppState,
  cleanupOldJobs,
  createJob,
  getAppStateSnapshot,
  getDebugState,
  getEventsAfter,
  getHistoryInputImage,
  getJob,
  getLatestJob,
  getLatestSeq,
  getResponseHistory,
  MAX_RESPONSE_HISTORY,
  storeJobInputImage,
  updateJob,
} from './store.js'
import { analyzeImageWithOpenAICompatibleEndpoint } from './vision.js'
import type { Job } from './types.js'

export const app = express()

function buildCorsOptions(): cors.CorsOptions {
  if (config.corsOrigin === '*') {
    return {
      origin: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }
  }

  const allowed = new Set(config.corsOrigin.split(',').map((item) => item.trim()).filter(Boolean))
  return {
    origin(origin, callback) {
      if (!origin || allowed.has(origin)) callback(null, true)
      else callback(new Error(`CORS origin not allowed: ${origin}`))
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }
}

app.use(cors(buildCorsOptions()))
app.options('*', cors(buildCorsOptions()))

function requireCameraAuth(req: Request, res: Response): boolean {
  if (!config.cameraToken) {
    res.status(500).json({ error: 'CAMERA_TOKEN is not configured on backend' })
    return false
  }

  const auth = req.header('authorization') || ''
  if (auth !== `Bearer ${config.cameraToken}`) {
    res.status(401).json({ error: 'unauthorized camera request' })
    return false
  }

  return true
}

function getDeviceId(req: Request): string {
  const raw = req.query.device_id || req.header('x-device-id') || config.cameraDeviceId
  return String(raw)
}

function assertKnownDevice(deviceId: string, res: Response): boolean {
  if (deviceId !== config.cameraDeviceId) {
    res.status(403).json({ error: `unknown device_id: ${deviceId}` })
    return false
  }
  return true
}

async function analyzeAndStore(job: Job, jpeg: Buffer): Promise<void> {
  updateJob(job.id, { status: 'analyzing' })

  try {
    const result = await analyzeImageWithOpenAICompatibleEndpoint(job, jpeg)
    updateJob(job.id, {
      status: 'done',
      result,
      doneAt: Date.now(),
    })
  } catch (error) {
    updateJob(job.id, {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      doneAt: Date.now(),
    })
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, version: '0.1.0', state: getDebugState() })
})

app.get('/test', (_req, res) => {
  res.type('html').send(TEST_PAGE_HTML)
})

app.get(['/history', '/test/history'], (_req, res) => {
  res.type('html').send(HISTORY_PAGE_HTML)
})

app.get('/api/test-prompt', (_req, res) => {
  res.json(getTestPromptSettings())
})

app.put('/api/test-prompt', express.json({ limit: '16kb' }), async (req, res) => {
  try {
    const savedPrompt = await saveTestPrompt(req.body?.prompt)
    res.json({ ok: true, savedPrompt, defaultPrompt: DEFAULT_PROMPT })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) })
  }
})

app.post('/api/capture', express.json({ limit: '64kb' }), (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : DEFAULT_PROMPT
  const job = createJob({ source: 'even_hub', prompt, enqueue: true })
  res.json({ id: job.id, status: job.status, latestSeq: getLatestSeq() })
})

app.get('/api/result/:id', (req, res) => {
  const job = getJob(req.params.id)
  if (!job) {
    res.status(404).json({ error: 'job not found' })
    return
  }

  res.json({
    id: job.id,
    deviceId: job.deviceId,
    source: job.source,
    status: job.status,
    result: job.result,
    error: job.error,
    updatedAt: job.updatedAt,
    latestSeq: getLatestSeq(),
  })
})

app.get('/api/events', (req, res) => {
  const after = Number.parseInt(String(req.query.after || '0'), 10)
  const safeAfter = Number.isFinite(after) ? after : 0
  res.json({ events: getEventsAfter(safeAfter), latestSeq: getLatestSeq() })
})

app.get('/api/latest', (req, res) => {
  const deviceId = req.query.device_id ? String(req.query.device_id) : undefined
  const job = getLatestJob(deviceId)
  if (!job) {
    res.status(404).json({ error: 'no jobs yet' })
    return
  }

  res.json({
    id: job.id,
    deviceId: job.deviceId,
    source: job.source,
    status: job.status,
    result: job.result,
    error: job.error,
    updatedAt: job.updatedAt,
    latestSeq: getLatestSeq(),
  })
})

app.get('/api/app-state', (_req, res) => {
  res.json(getAppStateSnapshot())
})

app.get('/api/history', (_req, res) => {
  const items = getResponseHistory().map((item) => ({
    ...item,
    inputImageUrl: item.hasInputImage ? `/api/history/${encodeURIComponent(item.jobId)}/image` : undefined,
  }))

  res.json({ limit: MAX_RESPONSE_HISTORY, items })
})

app.get('/api/history/:id/image', (req, res) => {
  const image = getHistoryInputImage(req.params.id)
  if (!image) {
    res.status(404).json({ error: 'history image not found' })
    return
  }

  res.type(image.contentType).send(image.data)
})

app.post('/api/app-state/clear', (_req, res) => {
  res.json(clearAppState())
})

app.post('/api/test-image', express.raw({ type: 'image/jpeg', limit: '8mb' }), (req, res) => {
  const jpeg = req.body as Buffer
  if (!jpeg || jpeg.length < 1024) {
    res.status(400).json({ error: 'empty or invalid jpeg upload' })
    return
  }

  const job = createJob({
    source: 'test_page',
    deviceId: 'browser-test',
    prompt: req.header('x-test-prompt') || getTestPromptSettings().savedPrompt,
    enqueue: false,
  })

  storeJobInputImage(job.id, jpeg)
  updateJob(job.id, { status: 'uploaded', uploadedAt: Date.now(), deviceId: 'browser-test' })
  res.json({ ok: true, id: job.id, bytes: jpeg.length, latestSeq: getLatestSeq() })
  void analyzeAndStore(job, jpeg)
})

app.get('/cam/next', (req, res) => {
  if (!requireCameraAuth(req, res)) return

  const deviceId = getDeviceId(req)
  if (!assertKnownDevice(deviceId, res)) return

  const job = assignNextQueuedJob(deviceId)
  if (!job) {
    res.status(204).end()
    return
  }

  res.json({
    request_id: job.id,
    upload_path: `/cam/upload/${job.id}`,
    frame_size: 'SVGA',
    jpeg_quality: 12,
  })
})

app.post(
  '/cam/upload/:id',
  express.raw({ type: ['image/jpeg', 'application/octet-stream'], limit: '8mb' }),
  (req, res) => {
    if (!requireCameraAuth(req, res)) return

    const deviceId = getDeviceId(req)
    if (!assertKnownDevice(deviceId, res)) return

    const job = getJob(req.params.id)
    if (!job) {
      res.status(404).json({ error: 'job not found' })
      return
    }

    if (job.status !== 'assigned') {
      res.status(409).json({ error: `job is not ready for upload: ${job.status}` })
      return
    }

    const jpeg = req.body as Buffer
    if (!jpeg || jpeg.length < 1024) {
      updateJob(job.id, { status: 'error', error: 'empty or invalid jpeg upload' })
      res.status(400).json({ error: 'empty or invalid jpeg upload' })
      return
    }

    storeJobInputImage(job.id, jpeg)
    updateJob(job.id, { status: 'uploaded', uploadedAt: Date.now(), deviceId })
    res.json({ ok: true, id: job.id, bytes: jpeg.length })
    void analyzeAndStore(job, jpeg)
  },
)

app.post(
  '/cam/button-capture',
  express.raw({ type: ['image/jpeg', 'application/octet-stream'], limit: '8mb' }),
  (req, res) => {
    if (!requireCameraAuth(req, res)) return

    const deviceId = getDeviceId(req)
    if (!assertKnownDevice(deviceId, res)) return

    const jpeg = req.body as Buffer
    if (!jpeg || jpeg.length < 1024) {
      res.status(400).json({ error: 'empty or invalid jpeg upload' })
      return
    }

    const job = createJob({
      source: 'xiao_button',
      deviceId,
      prompt: DEFAULT_PROMPT,
      enqueue: false,
    })

    storeJobInputImage(job.id, jpeg)
    updateJob(job.id, { status: 'uploaded', uploadedAt: Date.now(), deviceId })
    res.json({ ok: true, id: job.id, bytes: jpeg.length, latestSeq: getLatestSeq() })
    void analyzeAndStore(job, jpeg)
  },
)

setInterval(cleanupOldJobs, 60_000).unref()

export async function startServer(): Promise<void> {
  await loadTestPrompt().catch((error) => {
    console.warn(`Could not load test page prompt: ${error instanceof Error ? error.message : String(error)}`)
  })

  app.listen(config.port, () => {
    console.log(`G2 external vision backend listening on ${config.port}`)
  })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void startServer()
}
