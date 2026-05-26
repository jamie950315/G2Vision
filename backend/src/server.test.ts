import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import type { Server } from 'node:http'
import type { Express } from 'express'
import type { resetStoreForTests as resetStoreForTestsType } from './store.js'

const TEST_TOKEN = 'test-token'
const TEST_DEVICE_ID = 'xiao-g2-001'

type Json = Record<string, any>

let server: Server
let baseUrl = ''
let app: Express
let resetStoreForTests: typeof resetStoreForTestsType

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
  process.env.CAMERA_TOKEN = TEST_TOKEN
  process.env.CAMERA_DEVICE_ID = TEST_DEVICE_ID
  process.env.OPENAI_API_KEY = ''

  const serverModule = await import('./server.js')
  const storeModule = await import('./store.js')
  app = serverModule.app
  resetStoreForTests = storeModule.resetStoreForTests

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

    const next = await requestJson(`/cam/next?device_id=${TEST_DEVICE_ID}`, {
      headers: cameraHeaders(),
    })

    assert.equal(next.response.status, 200)
    assert.equal(next.body.request_id, capture.body.id)
    assert.equal(next.body.upload_path, `/cam/upload/${capture.body.id}`)

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

    const events = await requestJson('/api/events?after=0')
    assert.equal(events.response.status, 200)
    const statuses = events.body.events
      .filter((event: Json) => event.jobId === capture.body.id)
      .map((event: Json) => event.status)
    assert.deepEqual(statuses, ['queued', 'assigned', 'uploaded', 'analyzing', 'error'])
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

    const events = await requestJson('/api/events?after=0')
    const statuses = events.body.events
      .filter((event: Json) => event.jobId === upload.body.id)
      .map((event: Json) => event.status)
    assert.deepEqual(statuses, ['queued', 'uploaded', 'analyzing', 'error'])
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
