import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import type { Server } from 'node:http'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { Express } from 'express'
import type {
  createJob as createJobType,
  getAppStateSnapshot as getAppStateSnapshotType,
  loadResponseHistoryFromDisk as loadResponseHistoryFromDiskType,
  resetStoreForTests as resetStoreForTestsType,
  updateJob as updateJobType,
} from './store.js'

const TEST_TOKEN = 'test-token'
const TEST_DEVICE_ID = 'xiao-g2-001'

type Json = Record<string, any>

let server: Server
let baseUrl = ''
let app: Express
let resetStoreForTests: typeof resetStoreForTestsType
let getAppStateSnapshot: typeof getAppStateSnapshotType
let createJob: typeof createJobType
let updateJob: typeof updateJobType
let loadResponseHistoryFromDisk: typeof loadResponseHistoryFromDiskType
let historyDataDir = ''

function makeJpeg(size = 2048): Blob {
  const header = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
  const body = new Uint8Array(size)
  body.fill(0x42)
  const footer = new Uint8Array([0xff, 0xd9])
  return new Blob([header, body, footer], { type: 'image/jpeg' })
}

function cameraHeaders(token = TEST_TOKEN, deviceId = TEST_DEVICE_ID): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'X-Device-Id': deviceId,
  }
}

async function readJson(response: Response): Promise<Json> {
  const text = await response.text()
  return text ? JSON.parse(text) : {}
}

async function requestJson(path: string, init?: RequestInit): Promise<{ response: Response; body: Json }> {
  const response = await fetch(`${baseUrl}${path}`, init)
  return { response, body: await readJson(response) }
}

