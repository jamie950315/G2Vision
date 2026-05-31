import crypto from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { config, DEFAULT_PROMPT } from './config.js'
import { normalizeMathForDisplay } from './math-text.js'
import type {
  AppStateSnapshot,
  AppStatusValue,
  Job,
  JobEvent,
  JobSource,
  JobStatus,
  ResponseHistoryItem,
} from './types.js'

const jobs = new Map<string, Job>()
const pendingQueue: string[] = []
const events: JobEvent[] = []
const responseHistory: ResponseHistoryItem[] = []
const dismissedAppJobIds = new Set<string>()
let seq = 0

const APP_STATE_TTL_MS = 10 * 60 * 1000
export const MAX_RESPONSE_HISTORY = 100
const HISTORY_TITLE_MAX_CHARS = 96
const HISTORY_FILE = join(config.responseHistoryDir, 'history.json')
const IMAGE_DIR = join(config.responseHistoryDir, 'images')

type ResetStoreOptions = {
  preserveHistoryDisk?: boolean
}

type AppStateCore = Omit<AppStateSnapshot, 'history' | 'latestSeq'>

let appState: AppStateCore = createIdleAppState()

function createIdleAppState(now = Date.now()): AppStateCore {
  return {
    status: 0,
    updatedAt: now,
    expiresAt: now,
  }
}

export function getLatestSeq(): number {
  return seq
}

function pushEvent(job: Job): JobEvent {
  const event: JobEvent = {
    seq: ++seq,
    jobId: job.id,
    deviceId: job.deviceId,
    source: job.source,
    status: job.status,
    result: job.result,
    error: job.error,
    createdAt: Date.now(),
  }

  events.push(event)
  while (events.length > config.eventBufferSize) events.shift()
  if (job.source === 'test_page') addHistoryFromJob(job)
  syncAppStateFromJob(job)
  return event
}

function shouldTrackAppJob(job: Job): boolean {
  return job.source === 'even_hub' || job.source === 'xiao_button'
}

function toAppStatus(job: Job): AppStatusValue {
  return isTerminalStatus(job.status) ? 2 : 1
}

function makeHistoryTitle(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (!compact) return 'Vision response'
  return compact.length > HISTORY_TITLE_MAX_CHARS ? `${compact.slice(0, HISTORY_TITLE_MAX_CHARS)}...` : compact
}

function isSafeJobId(jobId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(jobId)
}

function imagePath(jobId: string): string {
  return join(IMAGE_DIR, `${jobId}.jpg`)
}

function hasDiskInputImage(jobId: string): boolean {
  return isSafeJobId(jobId) && existsSync(imagePath(jobId))
}

function ensureHistoryDirs(): void {
  mkdirSync(IMAGE_DIR, { recursive: true })
}

function removeHistoryImage(jobId: string): void {
  if (!isSafeJobId(jobId)) return
  rmSync(imagePath(jobId), { force: true })
}

function persistResponseHistory(): void {
  ensureHistoryDirs()
  const tmpFile = `${HISTORY_FILE}.tmp`
  writeFileSync(tmpFile, `${JSON.stringify(responseHistory, null, 2)}\n`, 'utf8')
  renameSync(tmpFile, HISTORY_FILE)
}

function pruneDiskImages(): void {
  if (!existsSync(IMAGE_DIR)) return
  const kept = new Set(responseHistory.map((item) => `${item.jobId}.jpg`))

  for (const name of readdirSync(IMAGE_DIR)) {
    if (!kept.has(name)) rmSync(join(IMAGE_DIR, name), { force: true })
  }
}

