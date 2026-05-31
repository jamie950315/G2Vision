export type JobStatus =
  | 'queued'
  | 'assigned'
  | 'uploaded'
  | 'analyzing'
  | 'done'
  | 'error'

export type JobSource = 'even_hub' | 'xiao_button' | 'test_page'

export interface Job {
  id: string
  deviceId: string
  source: JobSource
  prompt: string
  status: JobStatus
  result?: string
  error?: string
  createdAt: number
  updatedAt: number
  assignedAt?: number
  uploadedAt?: number
  doneAt?: number
}

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

export type AppStatusValue = 0 | 1 | 2

export interface ResponseHistoryItem {
  id: string
  jobId: string
  source: JobSource
  title: string
  prompt: string
  result: string
  error?: string
  hasInputImage: boolean
  createdAt: number
}

export interface AppStateSnapshot {
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
