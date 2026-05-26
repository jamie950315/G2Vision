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