function toHistoryItem(value: unknown): ResponseHistoryItem | undefined {
  if (!value || typeof value !== 'object') return undefined
  const item = value as Partial<ResponseHistoryItem>
  if (typeof item.id !== 'string' || typeof item.jobId !== 'string') return undefined
  if (!isSafeJobId(item.jobId)) return undefined
  if (item.source !== 'even_hub' && item.source !== 'xiao_button' && item.source !== 'test_page') return undefined
  if (typeof item.createdAt !== 'number' || !Number.isFinite(item.createdAt)) return undefined

  const result = typeof item.result === 'string' ? item.result : ''
  const error = typeof item.error === 'string' ? item.error : undefined
  return {
    id: item.id,
    jobId: item.jobId,
    source: item.source,
    title: typeof item.title === 'string' && item.title.trim() ? item.title : makeHistoryTitle(result || error || ''),
    prompt: typeof item.prompt === 'string' ? item.prompt : DEFAULT_PROMPT,
    result,
    error,
    hasInputImage: hasDiskInputImage(item.jobId),
    createdAt: item.createdAt,
  }
}

function addHistoryFromJob(job: Job): void {
  if (!isTerminalStatus(job.status)) return

  const text = job.result || job.error || ''
  const item: ResponseHistoryItem = {
    id: job.id,
    jobId: job.id,
    source: job.source,
    title: makeHistoryTitle(text),
    prompt: job.prompt,
    result: job.result || '',
    error: job.error,
    hasInputImage: hasDiskInputImage(job.id),
    createdAt: job.doneAt || job.updatedAt,
  }

  const existingIndex = responseHistory.findIndex((entry) => entry.jobId === job.id)
  if (existingIndex >= 0) responseHistory.splice(existingIndex, 1)
  responseHistory.unshift(item)
  while (responseHistory.length > MAX_RESPONSE_HISTORY) {
    const removed = responseHistory.pop()
    if (removed) removeHistoryImage(removed.jobId)
  }
  persistResponseHistory()
  pruneDiskImages()
}

function expireAppStateIfNeeded(now = Date.now()): void {
  if (appState.status === 0 || now < appState.expiresAt) return

  if (appState.status === 1 && appState.activeJobId) {
    dismissedAppJobIds.add(appState.activeJobId)
  }
  appState = createIdleAppState(now)
}

function syncAppStateFromJob(job: Job): void {
  if (!shouldTrackAppJob(job)) return
  expireAppStateIfNeeded()
  if (dismissedAppJobIds.has(job.id)) return

  const now = Date.now()
  appState = {
    status: toAppStatus(job),
    activeJobId: job.id,
    source: job.source,
    jobStatus: job.status,
    result: job.result,
    error: job.error,
    updatedAt: now,
    expiresAt: now + APP_STATE_TTL_MS,
  }

  addHistoryFromJob(job)
}

export function createJob(params: {
  source: JobSource
  deviceId?: string
  prompt?: string
  enqueue?: boolean
}): Job {
  const now = Date.now()
  const job: Job = {
    id: crypto.randomUUID(),
    deviceId: params.deviceId || config.cameraDeviceId,
    source: params.source,
    prompt: params.prompt && params.prompt.trim() ? params.prompt.trim() : DEFAULT_PROMPT,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
  }

  jobs.set(job.id, job)
  if (params.enqueue !== false) pendingQueue.push(job.id)
  pushEvent(job)
  return job
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id)
}

export function updateJob(
  id: string,
  patch: Partial<Pick<Job, 'status' | 'result' | 'error' | 'assignedAt' | 'uploadedAt' | 'doneAt' | 'deviceId'>>,
): Job | undefined {
  const job = jobs.get(id)
  if (!job) return undefined

  const safePatch = { ...patch }
  if (typeof safePatch.result === 'string') safePatch.result = normalizeMathForDisplay(safePatch.result)

  Object.assign(job, safePatch, { updatedAt: Date.now() })
  pushEvent(job)
  return job
}

export function storeJobInputImage(jobId: string, data: Buffer, contentType = 'image/jpeg'): void {
  if (!jobs.has(jobId) || contentType !== 'image/jpeg') return
  ensureHistoryDirs()
  writeFileSync(imagePath(jobId), data)

  const historyItem = responseHistory.find((entry) => entry.jobId === jobId)
  if (historyItem) {
    historyItem.hasInputImage = true
    persistResponseHistory()
  }
}