async function waitForStatus(jobId: string, status: string): Promise<Json> {
  const deadline = Date.now() + 3000

  while (Date.now() < deadline) {
    const { response, body } = await requestJson(`/api/result/${jobId}`)
    assert.equal(response.status, 200)
    if (body.status === status) return body
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  throw new Error(`Timed out waiting for ${jobId} to become ${status}`)
}

before(async () => {
  process.env.NODE_ENV = 'test'
  process.env.CAMERA_TOKEN = TEST_TOKEN
  process.env.CAMERA_DEVICE_ID = TEST_DEVICE_ID
  process.env.OPENAI_API_KEY = ''
  historyDataDir = await mkdtemp(join(tmpdir(), 'g2vision-history-test-'))
  process.env.RESPONSE_HISTORY_DIR = historyDataDir

  const serverModule = await import('./server.js')
  const storeModule = await import('./store.js')
  app = serverModule.app
  resetStoreForTests = storeModule.resetStoreForTests
  getAppStateSnapshot = storeModule.getAppStateSnapshot
  createJob = storeModule.createJob
  updateJob = storeModule.updateJob
  loadResponseHistoryFromDisk = storeModule.loadResponseHistoryFromDisk

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()
  assert(address && typeof address === 'object')
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
  if (historyDataDir) await rm(historyDataDir, { recursive: true, force: true })
})

beforeEach(() => {
  resetStoreForTests()
})

describe('backend camera integration flow', () => {
  it('runs an app-created capture job through queue, upload, result, and events', async () => {
    const capture = await requestJson('/api/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'integration prompt' }),
    })

    assert.equal(capture.response.status, 200)
    assert.equal(capture.body.status, 'queued')
    assert.equal(typeof capture.body.id, 'string')

    const initialState = await requestJson('/api/app-state')
    assert.equal(initialState.response.status, 200)
    assert.equal(initialState.body.status, 1)
    assert.equal(initialState.body.activeJobId, capture.body.id)
    assert.equal(initialState.body.jobStatus, 'queued')

    const next = await requestJson(`/cam/next?device_id=${TEST_DEVICE_ID}`, {
      headers: cameraHeaders(),
    })

    assert.equal(next.response.status, 200)
    assert.equal(next.body.request_id, capture.body.id)
    assert.equal(next.body.upload_path, `/cam/upload/${capture.body.id}`)
    assert.equal(next.body.frame_size, 'SVGA')
    assert.equal(next.body.jpeg_quality, 10)

    const upload = await requestJson(`${next.body.upload_path}?device_id=${TEST_DEVICE_ID}`, {
      method: 'POST',
      headers: {
        ...cameraHeaders(),
        'Content-Type': 'image/jpeg',
      },
      body: makeJpeg(),
    })

    assert.equal(upload.response.status, 200)
    assert.equal(upload.body.ok, true)
    assert.equal(upload.body.id, capture.body.id)

    const result = await waitForStatus(capture.body.id, 'error')
    assert.equal(result.source, 'even_hub')
    assert.equal(result.error, 'OPENAI_API_KEY is not configured')

    const doneState = await requestJson('/api/app-state')
    assert.equal(doneState.response.status, 200)
    assert.equal(doneState.body.status, 2)
    assert.equal(doneState.body.activeJobId, capture.body.id)
    assert.equal(doneState.body.jobStatus, 'error')
    assert.equal(doneState.body.history.length, 1)
    assert.equal(doneState.body.history[0].jobId, capture.body.id)

    const events = await requestJson('/api/events?after=0')
    assert.equal(events.response.status, 200)
    const statuses = events.body.events
      .filter((event: Json) => event.jobId === capture.body.id)
      .map((event: Json) => event.status)
    assert.deepEqual(statuses, ['queued', 'assigned', 'uploaded', 'analyzing', 'error'])

    const clearedState = await requestJson('/api/app-state/clear', { method: 'POST' })
    assert.equal(clearedState.response.status, 200)
    assert.equal(clearedState.body.status, 0)
    assert.equal(clearedState.body.history.length, 1)
  })

  it('accepts a hardware button capture without an app-created job', async () => {
    const upload = await requestJson(`/cam/button-capture?device_id=${TEST_DEVICE_ID}`, {
      method: 'POST',
      headers: {
        ...cameraHeaders(),
        'Content-Type': 'image/jpeg',
      },
      body: makeJpeg(),
    })

    assert.equal(upload.response.status, 200)
    assert.equal(upload.body.ok, true)

    const result = await waitForStatus(upload.body.id, 'error')
    assert.equal(result.source, 'xiao_button')
    assert.equal(result.error, 'OPENAI_API_KEY is not configured')

    const appState = await requestJson('/api/app-state')
    assert.equal(appState.response.status, 200)
    assert.equal(appState.body.status, 2)
    assert.equal(appState.body.activeJobId, upload.body.id)
    assert.equal(appState.body.history[0].jobId, upload.body.id)

    const events = await requestJson('/api/events?after=0')
    const statuses = events.body.events
      .filter((event: Json) => event.jobId === upload.body.id)
      .map((event: Json) => event.status)
    assert.deepEqual(statuses, ['queued', 'uploaded', 'analyzing', 'error'])
  })
})

