export type JobStatus = 'queued' | 'assigned' | 'uploaded' | 'analyzing' | 'done' | 'error'
export type JobSource = 'even_hub' | 'xiao_button' | 'test_page'
export type AppStatusValue = 0 | 1 | 2

export interface JobEvent {
  seq: number
  jobId: string
  deviceId: string
  source: JobSource
  status: JobStatus
  result?: string
  error?: string
  createdAt: number
}

export interface EventsResponse {
  events: JobEvent[]
  latestSeq: number
}

export interface CaptureResponse {
  id: string
  status: JobStatus
  latestSeq: number
}

export interface ResponseHistoryItem {
  id: string
  jobId: string
  source: JobSource
  title: string
  result: string
  error?: string
  createdAt: number
}

export interface AppStateResponse {
  status: AppStatusValue
  activeJobId?: string
  source?: JobSource
  jobStatus?: JobStatus
  result?: string
  error?: string
  updatedAt: number
  expiresAt: number
  history: ResponseHistoryItem[]
  latestSeq: number
}

const DEFAULT_API_BASE = 'https://g2vision.0ruka.dev'
export const API_BASE = (import.meta.env.VITE_API_BASE || DEFAULT_API_BASE).replace(/\/$/, '')

const DEFAULT_PROMPT =
  'Use Traditional Chinese (Taiwan). Analyze the photo from the external camera. Describe important visual facts, read any visible text, mention relevant risks, and give one concrete next action. Keep the answer under 300 Chinese characters.'

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `HTTP ${response.status}`)
  }
  return (await response.json()) as T
}

export async function createCaptureJob(prompt = DEFAULT_PROMPT): Promise<CaptureResponse> {
  const response = await fetch(`${API_BASE}/api/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  return parseJsonOrThrow<CaptureResponse>(response)
}

export async function fetchEvents(afterSeq: number): Promise<EventsResponse> {
  const response = await fetch(`${API_BASE}/api/events?after=${encodeURIComponent(String(afterSeq))}`)
  return parseJsonOrThrow<EventsResponse>(response)
}

export async function fetchAppState(): Promise<AppStateResponse> {
  const response = await fetch(`${API_BASE}/api/app-state`)
  return parseJsonOrThrow<AppStateResponse>(response)
}

export async function clearAppState(): Promise<AppStateResponse> {
  const response = await fetch(`${API_BASE}/api/app-state/clear`, { method: 'POST' })
  return parseJsonOrThrow<AppStateResponse>(response)
}
