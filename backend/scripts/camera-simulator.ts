import { readFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'

type Mode = 'app-job' | 'button' | 'both'

type Options = {
  baseUrl: string
  token: string
  deviceId: string
  mode: Mode
  image?: string
  prompt: string
  waitMs: number
}

type CaptureResponse = {
  id: string
  status: string
  latestSeq: number
}

type NextJobResponse = {
  request_id: string
  upload_path: string
}

type ResultResponse = {
  id: string
  source: string
  status: string
  result?: string
  error?: string
  latestSeq: number
}

type EventsResponse = {
  events: Array<{
    seq: number
    jobId: string
    source: string
    status: string
    error?: string
  }>
  latestSeq: number
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    baseUrl: process.env.SIM_BASE_URL || process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:8787',
    token: process.env.CAMERA_TOKEN || '',
    deviceId: process.env.CAMERA_DEVICE_ID || 'xiao-g2-001',
    mode: 'both',
    prompt: 'Simulator smoke test capture.',
    waitMs: 3000,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const value = argv[index + 1]

    if (arg === '--base-url' && value) {
      options.baseUrl = value
      index += 1
    } else if (arg === '--token' && value) {
      options.token = value
      index += 1
    } else if (arg === '--device-id' && value) {
      options.deviceId = value
      index += 1
    } else if (arg === '--mode' && value) {
      if (!['app-job', 'button', 'both'].includes(value)) {
        throw new Error(`Unsupported --mode: ${value}`)
      }
      options.mode = value as Mode
      index += 1
    } else if (arg === '--image' && value) {
      options.image = value
      index += 1
    } else if (arg === '--prompt' && value) {
      options.prompt = value
      index += 1
    } else if (arg === '--wait-ms' && value) {
      options.waitMs = Number.parseInt(value, 10)
      index += 1
    } else if (arg === '--help') {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`)
    }
  }

  if (!options.token) {
    throw new Error('CAMERA_TOKEN is required. Set CAMERA_TOKEN or pass --token.')
  }

  options.baseUrl = options.baseUrl.replace(/\/$/, '')
  if (!Number.isFinite(options.waitMs) || options.waitMs < 0) options.waitMs = 3000
  return options
}

function printHelp(): void {
  console.log(`Camera simulator

Usage:
  CAMERA_TOKEN=test-token npm run simulate:camera -- --base-url http://127.0.0.1:8787

Options:
  --base-url <url>      Backend URL. Default: SIM_BASE_URL, PUBLIC_BASE_URL, or http://127.0.0.1:8787
  --token <token>       Camera bearer token. Default: CAMERA_TOKEN
  --device-id <id>      Camera device id. Default: CAMERA_DEVICE_ID or xiao-g2-001
  --mode <mode>         app-job, button, or both. Default: both
  --image <path>        JPEG file to upload. Default: generated smoke-test payload
  --prompt <text>       Prompt for the app-created capture job
  --wait-ms <ms>        Time to wait before checking terminal status. Default: 3000
`)
}

async function readJpegPayload(path?: string): Promise<Buffer> {
  if (path) {
    const data = await readFile(path)
    if (data.length < 1024) throw new Error(`Image is too small for backend validation: ${path}`)
    return data
  }

  const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
  const body = Buffer.alloc(2048, 0x42)
  const footer = Buffer.from([0xff, 0xd9])
  return Buffer.concat([header, body, footer])
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const text = await response.text()

  if (!response.ok) {
    throw new Error(`${init?.method || 'GET'} ${url} failed: ${response.status} ${text}`)
  }

  if (!text) return undefined as T
  return JSON.parse(text) as T
}

async function requestMaybeJson<T>(url: string, init?: RequestInit): Promise<{ status: number; body?: T }> {
  const response = await fetch(url, init)
  const text = await response.text()

  if (!response.ok && response.status !== 204) {
    throw new Error(`${init?.method || 'GET'} ${url} failed: ${response.status} ${text}`)
  }

  return {
    status: response.status,
    body: text ? (JSON.parse(text) as T) : undefined,
  }
}

function cameraHeaders(options: Options): HeadersInit {
  return {
    Authorization: `Bearer ${options.token}`,
    'X-Device-Id': options.deviceId,
  }
}

async function runAppJob(options: Options, jpeg: Buffer): Promise<string> {
  const capture = await requestJson<CaptureResponse>(`${options.baseUrl}/api/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: options.prompt }),
  })
  console.log(`created app job: ${capture.id} (${capture.status})`)

  const next = await requestMaybeJson<NextJobResponse>(
    `${options.baseUrl}/cam/next?device_id=${encodeURIComponent(options.deviceId)}`,
    { headers: cameraHeaders(options) },
  )

  if (next.status !== 200 || !next.body) {
    throw new Error(`Expected a queued camera job, got HTTP ${next.status}`)
  }

  if (next.body.request_id !== capture.id) {
    throw new Error(`Camera received unexpected job ${next.body.request_id}; expected ${capture.id}`)
  }

  const uploadUrl = `${options.baseUrl}${next.body.upload_path}?device_id=${encodeURIComponent(options.deviceId)}`
  await requestJson<{ ok: boolean; id: string; bytes: number }>(uploadUrl, {
    method: 'POST',
    headers: {
      ...cameraHeaders(options),
      'Content-Type': 'image/jpeg',
    },
    body: new Blob([new Uint8Array(jpeg)], { type: 'image/jpeg' }),
  })
  console.log(`uploaded app job image: ${capture.id} (${jpeg.length} bytes)`)
  return capture.id
}

async function runButtonCapture(options: Options, jpeg: Buffer): Promise<string> {
  const response = await requestJson<{ ok: boolean; id: string; bytes: number; latestSeq: number }>(
    `${options.baseUrl}/cam/button-capture?device_id=${encodeURIComponent(options.deviceId)}`,
    {
      method: 'POST',
      headers: {
        ...cameraHeaders(options),
        'Content-Type': 'image/jpeg',
      },
      body: new Blob([new Uint8Array(jpeg)], { type: 'image/jpeg' }),
    },
  )

  console.log(`uploaded button capture image: ${response.id} (${response.bytes} bytes)`)
  return response.id
}

async function printFinalState(options: Options, jobIds: string[]): Promise<void> {
  if (options.waitMs > 0) await delay(options.waitMs)

  for (const jobId of jobIds) {
    const result = await requestJson<ResultResponse>(`${options.baseUrl}/api/result/${jobId}`)
    const detail = result.result || result.error || 'no result yet'
    console.log(`job ${jobId}: ${result.source} -> ${result.status} (${detail})`)
  }

  const events = await requestJson<EventsResponse>(`${options.baseUrl}/api/events?after=0`)
  const matching = events.events.filter((event) => jobIds.includes(event.jobId))
  console.log(`matched events: ${matching.map((event) => `${event.seq}:${event.status}`).join(', ')}`)
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  const jpeg = await readJpegPayload(options.image)
  const jobIds: string[] = []

  if (options.mode === 'app-job' || options.mode === 'both') {
    jobIds.push(await runAppJob(options, jpeg))
  }

  if (options.mode === 'button' || options.mode === 'both') {
    jobIds.push(await runButtonCapture(options, jpeg))
  }

  await printFinalState(options, jobIds)
  console.log('camera simulator completed')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