describe('backend app recovery state', () => {
  it('does not restore an abandoned waiting job after the user returns to main screen', async () => {
    const capture = await requestJson('/api/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert.equal(capture.response.status, 200)

    const clear = await requestJson('/api/app-state/clear', { method: 'POST' })
    assert.equal(clear.response.status, 200)
    assert.equal(clear.body.status, 0)

    const next = await requestJson(`/cam/next?device_id=${TEST_DEVICE_ID}`, {
      headers: cameraHeaders(),
    })
    assert.equal(next.response.status, 200)

    const upload = await requestJson(`${next.body.upload_path}?device_id=${TEST_DEVICE_ID}`, {
      method: 'POST',
      headers: {
        ...cameraHeaders(),
        'Content-Type': 'image/jpeg',
      },
      body: makeJpeg(),
    })
    assert.equal(upload.response.status, 200)
    await waitForStatus(capture.body.id, 'error')

    const appState = await requestJson('/api/app-state')
    assert.equal(appState.response.status, 200)
    assert.equal(appState.body.status, 0)
    assert.equal(appState.body.history.length, 0)
  })

  it('expires the visible app status after ten minutes but keeps response history', async () => {
    const upload = await requestJson(`/cam/button-capture?device_id=${TEST_DEVICE_ID}`, {
      method: 'POST',
      headers: {
        ...cameraHeaders(),
        'Content-Type': 'image/jpeg',
      },
      body: makeJpeg(),
    })
    assert.equal(upload.response.status, 200)
    await waitForStatus(upload.body.id, 'error')

    const currentState = await requestJson('/api/app-state')
    assert.equal(currentState.body.status, 2)
    assert.equal(currentState.body.history.length, 1)

    const futureState = getAppStateSnapshot(Date.now() + 10 * 60 * 1000 + 1)
    assert.equal(futureState.status, 0)
    assert.equal(futureState.history.length, 1)
    assert.equal(futureState.history[0].jobId, upload.body.id)
  })

  it('keeps only the newest one hundred response history entries', async () => {
    const jobIds: string[] = []

    for (let index = 0; index < 101; index += 1) {
      const upload = await requestJson(`/cam/button-capture?device_id=${TEST_DEVICE_ID}`, {
        method: 'POST',
        headers: {
          ...cameraHeaders(),
          'Content-Type': 'image/jpeg',
        },
        body: makeJpeg(),
      })
      assert.equal(upload.response.status, 200)
      jobIds.push(String(upload.body.id))
      await waitForStatus(upload.body.id, 'error')
    }

    const appState = await requestJson('/api/app-state')
    assert.equal(appState.response.status, 200)
    assert.equal(appState.body.history.length, 100)
    assert.equal(appState.body.history[0].jobId, jobIds[100])
    assert.equal(appState.body.history.some((item: Json) => item.jobId === jobIds[0]), false)
  })

  it('exposes website history with the saved input image', async () => {
    const sourceImage = makeJpeg()
    const upload = await requestJson(`/cam/button-capture?device_id=${TEST_DEVICE_ID}`, {
      method: 'POST',
      headers: {
        ...cameraHeaders(),
        'Content-Type': 'image/jpeg',
      },
      body: sourceImage,
    })
    assert.equal(upload.response.status, 200)
    await waitForStatus(upload.body.id, 'error')

    const page = await fetch(`${baseUrl}/history`)
    assert.equal(page.status, 200)
    assert.match(await page.text(), /G2Vision History/)

    const history = await requestJson('/api/history')
    assert.equal(history.response.status, 200)
    assert.equal(history.body.limit, 100)
    assert.equal(history.body.items.length, 1)
    assert.equal(history.body.items[0].jobId, upload.body.id)
    assert.equal(history.body.items[0].hasInputImage, true)
    assert.equal(history.body.items[0].inputImageUrl, `/api/history/${upload.body.id}/image`)
    assert.equal(history.body.items[0].error, 'OPENAI_API_KEY is not configured')

    const image = await fetch(`${baseUrl}${history.body.items[0].inputImageUrl}`)
    assert.equal(image.status, 200)
    assert.equal(image.headers.get('content-type'), 'image/jpeg')
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), Buffer.from(await sourceImage.arrayBuffer()))
  })

  it('keeps website history and input images on disk across runtime reloads', async () => {
    const sourceImage = makeJpeg()
    const upload = await requestJson('/api/test-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpeg',
        'X-Test-Prompt': 'disk history prompt',
      },
      body: sourceImage,
    })
    assert.equal(upload.response.status, 200)
    await waitForStatus(upload.body.id, 'error')

    resetStoreForTests({ preserveHistoryDisk: true })
    loadResponseHistoryFromDisk()

    const history = await requestJson('/api/history')
    assert.equal(history.response.status, 200)
    assert.equal(history.body.items.length, 1)
    assert.equal(history.body.items[0].source, 'test_page')
    assert.equal(history.body.items[0].prompt, 'disk history prompt')
    assert.equal(history.body.items[0].jobId, upload.body.id)
    assert.equal(history.body.items[0].hasInputImage, true)

    const image = await fetch(`${baseUrl}${history.body.items[0].inputImageUrl}`)
    assert.equal(image.status, 200)
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), Buffer.from(await sourceImage.arrayBuffer()))
  })

  it('stores successful response text as the latest response and history title', () => {
    const job = createJob({ source: 'even_hub', enqueue: false })
    updateJob(job.id, {
      status: 'done',
      result: 'A successful response with useful details for the title.',
      doneAt: Date.now(),
    })

    const appState = getAppStateSnapshot()
    assert.equal(appState.status, 2)
    assert.equal(appState.activeJobId, job.id)
    assert.equal(appState.result, 'A successful response with useful details for the title.')
    assert.equal(appState.history.length, 1)
    assert.equal(appState.history[0].jobId, job.id)
    assert.equal(appState.history[0].title, 'A successful response with useful details for the title.')
  })

  it('stores successful LaTeX response text as readable app state and history text', () => {
    const job = createJob({ source: 'even_hub', enqueue: false })
    updateJob(job.id, {
      status: 'done',
      result: String.raw`Formula: \frac{a+b}{c+d} and \(x_i\)\(y_i\).`,
      doneAt: Date.now(),
    })

    const appState = getAppStateSnapshot()
    assert.equal(appState.result, 'Formula: (a + b) / (c + d) and x_(i) y_(i).')
    assert.equal(appState.history[0].result, 'Formula: (a + b) / (c + d) and x_(i) y_(i).')
    assert.equal(appState.history[0].title, 'Formula: (a + b) / (c + d) and x_(i) y_(i).')
  })
})

