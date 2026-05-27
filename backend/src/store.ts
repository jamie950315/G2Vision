import crypto from 'node:crypto'
import { config, DEFAULT_PROMPT } from './config.js'
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
const MAX_RESPONSE_HISTORY = 20

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
  return compact.length > 36 ? `${compact.slice(0, 36)}...` : compact
}

function addHistoryFromJob(job: Job): void {
  if (!isTerminalStatus(job.status)) return

  const text = job.result || job.error || ''
  const item: ResponseHistoryItem = {
    id: job.id,
    jobId: job.id,
    source: job.source,
    title: makeHistoryTitle(text),
    result: job.result || '',
    error: job.error,
    createdAt: job.doneAt || job.updatedAt,
  }

  const existingIndex = responseHistory.findIndex((entry) => entry.jobId === job.id)
  if (existingIndex >= 0) responseHistory.splice(existingIndex, 1)
  responseHistory.unshift(item)
  while (responseHistory.length > MAX_RESPONSE_HISTORY) responseHistory.pop()
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

  Object.assign(job, patch, { updatedAt: Date.now() })
  pushEvent(job)
  return job
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

export function resetStoreForTests(): void {
  jobs.clear()
  pendingQueue.length = 0
  events.length = 0
  responseHistory.length = 0
  dismissedAppJobIds.clear()
  appState = createIdleAppState()
  seq = 0
}
