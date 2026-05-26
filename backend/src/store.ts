import crypto from 'node:crypto'
import { config, DEFAULT_PROMPT } from './config.js'
import type { Job, JobEvent, JobSource, JobStatus } from './types.js'

const jobs = new Map<string, Job>()
const pendingQueue: string[] = []
const events: JobEvent[] = []
let seq = 0

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
  return event
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
  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAt > config.jobTtlMs) jobs.delete(id)
  }

  for (let i = pendingQueue.length - 1; i >= 0; i -= 1) {
    const id = pendingQueue[i]
    if (!jobs.has(id)) pendingQueue.splice(i, 1)
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

export function resetStoreForTests(): void {
  jobs.clear()
  pendingQueue.length = 0
  events.length = 0
  seq = 0
}