export function getHistoryInputImage(jobId: string): { contentType: string; data: Buffer } | undefined {
  if (!isSafeJobId(jobId) || !hasDiskInputImage(jobId)) return undefined
  return { contentType: 'image/jpeg', data: readFileSync(imagePath(jobId)) }
}

export function getResponseHistory(): ResponseHistoryItem[] {
  return responseHistory.map((item) => ({ ...item }))
}

export function loadResponseHistoryFromDisk(): void {
  responseHistory.length = 0

  try {
    const raw = JSON.parse(readFileSync(HISTORY_FILE, 'utf8')) as unknown
    const entries = Array.isArray(raw) ? raw : []
    for (const value of entries) {
      const item = toHistoryItem(value)
      if (item) responseHistory.push(item)
    }
    while (responseHistory.length > MAX_RESPONSE_HISTORY) {
      const removed = responseHistory.pop()
      if (removed) removeHistoryImage(removed.jobId)
    }
    persistResponseHistory()
    pruneDiskImages()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`Could not read response history: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

export function assignNextQueuedJob(deviceId: string): Job | undefined {
  while (pendingQueue.length > 0) {
    const id = pendingQueue.shift()
    if (!id) continue

    const job = jobs.get(id)
    if (!job) continue
    if (job.status !== 'queued') continue

    return updateJob(job.id, {
      status: 'assigned',
      assignedAt: Date.now(),
      deviceId,
    })
  }

  return undefined
}

export function getEventsAfter(afterSeq: number): JobEvent[] {
  return events.filter((event) => event.seq > afterSeq)
}

export function getLatestJob(deviceId?: string): Job | undefined {
  const list = Array.from(jobs.values()).filter((job) => !deviceId || job.deviceId === deviceId)
  list.sort((a, b) => b.updatedAt - a.updatedAt)
  return list[0]
}

export function cleanupOldJobs(): void {
  const now = Date.now()
  expireAppStateIfNeeded(now)

  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAt > config.jobTtlMs) jobs.delete(id)
  }

  for (let i = pendingQueue.length - 1; i >= 0; i -= 1) {
    const id = pendingQueue[i]
    if (!jobs.has(id)) pendingQueue.splice(i, 1)
  }

  for (const id of dismissedAppJobIds) {
    if (!jobs.has(id)) dismissedAppJobIds.delete(id)
  }

  if (appState.activeJobId && !jobs.has(appState.activeJobId)) {
    appState = createIdleAppState(now)
  }
}

export function getDebugState(): { jobs: number; queued: number; latestSeq: number } {
  return {
    jobs: jobs.size,
    queued: pendingQueue.length,
    latestSeq: seq,
  }
}

export function isTerminalStatus(status: JobStatus): boolean {
  return status === 'done' || status === 'error'
}

export function clearAppState(): AppStateSnapshot {
  expireAppStateIfNeeded()
  if (appState.status === 1 && appState.activeJobId) {
    dismissedAppJobIds.add(appState.activeJobId)
  }
  appState = createIdleAppState()
  return getAppStateSnapshot()
}

export function getAppStateSnapshot(now = Date.now()): AppStateSnapshot {
  expireAppStateIfNeeded(now)

  const activeJob = appState.activeJobId ? jobs.get(appState.activeJobId) : undefined
  if (appState.activeJobId && !activeJob) {
    appState = createIdleAppState(now)
  }

  return {
    ...appState,
    source: activeJob?.source || appState.source,
    jobStatus: activeJob?.status || appState.jobStatus,
    result: activeJob?.result || appState.result,
    error: activeJob?.error || appState.error,
    history: responseHistory.map((item) => ({ ...item })),
    latestSeq: seq,
  }
}

export function resetStoreForTests(options: ResetStoreOptions = {}): void {
  jobs.clear()
  pendingQueue.length = 0
  events.length = 0
  responseHistory.length = 0
  if (!options.preserveHistoryDisk) rmSync(config.responseHistoryDir, { recursive: true, force: true })
  dismissedAppJobIds.clear()
  appState = createIdleAppState()
  seq = 0
}