describe('backend negative camera checks', () => {
  it('rejects unauthenticated camera polling', async () => {
    const { response, body } = await requestJson(`/cam/next?device_id=${TEST_DEVICE_ID}`, {
      headers: cameraHeaders('wrong-token'),
    })

    assert.equal(response.status, 401)
    assert.equal(body.error, 'unauthorized camera request')
  })

  it('rejects unknown camera devices', async () => {
    const { response, body } = await requestJson('/cam/next?device_id=unknown-device', {
      headers: cameraHeaders(TEST_TOKEN, 'unknown-device'),
    })

    assert.equal(response.status, 403)
    assert.equal(body.error, 'unknown device_id: unknown-device')
  })

  it('returns 204 when there is no queued app job', async () => {
    const response = await fetch(`${baseUrl}/cam/next?device_id=${TEST_DEVICE_ID}`, {
      headers: cameraHeaders(),
    })

    assert.equal(response.status, 204)
    assert.equal(await response.text(), '')
  })

  it('marks an assigned job as error after an invalid upload', async () => {
    const capture = await requestJson('/api/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const next = await requestJson(`/cam/next?device_id=${TEST_DEVICE_ID}`, {
      headers: cameraHeaders(),
    })

    const upload = await requestJson(`${next.body.upload_path}?device_id=${TEST_DEVICE_ID}`, {
      method: 'POST',
      headers: {
        ...cameraHeaders(),
        'Content-Type': 'image/jpeg',
      },
      body: makeJpeg(8),
    })

    assert.equal(upload.response.status, 400)
    assert.equal(upload.body.error, 'empty or invalid jpeg upload')

    const result = await requestJson(`/api/result/${capture.body.id}`)
    assert.equal(result.body.status, 'error')
    assert.equal(result.body.error, 'empty or invalid jpeg upload')
  })

  it('rejects duplicate upload after the first upload is accepted', async () => {
    const capture = await requestJson('/api/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const next = await requestJson(`/cam/next?device_id=${TEST_DEVICE_ID}`, {
      headers: cameraHeaders(),
    })

    const first = await requestJson(`${next.body.upload_path}?device_id=${TEST_DEVICE_ID}`, {
      method: 'POST',
      headers: {
        ...cameraHeaders(),
        'Content-Type': 'image/jpeg',
      },
      body: makeJpeg(),
    })
    assert.equal(first.response.status, 200)

    const second = await requestJson(`${next.body.upload_path}?device_id=${TEST_DEVICE_ID}`, {
      method: 'POST',
      headers: {
        ...cameraHeaders(),
        'Content-Type': 'image/jpeg',
      },
      body: makeJpeg(),
    })

    assert.equal(second.response.status, 409)
    assert.match(second.body.error, /^job is not ready for upload:/)
    await waitForStatus(capture.body.id, 'error')
  })
})
